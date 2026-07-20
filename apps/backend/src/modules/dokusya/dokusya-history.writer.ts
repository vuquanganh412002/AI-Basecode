import { EntityManager } from 'typeorm';

import { DokusyaShubetsu } from '@/common/enums';
import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { TorikeshiNotAllowedException } from './exceptions/torikeshi-not-allowed.exception';

import {
  buildCounterRow,
  buildKaiyakuRow,
  buildKaiyakuReservationRow,
  buildResubscribeRow,
  buildRirekiRow,
  computeZougen,
  diffChangedFields,
  fillZenkai,
  mapRirekiToMaster,
  splitEvents,
} from './dokusya-history.builder';
import {
  ensureMaster,
  findBefore,
  findNext,
  insertRow,
  loadCurrentLifecycleEffectiveRow,
  loadEarliestRow,
  loadEffectiveRow,
  loadMaster,
  loadRireki,
  loadScheduledChushiDate,
  markTorikeshi,
  nextRirekiNo,
  setSaishinFlags,
} from './dokusya-history.query';
import {
  ApplyChangeInput,
  ApplyChangeResult,
  DateOnly,
  DokusyaFields,
} from './dokusya-history.types';

// Digital subscriber types (電子版=2, 併読=3) — sync 電子版 on either.
// Set<number> annotation: enum members are literal-typed (2 | 3), but
// `.has()` is called with a general `number`, so widen explicitly.
const DENSHI_SHUBETSU = new Set<number>([
  DokusyaShubetsu.DIGITAL,
  DokusyaShubetsu.BOTH,
]);

/**
 * Bitemporal history writer — orchestration over the query + builder
 * helpers. Plain functions over an `EntityManager` (caller owns the
 * transaction). See docs/dokusya-rireki-common-functions.md §4.
 */

/**
 * Single entry point for create / update / import / replace. Writes the
 * history row(s) + recomputes the master, all on the caller's `m`
 * (transaction). Does NOT write audit or call external systems — the
 * caller owns those (audit inside the tx via `before`/`after`; 電子版
 * sync AFTER commit when `denshiSync`). See §4.1.
 */
export async function applyChange(
  m: EntityManager,
  input: ApplyChangeInput,
): Promise<ApplyChangeResult> {
  const { mode, values, johoDate, actor, reason } = input;

  let dokusyaId: number;
  let beforeMaster: Dokusya | null;

  if (mode === 'CREATE') {
    dokusyaId = await ensureMaster(m, values as Partial<Dokusya>);
    beforeMaster = null;
  } else {
    if (input.dokusyaId == null) {
      throw new Error('applyChange(UPDATE): dokusyaId is required');
    }
    dokusyaId = input.dokusyaId;
    beforeMaster = await loadMaster(m, dokusyaId); // snapshot BEFORE change
  }

  // 変更検出は「ユーザーが編集した現行スナップショット(master)」基準で行う
  // （顧客要件 2026-07）。フォームは master をロードして送るため、diff を
  // 履歴の日付上の直前行(findBefore)に対して取ると、master と直前行が乖離した
  // 未来日レコードの存在時に「ユーザーが触っていない項目」まで変更扱いされ、
  // 余計な履歴行が生まれる。ここで検出するのは「利用者が実際に変えた項目」だけ。
  // 各履歴行に埋める値・zenkai_*・後続行の cascade は従来どおり findBefore
  // （日付上の直前行）から取る＝「データは直前行から」の設計は不変。
  const changed = diffChangedFields(beforeMaster, values);
  // [1更新1レコード] 販売店・支払方法の変更日を廃止し、全変更を joho で1件の履歴行に
  // まとめる（顧客要件 2026-07）。UI編集・Excel取込・一括置換で統一（source 分岐なし）。
  const events = splitEvents(mode, changed, values, johoDate);

  const insertedRirekiIds: number[] = [];
  for (const e of events) {
    const before = await findBefore(m, dokusyaId, e.joho);
    const no = await nextRirekiNo(m, dokusyaId);
    const row = buildRirekiRow(before, e, {
      dokusyaId,
      rirekiNo: no,
      actor,
      reason,
    });
    // Excel取込で配達先データありの行は増減報告対象にする（顧客要件 — 配達先
    // 列は標準の増減トリガではないため force で明示的に立てる）。
    if (input.forceZougen) row.zougenHokokuFlg = true;
    const saved = await insertRow(m, row);
    insertedRirekiIds.push(saved.dokusyaRirekiId);
    await recomputeAfterChain(m, dokusyaId, saved, before, Object.keys(e.values));
  }

  // 再計算基準日は常に当日。未来日レコードは当日時点では有効化されない（夜間バッチ
  // が到来日に有効化）。ただし全行が未来（未来 購読開始日 の新規）の場合、
  // recomputeMaster が最早行へ fallback して saishin=true を保証する（顧客要件
  // 2026-07: 新規は saishin=true・バッチで後日変わる）。
  await recomputeMaster(m, dokusyaId, todayIsoJst());
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds,
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

/**
 * Recompute `t_dokusya` and `saishin_data_flg` for one dokusya as of `asOf`,
 * scoped to the CURRENT lifecycle (rows from the latest 新規行 onward — see
 * {@link loadCurrentLifecycleEffectiveRow}).
 *
 * Enforces the invariant `t_dokusya ⇔ 常に 1 行 saishin_data_flg=TRUE`（履歴が
 * 1 行以上あれば）:
 * - 現ライフサイクル内で `joho <= asOf` の最大 `(joho, rireki_no)` が有効行；
 * - 無ければ（現ライフサイクルが全て未来 = 未来 購読開始日 の新規/再購読）**最新の
 *   新規行**へ fallback し、master を即その内容にする（新規作成の即時反映と同じ）。
 *
 * これにより 再購読 は初回新規作成と同じく即 購読中 になり（joho=新開始日でも）、
 * update / 解約（同一ライフサイクル内の未来 joho 行）は joho<=asOf まで有効化され
 * ず到来日バッチ任せのまま。単一ライフサイクル（再購読なし）は従来と同一挙動。
 *
 * Idempotent: full recompute, safe to run repeatedly (save / batch).
 */
export async function recomputeMaster(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<void> {
  const effectiveRow = await loadCurrentLifecycleEffectiveRow(
    m,
    dokusyaId,
    asOf,
  );
  await setSaishinFlags(m, dokusyaId, effectiveRow?.dokusyaRirekiId ?? null);
  if (effectiveRow) {
    const masterFields = mapRirekiToMaster(effectiveRow);
    // [scheduled-chushi] 予約中の解約予定日(購読中止日)を master へ即時反映する
    // （顧客要件2026-07）。予約行は未来日で effective ではないため通常は master に
    // 反映されないが、購読中止日だけは予約時点から一覧(SCR-014)/詳細(SCR-011)に
    // 表示したい。取消済みなら null が返り、master 側もクリアされる。effective 行
    // が既に中止日を持つ（バッチ確定後など）場合も同じ値が返り整合する。
    const scheduledChushi = await loadScheduledChushiDate(m, dokusyaId);
    if (scheduledChushi != null) {
      masterFields.dokusyaChushiDate = scheduledChushi;
    }
    await m.update(Dokusya, { dokusyaId }, masterFields);
  }
}

/**
 * NOTE(未実装バッチ用): 到来日バッチ（日次 cron）から呼ばれる想定の関数。バッチ本体は
 * 未実装のため現状 production の呼び出し元は無く unit test のみが対象（意図的な pending・
 * 孤立コードではない）。バッチ実装時にスケジューラから配線する。
 *
 * Batch 解約: append one cancellation row for a subscriber whose
 * `dokusya_chushi_date` has arrived, then reflect it into `t_dokusya`.
 *
 * - Applied date = `dokusya_chushi_date` (紙版=1) or `+1 day` (電子版=2).
 * - `before` = effective row AS OF the cancellation date (G3) so a future
 *   change activated the same night is inherited (case D). NOT `INFINITY`.
 * - Idempotent: skips when there is no chushi date or it is already
 *   cancelled. Scope (excluding 併読 / 電子版クレカ) is the batch's job.
 * See §4.3.
 */
export async function insertKaiyaku(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<void> {
  const ref = await loadEffectiveRow(m, dokusyaId, asOf);
  if (ref?.dokusyaChushiDate == null || ref.kaiyakuFlg) return;

  const isDenshi = ref.dokusyaShubetsu === DokusyaShubetsu.DIGITAL; // 電子版 → +1 day
  const kaiyakuJoho = isDenshi
    ? addDaysIso(ref.dokusyaChushiDate, 1)
    : ref.dokusyaChushiDate;

  const before = await findBefore(m, dokusyaId, kaiyakuJoho);
  if (!before) return;

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildKaiyakuRow(before, {
    dokusyaId,
    rirekiNo: no,
    kaiyakuJoho,
    chushiDate: ref.dokusyaChushiDate,
  });
  await insertRow(m, row);
  await recomputeMaster(m, dokusyaId, asOf);
}

/**
 * UI 解約予約（Phase 1・顧客要件2026-07 の2フェーズ化）: 編集画面で購読中止日を入力
 * した時点で**予約行**を1件追加する（継続情報行ではない）。予約行は最小限のみ override
 * （`部数=0`・`zougen=true`・`中止日`・`適用日=中止日`・`kaiyaku_flg=false`・
 * `saishin=false`）し、`buildKaiyakuReservationRow` が build する。実際の解約確定
 * （`tetsuzuki=0`・`kaiyaku_flg=true`・saishin 反映・電子版は適用日+1）は **Phase 2 の
 * 到来日バッチ `insertKaiyaku`** が別レコードで行う（docs/dokusya-kaiyaku-phase2-plan.md）。
 * 予約行は未来日（saishin=false）なので到来まで master 未反映。Returns the same
 * `ApplyChangeResult` shape as `applyChange` so the caller writes audit uniformly.
 */
export async function insertScheduledKaiyaku(
  m: EntityManager,
  input: {
    dokusyaId: number;
    chushiDate: DateOnly;
    shubetsu: number;
    actor: string;
  },
): Promise<ApplyChangeResult> {
  const { dokusyaId, chushiDate, actor } = input;
  const beforeMaster = await loadMaster(m, dokusyaId);

  // Phase 1: 予約行の適用日 = 中止日（紙版/電子版とも。電子版の +1 は Phase 2 バッチで）。
  // predecessor = 適用日(中止日)時点の有効行。zenkai_* と継承業務項目の基準。
  const before = await findBefore(m, dokusyaId, chushiDate);
  if (!before) {
    throw new Error('insertScheduledKaiyaku: predecessor row not found');
  }

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildKaiyakuReservationRow(before, {
    dokusyaId,
    rirekiNo: no,
    chushiDate,
    createdBy: actor,
  });
  const saved = await insertRow(m, row);

  // 再計算基準日は当日。未来予約は当日時点で未反映（saishin=false のまま）。
  await recomputeMaster(m, dokusyaId, todayIsoJst());
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds: [saved.dokusyaRirekiId],
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

/**
 * 再購読 (resubscribe): a 解約済み subscriber re-registers with a new 購読開始日
 * from the edit screen (手続種類=新規). Appends a 新規(再購読) row — `shinki_flg=true`,
 * `tetsuzuki=1`, `kaiyaku_flg=false`, new `dokusya_kaishi_date`, `chushi=null` —
 * carried forward from the tail (解約行). `values` is the new business state.
 *
 * 適用日(joho) = 新 購読開始日（新規作成と同じ＝初回作成行と同じ形）。即時反映は
 * `recomputeMaster` が「現ライフサイクル(最新の新規行以降)」で有効行を選ぶことで
 * 担保する: 新開始日が未来でも現ライフサイクルの有効行が無ければ最新の新規(=この
 * 再購読)行へ fallback し master が即 購読中 になる（新規作成の未来開始日と同じ挙動）。
 * update / 解約（同一ライフサイクル内の未来 joho 行）は joho<=当日 まで有効化され
 * ないので従来どおり到来日バッチ任せ。Returns the same `ApplyChangeResult` shape.
 */
export async function insertResubscribe(
  m: EntityManager,
  input: {
    dokusyaId: number;
    kaishiDate: DateOnly;
    values: DokusyaFields;
    actor: string;
  },
): Promise<ApplyChangeResult> {
  const { dokusyaId, kaishiDate, values, actor } = input;
  const beforeMaster = await loadMaster(m, dokusyaId);

  // predecessor は新開始日時点の有効行（＝解約行）から状態継承。無ければ最早行。
  const before =
    (await findBefore(m, dokusyaId, kaishiDate)) ??
    (await loadEarliestRow(m, dokusyaId));
  if (!before) {
    throw new Error('insertResubscribe: no history row to carry forward');
  }

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildResubscribeRow(
    before,
    values,
    { dokusyaId, rirekiNo: no, actor, reason: '再購読' },
    kaishiDate, // joho = 新 購読開始日（初回作成と同じ）
  );
  const saved = await insertRow(m, row);

  await recomputeMaster(m, dokusyaId, todayIsoJst());
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds: [saved.dokusyaRirekiId],
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

// Far-future sentinel to fetch the chain tail regardless of today/future.
const CHAIN_TAIL_ASOF = '9999-12-31';

/**
 * Whether `target` may be cancelled (取消可否, G1・顧客要件2026-07):
 * - 紙版(dokusya_shubetsu=1)のみ → 電子版(2)・併読(3) は電子版読者管理システムへ
 *   即時連携されるため取消不可;
 * - `shinki_flg` (新規 / 解約→再購読, both flagged per DB design) → no;
 * - already `torikeshi_flg` → no;
 * - 適用日が未来 (本日 < joho_henko_tekiyo_date, JST) → 適用日到来済み（反映・報告済み）
 *   は取消不可。紙版の解約行は joho = 購読中止日 なので「解約バッチ前まで取消可」も
 *   この一条件で満たす（電子版のみ joho = 中止日+1 だが、そもそも電子版は取消不可）;
 * - must be the TAIL of the (joho, rireki_no) chain among `flag=0` rows
 *   (LIFO) — a 中間 row with a later un-cancelled row → no.
 * 紙版・末尾・適用日未来の 解約 / 通常変更 → yes.
 */
export async function canTorikeshi(
  m: EntityManager,
  dokusyaId: number,
  target: DokusyaRireki,
): Promise<boolean> {
  // 6. 紙版のみ取消可（電子版連携のため 電子版・併読 は不可）。
  if (target.dokusyaShubetsu !== DokusyaShubetsu.PAPER) return false;
  // 3+4. 新規/再購読・取消済は取消不可。
  if (target.shinkiFlg || target.torikeshiFlg) return false;
  // 7. 適用日が未来（本日 < 適用日, JST）でなければ取消不可（適用日到来済み＝反映済み）。
  //    joho_henko_tekiyo_date は DATE（'YYYY-MM-DD'）— ISO 文字列比較で日付順が保たれる。
  //    null（理論上あり得ない）も未来ではないので取消不可扱い。
  if (
    target.johoHenkoTekiyoDate == null ||
    target.johoHenkoTekiyoDate <= todayIsoJst()
  ) {
    return false;
  }
  // 5. 末尾（適用日チェーンの有効レコード）でなければ取消不可（LIFO）。
  const tail = await loadEffectiveRow(m, dokusyaId, CHAIN_TAIL_ASOF);
  // tail が null なら optional chain で undefined ⇒ 一致せず false（従来の
  // `tail != null && ...` と等価）。
  return target.dokusyaRirekiId === tail?.dokusyaRirekiId;
}

/**
 * 取消 (赤伝): void a wrongly-registered change without deleting. Flags the
 * target row and appends a reversing row (both `torikeshi_flg=1`), then
 * recomputes the master over the remaining `flag=0` rows. See §4.4.
 */
export async function applyTorikeshi(
  m: EntityManager,
  dokusyaId: number,
  targetRirekiId: number,
  reason: string,
  actor: string,
): Promise<void> {
  const target = await loadRireki(m, targetRirekiId);
  if (!(await canTorikeshi(m, dokusyaId, target))) {
    throw new TorikeshiNotAllowedException();
  }
  await markTorikeshi(m, targetRirekiId, reason);
  const no = await nextRirekiNo(m, dokusyaId);
  const counter = buildCounterRow(target, { rirekiNo: no, actor, reason });
  await insertRow(m, counter);
  await recomputeMaster(m, dokusyaId, todayIsoJst());
}

/**
 * After inserting `inserted` between two existing rows, update ONLY the
 * immediate successor (直後行): relink its `zenkai_*` to the newly-inserted
 * row and recompute its `zougen_hokoku_flg`. This is the「B-thuần」policy
 * requested by the customer (顧客要件 2026-07):
 *
 *  - 挿入行の直後行 1件だけを更新する。
 *  - 直後行の `zenkai_*` は `fillZenkai(after, inserted)` で新しい直前行
 *    (=挿入行)へ付け替える。住所 zenkai は `fillZenkai` が実効配達先住所
 *    (haitatsu_same_flg 依存)を入れる。
 *  - 直後行の業務項目 current 値（`dokusya_busu`・`biko`・住所・
 *    `haitatsu_same_flg` 等）は一切変更しない。
 *  - 直後行より後ろの行へは cascade しない（過去の carry-forward 伝播は廃止）。
 *
 * 注意: この方針では、挿入行が carry-forward された値項目(busu 等)を変えても
 * 直後行の current 値は据え置くため、直後行が有効化された時点の master がその
 * 値に戻る（顧客が明示的に選択したトレードオフ — full snapshot な予約行前提）。
 *
 * - CREATE / no change → 直後行なし（返る）。
 * - `findNext` は `torikeshi_flg=1` 行をスキップするため取消行は読まない。
 * - `changed` は現状ガード用途のみ（伝播はしない）。
 */
export async function recomputeAfterChain(
  m: EntityManager,
  dokusyaId: number,
  inserted: DokusyaRireki,
  before: DokusyaRireki | null,
  changed: string[],
): Promise<void> {
  if (!before || changed.length === 0) return;

  const after = await findNext(
    m,
    dokusyaId,
    inserted.johoHenkoTekiyoDate as DateOnly,
    inserted.rirekiNo,
  );
  if (after === null) return;

  // 直後行のみ: zenkai を挿入行へ relink（住所は実効配達先住所）+ zougen 再計算。
  // current 値・haitatsu_same_flg は据え置き。後続行へは伝播しない。
  fillZenkai(after, inserted);
  after.zougenHokokuFlg = computeZougen(after, inserted);
  await m.save(DokusyaRireki, after);
}
