// Screen: ACSMS-SCR-019 — 販売店Excelデータ取込画面
//
// Fixture builders for the Excel-import flow (ACSMS-API-019-002). Three
// canonical request bodies — one per import_mode — plus a row builder
// that returns a fully-populated 23-column row matching api.md §1.
//
// Used in: hanbaiten.service.spec (ACSMS-SCR-019 sibling describe),
//          hanbaiten.controller.spec (ACSMS-SCR-019 sibling describe),
//          dto/import-hanbaiten.dto.spec,
//          test/integration/hanbaiten-import.integration.spec.

/** 24-column physical-name list — exact order per api.md §テンプレートファイル仕様. */
export const HANBAITEN_IMPORT_COLUMNS = [
  'hanbaiten_code',
  'hanbaiten_name',
  'hanbaiten_name_kana',
  'torihikisaki_no',
  'todofuken_code',
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

/** One canonical fully-populated row (matches api.md §リクエスト例 + seeder examples). */
export function buildImportRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hanbaiten_code: 'H001',
    hanbaiten_name: '販売店A',
    hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ',
    torihikisaki_no: 'T1234567890123',
    todofuken_code: '13',
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

/** Canonical valid NEW-mode request body (api.md §リクエスト例). */
export function buildImportRequestNEW(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'NEW',
    selected_columns: [...HANBAITEN_IMPORT_COLUMNS],
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

/** UPDATE request with ALL columns selected（＝旧全項目更新相当。全列を selected_columns に含める）。 */
export function buildImportRequestUpdateAll(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'UPDATE',
    selected_columns: [...HANBAITEN_IMPORT_COLUMNS],
    rows: [
      buildImportRow({ hanbaiten_code: 'H001', hanbaiten_name: '販売店A改定' }),
    ],
    ...overrides,
  };
}

/**
 * UPDATE request with a SUBSET of columns selected — selected_columns is
 * the small subset of fields the caller wants to overwrite. Unselected
 * columns must retain their existing DB values.
 */
export function buildImportRequestUpdatePartial(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    import_mode: 'UPDATE',
    selected_columns: ['hanbaiten_code', 'hanbaiten_name', 'tel'],
    rows: [
      {
        hanbaiten_code: 'H001',
        hanbaiten_name: '販売店A_新名',
        tel: '0399990000',
      },
    ],
    ...overrides,
  };
}

/** Expected response shape for happy-path NEW (api.md §レスポンス成功例). */
export function buildImportResponseNEW(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  // Use wall-clock ISO so the fixture never drifts past schema checks
  // such as `imported_at` being a recent ISO 8601 timestamp.
  const importedAt = new Date().toISOString();
  return {
    data: {
      import_mode: 'NEW',
      total_rows: 2,
      created_count: 2,
      updated_count: 0,
      skipped_count: 0,
      imported_at: importedAt,
      ...((overrides.data as Record<string, unknown>) ?? {}),
    },
    message: '取り込みました。',
    ...overrides,
  };
}
