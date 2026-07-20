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
import { message, type TableColumnsType } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseKanriShitenDropdown from '@/components/common/BaseKanriShitenDropdown.vue';
import BaseShitenDropdown from '@/components/common/BaseShitenDropdown.vue';
import BaseHanbaitenDropdown from '@/components/common/BaseHanbaitenDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { DokusyaShubetsu, TetsuzukiShurui } from '@/constants/enums';
import { formatDate } from '@/utils/formatters';
import {
  timestampForFilenameTokyo,
  nowTokyo,
  todayIsoTokyo,
} from '@/utils/datetime';
import { confirmDelete } from '@/utils/confirm';
import { downloadBlob } from '@/utils/download';
import {
  listDokusya,
  removeDokusya,
  exportDokusyaExcel,
  getDokusya,
  stopDokusya,
  type DokusyaDetail,
  type DokusyaListItem,
  type DokusyaSearchParams,
} from '@/api/dokusya/dokusya';

// ─── State ──────────────────────────────────────────────────────────

// 有効単価フラグ filter — 単価一覧(SCR-006)と同一のトライステートラジオ。
// '' = 両方（既定・絞り込まない）、'1' = 有効単価を参照する購読者のみ、
// '0' = 失効単価を参照する購読者のみ。検索クリアで '' に戻す。BE へは
// toBoolean で boolean | undefined に変換して送る（active_tanka_flg）。
type ActiveFlgFilter = '' | '1' | '0';

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
  // 有効単価フラグ（SCR-020 error gate 連携・顧客要件2026-07 改訂）。
  active_tanka_flg: ActiveFlgFilter;
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
  active_tanka_flg: '',
};

/** 有効単価フラグのラジオ値 → BE 送信用 boolean | undefined（'' は両方=送らない）。 */
function toBoolean(flag: ActiveFlgFilter): boolean | undefined {
  if (flag === '1') return true;
  if (flag === '0') return false;
  return undefined;
}

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

// 購読種別-flag gate (account_concept.md §139-145): an account with neither
// paper_flg nor denshi_flg cannot create/delete any 購読者, so 新規登録 +
// 削除 are greyed even when it holds dokusya.create / dokusya.delete. BE
// (assertShubetsuFlag) is the real boundary.
const hasAnyDokusyaFlag = computed(
  () => !!authStore.user?.paper_flg || !!authStore.user?.denshi_flg,
);
const canCreateDokusya = computed(
  () => canCreate.value && hasAnyDokusyaFlag.value,
);

const {
  state, loading, total, onChange, applyFilters, searchActions,
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

// 管理支店 / 支店 / 配達販売店 のフィルタは Base*Dropdown（サーバ
// ページング + 検索 + 無限スクロール）に委譲。JA スコープは BE が適用。
const filterJaId = computed(() => authStore.user?.ja_id ?? 0);

// ─── Columns (12 + 操作 per index.html §検索結果テーブル) ───────────

const columns: TableColumnsType = [
  {
    title: 'ID',
    dataIndex: 'dokusya_id',
    key: 'dokusya_id',
    sorter: true,
    width: 100,
  },
  {
    title: '管理支店',
    dataIndex: 'kanri_shiten_name',
    key: 'kanri_shiten_id',
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
    title: '手続種類',
    dataIndex: 'tetsuzuki_shurui',
    key: 'tetsuzuki_shurui',
    width: 100,
  },
  {
    title: '購読種別',
    dataIndex: 'dokusya_shubetsu',
    key: 'dokusya_shubetsu',
    width: 100,
  },
  {
    title: '連絡先1',
    dataIndex: 'renrakusaki_1',
    key: 'renrakusaki_1',
    width: 140,
  },
  {
    title: '配達先氏名',
    dataIndex: 'haitatsu_full_name',
    key: 'haitatsu_full_name',
    width: 160,
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
    title: '支払方法',
    dataIndex: 'shiharai_hoho',
    key: 'shiharai_hoho',
    width: 120,
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
  // 操作列は右端に固定(fixed:'right')— 横スクロールしても常に表示される
  // （履歴画面 DokusyaRirekiView と同じ挙動）。
  { title: '操作', key: 'actions', align: 'center', width: 180, fixed: 'right' },
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

/**
 * Number filters — copied when explicitly set (`0` is a valid m_code
 * value, so a truthy check would wrongly drop it). Split out of
 * `buildSearchParams` to keep each builder's cognitive complexity low.
 */
function applyNumberFilters(
  params: DokusyaSearchParams,
  f: DokusyaFilters,
): void {
  // Base*Dropdown は未選択時 null を emit する（undefined 既定と両対応で != null）。
  if (f.kanri_shiten_id != null) params.kanri_shiten_id = f.kanri_shiten_id;
  if (f.shiten_id != null) params.shiten_id = f.shiten_id;
  if (f.hanbaiten_id != null) params.hanbaiten_id = f.hanbaiten_id;
  if (f.tetsuzuki_shurui !== undefined)
    params.tetsuzuki_shurui = f.tetsuzuki_shurui;
  if (f.dokusya_shubetsu !== undefined)
    params.dokusya_shubetsu = f.dokusya_shubetsu;
  if (f.denshi_shonin_status !== undefined)
    params.denshi_shonin_status = f.denshi_shonin_status;
  if (f.shiharai_hoho !== undefined) params.shiharai_hoho = f.shiharai_hoho;
  // 有効単価フラグ: '' は両方（送らない）、'1'→true / '0'→false のみ送信。
  const activeTanka = toBoolean(f.active_tanka_flg);
  if (activeTanka !== undefined) params.active_tanka_flg = activeTanka;
}

/** Free-text filters — copied when non-empty (blank → BE sees no value). */
function applyTextFilters(
  params: DokusyaSearchParams,
  f: DokusyaFilters,
): void {
  if (f.kumiaiin_code) params.kumiaiin_code = f.kumiaiin_code;
  if (f.full_name) params.full_name = f.full_name;
  if (f.full_name_kana) params.full_name_kana = f.full_name_kana;
  if (f.haitatsu) params.haitatsu = f.haitatsu;
  if (f.jastem_toriatsukai_tenpo_code)
    params.jastem_toriatsukai_tenpo_code = f.jastem_toriatsukai_tenpo_code;
  if (f.jastem_tenpo_name) params.jastem_tenpo_name = f.jastem_tenpo_name;
  if (f.renrakusaki_1) params.renrakusaki_1 = f.renrakusaki_1;
  if (f.email) params.email = f.email;
  if (f.seikyu_kaishi_month) params.seikyu_kaishi_month = f.seikyu_kaishi_month;
}

/** Date-range filters — copied when non-empty. */
function applyDateFilters(
  params: DokusyaSearchParams,
  f: DokusyaFilters,
): void {
  if (f.shoki_dokusya_kaishi_date_from)
    params.shoki_dokusya_kaishi_date_from = f.shoki_dokusya_kaishi_date_from;
  if (f.shoki_dokusya_kaishi_date_to)
    params.shoki_dokusya_kaishi_date_to = f.shoki_dokusya_kaishi_date_to;
  if (f.dokusya_chushi_date_from)
    params.dokusya_chushi_date_from = f.dokusya_chushi_date_from;
  if (f.dokusya_chushi_date_to)
    params.dokusya_chushi_date_to = f.dokusya_chushi_date_to;
  if (f.joho_henko_tekiyo_date_from)
    params.joho_henko_tekiyo_date_from = f.joho_henko_tekiyo_date_from;
  if (f.joho_henko_tekiyo_date_to)
    params.joho_henko_tekiyo_date_to = f.joho_henko_tekiyo_date_to;
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
  applyNumberFilters(params, f);
  applyTextFilters(params, f);
  applyDateFilters(params, f);
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
  // [scr020-deep-link] 口座振替データ出力 (SCR-020) の失効単価エラーから
  // ?inactive_tanka=1 で遷移してくる導線。有効単価フラグを「無効(失効単価参照)」で
  // 初期選択し、詳細検索を開いて選択状態を見せる（手動で新単価へ移行する運用）。
  if (route.query.inactive_tanka === '1') {
    state.filters.active_tanka_flg = '0';
    applyFilters({ ...state.filters });
    showAdvanced.value = true;
  }
  void fetchList();
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
  // seikyu_kaishi_month は <a-date-picker> 由来の YYYYMM 文字列で空白を含まない。
  // クリア時に antd が undefined をセットするため .trim() すると TypeError →
  // 検索ボタンで「エラーが発生しました」トーストになる。trim 対象外とする。
}

// 検索 / 検索クリア — shared guard+fetch wiring (useTableQuery.searchActions).
const { onSearch, onClear } = searchActions({
  fetchList,
  // Trim every text filter, then client-validate (email / date ranges).
  // Returning false aborts the search before the changed-since-applied guard.
  beforeSearch() {
    trimTextFilters();
    return validateFilters(state.filters);
  },
});

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
  confirmDelete('この購読者を削除してもよろしいですか？', async () => {
    try {
      await removeDokusya(row.dokusya_id);
      notify.deleted();
      await fetchList();
    } catch {
      // The global axios interceptor handles 403 DOKUSYA_READ_ONLY /
      // 409 CONFLICT / 500 — the view must NOT re-toast. See
      // .claude/rules/vue.md §Error Handling Architecture.
    }
  });
}

// ─── 購読停止（解約予約）— 一覧の「購読停止」ボタン → ポップアップ ────────
//
// 顧客要件 2026-07: 購読中止日を選んで停止予約する。行データだけでは
// 請求開始月 / 最終変更適用日 / 解約予約有無 が分からないため、クリック時に
// 詳細(GET /dokusya/:id)を取得してからポップアップを開く。
//   - 紙版(1): カレンダーで購読中止日を選ぶ（未来日 + 購読開始日以降 + 最終変更
//     適用日より後）。
//   - 電子版(2): 「終了月」を選び月末日で停止する（当月以降 + 請求開始月以降）。
//     請求開始月が未設定なら料金徴収未開始 → クリック時に toast 警告して開かない。
// OK で専用 API(POST /dokusya/:id/stop)を叩き、成功したら一覧を再取得する。

const SEIKYU_NOT_STARTED_MSG = 'この読者料金の徴収はまだ開始されていません。';
const ALREADY_RESERVED_MSG =
  '既に解約予約されています。変更する場合は履歴画面で解約を取消してください。';

const stopModalOpen = ref(false);
const stopTarget = ref<DokusyaDetail | null>(null);
const stopDate = ref<Dayjs | null>(null); // 紙版カレンダー
const stopMonth = ref<Dayjs | null>(null); // 電子版 終了月
const stopSubmitting = ref(false);
const stopFieldError = ref<string | null>(null);

/** 停止ポップアップ対象が電子版か（月ピッカー vs 日ピッカーの切替）。 */
const isStopDigital = computed(
  () => Number(stopTarget.value?.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL,
);

/** 停止ボタン非活性: 更新権限なし / 編集不可(併読・電子版クレカ) / 既に解約済み。 */
function isStopDisabled(row: DokusyaListItem): boolean {
  return (
    !canUpdate.value ||
    row.is_read_only ||
    row.tetsuzuki_shurui === TetsuzukiShurui.KAIYAKU
  );
}

async function openStopModal(row: DokusyaListItem): Promise<void> {
  let detail: DokusyaDetail;
  try {
    detail = (await getDokusya(row.dokusya_id)).data;
  } catch {
    // 詳細取得失敗 (403/404/500) は interceptor が toast 済み。
    return;
  }
  // 既に有効な解約予約あり → 二重解約は不可（履歴画面で取消要）。
  if (detail.has_active_kaiyaku) {
    message.warning(ALREADY_RESERVED_MSG);
    return;
  }
  // 電子版で請求開始月が未設定＝料金徴収未開始 → 停止不可（顧客要件 2026-07）。
  if (
    Number(detail.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
    !detail.seikyu_kaishi_month?.trim()
  ) {
    message.warning(SEIKYU_NOT_STARTED_MSG);
    return;
  }
  stopTarget.value = detail;
  stopDate.value = null;
  stopMonth.value = null;
  stopFieldError.value = null;
  stopModalOpen.value = true;
}

function closeStopModal(): void {
  stopModalOpen.value = false;
  stopTarget.value = null;
  stopDate.value = null;
  stopMonth.value = null;
  stopFieldError.value = null;
}

// 紙版カレンダー: 未来日のみ + 最終変更適用日(max_joho_date)より後(同日不可) +
// 購読開始日以降。全て JST(Asia/Tokyo) 基準の YYYY-MM-DD で比較する。
function disabledStopPaperDate(current: Dayjs | null): boolean {
  if (!current) return false;
  const t = stopTarget.value;
  const d = current.format('YYYY-MM-DD');
  if (d <= todayIsoTokyo()) return true;
  if (t?.max_joho_date && d <= t.max_joho_date) return true;
  if (t?.dokusya_kaishi_date && d < t.dokusya_kaishi_date) return true;
  return false;
}

// 電子版 終了月ピッカー: 当月以降 かつ 請求開始月(seikyu_kaishi_month)以降。
function disabledStopMonth(current: Dayjs | null): boolean {
  if (!current) return false;
  const ym = current.format('YYYYMM');
  if (ym < nowTokyo().format('YYYYMM')) return true;
  const seikyu = stopTarget.value?.seikyu_kaishi_month?.trim();
  if (seikyu && ym < seikyu) return true;
  return false;
}

/** VALIDATION_ERROR(400) の errors[0].message を取り出す（無ければ null）。 */
function extractStopFieldError(err: unknown): string | null {
  const data = (
    err as {
      response?: {
        data?: {
          error_code?: string;
          errors?: { field: string; message: string }[];
        };
      };
    }
  )?.response?.data;
  if (data?.error_code === 'VALIDATION_ERROR' && data.errors?.length) {
    return data.errors[0].message;
  }
  return null;
}

async function confirmStop(): Promise<void> {
  const t = stopTarget.value;
  if (!t) return;
  stopFieldError.value = null;

  // 中止日を組み立てる: 紙版=選択日、電子版=選択月の月末日。
  let chushi: string;
  if (isStopDigital.value) {
    if (!stopMonth.value) {
      stopFieldError.value = '購読中止日を入力してください。';
      return;
    }
    chushi = stopMonth.value.endOf('month').format('YYYY-MM-DD');
  } else {
    if (!stopDate.value) {
      stopFieldError.value = '購読中止日を入力してください。';
      return;
    }
    chushi = stopDate.value.format('YYYY-MM-DD');
  }

  stopSubmitting.value = true;
  try {
    await stopDokusya(t.dokusya_id, { dokusya_chushi_date: chushi });
    notify.success('購読停止を予約しました。');
    closeStopModal();
    await fetchList();
  } catch (err) {
    // VALIDATION_ERROR(400) は interceptor が toast しない設計なので、
    // フィールドエラーとしてポップアップ内に表示する。403/500 は interceptor
    // が toast 済み。
    const msg = extractStopFieldError(err);
    if (msg) stopFieldError.value = msg;
  } finally {
    stopSubmitting.value = false;
  }
}

// ─── Excel export ──────────────────────────────────────────────────

function buildExportFilename(): string {
  // YYYYMMDD_HHmmss in JST — always via the shared helper (browser-local
  // new Date().getHours() would mis-stamp for non-JST users).
  return `購読者一覧出力_${timestampForFilenameTokyo()}.xlsx`;
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
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <BaseKanriShitenDropdown
          v-model:value="state.filters.kanri_shiten_id"
          :ja-id="filterJaId"
          class="flex-1"
        />
      </div>

      <!-- 2. 支店 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店</span>
        <BaseShitenDropdown
          v-model:value="state.filters.shiten_id"
          :ja-id="filterJaId"
          class="flex-1"
        />
      </div>

      <!-- 3. 組合員コード -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">組合員コード</span>
        <a-input
          v-model:value="state.filters.kumiaiin_code"
          placeholder="組合員コード"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 4. 氏名 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">氏名</span>
        <a-input
          v-model:value="state.filters.full_name"
          placeholder="氏名"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 5. かな氏名 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">かな氏名</span>
        <a-input
          v-model:value="state.filters.full_name_kana"
          placeholder="かな氏名"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 6. 配達先住所 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達先住所</span>
        <a-input
          v-model:value="state.filters.haitatsu"
          placeholder="配達先住所"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 7. 配達販売店 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達販売店</span>
        <BaseHanbaitenDropdown
          v-model:value="state.filters.hanbaiten_id"
          :ja-id="filterJaId"
          class="flex-1"
        />
      </div>

      <!-- 8. 手続種類 (radio group, m_code TETSUZUKI_SHURUI) -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
      </div>

      <!-- 9+10. 購読開始日 + 購読中止日 — wrapped in a 2-col sub-grid
           (col-span-full) so each date-range field takes half the row. -->
      <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
        <!-- 購読開始日 (date range) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
        </div>

        <!-- 購読中止日 (date range) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
        </div>
      </div>

      <!-- 11+12. 購読種別 + 電子版承認ステータス — wrapped in a 2-col
           sub-grid (col-span-full) so the two always sit side by side on
           one row, regardless of the field count above (index.html
           grid-cols-2). -->
      <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
        <!-- 購読種別 (radio group, m_code DOKUSYA_SHUBETSU) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
        </div>

        <!-- 電子版承認ステータス (radio group, hardcoded — NOT m_code) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
        </div>
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
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">引落元口座支店コード</span>
          <a-input
            v-model:value="state.filters.jastem_toriatsukai_tenpo_code"
            placeholder="引落元口座支店コード"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 14. 引落元口座支店名 -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">引落元口座支店名</span>
          <a-input
            v-model:value="state.filters.jastem_tenpo_name"
            placeholder="引落元口座支店名"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 15. 連絡先1 -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">連絡先1</span>
          <a-input
            v-model:value="state.filters.renrakusaki_1"
            placeholder="連絡先1"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 16. メールアドレス -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">メールアドレス</span>
          <a-input
            v-model:value="state.filters.email"
            placeholder="メールアドレス"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 17+18. 請求開始月 + 適用日 — 2-col sub-grid (col-span-full)
             so each field takes half the row. -->
        <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center">
          <!-- 請求開始月 (month picker → YYYYMM) -->
          <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
          </div>

          <!-- 適用日 (date range) -->
          <div class="flex items-center gap-2 text-sm font-medium text-text-main">
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
          </div>
        </div>

        <!-- 19. 支払方法 (radio group, m_code SHIHARAI_HOHO) — full-width
             (col-span-full) so the radios lay out on one row (per
             index.html) instead of wrapping inside a narrow grid cell. -->
        <div class="col-span-full flex items-center gap-2 text-sm font-medium text-text-main">
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
        </div>

        <!-- 有効単価フラグ（SCR-020 error gate 連携・顧客要件2026-07 改訂）。単価一覧
             (SCR-006)と同一のトライステートラジオ: 有効=有効単価を参照する購読者のみ、
             無効=失効単価を参照する購読者のみ、未選択=両方。口座振替出力の失効単価
             エラーからは ?inactive_tanka=1 で「無効」が初期選択される。 -->
        <div class="col-span-full flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">有効単価フラグ</span>
          <a-radio-group
            v-model:value="state.filters.active_tanka_flg"
            data-test="active-tanka-filter"
          >
            <a-radio value="1">有効</a-radio>
            <a-radio value="0">無効</a-radio>
          </a-radio-group>
        </div>
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
      検索結果が見つかりませんでした。
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
        <a-button type="primary" :disabled="!canCreateDokusya" @click="goCreate">
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
        <!-- m_code value → 顧客編集可能ラベル via useCodesStore (codes 値を
             ハードコードしない — .claude/rules/vue.md §Code Master)。 -->
        <template v-else-if="column.key === 'tetsuzuki_shurui'">
          {{ codes.label('TETSUZUKI_SHURUI', (record as DokusyaListItem).tetsuzuki_shurui) }}
        </template>
        <template v-else-if="column.key === 'dokusya_shubetsu'">
          {{ codes.label('DOKUSYA_SHUBETSU', (record as DokusyaListItem).dokusya_shubetsu) }}
        </template>
        <template v-else-if="column.key === 'shiharai_hoho'">
          {{ codes.label('SHIHARAI_HOHO', (record as DokusyaListItem).shiharai_hoho) }}
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
          <div class="flex justify-center items-center gap-3">
            <!-- 購読停止（解約予約）— 削除の前に配置。更新権限なし / 編集不可
                 (併読・電子版クレカ) / 既に解約済み のとき非活性。 -->
            <button
              type="button"
              :disabled="isStopDisabled(record as DokusyaListItem)"
              class="text-primary hover:text-primary-hover font-medium disabled:text-text-disabled disabled:hover:text-text-disabled disabled:cursor-not-allowed"
              data-test="stop-button"
              @click="openStopModal(record as DokusyaListItem)"
            >
              購読停止
            </button>
            <!-- 削除 visible-but-disabled when:
                   (a) the row carries is_read_only=true, OR
                   (b) the user lacks dokusya.delete.
                 Edit affordance is on the 購読者名 anchor above, NOT here. -->
            <BaseActionColumn
              :can-edit="false"
              :disable-delete="
                !canDelete ||
                !hasAnyDokusyaFlag ||
                (record as DokusyaListItem).is_read_only
              "
              @delete="askDelete(record as DokusyaListItem)"
            />
          </div>
        </template>
      </template>
    </BaseDataTable>

    <!-- ─── 購読停止（解約予約）ポップアップ ────────────────────────────
         紙版はカレンダー、電子版は「終了月」ピッカー(月末で終了)。OK で
         専用 API を叩き、成功したら一覧を再取得する。VALIDATION_ERROR は
         ポップアップ内にフィールドエラーとして表示する。 -->
    <a-modal
      v-model:open="stopModalOpen"
      title="購読を停止する"
      ok-text="購読を停止する"
      ok-type="danger"
      cancel-text="キャンセル"
      :confirm-loading="stopSubmitting"
      :mask-closable="false"
      data-test="stop-modal"
      @ok="confirmStop"
      @cancel="closeStopModal"
    >
      <div v-if="stopTarget" class="space-y-3 py-2">
        <p class="text-text-description text-sm">
          対象購読者:
          <span class="text-text-main font-medium">
            {{ stopTarget.shimei_sei }} {{ stopTarget.shimei_mei }}
          </span>
        </p>
        <!-- antd の a-date-picker はカスタムコンポーネントで <label for> による
             静的関連付けができないため、説明テキストは <span> とし、各ピッカーに
             aria-label を付与してアクセシブル名を与える（スクリーンリーダー対応）。 -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium whitespace-nowrap text-text-main">
            購読中止日
          </span>
          <!-- 電子版: 終了月ピッカー + 「月末で終了」。当月以降 + 請求開始月以降。 -->
          <template v-if="isStopDigital">
            <a-date-picker
              v-model:value="stopMonth"
              picker="month"
              format="YYYY/MM"
              placeholder="終了月を選択"
              aria-label="購読中止日"
              :disabled-date="disabledStopMonth"
              class="flex-1"
              data-test="stop-month-picker"
            />
            <span class="text-text-main whitespace-nowrap">月末で終了</span>
          </template>
          <!-- 紙版: カレンダー。未来日 + 購読開始日以降 + 最終変更適用日より後。 -->
          <template v-else>
            <a-date-picker
              v-model:value="stopDate"
              format="YYYY/MM/DD"
              placeholder="購読中止日を選択"
              aria-label="購読中止日"
              :disabled-date="disabledStopPaperDate"
              class="flex-1"
              data-test="stop-date-picker"
            />
          </template>
        </div>
        <p
          v-if="stopFieldError"
          class="text-error text-sm"
          data-test="stop-error"
        >
          {{ stopFieldError }}
        </p>
      </div>
    </a-modal>
  </div>
</template>
