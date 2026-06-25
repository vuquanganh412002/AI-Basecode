// Screens: ACSMS-SCR-011 — 購読者情報登録画面
//          ACSMS-SCR-014 — 購読者明細検索画面
//          ACSMS-SCR-013 — 購読者履歴情報画面
//
// Fixture builders for the Dokusya entity, the DokusyaRireki entity, and
// the create / update / search / detail-response payloads driven by
// api.md §API-011-001 〜 §API-011-006 + §API-014-001 〜 §API-014-003.
//
// Field values mirror `docs/database/database-design.md §t_dokusya` and
// `§t_dokusya_rireki`. m_code values come from `docs/database/seeder.md`:
//   - DOKUSYA_SHUBETSU       : 1 紙版, 2 電子版, 3 併読   (seeder §5.1)
//   - TETSUZUKI_SHURUI       : 0 解約, 1 新規              (seeder §5.2)
//   - DENSHI_DOKUSYA_SHUBETSU: 0 無料, 1 有料              (seeder §5.3)
//   - SHIHARAI_HOHO          : 1 口座引落 〜 9 その他      (seeder §5.4)
//   - YUBIN_KUBUN            : '0' 空, '1' 郵送            (seeder §5.11)
//
// Used in: dokusya.service.spec, dokusya.controller.spec,
// dokusya.integration.spec, search-dokusya.dto.spec.

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
    denshiKaiinId: null,
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
    // 購読開始日は本日以降（過去日不可）。固定日は時間経過で過去日になり検証で
    // 弾かれるため、未来日（明日）を既定にして create happy-path を通す。
    dokusya_kaishi_date: futureDate(1),
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
    // 編集時の 情報変更適用日 はユーザー入力で必須・過去日不可（既定は当日）。
    // happy-path update が通るよう未来日を入れる。
    joho_henko_tekiyo_date: futureDate(7),
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
    denshi_kaiin_id: null,
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

// ════════════════════════════════════════════════════════════════════════
// SCR-014 — 購読者明細検索画面
// ════════════════════════════════════════════════════════════════════════

/**
 * Default-valid SearchDokusyaDto query — every documented parameter
 * (api.md §API-014-001 リクエストパラメータ) defaulted to a believable,
 * empty / minimum value. Override individual fields via `overrides`.
 *
 * Most fields are optional; only `page`/`per_page`/`sort_by`/`sort_order`
 * have project defaults the DTO will fill in. Tests assert each rule
 * incrementally — see `search-dokusya.dto.ts.spec.ts`.
 */
export function buildSearchDokusyaQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    // pagination defaults — DTO transforms `1` / `20` / `updated_at` / `desc`
    page: 1,
    per_page: 20,
    sort_by: 'updated_at',
    sort_order: 'desc',
    ...overrides,
  };
}

/**
 * Default-valid 購読者一覧 row — flat snake_case shape returned by
 * ACSMS-API-014-001 §レスポンスデータ (#1-#22 + per-row fields).
 *
 * Fields mirror the SELECT in api.md §4.5 (haitatsu concatenation,
 * full_name concatenation, is_read_only computed flag).
 *
 * Used in:
 *   - dokusya.service.spec (SCR-014 search/exportExcel happy-path)
 *   - dokusya.controller.spec (SCR-014 200 body shape)
 */
export function buildDokusyaListRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_id: 1001,
    ja_id: 1,
    kanri_shiten_id: 10,
    kanri_shiten_name: '中央管理支店',
    shiten_id: 21,
    shiten_name: '渋谷支店',
    kumiaiin_code: 'K000001',
    full_name: '山田 太郎',
    full_name_kana: 'ヤマダ タロウ',
    tetsuzuki_shurui: 1,
    renrakusaki_1: '03-1234-5678',
    renrakusaki_2: '',
    haitatsu_full_name: '山田 花子',
    haitatsu_yubin_no: '1500001',
    haitatsu: '東京都渋谷区神宮前1-1-1 渋谷マンション101',
    hanbaiten_id: 501,
    hanbaiten_name: '渋谷販売店',
    dokusya_shubetsu: 1,
    shiharai_hoho: 1,
    denshi_shonin_status: null,
    shoki_dokusya_kaishi_date: '2024/04/01',
    dokusya_chushi_date: null,
    is_read_only: false,
    ...overrides,
  };
}

/**
 * Generic SessionPayload builder for SCR-014 specs.
 *
 * The session.factory already exports `buildSession` /
 * `buildChuokaiSession` / `buildJaHontenSession` /
 * `buildJaKanriShitenSession` — this helper mirrors those for tests
 * that want full control over fields without selecting a role-flavoured
 * preset. New SCR-014 spec code uses the role-specific helpers
 * directly; `buildSessionPayload` is kept here for parity with the
 * skill's contract.
 */
export function buildSessionPayload(
  overrides: Partial<{
    role_code: string;
    role_id: number;
    ja_id: number | null;
    kanri_shiten_id: number | null;
    chuokai_id: number | null;
    account_id: number;
    login_id: string;
    permissions: string[];
  }> = {},
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    account_id: 1,
    login_id: 'admin01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    chuokai_id: null,
    permissions: ['dokusya.view', 'dokusya.delete'],
    created_at: now,
    last_activity_at: now,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// SCR-013 — 購読者履歴情報画面
// ════════════════════════════════════════════════════════════════════════

/**
 * Default-valid query for `GET /api/v1/dokusya/:dokusya_id/rireki`
 * (ACSMS-API-013-001 リクエストパラメータ).
 *
 * Only the four pagination / sort fields are documented. Defaults mirror
 * api.md §4.1 (`page=1`, `per_page=20`, `sort_by=rireki_no`,
 * `sort_order=desc` — 機能定義 1.2 履歴番号降順).
 */
export function buildDokusyaRirekiQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    page: 1,
    per_page: 20,
    sort_by: 'rireki_no',
    sort_order: 'desc',
    ...overrides,
  };
}

/**
 * Default-valid 履歴一覧 row — the flat snake_case shape returned by
 * ACSMS-API-013-001 §レスポンスデータ (#2-#61). Mirrors the api.md
 * レスポンス成功例 verbatim so happy-path assertions can match field
 * values directly.
 *
 * Per api.md §m_code note + `nestjs.md §Response serialization`, the
 * authenticated rireki endpoint returns CODE VALUES ONLY — there are
 * NO `*_label` fields (FE resolves labels via `useCodesStore`). Tests
 * assert that absence.
 *
 * Used in:
 *   - dokusya.service.spec   (SCR-013 getRirekiList happy-path raw rows)
 *   - dokusya.controller.spec (SCR-013 200 body shape)
 */
export function buildDokusyaRirekiListRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_rireki_id: 42,
    dokusya_id: 1,
    rireki_no: 3,
    ja_id: 1,
    kanri_shiten_id: 5,
    kanri_shiten_name: '東京中央管理支店',
    shiten_id: 12,
    shiten_name: '千代田支店',
    kumiaiin_code: 'K00012345',
    shimei_sei: '山田',
    shimei_mei: '太郎',
    todofuken_code: '13',
    todofuken_name: '東京都',
    shikuchoson: '千代田区',
    chome_banchi: '丸の内1-1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    email: 'yamada@example.com',
    mail_magazine_flg: 1,
    birth_year: 1980,
    gender: 1,
    dokusyaso_bunrui: '一般,個人',
    nogyosya_bunrui: '',
    dokusya_busu: 2,
    zenkai_dokusya_busu: 1,
    haitatsu_yubin_no: '1000001',
    zenkai_yubin_no: '1000005',
    haitatsu_todofuken_code: '13',
    haitatsu_todofuken_name: '東京都',
    haitatsu_shikuchoson: '千代田区',
    haitatsu_chome_banchi: '丸の内1-1-1',
    haitatsu_tatemono_mei: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    zenkai_todofuken_code: '13',
    zenkai_todofuken_name: '東京都',
    zenkai_shikuchoson: '中央区',
    zenkai_chome_banchi: '銀座1-1-1',
    zenkai_tatemono_mei: '',
    hanbaiten_id: 100,
    hanbaiten_name: '丸の内販売店',
    zenkai_hanbaiten_id: 99,
    zenkai_hanbaiten_name: '銀座販売店',
    tetsuzuki_shurui: 1,
    shoki_dokusya_kaishi_date: '2024-04-01',
    dokusya_kaishi_date: '2026-04-01',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: '2026-04-01',
    saishin_data_flg: true,
    zougen_hokoku_flg: true,
    shinki_flg: false,
    kaiyaku_flg: false,
    hikiotoshi_yokin_shubetsu: 1,
    bank_branch_code: '001',
    bank_branch_name: '本店',
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ヤマダタロウ',
    created_at: '2026-04-01T10:00:00.000Z',
    created_by: 'ja_honten01',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// SCR-015 — 購読者販売店一括置換画面
// ════════════════════════════════════════════════════════════════════════

/**
 * Default-valid query for `GET /api/v1/dokusya/replace-hanbaiten/search`
 * (ACSMS-API-015-001 リクエストパラメータ). Every documented field is
 * optional except pagination/sort defaults the DTO fills in.
 *
 * Defaults mirror api.md §4.1: page=1, per_page=20,
 * sort_by=kumiaiin_code, sort_order=asc.
 */
export function buildReplaceSearchQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    page: 1,
    per_page: 20,
    sort_by: 'kumiaiin_code',
    sort_order: 'asc',
    ...overrides,
  };
}

/**
 * Default-valid request body for `POST /api/v1/dokusya/replace-hanbaiten`
 * (ACSMS-API-015-002 リクエストパラメータ).
 *
 * `hanbaiten_tekiyo_date` is computed as a FUTURE date from `new Date()`
 * (never a hardcoded literal) so the service-level "当日以降の日付のみ可"
 * check (api.md §4.1) passes regardless of when the suite runs.
 */
export function buildReplaceBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_ids: [5001, 5002],
    new_hanbaiten_id: 201,
    hanbaiten_tekiyo_date: futureDate(7),
    ...overrides,
  };
}

/**
 * Default-valid candidate row from the api.md §4.3 pre-check SELECT
 * (`SELECT dokusya_id, ja_id, kanri_shiten_id, hanbaiten_id,
 *  dokusya_shubetsu, shiharai_hoho, rireki_no FROM t_dokusya ...`).
 *
 * Raw snake_case shape — fed to `dataSource.query` / `manager.query`
 * mocks. Defaults are an eligible 紙版 (dokusya_shubetsu=1) row whose
 * current `hanbaiten_id` differs from the replace target.
 *
 * m_code values (seeder §5):
 *   DOKUSYA_SHUBETSU 1:紙版 2:電子版 3:併読
 *   SHIHARAI_HOHO    6:クレジットカード（クレカ）
 */
export function buildReplaceCandidateRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_id: 5001,
    ja_id: 1,
    kanri_shiten_id: 10,
    hanbaiten_id: 200,
    dokusya_shubetsu: 1,
    shiharai_hoho: 1,
    rireki_no: 1,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// SCR-016 — 購読者Excelデータ取込画面
// ════════════════════════════════════════════════════════════════════════

/**
 * The 13 physical columns that `NEW` mode REQUIRES in `selected_columns`
 * per api.md §4.1 (ACSMS-SCR-016). Returned as a fresh array each call so
 * callers can splice / filter without mutating a shared reference.
 *
 *   dokusya_shubetsu, tetsuzuki_shurui, kanri_shiten_id, dokusya_busu,
 *   tanka_code, yubin_no, todofuken_code, shikuchoson, chome_banchi,
 *   renrakusaki_1, hanbaiten_code, shiharai_hoho, dokusya_kaishi_date
 */
export function buildImportRequiredColumns(): string[] {
  return [
    'dokusya_shubetsu',
    'tetsuzuki_shurui',
    'kanri_shiten_code',
    'shiten_code',
    'dokusya_busu',
    'tanka_code',
    'yubin_no',
    'todofuken_code',
    'shikuchoson',
    'chome_banchi',
    'renrakusaki_1',
    'hanbaiten_code',
    'shiharai_hoho',
    'dokusya_kaishi_date',
  ];
}

/**
 * One canonical fully-valid NEW-mode import row (api.md §リクエスト例).
 * 紙版 (dokusya_shubetsu=1), 新規 (tetsuzuki_shurui=1), positive 購読部数,
 * resolvable tanka_code / hanbaiten_code, 口座引落 (shiharai_hoho=1).
 *
 * `dokusya_kaishi_date` is computed from `new Date()` (never a hardcoded
 * literal) so the row never drifts past any future "開始日" date check.
 */
export function buildImportRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
    kanri_shiten_code: 'KS001',
    shiten_code: 'SH001',
    kumiaiin_code: 'K00001',
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'ﾔﾏﾀﾞ',
    shimei_kana_mei: 'ﾀﾛｳ',
    dokusya_busu: 1,
    tanka_code: 'T001',
    email: 'yamada@example.com',
    mail_magazine_flg: 1,
    birth_year: 1980,
    gender: 1,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '1-1-1',
    tatemono_mei: '',
    renrakusaki_1: '0312345678',
    renrakusaki_2: '',
    hanbaiten_code: 'H001',
    yubin_kubun: '0',
    shiharai_hoho: 1,
    dokusyaryo_shiharai_cycle: 1,
    hikiotoshi_yokin_shubetsu: 1,
    bank_branch_code: '001',
    bank_branch_name: '本店',
    hikiotoshi_koza_no: '1234567',
    hikiotoshi_koza_meigi: 'ﾔﾏﾀﾞﾀﾛｳ',
    dokusyaso_bunrui: '農業者',
    nogyosya_bunrui: '水稲',
    dokusya_kaishi_date: new Date().toISOString().slice(0, 10),
    biko: '',
    // UPDATE は読者情報変更適用日が必須（顧客要件 2026-06）。NEW では任意だが
    // 既定で未来日を入れておき、UPDATE_* テストがバリデーションを通るようにする。
    joho_henko_tekiyo_date: futureDate(7),
    ...overrides,
  };
}

/**
 * Default-valid NEW-mode request body for `POST /api/v1/dokusya/import`
 * (ACSMS-API-016-002). Carries the 13 required `selected_columns` and one
 * fully-valid row. Override `import_mode` / `selected_columns` / `rows`
 * via `overrides`.
 */
export function buildImportBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'NEW',
    selected_columns: buildImportRequiredColumns(),
    rows: [buildImportRow()],
    ...overrides,
  };
}

/**
 * Default-valid joined search row from api.md §4.5 → the §レスポンスデータ
 * shape the service returns per row. Mirrors the api.md レスポンス成功例.
 *
 * `shimei` = shimei_sei + ' ' + shimei_mei; `haitatsu_address` =
 * todofuken_name + haitatsu_shikuchoson + haitatsu_chome_banchi +
 * haitatsu_tatemono_mei (api.md §4.6).
 */
export function buildReplaceSearchRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_id: 5001,
    kanri_shiten_id: 10,
    kanri_shiten_name: '東京中央 管理支店',
    shiten_id: 100,
    shiten_name: '千代田支店',
    kumiaiin_code: '10001',
    shimei: '山田 太郎',
    haitatsu_yubin_no: '1000001',
    haitatsu_address: '東京都千代田区1-1-1 千代田マンション101',
    hanbaiten_id: 200,
    hanbaiten_code: 'H001',
    hanbaiten_name: '千代田販売店',
    dokusya_shubetsu: 1,
    shiharai_hoho: 1,
    ...overrides,
  };
}
