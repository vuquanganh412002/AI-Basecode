import { DokusyaShubetsu, ShiharaiHoho } from '@/common/enums';
import { todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import {
  DokusyaHistoryItemDto,
} from './dto/dokusya-history-response.dto';
import { DokusyaResponseDto } from './dto/dokusya-response.dto';

/**
 * Extra fields the service resolves by JOIN (api.md §4.3 SELECT) before
 * invoking the mapper. The mapper expects the joined labels +
 * `m_shiten` reverse-lookup result to be ready — it does NOT issue any
 * IO on its own.
 */
export interface DokusyaJoinFields {
  hanbaiten_name: string;
  tanka_name: string;
  bank_shiten_id: number | null;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
}

/**
 * Coerce a possibly-stringified BIGINT id into a `number`. TypeORM
 * surfaces `bigint` Postgres columns as `string`; the API response
 * keeps the JSON contract numeric.
 */
function coerceNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function coerceNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Nullable scalar shape a raw `getRawMany()` column can take before coercion. */
type RawScalarNullable = number | string | null;

function isoOrEmpty(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Map a `Dokusya` entity + JOIN-side fields to the snake_case response
 * DTO returned by GET / POST / PUT detail endpoints.
 *
 * Pure function — no Nest DI, no repo. The service has already done
 * the JOINs and m_shiten reverse-lookup; this mapper is the
 * camelCase → snake_case translation layer only.
 *
 * See `apps/backend/src/modules/ja/ja.mapper.ts` for the canonical
 * pattern referenced by `.claude/rules/nestjs.md §mapper`.
 */
/**
 * 履歴メタ（解約予約ガード）。master は未来解約を反映しないため getDetail が
 * 履歴から算出して渡す。省略時は解約予約なし・履歴なし相当（作成/更新レスポンス
 * では未使用）。
 */
export interface DokusyaHistoryMeta {
  has_active_kaiyaku?: boolean;
  max_joho_date?: string | null;
}

export function toDokusyaResponse(
  entity: Dokusya,
  joins: DokusyaJoinFields,
  meta: DokusyaHistoryMeta = {},
): DokusyaResponseDto {
  return {
    dokusya_id: coerceNumber(entity.dokusyaId),
    ja_id: coerceNumber(entity.jaId),
    // kanri_shiten_id / shiten_id は購読者に未設定のことがある (NULL)。0 へ
    // 丸めると FE がそのまま 0 を送り返し、更新で assertFkScope が「id=0 の
    // 管理支店」を探して 400 (管理支店IDが存在しません) になる。NULL を保って
    // 一覧マッパー (coerceNullableNumber) と nullable 直列化規約に合わせる。
    kanri_shiten_id: coerceNullableNumber(entity.kanriShitenId),
    shiten_id: coerceNullableNumber(entity.shitenId),
    kumiaiin_code: entity.kumiaiinCode ?? '',
    dokusya_shubetsu: coerceNumber(entity.dokusyaShubetsu),
    tetsuzuki_shurui: coerceNumber(entity.tetsuzukiShurui),
    denshi_dokusya_shubetsu: coerceNullableNumber(entity.denshiDokusyaShubetsu),
    shimei_sei: entity.shimeiSei ?? '',
    shimei_mei: entity.shimeiMei ?? '',
    shimei_kana_sei: entity.shimeiKanaSei ?? '',
    shimei_kana_mei: entity.shimeiKanaMei ?? '',
    dokusya_busu: coerceNumber(entity.dokusyaBusu),
    yubin_no: entity.yubinNo ?? '',
    todofuken_code: entity.todofukenCode ?? '',
    shikuchoson: entity.shikuchoson ?? '',
    chome_banchi: entity.chomeBanchi ?? '',
    tatemono_mei: entity.tatemonoMei ?? '',
    renrakusaki_1: entity.renrakusaki1 ?? '',
    renrakusaki_2: entity.renrakusaki2 ?? '',
    email: entity.email ?? '',
    mail_magazine_flg: coerceNullableNumber(entity.mailMagazineFlg),
    birth_year: coerceNullableNumber(entity.birthYear),
    gender: coerceNullableNumber(entity.gender),
    haitatsu_same_flg: Boolean(entity.haitatsuSameFlg),
    haitatsu_yubin_no: entity.haitatsuYubinNo ?? '',
    haitatsu_todofuken_code: entity.haitatsuTodofukenCode ?? '',
    haitatsu_shikuchoson: entity.haitatsuShikuchoson ?? '',
    haitatsu_chome_banchi: entity.haitatsuChomeBanchi ?? '',
    haitatsu_tatemono_mei: entity.haitatsuTatemonoMei ?? '',
    haitatsu_renrakusaki_1: entity.haitatsuRenrakusaki1 ?? '',
    haitatsu_renrakusaki_2: entity.haitatsuRenrakusaki2 ?? '',
    haitatsu_shimei_sei: entity.haitatsuShimeiSei ?? '',
    haitatsu_shimei_mei: entity.haitatsuShimeiMei ?? '',
    haitatsu_shimei_kana_sei: entity.haitatsuShimeiKanaSei ?? '',
    haitatsu_shimei_kana_mei: entity.haitatsuShimeiKanaMei ?? '',
    hanbaiten_id: coerceNumber(entity.hanbaitenId),
    hanbaiten_name: joins.hanbaiten_name,
    tanka_id: coerceNumber(entity.tankaId),
    tanka_name: joins.tanka_name,
    yubin_kubun: entity.yubinKubun ?? '',
    shiharai_hoho: coerceNumber(entity.shiharaiHoho),
    dokusyaryo_shiharai_cycle: coerceNullableNumber(
      entity.dokusyaryoShiharaiCycle,
    ),
    bank_shiten_id: joins.bank_shiten_id,
    jastem_toriatsukai_tenpo_code: joins.jastem_toriatsukai_tenpo_code,
    jastem_tenpo_name: joins.jastem_tenpo_name,
    bank_branch_code: entity.bankBranchCode ?? '',
    bank_branch_name: entity.bankBranchName ?? '',
    hikiotoshi_yokin_shubetsu: coerceNullableNumber(
      entity.hikiotoshiYokinShubetsu,
    ),
    hikiotoshi_koza_no: entity.hikiotoshiKozaNo ?? '',
    hikiotoshi_koza_meigi: entity.hikiotoshiKozaMeigi ?? '',
    dokusyaso_bunrui: entity.dokusyasoBunrui ?? '',
    nogyosya_bunrui: entity.nogyosyaBunrui ?? '',
    shoki_dokusya_kaishi_date: entity.shokiDokusyaKaishiDate ?? '',
    dokusya_kaishi_date: entity.dokusyaKaishiDate ?? '',
    dokusya_chushi_date: entity.dokusyaChushiDate ?? null,
    joho_henko_tekiyo_date: entity.johoHenkoTekiyoDate ?? null,
    seikyu_kaishi_month: entity.seikyuKaishiMonth ?? '',
    biko: entity.biko ?? '',
    rireki_no: coerceNumber(entity.rirekiNo),
    denshi_shonin_status: coerceNullableNumber(entity.denshiShoninStatus),
    denshi_kaiin_id: coerceNullableNumber(entity.denshiKaiinId),
    created_at: isoOrEmpty(entity.createdAt),
    updated_at: isoOrEmpty(entity.updatedAt),
    has_active_kaiyaku: meta.has_active_kaiyaku ?? false,
    max_joho_date: meta.max_joho_date ?? null,
  };
}

/**
 * SCR-014 — flat list item shape returned by GET /api/v1/dokusya
 * (api.md §API-014-001 レスポンスデータ #1-#22 per-row fields).
 *
 * Fields mirror the SELECT in api.md §4.5 with two computed columns
 * (full_name + full_name_kana via shimei concat, haitatsu via address
 * concat) and an `is_read_only` flag computed BE-side so the FE can
 * disable "編集"/"削除" buttons without re-deriving the rule.
 */
export interface DokusyaListItem {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  /** 手続種類 — m_code TETSUZUKI_SHURUI (0:解約, 1:新規). */
  tetsuzuki_shurui: number;
  renrakusaki_1: string;
  renrakusaki_2: string;
  /** 配達先氏名 — haitatsu_shimei_sei + ' ' + haitatsu_shimei_mei (concat, trimmed). */
  haitatsu_full_name: string;
  haitatsu_yubin_no: string;
  haitatsu: string;
  hanbaiten_id: number;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
  denshi_shonin_status: number | null;
  shoki_dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  is_read_only: boolean;
}

/**
 * Compute the `is_read_only` flag from the canonical rule
 * (api.md §4.5):
 *   (dokusya_shubetsu = 2 AND shiharai_hoho = 6) OR dokusya_shubetsu = 3
 *
 * Exported so service/spec helpers can short-circuit without
 * re-implementing the predicate inline.
 */
export function isDokusyaReadOnly(
  dokusyaShubetsu: number | null | undefined,
  shiharaiHoho: number | null | undefined,
): boolean {
  const shubetsu = Number(dokusyaShubetsu);
  const hoho = Number(shiharaiHoho);
  if (shubetsu === DokusyaShubetsu.BOTH) return true;
  return (
    shubetsu === DokusyaShubetsu.DIGITAL && hoho === ShiharaiHoho.CREDIT_CARD
  );
}

/**
 * Map a raw QueryBuilder row (snake_case from getRawMany) → flat
 * DokusyaListItem with the computed is_read_only flag.
 *
 * The mapper is permissive on input — the factory `buildDokusyaListRow`
 * already emits a complete shape (matching api.md §4.5 SELECT
 * column-by-column) so a partial-row branch isn't needed in production.
 */
export function toDokusyaListItem(
  row: Record<string, unknown>,
): DokusyaListItem {
  const dokusyaShubetsu = coerceNumber(row.dokusya_shubetsu as number | string);
  const shiharaiHoho = coerceNumber(row.shiharai_hoho as number | string);
  const isReadOnly =
    row.is_read_only === undefined
      ? isDokusyaReadOnly(dokusyaShubetsu, shiharaiHoho)
      : Boolean(row.is_read_only);
  return {
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    ja_id: coerceNumber(row.ja_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    full_name: stringOrEmpty(row.full_name),
    full_name_kana: stringOrEmpty(row.full_name_kana),
    tetsuzuki_shurui: coerceNumber(row.tetsuzuki_shurui as number | string),
    renrakusaki_1: stringOrEmpty(row.renrakusaki_1),
    renrakusaki_2: stringOrEmpty(row.renrakusaki_2),
    // 配達先氏名 concat — trim so an empty 配達先氏名 renders '' (not a lone space).
    haitatsu_full_name: stringOrEmpty(row.haitatsu_full_name).trim(),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    haitatsu: stringOrEmpty(row.haitatsu),
    hanbaiten_id: coerceNumber(row.hanbaiten_id as number | string),
    hanbaiten_name: stringOrEmpty(row.hanbaiten_name),
    dokusya_shubetsu: dokusyaShubetsu,
    shiharai_hoho: shiharaiHoho,
    denshi_shonin_status: coerceNullableNumber(
      row.denshi_shonin_status as RawScalarNullable,
    ),
    shoki_dokusya_kaishi_date: stringOrEmpty(row.shoki_dokusya_kaishi_date),
    dokusya_chushi_date: nullableString(row.dokusya_chushi_date),
    is_read_only: isReadOnly,
  };
}

/**
 * Canonical 15-column Japanese header row for the Excel export. Mirrors
 * the SCR-014 検索結果テーブル column layout (顧客要件 2026-06):
 *   - ID (dokusya_id) added as the first column
 *   - 支店 / 連絡先２ columns removed
 *   - 手続種類 / 購読種別 added after 購読者名
 *   - 配達先氏名 added after 連絡先１
 *   - 支払方法 added after 販売店名
 *
 * かな氏名 stays search-only (no display/export column). Exported so the
 * unit spec can assert against a single source of truth.
 */
export const DOKUSYA_EXPORT_HEADERS: readonly string[] = [
  'ID',
  '管理支店',
  '組合員コード',
  '購読者名',
  '手続種類',
  '購読種別',
  '連絡先１',
  '配達先氏名',
  '配達先郵便',
  '配達先住所',
  '販売店コード',
  '販売店名',
  '支払方法',
  '購読開始日',
  '購読中止日',
] as const;

/**
 * Resolved m_code labels for the three code-bound export columns
 * (手続種類 / 購読種別 / 支払方法). The service resolves these via
 * `CodeService.getLabel` before calling the mapper so the Excel file
 * shows customer-facing labels, not raw numeric codes.
 */
export interface DokusyaExcelLabels {
  tetsuzuki_shurui: string;
  dokusya_shubetsu: string;
  shiharai_hoho: string;
}

/**
 * Convert a DokusyaListItem → 15 string cells in Excel header order.
 * The three m_code columns render the resolved label (passed in by the
 * service). NULL date columns render as ''. The service then feeds these
 * into an ExcelJS worksheet.
 */
export function toDokusyaExcelRow(
  item: DokusyaListItem,
  labels: DokusyaExcelLabels,
): string[] {
  return [
    String(item.dokusya_id),
    item.kanri_shiten_name ?? '',
    item.kumiaiin_code,
    item.full_name,
    labels.tetsuzuki_shurui,
    labels.dokusya_shubetsu,
    item.renrakusaki_1,
    item.haitatsu_full_name,
    item.haitatsu_yubin_no,
    item.haitatsu,
    String(item.hanbaiten_id),
    item.hanbaiten_name,
    labels.shiharai_hoho,
    item.shoki_dokusya_kaishi_date,
    item.dokusya_chushi_date ?? '',
  ];
}

/**
 * SCR-013 — 購読者履歴情報画面: one full row of
 * `GET /api/v1/dokusya/:dokusya_id/rireki` (api.md §API-013-001
 * §レスポンスデータ #2-#61).
 *
 * Distinct from `DokusyaHistoryItemDto` (SCR-011 /history — lighter,
 * carries a `tetsuzuki_shurui_label`). This endpoint returns the FULL
 * snapshot joined with name lookups (管理支店 / 支店 / 都道府県×3 /
 * 販売店×2) and — per `nestjs.md §Response serialization` + api.md
 * §m_code note — CODE VALUES ONLY (no `*_label`; FE resolves labels
 * via useCodesStore).
 *
 * Nullability mirrors the api.md レスポンスデータ "Nullable" column:
 * `〇` → `… | null`, blank → non-null string / number.
 */
export interface DokusyaRirekiListItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei_sei: string;
  shimei_mei: string;
  todofuken_code: string;
  todofuken_name: string | null;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  mail_magazine_flg: number | null;
  birth_year: number | null;
  gender: number | null;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  dokusya_busu: number;
  zenkai_dokusya_busu: number | null;
  haitatsu_yubin_no: string;
  zenkai_yubin_no: string | null;
  haitatsu_todofuken_code: string;
  haitatsu_todofuken_name: string | null;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  zenkai_todofuken_code: string | null;
  zenkai_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  hanbaiten_id: number;
  hanbaiten_name: string | null;
  zenkai_hanbaiten_id: number | null;
  zenkai_hanbaiten_name: string | null;
  tetsuzuki_shurui: number;
  shoki_dokusya_kaishi_date: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  joho_henko_tekiyo_date: string | null;
  saishin_data_flg: boolean;
  zougen_hokoku_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  /** 取消(赤伝)済みフラグ。対象行・打ち消し行の両方で true。*/
  torikeshi_flg: boolean;
  /** 備考。取消時は取消理由が記録される（顧客要件）。*/
  biko: string;
  /**
   * この行を 取消 できるか（BE の {@link canTorikeshi} と同一条件・顧客要件2026-07）:
   * 紙版(dokusya_shubetsu=1) かつ 新規/取消済でない かつ 適用日が未来(本日<適用日,JST)
   * かつ チェーン末尾(有効レコード) であること。FE のボタン disable 判定に使う
   * （実際の可否は BE エンドポイントが再検証する）。
   */
  can_torikeshi: boolean;
  hikiotoshi_yokin_shubetsu: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  created_at: string;
  created_by: string;
}

/**
 * Narrow a raw `getRawMany()` column (always scalar at runtime) to a
 * primitive so String() can't hit the `[object Object]` path. The
 * assertion is required here — the `string | number` receiver does not
 * accept `unknown` without it.
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

/** `null` → null, otherwise the trimmed string form. */
function nullableString(value: unknown): string | null {
  return value == null ? null : String(asScalar(value));
}

/** `null` → '', otherwise the string form. */
function stringOrEmpty(value: unknown): string {
  return value == null ? '' : String(asScalar(value));
}

/**
 * Map a raw QueryBuilder row (snake_case aliases from `getRawMany`,
 * exactly the SELECT in api.md §4.5) → `DokusyaRirekiListItem`.
 *
 * Pure function — the service already resolved every JOIN. BIGINT ids
 * arrive as strings from TypeORM and are coerced to numbers to keep the
 * JSON contract numeric; nullable joins (kanri_shiten_name, todofuken_name,
 * zenkai_* …) preserve `null` so the FE can distinguish "absent" from "".
 */
export function toDokusyaRirekiListItem(
  row: Record<string, unknown>,
  /**
   * `dokusya_rireki_id` of the chain tail (greatest (joho, rireki_no) among
   * `torikeshi_flg=false` rows). When this row IS the tail and is neither
   * 新規 nor 取消済, `can_torikeshi` is true. `null` → no cancellable tail.
   */
  tailRirekiId: number | null = null,
): DokusyaRirekiListItem {
  const shinki = Boolean(row.shinki_flg);
  const torikeshi = Boolean(row.torikeshi_flg);
  const isTail =
    tailRirekiId != null &&
    coerceNumber(row.dokusya_rireki_id as number | string) === tailRirekiId;
  // 顧客要件2026-07（canTorikeshi と同一条件）:
  // 6. 紙版(dokusya_shubetsu=1)のみ取消可（電子版=2・併読=3 は電子版連携のため不可）。
  const isPaper =
    coerceNumber(row.dokusya_shubetsu as number | string) ===
    DokusyaShubetsu.PAPER;
  // 7. 適用日が未来（本日 < 適用日, JST）でなければ取消不可。DATE の ISO 文字列比較。
  const isFutureJoho =
    typeof row.joho_henko_tekiyo_date === 'string' &&
    row.joho_henko_tekiyo_date > todayIsoJst();
  return {
    dokusya_rireki_id: coerceNumber(row.dokusya_rireki_id as number | string),
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    rireki_no: coerceNumber(row.rireki_no as number | string),
    ja_id: coerceNumber(row.ja_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    shimei_sei: stringOrEmpty(row.shimei_sei),
    shimei_mei: stringOrEmpty(row.shimei_mei),
    todofuken_code: stringOrEmpty(row.todofuken_code),
    todofuken_name: nullableString(row.todofuken_name),
    shikuchoson: stringOrEmpty(row.shikuchoson),
    chome_banchi: stringOrEmpty(row.chome_banchi),
    tatemono_mei: stringOrEmpty(row.tatemono_mei),
    renrakusaki_1: stringOrEmpty(row.renrakusaki_1),
    renrakusaki_2: stringOrEmpty(row.renrakusaki_2),
    email: stringOrEmpty(row.email),
    mail_magazine_flg: coerceNullableNumber(row.mail_magazine_flg as number | string | null),
    birth_year: coerceNullableNumber(row.birth_year as RawScalarNullable),
    gender: coerceNullableNumber(row.gender as RawScalarNullable),
    dokusyaso_bunrui: stringOrEmpty(row.dokusyaso_bunrui),
    nogyosya_bunrui: stringOrEmpty(row.nogyosya_bunrui),
    dokusya_busu: coerceNumber(row.dokusya_busu as number | string),
    zenkai_dokusya_busu: coerceNullableNumber(
      row.zenkai_dokusya_busu as RawScalarNullable,
    ),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    zenkai_yubin_no: nullableString(row.zenkai_yubin_no),
    haitatsu_todofuken_code: stringOrEmpty(row.haitatsu_todofuken_code),
    haitatsu_todofuken_name: nullableString(row.haitatsu_todofuken_name),
    haitatsu_shikuchoson: stringOrEmpty(row.haitatsu_shikuchoson),
    haitatsu_chome_banchi: stringOrEmpty(row.haitatsu_chome_banchi),
    haitatsu_tatemono_mei: stringOrEmpty(row.haitatsu_tatemono_mei),
    haitatsu_shimei_sei: stringOrEmpty(row.haitatsu_shimei_sei),
    haitatsu_shimei_mei: stringOrEmpty(row.haitatsu_shimei_mei),
    zenkai_todofuken_code: nullableString(row.zenkai_todofuken_code),
    zenkai_todofuken_name: nullableString(row.zenkai_todofuken_name),
    zenkai_shikuchoson: nullableString(row.zenkai_shikuchoson),
    zenkai_chome_banchi: nullableString(row.zenkai_chome_banchi),
    zenkai_tatemono_mei: nullableString(row.zenkai_tatemono_mei),
    hanbaiten_id: coerceNumber(row.hanbaiten_id as number | string),
    hanbaiten_name: nullableString(row.hanbaiten_name),
    zenkai_hanbaiten_id: coerceNullableNumber(
      row.zenkai_hanbaiten_id as RawScalarNullable,
    ),
    zenkai_hanbaiten_name: nullableString(row.zenkai_hanbaiten_name),
    tetsuzuki_shurui: coerceNumber(row.tetsuzuki_shurui as number | string),
    shoki_dokusya_kaishi_date: stringOrEmpty(row.shoki_dokusya_kaishi_date),
    dokusya_kaishi_date: stringOrEmpty(row.dokusya_kaishi_date),
    dokusya_chushi_date: nullableString(row.dokusya_chushi_date),
    joho_henko_tekiyo_date: nullableString(row.joho_henko_tekiyo_date),
    saishin_data_flg: Boolean(row.saishin_data_flg),
    zougen_hokoku_flg: Boolean(row.zougen_hokoku_flg),
    shinki_flg: shinki,
    kaiyaku_flg: Boolean(row.kaiyaku_flg),
    torikeshi_flg: torikeshi,
    biko: stringOrEmpty(row.biko),
    can_torikeshi: isPaper && !shinki && !torikeshi && isFutureJoho && isTail,
    hikiotoshi_yokin_shubetsu: coerceNullableNumber(
      row.hikiotoshi_yokin_shubetsu as RawScalarNullable,
    ),
    bank_branch_code: stringOrEmpty(row.bank_branch_code),
    bank_branch_name: stringOrEmpty(row.bank_branch_name),
    hikiotoshi_koza_no: stringOrEmpty(row.hikiotoshi_koza_no),
    hikiotoshi_koza_meigi: stringOrEmpty(row.hikiotoshi_koza_meigi),
    created_at: isoOrEmpty(row.created_at as Date | string | null),
    created_by: stringOrEmpty(row.created_by),
  };
}

/**
 * Map a `DokusyaRireki` entity → history list item. The caller resolves
 * `tetsuzuki_shurui_label` via `CodeService.getLabel(...)` once per
 * row (CodeService is in-memory cached, so the per-row lookup is free).
 */
export function toDokusyaHistoryItem(
  row: DokusyaRireki,
  tetsuzukiShuruiLabel: string,
): DokusyaHistoryItemDto {
  return {
    dokusya_rireki_id: coerceNumber(row.dokusyaRirekiId),
    dokusya_id: coerceNumber(row.dokusyaId),
    rireki_no: coerceNumber(row.rirekiNo),
    tetsuzuki_shurui: coerceNumber(row.tetsuzukiShurui),
    tetsuzuki_shurui_label: tetsuzukiShuruiLabel,
    henko_riyu: row.henkoRiyu ?? '',
    saishin_data_flg: Boolean(row.saishinDataFlg),
    shinki_flg: Boolean(row.shinkiFlg),
    kaiyaku_flg: Boolean(row.kaiyakuFlg),
    zougen_hokoku_flg: Boolean(row.zougenHokokuFlg),
    denshi_shonin_status: coerceNullableNumber(row.denshiShoninStatus),
    created_at: isoOrEmpty(row.createdAt),
    created_by: row.createdBy ?? '',
  };
}

// ════════════════════════════════════════════════════════════════════════
// SCR-015 — 購読者販売店一括置換画面 (replace search row)
// ════════════════════════════════════════════════════════════════════════

/**
 * Flat snake_case row returned by `DokusyaService.searchForReplace`
 * (ACSMS-API-015-001 §レスポンスデータ). `shimei` and `haitatsu_address`
 * are concatenations the mapper computes (api.md §4.6).
 */
export interface ReplaceSearchItem {
  dokusya_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei: string;
  haitatsu_yubin_no: string;
  haitatsu_address: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
}

/**
 * Map a joined raw row (api.md §4.5 SELECT) → the replace-search response
 * shape. `shimei = shimei_sei + ' ' + shimei_mei`; `haitatsu_address =
 * todofuken_name + haitatsu_shikuchoson + haitatsu_chome_banchi +
 * haitatsu_tatemono_mei` (api.md §4.6). Raw rows arrive from
 * `getRawMany()` so every value is coerced from string.
 */
export function toReplaceSearchItem(
  row: Record<string, unknown>,
): ReplaceSearchItem {
  const sei = stringOrEmpty(row.shimei_sei);
  const mei = stringOrEmpty(row.shimei_mei);
  const todofuken = stringOrEmpty(row.todofuken_name);
  const shikuchoson = stringOrEmpty(row.haitatsu_shikuchoson);
  const chomeBanchi = stringOrEmpty(row.haitatsu_chome_banchi);
  const tatemono = stringOrEmpty(row.haitatsu_tatemono_mei);
  return {
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    shimei: `${sei} ${mei}`.trim(),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    haitatsu_address: `${todofuken}${shikuchoson}${chomeBanchi}${tatemono}`,
    hanbaiten_id: coerceNumber(row.hanbaiten_id as number | string),
    hanbaiten_code: stringOrEmpty(row.hanbaiten_code),
    hanbaiten_name: stringOrEmpty(row.hanbaiten_name),
    dokusya_shubetsu: coerceNumber(row.dokusya_shubetsu as number | string),
    shiharai_hoho: coerceNumber(row.shiharai_hoho as number | string),
  };
}
