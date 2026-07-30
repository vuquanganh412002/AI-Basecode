<script setup lang="ts">
// ACSMS-SCR-016 — 購読者Excelデータ取込画面。
//
// 単一ページフォーム: Excel 選択 → xlsx でクライアント解析 → プレビュー表示 →
// 列サブセット切替 → 取込モード選択 → BE 取込エンドポイントへ送信。
//
// SCR-019 (HanbaitenImportView.vue) の前例に倣い、ネイティブ <input type="file"> +
// <input type="checkbox" name="col" value="..."> を使用。antd 内部を辿らず
// vitest でスペックの name+value セレクタが機能するようにする。
//
// Spec contract: src/views/dokusya/__tests__/DokusyaImportView.spec.ts.

import { computed, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { useNotify } from '@/composables/useNotify';
import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
import {
  downloadDokusyaImportTemplate,
  importDokusyaExcel,
  type DokusyaImportMode,
  type ImportDokusyaRow,
} from '@/api/dokusya/dokusya';

// 列モデル + Excel セル正規化は utils/dokusya-import.ts に分離（純粋ロジック）。
import {
  PHYSICAL_COLUMNS,
  type PhysicalColumn,
  JP_HEADERS,
  HEADER_TO_PHYSICAL,
  DATE_PHYSICAL_COLUMNS,
  BOOLEAN_PHYSICAL_COLUMNS,
  REQUIRED_SET,
  KEY_COLUMN,
  EDIT_IMMUTABLE_SET,
  NEW_EXCLUDED_SET,
  MAX_IMPORT_ROWS,
  normalizeImportBool,
} from '@/utils/dokusya-import';
import { normalizeImportDate } from '@/utils/datetime';
import { downloadBlob } from '@/utils/download';

// FE radio display value → BE wire value。取込モードは 新規登録 / 更新 の2択。
// 更新は選択列のみ更新（空欄スキップ）。全列更新は「すべて選択」でチェックする。
const MODE_TO_BE: Record<string, DokusyaImportMode> = {
  new: 'NEW',
  update: 'UPDATE',
};

const IMPORT_MODE_OPTIONS: ReadonlyArray<{
  value: keyof typeof MODE_TO_BE;
  label: string;
}> = [
  { value: 'new', label: '新規登録' },
  { value: 'update', label: '更新' },
];

// ─── メッセージ（screen-design.md §メッセージ情報） ──────────────────────
const MSG_016_001 =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';
const MSG_016_002 = '取込処理を開始します。よろしいですか？';
const MSG_016_004 = '取り込みました。';
const MSG_016_006 =
  'ファイルの行数が上限（30000行）を超えているため、取込みできません。';

// 電子版クレカガード用の m_code 値（seeder §5）。

const authStore = useAuthStore();
const codes = useCodesStore();
const notify = useNotify();
const canImport = computed(() => authStore.hasPermission('dokusya.import'));

// ─── フォーム状態 ──────────────────────────────────────────────────────

const importModeFe = ref<keyof typeof MODE_TO_BE>('new');

// 購読種別（紙版/電子版）は画面ラジオで一括指定する単一ソース。全取込行へ一律適用
// し、電子版クレカ禁止 / 電子版メール必須 等のルール判定に使う（顧客要件 2026-07:
// 取込を紙版/電子版の2モードに分離。3:併読はラジオに出さず取込不可）。
const dokusyaShubetsuFe = ref<number>(DokusyaShubetsu.PAPER);

// ラベルは m_code(DOKUSYA_SHUBETSU) から取得（ハードコード禁止・vue.md §m_code）。
// 紙版(1)・電子版(2) のみ（併読(3) は取込対象外）。
const shubetsuOptions = computed(() =>
  codes
    .options('DOKUSYA_SHUBETSU')
    .filter(
      (o) =>
        Number(o.value) === DokusyaShubetsu.PAPER ||
        Number(o.value) === DokusyaShubetsu.DIGITAL,
    ),
);

/** 選択列 — 物理列は初期状態で全てチェック。 */
const selected = reactive<Record<PhysicalColumn, boolean>>(
  PHYSICAL_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = true;
      return acc;
    },
    {} as Record<PhysicalColumn, boolean>,
  ),
);

/** 解析済み Excel 行。ファイル選択成功後に格納される。 */
const parsedRows = ref<Array<Record<string, unknown>>>([]);
const fileName = ref<string>('');
const submitting = ref(false);
const panelCollapsed = ref(false);

/** IMPORT_VALIDATION_ERROR 由来の行単位エラー（最大10件）。 */
interface RowError {
  row: number;
  field: string;
  message: string;
}
const rowErrors = ref<RowError[]>([]);

/** 取込結果件数（機能 8.4）。 */
const importResult = ref<{
  created_count: number;
  updated_count: number;
  cancelled_count: number;
  skipped_count: number;
  rireki_count: number;
  total_rows: number;
} | null>(null);

// ─── 派生値 ─────────────────────────────────────────────────────────

const hasFile = computed(() => parsedRows.value.length > 0);
const previewVisible = computed(() => hasFile.value);

/** 取込モードのラジオが 電子版（＝即時連携で適用日は当日固定）を選んでいるか。 */
const isDigitalBatchSelected = computed(() =>
  isDigitalOrBoth(dokusyaShubetsuFe.value),
);

/**
 * 強制チェック＋disable（forced ON）になる列か:
 *   - 新規登録 (NEW)   → 必須列を lock。
 *   - 更新 (UPDATE)    → キー列 (dokusya_id) のみ lock。他は任意選択。
 */
function isLocked(col: PhysicalColumn): boolean {
  if (importModeFe.value === 'new') return REQUIRED_SET.has(col);
  // 更新: キー列のみ lock（更新対象の突合キー）。
  return col === KEY_COLUMN;
}

/**
 * 強制 未チェック＋disable（forced OFF）になる列か。
 * 更新モードの編集不可項目（氏名4 / 購読開始日）は更新対象外なので
 * 未チェック＋disable（購読種別は画面ラジオで指定する単一ソースのため列に無い）。
 */
function isForcedUnchecked(col: PhysicalColumn): boolean {
  // 新規登録: 読者情報変更適用日 / 販売店適用日 は対象外（UPDATE 専用の変更イベント日）。
  if (importModeFe.value === 'new') return NEW_EXCLUDED_SET.has(col);
  // 更新 × 電子版: 読者情報変更適用日 は当日固定（電子版は即時連携で未来日を
  // 指定できず、BE も当日以外を弾く）。入力させる意味が無いのでグレーアウトし、
  // BE が空欄を当日として扱う（顧客要件 2026-07）。
  if (col === 'joho_henko_tekiyo_date' && isDigitalBatchSelected.value) {
    return true;
  }
  // 更新: キー以外の編集不可列は更新対象外。
  return col !== KEY_COLUMN && EDIT_IMMUTABLE_SET.has(col);
}

/** チェックボックスを disable にするか（forced ON / forced OFF のどちらか）。 */
function isColumnDisabled(col: PhysicalColumn): boolean {
  return isLocked(col) || isForcedUnchecked(col);
}

/** プレビューテーブルが描画する列 — チェック済みのみ。 */
const previewColumns = computed<PhysicalColumn[]>(() =>
  PHYSICAL_COLUMNS.filter((col) => selected[col]),
);

/**
 * プレビューテーブルが実際に描画する行。大きなファイル（最大30000行）で
 * DOM / heap が膨れないよう上限を設ける。全件は件数バッジ・検証・送信のため
 * parsedRows に保持する。
 */
const PREVIEW_ROW_CAP = 100;
const previewRows = computed(() => parsedRows.value.slice(0, PREVIEW_ROW_CAP));

/**
 * すべて選択／解除 チェックボックスにバインド。
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

// モード変更時（＋マウント時 immediate）に各列のチェック状態を初期化する:
//   - forced ON  → チェック
//   - forced OFF → 未チェック
//   - それ以外   → 新規登録は既定チェック / **更新は既定で未チェック**（顧客要件
//                  2026-07：更新は既定で列を選択しない。全列更新は「すべて選択」で
//                  チェックする）。
watch(
  importModeFe,
  () => {
    for (const col of PHYSICAL_COLUMNS) {
      if (isLocked(col)) selected[col] = true;
      else if (isForcedUnchecked(col)) selected[col] = false;
      else selected[col] = importModeFe.value === 'new';
    }
  },
  { immediate: true },
);

// ─── ファイル変更 → xlsx 解析 → プレビュー ─────────────────────────────

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

  // [format-guard] 解析前に拡張子チェック。accept=".xlsx,.xls" は advisory のみ
  //（drag&drop / Safari でバイパス可）で、XLSX.read は CSV/TXT も例外なく解析する
  // ため、catch だけでは非 Excel を検出できない。
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
    // sheet_to_json のキーは1行目セル文字列。JP ヘッダー・物理名どちらのキーも
    // 受け付け（テスト fixture は物理名を直接渡す）、未知列は捨てる。
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

// ─── テンプレートダウンロード ──────────────────────────────────────────────

async function onTemplateDownload(): Promise<void> {
  try {
    const blob = await downloadDokusyaImportTemplate();
    downloadBlob(blob, '購読者Excelデータ取込_テンプレート.xlsx');
  } catch {
    // global axios interceptor が 500 をトースト済み — ここでは握り潰す。
  }
}

// ─── クライアント検証（機能 8.1） ─────────────────────────────────────

/** 電子版(2)・併読(3) はメール必須かつ一意。紙版(1) は任意・重複可。 */
function isDigitalOrBoth(shubetsu: number): boolean {
  return (
    shubetsu === DokusyaShubetsu.DIGITAL || shubetsu === DokusyaShubetsu.BOTH
  );
}

/**
 * クライアント事前チェックを全実行。最初のブロッキングエラー文言（トースト）を
 * 返し、送信可能なら null を返す。行単位の 電子版クレカ / 購読部数 違反は
 * rowErrors に格納しエラーパネルへ表示する（BE も全件再検証する）。
 */
function validateBeforeSubmit(): string | null {
  // no-file は onSubmit が warning で先に処理するためここには来ない。
  if (parsedRows.value.length > MAX_IMPORT_ROWS) return MSG_016_006;

  const errors: RowError[] = [];
  const isNew = importModeFe.value === 'new';
  // 購読種別は画面ラジオで一括指定する単一ソース（全行共通）。
  const shubetsu = dokusyaShubetsuFe.value;
  const isDigitalBatch = isDigitalOrBoth(shubetsu);
  // 新規取込時の電子版/併読メール重複検知用（メール → 初出の行番号）。
  // 既存DBとの重複はBEが判定する（ここはバッチ内の素早いフィードバック）。
  const batchDigitalEmail = new Map<string, number>();
  parsedRows.value.forEach((row, idx) => {
    const rowNo = idx + 2; // +2: row 1 is the header, data starts at 2.
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
    if (isNew && isDigitalBatch) {
      if (email) {
        const first = batchDigitalEmail.get(email);
        if (first === undefined) {
          batchDigitalEmail.set(email, rowNo);
        } else {
          errors.push({
            row: rowNo,
            field: 'email',
            message: 'このメールアドレスは既に登録されています。',
          });
        }
      } else {
        errors.push({
          row: rowNo,
          field: 'email',
          message: 'メールアドレスは電子版・併読の場合は必須です。',
        });
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
    // 電子版は当日固定で列自体をグレーアウトしているため必須チェックの対象外
    // （BE も同条件で必須を外し、空欄は当日として扱う）。
    if (
      !isNew &&
      !isDigitalBatchSelected.value &&
      !String(row.joho_henko_tekiyo_date ?? '').trim()
    ) {
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
    // selected_columns — チェック済み全列。NEW モードの必須列は常に含まれる
    //（チェックボックスが disabled+checked のため）。
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
      dokusya_shubetsu: dokusyaShubetsuFe.value,
      selected_columns: selectedCols,
      rows,
    };
    const res = await importDokusyaExcel(body);
    notify.success(res.message || MSG_016_004);
    // 機能 8.4 — 件数を表示し、次回アップロード用にリセット。
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
    // IMPORT_VALIDATION_ERROR（サービス業務ルール）と VALIDATION_ERROR
    //（ネスト行 DTO 違反 — main.ts の ValidationPipe が rows[i].field を
    // { row, field, message } に平坦化）両方の行単位エラーを描画する。
    // interceptor は両コードで沈黙する（FORBIDDEN / 500 は集中トースト）ため、
    // 行単位一覧は view が担う。
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
        <!-- 1行目（lg・5カラム）: [file ×2] [購読種別] [取込モード] [テンプレート右] -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-4 items-start">
          <div class="md:col-span-2 lg:col-span-2">
            <label
              class="block text-sm font-semibold text-text-main mb-1.5"
              for="file-input"
            >
              Excelファイル名
              <span class="text-error ml-1">*</span>
            </label>
            <!--
              ネイティブのファイル選択欄はボタン文言と未選択メッセージを
              ブラウザのロケールで表示し日本語に固定できないため、非表示にして
              日本語のカスタムボタン＋ファイル名表示に置き換える（機能は不変）。
              クリック時はピッカーを開く前に選択値をクリアし、同一ファイルの
              再選択でも再取り込みされるようにする。
            -->
            <div
              class="flex items-center gap-3 w-full border border-border-strong rounded bg-surface-card px-3 py-1"
            >
              <button
                type="button"
                class="shrink-0 rounded border-0 bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 cursor-pointer"
                @click="fileInputEl?.click()"
              >
                ファイルを選択
              </button>
              <span class="text-sm text-text-description truncate">
                {{ fileName || 'ファイルが選択されていません。' }}
              </span>
            </div>
            <input
              id="file-input"
              ref="fileInputEl"
              type="file"
              accept=".xlsx,.xls"
              class="hidden"
              @click="resetFileInput"
              @change="onFileChange"
            />
          </div>

          <div>
            <span
              id="import-shubetsu-label"
              class="block text-sm font-semibold text-text-main mb-1.5"
            >
              購読種別
              <span class="text-error ml-1">*</span>
            </span>
            <div
              role="radiogroup"
              aria-labelledby="import-shubetsu-label"
              data-test="import-shubetsu"
              class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1"
            >
              <label
                v-for="opt in shubetsuOptions"
                :key="opt.value"
                class="inline-flex items-center gap-1.5 text-sm text-text-main cursor-pointer"
              >
                <input
                  v-model.number="dokusyaShubetsuFe"
                  type="radio"
                  name="import-shubetsu"
                  :value="Number(opt.value)"
                  :data-test="`import-shubetsu-${opt.value}`"
                  class="w-3.5 h-3.5 border-border-strong accent-primary focus:ring-primary/20"
                />
                {{ opt.label }}
              </label>
            </div>
          </div>

          <div>
            <span
              id="import-mode-label"
              class="block text-sm font-semibold text-text-main mb-1.5"
            >
              取込モード
              <span class="text-error ml-1">*</span>
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

          <div
            class="md:col-span-2 lg:col-span-1 flex flex-col items-start md:items-end justify-end h-full md:pt-6"
          >
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
                更新は選択した列のみ対象です。全列を更新する場合は「すべて選択」にチェックしてください。
              </span>
            </div>
            <label
              class="flex items-center gap-1.5 text-xs text-text-description cursor-pointer"
            >
              <input
                v-model="allChecked"
                data-test="select-all-checkbox"
                type="checkbox"
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

        <!-- 行単位エラー一覧（最大10件） -->
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
