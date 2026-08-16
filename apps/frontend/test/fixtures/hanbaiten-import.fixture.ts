// Test fixtures for ACSMS-SCR-019 (販売店Excelデータ取込画面).
//
// Mirrors docs/design/ACSMS-SCR-019/ACSMS-SCR-019-api.md:
//   - ACSMS-API-019-001: GET /api/v1/hanbaiten/import/template (binary XLSX)
//   - ACSMS-API-019-002: POST /api/v1/hanbaiten/import (3 import modes)
// And the 23-column physical layout from §テンプレートファイル仕様.

// ─── 23-column shared layout ──────────────────────────────────────────

/**
 * Japanese display headers in the canonical order — these are what the
 * column-selector checkboxes label, what the Excel template ships as
 * row 1, and what the preview table renders. Matches BE
 * `getImportTemplateColumns()` output 1-for-1 (sync verified by
 * test/integration/hanbaiten-import.integration.spec.ts §column-list).
 */
export const HANBAITEN_IMPORT_JP_HEADERS = [
  '販売店コード',
  '販売店名称',
  '販売店名称（カナ）',
  'インボイス番号',
  '郵便番号',
  '住所',
  '電話番号',
  'FAX番号',
  '所長名',
  '委託区分',
  '配達手数料単価',
  '金融機関コード',
  '金融機関名',
  '配達手数料支払サイクル',
  '口座支店コード',
  '口座支店名',
  '口座種別',
  '口座番号',
  '口座名義',
  '振込手数料負担区分',
  '振込手数料',
  '備考',
  '廃店フラグ',
] as const;

/**
 * Physical column names sent to the BE in `selected_columns` / `rows[i]`.
 * Mirror of BE `HANBAITEN_IMPORT_COLUMNS` constant; same order as JP
 * headers (index N maps to index N).
 */
export const HANBAITEN_IMPORT_PHYSICAL_COLUMNS = [
  'hanbaiten_code',
  'hanbaiten_name',
  'hanbaiten_name_kana',
  'torihikisaki_no',
  'yubin_no',
  'address',
  'tel',
  'fax',
  'shocho_name',
  'itaku_kubun',
  'haitatsuryo_tanka_code',
  'bank_code',
  'bank_name',
  'haitatsuryo_shiharai_cycle',
  'bank_branch_code',
  'bank_branch_name',
  'yokin_shubetsu',
  'koza_no',
  'koza_meigi',
  'furikomi_tesuryo_futan_kubun',
  'furikomi_tesuryo',
  'biko',
  'haiten_flg',
] as const;

// ─── Import mode literals (FE display → BE wire) ──────────────────────

/**
 * FE display values used on the `<select>` element (per index.html
 * 顧客要件 2026-07：全項目更新を廃止し 新規登録/更新 の2択に統合。view が BE
 * wire 値へ変換する:
 *   new    → NEW
 *   update → UPDATE（選択列のみ更新。全列更新は「すべて選択」でチェック）
 * Tests assert this mapping at the boundary.
 */
export const IMPORT_MODE_FE = ['new', 'update'] as const;
export const IMPORT_MODE_BE = ['NEW', 'UPDATE'] as const;
export const IMPORT_MODE_LABEL_JP: Record<(typeof IMPORT_MODE_FE)[number], string> = {
  new: '新規登録',
  update: '更新',
};

// ─── Row + request builders ───────────────────────────────────────────

export function buildImportRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hanbaiten_code: 'H001',
    hanbaiten_name: '販売店A',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝA',
    torihikisaki_no: 'T1234567890123',
    yubin_no: '1300001',
    address: '東京都千代田区1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_tanka_code: 'T001',
    bank_code: '0001',
    bank_name: 'みずほ銀行',
    haitatsuryo_shiharai_cycle: 1,
    bank_branch_code: '001',
    bank_branch_name: '東京支店',
    yokin_shubetsu: 1,
    koza_no: '1234567',
    koza_meigi: 'ﾊﾝﾊﾞｲﾃﾝA',
    furikomi_tesuryo_futan_kubun: 1,
    furikomi_tesuryo: 500,
    biko: '',
    haiten_flg: false,
    ...overrides,
  };
}

/** Two-row import body matching api.md §リクエスト例. */
export function buildImportRequest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'NEW',
    selected_columns: [...HANBAITEN_IMPORT_PHYSICAL_COLUMNS],
    rows: [
      buildImportRow({ hanbaiten_code: 'H001', hanbaiten_name: '販売店A' }),
      buildImportRow({
        hanbaiten_code: 'H002',
        hanbaiten_name: '販売店B',
        koza_no: '7654321',
      }),
    ],
    ...overrides,
  };
}

/** Happy-path success body returned by ACSMS-API-019-002. */
export function buildImportSuccessResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data: {
      import_mode: 'NEW',
      total_rows: 2,
      created_count: 2,
      updated_count: 0,
      skipped_count: 0,
      imported_at: new Date().toISOString(),
      ...((overrides.data as Record<string, unknown>) ?? {}),
    },
    message: '取り込みました。',
    ...overrides,
  };
}

/** Sample IMPORT_VALIDATION_ERROR body — row-level errors (4xx). */
export function buildImportValidationErrorBody() {
  return {
    error_code: 'IMPORT_VALIDATION_ERROR',
    message:
      'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
    errors: [
      { row: 2, field: 'hanbaiten_code', message: '同一の販売店コードが既に登録されています。' },
      { row: 3, field: 'itaku_kubun', message: '委託区分は 1, 2, 9 のいずれかを指定してください。' },
    ],
  };
}

// ─── Auth user fixture — JA_HONTEN with hanbaiten.import ──────────────

/**
 * ACSMS-SCR-019 access matrix (api.md §4.2 + seeder.md §3):
 * - NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN → hanbaiten.import
 * - NICHINO_ADMIN does NOT have hanbaiten.import (audit / governance role).
 * Default fixture seeds a JA_HONTEN user.
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'ja_honten001',
    account_name: 'JA本店 管理者',
    role_id: 4,
    role_code: 'JA_HONTEN',
    role_name: 'JA本店',
    ja_id: 1,
    kanri_shiten_id: null,
    todofuken_code: '13',
    paper_flg: true,
    denshi_flg: false,
    email: 'ja_honten001@example.com',
    mfa_enable_flg: false,
    permissions: ['hanbaiten.view', 'hanbaiten.import'],
    ...overrides,
  };
}
