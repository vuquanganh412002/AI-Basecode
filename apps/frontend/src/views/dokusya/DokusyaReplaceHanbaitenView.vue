<script setup lang="ts">
// ACSMS-SCR-015 — 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面）。
//
// GET /api/v1/dokusya/replace-hanbaiten/search で購読中 (tetsuzuki_shurui=1) を
// 検索し、≥1行チェック後に POST /api/v1/dokusya/replace-hanbaiten で
// 配達販売店を一括置換する。
//
// 機能定義 (screen-design.md §機能定義):
//   1.x  初期表示 — 管理支店選択まで 支店 disabled; 適用日は検索エリアの必須
//        項目（常時表示）; ≥1行選択まで 置換先配達販売店 非表示; 置換処理実行
//        disabled; 購読者一覧は自動読込しない（顧客要件）。
//   2.x  検索 — 適用日(必須・未来日) + filters → searchDokusyaForReplace;
//        その適用日で置換可能な購読者のみ返る; empty → MSG-015-001。
//   3.x  検索クリア — filters(適用日含む) + 結果一覧 + 選択をリセット、置換先を隠す。
//   4.1  検証 — 置換先必須 (MSG-015-004; 適用日は検索で入力・検証済み);
//        置換先 ≠ 現在の販売店 (MSG-015-005); 併読 (dokusya_shubetsu=3) /
//        電子版クレカ (dokusya_shubetsu=2 && shiharai_hoho=6) は対象外
//        (MSG-015-006)。失敗時: メッセージ表示 + API 呼ばない。
//   4.2/4.3 確認 (MSG-015-007) → replaceDokusyaHanbaiten → 成功トースト
//        (MSG-015-008) + 選択解除 + 一覧再取得。
//   7.x  管理支店変更 → 支店リセット + getShitenDropdown(kanri_shiten_id);
//        管理支店クリア → 支店を disable/空に。
//
// 権限: dokusya.replace_hanbaiten (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN)
// — route guard (meta.permission) でゲート。
//
// サーバーエラー (SAME_HANBAITEN / INELIGIBLE_DOKUSYA / DATE_RANGE_INVALID) は
// global axios interceptor が集中トースト。view は §4.1 でクライアント事前検証し、
// サーバー拒否時はローカル submitting のみリセット（再トーストしない）。

import { computed, ref, watch } from 'vue';
import { Modal, message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseKanriShitenDropdown from '@/components/common/BaseKanriShitenDropdown.vue';
import BaseHanbaitenDropdown from '@/components/common/BaseHanbaitenDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useAuthStore } from '@/stores/auth.store';
import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
import { useCodesStore } from '@/stores/codes.store';
import { isTodayOrPastDayTokyo, todayIsoTokyo } from '@/utils/datetime';
import {
  searchDokusyaForReplace,
  replaceDokusyaHanbaiten,
  type ReplaceSearchItem,
  type ReplaceSearchParams,
} from '@/api/dokusya/dokusya';
// 支店 だけは「管理支店選択まで読込まない」遅延カスケード（機能定義 1.3）のため
// 専用の getShitenDropdown を直接使う。管理支店 / 販売店 は Base*Dropdown に委譲。
import { getShitenDropdown } from '@/api/shiten/shiten';

// ─── Filter state ─────────────────────────────────────────────────────

interface ReplaceFilters {
  kanri_shiten_id: number | undefined;
  shiten_id: number | undefined;
  kumiaiin_code: string;
  shimei: string;
  shimei_kana: string;
  haitatsu_address: string;
  hanbaiten_id: number | undefined;
  dokusya_kaishi_date_from: string;
  dokusya_kaishi_date_to: string;
  /** 購読種別（必須・1:紙版 / 2:電子版）。この種別で購読者を絞り込む。未選択は undefined。 */
  dokusya_shubetsu: number | undefined;
  /** 情報変更適用日（必須）。紙版=未来日のみ／電子版=本日のみ。置換可能な購読者のみ検索。 */
  joho_henko_tekiyo_date: string;
  /** 置換先配達販売店（必須）。検索では「有効レコードの販売店 ≠ 置換先」で絞り、
   *  置換実行のターゲットにもなる（顧客要件 2026-07）。未選択は undefined。 */
  new_hanbaiten_id: number | undefined;
}

const DEFAULT_FILTERS: ReplaceFilters = {
  kanri_shiten_id: undefined,
  shiten_id: undefined,
  kumiaiin_code: '',
  shimei: '',
  shimei_kana: '',
  haitatsu_address: '',
  hanbaiten_id: undefined,
  dokusya_kaishi_date_from: '',
  dokusya_kaishi_date_to: '',
  dokusya_shubetsu: undefined,
  joho_henko_tekiyo_date: '',
  new_hanbaiten_id: undefined,
};

const authStore = useAuthStore();

const {
  state,
  loading,
  total,
  onChange,
  searchActions,
} = useTableQuery<ReplaceFilters>({
  defaultFilters: { ...DEFAULT_FILTERS },
  defaultSortBy: 'kumiaiin_code',
  defaultSortOrder: 'asc',
});

const rows = ref<ReplaceSearchItem[]>([]);
const selectedRowKeys = ref<number[]>([]);

/** 検索を1回でも実行したか（初期表示は自動検索しない → 未検索時は空文言を出さない）。 */
const searched = ref(false);

const submitting = ref(false);

/** 検索カード内に表示する検証メッセージ（置換の事前検証）。 */
const replaceError = ref<string>('');

// ─── Dropdown lookups ────────────────────────────────────────────────

interface ShitenOption {
  shiten_id: number;
  shiten_name: string;
}

// 支店 だけ専用 state を持つ（遅延カスケード）。管理支店 / 販売店 は
// Base*Dropdown が内部で候補を保持する。
const shitenOptions = ref<ShitenOption[]>([]);

/** Base*Dropdown の JA スコープ（セッションの JA）。 */
const filterJaId = computed(() => authStore.user?.ja_id ?? 0);

/** 機能定義 1.1 — 管理支店が選ばれるまで 支店 は disabled。 */
const isShitenDisabled = computed(
  () => state.filters.kanri_shiten_id === undefined ||
    state.filters.kanri_shiten_id === null,
);

/** ≥1行チェックで 置換先 を表示し 置換処理実行 を有効化（適用日は検索条件で常時表示）。 */
const hasSelection = computed(() => selectedRowKeys.value.length > 0);

const codes = useCodesStore();

/** 一括置換の購読種別ラジオ候補 — 紙版(1) / 電子版(2) のみ（併読は対象外）。
 *  ラベルは m_code(DOKUSYA_SHUBETSU) から取得（ハードコード禁止・vue.md §m_code）。 */
const shubetsuOptions = computed(() =>
  codes
    .options('DOKUSYA_SHUBETSU')
    .filter(
      (o) =>
        Number(o.value) === DokusyaShubetsu.PAPER ||
        Number(o.value) === DokusyaShubetsu.DIGITAL,
    ),
);

/** 購読種別=電子版 が選択されているか（適用日=当日固定の判定）。 */
const isDigitalShubetsu = computed(
  () => state.filters.dokusya_shubetsu === DokusyaShubetsu.DIGITAL,
);

/** 適用日ピッカーは 購読種別 未選択 か 電子版（本画面では対象外）のとき入力不可。
 *  紙版のときだけカレンダーで未来日を選べる（顧客要件 2026-07）。 */
const isTekiyoDateDisabled = computed(
  () => state.filters.dokusya_shubetsu === undefined || isDigitalShubetsu.value,
);

/** 検索エリアの購読種別/適用日バリデーションメッセージ。 */
const searchError = ref<string>('');
/** 購読種別 直下に出す検索バリデーションメッセージ（未選択）。 */
const shubetsuError = ref<string>('');
/** 置換先配達販売店 直下に出す検索バリデーションメッセージ（必須／置換元と同一）。 */
const destError = ref<string>('');

/** 電子版は本画面（販売店一括置換）の対象外である旨のメッセージ（顧客要件 2026-07 改訂・
 *  ACSMS-MSG-015-009）。電子版=電子配信で販売店を持たないため一括置換できない。 */
const MSG_DIGITAL_UNSUPPORTED = '電子版は本画面では対象外です。';

// 購読種別を選ぶと検索条件が変わる（顧客要件 2026-07 改訂）:
//   電子版 → 本画面では対象外。トーストで通知し検索ボタンを無効化する
//            （インラインメッセージは出さない・検索不可のため適用日はクリアし
//            ピッカー非活性のまま）。
//   紙版   → 未来日のみ → 適用日をクリアしユーザーにカレンダー入力させる。
// どちらも適用日をクリアするため、既存の検索結果・選択・置換フォームは
// joho_henko_tekiyo_date の watch がまとめてリセットする。
watch(
  () => state.filters.dokusya_shubetsu,
  (shubetsu) => {
    state.filters.joho_henko_tekiyo_date = '';
    searchError.value = '';
    shubetsuError.value = '';
    destError.value = '';
    if (shubetsu === DokusyaShubetsu.DIGITAL) {
      message.warning(MSG_DIGITAL_UNSUPPORTED); // トーストのみ（顧客要件 2026-07）
    }
  },
);

/** 機能定義 7.x — 選択した管理支店にスコープした 支店 一覧を読込む。 */
async function fetchShitenDropdown(kanriShitenId: number): Promise<void> {
  try {
    const res = await getShitenDropdown({ kanri_shiten_id: kanriShitenId });
    shitenOptions.value = res.data.map((r) => ({
      shiten_id: r.shiten_id,
      shiten_name: r.shiten_name,
    }));
  } catch {
    shitenOptions.value = [];
  }
}

// 機能定義 7.x — 管理支店（BaseKanriShitenDropdown の v-model）が変わったら
// 支店選択をリセットし、値があれば 支店 候補をスコープして再読込、クリア時は
// 支店候補を空にする（遅延読込）。spec が filter を直接書換えるケースも拾う。
watch(
  () => state.filters.kanri_shiten_id,
  (next, prev) => {
    if (next === prev) return;
    state.filters.shiten_id = undefined;
    if (next === undefined || next === null) {
      shitenOptions.value = [];
      return;
    }
    void fetchShitenDropdown(next);
  },
);

// ─── 列（index.html 検索結果テーブル準拠） ──────────────────────────

const columns: TableColumnsType = [
  {
    title: '管理支店',
    dataIndex: 'kanri_shiten_name',
    key: 'kanri_shiten_name',
    sorter: true,
    width: 150,
  },
  {
    title: '支店',
    dataIndex: 'shiten_name',
    key: 'shiten_name',
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
  { title: '購読者名', dataIndex: 'shimei', key: 'shimei', width: 160 },
  {
    title: '配達先郵便',
    dataIndex: 'haitatsu_yubin_no',
    key: 'haitatsu_yubin_no',
    width: 120,
  },
  {
    title: '配達先住所',
    dataIndex: 'haitatsu_address',
    key: 'haitatsu_address',
    width: 280,
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
];

/** a-table 行選択設定 — チェックボックス列 + 全選択。 */
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]): void => {
    selectedRowKeys.value = keys.map(Number);
  },
}));

// ─── Fetch / search ───────────────────────────────────────────────────

function buildSearchParams(): ReplaceSearchParams {
  const f = state.filters;
  const params: ReplaceSearchParams = {
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as ReplaceSearchParams['sort_by'],
    sort_order: state.sort_order,
    // 適用日 + 購読種別 + 置換元 + 置換先 は必須（検索前に validateSearch で担保）。
    joho_henko_tekiyo_date: f.joho_henko_tekiyo_date,
    dokusya_shubetsu: f.dokusya_shubetsu as number,
    new_hanbaiten_id: f.new_hanbaiten_id as number,
  };
  // 管理支店 / 販売店 は Base*Dropdown が未選択時 null を emit（!= null で両対応）。
  if (f.kanri_shiten_id != null) params.kanri_shiten_id = f.kanri_shiten_id;
  if (f.shiten_id !== undefined) params.shiten_id = f.shiten_id;
  if (f.kumiaiin_code) params.kumiaiin_code = f.kumiaiin_code;
  if (f.shimei) params.shimei = f.shimei;
  if (f.shimei_kana) params.shimei_kana = f.shimei_kana;
  if (f.haitatsu_address) params.haitatsu_address = f.haitatsu_address;
  // 配達販売店（置換元）は任意 — 指定時のみ絞り込みに送る。
  if (f.hanbaiten_id != null) params.hanbaiten_id = f.hanbaiten_id;
  if (f.dokusya_kaishi_date_from)
    params.dokusya_kaishi_date_from = f.dokusya_kaishi_date_from;
  if (f.dokusya_kaishi_date_to)
    params.dokusya_kaishi_date_to = f.dokusya_kaishi_date_to;
  return params;
}

async function fetchList(): Promise<void> {
  // 適用日（必須）が無ければ検索しない — 未入力/クリア直後は空状態に戻す。
  // onSearch で必須検証済みのため、通常はここに空で来るのはクリア/初期のみ。
  if (!state.filters.joho_henko_tekiyo_date?.trim()) {
    rows.value = [];
    total.value = 0;
    searched.value = false;
    return;
  }
  loading.value = true;
  try {
    const res = await searchDokusyaForReplace(buildSearchParams());
    rows.value = res.data;
    total.value = res.meta.total;
    searched.value = true;
  } catch {
    // 想定内・無視: global axios interceptor が FORBIDDEN / 500 を
    // トースト済み（.claude/rules/vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
    searched.value = true;
  } finally {
    loading.value = false;
  }
}

// 顧客要件: 初期表示では購読者を自動読込しない。適用日(必須)を入力して「検索」
// を押して初めて、その適用日で置換可能な購読者を一覧表示する。
// 管理支店 / 販売店 候補は Base*Dropdown が onMounted で自前読込する。

// ─── Event handlers ───────────────────────────────────────────────────

function trimTextFilters(): void {
  const f = state.filters;
  f.kumiaiin_code = f.kumiaiin_code.trim();
  f.shimei = f.shimei.trim();
  f.shimei_kana = f.shimei_kana.trim();
  f.haitatsu_address = f.haitatsu_address.trim();
}

// 検索 / 検索クリア — shared guard+fetch wiring (useTableQuery.searchActions)。
// 表示中の一覧と同じ条件での 検索 連打、デフォルト状態での クリア 連打は API を
// 呼ばない（重複呼び出し防止）。クリアは選択行・置換フォーム等のローカル状態を
// 常にクリアしてから、絞り込み中なら条件をリセットして一覧を再取得する。
const { onSearch: runSearch, onClear: runClear } = searchActions({
  fetchList,
  beforeSearch: trimTextFilters,
  beforeClear() {
    // 置換先を含む全フィルタは resetFilters が DEFAULT_FILTERS へ戻す。
    selectedRowKeys.value = [];
    shitenOptions.value = [];
    replaceError.value = '';
  },
});

/** 検索前チェック — 購読種別必須 + 電子版対象外ガード + 適用日必須 + 紙版の日付ルール
 *   （BE と同一基準・紙版=未来日のみ > 本日）。電子版は本画面の対象外のため検索させない
 *   （通常は検索ボタンが無効化されるが、防御的に validateSearch でも弾く）。 */
function validateSearch(): boolean {
  searchError.value = '';
  shubetsuError.value = '';
  destError.value = '';

  // 電子版は本画面の対象外（ACSMS-MSG-015-009）。トーストで通知済みのため、他項目は
  // 検証せず即ブロックする（インラインメッセージは出さない）。
  if (isDigitalShubetsu.value) {
    return false;
  }

  // 顧客要件: submit 時に全必須項目を一度に検証し、該当メッセージを各フィールド
  // 直下へまとめて表示する（1件ずつ順番に出さない）。
  let ok = true;

  // 購読種別（必須）— メッセージは購読種別フィールド直下。
  if (state.filters.dokusya_shubetsu === undefined) {
    shubetsuError.value = '購読種別を選択してください。';
    ok = false;
  }

  // 適用日（必須・紙版は未来日のみ）— メッセージは適用日フィールド直下。
  const d = state.filters.joho_henko_tekiyo_date;
  if (!d?.trim()) {
    searchError.value = '適用日を入力してください。'; // ACSMS-MSG-015-004
    ok = false;
  } else if (d <= todayIsoTokyo()) {
    searchError.value = '紙版の適用日は本日より後の日付を入力してください。';
    ok = false;
  }

  // 置換先配達販売店（必須）+ 配達販売店（任意）と同一チェック — メッセージは
  // 置換先フィールド直下。置換先は「有効履歴の販売店 ≠ 置換先」で絞り、置換実行の
  // ターゲットにもなる（顧客要件 2026-07）。配達販売店（置換元）は任意。
  if (state.filters.new_hanbaiten_id == null) {
    destError.value = '置換先配達販売店を選択してください。';
    ok = false;
  } else if (
    state.filters.hanbaiten_id != null &&
    state.filters.hanbaiten_id === state.filters.new_hanbaiten_id
  ) {
    destError.value =
      '配達販売店と置換先配達販売店が同じです。異なる販売店を選択してください。';
    ok = false;
  }

  return ok;
}

/** 検索 — 適用日を検証してから searchActions.onSearch を実行する。 */
function onSearch(): void {
  if (!validateSearch()) return;
  runSearch();
}

/** 検索クリア — 適用日を含む全フィルタ・検索結果・選択・置換フォームをリセット。
 * 適用日が空になるため runClear 内の fetchList は空ガードで API を呼ばず空状態に戻る。 */
function onClear(): void {
  searchError.value = '';
  shubetsuError.value = '';
  destError.value = '';
  runClear();
  rows.value = [];
  total.value = 0;
  searched.value = false;
}

// 適用日を変更したら、既存の検索結果は別の適用日で置換可能な集合になり得るため
// 破棄して再検索を促す（古い結果で置換実行しないため）。
watch(
  () => state.filters.joho_henko_tekiyo_date,
  () => {
    if (searched.value) {
      rows.value = [];
      total.value = 0;
      searched.value = false;
      selectedRowKeys.value = [];
      replaceError.value = '';
    }
  },
);

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

// ─── 置換の検証メッセージ（screen-design.md §MSG のリテラル） ─

const MSG_REQUIRED = '必須項目です。'; // ACSMS-MSG-015-004
const MSG_SAME_HANBAITEN = '現在の販売店と同じ販売店は選択できません。'; // ACSMS-MSG-015-005
const MSG_INELIGIBLE = '電子版クレカ決済者・併読者は編集・削除できません。'; // ACSMS-MSG-015-006
const MSG_CONFIRM = '選択した購読者の販売店を置換します。よろしいでしょうか？'; // ACSMS-MSG-015-007
const MSG_SUCCESS = '置換処理が完了しました。'; // ACSMS-MSG-015-008

/** 現在チェック済みの行。 */
const selectedRows = computed(() =>
  rows.value.filter((r) => selectedRowKeys.value.includes(r.dokusya_id)),
);

/**
 * 機能定義 4.1 — クライアント事前検証。全チェック通過で true、違反時は
 * replaceError に最初の違反を設定して false を返す。
 */
function validateReplace(): boolean {
  replaceError.value = '';
  // 置換先は検索条件（必須）で入力・検証済み。防御的に未選択を弾く。
  const newHanbaitenId = state.filters.new_hanbaiten_id;
  if (newHanbaitenId === undefined || newHanbaitenId === null) {
    replaceError.value = MSG_REQUIRED;
    return false;
  }
  // 置換先 ≠ 選択行の現在の販売店。
  if (selectedRows.value.some((r) => r.hanbaiten_id === newHanbaitenId)) {
    replaceError.value = MSG_SAME_HANBAITEN;
    return false;
  }
  // 併読 / 電子版クレカ は対象外。
  const ineligible = selectedRows.value.some(
    (r) =>
      r.dokusya_shubetsu === DokusyaShubetsu.BOTH ||
      (r.dokusya_shubetsu === DokusyaShubetsu.DIGITAL &&
        r.shiharai_hoho === ShiharaiHoho.CREDIT_CARD),
  );
  if (ineligible) {
    replaceError.value = MSG_INELIGIBLE;
    return false;
  }
  return true;
}

async function runReplace(): Promise<void> {
  const newHanbaitenId = state.filters.new_hanbaiten_id;
  if (newHanbaitenId === undefined) return;
  submitting.value = true;
  try {
    await replaceDokusyaHanbaiten({
      dokusya_ids: [...selectedRowKeys.value],
      // 置換先・適用日・購読種別は検索条件の値をそのまま使う（検索で入力・検証済み）。
      new_hanbaiten_id: newHanbaitenId,
      joho_henko_tekiyo_date: state.filters.joho_henko_tekiyo_date,
      dokusya_shubetsu: state.filters.dokusya_shubetsu as number,
    });
    // 主語付きのカスタム文言 — 動詞のみの notify ヘルパーでは不足。
    message.success(MSG_SUCCESS);
    selectedRowKeys.value = [];
    replaceError.value = '';
    await fetchList();
  } catch {
    // サーバー拒否 (SAME_HANBAITEN / INELIGIBLE_DOKUSYA / DATE_RANGE_INVALID) は
    // global axios interceptor がトースト。view は submitting のみリセット
    // （再トースト・成功表示なし）。
  } finally {
    submitting.value = false;
  }
}

function onExecuteReplace(): void {
  if (!validateReplace()) return;
  Modal.confirm({
    title: '置換確認',
    content: MSG_CONFIRM,
    okText: 'はい',
    cancelText: 'いいえ',
    okType: 'primary',
    onOk() {
      return runReplace();
    },
  });
}

// スペックが操作・参照するリアクティブ状態を公開。
defineExpose({
  state,
  selectedRowKeys,
  rows,
  submitting,
  isShitenDisabled,
  shitenOptions,
});
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア -->
    <BaseSearchForm
      :loading="loading"
      :disable-submit="hasSelection || isDigitalShubetsu"
      :columns="3"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- レイアウト — この画面だけ 4 列ではなく 3 列 ────────────────
        この検索フォームは他より 1 項目あたりの必要幅が大きい。1 セルに
        「ラベル + 必須 + ラジオ2件」を折り返さず収めるには 購読種別 で実測
        ≈210px 要るが、4 列だと 1 セルは
          (コンテナ960px - カード padding 32 - gap 16×3) / 4 = 220px
        しかなく、ラベルと 紙版/電子版 が同じ行に並ばない（顧客指摘 2026-08）。
        3 列なら (960 - 32 - 16×2) / 3 = 298px 取れて余裕を持って 1 行に入る。

        3 列にすると項目数 11（購読開始日のみ2セル）がちょうど埋まり、
        col-start のような小細工なしで最後の 3 項目が 1 行に並ぶ:
          行1: 管理支店 | 支店 | 組合員コード
          行2: 氏名 | かな氏名 | 配達先住所
          行3: 配達販売店 | 購読開始日(2)
          行4: 購読種別 | 適用日 | 置換先配達販売店

        購読開始日 だけ @lg:col-span-2 なのは日付レンジ（ピッカー2つ + 区切り）
        で実質2項目分の幅が要るため。しきい値が @lg なのは 2 列時にも効かせる
        ため（2列 = 1セル ≈310px ではレンジが入らないので全幅にする）。
        1 列時は span が意味を持たず、そのまま縦積みになる。
      -->

      <!-- 管理支店 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <BaseKanriShitenDropdown
          v-model:value="state.filters.kanri_shiten_id"
          :ja-id="filterJaId"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 支店 (disabled until 管理支店 chosen) -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店</span>
        <a-select
          v-model:value="state.filters.shiten_id"
          placeholder="選択してください"
          allow-clear
          :disabled="isShitenDisabled"
          class="flex-1 min-w-0"
        >
          <a-select-option
            v-for="opt in shitenOptions"
            :key="opt.shiten_id"
            :value="opt.shiten_id"
          >
            {{ opt.shiten_name }}
          </a-select-option>
        </a-select>
      </div>

      <!-- 組合員コード — 半角数字10桁まで（screen-design.md ACSMS-SCR-011 §7 と同じ
           業務ルール。t_dokusya.kumiaiin_code は VARCHAR(20) だが実データは常に
           10桁以内）。タスク #57608。 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">組合員コード</span>
        <a-input
          id="kumiaiin_code"
          v-model:value="state.filters.kumiaiin_code"
          placeholder="組合員コード"
          allow-clear
          :maxlength="10"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 氏名 — screen-design.md §3 検索条件 100文字（タスク #57608） -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">氏名</span>
        <a-input
          id="shimei"
          v-model:value="state.filters.shimei"
          placeholder="氏名"
          allow-clear
          :maxlength="100"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- かな氏名 — screen-design.md §3 検索条件 200文字（タスク #57608） -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">かな氏名</span>
        <a-input
          id="shimei_kana"
          v-model:value="state.filters.shimei_kana"
          placeholder="かな氏名"
          allow-clear
          :maxlength="200"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 配達先住所 — screen-design.md §3 検索条件 300文字（タスク #57608） -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達先住所</span>
        <a-input
          id="haitatsu_address"
          v-model:value="state.filters.haitatsu_address"
          placeholder="配達先住所"
          allow-clear
          :maxlength="300"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 配達販売店（任意）— 指定時のみ「適用日時点の有効履歴の配達販売店 = この値」で
           追加絞り込みする（置換元の絞り込み。未指定なら置換先以外の全販売店が対象）。 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達販売店</span>
        <BaseHanbaitenDropdown
          v-model:value="state.filters.hanbaiten_id"
          :ja-id="filterJaId"
          dummy="exclude"
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 購読開始日 (date range) -->
      <div class="@lg:col-span-2 flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">購読開始日</span>
        <a-date-picker
          id="dokusya_kaishi_date_from"
          v-model:value="state.filters.dokusya_kaishi_date_from"
          value-format="YYYY-MM-DD"
          format="YYYY/MM/DD"
          placeholder="YYYY/MM/DD"
          allow-clear
          class="flex-1 min-w-0"
        />
        <span class="text-text-description">-</span>
        <a-date-picker
          id="dokusya_kaishi_date_to"
          v-model:value="state.filters.dokusya_kaishi_date_to"
          value-format="YYYY-MM-DD"
          format="YYYY/MM/DD"
          placeholder="YYYY/MM/DD"
          allow-clear
          class="flex-1 min-w-0"
        />
      </div>

      <!-- 購読種別 (必須・紙版/電子版のみ) — 対象種別で購読者を絞り込む。選択するまで
           適用日は入力不可（顧客要件 2026-07）。電子版=当日のみ / 紙版=未来日のみ。 -->
      <div class="text-sm font-medium text-text-main">
        <!-- 必須マークはラベル span の中に入れる（別の flex アイテムにしない）。
             独立させると flex の gap が1つ増え、その分ラジオの使える幅が減る。

             ラジオグループは flex-1 min-w-0 にしない: それだとラベルを引いた
             残り幅まで縮められ、足りないと「紙版 / 電子版」がグループ内部で
             2行に割れる。内容幅のまま + whitespace-nowrap にすることで
             紙版・電子版の間では絶対に折り返さない。1セルに収まらない場合は
             親の flex-wrap でグループごと次の行へ落ちる（ラベルの下に
             ラジオ2件が1行で並ぶ）ので、最悪でも1行は保たれる。 -->
        <div class="flex items-start flex-wrap gap-2">
          <span class="whitespace-nowrap leading-[22px]">
            購読種別<span class="text-error ml-1">*</span>
          </span>
          <a-radio-group
            name="dokusya_shubetsu"
            v-model:value="state.filters.dokusya_shubetsu"
            data-test="replace-shubetsu"
            class="whitespace-nowrap"
          >
            <a-radio
              v-for="opt in shubetsuOptions"
              :key="opt.value"
              :value="Number(opt.value)"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </div>
        <p
          v-if="shubetsuError"
          class="text-error text-sm font-normal mt-1"
          data-test="replace-shubetsu-error"
        >
          {{ shubetsuError }}
        </p>
      </div>

      <!-- 適用日 (必須) — 購読種別 選択後に有効化。紙版=未来日のみ（カレンダー入力）／
           電子版=本日を自動セットしピッカーを非活性化（顧客要件 2026-07）。この日付で
           置換可能な購読者のみ検索。必須/日付エラーはこの項目の直下に表示する。 -->
      <div class="text-sm font-medium text-text-main">
        <div class="flex items-center gap-2">
          <span class="whitespace-nowrap">適用日</span>
          <span class="text-error">*</span>
          <a-date-picker
            id="joho_henko_tekiyo_date"
            v-model:value="state.filters.joho_henko_tekiyo_date"
            value-format="YYYY-MM-DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            :disabled="isTekiyoDateDisabled"
            :disabled-date="isTodayOrPastDayTokyo"
            data-test="replace-tekiyo-date"
            class="flex-1 min-w-0"
          />
        </div>
        <p
          v-if="searchError"
          class="text-error text-sm font-normal mt-1"
          data-test="replace-search-error"
        >
          {{ searchError }}
        </p>
      </div>

      <!-- 置換先配達販売店（必須・顧客要件 2026-07）— 適用日の直後に配置。検索では
           「適用日時点の有効履歴の販売店 ≠ 置換先」で絞り込み（= 置換元 かつ ≠ 置換先）、
           置換実行のターゲットにもなる。 -->
      <div class="text-sm font-medium text-text-main">
        <div class="flex items-center gap-2">
          <span class="whitespace-nowrap">置換先配達販売店</span>
          <span class="text-error">*</span>
          <BaseHanbaitenDropdown
            v-model:value="state.filters.new_hanbaiten_id"
            :ja-id="filterJaId"
            dummy="exclude"
            class="flex-1 min-w-0"
          />
        </div>
        <p
          v-if="destError"
          class="text-error text-sm font-normal mt-1"
          data-test="replace-dest-error"
        >
          {{ destError }}
        </p>
      </div>

      <!-- 置換処理実行 — ≥1行選択で有効化。 -->
      <template #extra>
        <a-button
          html-type="button"
          type="primary"
          :disabled="!hasSelection"
          :loading="submitting"
          @click="onExecuteReplace"
        >
          置換処理実行
        </a-button>
      </template>
    </BaseSearchForm>

    <!-- Replace pre-flight validation message (ACSMS-MSG-015-004/005/006). -->
    <p
      v-if="replaceError"
      class="text-error text-sm"
      data-test="replace-validation-error"
    >
      {{ replaceError }}
    </p>

    <!-- ACSMS-MSG-015-001 — empty-result message。検索を実行した後のみ表示する
         （初期表示は自動検索しないため、未検索時は空文言を出さない）。 -->
    <p
      v-if="searched && !loading && total === 0"
      class="text-text-description text-sm"
      data-test="replace-empty-message"
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
      :row-selection="rowSelection"
      row-key="dokusya_id"
      @change="onPageChange"
    />
  </div>
</template>
