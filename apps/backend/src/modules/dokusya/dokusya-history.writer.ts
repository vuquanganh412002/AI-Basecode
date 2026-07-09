import { EntityManager } from 'typeorm';

import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { TorikeshiNotAllowedException } from './exceptions/torikeshi-not-allowed.exception';

import {
  buildCounterRow,
  buildKaiyakuRow,
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

// Digital subscriber types (紙版=1, 電子版=2, 併読=3) — sync 電子版 on 2/3.
const DENSHI_SHUBETSU = new Set([2, 3]);

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
  const { mode, values, johoDate, hanbaitenDate, actor, reason } = input;

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
  const events = splitEvents(mode, changed, values, johoDate, hanbaitenDate);

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
    await m.update(Dokusya, { dokusyaId }, mapRirekiToMaster(effectiveRow));
  }
}

/**
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

  const isDenshi = ref.dokusyaShubetsu === 2; // 電子版 → +1 day
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
 * UI 解約予約: append a real 解約 (cancellation) row when the user schedules a
 * 購読中止日 from the edit screen — instead of a 継続 info row. The row is
 * future-dated (`saishin_data_flg=false`); the 到来日バッチ later just runs
 * `recomputeMaster` to reflect it into `t_dokusya`. Row shape (`部数=0`,
 * `tetsuzuki=0`, `kaiyaku_flg=true`, `zougen=true`) is built by
 * `buildKaiyakuRow`. Applied date = 中止日 (紙版) or +1 (電子版), matching the
 * batch `insertKaiyaku`. Returns the same `ApplyChangeResult` shape as
 * `applyChange` so the caller writes audit + 電子版 sync uniformly.
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
  const { dokusyaId, chushiDate, shubetsu, actor } = input;
  const beforeMaster = await loadMaster(m, dokusyaId);

  const isDenshi = shubetsu === 2; // 電子版 → +1 day
  const kaiyakuJoho = isDenshi ? addDaysIso(chushiDate, 1) : chushiDate;

  // predecessor = 適用日(kaiyakuJoho)時点の有効行。zenkai_* と継承業務項目の基準。
  const before = await findBefore(m, dokusyaId, kaiyakuJoho);
  if (!before) {
    throw new Error('insertScheduledKaiyaku: predecessor row not found');
  }

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildKaiyakuRow(before, {
    dokusyaId,
    rirekiNo: no,
    kaiyakuJoho,
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
 * Whether `target` may be cancelled (取消可否, G1):
 * - `shinki_flg` (新規 / 解約→再購読, both flagged per DB design) → no;
 * - already `torikeshi_flg` → no;
 * - must be the TAIL of the (joho, rireki_no) chain among `flag=0` rows
 *   (LIFO) — a 中間 row with a later un-cancelled row → no.
 * 解約 and 通常変更 at the tail → yes.
 */
export async function canTorikeshi(
  m: EntityManager,
  dokusyaId: number,
  target: DokusyaRireki,
): Promise<boolean> {
  if (target.shinkiFlg || target.torikeshiFlg) return false;
  const tail = await loadEffectiveRow(m, dokusyaId, CHAIN_TAIL_ASOF);
  return tail != null && target.dokusyaRirekiId === tail.dokusyaRirekiId;
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
 * After inserting `inserted` (at `changed` fields) between existing rows,
 * fix the successor chain: relink each following row's `zenkai_*` to its
 * new predecessor and carry the changed field value forward until a row
 * re-sets that field itself.
 *
 * - `changed` = the fields this row changed (the event's `values` keys).
 * - CREATE / no change → no successor to fix (returns early).
 * - `findNext` skips `torikeshi_flg=1` rows, so cancelled rows are never
 *   read or written (G2 freeze).
 *
 * NOTE: `changed` is an added parameter vs common-functions §7 — the
 * caller already knows the event's changed fields, avoiding a full
 * business-column diff here. See docs/dokusya-rireki-common-functions.md §7.
 */
export async function recomputeAfterChain(
  m: EntityManager,
  dokusyaId: number,
  inserted: DokusyaRireki,
  before: DokusyaRireki | null,
  changed: string[],
): Promise<void> {
  if (!before || changed.length === 0) return;

  const ins = inserted as unknown as Record<string, unknown>;
  const bef = before as unknown as Record<string, unknown>;
  let propagate = new Map<string, { newVal: unknown; oldVal: unknown }>();
  for (const f of changed) {
    propagate.set(f, { newVal: ins[f], oldVal: bef[f] });
  }

  let prev = inserted;
  let after = await findNext(
    m,
    dokusyaId,
    prev.johoHenkoTekiyoDate as DateOnly,
    prev.rirekiNo,
  );
  while (after !== null) {
    const aft = after as unknown as Record<string, unknown>;
    fillZenkai(after, prev); // relink previous-values to the new predecessor

    const keep = new Map<string, { newVal: unknown; oldVal: unknown }>();
    for (const [f, entry] of propagate) {
      if (aft[f] === entry.oldVal) {
        // this row did NOT change f → carry the new value forward
        aft[f] = entry.newVal;
        keep.set(f, entry);
      }
      // else: this row set f itself → stop propagating f
    }
    after.zougenHokokuFlg = computeZougen(after, prev);
    await m.save(DokusyaRireki, after);

    if (keep.size === 0) break;
    prev = after;
    propagate = keep;
    after = await findNext(
      m,
      dokusyaId,
      prev.johoHenkoTekiyoDate as DateOnly,
      prev.rirekiNo,
    );
  }
}
