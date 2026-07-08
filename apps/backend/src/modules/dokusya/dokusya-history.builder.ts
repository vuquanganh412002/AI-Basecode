import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { Dokusya } from '@/database/entities/dokusya.entity';

import {
  DIFF_EXCLUDE_FIELDS,
  HANBAITEN_FIELD,
  MASTER_EXCLUDE_FIELDS,
  TORIKESHI_HENKO_RIYU,
  ZENKAI_FIELD_MAP,
  ZOUGEN_TRIGGER_FIELDS,
} from './dokusya-history.constants';
import { ChangeEvent, DateOnly, DokusyaFields } from './dokusya-history.types';

const MASTER_EXCLUDE = new Set<string>(MASTER_EXCLUDE_FIELDS);
const DIFF_EXCLUDE = new Set<string>(DIFF_EXCLUDE_FIELDS);

/**
 * Pure builder functions for the bitemporal history writer
 * (no DI, no DB) — testable in isolation.
 * See docs/dokusya-rireki-common-functions.md §5.2.
 */

/**
 * List of business fields that changed, keyed by DokusyaRireki entity
 * property (camelCase). On CREATE (`!before`) every key in
 * `values` counts as changed; otherwise a key is changed when its target
 * value differs (strict `!==`) from the predecessor's value.
 */
export function diffChangedFields(
  before: DokusyaRireki | Dokusya | null,
  values: DokusyaFields,
): string[] {
  const cur = values as Record<string, unknown>;
  // 適用日・識別子・監査列は「業務変更」ではないので差分対象から除外する
  // （johoHenkoTekiyoDate は毎回異なるため、残すと余計な情報履歴行が生まれる）。
  const keys = Object.keys(cur).filter((k) => !DIFF_EXCLUDE.has(k));
  if (!before) return keys;
  const prev = before as unknown as Record<string, unknown>;
  return keys.filter((k) => !fieldValuesEqual(cur[k], prev[k]));
}

/**
 * Whether two field values are equal for change-detection. Beyond strict
 * equality, treats numeric-equal values across the number/string boundary
 * as equal — TypeORM returns `bigint` columns (`hanbaiten_id`,
 * `kanri_shiten_id`, `shiten_id`, `tanka_id`) as STRINGS from the DB while
 * code-built `values` carry numbers, so a strict `!==` would wrongly flag an
 * unchanged FK as changed (and split the history row). Booleans never
 * coerce; non-numeric strings (codes, dates, names) fall back to strict.
 */
function fieldValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  // Only compare across the number/string boundary; booleans/objects → strict.
  const numericLike = (x: unknown): x is number | string =>
    typeof x === 'number' || typeof x === 'string';
  if (!numericLike(a) || !numericLike(b)) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (sa === '' || sb === '') return false;
  const na = Number(sa);
  const nb = Number(sb);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return false;
}

/**
 * Fill the `zenkai_*` (previous-value) columns of `row` from `before`'s
 * corresponding business fields (per {@link ZENKAI_FIELD_MAP}). Absent /
 * `undefined` values become `null` (first history row → all null).
 * Mutates `row` in place.
 */
export function fillZenkai(
  row: DokusyaRireki,
  before: DokusyaRireki | null,
): void {
  const r = row as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown> | null;
  for (const [srcCol, zenkaiCol] of Object.entries(ZENKAI_FIELD_MAP)) {
    r[zenkaiCol] = b?.[srcCol] ?? null;
  }
}

/**
 * `zougen_hokoku_flg`: `true` on CREATE, otherwise `true` when `row`
 * differs from `before` on any {@link ZOUGEN_TRIGGER_FIELDS} (dokusya_busu,
 * hanbaiten_id, address). Account/name/phone-only changes → `false`.
 */
export function computeZougen(
  row: DokusyaRireki,
  before: DokusyaRireki | null,
): boolean {
  if (!before) return true;
  const r = row as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown>;
  return ZOUGEN_TRIGGER_FIELDS.some((f) => r[f] !== b[f]);
}

/** Subset of `values` limited to `keys` (order preserved). */
function pick(values: DokusyaFields, keys: string[]): DokusyaFields {
  const src = values as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = src[k];
  return out;
}

/**
 * Split a change into the rows to write, ordered by applied date.
 *
 * - CREATE → a single event carrying all changed fields; `hanbaiten_id`
 *   is an initial value (no split, `hanbaiten_tekiyo_date` stays NULL).
 * - UPDATE → an information event (all non-`hanbaiten_id` changes at
 *   `johoDate`) and/or a hanbaiten event (`hanbaiten_id` change at
 *   `hanbaitenDate ?? johoDate`, which sets `hanbaiten_tekiyo_date`).
 *
 * Events are sorted `(joho ASC, isHanbaiten ASC)` → on the same day the
 * information row precedes the hanbaiten row.
 *
 * NOTE: `mode` is an added parameter vs common-functions §5.2 — CREATE
 * must never split into two rows.
 */
export function splitEvents(
  mode: 'CREATE' | 'UPDATE',
  changed: string[],
  values: DokusyaFields,
  johoDate: DateOnly,
  hanbaitenDate?: DateOnly,
): ChangeEvent[] {
  if (changed.length === 0) return [];

  if (mode === 'CREATE') {
    return [{ joho: johoDate, values: pick(values, changed), isHanbaiten: false }];
  }

  const infoFields = changed.filter((k) => k !== HANBAITEN_FIELD);
  const hanbaitenChanged = changed.includes(HANBAITEN_FIELD);

  const events: ChangeEvent[] = [];
  if (infoFields.length > 0) {
    events.push({
      joho: johoDate,
      values: pick(values, infoFields),
      isHanbaiten: false,
    });
  }
  if (hanbaitenChanged) {
    events.push({
      joho: hanbaitenDate ?? johoDate,
      values: pick(values, [HANBAITEN_FIELD]),
      isHanbaiten: true,
    });
  }

  events.sort((a, b) => {
    if (a.joho !== b.joho) return a.joho < b.joho ? -1 : 1;
    return Number(a.isHanbaiten) - Number(b.isHanbaiten);
  });
  return events;
}

/** Metadata for a row being built (identity + audit). */
export interface BuildRowContext {
  dokusyaId: number;
  rirekiNo: number;
  actor: string;
  reason: string;
}

/**
 * Build one history row for a single event.
 *
 * Carries the subscriber state forward from `before` (empty on CREATE),
 * applies the event's changed fields, fills `zenkai_*` from `before`, and
 * sets the flags. `saishin_data_flg` is left `false` here — `recomputeMaster`
 * owns it (invariant: `t_dokusya ⇔ saishin=TRUE`). Identity columns
 * (`dokusya_rireki_id`, `created_at`) are cleared so the row INSERTs.
 * See docs/dokusya-rireki-common-functions.md §5.2.
 */
export function buildRirekiRow(
  before: DokusyaRireki | null,
  event: ChangeEvent,
  ctx: BuildRowContext,
): DokusyaRireki {
  const row = (before ? { ...before } : {}) as unknown as Record<string, unknown>;
  // Fresh identity — never reuse before's PK / created_at (else it UPDATEs).
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  // Carry-forward state + this event's changes.
  Object.assign(row, event.values);

  // Identity + applied date + audit.
  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.johoHenkoTekiyoDate = event.joho;
  row.hanbaitenTekiyoDate = event.isHanbaiten ? event.joho : null;
  row.createdBy = ctx.actor;
  row.henkoRiyu = ctx.reason;

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before);

  // Flags. saishin_data_flg stays false → set by recomputeMaster.
  row.shinkiFlg = !before;
  row.zougenHokokuFlg = computeZougen(built, before);
  row.kaiyakuFlg = false;
  row.torikeshiFlg = false;
  row.saishinDataFlg = false;

  return built;
}

/**
 * Map the effective rireki row → the columns to write into `t_dokusya`.
 * Copies every column common to both entities EXCEPT
 * {@link MASTER_EXCLUDE_FIELDS} (rireki-only columns, and columns the
 * master keeps its own). `rireki_no` is copied as the pointer to the
 * effective history row; `tetsuzuki_shurui` propagates the 解約 state.
 */
export function mapRirekiToMaster(rireki: DokusyaRireki): Partial<Dokusya> {
  const src = rireki as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!MASTER_EXCLUDE.has(k)) out[k] = v;
  }
  return out as Partial<Dokusya>;
}

/** Metadata for a batch 解約 row. */
export interface KaiyakuRowContext {
  dokusyaId: number;
  rirekiNo: number;
  /** Applied date: 紙版 = 中止日, 電子版 = 中止日 + 1 (computed by caller). */
  kaiyakuJoho: DateOnly;
}

/**
 * Build a 解約 (cancellation) row from the tail effective row `before`.
 * Inherits all business state (incl. `dokusya_chushi_date`) from `before`,
 * sets `tetsuzuki_shurui=0` + `kaiyaku_flg=true`, fills `zenkai_*` from
 * `before`, and stamps `created_by='batch'`. See §4.3 / §5.2.
 */
export function buildKaiyakuRow(
  before: DokusyaRireki,
  ctx: KaiyakuRowContext,
): DokusyaRireki {
  const row = { ...before } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.tetsuzukiShurui = 0;
  row.johoHenkoTekiyoDate = ctx.kaiyakuJoho;
  row.hanbaitenTekiyoDate = null;
  row.createdBy = 'batch';
  row.henkoRiyu = '';

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before);

  row.kaiyakuFlg = true;
  row.shinkiFlg = false;
  row.zougenHokokuFlg = computeZougen(built, before);
  row.torikeshiFlg = false;
  row.saishinDataFlg = false;

  return built;
}

/** Metadata for a 取消 reversing row. */
export interface CounterRowContext {
  rirekiNo: number;
  actor: string;
  reason: string;
}

/**
 * Build the reversing (打ち消し) row for a 取消. Copies `target` and SWAPS
 * each tracked field with its `zenkai_*` (current ↔ previous), so the row
 * undoes `target`'s change; both rows carry `torikeshi_flg=true`.
 *
 * G5: when `target` is a 解約 row (`kaiyaku_flg=true`), the reversing row
 * restores 購読中 (`tetsuzuki_shurui=1`, `kaiyaku_flg=false`) WITHOUT
 * touching `shoki_dokusya_kaishi_date`. See §5.2.
 */
export function buildCounterRow(
  target: DokusyaRireki,
  ctx: CounterRowContext,
): DokusyaRireki {
  const t = target as unknown as Record<string, unknown>;
  const row = { ...target } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  // Reverse: counter's current = target's previous, counter's previous = target's current.
  for (const [srcCol, zenkaiCol] of Object.entries(ZENKAI_FIELD_MAP)) {
    row[srcCol] = t[zenkaiCol];
    row[zenkaiCol] = t[srcCol];
  }

  row.rirekiNo = ctx.rirekiNo;
  row.johoHenkoTekiyoDate = target.johoHenkoTekiyoDate; // same applied date
  row.torikeshiFlg = true;
  row.saishinDataFlg = false;
  // 取消理由は備考(biko)に記録する（顧客要件 — 対象行と打ち消し行の両方）。
  // henko_riyu は操作種別ラベル '取消' 固定にする（他経路の '販売店一括置換' 等と揃える）。
  row.henkoRiyu = TORIKESHI_HENKO_RIYU;
  row.biko = ctx.reason;
  row.createdBy = ctx.actor;

  if (target.kaiyakuFlg) {
    row.tetsuzukiShurui = 1; // restore 購読中 (shoki_dokusya_kaishi_date unchanged)
    row.kaiyakuFlg = false;
  }

  return row as unknown as DokusyaRireki;
}
