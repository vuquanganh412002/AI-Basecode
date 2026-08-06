<script setup lang="ts">
// ACSMS-SCR-022 — ファイルダウンロード画面.
// Mirrors docs/design/ACSMS-SCR-022/screen-design.md (機能定義 1.x〜8.x) +
// docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md (API-022-001/002/003).

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { RoleCode } from '@/constants/enums';
import { useTableQuery } from '@/composables/useTableQuery';
import { formatDateTime } from '@/utils/formatters';
import { useFileDelivery } from '@/composables/useFileDelivery';
import FilePreviewModal from '@/components/common/FilePreviewModal.vue';
import {
  listFiles,
  getFilePreview,
  downloadFile,
  downloadFilesAsZip,
  type ListFilesQuery,
  type FileDownloadListItem,
} from '@/api/file-download/file-download';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';

interface FileFilters {
  file_name: string;
  todofuken_code: string;
  ja_id: number | null;
}

const authStore = useAuthStore();
const codes = useCodesStore();
// JA 固定ロール（JA_HONTEN/JA_KANRI_SHITEN）は自JA 1件のみ。
// JA 絞り込みは自JAで固定（プリセット＋disable）＝情報提供のみの意味合い。
// NICHINO_ADMIN/STAFF は全JAを自由に絞り込める。
//
// 中央会(CHUOKAI)は 2026-07 の顧客要件で「同一都道府県の全JA」へ拡大したため
// ここから外す。自JAを ja_id にプリセットしたままだと検索条件が常に
// `ja_id = 自JA` で送られ、BE 側のスコープ拡大が効かない。代わりに都道府県を
// 自県で固定する（下記 scopedTodofukenCode）。
const isJaScopedRole = computed(() =>
  ([RoleCode.JA_HONTEN, RoleCode.JA_KANRI_SHITEN] as string[]).includes(
    authStore.user?.role_code ?? '',
  ),
);
// defaultFilters に自JAを入れることで、初期表示・検索クリア後も自JAが残る。
const scopedJaId = isJaScopedRole.value ? (authStore.user?.ja_id ?? null) : null;

// 中央会は自県固定（プリセット＋disable）。他県を選んでも BE が弾いて0件になる
// だけなので、選ばせない方が分かりやすい。todofuken_code 未設定の中央会
// アカウントは従来どおり（BE も自JAスコープへフォールバック）。
const isChuokai = computed(
  () => authStore.user?.role_code === RoleCode.CHUOKAI,
);
const scopedTodofukenCode = isChuokai.value
  ? (authStore.user?.todofuken_code ?? '')
  : '';

const route = useRoute();

const {
  state, loading, total, onChange, applyFilters, searchActions,
} =
  useTableQuery<FileFilters>({
    defaultFilters: {
      file_name: '',
      todofuken_code: scopedTodofukenCode,
      ja_id: scopedJaId,
    },
    defaultSortBy: 'download_datetime',
    defaultSortOrder: 'desc',
  });

const rows = ref<FileDownloadListItem[]>([]);
// 都道府県の候補取得・保持は <BaseTodofukenSelect>（useTodofuken の共有
// キャッシュ）に任せる。この画面はフィルタ値だけ持てばよい。

// [deleted-row] 論理削除済み (deleted_at が立っている) ファイルはダウンロード／
// プレビュー対象外。一覧には表示するが、選択チェックボックスを disabled にし、
// ファイル名はリンクではなくグレーの取り消し線テキストにする。
function isDeleted(row: FileDownloadListItem): boolean {
  return !!row.deleted_at;
}

// [nichino-permission] nichino_download_allowed_flg=false の行をダウンロード
// できないロール（顧客要件）: 日農（NICHINO_ADMIN=role 1 / NICHINO_STAFF=role 2）
// に加え、中央会（CHUOKAI=role 3）も対象。該当ロールのときだけ、フラグ false の
// 行を選択不可（チェックボックス disabled + ファイル名はプレーンテキスト）にする。
// 他ロールはフラグに関わらず操作可能。BE の assertNichinoDownloadAllowed と対。
const isNichinoRole = computed(() =>
  ([RoleCode.NICHINO_ADMIN, RoleCode.NICHINO_STAFF, RoleCode.CHUOKAI] as string[]).includes(
    authStore.user?.role_code ?? '',
  ),
);

/**
 * 自分が出力したファイルか（顧客要件 2026-07）。`created_by` は account_id を
 * 文字列で保持するため、比較は文字列に揃える。BE の isCreatedBySelf と同条件。
 */
function isCreatedBySelf(row: FileDownloadListItem): boolean {
  const createdBy = (row.created_by ?? '').trim();
  if (createdBy === '') return false;
  return createdBy === String(authStore.user?.account_id ?? '').trim();
}

// 自分で出力したファイルは、フラグ false でも常に操作可（顧客要件 2026-07）。
// フラグは「他組織へ自組織のファイルを見せてよいか」を JA が決めるもので、
// 出力した本人を締め出す意図は無い。既定 FALSE のため、この例外が無いと
// 中央会が自分で出した帳票をその場で落とせない。
function isNichinoBlocked(row: FileDownloadListItem): boolean {
  if (!isNichinoRole.value) return false;
  if (isCreatedBySelf(row)) return false;
  return row.nichino_download_allowed_flg === false;
}

/** 削除済み or 日農DL不可 → 選択・プレビュー・DL 対象外。 */
function isRowDisabled(row: FileDownloadListItem): boolean {
  return isDeleted(row) || isNichinoBlocked(row);
}

/** 404 NOT_FOUND を ACSMS-MSG-022-003 に写像する（composable の onError へ渡す）。 */
function handleFileError(err: unknown): void {
  const e = err as { response?: { status?: number; data?: { error_code?: string } } };
  if (e?.response?.status === 404 || e?.response?.data?.error_code === 'NOT_FOUND') {
    message.error('ファイルが存在していません。');
  }
}

// 選択 + プレビュー + ダウンロード は共通 composable に集約（SCR-023 と同一挙動）。
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
  clearSelection,
} = useFileDelivery<FileDownloadListItem>({
  rows,
  idOf: (r) => r.file_download_id,
  fileNameOf: (r) => r.file_name,
  isRowDisabled,
  api: { getFilePreview, downloadFile, downloadFilesAsZip },
  onError: handleFileError,
});

const columns: TableColumnsType = [
  {
    title: 'ダウンロード日時',
    dataIndex: 'download_datetime',
    key: 'download_datetime',
    sorter: true,
    width: 200,
  },
  {
    title: '作成者',
    dataIndex: 'created_by_name',
    key: 'created_by_name',
    sorter: true,
    width: 160,
  },
  {
    title: 'JA名',
    key: 'ja_name',
    width: 220,
  },
  {
    title: 'ダウンロード種別',
    key: 'download_type',
    width: 160,
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
    ja_id: state.filters.ja_id ?? undefined,
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

onMounted(() => {
  // [mail-deeplink] アップロード通知メール(SCR-023)のリンクは
  // `/file-download?file_name=...` で来る。ファイル名を検索欄へ流し込んでから
  // 取得することで、受信者が一覧を探さずに該当行へ着地する。
  // useTableQuery の syncUrl は page/sort しか復元しないため、フィルタは
  // ここで明示的に読む。
  const fromMail = route.query.file_name;
  if (typeof fromMail === 'string' && fromMail.trim() !== '') {
    // applyFilters は「適用済み」基準も更新する。state.filters を直接書くと
    // 未検索の入力扱いになり、以降 filtersChangedSinceApplied が誤検知する。
    applyFilters({ file_name: fromMail.trim() } as Partial<FileFilters>);
  }
  void fetchList();
  // 都道府県候補は <BaseTodofukenSelect> が自分で読む（共有キャッシュ）。
});

// 検索 / 検索クリア — shared guard+fetch wiring (useTableQuery.searchActions).
const { onSearch, onClear } = searchActions({
  fetchList,
  // Trim in place. `?.trim() ?? ''`: `<a-select allow-clear>` (都道府県) sets
  // the v-model to undefined on ×, so a bare .trim() throws TypeError → the
  // generic エラーが発生しました。 toast (reported bug).
  beforeSearch() {
    state.filters.file_name = state.filters.file_name?.trim() ?? '';
    state.filters.todofuken_code = state.filters.todofuken_code?.trim() ?? '';
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
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
  rowSelectionConfig,
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
          class="flex-1 min-w-0"
        />
      </label>
      <label for="file-download-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <!-- 表記・検索とも共通部品 <BaseTodofukenSelect> の既定に任せる
             （ラベル「コード 名称」/ プレースホルダ）。片方の画面だけ props で
             上書きすると再びズレるため、ここでは何も指定しない。 -->
        <BaseTodofukenSelect
          id="file-download-filter-2"
          v-model:value="state.filters.todofuken_code"
          :allow-clear="!scopedTodofukenCode"
          :disabled="!!scopedTodofukenCode"
          class="flex-1 min-w-0"
        />
      </label>
      <!-- JA 絞り込み — 共通 <BaseJaDropdown>（サーバ側ページング・JAコード/JA名
           検索・単一選択）。/ja/dropdown が DataScope を適用するため、JA本店/
           JA管理支店は自JAのみが候補に出る。
           中央会は scope='todofuken' で自都道府県の全JAを候補にする（顧客要件
           2026-07 — 一覧のスコープ拡大に絞り込み候補を揃える。拡大先の県は BE が
           セッションから決めるので他県は覗けない）。 -->
      <label for="file-download-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JA名</span>
        <BaseJaDropdown
          id="file-download-filter-3"
          v-model:value="state.filters.ja_id"
          placeholder="JAコード・JA名で検索"
          :disabled="isJaScopedRole"
          :scope="scopedTodofukenCode ? 'todofuken' : 'own'"
          class="flex-1 min-w-0"
        />
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
      row-key="file_download_id"
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
        <template v-if="column.key === 'download_datetime'">
          <!-- BE returns an ISO timestamp with `+09:00` offset
               (TIMESTAMPTZ); `formatDateTime` (formatters.ts) pins
               rendering to Asia/Tokyo via dayjs.tz.setDefault so the
               raw `2026-05-25T04:36:29.203Z` becomes the JST wall
               clock `2026/05/25 13:36`. -->
          {{ formatDateTime((record as FileDownloadListItem).download_datetime) }}
        </template>
        <template v-else-if="column.key === 'ja_name'">
          <!-- JA名: m_ja.ja_code + ja_name。全JA向け(ja_id=null)は「全JA向け」。 -->
          <span v-if="(record as FileDownloadListItem).ja_name">
            {{ (record as FileDownloadListItem).ja_code }}
            {{ (record as FileDownloadListItem).ja_name }}
          </span>
          <span v-else class="text-text-secondary">全JA向け</span>
        </template>
        <template v-else-if="column.key === 'download_type'">
          <!-- ダウンロード種別は m_code (DOWNLOAD_TYPE) のラベルで表示する。 -->
          {{ codes.label('DOWNLOAD_TYPE', (record as FileDownloadListItem).download_type) }}
        </template>
        <template v-else-if="column.key === 'file_name'">
          <!-- [filename-as-link] Per index.html mockup the file_name
               is a clickable blue link that opens the preview modal.
               Reuses onPreviewRow so the row's checkbox doesn't need
               to be ticked first. Only previewable types (image / PDF)
               are rendered as links; others are plain text since there
               is no inline viewer for them. -->
          <!-- 削除済み: グレー＋取り消し線のプレーンテキスト（リンク化しない）。 -->
          <span
            v-if="isDeleted(record as FileDownloadListItem)"
            class="text-text-disabled line-through"
            title="削除済みファイル"
          >
            {{ (record as FileDownloadListItem).file_name }}（削除済み）
          </span>
          <!-- 日農DL不可 (nichino_download_allowed_flg=false かつ role 1/2/3):
               グレーのプレーンテキスト。リンク化せず選択・DL 不可。 -->
          <span
            v-else-if="isNichinoBlocked(record as FileDownloadListItem)"
            class="text-text-disabled"
            title="日農ダウンロード不可"
          >
            {{ (record as FileDownloadListItem).file_name }}
          </span>
          <a
            v-else-if="isPreviewable((record as FileDownloadListItem).file_name)"
            href="#"
            class="text-primary hover:underline cursor-pointer"
            @click.prevent="onPreviewRow(record as FileDownloadListItem)"
          >
            {{ (record as FileDownloadListItem).file_name }}
          </a>
          <span v-else class="text-text-main">
            {{ (record as FileDownloadListItem).file_name }}
          </span>
        </template>
        <template v-else-if="column.key === 'file_size'">
          {{ formatBytes((record as FileDownloadListItem).file_size) }}
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
