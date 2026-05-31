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
export function toDokusyaResponse(
  entity: Dokusya,
  joins: DokusyaJoinFields,
): DokusyaResponseDto {
  return {
    dokusya_id: coerceNumber(entity.dokusyaId),
    ja_id: coerceNumber(entity.jaId),
    kanri_shiten_id: coerceNumber(entity.kanriShitenId),
    shiten_id: coerceNumber(entity.shitenId),
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
    mail_magazine_flg: coerceNumber(entity.mailMagazineFlg),
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
    created_at: isoOrEmpty(entity.createdAt),
    updated_at: isoOrEmpty(entity.updatedAt),
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
