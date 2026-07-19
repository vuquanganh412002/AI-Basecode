import {
  DenshiShoninStatus,
  DokusyaShubetsu,
  TetsuzukiShurui,
} from '@/common/enums';

import { DenshibanMappingError } from './denshiban-payload.builder';

/**
 * INBOUND mapper (電子版 `users` ビュー → クラウド `t_dokusya`) — the mirror of
 * {@link ./denshiban-payload.builder} (which goes cloud → API).
 *
 * Pure functions: no DI, no repo, no HTTP, **no clock** → 100% unit-testable
 * offline. This is the "初期データ連携" (initial-sync) transform: one denshiban
 * `users` record → one `t_dokusya` draft.
 *
 * The contract is the authoritative xlsx sheet
 * `Display-Rireki-And-Mapping-Denshiban.xlsx` / §1 of
 * `docs/design-vi/Denshiban-mapper/Display-Rireki-And-Mapping-Denshiban.md`
 * (the 62-row `t_dokusya` ← `users` table). Row numbers below (`No N`) refer to
 * that table. **Do not invent a rule that isn't in it.**
 *
 * Split of responsibility (mirrors the OUTBOUND builder/assembler split):
 *   - This file (pure)     : denshiban view fields + the already-resolved FK ids
 *                            → the `t_dokusya` draft.
 *   - A later assembler    : resolve `JACd → ja_id / kanri_shiten_id`,
 *                            `ShopCd → hanbaiten_id` (or ダミー販売店),
 *                            `payment_id → shiharai_hoho`, then set the sync-time
 *                            columns (処理日, rireki_no, soft-delete). Those need a
 *                            DB lookup / a pending value map, so they arrive here
 *                            via {@link InboundBuildCtx}, exactly like the outbound
 *                            builder receives `jacd_execute` / `payment_start`.
 *
 * Un-mappable denshiban values throw {@link DenshibanMappingError} (never
 * silently defaulted) so the caller can record it for operators — same policy as
 * the outbound side.
 */

// ─── Code conversion tables (reverse of the OUTBOUND builder's) ─────────────

/**
 * denshiban `sex` → cloud `gender` (No 25). **The female code is inverted**
 * (denshiban female=0 / cloud female=2), the reverse of the outbound `toSex`.
 * Anything else — including the empty string — collapses to 9 (無回答).
 */
const GENDER_BY_SEX: Record<string, number> = {
  '0': 2, // 女性
  '1': 1, // 男性
};
/** cloud `gender` when denshiban `sex` is unset / unsupported (No 25: 未入力→9). */
const GENDER_UNKNOWN = 9;

/**
 * denshiban `profession` → cloud `dokusyaso_bunrui` label (No 48). Single value
 * (denshiban `profession` is single-valued). The free-text `others_profession`
 * is NOT stored — its presence only corroborates `999`.
 */
const PROFESSION_LABEL_BY_CODE: Record<string, string> = {
  '0': '農業者',
  '1': 'JAグループ役職員',
  '2': '企業・団体',
  '3': '学生',
  '999': 'その他',
};

/**
 * denshiban `products` → cloud `nogyosya_bunrui` label (No 49). CSV (multi-valued
 * on both sides). Includes `5:酪農`, which is **inbound-only** — cloud's screen
 * has no 酪農 checkbox so it can never go OUT, but it can come IN (the outbound
 * builder's `PRODUCTS_BY_LABEL` deliberately omits it).
 */
const PRODUCTS_LABEL_BY_CODE: Record<string, string> = {
  '0': '米',
  '1': '野菜',
  '2': '果実',
  '3': '花',
  '4': '畜産',
  '5': '酪農',
  '999': 'その他',
};

/** denshiban `member_type` → cloud `denshi_dokusya_shubetsu` (No 9): 1(無料)→0 / 2(有料)→1. */
const DENSHI_DOKUSYA_SHUBETSU_BY_MEMBER_TYPE: Record<string, number> = {
  '1': 0,
  '2': 1,
};

/**
 * denshiban `approval` → cloud `denshi_shonin_status` (No 57).
 * 9(対象外) and the empty string map to NULL (out-of-web-flow).
 */
const SHONIN_STATUS_BY_APPROVAL: Record<string, number | null> = {
  '0': DenshiShoninStatus.PENDING,
  '1': DenshiShoninStatus.APPROVED,
  '2': DenshiShoninStatus.REJECTED,
  '9': null,
};

/** remarks slots joined into `biko` (No 55). */
const REMARKS_KEYS = [
  'remarks1',
  'remarks2',
  'remarks3',
  'remarks4',
  'remarks5',
] as const;

// ─── Small helpers ──────────────────────────────────────────────────────────

/** null / undefined → '' (denshiban view values arrive as string | null). */
function str(v: string | null | undefined): string {
  return v ?? '';
}

/** true when the value carries content (used for optional / presence checks). */
function present(v: string | null | undefined): boolean {
  return str(v).trim() !== '';
}

/** Normalizes a prefecture code to 2 digits (No 16 / 28). Empty stays empty. */
function normPref(v: string | null | undefined): string {
  const s = str(v).trim();
  return s === '' ? '' : s.padStart(2, '0');
}

/** Date-only passthrough. The caller normalizes view dates to `YYYY-MM-DD`. */
function toDateOnly(v: string | null | undefined): string {
  return str(v).slice(0, 10);
}

// ─── Unit conversions (each tested independently) ───────────────────────────

/** `zip1`(上3桁) + `zip2`(下4桁) → `yubin_no`, hyphen-free (No 15). */
export function toYubinNo(
  zip1: string | null | undefined,
  zip2: string | null | undefined,
): string {
  return (str(zip1) + str(zip2)).replace(/[^0-9]/g, '');
}

/**
 * `sex` → `gender` (No 25). Reverse of the outbound `toSex`; the female code is
 * inverted. Unset / unsupported → {@link GENDER_UNKNOWN} (9).
 */
export function toGender(sex: string | null | undefined): number {
  return GENDER_BY_SEX[str(sex).trim()] ?? GENDER_UNKNOWN;
}

/**
 * `member_type` → `denshi_dokusya_shubetsu` (No 9). Empty → null (unknown type);
 * an unexpected non-empty value throws (denshiban drift we shouldn't swallow).
 */
export function toDenshiDokusyaShubetsu(
  memberType: string | null | undefined,
): number | null {
  const s = str(memberType).trim();
  if (s === '') return null;
  const mapped = DENSHI_DOKUSYA_SHUBETSU_BY_MEMBER_TYPE[s];
  if (mapped === undefined) {
    throw new DenshibanMappingError(
      'denshi_dokusya_shubetsu',
      `会員種別 (member_type)「${s}」は電子版読者種別に変換できません（0:無料/1:有料 のみ対応）。`,
    );
  }
  return mapped;
}

/**
 * `status` → `tetsuzuki_shurui` (No 8): 9(解約)→0, {0,1,2,3}(新規/再読/変更/新規A)→1.
 * `status=2`(変更) is processed as an info-update but still maps to 新規(1). An
 * unexpected status throws.
 */
export function toTetsuzukiShurui(status: string | null | undefined): number {
  const s = str(status).trim();
  if (s === '9') return TetsuzukiShurui.KAIYAKU;
  if (['0', '1', '2', '3'].includes(s)) return TetsuzukiShurui.SHINKI;
  throw new DenshibanMappingError(
    'tetsuzuki_shurui',
    `ステータス (status)「${s || '(空)'}」は手続種類に変換できません（0/1/2/3/9 のみ対応）。`,
  );
}

/**
 * `paper_permission_dt` (併読社用・承認日) → `dokusya_shubetsu` (No 7).
 * A date present → 併読(3); absent → 電子版(2).
 */
export function toDokusyaShubetsu(
  paperPermissionDt: string | null | undefined,
): number {
  return present(paperPermissionDt)
    ? DokusyaShubetsu.BOTH
    : DokusyaShubetsu.DIGITAL;
}

/**
 * `approval` → `denshi_shonin_status` (No 57). 9(対象外) / empty → null.
 * An unexpected value throws.
 */
export function toShoninStatus(
  approval: string | null | undefined,
): number | null {
  const s = str(approval).trim();
  if (s === '') return null;
  if (!(s in SHONIN_STATUS_BY_APPROVAL)) {
    throw new DenshibanMappingError(
      'denshi_shonin_status',
      `承認 (approval)「${s}」は承認ステータスに変換できません（0/1/2/9 のみ対応）。`,
    );
  }
  return SHONIN_STATUS_BY_APPROVAL[s];
}

/**
 * `profession` (+ `others_profession`) → `dokusyaso_bunrui` (No 48). Single label.
 * Empty → '' (nothing selected). Unknown code throws. The `others_profession`
 * free text is not stored (its presence only confirms the `999` case).
 */
export function toDokusyasoBunrui(
  profession: string | null | undefined,
  _othersProfession?: string | null,
): string {
  const s = str(profession).trim();
  if (s === '') return '';
  const label = PROFESSION_LABEL_BY_CODE[s];
  if (label === undefined) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      `職業 (profession)「${s}」は購読者層分類に変換できません。`,
    );
  }
  return label;
}

/**
 * `products` (+ `others_products`) → `nogyosya_bunrui` (No 49). CSV of labels.
 * Empty → ''. Any unknown code throws. `others_products` is not stored.
 */
export function toNogyosyaBunrui(
  products: string | null | undefined,
  _othersProducts?: string | null,
): string {
  const codes = str(products)
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '');
  if (codes.length === 0) return '';

  const labels = codes.map((code) => {
    const label = PRODUCTS_LABEL_BY_CODE[code];
    if (label === undefined) {
      throw new DenshibanMappingError(
        'nogyosya_bunrui',
        `農畜産物 (products)「${code}」は農業者分類に変換できません。`,
      );
    }
    return label;
  });
  return labels.join(',');
}

/**
 * `remarks1`〜`remarks5` → `biko` (No 55): join the non-empty slots with a
 * newline. Reverse of the outbound `toRemarks` (which packs line 5+ into
 * `remarks5`, newlines included — so a plain join round-trips faithfully).
 */
export function fromRemarks(row: {
  remarks1?: string | null;
  remarks2?: string | null;
  remarks3?: string | null;
  remarks4?: string | null;
  remarks5?: string | null;
}): string {
  return REMARKS_KEYS.map((k) => str(row[k]))
    .filter((line) => line !== '')
    .join('\n');
}

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * The subset of the denshiban `users` view (113 cols) the mapping consumes.
 * Every value arrives as `string | null` (raw MySQL read). Date columns
 * (`activated_at` / `deleted_at`) must be normalized to `YYYY-MM-DD` **by the
 * caller's query** (e.g. `DATE_FORMAT`), keeping this builder clock-free.
 *
 * `JACd` / `ShopCd` / `payment_id` are intentionally absent — the assembler
 * resolves them (DB lookup / pending value map) into {@link InboundBuildCtx}.
 */
export interface DenshibanUserRow {
  /** 会員ID → denshi_kaiin_id (No 6). */
  id: string | null;

  // Name (No 10-13) — note the twist: sei ← first_name, mei ← last_name.
  first_name: string | null;
  last_name: string | null;
  first_kana: string | null;
  last_kana: string | null;

  // Address of the subscriber (No 15-22).
  zip1: string | null;
  zip2: string | null;
  pref_id: string | null;
  addr: string | null;
  city: string | null;
  building: string | null;
  tel1: string | null;
  tel2: string | null;
  email: string | null;

  // Attributes / flags (No 23-25).
  melmaga: string | null;
  birthyear: string | null;
  sex: string | null;

  // Classification (No 8, 9, 57).
  member_type: string | null;
  status: string | null;
  approval: string | null;

  // Payment / billing (No 42, 54).
  payment_cycle: string | null;
  payment_start_ym: string | null;

  // Reader-layer / producer (No 48-49).
  profession: string | null;
  others_profession: string | null;
  products: string | null;
  others_products: string | null;

  // Notes (No 55).
  remarks1: string | null;
  remarks2: string | null;
  remarks3: string | null;
  remarks4: string | null;
  remarks5: string | null;

  // Paper-delivery — 併読 only (No 7, 27-31).
  paper_permission_dt: string | null;
  paper_zip: string | null;
  paper_pref_id: string | null;
  paper_addr: string | null;
  paper_city: string | null;
  paper_building: string | null;

  // Dates — normalized to YYYY-MM-DD by the caller (No 50-52).
  activated_at: string | null;
  deleted_at: string | null;
}

/**
 * Values the caller resolves up front and passes in, so this builder never
 * touches the DB or a pending value map — the inbound analogue of
 * {@link ./denshiban-payload.builder#BuildCtx}.
 */
export interface InboundBuildCtx {
  /** JA (No 2) — resolved from `JACd` via `m_ja`. */
  jaId: number;
  /** 管理支店 (No 3) — resolved from `JACd` via `m_kanri_shiten`. */
  kanriShitenId: number;
  /**
   * 販売店 (No 38) — 併読 は `ShopCd`(= hanbaiten_code) → `m_hanbaiten` で解決。
   * 電子版単独 は **null**（顧客決定 2026-07-19：ダミー販売店は後で顧客が作成。
   * それまで電子版単独の hanbaiten_id は null 運用）。
   */
  hanbaitenId: number | null;
  /**
   * 支払方法 (No 41) — denshiban `payment_id` から解決。顧客確認 2026-07-19：
   * `payment_id` は `shiharai_hoho`(m_code SHIHARAI_HOHO) と同じ代表値なので
   * そのまま写す。未設定(空)のときだけ **null**（CREATE 側で判断。列は NOT NULL）。
   * m_code 妥当性は書込サービスが検証する。差分対象外（下記 EXCLUDED_FIELDS_DOC）。
   */
  shiharaiHoho: number | null;
  /** 履歴No (No 56) — 1 on the first sync, +1 per update. Defaults to 1. */
  rirekiNo?: number;
  /** 読者情報変更適用日 (No 53) — the sync date `YYYY-MM-DD`. Defaults to null. */
  syncDate?: string | null;
}

/**
 * The `t_dokusya` columns this builder can derive. Excludes the ones the
 * assembler / DB own: `dokusya_id` (identity), `created_*` / `updated_*`
 * (system), and the soft-delete `deleted_at` timestamp (the assembler decides
 * whether to soft-delete when `tetsuzuki_shurui === 解約`).
 *
 * `tanka_id` is `number | null` here to honour No 39 (連動時 NULL). ⚠️ The entity
 * column is currently declared NOT NULL — reconcile before persisting (make the
 * column nullable, or assign a ダミー単価 like the ダミー販売店).
 */
export interface DokusyaDraft {
  // From ctx.
  jaId: number;
  kanriShitenId: number;
  hanbaitenId: number | null;
  shiharaiHoho: number | null;
  rirekiNo: number;
  johoHenkoTekiyoDate: string | null;

  // Identity from denshiban.
  denshiKaiinId: number | null;

  // Classification.
  dokusyaShubetsu: number;
  tetsuzukiShurui: number;
  denshiDokusyaShubetsu: number | null;
  denshiShoninStatus: number | null;

  // Name.
  shimeiSei: string;
  shimeiMei: string;
  shimeiKanaSei: string;
  shimeiKanaMei: string;

  // Address.
  yubinNo: string;
  todofukenCode: string;
  shikuchoson: string;
  chomeBanchi: string;
  tatemonoMei: string;
  renrakusaki1: string;
  renrakusaki2: string;
  email: string;

  // Attributes.
  mailMagazineFlg: number;
  birthYear: number | null;
  gender: number;
  dokusyasoBunrui: string;
  nogyosyaBunrui: string;

  // Paper-delivery.
  haitatsuSameFlg: boolean;
  haitatsuYubinNo: string;
  haitatsuTodofukenCode: string;
  haitatsuShikuchoson: string;
  haitatsuChomeBanchi: string;
  haitatsuTatemonoMei: string;
  haitatsuRenrakusaki1: string;
  haitatsuRenrakusaki2: string;
  haitatsuShimeiSei: string;
  haitatsuShimeiMei: string;
  haitatsuShimeiKanaSei: string;
  haitatsuShimeiKanaMei: string;

  // Payment / billing.
  dokusyaryoShiharaiCycle: number | null;
  seikyuKaishiMonth: string;

  // Dates.
  shokiDokusyaKaishiDate: string;
  dokusyaKaishiDate: string;
  dokusyaChushiDate: string | null;

  // Notes.
  biko: string;

  // Constants (No 4, 5, 14, 39, 40, 43-47).
  shitenId: number | null;
  kumiaiinCode: string;
  dokusyaBusu: number;
  tankaId: number | null;
  yubinKubun: string;
  bankBranchCode: string;
  bankBranchName: string;
  hikiotoshiYokinShubetsu: number | null;
  hikiotoshiKozaNo: string;
  hikiotoshiKozaMeigi: string;
}

// ─── Numeric parsers (throw on garbage, keep null for absent) ────────────────

/** `id` → `denshi_kaiin_id`. Empty → null; non-integer → throw (No 6). */
function toDenshiKaiinId(id: string | null | undefined): number | null {
  const s = str(id).trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) {
    throw new DenshibanMappingError(
      'denshi_kaiin_id',
      `会員ID (id)「${s}」が数値ではありません。`,
    );
  }
  return Number(s);
}

/** `birthyear` → `birth_year`. Empty → null; non-4-digit-year → throw (No 24). */
function toBirthYear(birthyear: string | null | undefined): number | null {
  const s = str(birthyear).trim();
  if (s === '') return null;
  if (!/^\d{4}$/.test(s)) {
    throw new DenshibanMappingError(
      'birth_year',
      `誕生年 (birthyear)「${s}」は西暦4桁ではありません。`,
    );
  }
  return Number(s);
}

/** `payment_cycle` → `dokusyaryo_shiharai_cycle`. Empty → null (No 42). */
function toShiharaiCycle(cycle: string | null | undefined): number | null {
  const s = str(cycle).trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) {
    throw new DenshibanMappingError(
      'dokusyaryo_shiharai_cycle',
      `決済周期 (payment_cycle)「${s}」が数値ではありません。`,
    );
  }
  return Number(s);
}

// ─── Main builder ───────────────────────────────────────────────────────────

/**
 * Builds a `t_dokusya` draft from one denshiban `users` record (No 1-62).
 *
 * @throws {DenshibanMappingError} when a denshiban value cannot be expressed in
 *   cloud (unknown code, non-numeric id, etc.).
 */
export function buildDokusyaFromDenshiban(
  row: DenshibanUserRow,
  ctx: InboundBuildCtx,
): DokusyaDraft {
  const tetsuzukiShurui = toTetsuzukiShurui(row.status);
  const isCancelled = tetsuzukiShurui === TetsuzukiShurui.KAIYAKU; // status=9

  const dokusyaShubetsu = toDokusyaShubetsu(row.paper_permission_dt);
  // 電子版(2) → 配達先は購読者と同じ(TRUE); 併読(3) → 別(FALSE) (No 26).
  const haitatsuSameFlg = dokusyaShubetsu !== DokusyaShubetsu.BOTH;
  // When same (電子版) the delivery address is blank; when 併読 it comes from
  // the paper_* columns (No 27-31). The view has no delivery name / phone, so
  // those stay '' regardless (No 32-37).
  const paper = haitatsuSameFlg
    ? { zip: '', pref: '', addr: '', city: '', building: '' }
    : {
        zip: str(row.paper_zip).replace(/[^0-9]/g, ''),
        pref: normPref(row.paper_pref_id),
        addr: str(row.paper_addr),
        city: str(row.paper_city),
        building: str(row.paper_building),
      };

  const kaishiDate = toDateOnly(row.activated_at);

  return {
    // ── From ctx (assembler-resolved) ──
    jaId: ctx.jaId,
    kanriShitenId: ctx.kanriShitenId,
    hanbaitenId: ctx.hanbaitenId,
    shiharaiHoho: ctx.shiharaiHoho,
    rirekiNo: ctx.rirekiNo ?? 1,
    johoHenkoTekiyoDate: ctx.syncDate ?? null,

    // ── Identity / classification ──
    denshiKaiinId: toDenshiKaiinId(row.id),
    dokusyaShubetsu,
    tetsuzukiShurui,
    denshiDokusyaShubetsu: toDenshiDokusyaShubetsu(row.member_type),
    denshiShoninStatus: toShoninStatus(row.approval),

    // ── Name (No 10-13) ──
    shimeiSei: str(row.first_name),
    shimeiMei: str(row.last_name),
    shimeiKanaSei: str(row.first_kana),
    shimeiKanaMei: str(row.last_kana),

    // ── Address (No 15-22) ──
    yubinNo: toYubinNo(row.zip1, row.zip2),
    todofukenCode: normPref(row.pref_id),
    shikuchoson: str(row.addr),
    chomeBanchi: str(row.city),
    tatemonoMei: str(row.building),
    renrakusaki1: str(row.tel1),
    renrakusaki2: str(row.tel2),
    email: str(row.email),

    // ── Attributes (No 23-25, 48-49) ──
    mailMagazineFlg: str(row.melmaga).trim() === '1' ? 1 : 0,
    birthYear: toBirthYear(row.birthyear),
    gender: toGender(row.sex),
    dokusyasoBunrui: toDokusyasoBunrui(row.profession, row.others_profession),
    nogyosyaBunrui: toNogyosyaBunrui(row.products, row.others_products),

    // ── Paper-delivery (No 26-37) ──
    haitatsuSameFlg,
    haitatsuYubinNo: paper.zip,
    haitatsuTodofukenCode: paper.pref,
    haitatsuShikuchoson: paper.addr,
    haitatsuChomeBanchi: paper.city,
    haitatsuTatemonoMei: paper.building,
    haitatsuRenrakusaki1: '',
    haitatsuRenrakusaki2: '',
    haitatsuShimeiSei: '',
    haitatsuShimeiMei: '',
    haitatsuShimeiKanaSei: '',
    haitatsuShimeiKanaMei: '',

    // ── Payment / billing (No 42, 54) ──
    dokusyaryoShiharaiCycle: toShiharaiCycle(row.payment_cycle),
    seikyuKaishiMonth: str(row.payment_start_ym),

    // ── Dates (No 50-52) ──
    shokiDokusyaKaishiDate: kaishiDate, // 初回値。以降は保持（更新時は上書きしない）。
    dokusyaKaishiDate: kaishiDate,
    dokusyaChushiDate: isCancelled ? toDateOnly(row.deleted_at) || null : null,

    // ── Notes (No 55) ──
    biko: fromRemarks(row),

    // ── Constants (No 4, 5, 14, 39, 40, 43-47) ──
    shitenId: null,
    kumiaiinCode: '', // No 5: 空文字許容（列は NOT NULL のため '' を設定）。
    dokusyaBusu: 1, // No 14: 電子版は 1契約=1部 固定。
    tankaId: null, // No 39: 連動時 NULL（⚠ 列は現状 NOT NULL — DokusyaDraft 参照）。
    yubinKubun: '0', // No 40.
    bankBranchCode: '', // No 43-47: ビューに口座情報なし。
    bankBranchName: '',
    hikiotoshiYokinShubetsu: null,
    hikiotoshiKozaNo: '',
    hikiotoshiKozaMeigi: '',
  };
}
