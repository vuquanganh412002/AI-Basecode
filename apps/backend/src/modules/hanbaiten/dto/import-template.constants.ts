import type { Hanbaiten } from '@/database/entities/hanbaiten.entity';

/**
 * SCR-019 — Excel テンプレートの列ヘッダ（正準順・api.md §テンプレートファイル仕様 /
 * docs/design/ACSMS-SCR-019）。
 *
 * この並び順が契約そのもの: ここの文字列を変えると DL テンプレートが顧客可視で変わる。
 * DTO のファイルサイズをバリデーションに集中させるため、DTO と同居させず
 * モジュールローカルに置く（これは表示関心事）。
 *
 * `hanbaiten.service.ts`(1380行) から切り出し（アーキ監査 P1 #3）。取込ロジックには
 * まだ触れず、専用 HanbaitenImportService への将来方向を示す機械的抽出。
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
  '振込手数料負担区分',
  '振込手数料',
  '備考',
  '廃店フラグ',
] as const;

/**
 * 物理（リクエスト snake_case）列名。`IMPORT_TEMPLATE_COLUMNS`（日本語ヘッダ）と
 * 同一順で index N ↔ index N が対応。サンプル行をヘッダ順で描画し、位置指定の
 * テンプレートセルをリクエスト項目へ対応付けるのに使う。
 */
export const IMPORT_TEMPLATE_PHYSICAL_COLUMNS = [
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

/**
 * DL テンプレートに同梱する即取込可能なサンプル行1件。期待形を提示し即取込できる
 * （実利用前に編集）。物理列名をキーとし、ここに無い列は空セルになる。
 *
 * 外部依存なしで綺麗に取込めるよう選定:
 *  - `itaku_kubun = 2`(日農委託) → 6 銀行項目は不要。
 *  - `haitatsuryo_tanka_code` 省略 → m_tanka FK ルックアップ不要（有効コードは
 *    JA 固有のため固定値だと JA によっては失敗しうる）。
 *  - `hanbaiten_name_kana` は半角カタカナ（kana ルールを通る）。
 */
export const IMPORT_TEMPLATE_SAMPLE_ROW: Readonly<
  Record<string, string | number | boolean>
> = {
  hanbaiten_code: 'SAMPLE001',
  hanbaiten_name: 'サンプル販売店',
  hanbaiten_name_kana: 'ｻﾝﾌﾟﾙﾊﾝﾊﾞｲﾃﾝ',
  torihikisaki_no: 'T1234567890123',
  yubin_no: '1000001',
  address: '東京都千代田区千代田1-1',
  tel: '0312345678',
  fax: '0312345679',
  shocho_name: '山田太郎',
  itaku_kubun: 2,
  furikomi_tesuryo_futan_kubun: 1,
  biko: 'サンプル行です。インポート前に書き換えてください。',
  haiten_flg: false,
};

/**
 * 取込ペイロード行数の上限。DTO の `@ArrayMaxSize(500)` と同値 — service 層の
 * 多層防御で、クライアントが DTO バリデータをバイパスしても正準の
 * `ROW_LIMIT_EXCEEDED` を返せるようにする。
 */
export const IMPORT_MAX_ROWS = 500;

/** Content-Disposition レスポンスヘッダに出すファイル名。 */
export const IMPORT_TEMPLATE_FILENAME = '販売店Excelデータ取込_テンプレート.xlsx';

/**
 * 論理リクエスト列（`hanbaiten_name`…）→ TypeORM エンティティ項目（`hanbaitenName`…）の
 * 対応表。UPDATE で `selected_columns` を `manager.update()` の partial に変換する。
 * 2 つの特例（`hanbaiten_code` はキー列のため除外、`haitatsuryo_tanka_code` は
 * m_tanka ルックアップで `haitatsuryoTankaId` を解決）は呼出側で処理する。
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
  furikomi_tesuryo_futan_kubun: 'furikomiTesuryoFutanKubun',
  furikomi_tesuryo: 'furikomiTesuryo',
  biko: 'biko',
  haiten_flg: 'haitenFlg',
};

/**
 * セルが空 / undefined / null のときの列別既定値。NEW モードの既定と同じにし、
 * スキーマが 空文字許容（NOT NULL・既定 ''）とする m_hanbaiten 列の NOT NULL 制約を
 * UPDATE でも満たす。NULL 許容列（numeric / enum）は null をそのまま受ける。
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
  // numeric / enum 項目は `null` に落ちる — 列は NULL 許容。
};
