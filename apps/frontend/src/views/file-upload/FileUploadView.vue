<script setup lang="ts">
// ACSMS-SCR-023 — ファイルアップロード画面。
// screen-design.md（機能定義 1.x〜8.x）+ API-023-001〜004 に準拠。

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
import { isPastDayTokyo } from '@/utils/datetime';
import { useCodesStore } from '@/stores/codes.store';
import { useEntityDropdown } from '@/composables/useEntityDropdown';

const codes = useCodesStore();
import {
  deleteFile,
  listFiles,
  uploadFiles,
  getFilePreview,
  downloadFile,
  downloadFilesAsZip,
  type FileUploadListItem,
} from '@/api/file-upload/file-upload';
import { useFileDelivery } from '@/composables/useFileDelivery';
import FilePreviewModal from '@/components/common/FilePreviewModal.vue';
import {
  getJaDropdown,
  type JaDropdownItem,
  type JaDropdownQuery,
} from '@/api/ja/ja';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';
import { useTodofuken } from '@/composables/useTodofuken';

// ──────────────────── 定数 ────────────────────
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB（機能定義 4.2）

// [allowed-extensions] 顧客レビュー 2026-05 — 12拡張子のクローズドホワイトリスト。
// BE file-upload.service.ts の ALLOWED_EXTENSIONS と同期させること。
// FE: <input accept=...>（OS ファイルピッカー）+ addFile() 拒否トースト。
// BE が正規のゲート（FE は UX ヒントのみ・accept= はバイパス可能）。
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

// ──────────────────── フォーム状態 ────────────────────
interface TargetJa {
  ja_id: number;
  ja_code: string;
  ja_name: string;
}

// 候補リストの取得・保持は <BaseTodofukenSelect>（= useTodofuken の共有
// キャッシュ）に任せる。この画面は選択値と、隣に出す名称だけを持つ。
const { name: todofukenNameOf } = useTodofuken();
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
  selected: ref<number | null>(null),
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

// ──────────────────── 履歴テーブル状態 ────────────────────
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
  // [notified-at] 送信中(2) を抜けた時刻を worker が刻む。通知ステータスの隣に
  // 置き、「どの状態か」と「いつ遷移したか」を一目で確認できるようにする。
  { title: '通知日時', key: 'notified_at', width: 160 },
  { title: '削除予定日', key: 'scheduled_delete_date', width: 140 },
  { title: '削除日', key: 'deleted_at', width: 140 },
  { title: '操作', key: 'actions', width: 100, align: 'center' },
];

// ──────────────────── 選択 / プレビュー / ダウンロード（共通 composable）──────
/** 削除済み（deleted_at あり）は選択・プレビュー・DL 対象外。 */
function isRowDisabled(row: FileUploadListItem): boolean {
  return row.deleted_at != null;
}

const {
  selectedIds,
  rowSelectionConfig,
  previewOpen,
  previewUrl,
  previewFileName,
  isImagePreview,
  isPreviewable,
  canPreviewSelected,
  onPreview,
  onPreviewRow,
  onDownload,
} = useFileDelivery<FileUploadListItem>({
  rows,
  idOf: (r) => r.file_upload_id,
  fileNameOf: (r) => r.file_name,
  isRowDisabled,
  api: { getFilePreview, downloadFile, downloadFilesAsZip },
});

// ──────────────────── 初期取得 ────────────────────
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
    // [interceptor-handled] global axios interceptor が 403/500 をトースト。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // 都道府県候補は <BaseTodofukenSelect> が自分で読む（共有キャッシュ）。
  void fetchHistory();
});

// 都道府県カスケードは useEntityDropdown の resetTriggers が JA オプションを
// 再読込する。選択済み targetJas は意図的に保持する（都道府県を変えても既選択
// は消さない）。

// 都道府県名は隣の読取専用 input に出すだけ。候補リストは
// <BaseTodofukenSelect> が共有キャッシュから読むので、ここでは名前引きのみ。
const todofukenName = computed(() => todofukenNameOf(selectedTodofukenCode.value));

function removeJa(jaId: number): void {
  targetJas.value = targetJas.value.filter((j) => j.ja_id !== jaId);
  // box に現在表示中の同じ JA があればタグも外す。
  jaPickerValue.value = jaPickerValue.value.filter((s) => s.value !== jaId);
}

// ──────────────────── 機能定義 4.x — ファイル選択 ────────────────────
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
  // [format-gate] 顧客レビュー 2026-05 — クローズドホワイトリスト。OS ピッカーの
  // accept= は大半を弾くが drag&drop はバイパスし、macOS Safari では advisory。
  // ステージング追加前に再チェックし、BE FileUploadFormatException と同じ文言で拒否。
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
  // 削除後に同じファイルを再選択できるよう input をリセット。
  target.value = '';
}

function removeFile(index: number): void {
  selectedFiles.value.splice(index, 1);
}

// ──────────────────── 機能定義 6.x — アップロード送信 ────────────────────
function onUploadClick(): void {
  // 機能定義 6.2 — 必須チェック（ACSMS-MSG-023-001）。
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

  // 機能定義 6.3 — 確認ダイアログ（ACSMS-MSG-023-008）。
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
    // ACSMS-MSG-023-006 — 直接リテラル（useNotify().uploaded() とは別文言）
    message.success('ファイルのアップロードが完了しました。');
    // 機能定義 6.6 — フォームをクリアし履歴を再取得
    clearForm();
    void fetchHistory();
  } catch (err: unknown) {
    // 機能定義 6.6 — API エラー → ACSMS-MSG-023-005。
    // 401/403 は interceptor が処理。コード無しの 500 系はここに来る。
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

// ──────────────────── 機能定義 7.x — クリアボタン ────────────────────
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

// ──────────────────── 機能定義 8.x — アップロード済ファイル削除 ──────────
function isDeletable(row: FileUploadListItem): boolean {
  // 画面項目定義 No.18 — deleted_at が NOT NULL のとき無効化
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
      // [interceptor-handled] 401/403/500 は global interceptor がトースト済み。
    }
  });
}

// ──────────────────── 表示整形ヘルパー ────────────────────
function formatBytes(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * JA セル — `JAコード JA名`。全JA向けアップロード（ja_id NULL →
 * ja_code/ja_name null）は「全JA向け」を表示。
 */
function formatJa(row: FileUploadListItem): string {
  const parts = [row.ja_code, row.ja_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '全JA向け';
}

// Asia/Tokyo 固定フォーマッタで表示し、閲覧者のブラウザ TZ に依存せず JST で
// 描画する（旧ローカル TZ 実装は +07:00 で削除予定日が1日早く出た）。
// null は screen-design 通り '-' プレースホルダを維持。
function formatDate(iso: string | null | undefined): string {
  return iso ? formatDateTokyo(iso) : '-';
}

function formatDateTime(iso: string | null | undefined): string {
  return iso ? formatDateTimeTokyo(iso) : '-';
}

function notificationStatusLabel(status: number): string {
  // m_code 駆動。顧客は reload でラベル改称可能（再デプロイ不要）。
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

// [spec-internals] FileUploadView.spec.ts が vm を直接操作する。defineExpose で
// antd 内部イベントに依存せずスペックからアクセスできるようにする。
defineExpose({
  // フォーム状態
  selectedTodofukenCode,
  targetJas,
  jaPickerValue,
  selectedJaIds,
  selectedFiles,
  scheduledDeleteDate,
  // アクション
  onJaChange,
  removeJa,
  addFile,
  removeFile,
  askDelete,
  isDeletable,
  // 選択 / プレビュー / ダウンロード
  selectedIds,
  rowSelectionConfig,
  previewOpen,
  previewUrl,
  canPreviewSelected,
  onPreview,
  onPreviewRow,
  onDownload,
  // 履歴
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
          <BaseTodofukenSelect
            id="file-upload-todofuken"
            v-model:value="selectedTodofukenCode"
            class="flex-1 min-w-0"
          />
        </label>
        <label for="file-upload-todofuken-name" class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">都道府県名</span>
          <a-input id="file-upload-todofuken-name" :value="todofukenName" disabled class="flex-1 min-w-0" />
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
            class="flex-1 min-w-0"
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
            :disabled-date="isPastDayTokyo"
            class="flex-1 min-w-0"
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
          id="file-upload-input"
          name="files"
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
        <template v-if="column.key === 'file_name'">
          <!-- プレビュー可能形式（画像/PDF）はクリックでプレビュー。削除済み・
               非対応形式はプレーンテキスト。 -->
          <span
            v-if="isRowDisabled(record as FileUploadListItem)"
            class="text-text-disabled line-through"
          >
            {{ (record as FileUploadListItem).file_name }}
          </span>
          <a
            v-else-if="isPreviewable((record as FileUploadListItem).file_name)"
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
        <template v-else-if="column.key === 'ja'">
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

    <FilePreviewModal
      v-model:open="previewOpen"
      :file-name="previewFileName"
      :url="previewUrl"
      :is-image="isImagePreview"
    />
  </div>
</template>
