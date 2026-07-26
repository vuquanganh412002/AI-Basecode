import type { EntityManager, Repository } from 'typeorm';

import { DokusyaShubetsu } from '@/common/enums';
// ⚠️ Value import — used as the `getRepository(Tanka)` argument at runtime.
import { Tanka } from '@/database/entities/tanka.entity';
import type { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * 電子版アウトバウンド同期（cloud → denshiban `updateUserInfo`）の**送信対象判定**を
 * 一箇所に集約したモジュール。
 *
 * 呼び出し元（`DokusyaService`）と受け口（`DenshibanApiService.sendNow`）の両方が
 * この関数群を使う。判定式が二重に書かれていると片方だけ直したときに乖離し、
 * 「送らないはずの購読者が denshiban に載る」という最も危険な壊れ方をするため、
 * 定義はここ 1 箇所のみとする。
 *
 * 判定条件（顧客決定 2026-07）:
 * 1. 購読者種別が **電子版(2)** であること。紙版(1) と 併読(3) は対象外
 *    （併読会員は denshiban 側で別経路登録されるため cloud から push しない）。
 * 2. 適用単価が **キャンペーン単価でない**こと（`m_tanka.campaign_flg = false`）。
 */

/** 判定に必要な最小フィールド。テストが Dokusya 全体を組まずに済むよう絞る。 */
export type DenshibanSyncCandidate = Pick<
  Dokusya,
  'dokusyaShubetsu' | 'tankaId'
>;

/** 送信をスキップした理由。ログの `event` サフィックスにそのまま使う。 */
export type DenshibanSyncSkipReason = 'not_digital_only' | 'campaign_tanka';

/**
 * 判定結果。判別可能ユニオンにしてあるので `gate.eligible` を見た時点で
 * `reason` の有無が型で確定する（`eligible: false` の枝で `reason` を書き忘れると
 * コンパイルエラー）。
 */
export type DenshibanSyncGate =
  | { eligible: true; reason?: undefined }
  | { eligible: false; reason: DenshibanSyncSkipReason };

/**
 * キャンペーン判定に使う `m_tanka` の読み口。
 *
 * `manager` を渡すと呼び出し元トランザクションと同じ接続で読む（未 COMMIT の
 * 単価変更も見える）ため、業務ロジックからは常に `manager` を渡すこと。
 * `tankaRepo` は manager を持たない文脈（単体テスト等）向けのフォールバック。
 */
export interface DenshibanSyncGateOptions {
  manager?: EntityManager;
  tankaRepo?: Repository<Tanka>;
}

/**
 * 購読者種別が同期対象か（**電子版(2) のみ**）。
 *
 * 純粋関数・DB アクセスなし。ゲートの中で最も安いチェックなので必ず最初に走らせる。
 */
export function isDenshibanSubscriber(dokusyaShubetsu: number): boolean {
  return dokusyaShubetsu === DokusyaShubetsu.DIGITAL;
}

/**
 * 適用単価がキャンペーン単価か（`m_tanka.campaign_flg`）。
 *
 * - `tankaId` が未設定なら「キャンペーンではない」＝ `false`。単価未紐付けを
 *   キャンペーン扱いにすると送信すべき購読者を落とすため、ここは false 側に倒す。
 * - 単価行が見つからない場合も `false`（存在しない単価はキャンペーンではない）。
 * - **読み口が未配線なら例外を投げる**。判定できないときに `false`（＝送信可）を
 *   返すとキャンペーン契約が黙って denshiban に流出する。落ちて気付ける方が安全。
 *
 * @throws {Error} `manager` も `tankaRepo` も渡されていない場合。
 */
export async function isCampaignContract(
  dokusya: DenshibanSyncCandidate,
  options: DenshibanSyncGateOptions = {},
): Promise<boolean> {
  if (dokusya.tankaId == null) return false;

  const repo = options.manager
    ? options.manager.getRepository(Tanka)
    : options.tankaRepo;
  if (!repo) {
    throw new Error(
      'キャンペーン単価の判定が未配線です（Tanka リポジトリも manager も渡されていません）。',
    );
  }

  // bigint 列は driver が文字列で返すことがあるため Number() で正規化する。
  const tanka = await repo.findOne({
    where: { tankaId: Number(dokusya.tankaId) },
  });
  return tanka?.campaignFlg === true;
}

/**
 * 送信対象判定の本体。**安いチェックから順に**評価する。
 *
 * 種別チェック（純粋関数）を先に置くことで、紙版・併読の購読者は `m_tanka` を
 * 一度も読まずに弾ける。順序は最適化ではなく仕様の一部なので入れ替えないこと。
 */
export async function resolveDenshibanSyncGate(
  dokusya: DenshibanSyncCandidate,
  options: DenshibanSyncGateOptions = {},
): Promise<DenshibanSyncGate> {
  if (!isDenshibanSubscriber(dokusya.dokusyaShubetsu)) {
    return { eligible: false, reason: 'not_digital_only' };
  }
  if (await isCampaignContract(dokusya, options)) {
    return { eligible: false, reason: 'campaign_tanka' };
  }
  return { eligible: true };
}
