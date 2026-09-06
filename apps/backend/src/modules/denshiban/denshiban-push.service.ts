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
  CLOUD_ORIGIN_STATUS_CODE,
  DENSHIBAN_STATUS_SUCCESS,
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

  // ─── hook 用ファサード（呼び出し側はこれだけ使う）────────────────────
  // 対象判定→当日判定→push→書き戻し を集約。非対象は no-op。ガード付け忘れ・
  // push 単独呼び出しを構造的に防ぐ。
  // push 経路は UI / 取込 のみ（顧客要件 2026-07: dokusya-apply-due バッチは
  // 自社クラウド内で完結し、外部連携を行わない）。cancel は SCR-014 の
  // 「購読中止」操作が発行する。

  /**
   * UI / 取込 からの push ファサード（呼び出し側 tx 内で実行）。非対象は no-op。
   * push 失敗は throw → tx ロールバック（同期 Saga）。
   * @param immediateJohoDate 指定時、適用日==当日 のみ push（未来適用の併読予約は
   *   到来日に recompute バッチが反映）。create/approve 等は省略。
   */
  /**
   * @returns 実際に電子版へ送ったか。非対象・未来適用で no-op だった場合は false。
   *   一括中止のように「送った分だけ補償する」呼び出し側が、対象判定を自前で
   *   写さずに済むようにするための戻り値（判定の二重管理を避ける）。
   */
  async pushOnWrite(
    manager: EntityManager,
    params: {
      action: PushAction;
      after: Dokusya;
      source: ApplyChangeSource;
      immediateJohoDate?: string;
      /** action='cancel' 用の解約対象月（YYYYMM）。 */
      cancelYm?: string;
      /**
       * 更新前（DB の実値）の単価ID。update/reread で渡す — campaign→通常切替の
       * 初回push抑止判定（顧客要件 2026-08 追補）に使う。create など「before」が
       * 存在しない呼び出しは省略する。
       */
      beforeTankaId?: number | null;
    },
  ): Promise<boolean> {
    const { action, after, source, immediateJohoDate, cancelYm, beforeTankaId } =
      params;
    // 未来適用は batch に委譲（即 push しない）。
    if (immediateJohoDate !== undefined && immediateJohoDate !== todayIsoJst()) {
      return this.debugSkip(
        action,
        after,
        `未来適用(適用日=${immediateJohoDate} / 当日=${todayIsoJst()})`,
      );
    }
    if (!(await this.isTarget(manager, after, source, beforeTankaId))) {
      return false;
    }
    const kaiinId = await this.push(manager, action, after, { cancelYm });
    // create（create フォールバックした update/reread 含む）の採番IDを entity にも反映
    // （応答用。DB は push 内で更新済み）。
    if (kaiinId != null) {
      after.denshiKaiinId = kaiinId;
    }
    return true;
  }

  /** UI / 取込 の push 対象判定。source==='BATCH'（pull sync の押し戻し）は echo 防止で false。 */
  async isTarget(
    manager: EntityManager,
    after: Dokusya,
    source: ApplyChangeSource,
    beforeTankaId?: number | null,
  ): Promise<boolean> {
    if (source === 'BATCH') {
      return this.debugSkip('isTarget', after, 'source=BATCH(pull sync の echo)');
    }
    return this.isPushTarget(manager, after, beforeTankaId);
  }

  /**
   * source を問わない push 対象判定。push無効 / 種別が電子版・併読でない /
   * 単価が campaign → いずれも false。{@link isTarget} が source 判定を足して使う。
   *
   * @param beforeTankaId 更新前（DB の実値）の単価ID。update/reread のときだけ
   *   渡される。denshi_kaiin_id がまだ null で、かつ更新前の単価が campaign
   *   だった（＝もともと push 対象外だった）場合、この1回の更新では push
   *   しない（顧客要件 2026-08 追補）— cloud 側が denshiban へ新規登録して
   *   しまうのを防ぐ。denshi_kaiin_id の付与は電子版側からの pull sync のみを
   *   正とする。push 有効化前から存在し一度も campaign になったことがない
   *   レコード（migration フォールバック対象）とは、beforeTankaId の campaign
   *   判定で区別する。
   */
  async isPushTarget(
    manager: EntityManager,
    after: Dokusya,
    beforeTankaId?: number | null,
  ): Promise<boolean> {
    if (!this.enabled) {
      return this.debugSkip(
        'isPushTarget',
        after,
        'push無効(DENSHIBAN_PUSH_ENABLED=false)',
      );
    }
    if (!isDigitalOrBoth(after.dokusyaShubetsu)) {
      return this.debugSkip(
        'isPushTarget',
        after,
        `購読者種別が電子版/併読でない(dokusya_shubetsu=${after.dokusyaShubetsu})`,
      );
    }
    if (after.tankaId != null) {
      const tanka = await manager.getRepository(Tanka).findOne({
        where: { tankaId: after.tankaId },
        select: { tankaId: true, campaignFlg: true },
      });
      if (tanka?.campaignFlg) {
        return this.debugSkip(
          'isPushTarget',
          after,
          `campaign単価(tanka_id=${after.tankaId})`,
        );
      }
    }
    if (after.denshiKaiinId == null && beforeTankaId != null) {
      const beforeTanka = await manager.getRepository(Tanka).findOne({
        where: { tankaId: beforeTankaId },
        select: { tankaId: true, campaignFlg: true },
      });
      if (beforeTanka?.campaignFlg) {
        return this.debugSkip(
          'isPushTarget',
          after,
          `更新前がcampaign単価(before_tanka_id=${beforeTankaId}) かつ denshi_kaiin_id=null`,
        );
      }
    }
    return true;
  }

  /**
   * 低レベル primitive: 対象判定なしで push する。通常は {@link pushOnWrite}
   * を使う（対象判定を内包）。statusCode≠'0' で throw → tx rollback。
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
      this.debugSkip(action, after, 'denshi_kaiin_id=null(電子版に会員が無い)');
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
        return toApprovePayload(after, jacd, id);
      case 'unapprove':
        return toUnapprovePayload(after, jacd, id);
      case 'cancel':
        return toCancelPayload(jacd, id, opts.cancelYm ?? '');
    }
  }

  /**
   * TODO(debug): 平文payloadログが出ないケースの理由を追うための一時ログ。
   * push は create/update/reread/approve/unapprove/cancel すべてが
   * DenshibanApiService.updateUserInfo（暗号化直前で payload を出力）を通るので、
   * ログが出ない＝ここで対象外と判定され送信自体していない、という切り分けに使う。
   * 調査が終わったら削除すること。
   */
  private debugSkip(action: string, after: Dokusya, reason: string): false {
    console.log(
      `[denshiban] push skip(${action}): dokusya_id=${after.dokusyaId} ` +
        `denshi_kaiin_id=${after.denshiKaiinId ?? 'null'} 理由=${reason}`,
    );
    return false;
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

  /** statusCode≠成功 を push 失敗として throw する。 */
  private assertOk(action: string, statusCode: string, message: string): void {
    if (statusCode !== DENSHIBAN_STATUS_SUCCESS) {
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
      this.fail('resolveJacd', CLOUD_ORIGIN_STATUS_CODE, 'kanri_shiten_id is null');
    }
    const ks = await manager.getRepository(KanriShiten).findOne({
      where: { kanriShitenId },
      select: { kanriShitenId: true, kanriShitenCode: true },
    });
    const jacd = (ks?.kanriShitenCode ?? '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(jacd)) {
      this.fail(
        'resolveJacd',
        CLOUD_ORIGIN_STATUS_CODE,
        `kanri_shiten_code is not 10 digits (kanri_shiten_id=${kanriShitenId})`,
      );
    }
    return jacd;
  }
}
