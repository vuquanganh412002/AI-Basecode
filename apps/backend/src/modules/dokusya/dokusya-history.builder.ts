import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { Dokusya } from '@/database/entities/dokusya.entity';

import { TetsuzukiShurui } from '@/common/enums';
import {
  DIFF_EXCLUDE_FIELDS,
  HAITATSU_ADDRESS_FIELDS,
  KODOKU_ADDRESS_FIELDS,
  MASTER_EXCLUDE_FIELDS,
  TORIKESHI_HENKO_RIYU,
  ZENKAI_ADDRESS_ZCOLS,
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
  // 非住所 zenkai は直接コピー。
  r.zenkaiHanbaitenId = b?.hanbaitenId ?? null;
  r.zenkaiDokusyaBusu = b?.dokusyaBusu ?? null;
  // 住所 zenkai は before の「実効配達先住所」を格納する（顧客要件 2026-07）:
  //   before.haitatsu_same_flg=TRUE  → 購読者住所 (KODOKU_ADDRESS_FIELDS)
  //   before.haitatsu_same_flg=FALSE → 配達先住所 (HAITATSU_ADDRESS_FIELDS)
  // 増減連絡票/増減通知の前回住所は「前回の実効配達先住所」であり、report 側の
  // zenkaiAddrField は zenkai_X があればそれを信頼するため、書き込み側で実効値を
  // 入れておく。first row (before=null) は全て null。
  const srcAddr =
    b?.haitatsuSameFlg === false ? HAITATSU_ADDRESS_FIELDS : KODOKU_ADDRESS_FIELDS;
  ZENKAI_ADDRESS_ZCOLS.forEach((zcol, i) => {
    r[zcol] = b?.[srcAddr[i]] ?? null;
  });
}

/**
 * `zougen_hokoku_flg`: `true` on CREATE, otherwise `true` when 配達に影響する変更が
 * あったとき（顧客要件）:
 *  - 購読部数 / 販売店（{@link ZOUGEN_TRIGGER_FIELDS}）が変わった、または
 *  - 配達先同一フラグ(haitatsu_same_flg)が切り替わった、または
 *  - **実効配達先住所**が変わった。実効配達先住所は
 *    `haitatsu_same_flg=TRUE` なら購読者住所（{@link KODOKU_ADDRESS_FIELDS}）、
 *    `FALSE` なら配達先住所（{@link HAITATSU_ADDRESS_FIELDS}）。
 * これにより「別住所(haitatsu_same_flg=false)を入力して配達先を変えた」ケースも
 * 増減報告対象になる（顧客要件・従来は購読者住所しか見ておらず取りこぼしていた）。
 * 氏名 / 電話 / 口座等のみの変更は `false`。配達先同一のときに購読者住所を触っても
 * 実効配達先が変われば TRUE、変わらなければ FALSE。
 */
export function computeZougen(
  row: DokusyaRireki,
  before: DokusyaRireki | null,
): boolean {
  if (!before) return true;
  const r = row as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown>;
  // 購読部数 / 販売店。
  if (ZOUGEN_TRIGGER_FIELDS.some((f) => r[f] !== b[f])) return true;
  // 配達先同一フラグの切替＝配達先の変更。
  if (r.haitatsuSameFlg !== b.haitatsuSameFlg) return true;
  // 実効配達先住所の変更。同一フラグは更新後(row)の値で判定する。
  const addressFields = r.haitatsuSameFlg
    ? KODOKU_ADDRESS_FIELDS
    : HAITATSU_ADDRESS_FIELDS;
  return addressFields.some((f) => r[f] !== b[f]);
}

/** Subset of `values` limited to `keys` (order preserved). */
function pick(values: DokusyaFields, keys: string[]): DokusyaFields {
  const src = values as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = src[k];
  return out;
}

/**
 * Split a change into the rows to write.
 *
 * 顧客要件 2026-07: 販売店・支払方法の変更日を廃止し、適用日を読者情報変更適用日
 * (joho) に統一。**UI編集・Excel取込・一括置換のすべてで 1更新1レコード**（変更を
 * 適用日で分割しない）。
 *
 * - CREATE → 全変更を1件。
 * - UPDATE → 全変更を単一の適用日(johoDate)で1件。
 *
 * 顧客要件 2026-07: 販売店適用日(hanbaiten_tekiyo_date)は廃止し、適用日は
 * 読者情報変更適用日(joho_henko_tekiyo_date)に一本化した。販売店変更も joho で
 * 適用される（＝販売店適用日は joho と同一だったため専用列を撤去）。
 */
export function splitEvents(
  mode: 'CREATE' | 'UPDATE',
  changed: string[],
  values: DokusyaFields,
  johoDate: DateOnly,
): ChangeEvent[] {
  if (changed.length === 0) return [];
  return [
    {
      joho: johoDate,
      values: pick(values, changed),
    },
  ];
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
  return out;
}

/** Metadata for a 解約 row (batch 到来日 or UI 解約予約). */
export interface KaiyakuRowContext {
  dokusyaId: number;
  rirekiNo: number;
  /** Applied date: 紙版 = 中止日, 電子版 = 中止日 + 1 (computed by caller). */
  kaiyakuJoho: DateOnly;
  /** 解約予定日(購読中止日) recorded on the row (may differ from joho for 電子版). */
  chushiDate: DateOnly;
  /** Row author. UI 解約予約 = account_id; 到来日バッチ = 'batch' (default). */
  createdBy?: string;
}

/**
 * Build a 解約 (cancellation) row from the predecessor effective row `before`.
 * Inherits business state from `before` but forces the cancellation shape:
 * `tetsuzuki_shurui=0` + `kaiyaku_flg=true` + `dokusya_busu=0`（解約は部数なし）
 * + `zougen_hokoku_flg=true`（解約は必ず減の増減報告対象）+ `saishin_data_flg=false`
 * （未来予約 — 到来日バッチが recomputeMaster で t_dokusya へ反映）. Records the
 * cancel date in `dokusya_chushi_date`, fills `zenkai_*` from `before`. See §4.3.
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
  row.tetsuzukiShurui = TetsuzukiShurui.KAIYAKU;
  row.dokusyaBusu = 0; // 解約 = 部数なし
  row.dokusyaChushiDate = ctx.chushiDate;
  row.johoHenkoTekiyoDate = ctx.kaiyakuJoho;
  row.createdBy = ctx.createdBy ?? 'batch';
  row.henkoRiyu = '';

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before);

  row.kaiyakuFlg = true;
  row.shinkiFlg = false;
  row.zougenHokokuFlg = true; // 解約は常に減の増減報告対象
  row.torikeshiFlg = false;
  row.saishinDataFlg = false;

  return built;
}

/** UI 解約予約行（Phase 1）のメタ。 */
export interface KaiyakuReservationContext {
  dokusyaId: number;
  rirekiNo: number;
  /** 解約予定日(購読中止日)。適用日(joho)にも同値を使う（未来）。 */
  chushiDate: DateOnly;
  createdBy: string;
}

/**
 * Phase 1（顧客要件 2026-07・解約予約の2フェーズ化）: UI で購読中止日を入力した時点の
 * **予約行**を build する。実際の解約確定（tetsuzuki=0・kaiyaku_flg=true・saishin 反映
 * 等）は Phase 2 の到来日バッチ（insertKaiyaku）が **別レコード**で行う。
 *
 * この予約行が override するのは最小限のみ:
 *   - `dokusya_busu = 0`（予約: 部数0）
 *   - `zougen_hokoku_flg = true`（減の増減報告対象）
 *   - `dokusya_chushi_date = 中止日`（Phase 2 バッチのトリガ + 予約検出キー）
 *   - `joho_henko_tekiyo_date = 中止日`（未来 → 到来まで master 未反映）
 *   - `kaiyaku_flg = false`（バッチが確定するまで解約確定でない = バッチ insertKaiyaku の
 *      トリガ条件 `!kaiyaku_flg` を満たす）
 *   - `saishin_data_flg = false`（未来予約）
 *   - `shinki_flg = false` / `torikeshi_flg = false`（before が新規でも予約は非新規・防御）
 * それ以外は before から継承する。`zenkai_*` は before 由来（増減報告用）。
 *
 * 注: 電子版の「適用日 = 中止日 + 1」は Phase 2 バッチ（実解約行）で扱う。予約行の
 * 適用日は紙版/電子版とも中止日で統一する（顧客決定）。
 */
export function buildKaiyakuReservationRow(
  before: DokusyaRireki,
  ctx: KaiyakuReservationContext,
): DokusyaRireki {
  const row = { ...before } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.dokusyaBusu = 0; // 予約: 部数0
  row.dokusyaChushiDate = ctx.chushiDate;
  row.johoHenkoTekiyoDate = ctx.chushiDate; // 適用日=中止日（未来）
  row.createdBy = ctx.createdBy;

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before); // zenkai_* = before の値（増減報告用）

  row.zougenHokokuFlg = true; // 減の増減報告対象
  row.saishinDataFlg = false; // 未来予約 → 未反映
  row.kaiyakuFlg = false; // 解約確定はバッチ（Phase 2）が行う
  row.shinkiFlg = false;
  row.torikeshiFlg = false;

  return built;
}

/**
 * Build a 再購読 (resubscribe) row for a 解約済み subscriber whose 解約 has
 * taken effect (master が 解約状態)。編集画面で 手続種類=新規 + 新しい購読開始日を
 * 指定した再加入。`before` = tail (解約行) から状態を継承しつつ再購読の形へ:
 * `tetsuzuki_shurui=1` + `kaiyaku_flg=false` + `shinki_flg=true`（DB設計: 解約→
 * 再購読も新規フラグ）+ `dokusya_chushi_date=null` + `zougen=true`（再加入=増）。
 * 初回購読開始日(shoki) は不変（`before` の値を維持）。`values` は再購読後の業務新値
 * （新 購読開始日・部数など）。
 *
 * 履歴行は「初回新規作成と同じ形」にする（顧客要件 2026-07）: zenkai_* は全て null
 * （前回値を継承しない＝新規作成 before=null 相当）。See §5.2.
 */
export function buildResubscribeRow(
  before: DokusyaRireki,
  values: DokusyaFields,
  ctx: BuildRowContext,
  kaishiJoho: DateOnly,
): DokusyaRireki {
  const built = buildRirekiRow(before, { joho: kaishiJoho, values }, ctx);
  const r = built as unknown as Record<string, unknown>;
  r.tetsuzukiShurui = TetsuzukiShurui.SHINKI; // 購読中へ復帰
  r.kaiyakuFlg = false;
  r.shinkiFlg = true; // 解約→再購読 は新規フラグ (DB設計)
  r.dokusyaChushiDate = null;
  r.zougenHokokuFlg = true; // 再加入 = 増の増減報告対象
  r.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate; // 初回は不変
  // zenkai_* は初回新規作成と同じく全て null にする（前回値を継承しない）。
  fillZenkai(built, null);
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
    row.tetsuzukiShurui = TetsuzukiShurui.SHINKI; // restore 購読中 (shoki_dokusya_kaishi_date unchanged)
    row.kaiyakuFlg = false;
  }

  return row as unknown as DokusyaRireki;
}
