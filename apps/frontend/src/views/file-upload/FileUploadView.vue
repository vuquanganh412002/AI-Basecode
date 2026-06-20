<script setup lang="ts">
// ACSMS-SCR-023 — ファイルアップロード画面.
// Mirrors docs/design/ACSMS-SCR-023/screen-design.md (機能定義 1.x〜8.x) +
// docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md (API-023-001〜004).

import { computed, onMounted, ref, watch } from 'vue';
import {
  Modal,
  message,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'ant-design-vue';

import BaseDataTable from '@/components/common/BaseDataTable.vue';
import {
  formatDate as formatDateTokyo,
  formatDateTime as formatDateTimeTokyo,
} from '@/utils/formatters';
import { confirmDelete } from '@/utils/confirm';
import { useCodesStore } from '@/stores/codes.store';
import { useEntityDropdown } from '@/composables/useEntityDropdown';

const codes = useCodesStore();
import {
  deleteFile,
  listFiles,
  uploadFiles,
  type FileUploadListItem,
} from '@/api/file-upload/file-upload';
import {
  getJaDropdown,
  type JaDropdownItem,
  type JaDropdownQuery,
} from '@/api/ja/ja';
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';

// ──────────────────── Constants ────────────────────
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB per screen-design 機能定義 4.2

// [allowed-extensions] Customer review 2026-05 — closed whitelist of
// 12 extensions. Keep in sync with BE `ALLOWED_EXTENSIONS` in
// apps/backend/src/modules/file-upload/file-upload.service.ts.
// FE side: drives the <input accept=...> (OS file picker filter) +
// the addFile() rejection toast. BE is the authoritative gate (FE
// is UX hint only — a power user could bypass `accept=`).
const ALLOWED_EXTENSIONS = [
  '.xlsx', '.xls',
  '.pdf',
  '.jpg', '.jpeg', '.png',
  '.doc', '.docx',
  '.pptx', '.ppt',
  '.csv',
  '.txt',
  '.zip',
];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.join(',');

// ──────────────────── Form state ────────────────────
interface TargetJa {
  ja_id: number;
  ja_code: string;
  ja_name: string;
}

const todofukenOptions = ref<TodofukenItem[]>([]);
const selectedTodofukenCode = ref<string | null>(null);
/**
 * アップロード対象 JA 一覧（= マルチセレクトで選んだ JA、送信時に ja_ids[]
 * へ展開）。「対象JA」は a-select(mode=multiple) のタグ＝この配列。下の一覧も
 * 同じ配列を表示する（単一の真実）。
 */
const targetJas = ref<TargetJa[]>([]);

// ── 対象JA マルチセレクト（検索＋ページング＋都道府県カスケードは
// useEntityDropdown を再利用。selected は単一ピン用なので multiple では未使用 → null）。
const {
  options: jaOptions,
  loading: jaLoading,
  onSearch: onJaSearch,
  onPopupScroll: onJaPopupScroll,
  onDropdownVisibleChange: onJaDropdownVisibleChange,
} = useEntityDropdown<JaDropdownItem, JaDropdownQuery>({
  fetcher: getJaDropdown,
  idField: 'ja_id',
  selected: ref(null),
  perPage: ref(50),
  buildExtraParams: () =>
    selectedTodofukenCode.value
      ? { todofuken_code: selectedTodofukenCode.value }
      : {},
  resetTriggers: [selectedTodofukenCode],
  resetMode: 'soft',
});

/** ドロップダウンのオプション（現在の検索結果ページ）。 */
const jaSelectOptions = computed(() =>
  jaOptions.value.map((o) => ({
    value: o.ja_id,
    label: `${o.ja_code} ${o.ja_name}`,
  })),
);

/**
 * ドロップダウン box の「一時選択」（label-in-value）。box は純粋なピッカー
 * として扱い、選択は即 targetJas（下の一覧）へ移してタグは保持しない。
 * これで「box のタグ」と「一覧の行」で同じ JA が二重表示されない。
 */
const jaPickerValue = ref<Array<{ value: number; label: string }>>([]);

/** 下の一覧に既に入っている JA の id 集合。ドロップダウンで太字＋✓ 表示に使う。 */
const selectedJaIds = computed(() => new Set(targetJas.value.map((j) => j.ja_id)));

/**
 * 機能定義 2.x — box で選んだ JA をアップロード対象一覧へ追加する。
 * 既に一覧にある JA は重複追加しない（チェック重複防止）。追加後は box の
 * タグをクリアし、続けて別の JA を選べるようにする。
 */
function onJaChange(selected: Array<{ value: number; label: string }>): void {
  for (const sel of selected) {
    if (targetJas.value.some((j) => j.ja_id === sel.value)) continue; // 既に一覧
    const opt = jaOptions.value.find((o) => o.ja_id === sel.value);
    targetJas.value.push(
      opt
        ? { ja_id: opt.ja_id, ja_code: opt.ja_code, ja_name: opt.ja_name }
        : { ja_id: sel.value, ja_code: '', ja_name: sel.label },
    );
  }
  jaPickerValue.value = [];
}

// 都道府県を切り替えたら box の選択だけクリア（新しい都道府県の JA を選び直す）。
// 蓄積済みの targetJas（下のアップロード対象一覧）は保持する。
watch(selectedTodofukenCode, () => {
  jaPickerValue.value = [];
});

const selectedFiles = ref<File[]>([]);
const scheduledDeleteDate = ref<string | null>(null);
// 削除予定日 の必須エラーはトーストではなく項目直下にインライン表示する。
const dateError = ref<string | null>(null);
// 値が選択されたらエラーを消す。
watch(scheduledDeleteDate, (v) => {
  if (v) dateError.value = null;
});

const uploading = ref(false);

// ──────────────────── History table state ────────────────────
const rows = ref<FileUploadListItem[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const perPage = ref(20);

const historyColumns: TableColumnsType = [
  { title: 'ファイル名', dataIndex: 'file_name', key: 'file_name' },
  { title: 'JA', key: 'ja', width: 220 },
  { title: 'サイズ', key: 'file_size', width: 120 },
  { title: '通知ステータス', key: 'notification_status', width: 140 },
  // [notified-at] Stamp from worker when the row leaves 送信中 (2).
  // Sits next to 通知ステータス so an operator can see both
  // "what state" and "when it landed there" at a glance.
  { title: '通知日時', key: 'notified_at', width: 160 },
  { title: '削除予定日', key: 'scheduled_delete_date', width: 140 },
  { title: '削除日', key: 'deleted_at', width: 140 },
  { title: '操作', key: 'actions', width: 100, align: 'center' },
];

// ──────────────────── Initial fetch ────────────────────
async function fetchTodofukenOptions(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    todofukenOptions.value = resp.data;
  } catch {
    // [interceptor-handled] global axios interceptor toasted.
    todofukenOptions.value = [];
  }
}

async function fetchHistory(): Promise<void> {
  loading.value = true;
  try {
    const resp = await listFiles({
      page: page.value,
      per_page: perPage.value,
      sort_by: 'upload_datetime',
      sort_order: 'desc',
    });
    rows.value = resp.data;
    total.value = resp.meta.total;
  } catch {
    // [interceptor-handled] global axios interceptor toasts on 403/500.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchTodofukenOptions();
  void fetchHistory();
});

// 都道府県カスケードは useEntityDropdown の resetTriggers が JA オプションを
// 再読込する。選択済み targetJas は意図的に保持する（都道府県を変えても既選択
// は消さない）。

const todofukenName = computed(() => {
  const code = selectedTodofukenCode.value;
  if (!code) return '';
  return todofukenOptions.value.find((o) => o.todofuken_code === code)?.todofuken_name ?? '';
});

function removeJa(jaId: number): void {
  targetJas.value = targetJas.value.filter((j) => j.ja_id !== jaId);
  // box に現在表示中の同じ JA があればタグも外す。
  jaPickerValue.value = jaPickerValue.value.filter((s) => s.value !== jaId);
}

// ──────────────────── 機能定義 4.x — file selection ────────────────────
function isAllowedFileFormat(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx < 0) return false;
  return ALLOWED_EXTENSIONS.includes(lower.slice(dotIdx));
}

function addFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    // ACSMS-MSG-023-002
    message.error(`ファイルサイズが30MBを超えています。(${file.name})`);
    return;
  }
  // [format-gate] Customer review 2026-05 — closed whitelist. The OS
  // file picker's `accept=` already filters most picks, but drag&drop
  // bypasses that, and `accept=` is advisory on macOS Safari. Recheck
  // here so the rejection toast fires before we add to the staging
  // list (and matches the BE FileUploadFormatException copy).
  if (!isAllowedFileFormat(file.name)) {
    message.error(`許可されていないファイル形式です。(${file.name})`);
    return;
  }
  selectedFiles.value.push(file);
}

function onFilesPicked(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target.files) return;
  for (const file of Array.from(target.files)) {
    addFile(file);
  }
  // Reset input so the same file can be re-picked after removal.
  target.value = '';
}

function removeFile(index: number): void {
  selectedFiles.value.splice(index, 1);
}

// ──────────────────── 機能定義 6.x — upload submit ────────────────────
function onUploadClick(): void {
  // 機能定義 6.2 — required-field gate (ACSMS-MSG-023-001).
  let blocked = false;
  // 削除予定日 未入力 → 項目直下にインラインエラー（トーストは出さない）。
  if (!scheduledDeleteDate.value) {
    dateError.value = '必須項目です。';
    blocked = true;
  }
  // ファイル / 対象JA 未選択 → 従来どおりトースト。
  if (selectedFiles.value.length === 0 || targetJas.value.length === 0) {
    message.error('必須項目です。');
    blocked = true;
  }
  if (blocked) return;

  // 機能定義 6.3 — confirmation dialog (ACSMS-MSG-023-008).
  Modal.confirm({
    title: 'アップロード確認',
    content: 'このファイルをアップロードしますか？',
    okText: 'はい',
    cancelText: 'いいえ',
    async onOk() {
      await doUpload();
    },
  });
}

async function doUpload(): Promise<void> {
  uploading.value = true;
  try {
    await uploadFiles({
      ja_ids: targetJas.value.map((j) => j.ja_id),
      files: [...selectedFiles.value],
      scheduled_delete_date: scheduledDeleteDate.value ?? undefined,
    });
    // ACSMS-MSG-023-006 — direct literal (different from useNotify().uploaded())
    message.success('ファイルのアップロードが完了しました。');
    // 機能定義 6.6 — clear form, refetch history
    clearForm();
    void fetchHistory();
  } catch (err: unknown) {
    // 機能定義 6.6 — API error case → ACSMS-MSG-023-005.
    // Interceptor handles 401/403; 500-class with no specific code lands here.
    const e = err as { response?: { data?: { error_code?: string } } };
    if (e?.response?.data?.error_code !== 'UNAUTHORIZED' && e?.response?.data?.error_code !== 'FORBIDDEN') {
      message.error('アップロードに失敗しました。しばらくしてから再度お試しください。');
    }
  } finally {
    uploading.value = false;
  }
}

function clearForm(): void {
  selectedFiles.value = [];
  targetJas.value = [];
  scheduledDeleteDate.value = null;
  dateError.value = null;
}

// ──────────────────── 機能定義 7.x — clear button ────────────────────
function onClearClick(): void {
  if (selectedFiles.value.length === 0 && targetJas.value.length === 0) {
    clearForm();
    return;
  }
  // ACSMS-MSG-023-003
  Modal.confirm({
    title: 'クリア確認',
    content: '全てのJAとファイルを削除します。よろしいでしょうか。',
    okText: 'はい',
    cancelText: 'いいえ',
    onOk() {
      clearForm();
    },
  });
}

// ──────────────────── 機能定義 8.x — delete uploaded file ──────────
function isDeletable(row: FileUploadListItem): boolean {
  // 画面項目定義 No.18 — disable when deleted_at IS NOT NULL
  return row.deleted_at == null;
}

function askDelete(row: FileUploadListItem): void {
  if (!isDeletable(row)) return;
  confirmDelete(`このファイルを削除しますか？（${row.file_name}）`, async () => {
    try {
      await deleteFile(row.file_upload_id);
      message.success('削除しました。');
      await fetchHistory();
    } catch {
      // [interceptor-handled] 401/403/500 toasted by global interceptor.
    }
  });
}

// ──────────────────── Formatting helpers ────────────────────
function formatBytes(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * JA cell — `JAコード JA名`. Global uploads (ja_id NULL → ja_code/ja_name
 * null) show 全JA向け.
 */
function formatJa(row: FileUploadListItem): string {
  const parts = [row.ja_code, row.ja_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '全JA向け';
}

// Display via the shared Asia/Tokyo-pinned formatters so dates render in
// JST regardless of the viewer's browser timezone (a previous browser-local
// formatter showed 削除予定日 one day early for +07:00 users). Keep the
// '-' placeholder for null per screen-design.
function formatDate(iso: string | null | undefined): string {
  return iso ? formatDateTokyo(iso) : '-';
}

function formatDateTime(iso: string | null | undefined): string {
  return iso ? formatDateTimeTokyo(iso) : '-';
}

function notificationStatusLabel(status: number): string {
  // m_code-driven; customer can rename labels via reload without redeploy.
  return codes.label('NOTIFICATION_STATUS', status) || String(status);
}

function notificationBadgeClass(status: number): string {
  switch (status) {
    case 3:
      return 'bg-success-subtle text-success';
    case 4:
      return 'bg-error-subtle text-error';
    case 2:
      return 'bg-info-subtle text-info';
    default:
      return 'bg-warning-subtle text-warning';
  }
}

function onPageChange(pagination: TablePaginationConfig): void {
  if (pagination.current) page.value = pagination.current;
  if (pagination.pageSize) perPage.value = pagination.pageSize;
  void fetchHistory();
}

// [spec-internals] FileUploadView.spec.ts drives vm directly — defineExpose
// gives the spec hands-on access without depending on antd-internal events.
defineExpose({
  // form state
  selectedTodofukenCode,
  targetJas,
  jaPickerValue,
  selectedJaIds,
  selectedFiles,
  scheduledDeleteDate,
  // actions
  onJaChange,
  removeJa,
  addFile,
  removeFile,
  askDelete,
  isDeletable,
  // history
  fetchHistory,
});
</script>

<template>
  <div class="space-y-6">
    <!-- ───── 対象JA選択エリア ─────────────────────────────── -->
    <section class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <h3 class="font-bold text-text-main text-base mb-4">対象JA選択</h3>
      <!-- 都道府県 / 都道府県名 が上段で半々（各 1/2）、対象JA は下段に独立して
           全幅（タグが複数行でも横いっぱい使える）。 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
        <label for="file-upload-todofuken" class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">都道府県</span>
          <a-select
            id="file-upload-todofuken"
            v-model:value="selectedTodofukenCode"
            placeholder="都道府県を選択"
            allow-clear
            show-search
            :filter-option="(input: string, option: { children?: unknown }) =>
              String(option?.children ?? '').includes(input)"
            class="flex-1"
          >
            <a-select-option
              v-for="opt in todofukenOptions"
              :key="opt.todofuken_code"
              :value="opt.todofuken_code"
            >
              {{ opt.todofuken_code }}: {{ opt.todofuken_name }}
            </a-select-option>
          </a-select>
        </label>
        <label for="file-upload-todofuken-name" class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">都道府県名</span>
          <a-input id="file-upload-todofuken-name" :value="todofukenName" disabled class="flex-1" />
        </label>
        <label for="file-upload-ja" class="md:col-span-2 flex items-start gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap pt-1">対象JA</span>
          <!-- マルチセレクト：JAコード・JA名で検索（BE側 ILIKE・50件/ページ・
               無限スクロール）→ 選んだ JA は下の一覧へ即反映（box はタグ非保持）。
               既に一覧にある JA はドロップダウン側で太字＋✓ で区別する。-->
          <a-select
            id="file-upload-ja"
            mode="multiple"
            label-in-value
            :value="jaPickerValue"
            :options="jaSelectOptions"
            :loading="jaLoading"
            show-search
            :filter-option="false"
            option-filter-prop="label"
            placeholder="JAコード・JA名で検索して選択（複数可）"
            class="flex-1"
            @change="onJaChange"
            @search="onJaSearch"
            @popup-scroll="onJaPopupScroll"
            @dropdown-visible-change="onJaDropdownVisibleChange"
          >
            <template #option="{ value, label }">
              <span
                :class="
                  selectedJaIds.has(value as number)
                    ? 'font-bold text-primary'
                    : ''
                "
              >
                <span v-if="selectedJaIds.has(value as number)" class="mr-1">✓</span>{{ label }}
              </span>
            </template>
          </a-select>
        </label>
      </div>

      <div v-if="targetJas.length > 0" class="border border-border rounded-ant overflow-hidden">
        <ul class="m-0 pl-0 list-none divide-y divide-border">
          <li
            v-for="ja in targetJas"
            :key="ja.ja_id"
            class="flex items-center justify-between px-4 py-2 bg-surface-card hover:bg-surface-hover"
          >
            <span class="text-sm text-text-main truncate min-w-0 flex-1">{{ ja.ja_code }} - {{ ja.ja_name }}</span>
            <a-button
              type="link"
              danger
              size="small"
              class="flex-shrink-0"
              :aria-label="`${ja.ja_name}を削除`"
              @click="removeJa(ja.ja_id)"
            >
              削除
            </a-button>
          </li>
        </ul>
      </div>
    </section>

    <!-- ───── ファイル選択エリア ───────────────────────────── -->
    <section class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <h3 class="font-bold text-text-main text-base mb-4">ファイル選択</h3>

      <div class="mb-4 max-w-md">
        <label
          for="file-upload-scheduled-delete-date"
          class="flex items-center gap-2 text-sm font-medium text-text-main"
        >
          <span class="whitespace-nowrap">削除予定日</span>
          <span class="text-error ml-1">*</span>
          <a-date-picker
            id="file-upload-scheduled-delete-date"
            v-model:value="scheduledDeleteDate"
            format="YYYY/MM/DD"
            value-format="YYYY/MM/DD"
            placeholder="yyyy/mm/dd"
            :status="dateError ? 'error' : ''"
            :disabled-date="(current: { valueOf: () => number } | null) =>
              !!current && current.valueOf() < Date.now() - 24 * 60 * 60 * 1000"
            class="flex-1"
          />
        </label>
        <p
          v-if="dateError"
          data-test="scheduled-delete-date-error"
          class="text-error text-sm mt-1"
        >
          {{ dateError }}
        </p>
      </div>

      <label
        class="block border-2 border-dashed border-border rounded-ant p-8 text-center text-text-description cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <input
          type="file"
          multiple
          :accept="ACCEPT_ATTR"
          class="hidden"
          @change="onFilesPicked"
        />
        <span class="material-icons text-4xl text-text-secondary block mb-2">upload_file</span>
        <p class="text-sm">ここにファイルをドラッグ&amp;ドロップするか</p>
        <p class="text-sm">クリックしてファイルを選択してください</p>
      </label>

      <ul v-if="selectedFiles.length > 0" class="m-0 pl-0 list-none mt-4 border border-border rounded-ant divide-y divide-border">
        <li
          v-for="(file, idx) in selectedFiles"
          :key="`${file.name}-${idx}`"
          class="flex items-center justify-between px-4 py-2 bg-surface-card"
        >
          <span class="text-sm text-text-main truncate min-w-0 flex-1">
            {{ file.name }} ({{ formatBytes(file.size) }})
          </span>
          <a-button
            type="link"
            danger
            size="small"
            class="flex-shrink-0"
            :aria-label="`${file.name}を削除`"
            @click="removeFile(idx)"
          >
            削除
          </a-button>
        </li>
      </ul>

      <div class="flex gap-3 mt-6">
        <a-button type="primary" :loading="uploading" @click="onUploadClick">
          <template #icon><span class="material-icons text-sm mr-1">upload</span></template>
          アップロード実行
        </a-button>
        <a-button @click="onClearClick">クリア</a-button>
      </div>
    </section>

    <!-- ───── アップロードされたファイルリスト ──────────────── -->
    <BaseDataTable
      title="アップロードされたファイルリスト"
      :columns="historyColumns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="page"
      :per-page="perPage"
      :total="total"
      row-key="file_upload_id"
      @change="onPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ja'">
          {{ formatJa(record as FileUploadListItem) }}
        </template>
        <template v-else-if="column.key === 'file_size'">
          {{ formatBytes((record as FileUploadListItem).file_size) }}
        </template>
        <template v-else-if="column.key === 'notification_status'">
          <span
            class="px-2 py-1 rounded text-xs font-bold"
            :class="notificationBadgeClass((record as FileUploadListItem).notification_status)"
          >
            {{ notificationStatusLabel((record as FileUploadListItem).notification_status) }}
          </span>
        </template>
        <template v-else-if="column.key === 'notified_at'">
          {{ formatDateTime((record as FileUploadListItem).notified_at) }}
        </template>
        <template v-else-if="column.key === 'scheduled_delete_date'">
          {{ formatDate((record as FileUploadListItem).scheduled_delete_date) }}
        </template>
        <template v-else-if="column.key === 'deleted_at'">
          {{ formatDate((record as FileUploadListItem).deleted_at) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            type="link"
            danger
            size="small"
            :disabled="!isDeletable(record as FileUploadListItem)"
            @click="askDelete(record as FileUploadListItem)"
          >
            削除
          </a-button>
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
