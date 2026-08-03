// ACSMS-SCR-016 — 購読者Excelデータ取込: 列モデル + Excel セル正規化ユーティリティ。
//
// View（DokusyaImportView.vue）から分離した純粋ロジック（Vue 状態に依存しない）。
// 列メタ（物理カラム / ヘッダ / 必須・編集不可・新規対象外の各集合）と、XLSX セルの
// 日付/真偽正規化をここに集約し、単体テスト可能にする。
//
// NOTE: テスト fixture（test/fixtures/dokusya-import.fixture.ts）は意図的に列定義の
// 独立コピーを持つ（「全ヘッダが描画される」等の契約アサーション用）。本ファイルから
// import させない — 同一ソース同士の比較になりトートロジーになるため。

/**
 * 物理カラム名 46 個 — api.md §テンプレートファイル仕様 の並び順どおり。
 * index N が index-N の日本語ヘッダ + チェックボックスの value 属性に対応する。
 *
 * ここに **無い**もの（画面で指定するため Excel 列ではない）:
 *   - 購読種別          … 画面ラジオ（紙版/電子版）
 *   - 読者情報変更適用日 … 画面の入力欄。1ファイル1つ（顧客要件 2026-08）
 *   - 購読中止日        … 同上。入力すると一括中止になる（適用日と排他）
 */
export const PHYSICAL_COLUMNS = [
  'dokusya_id',
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
  'biko',
] as const;
export type PhysicalColumn = (typeof PHYSICAL_COLUMNS)[number];

/** 日本語表示ヘッダ — BE テンプレートの列順と一致必須。 */
export const JP_HEADERS: Record<PhysicalColumn, string> = {
  dokusya_id: 'ID',
  kanri_shiten_code: '管理支店',
  shiten_code: '支店',
  kumiaiin_code: '組合員コード',
  shimei_sei: '購読者氏名_氏',
  shimei_mei: '購読者氏名_名',
  shimei_kana_sei: '購読者かな_氏',
  shimei_kana_mei: '購読者かな_名',
  dokusya_busu: '購読部数',
  tanka_code: '新聞単価',
  email: 'メールアドレス',
  mail_magazine_flg: 'メールマガジン',
  birth_year: '生年（西暦）',
  gender: '性別',
  yubin_no: '郵便番号',
  todofuken_code: '都道府県',
  shikuchoson: '市町村郡',
  chome_banchi: '丁目番地',
  tatemono_mei: 'マンション・アパート名',
  renrakusaki_1: '連絡先１',
  renrakusaki_2: '連絡先２',
  haitatsu_same_flg: '購読者情報と同じ',
  haitatsu_yubin_no: '郵便番号(配達先)',
  haitatsu_todofuken_code: '都道府県(配達先)',
  haitatsu_shikuchoson: '市町村郡(配達先)',
  haitatsu_chome_banchi: '丁目番地(配達先)',
  haitatsu_tatemono_mei: 'ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)',
  haitatsu_renrakusaki_1: '連絡先１(配達先)',
  haitatsu_renrakusaki_2: '連絡先２(配達先)',
  haitatsu_shimei_sei: '配達先苗字（漢字）',
  haitatsu_shimei_mei: '配達先名前（漢字）',
  haitatsu_shimei_kana_sei: '配達先苗字（かな）',
  haitatsu_shimei_kana_mei: '配達先名前（かな）',
  hanbaiten_code: '販売店コード',
  yubin_kubun: '郵送区分',
  shiharai_hoho: '支払方法',
  dokusyaryo_shiharai_cycle: '購読料支払サイクル（月数）',
  hikiotoshi_yokin_shubetsu: '引落口座貯金種目',
  bank_branch_code: '引落口座支店コード',
  bank_branch_name: '引落口座支店名',
  hikiotoshi_koza_no: '引落口座番号',
  hikiotoshi_koza_meigi: '引落口座名義',
  dokusyaso_bunrui: '購読者層分類',
  nogyosya_bunrui: '農業者分類',
  dokusya_kaishi_date: '購読開始日',
  biko: '備考',
};

/** ヘッダ（日本語）→ 物理カラム。sheet_to_json のキーは 1 行目の文字列。 */
export const HEADER_TO_PHYSICAL: Record<string, PhysicalColumn> = (() => {
  const out: Record<string, PhysicalColumn> = {};
  for (const col of PHYSICAL_COLUMNS) {
    out[JP_HEADERS[col]] = col;
  }
  return out;
})();

/** 日付列（XLSX のシリアル値を YYYY-MM-DD へ変換する対象）。 */
export const DATE_PHYSICAL_COLUMNS = new Set<string>(['dokusya_kaishi_date']);

/** 真偽値列（Excel のチェック/文字列を boolean へ変換する対象）。 */
export const BOOLEAN_PHYSICAL_COLUMNS = new Set<string>(['haitatsu_same_flg']);

/**
 * 取込モード = 新規登録（NEW）のとき、必須 + 常時チェック + disable の物理カラム。
 * api.md §4.1 NEW モード必須リストに対応。
 *
 * `shiten_code`（支店）は含めない — api.md §4.1 で「NEW モードは必須」と明記されて
 * いるのは管理支店側のみで、`t_dokusya.shiten_id` は NULL 許容、SCR-011 の画面登録
 * でも任意項目。取込だけ必須にすると画面からは登録できる購読者が Excel からは
 * 登録できない不整合になる（BE の IMPORT_NEW_REQUIRED_COLUMNS と対で保つこと）。
 */
export const REQUIRED_COLUMNS_NEW: readonly PhysicalColumn[] = [
  'kanri_shiten_code',
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
];
export const REQUIRED_SET = new Set<string>(REQUIRED_COLUMNS_NEW);

/** UPDATE_* のキー列。常にチェック＋disable（更新対象の特定キー）。 */
export const KEY_COLUMN: PhysicalColumn = 'dokusya_id';

/**
 * 入力箇所のみ更新（UPDATE_PARTIAL）で「編集不可」の項目。
 * 購読開始日（初回）はフォーム編集でも不変のため、部分更新でも未チェック＋
 * disable にして更新対象から外す。購読種別は画面ラジオで一括指定する単一ソース
 * （Excel 列ではない）ため対象外。
 *
 * 氏名4項目（購読者氏名/かな）は **更新可**（顧客要件 2026-07・改姓等）。
 * SCR-011 の編集画面が既に氏名の変更を許可しているので、取込だけ不可にすると
 * 画面からはできて Excel からはできない不整合になる。紙版・電子版とも同じ扱い
 * （BE の IMPORT_EDIT_IMMUTABLE_COLUMNS と対で保つこと）。
 */
export const EDIT_IMMUTABLE_COLUMNS: readonly PhysicalColumn[] = [
  'dokusya_kaishi_date',
];
export const EDIT_IMMUTABLE_SET = new Set<string>(EDIT_IMMUTABLE_COLUMNS);

/**
 * 帳票影響項目 — 紙版の当日変更（適用日=本日）では変更できない列
 * （顧客要件2026-07。部数・販売店・購読者住所・配達先住所）。
 *
 * BE の `REPORT_FIELD_PAIRS`（`dokusya-shubetsu.rules.ts`）と対で保つこと。
 * ただし **販売店だけキー名が違う** — 単票 dto は `hanbaiten_id` を見るが、
 * 取込の列は `hanbaiten_code`。ここは取込の列名で持つ。
 *
 * 電子版は帳票を生成しないため対象外（全項目 当日反映可）。
 */
export const REPORT_IMPACT_COLUMNS: readonly PhysicalColumn[] = [
  'dokusya_busu',
  'hanbaiten_code',
  'yubin_no',
  'todofuken_code',
  'shikuchoson',
  'chome_banchi',
  'tatemono_mei',
  'haitatsu_yubin_no',
  'haitatsu_todofuken_code',
  'haitatsu_shikuchoson',
  'haitatsu_chome_banchi',
  'haitatsu_tatemono_mei',
];
export const REPORT_IMPACT_SET = new Set<string>(REPORT_IMPACT_COLUMNS);

/** 取込み可能な最大行数（DTO @ArrayMaxSize と一致）。 */
export const MAX_IMPORT_ROWS = 30000;

// 日付正規化（excelSerialToIsoDate / normalizeImportDate）は時刻系集約方針
// （`.claude/rules/vue.md §Date/Time`）に従い `@/utils/datetime` に集約。
// View からは datetime.ts を直接 import すること。

/**
 * Excel の真偽セルを boolean へ正規化する。TRUE/1/○/はい/Y を true、
 * FALSE/0/×/いいえ/N を false とし、空欄は undefined（BE で未指定扱い）。
 */
export function normalizeImportBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim();
  if (s === '') return undefined;
  if (/^(true|1|○|はい|yes|y)$/i.test(s)) return true;
  if (/^(false|0|×|いいえ|no|n)$/i.test(s)) return false;
  return undefined;
}
