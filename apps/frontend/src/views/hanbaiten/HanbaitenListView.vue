<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { type TableColumnsType } from 'ant-design-vue';
import { confirmDelete } from '@/utils/confirm';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import {
  listHanbaiten,
  removeHanbaiten,
  type HanbaitenListItem,
  type ListHanbaitenQuery,
} from '@/api/hanbaiten/hanbaiten';

// 機能定義 1.1 / 2.1 — 廃店フラグが立っているものは販売店の一覧に表示しない。
// haiten_flg=true をチェックした場合のみ廃店レコードも含めて検索する。

// 有効単価フラグ filter — 単価一覧(SCR-006)と同一のトライステートラジオ。
// '' = 両方（既定）、'1' = 有効単価を参照する販売店のみ、'0' = 失効単価を参照する
// 販売店のみ。検索クリアで '' に戻す。BE へは toBoolean で boolean | undefined に
// 変換して送る（active_tanka_flg）。
type ActiveFlgFilter = '' | '1' | '0';

interface HanbaitenFilters {
  hanbaiten_code: string;
  hanbaiten_name: string;
  tel: string;
  fax: string;
  address: string;
  shocho_name: string;
  /** 既定 false — 廃店フラグの立つレコードを除外する。 */
  haiten_flg: boolean;
  /** 有効単価フラグ（SCR-021 error gate 連携・顧客要件2026-07 改訂）。 */
  active_tanka_flg: ActiveFlgFilter;
  /**
   * [staff-ja-filter] NICHINO_STAFF（session.ja_id == null）は検索前に
   * BaseJaDropdown で JA を選ぶ。null = 未選択で、選ぶまで一覧は空。
   * 非 staff ロールは無視し、BE は session.ja_id を使う。
   */
  ja_id: number | null;
}

const router = useRouter();
const route = useRoute();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();

// 権限ゲート（seeder.md §3 hanbaiten マトリクス）。
// CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN は {view, create, update, delete}。
// NICHINO_STAFF は `hanbaiten.daiko_input`（代行入力）のみ — 同じルートの
// メニューでこの画面に到達し、daiko_input で create / update 可。
// 削除は staff 不可（代行入力に削除権限は含まれない）。
const canCreate = computed(
  () =>
    authStore.hasPermission('hanbaiten.create') ||
    authStore.hasPermission('hanbaiten.daiko_input'),
);
const canUpdate = computed(
  () =>
    authStore.hasPermission('hanbaiten.update') ||
    authStore.hasPermission('hanbaiten.daiko_input'),
);
const canDelete = computed(() => authStore.hasPermission('hanbaiten.delete'));

// [staff-ja-filter] NICHINO_STAFF は session.ja_id を持たない — 検索/一覧の
// 各呼び出しは検索フォーム上部の BaseJaDropdown からの明示 ja_id を伴う。
// role_code 文字列で分岐しないよう daiko_input 権限で判定する。
const isStaff = computed(() =>
  authStore.hasPermission('hanbaiten.daiko_input'),
);

const {
  state, loading, total, onChange, applyFilters, searchActions,
} =
  useTableQuery<HanbaitenFilters>({
    defaultFilters: {
      hanbaiten_code: '',
      hanbaiten_name: '',
      tel: '',
      fax: '',
      address: '',
      shocho_name: '',
      haiten_flg: false,
      active_tanka_flg: '',
      ja_id: null,
    },
    // 既定は updated_at desc（最終更新順）で、新規作成・インポート・更新された
    // 販売店が先頭に来る。hanbaiten_code / hanbaiten_name は列ソート可
    // （画面設計書 §8.1）。列ソート解除でこの既定に戻る。
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<HanbaitenListItem[]>([]);

// 列順は index.html + screen-design.md v1.2 §検索結果テーブルに準拠:
// 販売店コード / 販売店名 / JA(コード+名称) / 都道府県 / 郵便番号 / 住所 /
// 電話番号 / FAX / 所長名 / 委託区分 / 配達手数料支払サイクル /
// 振込手数料負担区分 / 廃店フラグ / 操作。
// ソート可能は 機能定義 8.1 の hanbaiten_code, hanbaiten_name のみ。
// ソートアイコン出現時もレイアウトを安定させるため width を明示。
const columns: TableColumnsType = [
  { title: '販売店コード', dataIndex: 'hanbaiten_code', key: 'hanbaiten_code', sorter: true, width: 140 },
  { title: '販売店名', dataIndex: 'hanbaiten_name', key: 'hanbaiten_name', sorter: true, width: 200 },
  { title: 'JA', key: 'ja', width: 200 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_name', width: 120 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 110 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 260 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 140 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 140 },
  { title: '所長名', dataIndex: 'shocho_name', key: 'shocho_name', width: 140 },
  { title: '委託区分', dataIndex: 'itaku_kubun', key: 'itaku_kubun', align: 'center', width: 110 },
  { title: '配達手数料支払サイクル', dataIndex: 'haitatsuryo_shiharai_cycle', key: 'haitatsuryo_shiharai_cycle', align: 'center', width: 180 },
  { title: '振込手数料負担区分', dataIndex: 'furikomi_tesuryo_futan_kubun', key: 'furikomi_tesuryo_futan_kubun', align: 'center', width: 160 },
  { title: '廃店フラグ', dataIndex: 'haiten_flg', key: 'haiten_flg', align: 'center', width: 110 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

/** 有効単価フラグのラジオ値 → BE 送信用 boolean | undefined（'' は両方=送らない）。 */
function toBoolean(flag: ActiveFlgFilter): boolean | undefined {
  if (flag === '1') return true;
  if (flag === '0') return false;
  return undefined;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListHanbaitenQuery = {
      hanbaiten_code: state.filters.hanbaiten_code || undefined,
      hanbaiten_name: state.filters.hanbaiten_name || undefined,
      tel: state.filters.tel || undefined,
      fax: state.filters.fax || undefined,
      address: state.filters.address || undefined,
      shocho_name: state.filters.shocho_name || undefined,
      // true で廃店行を含む。false は BE 既定（廃店を除外）。spec が
      // `haiten_flg: true` の送信を検証できるよう両状態を明示送信。
      haiten_flg: state.filters.haiten_flg,
      // 有効単価フラグ: '' は両方（送らない）、'1'→true / '0'→false のみ送信。
      active_tanka_flg: toBoolean(state.filters.active_tanka_flg),
      // [staff-ja-filter] 設定時のみ送信 — 非 staff はキーを省略し
      // BE は session.ja_id にフォールバック。
      ja_id: state.filters.ja_id ?? undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ListHanbaitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listHanbaiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // 想定内・無視: error-handler.ts が FORBIDDEN / 500
    // （ACSMS-MSG-018-002 / ACSMS-MSG-018-003）を既にトースト済み。再throw は
    // onMounted の fire-and-forget で unhandled rejection になる
    // （vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

// [staff-ja-required] NICHINO_STAFF では JA が必須検索条件。一覧は空で始まり
// JA 選択後に初めて表示 — 全テナントの自動ロードはしない。未選択の間は
// 「結果なし」でなくプロンプトを表示。非 staff は影響なし（session.ja_id で
// スコープされ、従来通り mount 時に自動ロード）。
const staffMustPickJa = computed(
  () => isStaff.value && state.filters.ja_id == null,
);

// staff の JA ドロップダウンのフィールド必須エラー。JA 未選択で検索したとき set、
// JA 選択 / フィルタリセットで解除。
const jaRequiredError = ref(false);

// 検索を実行。staff は JA 未選択なら空リストで短絡（JA 必須）。非 staff は常に fetch。
function runSearch(): void {
  if (staffMustPickJa.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  void fetchList();
}

onMounted(() => {
  // [scr021-deep-link] 配達手数料支払情報出力 (SCR-021) の失効単価エラーから
  // ?inactive_tanka=1 で遷移してくる導線。有効単価フラグを「無効(失効単価参照)」で
  // 初期選択する。
  if (route.query.inactive_tanka === '1') {
    state.filters.active_tanka_flg = '0';
    applyFilters({ ...state.filters });
  }
  // staff: JA 選択まで一覧を空に保つ（代行検索は JA 選択が前提）。
  // 非 staff: 従来通りスコープ済み一覧を自動ロード。
  if (!isStaff.value) void fetchList();
});

function onJaFilterChange(v: number | null): void {
  // [staff-ja-filter] 新しい JA をフィルタに固定し即再取得 — JA 切替後に
  // 検索クリック不要。JA クリア（v === null）で空プロンプト状態に戻る。
  state.filters.ja_id = v;
  // JA 選択で必須を満たす → フィールドエラー解除。
  if (v != null) jaRequiredError.value = false;
  applyFilters({ ...state.filters });
  runSearch();
}

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // テキストフィルタを trim（haiten_flg は checkbox）。代行検索は JA選択が前提 —
  // JA なしの staff はフィールドを必須にして中断（return false）。
  beforeSearch() {
    state.filters.hanbaiten_code = state.filters.hanbaiten_code.trim();
    state.filters.hanbaiten_name = state.filters.hanbaiten_name.trim();
    state.filters.tel = state.filters.tel.trim();
    state.filters.fax = state.filters.fax.trim();
    state.filters.address = state.filters.address.trim();
    state.filters.shocho_name = state.filters.shocho_name.trim();
    if (staffMustPickJa.value) {
      jaRequiredError.value = true;
      rows.value = [];
      total.value = 0;
      return false;
    }
    jaRequiredError.value = false;
  },
  // 実リセット時: 必須フラグを解除。staff は ja_id null なので runSearch が
  // 一覧を空に保ち JA プロンプト表示、非 staff は再ロード。
  afterReset() {
    jaRequiredError.value = false;
  },
  clearFetch: runSearch,
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  runSearch();
}

function goCreate(): void {
  // [staff-ja-prefill] NICHINO_STAFF が検索フィルタで JA 選択済みのとき、
  // その JA を Vue Router の history state（window.history.state.jaId）で
  // 登録フォームへ渡す — query param ではなく URL を `/hanbaiten/create` に
  // 保つため（顧客決定 2026-06）。フォームは事前選択、staff は変更可。
  // JA スコープのロールは渡さず BE が session.ja_id を使う。
  if (isStaff.value && state.filters.ja_id != null) {
    void router.push({
      name: 'HanbaitenCreate',
      state: { jaId: state.filters.ja_id },
    });
    return;
  }
  void router.push({ name: 'HanbaitenCreate' });
}

function goEdit(row: HanbaitenListItem): void {
  void router.push({ name: 'HanbaitenEdit', params: { id: row.hanbaiten_id } });
}

function askDelete(row: HanbaitenListItem): void {
  // ACSMS-MSG-018-005.
  confirmDelete('この販売店を削除してもよろしいですか？', async () => {
    try {
      await removeHanbaiten(row.hanbaiten_id);
      // notify.deleted() は '削除しました。'（ACSMS-MSG-018-006）を出す。
      notify.deleted();
      await fetchList();
    } catch {
      // axios interceptor が 409 CONFLICT（ACSMS-MSG-018-004）と 500
      // （ACSMS-MSG-018-003）を処理。view で再トーストしない
      // （vue.md §Error Handling Architecture）。
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4列グリッド。7フィールドが2行に折り返す。
         [staff-ja-filter] NICHINO_STAFF はフォーム末尾に8番目のセル
         （JA picker）が付き、検索パネルが一貫したブロックになる。JA picker は
         変更時に即再取得（検索クリック不要） — staff の初回着地時は他が空のため。 -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="hanbaiten-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">販売店コード</span>
        <a-input
          id="hanbaiten-filter-1"
          v-model:value="state.filters.hanbaiten_code"
          placeholder="販売店コード"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="hanbaiten-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">販売店名</span>
        <a-input
          id="hanbaiten-filter-2"
          v-model:value="state.filters.hanbaiten_name"
          placeholder="販売店名"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="hanbaiten-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">電話番号</span>
        <a-input
          id="hanbaiten-filter-3"
          v-model:value="state.filters.tel"
          placeholder="電話番号"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="hanbaiten-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">FAX</span>
        <a-input
          id="hanbaiten-filter-4"
          v-model:value="state.filters.fax"
          placeholder="FAX番号"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="hanbaiten-filter-5" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">住所</span>
        <a-input
          id="hanbaiten-filter-5"
          v-model:value="state.filters.address"
          placeholder="住所"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <label for="hanbaiten-filter-6" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">所長名</span>
        <a-input
          id="hanbaiten-filter-6"
          v-model:value="state.filters.shocho_name"
          placeholder="所長名"
          allow-clear
          class="flex-1 min-w-0"
        />
      </label>
      <div class="flex items-center gap-2">
        <!-- 不可視スペーサーラベルで他セル（販売店コード / 電話番号 / 住所 …）の
             ラベル列幅に合わせ、checkbox を上の入力ボックスと揃える
             （セル左端に寄せない）。 -->
        <span
          class="text-sm font-medium whitespace-nowrap invisible"
          aria-hidden="true"
        >
          廃店フラグ
        </span>
        <a-checkbox name="haiten_flg" v-model:checked="state.filters.haiten_flg">
          <span class="text-sm font-medium whitespace-nowrap text-text-main">
            廃店フラグ
          </span>
        </a-checkbox>
      </div>
      <!-- 有効単価フラグ（SCR-021 error gate 連携・顧客要件2026-07 改訂）。単価一覧
           (SCR-006)と同一のトライステートラジオ: 有効=有効単価を参照する販売店のみ、
           無効=失効単価を参照する販売店のみ、未選択=両方。SCR-021 の失効単価エラー
           からは ?inactive_tanka=1 で「無効」が初期選択される。 -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium whitespace-nowrap text-text-main">有効単価フラグ</span>
        <a-radio-group
          name="active_tanka_flg"
          v-model:value="state.filters.active_tanka_flg"
          data-test="active-tanka-filter"
        >
          <a-radio value="1">有効</a-radio>
          <a-radio value="0">無効</a-radio>
        </a-radio-group>
      </div>
      <!-- [staff-ja-required] NICHINO_STAFF 代行検索の末尾セル。
           JA は必須条件: 一覧は空で始まり JA 選択後に表示（選択でそのテナントに
           スコープして再取得）。* マーカーが必須を示す。 -->
      <div
        v-if="isStaff"
        class="flex items-start gap-2 text-sm font-medium text-text-main"
        data-test="hanbaiten-staff-ja-filter"
      >
        <label
          for="hanbaiten-filter-staff-ja"
          class="flex items-center gap-1 whitespace-nowrap pt-1.5"
        >
          <span>JA名</span>
          <span class="text-error">*</span>
        </label>
        <div class="flex-1">
          <BaseJaDropdown
            id="hanbaiten-filter-staff-ja"
            :value="state.filters.ja_id"
            placeholder=""
            class="w-full"
            @update:value="onJaFilterChange"
          />
          <span
            v-if="jaRequiredError"
            class="text-error text-xs mt-1 block"
            data-test="hanbaiten-staff-ja-error"
          >
            必須項目です。
          </span>
        </div>
      </div>
    </BaseSearchForm>

    <!-- ACSMS-MSG-018-001 — 検索結果が見つかりませんでした。
         a-table の #emptyText slot は BaseDataTable の動的 slot ループで
         安全に転送できないためテーブル外で描画。JA 未選択の staff（検索未実行）
         では抑制 — その状態は必須フィールドが担う。 -->
    <p
      v-if="!loading && total === 0 && !staffMustPickJa"
      class="text-text-description text-sm"
      data-test="hanbaiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="販売店一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="hanbaiten_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <!-- 販売店情報登録 は全ロールで表示、create 権限がないとき無効化。
             JA フィルタなしの staff は登録フォーム内で選択する。 -->
        <a-button
          type="primary"
          :disabled="!canCreate"
          @click="goCreate"
        >
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          販売店情報登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'hanbaiten_code'">
          <!-- hanbaiten_code が編集フォームを開くクリック対象。hanbaiten.update
               があるときのみアンカー化 — なければプレーンテキスト
               （403リバウンドの dead link を避ける）。 -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as HanbaitenListItem)"
          >
            {{ (record as HanbaitenListItem).hanbaiten_code }}
          </a>
          <span v-else>{{ (record as HanbaitenListItem).hanbaiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'ja'">
          <span class="whitespace-nowrap">{{ (record as HanbaitenListItem).ja_code }}</span>
          <span class="ml-1">{{ (record as HanbaitenListItem).ja_name }}</span>
        </template>
        <template v-else-if="column.key === 'itaku_kubun'">
          {{ codes.label('ITAKU_KUBUN', (record as HanbaitenListItem).itaku_kubun) }}
        </template>
        <template v-else-if="column.key === 'haitatsuryo_shiharai_cycle'">
          <template v-if="(record as HanbaitenListItem).haitatsuryo_shiharai_cycle != null">
            {{ (record as HanbaitenListItem).haitatsuryo_shiharai_cycle }}ヵ月
          </template>
        </template>
        <template v-else-if="column.key === 'furikomi_tesuryo_futan_kubun'">
          {{ codes.label('TESURYO_KUBUN', (record as HanbaitenListItem).furikomi_tesuryo_futan_kubun) }}
        </template>
        <template v-else-if="column.key === 'haiten_flg'">
          <span v-if="(record as HanbaitenListItem).haiten_flg">廃店</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集リンクは意図的に非表示 — 入口は上の hanbaiten_code セル。
               削除は hanbaiten.delete がないとき表示のまま無効化（NICHINO_STAFF）。 -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as HanbaitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
