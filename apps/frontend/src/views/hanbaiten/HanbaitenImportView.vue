<script setup lang="ts">
// ACSMS-SCR-019 — 販売店Excelデータ取込画面.
//
// Single-page form: pick an Excel file → client-side parse via xlsx →
// show preview → toggle column subset → submit to BE import endpoint.
//
// Spec contract: src/views/hanbaiten/__tests__/HanbaitenImportView.spec.ts
//   - data-test selectors hit specific DOM nodes (preview-section,
//     import-submit-btn, template-download-btn, select-all-checkbox,
//     import-mode); changing them breaks the test.
//   - The native `<select>` element is used (not <a-select>) to match
//     the screen-design `<select id="import-mode">` mockup AND to keep
//     wrapper.find('select#import-mode').setValue('update') working in
//     vitest without a-select internals.
//   - The native `<input type="checkbox" name="col" value="...">` keeps
//     the spec's name+value selector working. wrapping in antd `<a-checkbox>`
//     would require setValue to traverse the wrapper.

import { computed, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { useAuthStore } from '@/stores/auth.store';
import {
  downloadHanbaitenImportTemplate,
  importHanbaitenExcel,
  type ImportMode,
  type ImportHanbaitenRow,
} from '@/api/hanbaiten/hanbaiten';

/**
 * 23-column physical-name list — exact order per api.md §テンプレート
 * ファイル仕様. Index N in this array maps to the index-N Japanese
 * header below, and to the corresponding checkbox `value` attribute.
 */
const PHYSICAL_COLUMNS = [
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
type PhysicalColumn = (typeof PHYSICAL_COLUMNS)[number];

/** Japanese display headers — must match BE getImportTemplateColumns(). */
const JP_HEADERS: Record<PhysicalColumn, string> = {
  hanbaiten_code: '販売店コード',
  hanbaiten_name: '販売店名称',
  hanbaiten_name_kana: '販売店名称（カナ）',
  torihikisaki_no: 'インボイス番号',
  yubin_no: '郵便番号',
  address: '住所',
  tel: '電話番号',
  fax: 'FAX番号',
  shocho_name: '所長名',
  itaku_kubun: '委託区分',
  haitatsuryo_tanka_code: '配達手数料単価',
  bank_code: '金融機関コード',
  bank_name: '金融機関名',
  haitatsuryo_shiharai_cycle: '配達手数料支払サイクル',
  bank_branch_code: '口座支店コード',
  bank_branch_name: '口座支店名',
  yokin_shubetsu: '口座種別',
  koza_no: '口座番号',
  koza_meigi: '口座名義',
  furikomi_tesuryo_futan_kubun: '振込手数料負担区分',
  furikomi_tesuryo: '振込手数料',
  biko: '備考',
  haiten_flg: '廃店フラグ',
};

/**
 * Excel column heading → physical column mapping. The template the BE
 * ships uses these exact JP strings; we accept the half-width variant
 * `販売店名称(カナ)` for backwards compatibility with older customer
 * files that pre-date the v1.0 template.
 */
const HEADER_TO_PHYSICAL: Record<string, PhysicalColumn> = (() => {
  const out: Record<string, PhysicalColumn> = {};
  for (const col of PHYSICAL_COLUMNS) {
    out[JP_HEADERS[col]] = col;
  }
  // [legacy-kana-header] accept half-width parens too
  out['販売店名称(カナ)'] = 'hanbaiten_name_kana';
  out['販売店名称カナ'] = 'hanbaiten_name_kana';
  return out;
})();

const MAX_ROWS = 500;

// FE display value → BE wire value. Shorter IDs match screen-design.md
// mockup and the radio v-model; translated to wire codes at submit.
const MODE_TO_BE: Record<string, ImportMode> = {
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

const authStore = useAuthStore();
const canImport = computed(() => authStore.hasPermission('hanbaiten.import'));

// ─── form state ──────────────────────────────────────────────────────

/** FE display value for the mode select (`new` / `update` / `cancel`). */
const importModeFe = ref<keyof typeof MODE_TO_BE>('new');

/** Selected columns set — every physical column starts checked. */
const selected = reactive<Record<PhysicalColumn, boolean>>(
  PHYSICAL_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = true;
      return acc;
    },
    {} as Record<PhysicalColumn, boolean>,
  ),
);

/**
 * Columns force-checked + disabled per mode (the "取込列" lock set).
 * A locked column cannot be unchecked; entering a mode re-checks its set.
 *
 *   new    (新規登録)        — hanbaiten_code + hanbaiten_name: both are
 *                             NOT NULL with no 空文字許容 on the m_hanbaiten
 *                             schema, so a new row MUST carry them.
 *   cancel (入力箇所のみ更新)  — hanbaiten_code only: the anchor key. Every
 *                             other column is free to tick/untick (only the
 *                             ticked ones are written; the rest keep their
 *                             existing DB value).
 *   update (全項目更新)       — all 23: 全項目更新 means every column is the
 *                             target. To pick a subset, switch to
 *                             入力箇所のみ更新.
 *
 * (The bank cluster's conditional-required rule — required iff
 * itaku_kubun=1 — is per-row and validated by the BE, not a column lock.)
 */
const REQUIRED_BY_MODE: Record<
  keyof typeof MODE_TO_BE,
  readonly PhysicalColumn[]
> = {
  new: ['hanbaiten_code', 'hanbaiten_name'],
  update: PHYSICAL_COLUMNS,
  cancel: ['hanbaiten_code'],
};

/** Set of columns locked (checked + disabled) for the current mode. */
const lockedCols = computed<Set<PhysicalColumn>>(
  () => new Set(REQUIRED_BY_MODE[importModeFe.value]),
);

function isLocked(col: PhysicalColumn): boolean {
  return lockedCols.value.has(col);
}

/**
 * 全項目更新 locks every column, so the すべて選択／解除 toggle has nothing
 * to operate on — disable it there. Editable in NEW / UPDATE_PARTIAL.
 */
const selectAllDisabled = computed(() => importModeFe.value === 'update');

// Re-check every locked column whenever the mode changes (and on mount).
// Switching INTO 全項目更新 ticks all 23; switching INTO 新規登録 re-ticks
// code + name. Columns already unticked in a looser mode keep their state
// when moving to a mode that doesn't lock them.
watch(
  lockedCols,
  (cols) => {
    for (const col of cols) selected[col] = true;
  },
  { immediate: true },
);

/** Parsed Excel rows, populated after a successful file change. */
const parsedRows = ref<Array<Record<PhysicalColumn, unknown>>>([]);

const fileName = ref<string>('');
const submitting = ref(false);

/** 取込列パネルの開閉（dokusya import と同じ折りたたみ挙動）。 */
const panelCollapsed = ref(false);
function onPanelToggle(): void {
  panelCollapsed.value = !panelCollapsed.value;
}

/**
 * Per-row / per-field server errors from the last import attempt, rendered
 * in a persistent panel below the form (NOT a toast). antd's `message.error`
 * collapses '\n', so a multi-row error blob reads as one unscrollable line —
 * the panel shows each row + field + message in a scrollable table instead.
 */
const importErrors = ref<ImportError[]>([]);

/**
 * Import counts from the last successful run — rendered in a green banner
 * below the form (mirrors the dokusya 取込結果 display). hanbaiten has no
 * 解約 / 履歴 concept, so only 登録 / 更新 / スキップ / 合計 are shown.
 */
const importResult = ref<{
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_rows: number;
} | null>(null);

/**
 * Structured server-side import error shape. Each entry may carry a
 * 1-indexed Excel `row` (header = row 1) and a `field` (physical column
 * name or a top-level array name like `rows` / `selected_columns`).
 */
type ImportError = { row?: number; field?: string; message: string };

/** Friendly labels for top-level (non-column) error fields. */
const TOP_LEVEL_FIELD_LABELS: Record<string, string> = {
  rows: '取込データ',
  selected_columns: '取込列',
};

/** Japanese label for an error's `field` (column header or top-level name). */
function errorFieldLabel(e: ImportError): string {
  if (!e.field) return '';
  return (
    JP_HEADERS[e.field as PhysicalColumn] ??
    TOP_LEVEL_FIELD_LABELS[e.field] ??
    e.field
  );
}

// ─── derived ─────────────────────────────────────────────────────────

const hasFile = computed(() => parsedRows.value.length > 0);

const previewVisible = computed(() => hasFile.value);

/** Columns the preview table renders — checked ∧ at least 1 row. */
const previewColumns = computed<PhysicalColumn[]>(() =>
  PHYSICAL_COLUMNS.filter((col) => selected[col]),
);

/** Bound to the 'すべて選択' checkbox. */
const allChecked = computed<boolean>({
  get: () => PHYSICAL_COLUMNS.every((col) => selected[col]),
  set: (value: boolean) => {
    for (const col of PHYSICAL_COLUMNS) {
      // [locked-column-pin] Locked columns (mode-dependent — at least
      // hanbaiten_code) stay checked even when the user uncheck-all's.
      selected[col] = isLocked(col) ? true : value;
    }
  },
});

// ─── file change → xlsx parse → preview ─────────────────────────────

/** ACSMS-MSG-007-001 — file-format error (screen-design.md §メッセージ情報). */
const FILE_FORMAT_ERROR_MSG =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';

/** Excel 拡張子チェック（.xlsx / .xls、大文字小文字無視）。 */
function isExcelFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

/** ファイル形式エラー時：トースト表示 + プレビュー/入力をリセット。 */
function rejectInvalidFile(): void {
  message.error(FILE_FORMAT_ERROR_MSG);
  parsedRows.value = [];
  fileName.value = '';
  importErrors.value = [];
  resetFileInput();
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  // A fresh file invalidates the previous run's error panel + result banner.
  importErrors.value = [];
  importResult.value = null;

  // [format-guard] 拡張子チェックを parse の前に実施する。
  // `accept=".xlsx,.xls"` は file picker のフィルタ（advisory）でしかなく、
  // ドラッグ&ドロップや Safari ではバイパス可能。さらに XLSX.read は
  // CSV/TXT/HTML 等も例外を投げずにパースしてしまうため、catch だけでは
  // Excel 以外のファイルを検出できない（報告バグ）。
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
    // [header-mapping] sheet_to_json uses the row-1 cell strings as keys.
    // Map them through HEADER_TO_PHYSICAL so unknown columns are dropped
    // and the spec's `buildImportRow()` snake_case payload also works
    // (test fixtures pass physical-name keys directly).
    parsedRows.value = rawRows.map((r) => {
      const out: Record<PhysicalColumn, unknown> = {} as Record<
        PhysicalColumn,
        unknown
      >;
      for (const [key, value] of Object.entries(r)) {
        // Accept either the JP header OR the physical name as a key.
        const physical =
          (HEADER_TO_PHYSICAL[key] as PhysicalColumn | undefined) ??
          ((PHYSICAL_COLUMNS as readonly string[]).includes(key)
            ? (key as PhysicalColumn)
            : undefined);
        if (physical) out[physical] = value;
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
    const blob = await downloadHanbaitenImportTemplate();
    // Trigger browser download. Skip in jsdom (test env) — `URL.createObjectURL`
    // may be undefined.
    if (
      globalThis.window !== undefined &&
      typeof globalThis.URL?.createObjectURL === 'function'
    ) {
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '販売店Excelデータ取込_テンプレート.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    }
  } catch {
    // Global axios interceptor already toasted — swallow silently here.
  }
}

// ─── submit ─────────────────────────────────────────────────────────

function onSubmit(): void {
  // 機能 7.1 — client-side guards before opening the confirm modal.
  if (!hasFile.value) {
    message.warning('Excelファイルを選択してください。');
    return;
  }
  if (parsedRows.value.length > MAX_ROWS) {
    message.error(`取込データ行数の上限（${MAX_ROWS}行）を超えています。`);
    return;
  }
  if (submitting.value) return;

  // ACSMS-MSG-007-002 — confirm dialog wording.
  Modal.confirm({
    title: '取込処理',
    content: '取込処理を開始します。よろしいですか？',
    okText: 'はい',
    cancelText: 'いいえ',
    onOk: async () => {
      await runImport();
    },
  });
}

async function runImport(): Promise<void> {
  submitting.value = true;
  // Clear any errors / counts from a previous attempt so the panel reflects
  // only the current run.
  importErrors.value = [];
  importResult.value = null;
  try {
    // selected_columns — every checked column. hanbaiten_code is always
    // present because the checkbox is `disabled checked`.
    const selectedCols = PHYSICAL_COLUMNS.filter((c) => selected[c]);
    // Each row sent to BE — keep only the values the BE accepts, in the
    // shape ImportHanbaitenRow expects. Pass-through every parsed key
    // that matches a physical column.
    const rows: ImportHanbaitenRow[] = parsedRows.value.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of PHYSICAL_COLUMNS) {
        if (r[col] !== undefined && r[col] !== '') {
          out[col] = r[col];
        }
      }
      // hanbaiten_code is always required even if cell was blank — let
      // the BE return IMPORT_VALIDATION_ERROR for empty codes (spec
      // covers row 2 / row 3 inline error display).
      if (out.hanbaiten_code === undefined) out.hanbaiten_code = '';
      return out as unknown as ImportHanbaitenRow;
    });

    const body = {
      import_mode: MODE_TO_BE[importModeFe.value],
      selected_columns: selectedCols,
      rows,
    };
    const res = await importHanbaitenExcel(body);
    // ACSMS-MSG-007-004 wording — flow through BE response.
    message.success(res.message || '取り込みました。');
    // 取込件数を緑のバナーで表示（dokusya と同様）。
    importResult.value = {
      created_count: res.data?.created_count ?? 0,
      updated_count: res.data?.updated_count ?? 0,
      skipped_count: res.data?.skipped_count ?? 0,
      total_rows: res.data?.total_rows ?? 0,
    };
    // 機能 7.4 — reset state for next upload.
    parsedRows.value = [];
    fileName.value = '';
    importErrors.value = [];
    resetFileInput();
  } catch (err) {
    const data = (
      err as {
        response?: {
          data?: {
            error_code?: string;
            message?: string;
            errors?: ImportError[];
          };
        };
      }
    )?.response?.data;
    const code = data?.error_code;
    const detail = Array.isArray(data?.errors) ? data.errors : [];

    if (
      (code === 'VALIDATION_ERROR' || code === 'IMPORT_VALIDATION_ERROR') &&
      detail.length > 0
    ) {
      // Per-row / per-field detail rendered in a persistent panel below the
      // form — NOT crammed into one toast (antd collapses '\n', so a
      // multi-row blob read as a single unscrollable line). The global
      // interceptor stays silent for both codes (VALIDATION_ERROR is meant
      // for useApiForm field-mapping, which this non-form screen doesn't
      // use; IMPORT_VALIDATION_ERROR is in VIEW_HANDLED_CODES) so the view
      // owns the display. A short summary toast points the user to the panel.
      importErrors.value = detail;
      message.error(`取込に失敗しました。${detail.length}件のエラーがあります。`);
    } else if (code === 'VALIDATION_ERROR') {
      // VALIDATION_ERROR without an errors[] array — interceptor stayed
      // silent, so fall back to the body message.
      message.error(data?.message || '入力値が不正です。');
    }
    // Every other code (FILE_FORMAT_ERROR / ROW_LIMIT_EXCEEDED /
    // CONFLICT / DATA_SCOPE_VIOLATION / INTERNAL_SERVER_ERROR) is already
    // toasted by the global interceptor — do not re-toast here.
  } finally {
    submitting.value = false;
  }
}

/** Template ref on the native file input. `resetFileInput()` clears its
 * value in three cases:
 *  - after a successful import / parse error, so the displayed filename
 *    matches the parsed state (otherwise the input keeps the old name while
 *    `parsedRows` is empty → misleading "Excelファイルを選択してください。");
 *  - on the input's @click, BEFORE the OS picker opens, so re-selecting the
 *    SAME filename (after editing the Excel) still fires `change` and
 *    re-parses — a browser suppresses `change` when the value is unchanged. */
const fileInputEl = ref<HTMLInputElement | null>(null);

function resetFileInput(): void {
  if (fileInputEl.value) fileInputEl.value.value = '';
}

function onColumnToggle(col: PhysicalColumn, el: HTMLInputElement): void {
  // [locked-column-veto-handler]
  // Defence-in-depth: in real browsers `disabled` blocks `change`
  // from firing, but environments without the disabled-event guard
  // (e.g. a11y tooling, vitest setValue) still emit it. If the change
  // event reaches us for a locked column, snap the DOM back to checked
  // and short-circuit — never let the underlying boolean flip.
  if (isLocked(col)) {
    el.checked = true;
    selected[col] = true;
    return;
  }
  selected[col] = el.checked;
}

// Helper: render preview cell value (booleans → ✓/-, null → blank).
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
              class="block text-sm font-semibold text-text-main mb-1.5"
              id="import-mode-label"
            >
              取込モード
            </span>
            <!-- [import-mode-radio] Customer 2026-05-27 — switched
                 from a native dropdown to inline radios for one-click
                 mode changes. Each radio carries a per-value test
                 hook (see IMPORT_MODE_OPTIONS) so vitest can target a
                 specific option without setValue on a parent select. -->
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
            class="flex flex-col items-start md:items-end justify-end h-full md:pt-6"
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
                v-if="selectAllDisabled"
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
                :disabled="selectAllDisabled"
                class="w-3.5 h-3.5 rounded border-border-strong accent-primary focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                class="flex items-center gap-3 px-3 py-2 border border-border rounded cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <!-- [locked-column-veto]
                     `:disabled` alone is not enough: jsdom (and some a11y
                     overrides / vitest setValue) still fire `change` on a
                     disabled input and toggle `.checked`. Bind `:checked` +
                     custom `@change` so locked columns ignore uncheck
                     attempts at the JS layer too. Which columns are locked
                     depends on the mode (see REQUIRED_BY_MODE). -->
                <input
                  type="checkbox"
                  name="col"
                  :value="col"
                  :checked="selected[col]"
                  :disabled="isLocked(col)"
                  class="w-4 h-4 rounded border-border-strong accent-primary focus:ring-primary/20 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  @change="(e) => onColumnToggle(col, e.target as HTMLInputElement)"
                />
                <span class="text-sm text-text-main">{{ JP_HEADERS[col] }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div
          v-if="previewVisible"
          data-test="preview-section"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-text-main">
              <span class="text-primary">◆</span>
              取込データプレビュー
              <span class="text-xs font-normal text-text-secondary ml-2">
                {{ parsedRows.length }}件
              </span>
            </p>
          </div>
          <div
            class="overflow-x-auto border border-border rounded"
          >
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
                  v-for="(row, rowIdx) in parsedRows"
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
      </form>

      <!-- Import errors — persistent, scrollable panel (per row/field) -->
      <div
        v-if="importErrors.length > 0"
        data-test="import-error-panel"
        class="mt-4 border border-error rounded overflow-hidden"
      >
        <div class="px-4 py-2.5 bg-error-subtle flex items-center gap-2">
          <span class="material-icons text-error text-[18px]">error_outline</span>
          <span class="text-sm font-semibold text-error">
            取込エラー（{{ importErrors.length }}件）
          </span>
        </div>
        <div class="max-h-72 overflow-y-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-surface-card-subtle text-left">
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border w-20"
                >
                  行
                </th>
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border w-48"
                >
                  項目
                </th>
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border"
                >
                  メッセージ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(e, i) in importErrors"
                :key="i"
                class="border-b border-border"
              >
                <td class="px-4 py-2 text-text-main whitespace-nowrap">
                  {{ e.row != null ? `${e.row}行目` : '—' }}
                </td>
                <td class="px-4 py-2 text-text-main">
                  {{ errorFieldLabel(e) || '—' }}
                </td>
                <td class="px-4 py-2 text-error">{{ e.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Import result counts (緑バナー) — dokusya と同じ表示 -->
      <div
        v-if="importResult"
        data-test="import-result"
        class="mt-4 border border-success/40 bg-success-subtle rounded p-3 text-sm text-text-main"
      >
        取込件数：登録 {{ importResult.created_count }}件 / 更新
        {{ importResult.updated_count }}件 / スキップ
        {{ importResult.skipped_count }}件（合計 {{ importResult.total_rows }}件）
      </div>

      <div class="flex gap-3 pt-4">
        <button
          data-test="import-submit-btn"
          type="button"
          :disabled="!canImport || submitting"
          class="px-10 py-2 bg-primary hover:bg-primary-hover text-white rounded font-medium transition-colors shadow-ant-card text-sm disabled:bg-text-disabled disabled:cursor-not-allowed disabled:hover:bg-text-disabled ant-btn-disabled"
          :class="{ 'ant-btn-disabled': !canImport || submitting }"
          @click="onSubmit"
        >
          取込開始
        </button>
      </div>
    </section>
  </div>
</template>
