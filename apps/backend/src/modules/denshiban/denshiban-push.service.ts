import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';

import { DomainException } from '@/common/exceptions/domain.exception';
import { todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import type { ApplyChangeSource } from '@/modules/dokusya/dokusya-history.types';
import { isDigitalOrBoth } from '@/modules/dokusya/dokusya-shubetsu.rules';

import { DenshibanApiService } from './denshiban-api.service';
import {
  describeDenshibanError,
  isDenshibanErrorCode,
} from './denshiban-error-codes';
import {
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
 * 電子版が理由を返さなかった場合（cloud 起点の失敗・message 空・未知コード）の
 * フォールバック。電子版が理由を持つときはそちらを優先して利用者に見せる。
 */
const GENERIC_PUSH_FAILURE_MESSAGE =
  '電子版システムとの連携に失敗しました。時間をおいて再度お試しください。';

/** 電子版まで到達せず cloud 側で失敗したときの `error_code`。 */
export const DENSHIBAN_PUSH_FAILED = 'DENSHIBAN_PUSH_FAILED';

/**
 * cloud → 電子版 push 失敗（API がエラーコードを返した / JACd 未解決）。
 * 呼び出し側 tx 内で throw → cloud 側もロールバック（Saga・両方成功 or 両方失敗）。
 *
 * `error_code` は「電子版が返したコードをそのまま」（V15 / P01 / E03 …、
 * 顧客提供 Excel「エラーコード一覧」の定義）。cloud が単一コードへ潰すと、
 * 利用者も運用者も先方仕様書のどの行に当たるのか照合できなくなるため。
 * 電子版まで到達しなかった cloud 起点の失敗だけ {@link DENSHIBAN_PUSH_FAILED}。
 *
 * `message` の優先順位:
 *   1. 電子版が返した message（拒否理由を知っているのは先方だけ）
 *   2. Excel のコード説明（先方が message を返さなかった場合）
 *   3. {@link GENERIC_PUSH_FAILURE_MESSAGE}
 */
export class DenshibanPushException extends DomainException {
  constructor(
    action: string,
    statusCode: string,
    detail: string,
    apiMessage?: string,
  ) {
    const fromDenshiban = (apiMessage ?? '').trim();
    const isDenshibanCode = isDenshibanErrorCode(statusCode);
    super(
      fromDenshiban ||
        (isDenshibanCode ? describeDenshibanError(statusCode) : undefined) ||
        GENERIC_PUSH_FAILURE_MESSAGE,
      isDenshibanCode ? statusCode : DENSHIBAN_PUSH_FAILED,
      HttpStatus.BAD_GATEWAY,
    );
    // 診断用（ログのみ・利用者には出さない）。
    this.pushDetail = `action=${action} statusCode=${statusCode} ${detail}`;
  }
  readonly pushDetail: string;
}

/**
 * cloud → 電子版（顧客CMS）への会員情報 push（SCR-011/015/016 の書き込みに hook）。
 * 整合性方式（plan §4）: 同期 Saga — 呼び出し側 tx 内で API を叩き、失敗なら throw して
 * cloud 側もロールバック。create は電子版が採番した会員IDを master へ書き戻す。
 * 対象: 電子版/併読・非campaign・source≠BATCH（pull sync の echo は push しない）。
 */
@Injectable()
export class DenshibanPushService {
  private readonly logger = new Logger(DenshibanPushService.name);

  constructor(
    private readonly api: DenshibanApiService,
    private readonly configService: ConfigService,
  ) {}

  /** push 有効化フラグ（既定 OFF）。 */
  private get enabled(): boolean {
    return this.configService.get<boolean>('denshiban.pushEnabled') === true;
  }

  // ─── hook 用ファサード（呼び出し側はこの2つだけ使う）──────────────────
  // 対象判定→当日判定→push→書き戻し を集約。非対象は no-op。ガード付け忘れ・
  // push 単独呼び出しを構造的に防ぐ。

  /**
   * UI / 取込 からの push ファサード（呼び出し側 tx 内で実行）。非対象は no-op。
   * push 失敗は throw → tx ロールバック（同期 Saga）。
   * @param immediateJohoDate 指定時、適用日==当日 のみ push（未来適用の併読予約は
   *   到来日に recompute バッチが反映）。create/approve 等は省略。
   */
  async pushOnWrite(
    manager: EntityManager,
    params: {
      action: PushAction;
      after: Dokusya;
      source: ApplyChangeSource;
      immediateJohoDate?: string;
      cancelYm?: string;
    },
  ): Promise<void> {
    const { action, after, source, immediateJohoDate, cancelYm } = params;
    // 未来適用は batch に委譲（即 push しない）。
    if (immediateJohoDate !== undefined && immediateJohoDate !== todayIsoJst()) {
      return;
    }
    if (!(await this.isTarget(manager, after, source))) return;
    const kaiinId = await this.push(manager, action, after, { cancelYm });
    // create（create フォールバックした update/reread 含む）の採番IDを entity にも反映
    // （応答用。DB は push 内で更新済み）。
    if (kaiinId != null) {
      after.denshiKaiinId = kaiinId;
    }
  }

  /**
   * 到来日バッチからの push ファサード。cloud 起点の予約反映で echo ではないため
   * source チェックなし（{@link isBatchTarget}）。非対象は no-op。
   */
  async pushOnBatch(
    manager: EntityManager,
    params: { action: PushAction; after: Dokusya; cancelYm?: string },
  ): Promise<void> {
    if (!(await this.isBatchTarget(manager, params.after))) return;
    await this.push(manager, params.action, params.after, {
      cancelYm: params.cancelYm,
    });
  }

  /** UI / 取込 の push 対象判定。source==='BATCH'（pull sync の押し戻し）は echo 防止で false。 */
  async isTarget(
    manager: EntityManager,
    after: Dokusya,
    source: ApplyChangeSource,
  ): Promise<boolean> {
    if (source === 'BATCH') return false;
    return this.isBatchTarget(manager, after);
  }

  /**
   * 到来日バッチの push 対象判定（cloud 起点なので source チェックなし）。
   * push無効 / 種別が電子版・併読でない / 単価が campaign → いずれも false。
   */
  async isBatchTarget(manager: EntityManager, after: Dokusya): Promise<boolean> {
    if (!this.enabled) return false;
    if (!isDigitalOrBoth(after.dokusyaShubetsu)) return false;
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
   * 低レベル primitive: 対象判定なしで push する。通常は {@link pushOnWrite} /
   * {@link pushOnBatch} を使う（対象判定を内包）。statusCode≠'0' で throw → tx rollback。
   * @returns create のとき採番された会員ID（master へ書き戻し済み）。それ以外 null。
   */
  async push(
    manager: EntityManager,
    action: PushAction,
    after: Dokusya,
    opts: { cancelYm?: string } = {},
  ): Promise<number | null> {
    const jacd = await this.resolveJacd(manager, after.kanriShitenId);
    const id = after.denshiKaiinId;

    // create、または「まだ電子版に無い(id=null)会員の update/reread」は create を発行。
    // 後者は push 有効化前に cloud 単独で作られた会員の移行フォールバック。
    if (action === 'create' || (id == null && (action === 'update' || action === 'reread'))) {
      return this.pushCreate(manager, after, jacd);
    }

    // approve/unapprove/cancel で id=null＝電子版に会員が無い → 反映先が無いので
    // cloud のワークフローは止めず skip（warn で気付けるように）。
    if (id == null) {
      this.logger.warn(
        `updateUserInfo(${action}) skipped: denshi_kaiin_id is null on dokusya_id=${after.dokusyaId}`,
      );
      return null;
    }

    const payload = this.buildPayload(action, after, jacd, id, opts);
    const res = await this.api.updateUserInfo(action, payload);
    this.assertOk(action, res.statusCode, res.message);
    return null;
  }

  /** create を発行し、採番された会員IDを master に書き戻して返す。 */
  private async pushCreate(
    manager: EntityManager,
    after: Dokusya,
    jacd: string,
  ): Promise<number> {
    const res = await this.api.updateUserInfo('create', toCreatePayload(after, jacd));
    this.assertOk('create', res.statusCode, res.message);
    const denshiKaiinId = Number(res.id);
    if (!Number.isInteger(denshiKaiinId) || denshiKaiinId <= 0) {
      // statusCode='0'(成功)なのに ID が不正 = 電子版の応答矛盾。理由を持つ
      // message は無いので汎用文言のまま（apiMessage を渡さない）。
      this.fail('create', res.statusCode, `invalid id=${res.id}`);
    }
    await manager.update(Dokusya, after.dokusyaId, { denshiKaiinId });
    return denshiKaiinId;
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
      // reread（再購読）は update と同一シグネチャ。action_kbn だけ異なる。
      case 'update':
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

  /**
   * push 失敗を必ずログしてから throw する唯一の入口。個々の throw 先で
   * logger を書き忘れると pushDetail がどこにも出ず調査不能になるため集約する。
   * @param apiMessage 電子版が返した message。渡すと利用者向け message になる。
   */
  private fail(
    action: string,
    statusCode: string,
    detail: string,
    apiMessage?: string,
  ): never {
    const err = new DenshibanPushException(action, statusCode, detail, apiMessage);
    this.logger.error(`updateUserInfo failed: ${err.pushDetail}`);
    throw err;
  }

  /** statusCode≠'0' を push 失敗として throw する。 */
  private assertOk(action: string, statusCode: string, message: string): void {
    if (statusCode !== '0') {
      // 第3引数(detail)と第4引数(apiMessage)は同じ message。前者はログ用、
      // 後者は利用者向け message として採用される。
      this.fail(action, statusCode, `message=${message}`, message);
    }
  }

  /**
   * 管理支店ID → 電子版 JACd（数字ちょうど10桁）。kanri_shiten_code のハイフン等を
   * 除去（pull 側 normalizeJacd と対）。10桁でなければ push 不可。
   */
  private async resolveJacd(
    manager: EntityManager,
    kanriShitenId: number | null,
  ): Promise<string> {
    // 以下2つは cloud 側のデータ不備で、電子版まで到達していない＝先方の
    // message が存在しない。よって汎用文言（apiMessage を渡さない）。
    if (kanriShitenId == null) {
      this.fail('resolveJacd', 'CLOUD', 'kanri_shiten_id is null');
    }
    const ks = await manager.getRepository(KanriShiten).findOne({
      where: { kanriShitenId },
      select: { kanriShitenId: true, kanriShitenCode: true },
    });
    const jacd = (ks?.kanriShitenCode ?? '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(jacd)) {
      this.fail(
        'resolveJacd',
        'CLOUD',
        `kanri_shiten_code is not 10 digits (kanri_shiten_id=${kanriShitenId})`,
      );
    }
    return jacd;
  }
}
