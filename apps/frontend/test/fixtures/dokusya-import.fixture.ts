// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Test fixtures for ACSMS-SCR-016 (購読者Excelデータ取込画面).
//
// Mirrors docs/design/ACSMS-SCR-016/ACSMS-SCR-016-api.md:
//   - API-016-001: GET /api/v1/dokusya/import/template (binary XLSX)
//   - API-016-002: POST /api/v1/dokusya/import (3 import modes)
// And the 49-column physical layout from §テンプレートファイル仕様.
//
// The default auth user + m_code seed reuse test/fixtures/dokusya.fixture.ts
// (buildAuthUser / buildCodesSeed) — this file only adds the import-specific
// row / column / response builders.

// ─── 49-column shared layout ──────────────────────────────────────────

/**
 * Japanese display headers in the canonical order (template row 1 +
 * column-selector checkbox labels). Matches index.html column panel
 * (49 labels) and screen-design §4.1 template order 1-for-1.
 */
export const DOKUSYA_IMPORT_JP_HEADERS = [
  'ID',
  '購読種別',
  '管理支店',
  '支店',
  '組合員コード',
  '購読者氏名_氏',
  '購読者氏名_名',
  '購読者かな_氏',
  '購読者かな_名',
  '購読部数',
  '新聞単価',
  'メールアドレス',
  'メールマガジン',
  '生年（西暦）',
  '性別',
  '郵便番号',
  '都道府県',
  '市町村郡',
  '丁目番地',
  'マンション・アパート名',
  '連絡先１',
  '連絡先２',
  '購読者情報と同じ',
  '郵便番号(配達先)',
  '都道府県(配達先)',
  '市町村郡(配達先)',
  '丁目番地(配達先)',
  'ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)',
  '連絡先１(配達先)',
  '連絡先２(配達先)',
  '配達先苗字（漢字）',
  '配達先名前（漢字）',
  '配達先苗字（かな）',
  '配達先名前（かな）',
  '販売店コード',
  '郵送区分',
  '支払方法',
  '購読料支払サイクル（月数）',
  '引落口座貯金種目',
  '引落口座支店コード',
  '引落口座支店名',
  '引落口座番号',
  '引落口座名義',
  '購読者層分類',
  '農業者分類',
  '購読開始日',
  '購読中止日',
  '備考',
  '読者情報変更適用日',
  '販売店適用日',
] as const;

/**
 * Physical column names sent to the BE in `selected_columns` / `rows[i]`.
 * Mirror of API-016-002 request param list §4-#52; same order as JP
 * headers (index N ↔ index N). The view binds each checkbox `value` to
 * one of these physical names (mirroring HanbaitenImportView).
 */
export const DOKUSYA_IMPORT_PHYSICAL_COLUMNS = [
  'dokusya_id',
  'dokusya_shubetsu',
  'kanri_shiten_code',
  'shiten_code',
  'kumiaiin_code',
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'dokusya_busu',
  'tanka_code',
  'email',
  'mail_magazine_flg',
  'birth_year',
  'gender',
  'yubin_no',
  'todofuken_code',
  'shikuchoson',
  'chome_banchi',
  'tatemono_mei',
  'renrakusaki_1',
  'renrakusaki_2',
  'haitatsu_same_flg',
  'haitatsu_yubin_no',
  'haitatsu_todofuken_code',
  'haitatsu_shikuchoson',
  'haitatsu_chome_banchi',
  'haitatsu_tatemono_mei',
  'haitatsu_renrakusaki_1',
  'haitatsu_renrakusaki_2',
  'haitatsu_shimei_sei',
  'haitatsu_shimei_mei',
  'haitatsu_shimei_kana_sei',
  'haitatsu_shimei_kana_mei',
  'hanbaiten_code',
  'yubin_kubun',
  'shiharai_hoho',
  'dokusyaryo_shiharai_cycle',
  'hikiotoshi_yokin_shubetsu',
  'bank_branch_code',
  'bank_branch_name',
  'hikiotoshi_koza_no',
  'hikiotoshi_koza_meigi',
  'dokusyaso_bunrui',
  'nogyosya_bunrui',
  'dokusya_kaishi_date',
  'dokusya_chushi_date',
  'biko',
  'joho_henko_tekiyo_date',
  'hanbaiten_tekiyo_date',
] as const;

/**
 * Physical columns that are required + always-checked + disabled when
 * 取込モード = 新規登録. Mirrors screen-design §画面項目定義 「常に選択
 * されており、選択を解除することはできません。」 + API-016-002 §4.1
 * NEW-mode required list.
 */
export const DOKUSYA_IMPORT_REQUIRED_COLUMNS_NEW = [
  'dokusya_shubetsu',
  'kanri_shiten_code',
  'shiten_code',
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
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
] as const;

// ─── Import mode literals (FE display → BE wire) ──────────────────────

/**
 * FE radio display values（顧客要件 2026-07：全項目更新を廃止し 新規登録/更新 の
 * 2択に統合）。view が BE wire 値へ変換する:
 *   new    → NEW
 *   update → UPDATE（選択列のみ更新。全列更新は「すべて選択」でチェック）
 * Tests assert the mapping at the request boundary.
 */
export const IMPORT_MODE_FE = ['new', 'update'] as const;
export const IMPORT_MODE_BE = ['NEW', 'UPDATE'] as const;
export const IMPORT_MODE_LABEL_JP: Record<(typeof IMPORT_MODE_FE)[number], string> = {
  new: '新規登録',
  update: '更新',
};

// ─── Message literals (screen-design §メッセージ情報) ──────────────────

export const MSG_016_001 =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';
export const MSG_016_002 = '取込処理を開始します。よろしいですか？';
export const MSG_016_003 =
  'システムエラーが発生しました。しばらくしてから再度お試しください。';
export const MSG_016_004 = '取り込みました。';
export const MSG_016_006 =
  'ファイルの行数が上限（30000行）を超えているため、取込みできません。';

// ─── Row + request builders ───────────────────────────────────────────

/**
 * One valid 新規登録 row — all NEW-mode required physical columns
 * populated so happy-path validation passes (紙版 + 新規 + 口座引落).
 */
export function buildImportRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dokusya_shubetsu: 1, // 紙版
    kanri_shiten_code: 'KS001',
    shiten_code: 'SH001',
    kumiaiin_code: 'K0001',
    shimei_sei: '山田',
    shimei_mei: '太郎',
    shimei_kana_sei: 'ﾔﾏﾀﾞ',
    shimei_kana_mei: 'ﾀﾛｳ',
    dokusya_busu: 1,
    tanka_code: 'T001',
    email: 'taro@example.com',
    mail_magazine_flg: 0,
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '1-1-1',
    renrakusaki_1: '0312345678',
    hanbaiten_code: 'H001',
    yubin_kubun: '0',
    shiharai_hoho: 1, // 口座引落
    dokusya_kaishi_date: '2026-05-01',
    // UPDATE は読者情報変更適用日が必須（顧客要件 2026-06）。既定で入れておく。
    joho_henko_tekiyo_date: '2026-05-01',
    biko: '',
    ...overrides,
  };
}

/** Two-row import request body matching api.md §リクエスト例. */
export function buildImportRequest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'NEW',
    selected_columns: [...DOKUSYA_IMPORT_PHYSICAL_COLUMNS],
    rows: [
      buildImportRow({ shimei_sei: '山田', shimei_mei: '太郎' }),
      buildImportRow({ shimei_sei: '鈴木', shimei_mei: '花子', yubin_no: '1000002' }),
    ],
    ...overrides,
  };
}

/** Happy-path success body returned by API-016-002. */
export function buildImportSuccessResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data: {
      import_mode: 'NEW',
      total_rows: 2,
      created_count: 2,
      updated_count: 0,
      cancelled_count: 0,
      skipped_count: 0,
      rireki_count: 2,
      imported_at: '2026-05-15T10:00:00+09:00',
      ...((overrides.data as Record<string, unknown>) ?? {}),
    },
    message: MSG_016_004,
    ...overrides,
  };
}

/**
 * Sample IMPORT_VALIDATION_ERROR body — row-level errors (4xx).
 * Mirrors api.md §400 (Import Validation Error — 行別エラー).
 */
export function buildImportValidationErrorBody() {
  return {
    error_code: 'IMPORT_VALIDATION_ERROR',
    message:
      'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
    errors: [
      { row: 2, field: 'dokusya_shubetsu', message: '購読種別が3:併読のためExcel取込みできません。' },
      { row: 3, field: 'shiharai_hoho', message: '電子版かつクレジットカード決済の組み合わせは取込みできません。' },
      { row: 5, field: 'tanka_code', message: '指定された新聞単価コードが見つかりません。' },
      { row: 7, field: 'dokusya_busu', message: '新規登録の場合、購読部数は0より大きい値を指定してください。' },
      { row: 9, field: 'kumiaiin_code', message: '指定された組合員コードが見つかりません。' },
    ],
  };
}

/** Build N valid rows (helper for row-limit / count assertions). */
export function buildImportRows(
  count: number,
  overridesFor: (index: number) => Record<string, unknown> = () => ({}),
): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) =>
    buildImportRow({ kumiaiin_code: `K${String(i + 1).padStart(5, '0')}`, ...overridesFor(i) }),
  );
}
