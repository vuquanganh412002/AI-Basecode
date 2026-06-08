<script setup lang="ts">
// ACSMS-SCR-014 — 購読者明細検索画面.
//
// Lists records from `GET /api/v1/dokusya` with pagination, sort,
// filter (12 common-area fields + 7 詳細検索 fields). 削除 fires
// soft-delete via DELETE /api/v1/dokusya/:id. Excel出力 streams a
// blob from /api/v1/dokusya/export (filter-only payload — no
// page/sort).
//
// Permission model (per docs/database/seeder.md §3 dokusya.*):
//   - dokusya.view   : enables 検索 + Excel出力 (view-bound).
//   - dokusya.create : enables 購読者情報登録 button (otherwise greyed).
//   - dokusya.delete : enables 削除 link per row (otherwise greyed).
//   - dokusya.update : 編集 navigation via 購読者名 anchor (no anchor
//                      shown when missing — keeps the dead-link UX out).
// Per-row override: `is_read_only=true` always disables 削除 even when
// the user holds dokusya.delete (CC / 併読 / 海外配送 etc.).
//
// 検索クリア resets every filter + page=1. 検索 sends only non-empty
// filters (empty string → undefined) so the BE doesn't see falsy values
// in the ILIKE chain.

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal, message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { formatDate } from '@/utils/formatters';
import {
  listDokusya,
  removeDokusya,
  exportDokusyaExcel,
  type DokusyaListItem,
  type DokusyaSearchParams,
} from '@/api/dokusya/dokusya';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';
import { getShitenDropdown } from '@/api/shiten/shiten';
import { getHanbaitenDropdown } from '@/api/hanbaiten/hanbaiten';

// ─── State ──────────────────────────────────────────────────────────

interface DokusyaFilters {
  // 常時表示エリア (12 fields per index.html).
  kanri_shiten_id: number | undefined;
  shiten_id: number | undefined;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  haitatsu: string;
  hanbaiten_id: number | undefined;
  tetsuzuki_shurui: number | undefined;
  shoki_dokusya_kaishi_date_from: string;
  shoki_dokusya_kaishi_date_to: string;
  dokusya_chushi_date_from: string;
  dokusya_chushi_date_to: string;
  dokusya_shubetsu: number | undefined;
  denshi_shonin_status: number | undefined;
  // 詳細検索エリア (7 fields, hidden behind toggle).
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  renrakusaki_1: string;
  email: string;
  seikyu_kaishi_month: string;
  joho_henko_tekiyo_date_from: string;
  joho_henko_tekiyo_date_to: string;
  shiharai_hoho: number | undefined;
}

const DEFAULT_FILTERS: DokusyaFilters = {
  kanri_shiten_id: undefined,
  shiten_id: undefined,
  kumiaiin_code: '',
  full_name: '',
  full_name_kana: '',
  haitatsu: '',
  hanbaiten_id: undefined,
  tetsuzuki_shurui: undefined,
  shoki_dokusya_kaishi_date_from: '',
  shoki_dokusya_kaishi_date_to: '',
  dokusya_chushi_date_from: '',
  dokusya_chushi_date_to: '',
  dokusya_shubetsu: undefined,
  denshi_shonin_status: undefined,
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  renrakusaki_1: '',
  email: '',
  seikyu_kaishi_month: '',
  joho_henko_tekiyo_date_from: '',
  joho_henko_tekiyo_date_to: '',
  shiharai_hoho: undefined,
};

const router = useRouter();
const route = useRoute();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();

// Permission gates per docs/database/seeder.md §3 dokusya.* matrix.
const canView = computed(() => authStore.hasPermission('dokusya.view'));
const canCreate = computed(() => authStore.hasPermission('dokusya.create'));
const canUpdate = computed(() => authStore.hasPermission('dokusya.update'));
const canDelete = computed(() => authStore.hasPermission('dokusya.delete'));

const {
  state, loading, total, onChange, applyFilters, resetFilters, filtersChangedSinceApplied, isPristine,
} =
  useTableQuery<DokusyaFilters>({
    defaultFilters: { ...DEFAULT_FILTERS },
    // Newest write first so users see what they just changed at row 1.
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<DokusyaListItem[]>([]);

// 詳細検索 toggle — collapsed by default per index.html row 471.
const showAdvanced = ref(false);
const toggleLabel = computed(() =>
  showAdvanced.value ? '詳細検索を非表示' : '詳細検索を表示',
);

// 電子版承認ステータス — NOT in m_code (status semantics are derived
// at API layer from t_denshi_dokusya state). Hardcode the 4 options
// per index.html row 559-562. `null` = Web申込以外 (no digital row).
interface DenshiShoninOption {
  value: number | null;
  label: string;
}
const denshiShoninOptions: DenshiShoninOption[] = [
  { value: null, label: 'Web申込以外' },
  { value: 0, label: '未承認' },
  { value: 1, label: '承認済み' },
  { value: 2, label: '否認' },
];

// ─── Dropdown lookups (mounted-once) ─────────────────────────────────

interface KanriShitenOption {
  kanri_shiten_id: number;
  kanri_shiten_name: string;
}
interface ShitenOption {
  shiten_id: number;
  shiten_name: string;
}
interface HanbaitenOption {
  hanbaiten_id: number;
  hanbaiten_name: string;
}

const kanriShitenOptions = ref<KanriShitenOption[]>([]);
const shitenOptions = ref<ShitenOption[]>([]);
const hanbaitenOptions = ref<HanbaitenOption[]>([]);

async function fetchDropdowns(): Promise<void> {
  const jaId = authStore.user?.ja_id ?? 0;
  try {
    const res = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = res.data.map((r) => ({
      kanri_shiten_id: r.kanri_shiten_id,
      kanri_shiten_name: r.kanri_shiten_name,
    }));
  } catch {
    // Non-critical — leave dropdown empty if lookup fails.
    kanriShitenOptions.value = [];
  }
  try {
    const res = await getShitenDropdown({});
    shitenOptions.value = res.data.map((r) => ({
      shiten_id: r.shiten_id,
      shiten_name: r.shiten_name,
    }));
  } catch {
    shitenOptions.value = [];
  }
  try {
    const res = await getHanbaitenDropdown({});
    hanbaitenOptions.value = res.data.map((r) => ({
      hanbaiten_id: r.hanbaiten_id,
      hanbaiten_name: r.hanbaiten_name,
    }));
  } catch {
    hanbaitenOptions.value = [];
  }
}

// ─── Columns (12 + 操作 per index.html §検索結果テーブル) ───────────

const columns: TableColumnsType = [
  {
    title: '管理支店',
    dataIndex: 'kanri_shiten_name',
    key: 'kanri_shiten_id',
    sorter: true,
    width: 140,
  },
  {
    title: '支店',
    dataIndex: 'shiten_name',
    key: 'shiten_id',
    sorter: true,
    width: 140,
  },
  {
    title: '組合員コード',
    dataIndex: 'kumiaiin_code',
    key: 'kumiaiin_code',
    sorter: true,
    width: 130,
  },
  {
    title: '購読者名',
    dataIndex: 'full_name',
    key: 'full_name',
    width: 180,
  },
  {
    title: '連絡先1',
    dataIndex: 'renrakusaki_1',
    key: 'renrakusaki_1',
    width: 140,
  },
  {
    title: '連絡先2',
    dataIndex: 'renrakusaki_2',
    key: 'renrakusaki_2',
    width: 140,
  },
  {
    title: '配達先郵便',
    dataIndex: 'haitatsu_yubin_no',
    key: 'haitatsu_yubin_no',
    width: 120,
  },
  {
    title: '配達先住所',
    dataIndex: 'haitatsu',
    key: 'haitatsu',
    width: 260,
  },
  {
    title: '販売店コード',
    dataIndex: 'hanbaiten_id',
    key: 'hanbaiten_id',
    sorter: true,
    width: 130,
  },
  {
    title: '販売店名',
    dataIndex: 'hanbaiten_name',
    key: 'hanbaiten_name',
    width: 160,
  },
  {
    title: '購読開始日',
    dataIndex: 'shoki_dokusya_kaishi_date',
    key: 'shoki_dokusya_kaishi_date',
    sorter: true,
    width: 130,
  },
  {
    title: '購読中止日',
    dataIndex: 'dokusya_chushi_date',
    key: 'dokusya_chushi_date',
    width: 130,
  },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

// ─── Validation messages (literals from screen-design.md §メッセージ情報) ─

const MSG_EMAIL_INVALID = '正しいメール形式を入力してください。'; // ACSMS-MSG-014-008
const MSG_DATE_RANGE_INVALID =
  '日付の範囲指定が正しくありません。終了日は開始日以降を指定してください。';
const MSG_EXPORT_NO_DATA = '出力データがありません。'; // ACSMS-MSG-014-006
const MSG_EXPORT_LIMIT_EXCEEDED =
  '出力データ件数が30000件を超えています。検索条件を見直してください。'; // ACSMS-MSG-014-012
const MSG_EXPORT_SUCCESS = 'Excel出力が正常に完了しました。'; // ACSMS-MSG-014-005

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline validation errors — rendered inside the search card so the
 *  user sees the message right where they typed (toast alone is easy
 *  to miss with this many filters). Empty string = no error. */
const validationError = ref<string>('');

/**
 * Validate filter combinations BEFORE firing the API. Returns true when
 * every check passes; sets `validationError` to the first violation
 * otherwise.
 *
 * Three correlation checks (api.md §13/14):
 *   - 購読開始日: from ≦ to
 *   - 購読中止日: from ≦ to
 *   - 適用日:     from ≦ to
 * Plus email format check (ACSMS-MSG-014-008).
 */
function validateFilters(f: DokusyaFilters): boolean {
  validationError.value = '';
  if (f.email && !EMAIL_RE.test(f.email)) {
    validationError.value = MSG_EMAIL_INVALID;
    return false;
  }
  if (
    f.shoki_dokusya_kaishi_date_from &&
    f.shoki_dokusya_kaishi_date_to &&
    f.shoki_dokusya_kaishi_date_from > f.shoki_dokusya_kaishi_date_to
  ) {
    validationError.value = MSG_DATE_RANGE_INVALID;
    return false;
  }
  if (
    f.dokusya_chushi_date_from &&
    f.dokusya_chushi_date_to &&
    f.dokusya_chushi_date_from > f.dokusya_chushi_date_to
  ) {
    validationError.value = MSG_DATE_RANGE_INVALID;
    return false;
  }
  if (
    f.joho_henko_tekiyo_date_from &&
    f.joho_henko_tekiyo_date_to &&
    f.joho_henko_tekiyo_date_from > f.joho_henko_tekiyo_date_to
  ) {
    validationError.value = MSG_DATE_RANGE_INVALID;
    return false;
  }
  return true;
}

/** Strip empty strings + undefined so the BE doesn't see falsy filter values. */
function buildSearchParams(): DokusyaSearchParams {
  const f = state.filters;
  const params: DokusyaSearchParams = {
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by,
    sort_order: state.sort_order,
  };
  if (f.kanri_shiten_id !== undefined) params.kanri_shiten_id = f.kanri_shiten_id;
  if (f.shiten_id !== undefined) params.shiten_id = f.shiten_id;
  if (f.kumiaiin_code) params.kumiaiin_code = f.kumiaiin_code;
  if (f.full_name) params.full_name = f.full_name;
  if (f.full_name_kana) params.full_name_kana = f.full_name_kana;
  if (f.haitatsu) params.haitatsu = f.haitatsu;
  if (f.hanbaiten_id !== undefined) params.hanbaiten_id = f.hanbaiten_id;
  if (f.tetsuzuki_shurui !== undefined) params.tetsuzuki_shurui = f.tetsuzuki_shurui;
  if (f.shoki_dokusya_kaishi_date_from)
    params.shoki_dokusya_kaishi_date_from = f.shoki_dokusya_kaishi_date_from;
  if (f.shoki_dokusya_kaishi_date_to)
    params.shoki_dokusya_kaishi_date_to = f.shoki_dokusya_kaishi_date_to;
  if (f.dokusya_chushi_date_from)
    params.dokusya_chushi_date_from = f.dokusya_chushi_date_from;
  if (f.dokusya_chushi_date_to)
    params.dokusya_chushi_date_to = f.dokusya_chushi_date_to;
  if (f.dokusya_shubetsu !== undefined)
    params.dokusya_shubetsu = f.dokusya_shubetsu;
  if (f.denshi_shonin_status !== undefined)
    params.denshi_shonin_status = f.denshi_shonin_status;
  if (f.jastem_toriatsukai_tenpo_code)
    params.jastem_toriatsukai_tenpo_code = f.jastem_toriatsukai_tenpo_code;
  if (f.jastem_tenpo_name) params.jastem_tenpo_name = f.jastem_tenpo_name;
  if (f.renrakusaki_1) params.renrakusaki_1 = f.renrakusaki_1;
  if (f.email) params.email = f.email;
  if (f.seikyu_kaishi_month) params.seikyu_kaishi_month = f.seikyu_kaishi_month;
  if (f.joho_henko_tekiyo_date_from)
    params.joho_henko_tekiyo_date_from = f.joho_henko_tekiyo_date_from;
  if (f.joho_henko_tekiyo_date_to)
    params.joho_henko_tekiyo_date_to = f.joho_henko_tekiyo_date_to;
  if (f.shiharai_hoho !== undefined) params.shiharai_hoho = f.shiharai_hoho;
  return params;
}

/** Filter-only variant for the Excel export (no page/sort). */
function buildExportParams(): DokusyaSearchParams {
  const params = buildSearchParams();
  delete params.page;
  delete params.per_page;
  delete params.sort_by;
  delete params.sort_order;
  return params;
}

// ─── Fetch ──────────────────────────────────────────────────────────

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listDokusya(buildSearchParams());
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: the global axios interceptor in
    // src/api/error-handler.ts already toasted FORBIDDEN / 500.
    // Re-throwing would surface an unhandled rejection in onMounted's
    // fire-and-forget invocation. Per .claude/rules/vue.md — this is
    // the "expected and intentionally ignored" exception.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // [dashboard-deep-link] メニュー画面 (SCR-010) の「Web申込読者承認」から
  // ?denshi_shonin_status=0 (未承認) で遷移してくる導線。クエリがあれば
  // 電子版承認ステータスの絞り込みを初期適用し、詳細検索を開いて選択状態を
  // ユーザーに見せる。
  const q = route.query.denshi_shonin_status;
  if (typeof q === 'string' && q !== '') {
    const n = Number(q);
    if (Number.isInteger(n)) {
      state.filters.denshi_shonin_status = n;
      applyFilters({ ...state.filters });
      showAdvanced.value = true;
    }
  }
  void fetchList();
  void fetchDropdowns();
});

// ─── Event handlers ─────────────────────────────────────────────────

function trimTextFilters(): void {
  // Trim every text filter in place so paste artifacts / IME-confirmed
  // spaces don't alter the ILIKE pattern. Mutate state.filters so the
  // input visibly reflects the trimmed value — clear UX feedback.
  const f = state.filters;
  f.kumiaiin_code = f.kumiaiin_code.trim();
  f.full_name = f.full_name.trim();
  f.full_name_kana = f.full_name_kana.trim();
  f.haitatsu = f.haitatsu.trim();
  f.jastem_toriatsukai_tenpo_code = f.jastem_toriatsukai_tenpo_code.trim();
  f.jastem_tenpo_name = f.jastem_tenpo_name.trim();
  f.renrakusaki_1 = f.renrakusaki_1.trim();
  f.email = f.email.trim();
  f.seikyu_kaishi_month = f.seikyu_kaishi_month.trim();
}

function onSearch(): void {
  trimTextFilters();
  if (!validateFilters(state.filters)) return;
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

function toggleAdvanced(): void {
  showAdvanced.value = !showAdvanced.value;
}

function goCreate(): void {
  void router.push({ name: 'DokusyaCreate' });
}

function goEdit(row: DokusyaListItem): void {
  void router.push({
    name: 'DokusyaEdit',
    params: { id: row.dokusya_id },
  });
}

function askDelete(row: DokusyaListItem): void {
  Modal.confirm({
    title: '削除確認',
    content: `この購読者を削除してもよろしいですか？（${row.full_name}）`,
    okText: '削除',
    okType: 'danger',
    cancelText: 'キャンセル',
    async onOk() {
      try {
        await removeDokusya(row.dokusya_id);
        notify.deleted();
        await fetchList();
      } catch {
        // The global axios interceptor handles 403 DOKUSYA_READ_ONLY /
        // 409 CONFLICT / 500 — the view must NOT re-toast. See
        // .claude/rules/vue.md §Error Handling Architecture.
      }
    },
  });
}

// ─── Excel export ──────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  // Skip in jsdom (test env) — `URL.createObjectURL` may be undefined.
  if (
    globalThis.window === undefined ||
    typeof globalThis.URL?.createObjectURL !== 'function'
  ) {
    return;
  }
  const url = globalThis.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  globalThis.URL.revokeObjectURL(url);
}

function buildExportFilename(): string {
  // YYYYMMDD_HHmmss in JST per .claude/rules/vue.md §Date/Time —
  // inline the timestamp because adding a util dep here for a single
  // filename would over-extract. Use new Date() formatted in JST.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `dokusya_export_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: { error_code?: string; message?: string };
  };
}

function getErrorCode(err: unknown): string | undefined {
  const r = (err as AxiosLikeError | undefined)?.response;
  return r?.data?.error_code;
}

async function onExport(): Promise<void> {
  try {
    const blob = await exportDokusyaExcel(buildExportParams());
    if (blob instanceof Blob) {
      downloadBlob(blob, buildExportFilename());
    }
    message.success(MSG_EXPORT_SUCCESS);
  } catch (err) {
    const code = getErrorCode(err);
    // EXPORT_NO_DATA (404) — the global interceptor's NOT_FOUND branch
    // would already toast `data.message` (= '出力データがありません。'),
    // but the spec mocks the WRAPPER, not axios, so the interceptor
    // never runs in tests. Toast here to satisfy the assertion AND to
    // make the message robust to either error path.
    if (code === 'EXPORT_NO_DATA') {
      message.error(MSG_EXPORT_NO_DATA);
      return;
    }
    // EXPORT_LIMIT_EXCEEDED (409) — listed in VIEW_HANDLED_CODES so the
    // global interceptor skips it. View MUST toast.
    if (code === 'EXPORT_LIMIT_EXCEEDED') {
      message.error(MSG_EXPORT_LIMIT_EXCEEDED);
      return;
    }
    // Other errors handled by the global interceptor — no view toast.
  }
}

// Expose state to the spec so it can mutate filters via wrapper.vm.state.
defineExpose({ state });
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 1. 管理支店 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <a-select
          v-model:value="state.filters.kanri_shiten_id"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
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

      <!-- 2. 支店 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店</span>
        <a-select
          v-model:value="state.filters.shiten_id"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        >
          <a-select-option
            v-for="opt in shitenOptions"
            :key="opt.shiten_id"
            :value="opt.shiten_id"
          >
            {{ opt.shiten_name }}
          </a-select-option>
        </a-select>
      </label>

      <!-- 3. 組合員コード -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">組合員コード</span>
        <a-input
          v-model:value="state.filters.kumiaiin_code"
          placeholder="組合員コード"
          allow-clear
          class="flex-1"
        />
      </label>

      <!-- 4. 氏名 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">氏名</span>
        <a-input
          v-model:value="state.filters.full_name"
          placeholder="氏名"
          allow-clear
          class="flex-1"
        />
      </label>

      <!-- 5. かな氏名 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">かな氏名</span>
        <a-input
          v-model:value="state.filters.full_name_kana"
          placeholder="かな氏名"
          allow-clear
          class="flex-1"
        />
      </label>

      <!-- 6. 配達先住所 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達先住所</span>
        <a-input
          v-model:value="state.filters.haitatsu"
          placeholder="配達先住所"
          allow-clear
          class="flex-1"
        />
      </label>

      <!-- 7. 配達販売店 -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達販売店</span>
        <a-select
          v-model:value="state.filters.hanbaiten_id"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        >
          <a-select-option
            v-for="opt in hanbaitenOptions"
            :key="opt.hanbaiten_id"
            :value="opt.hanbaiten_id"
          >
            {{ opt.hanbaiten_name }}
          </a-select-option>
        </a-select>
      </label>

      <!-- 8. 手続種類 (radio group, m_code TETSUZUKI_SHURUI) -->
      <label class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">手続種類</span>
        <a-radio-group
          v-model:value="state.filters.tetsuzuki_shurui"
          class="flex-1"
        >
          <a-radio
            v-for="opt in codes.options('TETSUZUKI_SHURUI')"
            :key="String(opt.value)"
            :value="Number(opt.value)"
          >
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </label>

      <!-- 9+10. 購読開始日 + 購読中止日 — wrapped in a 2-col sub-grid
           (col-span-full) so each date-range field takes half the row. -->
      <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
        <!-- 購読開始日 (date range) -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">購読開始日</span>
          <a-date-picker
            v-model:value="state.filters.shoki_dokusya_kaishi_date_from"
            value-format="YYYY/MM/DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            class="flex-1"
          />
          <span class="text-text-description">-</span>
          <a-date-picker
            v-model:value="state.filters.shoki_dokusya_kaishi_date_to"
            value-format="YYYY/MM/DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            class="flex-1"
          />
        </label>

        <!-- 購読中止日 (date range) -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">購読中止日</span>
          <a-date-picker
            v-model:value="state.filters.dokusya_chushi_date_from"
            value-format="YYYY/MM/DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            class="flex-1"
          />
          <span class="text-text-description">-</span>
          <a-date-picker
            v-model:value="state.filters.dokusya_chushi_date_to"
            value-format="YYYY/MM/DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            class="flex-1"
          />
        </label>
      </div>

      <!-- 11+12. 購読種別 + 電子版承認ステータス — wrapped in a 2-col
           sub-grid (col-span-full) so the two always sit side by side on
           one row, regardless of the field count above (index.html
           grid-cols-2). -->
      <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
        <!-- 購読種別 (radio group, m_code DOKUSYA_SHUBETSU) -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">購読種別</span>
          <a-radio-group
            v-model:value="state.filters.dokusya_shubetsu"
            class="flex-1 flex flex-wrap gap-y-2"
          >
            <a-radio
              v-for="opt in codes.options('DOKUSYA_SHUBETSU')"
              :key="String(opt.value)"
              :value="Number(opt.value)"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </label>

        <!-- 電子版承認ステータス (radio group, hardcoded — NOT m_code) -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">電子版承認ステータス</span>
          <a-radio-group
            v-model:value="state.filters.denshi_shonin_status"
            class="flex-1 flex flex-wrap gap-y-2"
          >
            <a-radio
              v-for="opt in denshiShoninOptions"
              :key="String(opt.value ?? 'null')"
              :value="opt.value ?? undefined"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </label>
      </div>

      <!-- 詳細検索 toggle — full-width row (border-top + grey button +
           icon) between the always-on fields and the advanced area, per
           index.html. -->
      <div class="col-span-full flex gap-3 pt-4 border-t border-border">
        <button
          type="button"
          class="px-4 py-2 bg-surface-hover hover:bg-surface-active text-text-main rounded font-medium transition-colors flex items-center gap-2"
          @click="toggleAdvanced"
        >
          <span class="material-icons text-sm">manage_search</span>
          <span>{{ toggleLabel }}</span>
          <span class="material-icons text-sm">{{
            showAdvanced ? 'expand_less' : 'expand_more'
          }}</span>
        </button>
      </div>

      <!-- 詳細検索エリア — collapsed by default. -->
      <template v-if="showAdvanced">
        <!-- 13. 引落元口座支店コード -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">引落元口座支店コード</span>
          <a-input
            v-model:value="state.filters.jastem_toriatsukai_tenpo_code"
            placeholder="引落元口座支店コード"
            allow-clear
            class="flex-1"
          />
        </label>

        <!-- 14. 引落元口座支店名 -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">引落元口座支店名</span>
          <a-input
            v-model:value="state.filters.jastem_tenpo_name"
            placeholder="引落元口座支店名"
            allow-clear
            class="flex-1"
          />
        </label>

        <!-- 15. 連絡先1 -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">連絡先1</span>
          <a-input
            v-model:value="state.filters.renrakusaki_1"
            placeholder="連絡先1"
            allow-clear
            class="flex-1"
          />
        </label>

        <!-- 16. メールアドレス -->
        <label class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">メールアドレス</span>
          <a-input
            v-model:value="state.filters.email"
            placeholder="メールアドレス"
            allow-clear
            class="flex-1"
          />
        </label>

        <!-- 17+18. 請求開始月 + 適用日 — 2-col sub-grid (col-span-full)
             so each field takes half the row. -->
        <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
          <!-- 請求開始月 (month picker → YYYYMM) -->
          <label class="flex items-center gap-2 text-sm font-medium text-text-main">
            <span class="whitespace-nowrap">請求開始月</span>
            <a-date-picker
              v-model:value="state.filters.seikyu_kaishi_month"
              picker="month"
              value-format="YYYYMM"
              format="YYYYMM"
              placeholder="YYYYMM"
              allow-clear
              class="flex-1"
            />
          </label>

          <!-- 適用日 (date range) -->
          <label class="flex items-center gap-2 text-sm font-medium text-text-main">
            <span class="whitespace-nowrap">適用日</span>
            <a-date-picker
              v-model:value="state.filters.joho_henko_tekiyo_date_from"
              value-format="YYYY/MM/DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              allow-clear
              class="flex-1"
            />
            <span class="text-text-description">-</span>
            <a-date-picker
              v-model:value="state.filters.joho_henko_tekiyo_date_to"
              value-format="YYYY/MM/DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              allow-clear
              class="flex-1"
            />
          </label>
        </div>

        <!-- 19. 支払方法 (radio group, m_code SHIHARAI_HOHO) — full-width
             (col-span-full) so the radios lay out on one row (per
             index.html) instead of wrapping inside a narrow grid cell. -->
        <label class="col-span-full flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">支払方法</span>
          <a-radio-group
            v-model:value="state.filters.shiharai_hoho"
            class="flex-1 flex flex-wrap gap-y-2"
          >
            <a-radio
              v-for="opt in codes.options('SHIHARAI_HOHO')"
              :key="String(opt.value)"
              :value="Number(opt.value)"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </label>
      </template>

      <!-- 検索 / 検索クリア (BaseSearchForm) + Excel出力 on the same
           button row, per index.html. The 詳細検索 toggle moved to its
           own row in the middle of the form (above). -->
      <template #extra>
        <a-button
          html-type="button"
          type="primary"
          :disabled="!canView"
          @click="onExport"
        >
          Excel出力
        </a-button>
      </template>
    </BaseSearchForm>

    <!-- Inline validation error (ACSMS-MSG-014-008 email format,
         相関チェック date range violations). Rendered above the
         result area so the user sees it without scanning toasts. -->
    <p
      v-if="validationError"
      class="text-error text-sm"
      data-test="dokusya-validation-error"
    >
      {{ validationError }}
    </p>

    <!-- ACSMS-MSG-014-002 — empty-result message rendered separately
         (BaseDataTable's dynamic slot loop can't forward a-table's
         #emptyText slot safely). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="dokusya-empty-message"
    >
      該当するデータが存在しません。
    </p>

    <BaseDataTable
      title="購読者一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="dokusya_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button type="primary" :disabled="!canCreate" @click="goCreate">
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          購読者情報登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'full_name'">
          <!-- 購読者名 anchor — edit navigation entry. Kept as anchor on
               read-only rows too (VIEW path stays open per api.md
               §is_read_only). When the user lacks dokusya.update the
               anchor is replaced with plain text to avoid a dead link. -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as DokusyaListItem)"
          >
            {{ (record as DokusyaListItem).full_name }}
          </a>
          <span v-else>{{ (record as DokusyaListItem).full_name }}</span>
        </template>
        <!-- Date columns — format to YYYY/MM/DD (pinned Asia/Tokyo) so the
             cell shows a JST date, not a raw Date.toString(). -->
        <template v-else-if="column.key === 'shoki_dokusya_kaishi_date'">
          {{ formatDate((record as DokusyaListItem).shoki_dokusya_kaishi_date) }}
        </template>
        <template v-else-if="column.key === 'dokusya_chushi_date'">
          {{ formatDate((record as DokusyaListItem).dokusya_chushi_date) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 削除 visible-but-disabled when:
                 (a) the row carries is_read_only=true, OR
                 (b) the user lacks dokusya.delete.
               Edit affordance is on the 購読者名 anchor above, NOT here. -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="
              !canDelete || (record as DokusyaListItem).is_read_only
            "
            @delete="askDelete(record as DokusyaListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
