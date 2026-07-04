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
const notify = useNotify();
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
  if (parsedRows.value.length > MAX_IMPORT_ROWS) return MSG_016_006;

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
    notify.success(res.message || MSG_016_004);
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
