<script setup lang="ts">
// ACSMS-SCR-014 — 購読者明細検索画面。
//
// GET /api/v1/dokusya をページング・ソート・フィルタ（常時表示12項目 + 詳細検索
// 6項目）で一覧表示。削除 は DELETE /api/v1/dokusya/:id で論理削除。Excel出力 は
// /api/v1/dokusya/export の blob をストリーム（フィルタのみ・page/sort なし）。
//
// 権限モデル（docs/database/seeder.md §3 dokusya.*）:
//   - dokusya.view   : 検索 + Excel出力 を有効化（閲覧連動）。
//   - dokusya.create : 購読者情報登録 ボタンを有効化（無ければグレー）。
//   - dokusya.delete : 行ごとの 削除 リンクを有効化（無ければグレー）。
//     削除できるのは紙版(dokusya_shubetsu=1)のみ — 電子版・併読は電子版読者
//     管理システムが正のため（顧客要件 2026-08）。
//   - dokusya.update : 購読者名 アンカーからの 編集 遷移（無い場合はアンカー
//                      非表示 = デッドリンクを出さない）。
// 行単位オーバーライド: is_read_only=true は dokusya.delete 保有時も常に 削除 を
// 無効化（CC / 併読 / 海外配送 等）。
//
// 検索クリア は全フィルタ + page=1 をリセット。検索 は非空フィルタのみ送信
//（空文字 → undefined）し、BE が ILIKE チェーンで falsy を見ないようにする。

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, type TableColumnsType } from 'ant-design-vue';
// dayjs 直呼びは「予約中の中止日(BE が返す YYYY-MM-DD)をピッカー値へ復元する」用途のみ。
// ピッカー枠の値どうしを比較するだけで「今」を求めないため、Tokyo 固定ヘルパーは不要
// （.claude/rules/vue.md §Date/Time — dayjs() 直呼びが許される条件）。
import dayjs, { type Dayjs } from 'dayjs';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseKanriShitenDropdown from '@/components/common/BaseKanriShitenDropdown.vue';
import BaseShitenDropdown from '@/components/common/BaseShitenDropdown.vue';
import BaseHanbaitenDropdown from '@/components/common/BaseHanbaitenDropdown.vue';
import BaseTankaDropdown from '@/components/common/BaseTankaDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { DokusyaShubetsu, TetsuzukiShurui } from '@/constants/enums';
import {
  DENSHI_SHONIN_STATUS_LABELS,
  DENSHI_SHONIN_STATUS_NONE_LABEL,
} from '@/constants/denshi-shonin-status-labels';
import { formatDate } from '@/utils/formatters';
import {
  timestampForFilenameTokyo,
  nowTokyo,
  todayIsoTokyo,
} from '@/utils/datetime';
import { confirmDanger, confirmDelete } from '@/utils/confirm';
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

// ─── 状態 ──────────────────────────────────────────────────────────

// 有効単価フラグ filter — 単価一覧(SCR-006)と同一のトライステートラジオ。
// '' = 両方（既定・絞り込まない）、'1' = 有効単価を参照する購読者のみ、
// '0' = 失効単価を参照する購読者のみ。検索クリアで '' に戻す。BE へは
// toBoolean で boolean | undefined に変換して送る（active_tanka_flg）。
type ActiveFlgFilter = '' | '1' | '0';

interface DokusyaFilters {
  // 常時表示エリア（index.html の12項目）。
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
  // 詳細検索エリア (6 fields, hidden behind toggle).
  bank_branch: string;
  renrakusaki: string;
  email: string;
  seikyu_kaishi_month_from: string;
  seikyu_kaishi_month_to: string;
  joho_henko_tekiyo_date_from: string;
  joho_henko_tekiyo_date_to: string;
  shiharai_hoho: number | undefined;
  // 郵送区分（m_code YUBIN_KUBUN: '0':空 / '1':郵送）・新聞単価(tanka_id)・備考。
  yubin_kubun: string | undefined;
  tanka_id: number | undefined;
  biko: string;
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
  bank_branch: '',
  renrakusaki: '',
  email: '',
  seikyu_kaishi_month_from: '',
  seikyu_kaishi_month_to: '',
  joho_henko_tekiyo_date_from: '',
  joho_henko_tekiyo_date_to: '',
  shiharai_hoho: undefined,
  yubin_kubun: undefined,
  tanka_id: undefined,
  biko: '',
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

// docs/database/seeder.md §3 dokusya.* マトリクスに基づく権限ゲート。
const canView = computed(() => authStore.hasPermission('dokusya.view'));
const canCreate = computed(() => authStore.hasPermission('dokusya.create'));
const canUpdate = computed(() => authStore.hasPermission('dokusya.update'));
const canDelete = computed(() => authStore.hasPermission('dokusya.delete'));

// 購読種別-flag gate (account_concept.md §139-145): paper_flg も denshi_flg も
// 持たないアカウントは購読者を作成・削除できないため、dokusya.create /
// dokusya.delete 保有時も 新規登録 + 削除 をグレーにする。BE
//（assertShubetsuFlag）が実境界。
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
    // 更新の新しい順。直前に変更したものが1行目に見えるように。
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<DokusyaListItem[]>([]);

/**
 * 検索条件に一致する購読者の購読部数合計（顧客要件 2026-08）。件数と同じ絞り込みで
 * BE が集計するのでページングの影響を受けない（表示中のページではなく全件）。
 */
const totalBusu = ref(0);

/** ページネーションの「全 N 件」へ併記する部数。 */
const totalSuffix = computed(() => `全 ${totalBusu.value} 部`);

// 詳細検索トグル — index.html row 471 に従い既定は折りたたみ。
const showAdvanced = ref(false);
const toggleLabel = computed(() =>
  showAdvanced.value ? '詳細検索を非表示' : '詳細検索を表示',
);

// 電子版承認ステータス — m_code に無い（status 意味は API 層で t_denshi_dokusya
// 状態から導出）。index.html row 559-562 の4択。null = Web申込以外（電子版行なし）。
// ラベルは SCR-013 履歴一覧と共有（constants/denshi-shonin-status-labels.ts）。
interface DenshiShoninOption {
  value: number | null;
  label: string;
}
const denshiShoninOptions: DenshiShoninOption[] = [
  { value: null, label: DENSHI_SHONIN_STATUS_NONE_LABEL },
  ...Object.entries(DENSHI_SHONIN_STATUS_LABELS).map(([value, label]) => ({
    value: Number(value),
    label,
  })),
];

// ─── ドロップダウン参照（マウント時一度） ─────────────────────────────────

// 管理支店 / 支店 / 配達販売店 のフィルタは Base*Dropdown（サーバ
// ページング + 検索 + 無限スクロール）に委譲。JA スコープは BE が適用。
const filterJaId = computed(() => authStore.user?.ja_id ?? 0);

// ─── 列（index.html §検索結果テーブルの12 + 操作） ───────────

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
    title: '配送先連絡先1',
    dataIndex: 'haitatsu_renrakusaki_1',
    key: 'haitatsu_renrakusaki_1',
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
    dataIndex: 'hanbaiten_code',
    key: 'hanbaiten_code',
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

// ─── 検証メッセージ（screen-design.md §メッセージ情報 のリテラル） ─

const MSG_EMAIL_INVALID = '正しいメール形式を入力してください。'; // ACSMS-MSG-014-008
const MSG_DATE_RANGE_INVALID =
  '日付の範囲指定が正しくありません。終了日は開始日以降を指定してください。';
const MSG_EXPORT_NO_DATA = '出力データがありません。'; // ACSMS-MSG-014-006
const MSG_EXPORT_LIMIT_EXCEEDED =
  '出力データ件数が30000件を超えています。検索条件を見直してください。'; // ACSMS-MSG-014-012
const MSG_EXPORT_SUCCESS = 'Excel出力が正常に完了しました。'; // ACSMS-MSG-014-005

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** インライン検証エラー — 検索カード内に表示し、入力した場所で確認できるように
 *  する（フィルタが多くトーストのみでは見落としやすい）。空文字 = エラーなし。 */
const validationError = ref<string>('');

/**
 * API 発行前にフィルタの組合せを検証。全チェック通過で true、違反時は
 * validationError に最初の違反を設定して false を返す。
 *
 * 3つの相関チェック（api.md §13/14）:
 *   - 購読開始日: from ≦ to
 *   - 購読中止日: from ≦ to
 *   - 適用日:     from ≦ to
 * 加えてメール形式チェック（ACSMS-MSG-014-008）。
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
  // 請求開始月: from ≦ to（YYYYMM 6桁は辞書順比較が数値順と一致する）。
  if (
    f.seikyu_kaishi_month_from &&
    f.seikyu_kaishi_month_to &&
    f.seikyu_kaishi_month_from > f.seikyu_kaishi_month_to
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
  if (f.tanka_id != null) params.tanka_id = f.tanka_id;
  // 有効単価フラグ: '' は両方（送らない）、'1'→true / '0'→false のみ送信。
  const activeTanka = toBoolean(f.active_tanka_flg);
  if (activeTanka !== undefined) params.active_tanka_flg = activeTanka;
}

/** フリーテキストフィルタ — 非空時のみコピー（空 → BE に値を渡さない）。 */
function applyTextFilters(
  params: DokusyaSearchParams,
  f: DokusyaFilters,
): void {
  if (f.kumiaiin_code) params.kumiaiin_code = f.kumiaiin_code;
  if (f.full_name) params.full_name = f.full_name;
  if (f.full_name_kana) params.full_name_kana = f.full_name_kana;
  if (f.haitatsu) params.haitatsu = f.haitatsu;
  if (f.bank_branch) params.bank_branch = f.bank_branch;
  if (f.renrakusaki) params.renrakusaki = f.renrakusaki;
  if (f.email) params.email = f.email;
  // 郵送区分は '0'/'1' の非空文字列（'0' も truthy なので単純判定で可）。
  if (f.yubin_kubun) params.yubin_kubun = f.yubin_kubun;
  if (f.biko) params.biko = f.biko;
  if (f.seikyu_kaishi_month_from)
    params.seikyu_kaishi_month_from = f.seikyu_kaishi_month_from;
  if (f.seikyu_kaishi_month_to)
    params.seikyu_kaishi_month_to = f.seikyu_kaishi_month_to;
}

/** 日付範囲フィルタ — 非空時のみコピー。 */
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

/** 空文字 + undefined を除去し、BE が falsy フィルタ値を見ないようにする。 */
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

/** Excel 出力用のフィルタのみ版（page/sort なし）。 */
function buildExportParams(): DokusyaSearchParams {
  const params = buildSearchParams();
  delete params.page;
  delete params.per_page;
  delete params.sort_by;
  delete params.sort_order;
  return params;
}

// ─── 取得 ──────────────────────────────────────────────────────────

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listDokusya(buildSearchParams());
    rows.value = res.data;
    total.value = res.meta.total;
    totalBusu.value = res.meta.total_busu ?? 0;
  } catch {
    // 想定内・無視: global axios interceptor が FORBIDDEN / 500 をトースト済み。
    // 再 throw は onMounted の fire-and-forget で unhandled rejection になる。
    // .claude/rules/vue.md の「想定内で意図的に無視」ケース。
    rows.value = [];
    total.value = 0;
    totalBusu.value = 0;
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

// ─── イベントハンドラ ─────────────────────────────────────────────────

function trimTextFilters(): void {
  // 各テキストフィルタをその場で trim し、貼付ゴミ / IME 確定スペースが ILIKE
  // パターンを変えないようにする。state.filters を直接更新し、trim 後の値が入力に
  // 反映される（明確な UX フィードバック）。
  const f = state.filters;
  f.kumiaiin_code = f.kumiaiin_code.trim();
  f.full_name = f.full_name.trim();
  f.full_name_kana = f.full_name_kana.trim();
  f.haitatsu = f.haitatsu.trim();
  f.bank_branch = f.bank_branch.trim();
  f.renrakusaki = f.renrakusaki.trim();
  f.email = f.email.trim();
  f.biko = f.biko.trim();
  // seikyu_kaishi_month_from/to は <a-date-picker> 由来の YYYYMM 文字列で空白を
  // 含まない。クリア時に antd が undefined をセットするため .trim() すると
  // TypeError → 検索ボタンで「エラーが発生しました」トーストになる。trim 対象外。
}

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // 全テキストフィルタを trim 後、クライアント検証（email / 日付範囲）。
  // false を返すと changed-since-applied ガード前に検索を中止する。
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
      // global axios interceptor が 403 DOKUSYA_READ_ONLY / 409 CONFLICT /
      // 500 を処理 — view は再トースト禁止。.claude/rules/vue.md
      // §Error Handling Architecture 参照。
    }
  });
}

// ─── 購読中止（解約予約）— 一覧の「購読中止」ボタン → ポップアップ ────────
//
// 顧客要件 2026-07: 購読中止日を選んで停止予約する。行データだけでは
// 請求開始月 / 最終変更適用日 / 解約予約有無 が分からないため、クリック時に
// 詳細(GET /dokusya/:id)を取得してからポップアップを開く。
//   - 紙版(1): カレンダーで購読中止日を選ぶ（未来日 + 購読開始日以降 + 最終変更
//     適用日より後）。既に予約があれば開かず警告（変更は履歴画面の取消経由）。
//   - 電子版(2): 「終了月」を選び月末日で停止する（当月以降 + 請求開始月以降）。
//     請求開始月が未設定なら料金徴収未開始 → クリック時に toast 警告して開かない。
//
// 顧客要件 2026-08（電子版のみ）: 予約済みでもポップアップを開き、予約中の終了月を
// 復元して見せる。そのうえで
//   - 別の月を選び直す → 予約変更（BE が旧予約を赤伝で無効化 + 新予約を append）
//   - 終了月をクリアして確定 → 予約取消（BE が旧予約を無効化するだけ）
// のどちらも同じ「確認」で送る。いずれも電子版へ cancel を push する（BE 側）。
// 電子版は履歴画面の取消(赤伝)が種別で禁止されており、ここが唯一の変更・取消導線。
//
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
/** ポップアップを開いた時点で解約予約があったか（＝クリア確定が「取消」になる）。 */
const stopHasReservation = ref(false);

/** 停止ポップアップ対象が電子版か（月ピッカー vs 日ピッカーの切替）。 */
const isStopDigital = computed(
  () => Number(stopTarget.value?.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL,
);

/**
 * 削除ボタン非活性の条件。
 *
 * 削除できるのは紙版(1)だけ（顧客要件 2026-08）。電子版・併読の会員は電子版
 * 読者管理システムが正なので、こちら側で消しても同期で戻るか、相手には居るのに
 * クラウド版から見えない状態になる。停止（購読中止）は電子版でも可能 — 消せない
 * のは行であって、購読をやめられないという意味ではない。
 *
 * `is_read_only` だけでは足りない。あれは 併読 と 電子版クレカ しか落とさず、
 * 電子版で口座引落などの支払方法は削除できてしまっていた。
 */
function isDeleteDisabled(row: DokusyaListItem): boolean {
  return (
    !canDelete.value ||
    !hasAnyDokusyaFlag.value ||
    row.is_read_only ||
    Number(row.dokusya_shubetsu) !== DokusyaShubetsu.PAPER
  );
}

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
  const digital = Number(detail.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL;
  // 紙版で既に有効な解約予約あり → 二重解約は不可（履歴画面で取消要）。電子版は
  // 予約済みでも開いて変更・取消できる（顧客要件 2026-08）。
  if (!digital && detail.has_active_kaiyaku) {
    message.warning(ALREADY_RESERVED_MSG);
    return;
  }
  // 電子版で請求開始月が未設定＝料金徴収未開始 → 停止不可（顧客要件 2026-07）。
  if (digital && !detail.seikyu_kaishi_month?.trim()) {
    message.warning(SEIKYU_NOT_STARTED_MSG);
    return;
  }
  stopTarget.value = detail;
  stopDate.value = null;
  // 予約中の終了月を復元する。予約行は未来日で有効行にならないが、購読中止日だけは
  // 予約時点で master へ反映されている（BE recomputeMaster・SCR-014 api.md v1.5）ので
  // 詳細の dokusya_chushi_date がそのまま「予約中の中止日」になる。
  const reserved = digital && detail.has_active_kaiyaku;
  stopHasReservation.value = reserved;
  stopMonth.value =
    reserved && detail.dokusya_chushi_date
      ? dayjs(detail.dokusya_chushi_date)
      : null;
  stopFieldError.value = null;
  stopModalOpen.value = true;
}

function closeStopModal(): void {
  stopModalOpen.value = false;
  stopTarget.value = null;
  stopDate.value = null;
  stopMonth.value = null;
  stopHasReservation.value = false;
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
  // 電子版で予約中に終了月をクリアした場合だけ空文字 = 予約取消（顧客要件 2026-08）。
  let chushi: string;
  if (isStopDigital.value) {
    if (!stopMonth.value) {
      if (!stopHasReservation.value) {
        stopFieldError.value = '購読中止日を入力してください。';
        return;
      }
      chushi = ''; // 予約取消
    } else {
      chushi = stopMonth.value.endOf('month').format('YYYY-MM-DD');
      // 予約中の月と同じものを選び直しただけ → 履歴も push も増やさない。
      // 「変更がありません。」は SCR-011 と同じ no-change 文言。
      if (stopHasReservation.value && chushi === t.dokusya_chushi_date) {
        stopFieldError.value = '変更がありません。';
        return;
      }
    }
  } else {
    if (!stopDate.value) {
      stopFieldError.value = '購読中止日を入力してください。';
      return;
    }
    chushi = stopDate.value.format('YYYY-MM-DD');
  }

  // 最終確認ダイアログ。ここまでの入力チェックを通ってから出すので、
  // 「はい」を押した後にフォームエラーで弾かれることはない。
  const text = buildStopConfirmText(chushi);
  // ダイアログを出す間は1枚目を隠す。モーダルが2枚重なると、確認文の後ろに
  // 入力欄と案内文が透けて読みづらい。閉じるのは表示フラグだけで、選択内容
  // (stopMonth / stopDate / stopHasReservation) は残す —「いいえ」で入力を
  // 失わずに戻すため。closeStopModal() は全部リセットするのでここでは使わない。
  stopModalOpen.value = false;
  confirmDanger(
    '購読中止確認',
    text,
    () => submitStop(t.dokusya_id, chushi),
    () => {
      stopModalOpen.value = true; // いいえ / ✕ / ESC → 入力内容のまま戻す
    },
  );
}

/**
 * 確認ダイアログ本文。何がどう変わるかを日付付きで言い切る
 * （「よろしいですか？」だけだと、変更なのか取消なのか読み取れない）。
 */
function buildStopConfirmText(chushi: string): string {
  if (chushi === '') {
    return '購読中止の予約を取り消します。よろしいですか？';
  }
  // 電子版は「選んだ月の月末」で止まるので、選択値(月)と実日付の両方を出す。
  const when = isStopDigital.value
    ? `${stopMonth.value?.format('YYYY/MM')}の月末（${formatDate(chushi)}）`
    : formatDate(chushi);
  return stopHasReservation.value
    ? `購読中止日を${when}に変更します。よろしいですか？`
    : `${when}で購読を中止します。よろしいですか？`;
}

/** 確認後の送信本体。エラー時はポップアップを開いたままフィールドエラーを出す。 */
async function submitStop(dokusyaId: number, chushi: string): Promise<void> {
  stopSubmitting.value = true;
  try {
    const res = await stopDokusya(dokusyaId, { dokusya_chushi_date: chushi });
    // 文言は BE が操作（予約 / 取消）に応じて決める。念のためのフォールバック付き。
    notify.success(res.message || '購読停止を予約しました。');
    closeStopModal();
    await fetchList();
  } catch (err) {
    // 失敗したら1枚目を出し直す（確認ダイアログを出す時に隠している）。エラーを
    // 出す場所であり、選択内容を直して再送する場でもあるので、閉じたままにすると
    // 操作が行き止まりになる。
    stopModalOpen.value = true;
    // VALIDATION_ERROR(400) は interceptor が toast しない設計なので、
    // フィールドエラーとしてポップアップ内に表示する。403/500 は interceptor
    // が toast 済み。
    const msg = extractStopFieldError(err);
    if (msg) stopFieldError.value = msg;
  } finally {
    stopSubmitting.value = false;
  }
}

// ─── Excel 出力 ──────────────────────────────────────────────────

function buildExportFilename(): string {
  // JST の YYYYMMDD_HHmmss — 必ず共通ヘルパー経由（ブラウザ local の
  // new Date().getHours() は非 JST ユーザーで誤刻印になる）。
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
    // EXPORT_NO_DATA (404) — interceptor の NOT_FOUND 分岐が既に
    // data.message（='出力データがありません。'）をトーストするが、スペックは
    // axios ではなく wrapper をモックするため interceptor がテストで走らない。
    // アサーション充足 + どちらのエラー経路でも確実に出すためここでトースト。
    if (code === 'EXPORT_NO_DATA') {
      message.error(MSG_EXPORT_NO_DATA);
      return;
    }
    // EXPORT_LIMIT_EXCEEDED (409) — VIEW_HANDLED_CODES にあり interceptor が
    // スキップするため view が必ずトーストする。
    if (code === 'EXPORT_LIMIT_EXCEEDED') {
      message.error(MSG_EXPORT_LIMIT_EXCEEDED);
      return;
    }
    // その他のエラーは global interceptor が処理 — view はトーストしない。
  }
}

// wrapper.vm.state 経由でフィルタを操作できるようスペックへ state を公開。
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

      <!-- 6. 住所（配達先住所4項目 + 購読者住所4項目を部分一致 OR 検索） -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">住所</span>
        <a-input
          v-model:value="state.filters.haitatsu"
          placeholder="住所"
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

        <!-- 電子版承認ステータス（ラジオ・ハードコード、m_code ではない） -->
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

      <!-- 詳細検索トグル — 常時表示項目と詳細エリアの間の全幅行
           （border-top + グレーボタン + アイコン、index.html 準拠）。 -->
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
        <!-- 13. 引落元口座支店（コード・名称を横断部分一致検索）。
             4カラムグリッドで半行占有（lg で 2/4 カラム）。 -->
        <div class="lg:col-span-2 flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">引落元口座支店</span>
          <a-input
            v-model:value="state.filters.bank_branch"
            placeholder="引落元口座支店コード・名称"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 15. 連絡先（購読者連絡先1/2・配達先連絡先1/2を横断部分一致検索） -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">連絡先</span>
          <a-input
            v-model:value="state.filters.renrakusaki"
            placeholder="連絡先"
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
          <!-- 請求開始月 (month range → YYYYMM 〜 YYYYMM) -->
          <div class="flex items-center gap-2 text-sm font-medium text-text-main">
            <span class="whitespace-nowrap">請求開始月</span>
            <a-date-picker
              v-model:value="state.filters.seikyu_kaishi_month_from"
              picker="month"
              value-format="YYYYMM"
              format="YYYYMM"
              placeholder="YYYYMM"
              allow-clear
              class="flex-1"
            />
            <span class="text-text-description">-</span>
            <a-date-picker
              v-model:value="state.filters.seikyu_kaishi_month_to"
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

        <!-- 19. 支払方法（ラジオ、m_code SHIHARAI_HOHO）— 全幅
             (col-span-full) にし、狭いグリッドセルで折返さず1行に並べる
             （index.html 準拠）。 -->
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

        <!-- 20. 郵送区分 (dropdown, m_code YUBIN_KUBUN: 0:空 / 1:郵送) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">郵送区分</span>
          <a-select
            v-model:value="state.filters.yubin_kubun"
            placeholder="郵送区分"
            allow-clear
            class="flex-1"
          >
            <a-select-option
              v-for="opt in codes.options('YUBIN_KUBUN')"
              :key="String(opt.value)"
              :value="String(opt.value)"
            >
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </div>

        <!-- 21. 新聞単価 (dropdown, tanka_id — JA スコープでカスケード) -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">新聞単価</span>
          <BaseTankaDropdown
            v-model:value="state.filters.tanka_id"
            :ja-id="filterJaId"
            placeholder="新聞単価"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 22. 備考 (text, 部分一致検索)。4カラムグリッドで半行占有（lg で 2/4）。 -->
        <div class="lg:col-span-2 flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">備考</span>
          <a-input
            v-model:value="state.filters.biko"
            placeholder="備考"
            allow-clear
            class="flex-1"
          />
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

      <!-- 検索 / 検索クリア（BaseSearchForm）+ Excel出力 を同じボタン行に
           （index.html 準拠）。詳細検索トグルはフォーム中段の独立行へ移動（上記）。 -->
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

    <!-- インライン検証エラー（ACSMS-MSG-014-008 メール形式、相関チェックの
         日付範囲違反）。結果エリア上部に表示し、トーストを探さず確認できるように。 -->
    <p
      v-if="validationError"
      class="text-error text-sm"
      data-test="dokusya-validation-error"
    >
      {{ validationError }}
    </p>

    <!-- ACSMS-MSG-014-002 — 検索結果0件メッセージは別要素で描画
         （BaseDataTable の動的スロットループは a-table の #emptyText を
         安全に転送できない）。 -->
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
      :total-suffix="totalSuffix"
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
        <!-- 日付列 — YYYY/MM/DD（Asia/Tokyo 固定）に整形し、Date.toString() 生値
             ではなく JST 日付をセルに表示する。 -->
        <template v-else-if="column.key === 'shoki_dokusya_kaishi_date'">
          {{ formatDate((record as DokusyaListItem).shoki_dokusya_kaishi_date) }}
        </template>
        <template v-else-if="column.key === 'dokusya_chushi_date'">
          {{ formatDate((record as DokusyaListItem).dokusya_chushi_date) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex justify-center items-center gap-3">
            <!-- 購読中止（解約予約）— 削除リンクの前に配置。更新権限なし / 編集不可
                 (併読・電子版クレカ) / 既に解約済み のとき非活性。 -->
            <button
              type="button"
              :disabled="isStopDisabled(record as DokusyaListItem)"
              class="text-primary hover:text-primary-hover font-medium disabled:text-text-disabled disabled:hover:text-text-disabled disabled:cursor-not-allowed"
              data-test="stop-button"
              @click="openStopModal(record as DokusyaListItem)"
            >
              購読中止
            </button>
            <!-- 削除 は表示のまま非活性（条件は isDeleteDisabled 参照）。
                 編集導線は上の 購読者名 アンカー（ここではない）。 -->
            <BaseActionColumn
              :can-edit="false"
              :disable-delete="isDeleteDisabled(record as DokusyaListItem)"
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
      title="購読中止"
      ok-text="確認"
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
          <!-- 電子版: 終了月ピッカー + 「月末で終了」。当月以降 + 請求開始月以降。
               予約中は選択済みの月が入った状態で開く。allow-clear でクリアして確定
               すると予約取消になる（顧客要件 2026-08）。 -->
          <template v-if="isStopDigital">
            <a-date-picker
              v-model:value="stopMonth"
              picker="month"
              format="YYYY/MM"
              placeholder="終了月を選択"
              aria-label="購読中止日"
              :disabled-date="disabledStopMonth"
              :allow-clear="stopHasReservation"
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
        <!-- 予約中(電子版)のときだけ、この画面で何ができるかを明示する。ピッカーの
             × が「予約取消」を意味することは見ただけでは分からないため。 -->
        <p
          v-if="stopHasReservation"
          class="text-text-description text-sm"
          data-test="stop-reserved-note"
        >
          解約予約中です。終了月を選び直すと予約を変更し、空にすると予約を取り消します。
        </p>
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
