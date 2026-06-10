<script setup lang="ts">
// ACSMS-SCR-022 — ファイルダウンロード画面.
// Mirrors docs/design/ACSMS-SCR-022/screen-design.md (機能定義 1.x〜8.x) +
// docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md (API-022-001/002/003).

import { computed, onMounted, ref } from 'vue';
import { message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { formatDateTime } from '@/utils/formatters';
import {
  listFiles,
  getFilePreview,
  downloadFile,
  type ListFilesQuery,
  type FileUploadListItem,
} from '@/api/file-upload/file-upload';
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';

interface FileFilters {
  file_name: string;
  todofuken_code: string;
}

const {
  state, loading, total, onChange, applyFilters, resetFilters, filtersChangedSinceApplied, isPristine,
} =
  useTableQuery<FileFilters>({
    defaultFilters: { file_name: '', todofuken_code: '' },
    defaultSortBy: 'upload_datetime',
    defaultSortOrder: 'desc',
  });

const rows = ref<FileUploadListItem[]>([]);
const todofukenOptions = ref<TodofukenItem[]>([]);

/** Selected file_upload_id list. Bound to the table's row-selection. */
const selectedIds = ref<number[]>([]);

/** Preview modal state. `previewUrl` is the S3 presigned URL the iframe loads. */
const previewOpen = ref(false);
const previewUrl = ref('');
const previewFileName = ref('');
const previewContentType = ref('');

// [row-selection] Bind a stable computed config object so the inline
// template doesn't try to reassign `selectedIds` (a ref — `selectedIds
// = ...` would shadow the binding, not mutate the underlying value).
const rowSelectionConfig = computed(() => ({
  selectedRowKeys: selectedIds.value,
  onChange: (keys: (string | number)[]) => {
    selectedIds.value = keys.map(Number);
  },
}));

// [previewable-types] Inline preview only supports formats the browser
// can render natively: images (<img>) and PDF (<iframe>). Everything
// else (csv / zip / xlsx / pptx / txt / docx …) has no inline viewer,
// so the プレビュー button is disabled and the filename is shown as
// plain text — those files are downloaded via ダウンロード実行 instead.
const PREVIEWABLE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg|pdf)$/i;
function isPreviewable(fileName: string): boolean {
  return PREVIEWABLE_EXTENSIONS.test(fileName);
}

// [preview-single-only] The preview modal renders one file at a time
// (no carousel UX). Enabled only when exactly one row is checked AND
// that file is a previewable type (image / PDF). The filename-link
// path mirrors the same gate (non-previewable names are plain text).
const canPreviewSelected = computed(() => {
  if (selectedIds.value.length !== 1) return false;
  const row = rows.value.find((r) => r.file_upload_id === selectedIds.value[0]);
  return !!row && isPreviewable(row.file_name);
});

// [image-preview] Render <img> instead of <iframe> when the file is
// an image. Inspect BOTH the content_type returned by the preview API
// AND the filename extension — the BE's content-type mapper may not
// cover every image format the user can upload (.jpg/.jpeg/.png/.gif/
// .webp/.bmp/.svg). Falling back to filename ensures images uploaded
// with a generic application/octet-stream still preview correctly.
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const isImagePreview = computed(() => {
  if (previewContentType.value.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.test(previewFileName.value);
});

const columns: TableColumnsType = [
  {
    title: 'アップロード日時',
    dataIndex: 'upload_datetime',
    key: 'upload_datetime',
    sorter: true,
    width: 200,
  },
  {
    title: '作成者',
    dataIndex: 'created_by_name',
    key: 'created_by_name',
    sorter: true,
    width: 180,
  },
  {
    title: 'ファイル名',
    dataIndex: 'file_name',
    key: 'file_name',
    sorter: true,
  },
  {
    title: 'サイズ',
    key: 'file_size',
    width: 120,
  },
];

function buildQuery(): ListFilesQuery {
  return {
    file_name: state.filters.file_name || undefined,
    todofuken_code: state.filters.todofuken_code || undefined,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as ListFilesQuery['sort_by'],
    sort_order: state.sort_order,
  };
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listFiles(buildQuery());
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // [interceptor-handled] Global axios interceptor already toasted
    // FORBIDDEN / 500 — view only clears local state so onMounted's
    // fire-and-forget invocation doesn't surface as an unhandled
    // rejection. Per .claude/rules/vue.md §List view rule #5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchTodofukenOptions(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    todofukenOptions.value = resp.data;
  } catch {
    todofukenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void fetchTodofukenOptions();
});

function onSearch(): void {
  // [trim-filters] Mutate state.filters in place so the input visibly
  // reflects the trimmed value when the user hits 検索. Guards against
  // paste artifacts / IME-confirmed spaces widening the ILIKE pattern.
  // Use `?.trim() ?? ''`: `<a-select allow-clear>` (都道府県) sets the
  // v-model to `undefined` when the × is clicked, so a bare `.trim()`
  // throws TypeError → the generic エラーが発生しました。 toast (reported bug).
  state.filters.file_name = state.filters.file_name?.trim() ?? '';
  state.filters.todofuken_code = state.filters.todofuken_code?.trim() ?? '';
  // Only fetch when the search would change what's on screen — skip when the
  // form matches the filters already applied to the displayed list (fresh
  // empty form, or re-pressing 検索 with no change). After clearing inputs by
  // hand this still fires once to restore the full list. 検索クリア resets.
  if (!filtersChangedSinceApplied()) return;
  applyFilters({ ...state.filters });
  void fetchList();
}

function onClear(): void {
  // 検索クリア is a no-op on a pristine screen — form already at defaults AND
  // the list already showing the default set. Skip the redundant fetch.
  if (isPristine()) return;
  resetFilters();
  void fetchList();
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

/** Helper — maps the 404 NOT_FOUND error to ACSMS-MSG-022-003. */
function handleFileError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { error_code?: string } } };
  if (e?.response?.status === 404 || e?.response?.data?.error_code === 'NOT_FOUND') {
    message.error('ファイルが存在していません。');
    return true;
  }
  return false;
}

// ──────────────── 機能定義 4.x — プレビュー ────────────────
async function openPreviewById(id: number): Promise<void> {
  try {
    const resp = await getFilePreview(id);
    previewUrl.value = resp.data.preview_url;
    previewFileName.value = resp.data.file_name;
    previewContentType.value = resp.data.content_type;
    previewOpen.value = true;
  } catch (err: unknown) {
    if (handleFileError(err)) return;
    // [interceptor-handled] 401 / 403 / 500 toasted by global axios
    // interceptor — view must NOT re-toast.
  }
}

async function onPreview(): Promise<void> {
  if (selectedIds.value.length === 0) {
    message.warning('ファイルを選択してください。');
    return;
  }
  // Preview targets the FIRST selected file. screen-design.md doesn't
  // describe multi-preview UX (no tabs / carousel), so single-file is
  // the safe default.
  await openPreviewById(selectedIds.value[0]);
}

/** Direct preview from a filename click — bypasses row selection.
 *  Only previewable types reach here (the template renders other
 *  filenames as plain text), but guard defensively. */
async function onPreviewRow(row: FileUploadListItem): Promise<void> {
  if (!isPreviewable(row.file_name)) return;
  await openPreviewById(row.file_upload_id);
}

// ──────────────── 機能定義 5.x — ダウンロード実行 ────────────────
function downloadBlob(blob: Blob, fileName: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}

async function onDownload(): Promise<void> {
  if (selectedIds.value.length === 0) {
    message.warning('ファイルを選択してください。');
    return;
  }
  let anySuccess = false;
  let notFoundShown = false;
  for (const id of selectedIds.value) {
    const row = rows.value.find((r) => r.file_upload_id === id);
    const fallbackName = row?.file_name ?? `file_${id}`;
    try {
      const blob = await downloadFile(id);
      downloadBlob(blob, fallbackName);
      anySuccess = true;
    } catch (err: unknown) {
      // Show MSG-022-003 only once even if multiple files miss.
      if (!notFoundShown && handleFileError(err)) {
        notFoundShown = true;
        continue;
      }
      // [interceptor-handled] Other errors (401/403/500) handled by
      // the global axios interceptor.
    }
  }
  if (anySuccess) {
    // ACSMS-MSG-022-005 — verb-specific copy ("完了" not "開始"); use
    // raw message.success with the literal (not notify.downloaded()).
    message.success('ダウンロードが完了しました。');
  }
}

// ──────────────── 機能定義 6.x — クリア（下） ────────────────
function clearSelection(): void {
  selectedIds.value = [];
  previewOpen.value = false;
  previewUrl.value = '';
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// [spec-internals] Spec drives pagination + selection + preview via
// vm.{state, fetchList, selectedIds, previewOpen, previewUrl, clearSelection}.
defineExpose({
  state,
  fetchList,
  selectedIds,
  previewOpen,
  previewUrl,
  clearSelection,
});
</script>

<template>
  <div class="space-y-6">
    <!-- 検索条件エリア — 機能定義 1.3 / 2.x. 4-col grid → 2 search fields take
         the left half of the card. -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="file-download-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">ファイル名</span>
        <a-input
          id="file-download-filter-1"
          v-model:value="state.filters.file_name"
          placeholder="ファイル名"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="file-download-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <a-select
          id="file-download-filter-2"
          v-model:value="state.filters.todofuken_code"
          placeholder="すべて"
          allow-clear
          show-search
          :filter-option="
            (input: string, option: { children?: unknown }) =>
              String(option?.children ?? '').includes(input)
          "
          class="flex-1"
        >
          <a-select-option
            v-for="opt in todofukenOptions"
            :key="opt.todofuken_code"
            :value="opt.todofuken_code"
          >
            {{ opt.todofuken_name }}
          </a-select-option>
        </a-select>
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-022-001 — 0-row search result. Rendered outside the
         table (BaseDataTable's dynamic slot loop can't forward
         a-table's emptyText). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="file-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="ファイル一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="file_upload_id"
      :row-selection="rowSelectionConfig"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button :disabled="!canPreviewSelected" @click="onPreview">
          <template #icon>
            <span class="material-icons text-sm mr-1">visibility</span>
          </template>
          プレビュー
        </a-button>
        <a-button
          type="primary"
          :disabled="selectedIds.length === 0"
          @click="onDownload"
        >
          <template #icon>
            <span class="material-icons text-sm mr-1">download</span>
          </template>
          ダウンロード実行
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'upload_datetime'">
          <!-- BE returns an ISO timestamp with `+09:00` offset
               (TIMESTAMPTZ); `formatDateTime` (formatters.ts) pins
               rendering to Asia/Tokyo via dayjs.tz.setDefault so the
               raw `2026-05-25T04:36:29.203Z` becomes the JST wall
               clock `2026/05/25 13:36`. -->
          {{ formatDateTime((record as FileUploadListItem).upload_datetime) }}
        </template>
        <template v-else-if="column.key === 'file_name'">
          <!-- [filename-as-link] Per index.html mockup the file_name
               is a clickable blue link that opens the preview modal.
               Reuses onPreviewRow so the row's checkbox doesn't need
               to be ticked first. Only previewable types (image / PDF)
               are rendered as links; others are plain text since there
               is no inline viewer for them. -->
          <a
            v-if="isPreviewable((record as FileUploadListItem).file_name)"
            href="#"
            class="text-primary hover:underline cursor-pointer"
            @click.prevent="onPreviewRow(record as FileUploadListItem)"
          >
            {{ (record as FileUploadListItem).file_name }}
          </a>
          <span v-else class="text-text-main">
            {{ (record as FileUploadListItem).file_name }}
          </span>
        </template>
        <template v-else-if="column.key === 'file_size'">
          {{ formatBytes((record as FileUploadListItem).file_size) }}
        </template>
      </template>
    </BaseDataTable>

    <!-- プレビューモーダル — render <img> for image MIME types so the
         browser displays them natively (iframe with image src tries to
         render as HTML and just shows the binary). PDFs and CSVs work
         via iframe + the S3-provided Content-Type. -->
    <a-modal
      v-model:open="previewOpen"
      :title="previewFileName || 'プレビュー'"
      :footer="null"
      :width="900"
      destroy-on-close
    >
      <template v-if="previewUrl">
        <img
          v-if="isImagePreview"
          :src="previewUrl"
          :alt="previewFileName"
          class="w-full max-h-[70vh] object-contain bg-bg-layout"
        />
        <iframe
          v-else
          :src="previewUrl"
          class="w-full h-[70vh] border-0"
          :title="previewFileName"
        />
      </template>
    </a-modal>
  </div>
</template>
