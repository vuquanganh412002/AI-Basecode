<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { type TableColumnsType } from 'ant-design-vue';
import { confirmDelete } from '@/utils/confirm';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { listJa, removeJa, type JaListItem, type ListJaQuery } from '@/api/ja/ja';
import { getTodofukenList, type TodofukenItem } from '@/api/todofuken/todofuken';

interface JaFilters {
  ja_code: string;
  ja_name: string;
  /**
   * 都道府県コード（2文字）。`undefined` = フィルタなし（既定状態 —
   * <a-select allow-clear placeholder> が「すべて」sentinel でなく placeholder を
   * 表示）。× アイコンでクリア。
   */
  todofuken_code: string | undefined;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();

// 権限ゲート（seeder.md §3 ja.* マトリクス）:
//   role 1 NICHINO_ADMIN : create / view / update / delete（全4）
//   role 3 CHUOKAI       : view / update（create / delete なし）
//   role 4 JA_HONTEN     : view / update（create / delete なし）
//   role 5 JA_KANRI_SHITEN: なし — router guard の `meta.permission: 'ja.view'`
//                            で既に除外。
// ボタン / クリック可能セルはこれらのフラグに従い、BE がどのみち 403 にする
// アクションを非 admin に見せない。
const canCreate = computed(() => authStore.hasPermission('ja.create'));
const canUpdate = computed(() => authStore.hasPermission('ja.update'));
const canDelete = computed(() => authStore.hasPermission('ja.delete'));

const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<JaFilters>({
    defaultFilters: { ja_code: '', ja_name: '', todofuken_code: undefined },
    // 最新の書込み（作成/更新）が先頭に来て、変更したものが行1に見える。
    // BE whitelist + 既定に一致（ja.service.ts SORT_COLUMN_MAP + sort_by fallback）。
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<JaListItem[]>([]);

/** 都道府県 dropdown options（ACSMS-API-COMMON-001）。mount 時に一度取得。 */
const todofukenOptions = ref<TodofukenItem[]>([]);

// 全列に width を明示し、ソートアイコン追加でテーブルが崩れないようにする。
// antd 既定 `tableLayout: 'auto'` は余白を flex 列に分配するため、ソート矢印が
// 出ると width 未指定列が縮む。全列に width を固定し、BaseDataTable の
// `scroll: { x: 'max-content' }` にオーバーフローを任せてソート毎に安定させる。
const columns: TableColumnsType = [
  { title: 'JAコード', dataIndex: 'ja_code', key: 'ja_code', sorter: true, width: 140 },
  { title: 'JA名', dataIndex: 'ja_name', key: 'ja_name', width: 220 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_name', sorter: true, width: 130 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 120 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 280 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 140 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 140 },
  { title: '中央会フラグ', dataIndex: 'chuokai_flg', key: 'chuokai_flg', align: 'center', width: 130 },
  { title: '委託者コード', dataIndex: 'jastem_itakusha_code', key: 'jastem_itakusha_code', width: 140 },
  { title: '委託者名', dataIndex: 'jastem_itakusha_name', key: 'jastem_itakusha_name', width: 200 },
  { title: '農協番号', dataIndex: 'jastem_ja_code', key: 'jastem_ja_code', width: 110 },
  { title: '農協名', dataIndex: 'jastem_ja_name', key: 'jastem_ja_name', width: 160 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListJaQuery = {
      ja_code: state.filters.ja_code || undefined,
      ja_name: state.filters.ja_name || undefined,
      todofuken_code: state.filters.todofuken_code || undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
    };
    const res = await listJa(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // 想定内・無視: error-handler.ts が FORBIDDEN / 500 を既にトースト済み。
    // 再throw は onMounted の fire-and-forget で unhandled rejection になる
    // （vue.md の「想定して意図的に無視」ケース）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchTodofuken(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    // BE envelope は `{ data: TodofukenItem[] }`。spec fixture は素の配列を
    // 直接渡す場合あり（buildTodofukenList）— 両形を受理。
    todofukenOptions.value = Array.isArray(resp)
      ? (resp as unknown as TodofukenItem[])
      : resp.data;
  } catch {
    // 非致命的 — 取得失敗なら dropdown を空のままにする。
    todofukenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void fetchTodofuken();
});

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // paste/IME 空白で ILIKE を変えないようテキストフィルタを trim。
  // todofuken_code は select 由来で trim 対象なし。
  beforeSearch() {
    state.filters.ja_code = state.filters.ja_code.trim();
    state.filters.ja_name = state.filters.ja_name.trim();
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'JaCreate' });
}

function goEdit(row: JaListItem): void {
  void router.push({ name: 'JaEdit', params: { id: row.ja_id } });
}

function askDelete(row: JaListItem): void {
  confirmDelete('このJAを削除してもよろしいですか？', async () => {
    try {
      await removeJa(row.ja_id);
      notify.deleted();
      await fetchList();
    } catch {
      // axios interceptor が 409 CONFLICT（ACSMS-MSG-004-003）と 500
      // （ACSMS-MSG-004-005）を処理。view で再トーストしない
      // （vue.md §Error Handling Architecture）。
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4列グリッドで2フィールドがカード左半分を占める
         （デザインフィードバックに従う）。 -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="ja-filter-code" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JAコード</span>
        <a-input
          id="ja-filter-code"
          v-model:value="state.filters.ja_code"
          placeholder="JAコード"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="ja-filter-name" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JA名</span>
        <a-input
          id="ja-filter-name"
          v-model:value="state.filters.ja_name"
          placeholder="JA名"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="ja-filter-todofuken" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <a-select
          id="ja-filter-todofuken"
          v-model:value="state.filters.todofuken_code"
          placeholder="選択してください"
          allow-clear
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

    <!-- 一覧テーブル -->
    <!-- ACSMS-MSG-004-001 — 空結果メッセージは別描画
         （a-table の emptyText slot は BaseDataTable の動的 slot ループで
         安全に転送できない）。 -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="ja-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="JA一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="ja_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <!-- 新規登録 は全ロールで表示、ja.create がないとき無効化。
             下の操作列の 削除 も同じ UX。 -->
        <a-button
          type="primary"
          :disabled="!canCreate"
          @click="goCreate"
        >
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ja_code'">
          <!-- ja_code が編集フォームを開くクリック対象。ja.update があるときのみ
               アンカー化 — なければプレーンテキスト（403リバウンドの dead link を避ける）。 -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as JaListItem)"
          >
            {{ (record as JaListItem).ja_code }}
          </a>
          <span v-else>{{ (record as JaListItem).ja_code }}</span>
        </template>
        <template v-else-if="column.key === 'chuokai_flg'">
          {{ (record as JaListItem).chuokai_flg ? '中央会' : 'JA' }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集リンクは意図的に非表示 — 入口は上の ja_code セル。
               削除は ja.delete がないとき表示のまま無効化。 -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as JaListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
