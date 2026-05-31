// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Fixture builders for the Dokusya entity, the DokusyaRireki entity, and
// the create / update / detail-response payloads driven by api.md
// §API-011-001 〜 §API-011-006.
//
// Field values mirror `docs/database/database-design.md §t_dokusya` and
// `§t_dokusya_rireki`. m_code values come from `docs/database/seeder.md`:
//   - DOKUSYA_SHUBETSU       : 1 紙版, 2 電子版, 3 併読   (seeder §5.1)
//   - TETSUZUKI_SHURUI       : 0 解約, 1 新規              (seeder §5.2)
//   - DENSHI_DOKUSYA_SHUBETSU: 0 無料, 1 有料              (seeder §5.3)
//   - SHIHARAI_HOHO          : 1 口座引落 〜 9 その他      (seeder §5.4)
//   - YUBIN_KUBUN            : '0' 空, '1' 郵送            (seeder §5.11)
//
// Used in: dokusya.service.spec, dokusya.controller.spec, dokusya.integration.spec.

import type { Dokusya } from '@/database/entities/dokusya.entity';
import type { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

let seq = 0;
const nextId = () => ++seq;

/**
 * Default-valid Dokusya entity row — every NOT-NULL column populated with a
 * believable value. Override individual fields via the `overrides` arg.
 *
 * `createdAt` / `updatedAt` use wall-clock `new Date()` (never a hardcoded
 * literal) so the fixture doesn't become a time-bomb against any future
 * date-based service logic that compares against `Date.now()`.
 */
export function buildDokusya(overrides: Partial<Dokusya> = {}): Dokusya {
  const now = new Date();
  return {
    dokusyaId: nextId(),
    jaId: 1,
    kanriShitenId: 10,
    shitenId: 100,
    kumiaiinCode: 'K00001',
    dokusyaShubetsu: 1,
    tetsuzukiShurui: 1,
    denshiDokusyaShubetsu: null,
    shimeiSei: '山田',
    shimeiMei: '太郎',
    shimeiKanaSei: 'ヤマダ',
    shimeiKanaMei: 'タロウ',
    dokusyaBusu: 1,
    yubinNo: '1000001',
    todofukenCode: '13',
    shikuchoson: '千代田区',
    chomeBanchi: '千代田1-1',
    tatemonoMei: '',
    renrakusaki1: '0312345678',
    renrakusaki2: '',
    email: 'yamada@example.com',
    mailMagazineFlg: 1,
    birthYear: 1980,
    gender: 1,
    haitatsuSameFlg: true,
    haitatsuYubinNo: '',
    haitatsuTodofukenCode: '',
    haitatsuShikuchoson: '',
    haitatsuChomeBanchi: '',
    haitatsuTatemonoMei: '',
    haitatsuRenrakusaki1: '',
    haitatsuRenrakusaki2: '',
    haitatsuShimeiSei: '',
    haitatsuShimeiMei: '',
    haitatsuShimeiKanaSei: '',
    haitatsuShimeiKanaMei: '',
    hanbaitenId: 5,
    tankaId: 1,
    yubinKubun: '0',
    shiharaiHoho: 1,
    dokusyaryoShiharaiCycle: 1,
    bankBranchCode: '001',
    bankBranchName: '本店',
    hikiotoshiYokinShubetsu: 1,
    hikiotoshiKozaNo: '1234567',
    hikiotoshiKozaMeigi: 'ヤマダタロウ',
    dokusyasoBunrui: '農業者',
    nogyosyaBunrui: '水稲,野菜',
    shokiDokusyaKaishiDate: '2026-01-01',
    dokusyaKaishiDate: '2026-04-01',
    dokusyaChushiDate: null,
    johoHenkoTekiyoDate: null,
    seikyuKaishiMonth: '',
    biko: '',
    rirekiNo: 1,
    denshiShoninStatus: null,
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Dokusya;
}

/**
 * Default-valid DokusyaRireki entity row — captures every audit / history
 * column per `database-design.md §t_dokusya_rireki`.
 */
export function buildDokusyaRireki(
  overrides: Partial<DokusyaRireki> = {},
): DokusyaRireki {
  const now = new Date();
  return {
    dokusyaRirekiId: nextId(),
    dokusyaId: 100,
    rirekiNo: 1,
    jaId: 1,
    kanriShitenId: 10,
    shitenId: 100,
    kumiaiinCode: 'K00001',
    dokusyaShubetsu: 1,
    tetsuzukiShurui: 1,
    denshiDokusyaShubetsu: null,
    shimeiSei: '山田',
    shimeiMei: '太郎',
    shimeiKanaSei: 'ヤマダ',
    shimeiKanaMei: 'タロウ',
    dokusyaBusu: 1,
    yubinNo: '1000001',
    todofukenCode: '13',
    shikuchoson: '千代田区',
    chomeBanchi: '千代田1-1',
    tatemonoMei: '',
    renrakusaki1: '0312345678',
    renrakusaki2: '',
    email: 'yamada@example.com',
    mailMagazineFlg: 1,
    birthYear: 1980,
    gender: 1,
    haitatsuSameFlg: true,
    haitatsuYubinNo: '',
    haitatsuTodofukenCode: '',
    haitatsuShikuchoson: '',
    haitatsuChomeBanchi: '',
    haitatsuTatemonoMei: '',
    haitatsuRenrakusaki1: '',
    haitatsuRenrakusaki2: '',
    haitatsuShimeiSei: '',
    haitatsuShimeiMei: '',
    haitatsuShimeiKanaSei: '',
    haitatsuShimeiKanaMei: '',
    hanbaitenId: 5,
    tankaId: 1,
    yubinKubun: '0',
    shiharaiHoho: 1,
    dokusyaryoShiharaiCycle: 1,
    bankBranchCode: '001',
    bankBranchName: '本店',
    hikiotoshiYokinShubetsu: 1,
    hikiotoshiKozaNo: '1234567',
    hikiotoshiKozaMeigi: 'ヤマダタロウ',
    dokusyasoBunrui: '農業者',
    nogyosyaBunrui: '水稲,野菜',
    shokiDokusyaKaishiDate: '2026-01-01',
    dokusyaKaishiDate: '2026-04-01',
    dokusyaChushiDate: null,
    johoHenkoTekiyoDate: null,
    seikyuKaishiMonth: '',
    biko: '',
    henkoRiyu: '',
    saishinDataFlg: true,
    zougenHokokuFlg: true,
    shinkiFlg: true,
    kaiyakuFlg: false,
    zenkaiHanbaitenId: null,
    zenkaiDokusyaBusu: null,
    zenkaiYubinNo: null,
    zenkaiTodofukenCode: null,
    zenkaiShikuchoson: null,
    zenkaiChomeBanchi: null,
    zenkaiTatemonoMei: null,
    denshiShoninStatus: null,
    hanbaitenTekiyoDate: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    ...overrides,
  } as unknown as DokusyaRireki;
}

/**
 * Default-valid CreateDokusyaDto payload — every required field per api.md
 * §API-011-002 リクエストパラメータ. Optional fields included with valid
 * defaults so happy-path tests don't need to repeat them.
 *
 * `bank_shiten_id` (口座引落用) is included by default because the default
 * `shiharai_hoho = 1` makes the bank-branch lookup mandatory. Tests that
 * exercise non-bank payment methods override both fields.
 */
export function buildCreateDokusyaBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    kanri_shiten_id: 10,
    shiten_id: 100,
    kumiaiin_code: 'K00001',
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'ヤマダ',
    shimei_kana_mei: 'タロウ',
    dokusya_busu: 1,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '千代田1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 1,
    birth_year: 1980,
    gender: 1,
    haitatsu_same_flg: true,
    haitatsu_yubin_no: '',
    haitatsu_todofuken_code: '',
    haitatsu_shikuchoson: '',
    haitatsu_chome_banchi: '',
    haitatsu_tatemono_mei: '',
    haitatsu_renrakusaki_1: '',
    haitatsu_renrakusaki_2: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    hanbaiten_id: 5,
    tanka_id: 1,
    yubin_kubun: '0',
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    bank_shiten_id: 50,
    hikiotoshi_yokin_shubetsu: 1,
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    dokusyaso_bunrui: '農業者',
    nogyosya_bunrui: '水稲,野菜',
    dokusya_kaishi_date: '2026-04-01',
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
    ...overrides,
  };
}

/**
 * Default-valid UpdateDokusyaDto payload. api.md §API-011-003 marks the
 * request body as identical to Create — `dokusya_id` is on the URL, NOT in
 * the body.
 */
export function buildUpdateDokusyaBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...buildCreateDokusyaBody(),
    dokusya_busu: 2,
    chome_banchi: '千代田1-2',
    ...overrides,
  };
}

/**
 * Default-valid DokusyaResponseDto (snake_case service response). Used in
 * controller spec mocks so the response shape matches api.md §レスポンスデータ.
 */
export function buildDokusyaDetailResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_id: 100,
    ja_id: 1,
    kanri_shiten_id: 10,
    shiten_id: 100,
    kumiaiin_code: 'K00001',
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    denshi_dokusya_shubetsu: null,
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'ヤマダ',
    shimei_kana_mei: 'タロウ',
    dokusya_busu: 1,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '千代田1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 1,
    birth_year: 1980,
    gender: 1,
    haitatsu_same_flg: true,
    haitatsu_yubin_no: '',
    haitatsu_todofuken_code: '',
    haitatsu_shikuchoson: '',
    haitatsu_chome_banchi: '',
    haitatsu_tatemono_mei: '',
    haitatsu_renrakusaki_1: '',
    haitatsu_renrakusaki_2: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    hanbaiten_id: 5,
    hanbaiten_name: '山田販売店',
    tanka_id: 1,
    tanka_name: '基本購読料（月額）',
    yubin_kubun: '0',
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    bank_shiten_id: 50,
    jastem_toriatsukai_tenpo_code: '001',
    jastem_tenpo_name: '本店',
    bank_branch_code: '001',
    bank_branch_name: '本店',
    hikiotoshi_yokin_shubetsu: 1,
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    dokusyaso_bunrui: '農業者',
    nogyosya_bunrui: '水稲,野菜',
    shoki_dokusya_kaishi_date: '2026-01-01',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
    rireki_no: 1,
    denshi_shonin_status: null,
    created_at: '2026-04-01T10:00:00.000Z',
    updated_at: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper — produce a future-date YYYY-MM-DD string `daysAhead` days from
 * today. Used in joho_henko_tekiyo_date validation tests where the value
 * MUST be in the future.
 */
export function futureDate(daysAhead = 7): string {
  return new Date(Date.now() + daysAhead * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Helper — produce a past-date YYYY-MM-DD string `daysAgo` days before
 * today.
 */
export function pastDate(daysAgo = 7): string {
  return new Date(Date.now() - daysAgo * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
