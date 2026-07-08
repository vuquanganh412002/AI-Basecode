import { EntityManager } from 'typeorm';

import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { TorikeshiNotAllowedException } from './exceptions/torikeshi-not-allowed.exception';

import {
  buildCounterRow,
  buildKaiyakuRow,
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
 * Recompute `t_dokusya` and `saishin_data_flg` for one dokusya as of
 * `asOf`. The effective row is the greatest `(joho, rireki_no)` with
 * `joho <= asOf` and `torikeshi_flg = false`.
 *
 * Enforces the invariant `t_dokusya ⇔ the row with saishin_data_flg=TRUE`:
 * - effective row exists → it gets `saishin=TRUE` (others FALSE) and
 *   `t_dokusya` is overwritten from it;
 * - no effective row (only future rows) → every `saishin=FALSE` and
 *   `t_dokusya` is left untouched (activated later by the nightly batch).
 *
 * Idempotent: full recompute, safe to run repeatedly (save / batch).
 */
export async function recomputeMaster(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<void> {
  const effectiveRow = await loadEffectiveRow(m, dokusyaId, asOf);
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
  const row = buildKaiyakuRow(before, { dokusyaId, rirekiNo: no, kaiyakuJoho });
  await insertRow(m, row);
  await recomputeMaster(m, dokusyaId, asOf);
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
