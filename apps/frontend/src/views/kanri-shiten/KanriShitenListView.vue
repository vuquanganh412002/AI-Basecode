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
import {
  listKanriShiten,
  removeKanriShiten,
  type KanriShitenListItem,
  type ListKanriShitenQuery,
} from '@/api/kanri-shiten/kanri-shiten';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';

interface KanriShitenFilters {
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  // `undefined`（''ではない）で都道府県未選択時に <a-select> の placeholder を
  // 表示させる。antd は '' を選択値として扱い placeholder を抑制する。
  todofuken_code: string | undefined;
  tel: string;
  fax: string;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();

// 権限ゲート（seeder.md §3 kanri_shiten.* マトリクス + ACSMS-SCR-008
// 画面定義§1.3）。CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN は自スコープを閲覧可、
// create / delete は NICHINO_ADMIN のみ。ボタンは非 admin でも表示のまま
// `:disabled` にし「機能はあるがこのロールでは使えない」ことを示す
// （vue.md §Permission-aware list buttons）。
const canCreate = computed(() => authStore.hasPermission('kanri_shiten.create'));
const canUpdate = computed(() => authStore.hasPermission('kanri_shiten.update'));
const canDelete = computed(() => authStore.hasPermission('kanri_shiten.delete'));

// 既定ソートは `updated_at DESC` で、作成/更新したレコードが次回描画時に先頭へ。
// 画面定義§8.1 の3つのソート可能列はクリック時にこれを上書きする。
const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<KanriShitenFilters>({
    defaultFilters: {
      kanri_shiten_code: '',
      kanri_shiten_name: '',
      todofuken_code: undefined,
      tel: '',
      fax: '',
    },
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<KanriShitenListItem[]>([]);

/** 検索 dropdown 用の都道府県 options。mount 時に一度取得。 */
// 都道府県の候補取得・保持は <BaseTodofukenSelect>（useTodofuken の共有
// キャッシュ）に任せる。

// 列は screen-design.md §画面項目定義 §検索結果テーブルをミラー。
// ソート可能列は §機能定義§8.1 の3列に限定。
const columns: TableColumnsType = [
  { title: '管理支店コード', dataIndex: 'kanri_shiten_code', key: 'kanri_shiten_code', sorter: true, width: 160 },
  { title: '管理支店名', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', sorter: true, width: 220 },
  { title: 'JA名', dataIndex: 'ja_name', key: 'ja_name', width: 180 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_code', sorter: true, width: 110 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 110 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 240 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 130 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 130 },
  { title: '紙版', dataIndex: 'paper_flg', key: 'paper_flg', align: 'center', width: 70 },
  { title: '電子版', dataIndex: 'denshi_flg', key: 'denshi_flg', align: 'center', width: 70 },
  { title: '操作', key: 'actions', align: 'center', width: 90 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    // 都道府県列は `todofuken_name`（dataIndex）を表示するが BE のソート
    // whitelist は `todofuken_code` がキー。antd の sorter.field は dataIndex
    // 由来なのでここで戻す。
    const sortBy =
      state.sort_by === 'todofuken_name' ? 'todofuken_code' : state.sort_by;
    const params: ListKanriShitenQuery = {
      kanri_shiten_code: state.filters.kanri_shiten_code || undefined,
      kanri_shiten_name: state.filters.kanri_shiten_name || undefined,
      todofuken_code: state.filters.todofuken_code || undefined,
      tel: state.filters.tel || undefined,
      fax: state.filters.fax || undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: sortBy as ListKanriShitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listKanriShiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // 想定内・無視: axios interceptor が FORBIDDEN / 500 を既にトースト済み。
    // 再throw は onMounted の fire-and-forget で unhandled rejection になる
    // （vue.md §List view rules #5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchList();
});

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // paste/IME 空白で ILIKE を広げないようテキストフィルタを trim。
  // todofuken_code は select 由来で trim 対象なし。
  beforeSearch() {
    state.filters.kanri_shiten_code = state.filters.kanri_shiten_code.trim();
    state.filters.kanri_shiten_name = state.filters.kanri_shiten_name.trim();
    state.filters.tel = state.filters.tel.trim();
    state.filters.fax = state.filters.fax.trim();
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'KanriShitenCreate' });
}

function goEdit(row: KanriShitenListItem): void {
  void router.push({ name: 'KanriShitenEdit', params: { id: row.kanri_shiten_id } });
}

function askDelete(row: KanriShitenListItem): void {
  confirmDelete('この管理支店を削除してもよろしいですか？', async () => {
    // ACSMS-MSG-008-005
    try {
      await removeKanriShiten(row.kanri_shiten_id);
      notify.deleted(); // ACSMS-MSG-008-006 '削除しました。' (verb-only)
      await fetchList();
    } catch {
      // interceptor が 409 CONFLICT（ACSMS-MSG-008-004）/ 500
      // （ACSMS-MSG-008-003）を処理。view で再トーストしない。
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 5フィールドを3列で 3 + 2 に割る（顧客要望 2026-08）。
         4列では 4 + 1 になり FAX だけが次行に取り残されて座りが悪かった。
         幅の面でも3列が要る: 4列だと 1 セルは
           (コンテナ960px - カード padding 32 - gap 16×3) / 4 = 220px
         しかなく、「管理支店コード」(7文字=98px) を引くと入力欄が 114px しか
         残らずプレースホルダが「選択して…」で切れていた。3列なら
           (960 - 32 - 16×2) / 3 = 298px → 入力欄 192px で全文入る。
           行1: 管理支店コード | 管理支店名 | 都道府県
           行2: 電話番号 | FAX -->
    <BaseSearchForm
      :loading="loading"
      :columns="3"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="kanri-shiten-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店コード</span>
        <a-input
          id="kanri-shiten-filter-1"
          v-model:value="state.filters.kanri_shiten_code"
          placeholder="選択してください"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="kanri-shiten-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店名</span>
        <a-input
          id="kanri-shiten-filter-2"
          v-model:value="state.filters.kanri_shiten_name"
          placeholder="選択してください"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="kanri-shiten-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <BaseTodofukenSelect
          id="kanri-shiten-filter-3"
          v-model:value="state.filters.todofuken_code"
          class="flex-1 min-w-0"
        />
      </label>
      <label for="kanri-shiten-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">電話番号</span>
        <a-input
          id="kanri-shiten-filter-4"
          v-model:value="state.filters.tel"
          placeholder="選択してください"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="kanri-shiten-filter-5" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">FAX</span>
        <a-input
          id="kanri-shiten-filter-5"
          v-model:value="state.filters.fax"
          placeholder="選択してください"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-008-001 — 空結果メッセージは別描画
         （a-table の emptyText slot は BaseDataTable の動的 slot ループで
         安全に転送できない）。 -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="kanri-shiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="管理支店一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="kanri_shiten_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button type="primary" :disabled="!canCreate" @click="goCreate">
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'kanri_shiten_code'">
          <!-- コードが編集の入口。update 権限があるときのみアンカー化、
               なければプレーンテキストで行き止まりクリックを避ける。 -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as KanriShitenListItem)"
          >
            {{ (record as KanriShitenListItem).kanri_shiten_code }}
          </a>
          <span v-else>{{ (record as KanriShitenListItem).kanri_shiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'paper_flg'">
          <span v-if="(record as KanriShitenListItem).paper_flg" class="material-icons text-success text-base" aria-label="紙版あり">
            check_circle
          </span>
        </template>
        <template v-else-if="column.key === 'denshi_flg'">
          <span v-if="(record as KanriShitenListItem).denshi_flg" class="material-icons text-success text-base" aria-label="電子版あり">
            check_circle
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as KanriShitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
