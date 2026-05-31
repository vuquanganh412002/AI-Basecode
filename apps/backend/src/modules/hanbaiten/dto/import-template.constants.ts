import type { Hanbaiten } from '@/database/entities/hanbaiten.entity';

/**
 * SCR-019 — Excel template column headers in the canonical order
 * (api.md §テンプレートファイル仕様 / docs/design/ACSMS-SCR-019).
 *
 * The DOM order is THE contract: changing any string here is a
 * customer-visible change to the downloaded template. Keep this
 * module-local rather than colocated with the DTO so DTO file size
 * stays focused on validation; this is a presentation concern.
 *
 * Moved out of `hanbaiten.service.ts` (1380-line file) per the
 * architecture audit P1 #3 — small mechanical extract that signals
 * the future direction (a dedicated HanbaitenImportService) without
 * touching the import logic itself yet.
 */
export const IMPORT_TEMPLATE_COLUMNS = [
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
  '手数料区分',
  '手数料',
  '備考',
  '廃店フラグ',
] as const;

/**
 * Hard cap on import payload row count. Mirrors the DTO's
 * `@ArrayMaxSize(500)` — service-layer defence-in-depth so the
 * canonical `ROW_LIMIT_EXCEEDED` error code surfaces even when a
 * client bypasses the DTO validator.
 */
export const IMPORT_MAX_ROWS = 500;

/** Filename emitted in the Content-Disposition response header. */
export const IMPORT_TEMPLATE_FILENAME = '販売店Excelデータ取込_テンプレート.xlsx';

/**
 * Maps logical request column (`hanbaiten_name`, …) → TypeORM entity
 * field (`hanbaitenName`, …). Used in UPDATE_PARTIAL to translate
 * `selected_columns` into the `manager.update()` partial. The two
 * special cases (`hanbaiten_code` excluded because it's the key column;
 * `haitatsuryo_tanka_code` because it goes through the m_tanka lookup
 * to resolve `haitatsuryoTankaId`) are handled in the call site.
 */
export const IMPORT_COLUMN_TO_FIELD: Record<string, keyof Hanbaiten> = {
  hanbaiten_name: 'hanbaitenName',
  hanbaiten_name_kana: 'hanbaitenNameKana',
  torihikisaki_no: 'torihikisakiNo',
  yubin_no: 'yubinNo',
  address: 'address',
  tel: 'tel',
  fax: 'fax',
  shocho_name: 'shochoName',
  itaku_kubun: 'itakuKubun',
  bank_code: 'bankCode',
  bank_name: 'bankName',
  haitatsuryo_shiharai_cycle: 'haitatsuryoShiharaiCycle',
  bank_branch_code: 'bankBranchCode',
  bank_branch_name: 'bankBranchName',
  yokin_shubetsu: 'yokinShubetsu',
  koza_no: 'kozaNo',
  koza_meigi: 'kozaMeigi',
  tesuryo_kubun: 'tesuryoKubun',
  tesuryo_amount: 'tesuryoAmount',
  biko: 'biko',
  haiten_flg: 'haitenFlg',
};

/**
 * Per-column default when the cell is empty / undefined / null.
 * Mirrors NEW-mode defaults so UPDATE_PARTIAL honours NOT NULL
 * constraints on the m_hanbaiten columns that the schema marks
 * 空文字許容 (NOT NULL string default ''). Nullable columns (numeric
 * / enum) accept null directly.
 */
export const IMPORT_FIELD_EMPTY_DEFAULT: Partial<Record<keyof Hanbaiten, unknown>> = {
  hanbaitenName: '',
  hanbaitenNameKana: '',
  torihikisakiNo: '',
  yubinNo: '',
  address: '',
  tel: '',
  fax: '',
  shochoName: '',
  bankCode: '',
  bankName: '',
  bankBranchCode: '',
  bankBranchName: '',
  kozaNo: '',
  kozaMeigi: '',
  biko: '',
  haitenFlg: false,
  // numeric / enum fields fall through to `null` — column is nullable.
};
