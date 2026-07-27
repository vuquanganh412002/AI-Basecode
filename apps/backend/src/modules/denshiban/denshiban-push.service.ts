import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';

import { DomainException } from '@/common/exceptions/domain.exception';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import type { ApplyChangeSource } from '@/modules/dokusya/dokusya-history.types';

import { DenshibanApiService } from './denshiban-api.service';
import {
  isDenshiShubetsu,
  toApprovePayload,
  toCancelPayload,
  toCreatePayload,
  toUnapprovePayload,
  toUpdatePayload,
} from './denshiban-push.mapper';

/** cloud 側操作 → 電子版 action_kbn。 */
export type PushAction =
  | 'create'
  | 'update'
  | 'reread'
  | 'approve'
  | 'unapprove'
  | 'cancel';

/**
 * cloud → 電子版 push 失敗（統合API がエラーコードを返した／JACd 未解決）。
 * 呼び出し側の `dataSource.transaction(...)` 内で throw されると cloud の書き込みも
 * ロールバックされ、2システムの整合性が保たれる（Saga・両方成功 or 両方失敗）。
 */
export class DenshibanPushException extends DomainException {
  constructor(action: string, statusCode: string, detail: string) {
    super(
      '電子版システムとの連携に失敗しました。時間をおいて再度お試しください。',
      'DENSHIBAN_PUSH_FAILED',
      HttpStatus.BAD_GATEWAY,
    );
    // 診断用（ログのみ・利用者には出さない）。
    this.pushDetail = `action=${action} statusCode=${statusCode} ${detail}`;
  }
  readonly pushDetail: string;
}

/**
 * cloud → 電子版（顧客CMS）への会員情報 push。SCR-011(UI)/SCR-015(置換)/SCR-016(取込)
 * の書き込みに hook し、対象会員（電子版/併読・非campaign・source≠BATCH）を
 * 統合API `updateUserInfo` に反映する。
 *
 * 整合性方式（docs/denshiban-push-implementation-plan.md §4）: 同期 Saga。
 * 呼び出し側 tx の中で API を叩き、失敗（statusCode≠'0'）なら throw して cloud 側も
 * ロールバックする。create は電子版が採番した会員IDを master(t_dokusya) に書き戻す。
 *
 * echo 防止: source==='BATCH'（pull バッチ由来の変更）は決して push しない。
 * campaign 除外: 単価 m_tanka.campaign_flg=true の会員は電子版連携対象外。
 */
@Injectable()
export class DenshibanPushService {
  private readonly logger = new Logger(DenshibanPushService.name);

  constructor(
    private readonly api: DenshibanApiService,
    private readonly configService: ConfigService,
  ) {}

  /** push 機能の有効化（既定 OFF）。ローカルは擬似デモ、本番は AWS URL。 */
  private get enabled(): boolean {
    return this.configService.get<boolean>('denshiban.pushEnabled') === true;
  }

  /**
   * この変更が電子版 push の対象か判定する。
   * - push 無効 → false（cloud 書き込みのみ）
   * - source==='BATCH'（pull の押し戻し）→ false（echo 防止）
   * - 種別が 電子版/併読 でない → false
   * - 単価が campaign → false
   */
  async isTarget(
    manager: EntityManager,
    after: Dokusya,
    source: ApplyChangeSource,
  ): Promise<boolean> {
    if (!this.enabled) return false;
    if (source === 'BATCH') return false;
    if (!isDenshiShubetsu(after.dokusyaShubetsu)) return false;
    if (after.tankaId != null) {
      const tanka = await manager.getRepository(Tanka).findOne({
        where: { tankaId: after.tankaId },
        select: { tankaId: true, campaignFlg: true },
      });
      if (tanka?.campaignFlg) return false;
    }
    return true;
  }

  /**
   * 電子版へ push する（呼び出し側の tx `manager` 内で実行）。
   * `isTarget` が true のときだけ呼ぶこと。statusCode≠'0' で throw → tx rollback。
   *
   * @returns create のとき電子版が採番した会員ID（master へ書き戻し済み）。それ以外 null。
   */
  async push(
    manager: EntityManager,
    action: PushAction,
    after: Dokusya,
    opts: { cancelYm?: string } = {},
  ): Promise<number | null> {
    const jacd = await this.resolveJacd(manager, after.kanriShitenId);

    if (action === 'create') {
      const res = await this.api.updateUserInfo(
        'create',
        toCreatePayload(after, jacd),
      );
      this.assertOk('create', res.statusCode, res.message);
      const denshiKaiinId = Number(res.id);
      if (!Number.isInteger(denshiKaiinId) || denshiKaiinId <= 0) {
        throw new DenshibanPushException(
          'create',
          res.statusCode,
          `invalid id=${res.id}`,
        );
      }
      // 採番された会員IDを master に書き戻す（同一 tx でコミット）。
      await manager.update(Dokusya, after.dokusyaId, { denshiKaiinId });
      return denshiKaiinId;
    }

    // create 以外は既存会員IDが必須。
    const id = after.denshiKaiinId;
    if (id == null) {
      throw new DenshibanPushException(
        action,
        'CLOUD',
        `denshi_kaiin_id is null on dokusya_id=${after.dokusyaId}`,
      );
    }

    const payload = this.buildPayload(action, after, jacd, id, opts);
    const res = await this.api.updateUserInfo(action, payload);
    this.assertOk(action, res.statusCode, res.message);
    return null;
  }

  /** create 以外の action_kbn の payload を組み立てる。 */
  private buildPayload(
    action: Exclude<PushAction, 'create'>,
    after: Dokusya,
    jacd: string,
    id: number,
    opts: { cancelYm?: string },
  ): Record<string, string> {
    switch (action) {
      case 'update':
        return toUpdatePayload(after, jacd, id);
      // reread（再購読）は update と同一シグネチャ。action_kbn だけ異なる。
      case 'reread':
        return toUpdatePayload(after, jacd, id);
      case 'approve':
        return toApprovePayload(jacd, id);
      case 'unapprove':
        return toUnapprovePayload(jacd, id);
      case 'cancel':
        return toCancelPayload(jacd, id, opts.cancelYm ?? '');
    }
  }

  /** statusCode≠'0' を push 失敗として throw する。 */
  private assertOk(action: string, statusCode: string, message: string): void {
    if (statusCode !== '0') {
      this.logger.error(
        `updateUserInfo(${action}) failed: statusCode=${statusCode} message=${message}`,
      );
      throw new DenshibanPushException(action, statusCode, message);
    }
  }

  /**
   * 管理支店ID → 電子版 JACd（数字ちょうど10桁）。kanri_shiten_code のハイフン等を
   * 除去して突合キーにする（pull 側 normalizeJacd と対）。10桁でなければ push 不可。
   */
  private async resolveJacd(
    manager: EntityManager,
    kanriShitenId: number | null,
  ): Promise<string> {
    if (kanriShitenId == null) {
      throw new DenshibanPushException(
        'resolveJacd',
        'CLOUD',
        'kanri_shiten_id is null',
      );
    }
    const ks = await manager.getRepository(KanriShiten).findOne({
      where: { kanriShitenId },
      select: { kanriShitenId: true, kanriShitenCode: true },
    });
    const jacd = (ks?.kanriShitenCode ?? '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(jacd)) {
      throw new DenshibanPushException(
        'resolveJacd',
        'CLOUD',
        `kanri_shiten_code is not 10 digits (kanri_shiten_id=${kanriShitenId})`,
      );
    }
    return jacd;
  }
}
