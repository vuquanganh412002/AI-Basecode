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
import { useCodesStore } from '@/stores/codes.store';
import { formatYen, formatTaxRate, formatDate } from '@/utils/formatters';
import {
  listTanka,
  removeTanka,
  type TankaListItem,
  type ListTankaQuery,
} from '@/api/tanka/tanka';

// 有効単価フラグ フィルタ — 2つのオン状態を持つラジオ。'' = 両方（既定、
// api.md §4.3「省略時は両方」）、'1' = 有効中のみ、'0' = 停止中のみ。検索クリアで
// '' に戻る。wire に載せる前に boolean | undefined へ変換（BE は swagger 宣言の
// `active_flg: boolean` を期待）。
type ActiveFlgFilter = '' | '1' | '0';

// キャンペーンフラグ フィルタ — 有効単価フラグと同じ三状態。
// '' = 両方（既定）、'1' = 有効のみ、'0' = 無効のみ。
type CampaignFlgFilter = '' | '1' | '0';

interface TankaFilters {
  /**
   * ラジオ: ''（未選択 = 全件）, '1'（新聞購読料）, '2'（配達手数料）。
   * 画面項目定義 row 1.0。
   */
  tanka_type: '' | '1' | '2';
  tanka_name: string;
  /** YYYY-MM-DD または ''。 */
  tekiyo_start_date: string;
  /** YYYY-MM-DD または ''。 */
  tekiyo_end_date: string;
  active_flg: ActiveFlgFilter;
  campaign_flg: CampaignFlgFilter;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();

// 権限ゲート（seeder.md §3 tanka.* マトリクス）:
//   role 1/2 NICHINO_ADMIN/STAFF: tanka.* なし（router meta.permission で除外）。
//   role 3/4/5 CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN: view + CRUD 全て。
// UX（vue.md §Permission-aware list buttons）: 非表示でなく無効化 —
// ロール切替時にアフォーダンスを残す。
const canCreate = computed(() => authStore.hasPermission('tanka.create'));
const canUpdate = computed(() => authStore.hasPermission('tanka.update'));
const canDelete = computed(() => authStore.hasPermission('tanka.delete'));

const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<TankaFilters>({
    defaultFilters: {
      tanka_type: '',
      tanka_name: '',
      tekiyo_start_date: '',
      tekiyo_end_date: '',
      active_flg: '',
      campaign_flg: '',
    },
    // 機能定義 §2.2 — 検索結果一覧は常に最新順で表示される.
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<TankaListItem[]>([]);

const columns: TableColumnsType = [
  { title: '単価種別', dataIndex: 'tanka_type', key: 'tanka_type', width: 130 },
  { title: '単価コード', dataIndex: 'tanka_code', key: 'tanka_code', sorter: true, width: 140 },
  { title: '単価名', dataIndex: 'tanka_name', key: 'tanka_name', sorter: true, width: 240 },
  { title: '適用開始日', dataIndex: 'tekiyo_start_date', key: 'tekiyo_start_date', sorter: true, width: 140 },
  { title: '適用終了日', dataIndex: 'tekiyo_end_date', key: 'tekiyo_end_date', sorter: true, width: 140 },
  // 顧客要望 2026-05-11: 有効単価フラグ列を 適用終了日 と 単価（税込）の間に挿入。
  // SearchTankaDto.TANKA_SEARCH_SORT_BY の whitelist によりソート不可 —
  // ソート可能軸は 単価コード / 単価名 / 適用開始日 / 適用終了日 のみ。
  { title: '有効単価フラグ', dataIndex: 'active_flg', key: 'active_flg', align: 'center', width: 130 },
  { title: 'キャンペーンフラグ', dataIndex: 'campaign_flg', key: 'campaign_flg', align: 'center', width: 150 },
  { title: '単価（税込）', dataIndex: 'kingaku_zeikomi', key: 'kingaku_zeikomi', align: 'right', width: 130 },
  { title: '単価（税抜）', dataIndex: 'kingaku_zeinuki', key: 'kingaku_zeinuki', align: 'right', width: 130 },
  { title: '税率', dataIndex: 'tax_rate', key: 'tax_rate', align: 'right', width: 90 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

function toBoolean(flag: ActiveFlgFilter | CampaignFlgFilter): boolean | undefined {
  if (flag === '1') return true;
  if (flag === '0') return false;
  return undefined;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListTankaQuery = {
      tanka_type: state.filters.tanka_type ? Number(state.filters.tanka_type) : undefined,
      tanka_name: state.filters.tanka_name || undefined,
      tekiyo_start_date: state.filters.tekiyo_start_date || undefined,
      tekiyo_end_date: state.filters.tekiyo_end_date || undefined,
      active_flg: toBoolean(state.filters.active_flg),
      campaign_flg: toBoolean(state.filters.campaign_flg),
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
    };
    const res = await listTanka(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // 想定内・無視: error-handler.ts が FORBIDDEN / 500 を既にトースト済み。
    // 再throw は onMounted の fire-and-forget で unhandled rejection になる
    // （vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // trim で "  基本  " → "基本"。paste/IME 由来の空白で ILIKE を広げない。
  // 入力に反映させるため in-place で mutate（vue.md §5a）。
  beforeSearch() {
    state.filters.tanka_name = state.filters.tanka_name.trim();
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'TankaCreate' });
}

function goEdit(row: TankaListItem): void {
  void router.push({ name: 'TankaEdit', params: { id: row.tanka_id } });
}

function askDelete(row: TankaListItem): void {
  // ACSMS-MSG-002-005 — 確認文言は screen-design.md からそのまま。
  confirmDelete('この単価を削除してもよろしいですか？', async () => {
    try {
      await removeTanka(row.tanka_id);
      notify.deleted();  // ACSMS-MSG-002-007 — '削除しました。'
      await fetchList();
    } catch {
      // axios interceptor が 409 CONFLICT（ACSMS-MSG-002-006）と 500
      // （ACSMS-MSG-002-004）を処理。view で再トーストしない
      // （vue.md §Error Handling Architecture rule 1）。
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4列グリッド。5番目（有効単価フラグ）は次行に折り返す。
         ACSMS-SCR-002/index.html に準拠
         （種別 radio / 名 text / 開始日 / 終了日 // フラグ radio）。 -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 単価種別 — ラジオ（画面項目定義 row 1.0）。"未選択" は暗黙:
           値 '' でフィルタ解除、onClear 後の既定状態。 -->
      <div class="flex items-start gap-2 flex-wrap text-sm font-medium text-text-main">
        <span class="form-item-title whitespace-nowrap leading-[22px]">単価種別</span>
        <a-radio-group
          name="tanka_type"
          id="tanka-filter-1"
          role="radiogroup"
          aria-label="単価種別"
          v-model:value="state.filters.tanka_type"
        >
          <a-radio
            v-for="opt in codes.options('TANKA_TYPE')"
            :key="opt.value"
            :value="String(opt.value)"
          >
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </div>

      <label for="tanka-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">単価名</span>
        <a-input
          id="tanka-filter-2"
          v-model:value="state.filters.tanka_name"
          placeholder="単価名"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>

      <!-- 適用開始日 / 適用終了日 — <a-date-picker>。format='YYYY/MM/DD'（表示）+
           value-format='YYYY-MM-DD'（wire）。native date は非JPロケールで
           dd/mm/yyyy 表示になるため、OSロケールに依存しない和式表示に固定。 -->
      <label for="tanka-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">適用開始日</span>
        <a-date-picker
          id="tanka-filter-3"
          v-model:value="state.filters.tekiyo_start_date"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="YYYY/MM/DD"
          class="flex-1 min-w-0"
        />
      </label>

      <label for="tanka-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">適用終了日</span>
        <a-date-picker
          id="tanka-filter-4"
          v-model:value="state.filters.tekiyo_end_date"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="YYYY/MM/DD"
          class="flex-1 min-w-0"
        />
      </label>

      <!-- 有効単価フラグ — ラジオ。オン状態は 有効=1 / 無効=0。未選択（''）が
           既定で「両方を返却」（api.md §4.3）。検索クリアで '' に戻る。 -->
      <div class="flex items-start gap-2 flex-wrap text-sm font-medium text-text-main">
        <span class="form-item-title whitespace-nowrap leading-[22px]">有効単価フラグ</span>
        <a-radio-group
          name="active_flg"
          id="tanka-filter-5"
          role="radiogroup"
          aria-label="有効単価フラグ"
          v-model:value="state.filters.active_flg"
        >
          <a-radio value="1">有効</a-radio>
          <a-radio value="0">無効</a-radio>
        </a-radio-group>
      </div>

      <!-- キャンペーンフラグ — ラジオ。有効単価フラグと同様。未選択（''）=
           両方を返却。検索クリアで '' に戻る。 -->
      <div class="flex items-start gap-2 flex-wrap text-sm font-medium text-text-main">
        <span class="form-item-title whitespace-nowrap leading-[22px]">キャンペーンフラグ</span>
        <a-radio-group
          name="campaign_flg"
          id="tanka-filter-6"
          role="radiogroup"
          aria-label="キャンペーンフラグ"
          v-model:value="state.filters.campaign_flg"
        >
          <a-radio value="1">有効</a-radio>
          <a-radio value="0">無効</a-radio>
        </a-radio-group>
      </div>
    </BaseSearchForm>

    <!-- ACSMS-MSG-002-001 — 空結果メッセージはテーブル外の兄弟 <p> で描画。
         BaseDataTable の動的 slot ループは #emptyText の null slotProps で
         crash する（vue.md §List view rule 4）。 -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="tanka-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="単価一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="tanka_id"
      @change="onPageChange"
    >
      <template #headerActions>
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
        <template v-if="column.key === 'tanka_type'">
          <!-- BE は数値 tanka_type を返す。表示ラベルは m_code から
               （実行時編集可、リネームで FE 再デプロイ不要、vue.md §Code Master）。 -->
          {{ codes.label('TANKA_TYPE', (record as TankaListItem).tanka_type) }}
        </template>
        <template v-else-if="column.key === 'tanka_code'">
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as TankaListItem)"
          >
            {{ (record as TankaListItem).tanka_code }}
          </a>
          <span v-else>{{ (record as TankaListItem).tanka_code }}</span>
        </template>
        <template v-else-if="column.key === 'tanka_name'">
          <!-- プレーンテキスト — 編集リンクは tanka_code 側
               （プロジェクト規約、他の CRUD 一覧も同様）。 -->
          <span>{{ (record as TankaListItem).tanka_name }}</span>
        </template>
        <template v-else-if="column.key === 'tekiyo_start_date'">
          {{ formatDate((record as TankaListItem).tekiyo_start_date) }}
        </template>
        <template v-else-if="column.key === 'tekiyo_end_date'">
          <!-- 画面項目定義 row 10 — NULL（無期限）は「-」表示. -->
          {{
            (record as TankaListItem).tekiyo_end_date
              ? formatDate((record as TankaListItem).tekiyo_end_date)
              : '-'
          }}
        </template>
        <template v-else-if="column.key === 'active_flg'">
          <!-- ステータスバッジ — 有効=緑 / 無効=赤。密なテーブルでは色が
               意味を担う。他のステータス列と同じ規約。 -->
          <a-tag :color="(record as TankaListItem).active_flg ? 'success' : 'error'">
            {{ (record as TankaListItem).active_flg ? '有効' : '無効' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'campaign_flg'">
          <!-- キャンペーンフラグ — 有効=緑 / 無効=赤、有効単価フラグと同様。 -->
          <a-tag :color="(record as TankaListItem).campaign_flg ? 'success' : 'error'">
            {{ (record as TankaListItem).campaign_flg ? '有効' : '無効' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'kingaku_zeikomi'">
          {{ formatYen((record as TankaListItem).kingaku_zeikomi) }}
        </template>
        <template v-else-if="column.key === 'kingaku_zeinuki'">
          {{ formatYen((record as TankaListItem).kingaku_zeinuki) }}
        </template>
        <template v-else-if="column.key === 'tax_rate'">
          {{ formatTaxRate((record as TankaListItem).tax_rate) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集は非表示 — 入口は上の tanka_code / tanka_name セル。
               削除は tanka.delete がないとき表示のまま無効化。 -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as TankaListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
