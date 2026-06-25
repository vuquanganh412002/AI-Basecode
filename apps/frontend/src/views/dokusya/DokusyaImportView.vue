<script setup lang="ts">
// ACSMS-SCR-016 — 購読者Excelデータ取込画面.
//
// Single-page form: pick an Excel file → client-side parse via xlsx →
// show preview → toggle column subset → choose import mode → submit to
// the BE import endpoint.
//
// Mirrors the SCR-019 precedent (HanbaitenImportView.vue): native
// <input type="file"> + native <input type="checkbox" name="col"
// value="..."> so the spec's name+value selectors keep working in
// vitest without traversing antd component internals.
//
// Spec contract: src/views/dokusya/__tests__/DokusyaImportView.spec.ts.

import { computed, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { useAuthStore } from '@/stores/auth.store';
import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
import {
  downloadDokusyaImportTemplate,
  importDokusyaExcel,
  type DokusyaImportMode,
  type ImportDokusyaRow,
} from '@/api/dokusya/dokusya';

/**
 * 49 physical column names — exact order per api.md §テンプレートファイル
 * 仕様. Index N maps to the index-N Japanese header below and to the
 * matching checkbox `value` attribute.
 */
const PHYSICAL_COLUMNS = [
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
type PhysicalColumn = (typeof PHYSICAL_COLUMNS)[number];

/** 日付列（XLSX のシリアル値を YYYY-MM-DD へ変換する対象）。 */
const DATE_PHYSICAL_COLUMNS = new Set<string>([
  'dokusya_kaishi_date',
  'dokusya_chushi_date',
  'joho_henko_tekiyo_date',
  'hanbaiten_tekiyo_date',
]);

/** 真偽値列（Excel のチェック/文字列を boolean へ変換する対象）。 */
const BOOLEAN_PHYSICAL_COLUMNS = new Set<string>(['haitatsu_same_flg']);

/**
 * Excel の真偽セルを boolean へ正規化する。TRUE/1/○/はい/Y を true、
 * FALSE/0/×/いいえ/N を false とし、空欄は undefined（BE で未指定扱い）。
 */
function normalizeImportBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim();
  if (s === '') return undefined;
  if (/^(true|1|○|はい|yes|y)$/i.test(s)) return true;
  if (/^(false|0|×|いいえ|no|n)$/i.test(s)) return false;
  return undefined;
}

/**
 * Excel のシリアル日付値（1899-12-30 起点、1900 うるう年バグ込み）を
 * 'YYYY-MM-DD' へ変換する。TZ ずれを避けるため UTC で計算する。
 */
function excelSerialToIsoDate(serial: number): string {
  const ms = Math.round(serial) * 86_400_000 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Excel の日付セルは様々な形で届く（数値シリアル 46188 / 文字列シリアル
 * "46188" / "YYYY-MM-DD" / "YYYY/MM/DD" / "D/M/YY" 等）。すべて DB が受け取る
 * 'YYYY-MM-DD' へ正規化する。判別不能な値はそのまま返し、BE 側で再検証させる。
 */
function normalizeImportDate(value: unknown): unknown {
  if (typeof value === 'number') return excelSerialToIsoDate(value);
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (s === '') return value;
  // 文字列シリアル（区切り無しの純粋な数字）。
  if (/^\d{4,6}$/.test(s)) return excelSerialToIsoDate(Number(s));
  // 既に YYYY-MM-DD / YYYY/MM/DD → ハイフン + ゼロ埋め。
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // D/M/YY・D/M/YYYY（Excel "d/m/yy" 表示）。月>12 のときは M/D とみなし入替。
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) {
    let day = Number(m[1]);
    let mon = Number(m[2]);
    if (mon > 12 && day <= 12) [day, mon] = [mon, day];
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return s;
}

/** Japanese display headers — must match BE template column order. */
const JP_HEADERS: Record<PhysicalColumn, string> = {
  dokusya_id: 'ID',
  dokusya_shubetsu: '購読種別',
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
  dokusya_chushi_date: '購読中止日',
  biko: '備考',
  joho_henko_tekiyo_date: '読者情報変更適用日',
  hanbaiten_tekiyo_date: '販売店適用日',
};

/** Header (JP) → physical column. sheet_to_json keys are row-1 strings. */
const HEADER_TO_PHYSICAL: Record<string, PhysicalColumn> = (() => {
  const out: Record<string, PhysicalColumn> = {};
  for (const col of PHYSICAL_COLUMNS) {
    out[JP_HEADERS[col]] = col;
  }
  return out;
})();

/**
 * Physical columns required + always-checked + disabled when import
 * mode = 新規登録 (NEW). Mirrors api.md §4.1 NEW-mode required list.
 */
const REQUIRED_COLUMNS_NEW: readonly PhysicalColumn[] = [
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
];
const REQUIRED_SET = new Set<string>(REQUIRED_COLUMNS_NEW);

/** UPDATE_* のキー列。常にチェック＋disable（更新対象の特定キー）。 */
const KEY_COLUMN: PhysicalColumn = 'dokusya_id';

/**
 * 入力箇所のみ更新（UPDATE_PARTIAL）で「編集不可」の項目。
 * 購読種別 / 氏名4項目 / 購読開始日 はフォーム編集でも不変のため、
 * 部分更新でも未チェック＋disable にして更新対象から外す。
 */
const EDIT_IMMUTABLE_COLUMNS: readonly PhysicalColumn[] = [
  'dokusya_shubetsu',
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'dokusya_kaishi_date',
];
const EDIT_IMMUTABLE_SET = new Set<string>(EDIT_IMMUTABLE_COLUMNS);

/**
 * 新規登録（NEW）で対象外の列。読者情報変更適用日 / 販売店適用日 は履歴の
 * 「変更イベント日」であり、新規登録には概念が無いため NEW では未チェック＋
 * disable にする（顧客要件 2026-06。UPDATE でのみ使用）。
 */
const NEW_EXCLUDED_COLUMNS: readonly PhysicalColumn[] = [
  'joho_henko_tekiyo_date',
  'hanbaiten_tekiyo_date',
];
const NEW_EXCLUDED_SET = new Set<string>(NEW_EXCLUDED_COLUMNS);

const MAX_ROWS = 30000;

// FE radio display value → BE wire value.
const MODE_TO_BE: Record<string, DokusyaImportMode> = {
  new: 'NEW',
  update: 'UPDATE_ALL',
  cancel: 'UPDATE_PARTIAL',
};

const IMPORT_MODE_OPTIONS: ReadonlyArray<{
  value: keyof typeof MODE_TO_BE;
  label: string;
}> = [
  { value: 'new', label: '新規登録' },
  { value: 'update', label: '全項目更新' },
  { value: 'cancel', label: '入力箇所のみ更新' },
];

// ─── messages (screen-design.md §メッセージ情報) ──────────────────────
const MSG_016_001 =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';
const MSG_016_002 = '取込処理を開始します。よろしいですか？';
const MSG_016_004 = '取り込みました。';
const MSG_016_006 =
  'ファイルの行数が上限（30000行）を超えているため、取込みできません。';

// m_code values for the 電子版クレカ guard (seeder §5).

const authStore = useAuthStore();
const canImport = computed(() => authStore.hasPermission('dokusya.import'));

// ─── form state ──────────────────────────────────────────────────────

const importModeFe = ref<keyof typeof MODE_TO_BE>('new');

/** Selected columns — every physical column starts checked. */
const selected = reactive<Record<PhysicalColumn, boolean>>(
  PHYSICAL_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = true;
      return acc;
    },
    {} as Record<PhysicalColumn, boolean>,
  ),
);

/** Parsed Excel rows, populated after a successful file change. */
const parsedRows = ref<Array<Record<string, unknown>>>([]);
const fileName = ref<string>('');
const submitting = ref(false);
const panelCollapsed = ref(false);

/** Row-level errors surfaced from IMPORT_VALIDATION_ERROR (capped at 10). */
interface RowError {
  row: number;
  field: string;
  message: string;
}
const rowErrors = ref<RowError[]>([]);

/** Import result counts (機能 8.4). */
const importResult = ref<{
  created_count: number;
  updated_count: number;
  cancelled_count: number;
  skipped_count: number;
  rireki_count: number;
  total_rows: number;
} | null>(null);

// ─── derived ─────────────────────────────────────────────────────────

const hasFile = computed(() => parsedRows.value.length > 0);
const previewVisible = computed(() => hasFile.value);

/**
 * 強制チェック＋disable（forced ON）になる列か:
 *   - 全項目更新 (UPDATE_ALL) → 編集不可項目を除く全列を lock（全項目対象）。
 *   - 新規登録 (NEW)          → 必須列を lock。
 *   - 入力箇所のみ更新 (PARTIAL) → キー列 (dokusya_id) のみ lock。
 */
function isLocked(col: PhysicalColumn): boolean {
  if (importModeFe.value === 'update') return !EDIT_IMMUTABLE_SET.has(col);
  if (importModeFe.value === 'new') return REQUIRED_SET.has(col);
  return importModeFe.value === 'cancel' && col === KEY_COLUMN;
}

/**
 * 強制 未チェック＋disable（forced OFF）になる列か。
 * 更新モード（全項目更新 / 入力箇所のみ更新）の編集不可項目
 * （購読種別 / 氏名4 / 購読開始日）は更新対象外なので未チェック＋disable。
 */
function isForcedUnchecked(col: PhysicalColumn): boolean {
  // 新規登録: 読者情報変更適用日 / 販売店適用日 は対象外（UPDATE 専用の変更イベント日）。
  if (importModeFe.value === 'new') return NEW_EXCLUDED_SET.has(col);
  const isUpdateMode =
    importModeFe.value === 'update' || importModeFe.value === 'cancel';
  if (!isUpdateMode) return false;
  return col !== KEY_COLUMN && EDIT_IMMUTABLE_SET.has(col);
}

/** チェックボックスを disable にするか（forced ON / forced OFF のどちらか）。 */
function isColumnDisabled(col: PhysicalColumn): boolean {
  return isLocked(col) || isForcedUnchecked(col);
}

/** Columns the preview table renders — checked only. */
const previewColumns = computed<PhysicalColumn[]>(() =>
  PHYSICAL_COLUMNS.filter((col) => selected[col]),
);

/**
 * Rows the preview table actually renders. Capped so a huge file
 * (up to 30000 rows) doesn't blow up the DOM / heap — the full set is
 * still kept in `parsedRows` for the count badge, validation and submit.
 */
const PREVIEW_ROW_CAP = 100;
const previewRows = computed(() => parsedRows.value.slice(0, PREVIEW_ROW_CAP));

/**
 * Bound to the すべて選択／解除 checkbox. Disabled in 全項目更新 (all locked).
 * 編集不可項目（チェックボックス無し）は判定から除外する — 当該列は常に
 * 未チェックなので、含めると「全選択」でも常に false になってしまう。
 */
const allChecked = computed<boolean>({
  get: () =>
    PHYSICAL_COLUMNS.filter((col) => !isForcedUnchecked(col)).every(
      (col) => selected[col],
    ),
  set: (value: boolean) => {
    for (const col of PHYSICAL_COLUMNS) {
      // forced ON は常にチェック、forced OFF は常に未チェック、それ以外のみ追従。
      if (isLocked(col)) selected[col] = true;
      else if (isForcedUnchecked(col)) selected[col] = false;
      else selected[col] = value;
    }
  },
});

// モード変更時に各列のチェック状態を初期化する:
//   - forced ON  → チェック
//   - forced OFF → 未チェック
//   - それ以外   → 全モードで既定はチェック（入力箇所のみ更新でも編集不可項目
//                  以外は既定ですべてチェックし、ユーザーが任意で外せる）。
watch(importModeFe, () => {
  for (const col of PHYSICAL_COLUMNS) {
    if (isLocked(col)) selected[col] = true;
    else if (isForcedUnchecked(col)) selected[col] = false;
    else selected[col] = true;
  }
});

// ─── file change → xlsx parse → preview ─────────────────────────────

function isExcelFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

function rejectInvalidFile(): void {
  message.error(MSG_016_001);
  parsedRows.value = [];
  fileName.value = '';
  rowErrors.value = [];
  resetFileInput();
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  rowErrors.value = [];
  importResult.value = null;

  // [format-guard] Extension check BEFORE parse. `accept=".xlsx,.xls"`
  // is advisory only (bypassable via drag&drop / Safari), and XLSX.read
  // parses CSV/TXT without throwing — so a catch alone can't detect a
  // non-Excel file.
  if (!isExcelFileName(file.name)) {
    rejectInvalidFile();
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new Error('empty workbook');
    const sheet = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
    // sheet_to_json keys are row-1 cell strings. Accept either the JP
    // header OR the physical name as a key (test fixtures pass physical
    // names directly); drop unknown columns.
    parsedRows.value = rawRows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        const physical =
          HEADER_TO_PHYSICAL[key] ??
          ((PHYSICAL_COLUMNS as readonly string[]).includes(key)
            ? (key as PhysicalColumn)
            : undefined);
        if (physical) {
          // 日付列はシリアル値(46188) / "D/M/YY" 等で届くため YYYY-MM-DD に
          // 正規化。真偽列（購読者情報と同じ）は boolean へ。それ以外はそのまま。
          if (DATE_PHYSICAL_COLUMNS.has(physical)) {
            out[physical] = normalizeImportDate(value);
          } else if (BOOLEAN_PHYSICAL_COLUMNS.has(physical)) {
            const b = normalizeImportBool(value);
            if (b !== undefined) out[physical] = b;
          } else {
            out[physical] = value;
          }
        }
      }
      return out;
    });
  } catch {
    rejectInvalidFile();
  }
}

// ─── template download ──────────────────────────────────────────────

async function onTemplateDownload(): Promise<void> {
  try {
    const blob = await downloadDokusyaImportTemplate();
    if (
      globalThis.window !== undefined &&
      typeof globalThis.URL?.createObjectURL === 'function'
    ) {
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '購読者Excelデータ取込_テンプレート.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    }
  } catch {
    // Global axios interceptor already toasted the 500 — swallow here.
  }
}

// ─── client validation (機能 8.1) ─────────────────────────────────────

/** 電子版(2)・併読(3) はメール必須かつ一意。紙版(1) は任意・重複可。 */
function isDigitalOrBoth(shubetsu: number): boolean {
  return (
    shubetsu === DokusyaShubetsu.DIGITAL || shubetsu === DokusyaShubetsu.BOTH
  );
}

/**
 * Run all client-side preflight checks. Returns the first blocking
 * error message (toast) or null when the file is clean enough to submit.
 * Row-level 電子版クレカ / 購読部数 violations populate `rowErrors` so the
 * error panel renders them; the BE re-validates everything anyway.
 */
function validateBeforeSubmit(): string | null {
  // no-file は onSubmit が warning で先に処理するためここには来ない。
  if (parsedRows.value.length > MAX_ROWS) return MSG_016_006;

  const errors: RowError[] = [];
  const isNew = importModeFe.value === 'new';
  // 新規取込時の電子版/併読メール重複検知用（メール → 初出の行番号）。
  // 既存DBとの重複はBEが判定する（ここはバッチ内の素早いフィードバック）。
  const batchDigitalEmail = new Map<string, number>();
  parsedRows.value.forEach((row, idx) => {
    const rowNo = idx + 2; // +2: row 1 is the header, data starts at 2.
    const shubetsu = Number(row.dokusya_shubetsu);
    const shiharai = Number(row.shiharai_hoho);
    const busu = Number(row.dokusya_busu);
    const email = String(row.email ?? '').trim();

    // 電子版 かつ クレジットカード決済 → 取込不可 (MSG-016-005).
    if (
      shubetsu === DokusyaShubetsu.DIGITAL &&
      shiharai === ShiharaiHoho.CREDIT_CARD
    ) {
      errors.push({
        row: rowNo,
        field: 'shiharai_hoho',
        message: '電子版かつクレジットカード決済の組み合わせは取込みできません。',
      });
    }
    // 顧客要件 — メールは電子版(2)・併読(3) で必須かつ電子版/併読間で一意。
    // 新規取込は行の購読種別が確定値（更新は購読種別変更不可のためBEが既存値で
    // 判定）。新規モードでのみFE側でも検証し、即時フィードバックする。
    if (isNew && isDigitalOrBoth(shubetsu)) {
      if (!email) {
        errors.push({
          row: rowNo,
          field: 'email',
          message: 'メールアドレスは電子版・併読の場合は必須です。',
        });
      } else {
        const first = batchDigitalEmail.get(email);
        if (first !== undefined) {
          errors.push({
            row: rowNo,
            field: 'email',
            message: 'このメールアドレスは既に登録されています。',
          });
        } else {
          batchDigitalEmail.set(email, rowNo);
        }
      }
    }
    // 購読部数は 1 以上（解約は取込対象外。顧客要件 2026-06）。
    if (row.dokusya_busu !== undefined && busu <= 0) {
      errors.push({
        row: rowNo,
        field: 'dokusya_busu',
        message: '購読部数は1以上で入力してください。',
      });
    }
    // UPDATE は読者情報変更適用日が必須（履歴の情報変更イベント日）。
    if (!isNew && !String(row.joho_henko_tekiyo_date ?? '').trim()) {
      errors.push({
        row: rowNo,
        field: 'joho_henko_tekiyo_date',
        message: '読者情報変更適用日を入力してください。',
      });
    }
  });

  if (errors.length > 0) {
    rowErrors.value = errors.slice(0, 10);
    return '取込み処理にエラーが発生しました。';
  }
  return null;
}

// ─── submit ─────────────────────────────────────────────────────────

function onSubmit(): void {
  if (submitting.value) return;
  rowErrors.value = [];
  importResult.value = null;

  // 未選択ファイルは「選択してください」warning（hanbaiten と統一）。
  // ファイル形式エラー（MSG_016_001）とは区別する。
  if (!hasFile.value) {
    message.warning('Excelファイルを選択してください。');
    return;
  }

  const blocking = validateBeforeSubmit();
  if (blocking) {
    message.error(blocking);
    return;
  }

  // ACSMS-MSG-016-002 — confirm dialog wording.
  Modal.confirm({
    title: '取込処理',
    content: MSG_016_002,
    okText: 'はい',
    cancelText: 'いいえ',
    onOk: async () => {
      await runImport();
    },
  });
}

async function runImport(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  try {
    // selected_columns — every checked column. NEW-mode required columns
    // are always included (their checkbox is disabled+checked).
    const selectedCols = PHYSICAL_COLUMNS.filter((c) => selected[c]);

    const rows: ImportDokusyaRow[] = parsedRows.value.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of PHYSICAL_COLUMNS) {
        if (r[col] !== undefined && r[col] !== '') {
          out[col] = r[col];
        }
      }
      return out;
    });

    const body = {
      import_mode: MODE_TO_BE[importModeFe.value],
      selected_columns: selectedCols,
      rows,
    };
    const res = await importDokusyaExcel(body);
    message.success(res.message || MSG_016_004);
    // 機能 8.4 — show counts, then reset for the next upload.
    importResult.value = {
      created_count: res.data?.created_count ?? 0,
      updated_count: res.data?.updated_count ?? 0,
      cancelled_count: res.data?.cancelled_count ?? 0,
      skipped_count: res.data?.skipped_count ?? 0,
      rireki_count: res.data?.rireki_count ?? 0,
      total_rows: res.data?.total_rows ?? 0,
    };
    parsedRows.value = [];
    fileName.value = '';
    resetFileInput();
  } catch (err: unknown) {
    // Render row-level errors for both IMPORT_VALIDATION_ERROR (service
    // business rules) AND VALIDATION_ERROR (nested-row DTO failures — the
    // global ValidationPipe in main.ts flattens rows[i].field to
    // { row, field, message }). The global axios interceptor stays silent
    // for both codes (FORBIDDEN / 500 are toasted centrally), so the view
    // owns the per-row list here.
    const body = (err as { response?: { data?: unknown } })?.response?.data as
      | { error_code?: string; errors?: RowError[] }
      | undefined;
    if (
      (body?.error_code === 'IMPORT_VALIDATION_ERROR' ||
        body?.error_code === 'VALIDATION_ERROR') &&
      Array.isArray(body.errors)
    ) {
      rowErrors.value = body.errors.slice(0, 10);
    }
  } finally {
    submitting.value = false;
  }
}

// ─── refs / locks ────────────────────────────────────────────────────

const fileInputEl = ref<HTMLInputElement | null>(null);

function resetFileInput(): void {
  if (fileInputEl.value) fileInputEl.value.value = '';
}

function onColumnToggle(col: PhysicalColumn, el: HTMLInputElement): void {
  // forced ON は常にチェックへスナップ（テスト等が change を発火させても veto）。
  if (isLocked(col)) {
    el.checked = true;
    selected[col] = true;
    return;
  }
  // forced OFF は常に未チェックへスナップ。
  if (isForcedUnchecked(col)) {
    el.checked = false;
    selected[col] = false;
    return;
  }
  selected[col] = el.checked;
}

function onPanelToggle(): void {
  panelCollapsed.value = !panelCollapsed.value;
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '';
  return String(value);
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4"
    >
      <form class="space-y-4" @submit.prevent>
        <!-- Row 1: file | mode | template -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 items-start">
          <div>
            <label
              class="block text-sm font-semibold text-text-main mb-1.5"
              for="file-input"
            >
              Excelファイル名
              <span class="text-error ml-1">*</span>
            </label>
            <!--
              @click clears the value BEFORE the OS picker opens, so
              re-selecting the SAME filename (after editing the Excel) still
              fires `change` and re-parses. Resetting on @change instead would
              wipe the native "filename" display right after selecting.
            -->
            <input
              id="file-input"
              ref="fileInputEl"
              type="file"
              accept=".xlsx,.xls"
              class="w-full border border-border-strong rounded px-3 py-1 text-sm text-text-main bg-surface-card file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              @click="resetFileInput"
              @change="onFileChange"
            />
          </div>

          <div>
            <span
              id="import-mode-label"
              class="block text-sm font-semibold text-text-main mb-1.5"
            >
              取込モード
            </span>
            <div
              role="radiogroup"
              aria-labelledby="import-mode-label"
              data-test="import-mode"
              class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1"
            >
              <label
                v-for="opt in IMPORT_MODE_OPTIONS"
                :key="opt.value"
                class="inline-flex items-center gap-1.5 text-sm text-text-main cursor-pointer"
              >
                <input
                  v-model="importModeFe"
                  type="radio"
                  name="import-mode"
                  :value="opt.value"
                  :data-test="`import-mode-${opt.value}`"
                  class="w-3.5 h-3.5 border-border-strong accent-primary focus:ring-primary/20"
                />
                {{ opt.label }}
              </label>
            </div>
          </div>

          <div class="flex flex-col items-start md:items-end justify-end h-full md:pt-6">
            <button
              data-test="template-download-btn"
              type="button"
              class="flex items-center justify-center gap-1.5 px-3 py-[7px] text-sm font-medium text-primary border border-primary/40 rounded hover:bg-primary/5 transition-colors whitespace-nowrap"
              @click="onTemplateDownload"
            >
              <span class="material-icons text-[16px]">download</span>
              テンプレート
            </button>
          </div>
        </div>

        <!-- Column selector accordion -->
        <div class="border border-border rounded">
          <div
            class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-card-subtle"
          >
            <div class="flex items-center">
              <button
                data-test="col-toggle"
                type="button"
                class="flex items-center gap-1.5 text-sm font-semibold text-text-main"
                :aria-expanded="!panelCollapsed"
                @click="onPanelToggle"
              >
                <span class="material-icons text-[18px]">
                  {{ panelCollapsed ? 'chevron_right' : 'expand_more' }}
                </span>
                取込列
              </button>
              <span
                v-if="importModeFe === 'update'"
                class="ml-2 text-xs font-normal text-text-secondary"
              >
                全項目更新では全列が対象です。列を選択する場合は「入力箇所のみ更新」を選択してください。
              </span>
            </div>
            <label
              class="flex items-center gap-1.5 text-xs text-text-description cursor-pointer"
            >
              <input
                v-model="allChecked"
                data-test="select-all-checkbox"
                type="checkbox"
                :disabled="importModeFe === 'update'"
                class="w-3.5 h-3.5 rounded border-border-strong accent-primary focus:ring-primary/20 disabled:cursor-not-allowed"
              />
              すべて選択／解除
            </label>
          </div>

          <div v-show="!panelCollapsed" data-test="col-panel" class="px-4 py-3">
            <div
              class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
            >
              <label
                v-for="col in PHYSICAL_COLUMNS"
                :key="col"
                class="flex items-center gap-3 px-3 py-2 border border-border rounded transition-colors"
                :class="
                  isForcedUnchecked(col)
                    ? 'bg-surface-card-subtle cursor-not-allowed'
                    : 'cursor-pointer hover:bg-surface-hover'
                "
              >
                <!-- 編集不可項目（更新で変更不可）はチェックボックスを出さず、
                     グレー表示のみにする（操作不可を視覚的に明示）。 -->
                <input
                  v-if="!isForcedUnchecked(col)"
                  type="checkbox"
                  name="col"
                  :value="col"
                  :checked="selected[col]"
                  :disabled="isColumnDisabled(col)"
                  class="w-4 h-4 rounded border-border-strong accent-primary focus:ring-primary/20 flex-shrink-0"
                  @change="(e) => onColumnToggle(col, e.target as HTMLInputElement)"
                />
                <span
                  v-else
                  class="w-4 h-4 flex-shrink-0"
                  aria-hidden="true"
                ></span>
                <span
                  class="text-sm"
                  :class="
                    isForcedUnchecked(col) ? 'text-text-disabled' : 'text-text-main'
                  "
                  >{{ JP_HEADERS[col] }}</span
                >
              </label>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="previewVisible" data-test="preview-section" class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-text-main">
              <span class="text-primary">◆</span>
              取込データプレビュー
              <span class="text-xs font-normal text-text-secondary ml-2">
                {{ parsedRows.length }}件
              </span>
            </p>
          </div>
          <div class="overflow-x-auto border border-border rounded">
            <table class="w-full text-sm border-collapse min-w-max">
              <thead>
                <tr class="bg-surface-card-subtle text-left">
                  <th
                    v-for="col in previewColumns"
                    :key="col"
                    class="px-3 py-2 text-sm font-semibold text-text-main border-b border-border"
                  >
                    {{ JP_HEADERS[col] }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIdx) in previewRows"
                  :key="rowIdx"
                  class="border-b border-border"
                >
                  <td
                    v-for="col in previewColumns"
                    :key="col"
                    class="px-3 py-2 text-sm text-text-main"
                  >
                    {{ renderCell(row[col]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Row-level error list (max 10) -->
        <div
          v-if="rowErrors.length > 0"
          data-test="import-error-list"
          class="border border-error/40 bg-error-subtle rounded p-3 space-y-1"
        >
          <p class="text-sm font-semibold text-error">
            取込み処理にエラーが発生しました。
          </p>
          <ul class="m-0 pl-0 list-none space-y-0.5">
            <li
              v-for="(e, idx) in rowErrors"
              :key="idx"
              data-test="import-error-row"
              class="text-sm text-error"
            >
              行{{ e.row }}: {{ JP_HEADERS[(e.field as PhysicalColumn)] ?? e.field }} — {{ e.message }}
            </li>
          </ul>
        </div>

        <!-- Import result counts -->
        <div
          v-if="importResult"
          data-test="import-result"
          class="border border-success/40 bg-success-subtle rounded p-3 text-sm text-text-main"
        >
          取込件数：登録 {{ importResult.created_count }}件 / 更新
          {{ importResult.updated_count }}件 / 解約
          {{ importResult.cancelled_count }}件 / スキップ
          {{ importResult.skipped_count }}件 / 履歴
          {{ importResult.rireki_count }}件（合計 {{ importResult.total_rows }}件）
        </div>
      </form>

      <div class="flex gap-3 pt-4">
        <button
          data-test="import-submit-btn"
          type="button"
          :disabled="!canImport || submitting"
          class="px-10 py-2 bg-primary hover:bg-primary-hover text-white rounded font-medium transition-colors shadow-ant-card text-sm disabled:bg-text-disabled disabled:cursor-not-allowed disabled:hover:bg-text-disabled"
          :class="{ 'ant-btn-disabled': !canImport || submitting }"
          @click="onSubmit"
        >
          取込開始
        </button>
      </div>
    </section>
  </div>
</template>
