<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { type TableColumnsType } from 'ant-design-vue';
import { confirmDelete } from '@/utils/confirm';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import {
  listAccounts,
  removeAccount,
  type AccountListItem,
  type ListAccountsQuery,
} from '@/api/account/account';
import {
  listRolesDropdown,
  type RoleDropdownItem,
} from '@/api/roles/roles';
import { RoleCode } from '@/constants/enums';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';

interface AccountFilters {
  login_id: string;
  /** ロール ID 1..5 — 空は wire で undefined に変換。 */
  role_id: number | null;
  /** 都道府県コード（2桁）。 */
  todofuken_code: string | null;
  ja_id: number | null;
  kanri_shiten_id: number | null;
}

// ─── アクセス制御（機能定義 1.2） ─────────────────────────────────────
// api.md §4.2 — accounts エンドポイントは NICHINO_ADMIN 専用。
// router guard / BE 権限に加え view でもロールチェックし、非 admin が URL に
// 着地したら API を叩かず ACSMS-MSG-024-006 を表示する。
const authStore = useAuthStore();
const isAdmin = computed(
  () => authStore.user?.role_code === RoleCode.NICHINO_ADMIN,
);
const ACCESS_DENIED_MSG = 'アクセス権がありません。';

const router = useRouter();
const notify = useNotify();

const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<AccountFilters>({
    defaultFilters: {
      login_id: '',
      role_id: null,
      todofuken_code: null,
      ja_id: null,
      kanri_shiten_id: null,
    },
    // 機能定義 1 — 検索結果一覧は常に最新順で表示.
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<AccountListItem[]>([]);

// dropdown options。JA 一覧は <BaseJaDropdown>（サーバ側ページング + 検索、
// 50/page 無限スクロール）が提供 — ローカル ref なし。
const roleOptions = ref<RoleDropdownItem[]>([]);
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);
// 都道府県の候補取得・保持は <BaseTodofukenSelect>（useTodofuken の共有
// キャッシュ）に任せる。

// 列順は ACSMS-SCR-024 v1.x 顧客仕様:
// ログインID → アカウント名 → 管理者区分 → 都道府県 → JA → 管理支店 →
// 通知先メールアドレス → サブメール1/2/3 → 紙版 → 電子版 → ロック → 操作。
// ソート可能: ログインID / アカウント名 / 管理者区分（role_name）/
// 都道府県（todofuken_code）。
const columns: TableColumnsType = [
  { title: 'ログインID', dataIndex: 'login_id', key: 'login_id', sorter: true, width: 160 },
  { title: 'アカウント名', dataIndex: 'account_name', key: 'account_name', sorter: true, width: 200 },
  { title: '管理者区分', dataIndex: 'role_name', key: 'role_name', sorter: true, width: 160 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_code', sorter: true, width: 120 },
  { title: 'JA名', dataIndex: 'ja_name', key: 'ja_name', width: 180 },
  { title: '管理支店', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', width: 200 },
  { title: '所属支店', dataIndex: 'shiten_name', key: 'shiten_name', width: 200 },
  { title: '通知先メールアドレス', dataIndex: 'email', key: 'email', width: 220 },
  { title: 'サブメール1', dataIndex: 'sub_email_1', key: 'sub_email_1', width: 220 },
  { title: 'サブメール2', dataIndex: 'sub_email_2', key: 'sub_email_2', width: 220 },
  { title: 'サブメール3', dataIndex: 'sub_email_3', key: 'sub_email_3', width: 220 },
  { title: '紙版', dataIndex: 'paper_flg', key: 'paper_flg', align: 'center', width: 70 },
  { title: '電子版', dataIndex: 'denshi_flg', key: 'denshi_flg', align: 'center', width: 70 },
  { title: 'ロック状態', dataIndex: 'account_lock_flg', key: 'account_lock_flg', align: 'center', width: 110 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListAccountsQuery = {
      login_id: state.filters.login_id || undefined,
      role_id: state.filters.role_id ?? undefined,
      // `||` は '' も落とす — <BaseTodofukenSelect> は × クリアで '' を返す
      // （呼び出し側の空表現を string に揃えるため）。`??` だと '' がそのまま
      // クエリに載り、BE 側で「空文字の都道府県」で絞って0件になる。
      todofuken_code: state.filters.todofuken_code || undefined,
      ja_id: state.filters.ja_id ?? undefined,
      kanri_shiten_id: state.filters.kanri_shiten_id ?? undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ListAccountsQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listAccounts(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // axios interceptor が FORBIDDEN / 500 を既にトースト済み — view はローカル
    // 状態をクリアするだけで onMounted の fire-and-forget が unhandled rejection を
    // 出さないようにする（vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchRoleOptions(): Promise<void> {
  try {
    const resp = await listRolesDropdown();
    roleOptions.value = resp.data;
  } catch {
    roleOptions.value = [];
  }
}

async function fetchKanriShitenOptions(jaId: number): Promise<void> {
  try {
    const resp = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = resp.data;
  } catch {
    kanriShitenOptions.value = [];
  }
}

// 都道府県 と JA は独立した検索条件。両方選択時は AND で絞り込む
// (BE applyAccountSearchFilters が両方を andWhere)。都道府県を変えても
// JA選択はリセットしない — 互いに関連付けない仕様。

// 機能定義 8 — JA 選択が 管理支店 へカスケード。JA未選択 → 管理支店リセット。
watch(
  () => state.filters.ja_id,
  (newJaId, oldJaId) => {
    // 前 JA の古い kanri_shiten_id が新 fetch に漏れないよう現在の選択をクリア。
    if (newJaId !== oldJaId) {
      state.filters.kanri_shiten_id = null;
    }
    if (newJaId) {
      void fetchKanriShitenOptions(newJaId);
    } else {
      kanriShitenOptions.value = [];
    }
  },
);

onMounted(() => {
  if (!isAdmin.value) return;
  void fetchList();
  void fetchRoleOptions();
  // JA dropdown は <BaseJaDropdown> の onMounted で自己 hydrate。
});

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // テキストフィルタを trim。role_id / ja_id / kanri_shiten_id は select 由来。
  beforeSearch() {
    state.filters.login_id = state.filters.login_id.trim();
  },
  // 実リセット時はカスケードした 管理支店 dropdown options もクリア。
  afterReset() {
    kanriShitenOptions.value = [];
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'AccountCreate' });
}

function goEdit(row: AccountListItem): void {
  void router.push({ name: 'AccountEdit', params: { id: row.account_id } });
}

function askDelete(row: AccountListItem): void {
  confirmDelete('このアカウントを削除してもよろしいですか？', async () => {
    try {
      await removeAccount(row.account_id);
      notify.deleted();
      await fetchList();
    } catch {
      // interceptor が CONFLICT（ACSMS-MSG-024-003）と 500
      // （ACSMS-MSG-024-002）をトースト — view で再トーストしない
      // （vue.md §Error Handling Architecture）。
    }
  });
}
</script>

<template>
  <!-- 機能定義 1.2 — 権限なしのアカウントの場合 ACSMS-MSG-024-006. -->
  <BaseCard v-if="!isAdmin" padding="lg" class="max-w-2xl">
    <p class="text-text-main text-sm">{{ ACCESS_DENIED_MSG }}</p>
  </BaseCard>

  <div v-else class="space-y-6">
    <!-- 検索エリア — 4列グリッドで4フィールドが行を埋める。 -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="accounts-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">ログインID</span>
        <a-input
          id="accounts-filter-1"
          v-model:value="state.filters.login_id"
          placeholder="ログインID"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="accounts-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理者区分</span>
        <a-select
          id="accounts-filter-2"
          v-model:value="state.filters.role_id"
          placeholder="すべて"
          allow-clear
          class="flex-1 min-w-0"
        >
          <a-select-option
            v-for="opt in roleOptions"
            :key="opt.role_id"
            :value="opt.role_id"
          >
            {{ opt.role_name }}
          </a-select-option>
        </a-select>
      </label>
      <label for="accounts-filter-todofuken" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <BaseTodofukenSelect
          id="accounts-filter-todofuken"
          v-model:value="state.filters.todofuken_code"
          class="flex-1 min-w-0"
        />
      </label>
      <label for="accounts-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JA名</span>
        <!-- BaseJaDropdown: サーバ側ページング（50/page）+ 無限スクロール。
             アカウント画面は option ラベルから ja_code を隠し ILIKE を ja_name のみに
             スコープ（label-format + search-field）。都道府県 とは独立 —
             全JAを表示し、両方選択時は AND 絞り込み。 -->
        <div class="flex-1">
          <BaseJaDropdown
            id="accounts-filter-3"
            v-model:value="state.filters.ja_id"
            placeholder="すべて"
            label-format="name"
            search-field="name"
          />
        </div>
      </label>
      <label for="accounts-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <a-select
          id="accounts-filter-4"
          v-model:value="state.filters.kanri_shiten_id"
          placeholder="すべて"
          allow-clear
          :disabled="!state.filters.ja_id"
          class="flex-1 min-w-0"
        >
          <a-select-option
            v-for="opt in kanriShitenOptions"
            :key="opt.kanri_shiten_id"
            :value="opt.kanri_shiten_id"
          >
            {{ opt.kanri_shiten_name }}
          </a-select-option>
        </a-select>
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-024-001 — 空結果メッセージは別描画
         （a-table の emptyText slot は BaseDataTable の動的 slot ループで
         安全に転送できない）。 -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="account-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="アカウント一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="account_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button type="primary" @click="goCreate">
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'login_id'">
          <a
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as AccountListItem)"
          >
            {{ (record as AccountListItem).login_id }}
          </a>
        </template>
        <template v-else-if="column.key === 'paper_flg'">
          <span
            v-if="(record as AccountListItem).paper_flg"
            class="material-icons text-success text-xl"
            aria-label="紙版あり"
          >check_circle</span>
          <span
            v-else
            class="material-icons text-text-disabled text-xl"
            aria-label="紙版なし"
          >remove_circle_outline</span>
        </template>
        <template v-else-if="column.key === 'denshi_flg'">
          <span
            v-if="(record as AccountListItem).denshi_flg"
            class="material-icons text-success text-xl"
            aria-label="電子版あり"
          >check_circle</span>
          <span
            v-else
            class="material-icons text-text-disabled text-xl"
            aria-label="電子版なし"
          >remove_circle_outline</span>
        </template>
        <template v-else-if="column.key === 'account_lock_flg'">
          <span
            v-if="(record as AccountListItem).account_lock_flg"
            class="inline-flex items-center gap-1 bg-error-subtle text-error px-2 py-0.5 rounded text-xs font-bold"
          >
            <span class="material-icons text-sm">lock</span>
            ロック
          </span>
          <span
            v-else
            class="material-icons text-text-disabled text-xl"
            aria-label="ロックなし"
          >lock_open</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            :can-edit="false"
            @delete="askDelete(record as AccountListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
