<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { type TableColumnsType } from 'ant-design-vue';
import { confirmDelete } from '@/utils/confirm';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { RoleCode } from '@/constants/enums';
import {
  listShiten,
  removeShiten,
  type ShitenListItem,
  type ListShitenQuery,
} from '@/api/shiten/shiten';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';

interface ShitenFilters {
  shiten_name: string;
  shiten_code: string;
  kanri_shiten_id: number | undefined;
  jastem_toriatsukai_tenpo_code: string;
  /** 'all' = 全選択 (no filter), 'true' = 金融機関支店, 'false' = 金融機関支店以外. */
  kinyu_shiten_flg: 'all' | 'true' | 'false';
}

const router = useRouter();
const route = useRoute();
const notify = useNotify();
const authStore = useAuthStore();

// 権限ゲート（seeder.md §3 shiten.* マトリクス + ACSMS-SCR-006 api.md §4.2）。
// JA レベル3ロール（CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN）は全て
// shiten.view / .create / .update / .delete を持つが、将来の権限編集で禁止操作が
// 誤って露出しないよう UI もガードする。権限のないロールでもボタンは表示のまま
// `:disabled` にし「機能はあるがこのロールでは使えない」ことを示す
// （vue.md §Permission-aware list buttons）。
const canCreate = computed(() => authStore.hasPermission('shiten.create'));
const canUpdate = computed(() => authStore.hasPermission('shiten.update'));
const canDelete = computed(() => authStore.hasPermission('shiten.delete'));

// [role5-branch-mutate] 顧客要件 2026-06 — JA_KANRI_SHITEN は同一 JA の全支店を
// 閲覧できるが、更新/削除は自管理支店配下のみ。自管理支店配下でない行は削除
// ボタンを無効化する（BE も update/remove を 403 で拒否 = 二重防御）。他ロールや
// 自管理支店配下の行は制限なし。
function canMutateRow(row: ShitenListItem): boolean {
  if (authStore.user?.role_code !== RoleCode.JA_KANRI_SHITEN) return true;
  return row.kanri_shiten_id === (authStore.user?.kanri_shiten_id ?? null);
}

const DEFAULT_FILTERS: ShitenFilters = {
  shiten_name: '',
  shiten_code: '',
  kanri_shiten_id: undefined,
  jastem_toriatsukai_tenpo_code: '',
  kinyu_shiten_flg: 'all',
};

const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<ShitenFilters>({
    defaultFilters: { ...DEFAULT_FILTERS },
    // 既定ソートは最終更新順で、作成/編集した行が一覧先頭に来る。
    // 画面定義§8.1 の列はヘッダクリックで引き続き利用可。
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<ShitenListItem[]>([]);
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);

// 列は screen-design.md §画面項目定義 §検索結果テーブル + index.html をミラーし、
// 先頭に文脈列として 管理支店名（BE が m_kanri_shiten から JOIN）を追加。
// ソート可能列: 支店コード / 支店名（§機能定義§8.1）と 管理支店名
// （JOIN。BE はこのソート要求時のみ LEFT JOIN を足す）。
const columns: TableColumnsType = [
  { title: '支店コード', dataIndex: 'shiten_code', key: 'shiten_code', sorter: true, width: 160 },
  { title: '管理支店名', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', sorter: true, width: 200 },
  { title: '支店名', dataIndex: 'shiten_name', key: 'shiten_name', sorter: true, width: 220 },
  { title: '支店カナ', dataIndex: 'shiten_name_kana', key: 'shiten_name_kana', width: 220 },
  { title: '金融機関支店フラグ', dataIndex: 'kinyu_shiten_flg', key: 'kinyu_shiten_flg', align: 'center', width: 160 },
  { title: 'データ送信取扱店舗コード', dataIndex: 'jastem_toriatsukai_tenpo_code', key: 'jastem_toriatsukai_tenpo_code', width: 220 },
  { title: '店舗名', dataIndex: 'jastem_tenpo_name', key: 'jastem_tenpo_name', width: 160 },
  { title: '貯金種別', dataIndex: 'jastem_tyokin_shubetsu', key: 'jastem_tyokin_shubetsu', align: 'center', width: 100 },
  { title: '口座番号', dataIndex: 'jastem_koza_no', key: 'jastem_koza_no', width: 140 },
  { title: '操作', key: 'actions', align: 'center', width: 90 },
];

/**
 * [highlight-on-return]
 * 作成/更新成功後、ShitenFormView が `?highlight=:shiten_id` でここへ戻る。
 * その行を取得ページの先頭へ引き上げ、コード順一覧をスクロールせず変更を見せる。
 * query param は1回だけ消費 — router.replace でクリアし、リフレッシュしても
 * 固定し続けないようにする。対象行が現ページになければ（例: 戻る前にページ送り）
 * 引き上げは no-op — 追加 fetch は不要。
 */
function hoistHighlight(): void {
  const raw = route.query.highlight;
  if (typeof raw !== 'string') return;
  const id = Number(raw);
  if (Number.isNaN(id)) return;
  const idx = rows.value.findIndex((r) => r.shiten_id === id);
  if (idx > 0) {
    const [pinned] = rows.value.splice(idx, 1);
    rows.value.unshift(pinned);
  }
  // 以降のナビゲーション / リフレッシュで再固定しないよう query param をクリア。
  // 履歴を増やさないよう replace を使う。
  void router.replace({ query: { ...route.query, highlight: undefined } });
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListShitenQuery = {
      shiten_name: state.filters.shiten_name || undefined,
      shiten_code: state.filters.shiten_code || undefined,
      kanri_shiten_id: state.filters.kanri_shiten_id,
      jastem_toriatsukai_tenpo_code:
        state.filters.jastem_toriatsukai_tenpo_code || undefined,
      // 'all' → undefined（フィルタなし）。'true' / 'false' → boolean。
      kinyu_shiten_flg:
        state.filters.kinyu_shiten_flg === 'all'
          ? undefined
          : state.filters.kinyu_shiten_flg === 'true',
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ListShitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listShiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
    hoistHighlight();
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

async function loadKanriShitenOptions(): Promise<void> {
  // 管理支店 dropdown（ACSMS-API-COMMON-004）— 単一 JA にスコープする API
  // （ja_id 必須）。NICHINO_ADMIN は顧客CR 2026-08-24 で shiten.view を正式
  // 付与され全JA横断でこの一覧に到達できるが、session.ja_id が null で
  // どの JA にも属さないため、単一 JA スコープの本 dropdown では絞り込めない
  // （管理支店フィルタは空のまま — 他4フィルタで代替）。NICHINO_STAFF は
  // 依然 shiten.view を持たず router guard が拒否する。
  const jaId = authStore.user?.ja_id;
  if (jaId === null || jaId === undefined) {
    kanriShitenOptions.value = [];
    return;
  }
  try {
    const resp = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = resp.data;
  } catch {
    // axios interceptor が 403 / 500 を既にトースト済み。
    kanriShitenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void loadKanriShitenOptions();
});

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // paste/IME 空白で ILIKE を広げないようテキストフィルタを trim。
  beforeSearch() {
    state.filters.shiten_name = state.filters.shiten_name.trim();
    state.filters.shiten_code = state.filters.shiten_code.trim();
    state.filters.jastem_toriatsukai_tenpo_code =
      state.filters.jastem_toriatsukai_tenpo_code.trim();
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'ShitenCreate' });
}

function goEdit(row: ShitenListItem): void {
  void router.push({ name: 'ShitenEdit', params: { id: row.shiten_id } });
}

function askDelete(row: ShitenListItem): void {
  confirmDelete('この支店を削除してもよろしいですか？', async () => {
    // ACSMS-MSG-006-005
    try {
      await removeShiten(row.shiten_id);
      notify.deleted(); // '削除しました。' (verb-only — vue.md §useNotify)
      await fetchList();
    } catch {
      // interceptor が 409 CONFLICT（ACSMS-MSG-006-006）/ 500
      // （ACSMS-MSG-006-004）を処理。view で再トーストしない。
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 顧客要望 2026-05-21 の5フィルタ:
         支店コード / 支店名 / 管理支店（dropdown）/
         データ送信取扱店舗コード / 金融機関支店フラグ（radio）。
         4列グリッドでフィルタを2行に広げ、radio group は2列分を占めて
         3選択肢を1行に収める。 -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="shiten-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店コード</span>
        <a-input
          id="shiten-filter-1"
          v-model:value="state.filters.shiten_code"
          placeholder="支店コード"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>

      <label for="shiten-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店名</span>
        <a-input
          id="shiten-filter-2"
          v-model:value="state.filters.shiten_name"
          placeholder="支店名"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>

      <label for="shiten-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <a-select
          id="shiten-filter-3"
          v-model:value="state.filters.kanri_shiten_id"
          placeholder="管理支店"
          allow-clear
          class="flex-1 min-w-0"
          :options="
            kanriShitenOptions.map((k) => ({
              value: k.kanri_shiten_id,
              label: `${k.kanri_shiten_code} - ${k.kanri_shiten_name}`,
            }))
          "
        />
      </label>

      <label for="shiten-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">データ送信取扱店舗コード</span>
        <a-input
          id="shiten-filter-4"
          v-model:value="state.filters.jastem_toriatsukai_tenpo_code"
          placeholder="取扱店舗コード"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>

      <div class="flex items-start flex-wrap gap-2 @lg:col-span-2">
        <span id="shiten-filter-kinyu-shiten-flg-label" class="text-sm font-medium whitespace-nowrap text-text-main leading-[22px]">
          金融機関支店フラグ
        </span>
        <a-radio-group
          name="kinyu_shiten_flg"
          v-model:value="state.filters.kinyu_shiten_flg"
          aria-labelledby="shiten-filter-kinyu-shiten-flg-label"
        >
          <a-radio value="all">全選択</a-radio>
          <a-radio value="true">金融機関支店</a-radio>
          <a-radio value="false">金融機関支店以外</a-radio>
        </a-radio-group>
      </div>
    </BaseSearchForm>

    <!-- 空結果メッセージは兄弟 <p> で描画 — a-table の emptyText slot は
         BaseDataTable の動的 slot ループで安全に転送できない
         （vue.md §List view rules #4）。 -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="shiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="支店一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="shiten_id"
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
        <template v-if="column.key === 'shiten_code'">
          <!-- コードが編集の入口。update 権限があるときのみアンカー化、
               なければプレーンテキストで行き止まりクリックを避ける。 -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as ShitenListItem)"
          >
            {{ (record as ShitenListItem).shiten_code }}
          </a>
          <span v-else>{{ (record as ShitenListItem).shiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'kinyu_shiten_flg'">
          <span
            v-if="(record as ShitenListItem).kinyu_shiten_flg"
            class="material-icons text-success text-base"
            aria-label="金融機関支店"
          >
            check_circle
          </span>
          <span
            v-else
            class="material-icons text-text-disabled text-base"
            aria-label="金融機関支店ではない"
          >
            radio_button_unchecked
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete || !canMutateRow(record as ShitenListItem)"
            @delete="askDelete(record as ShitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
