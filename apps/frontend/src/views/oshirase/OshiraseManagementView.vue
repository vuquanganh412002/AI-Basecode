<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { Modal, type TableColumnsType } from 'ant-design-vue';
import type { AxiosError } from 'axios';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import {
  listOshirase,
  getOshirase,
  createOshirase,
  updateOshirase,
  removeOshirase,
  type OshiraseListItem,
  type CreateOshiraseBody,
} from '@/api/oshirase/oshirase';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { confirmDelete } from '@/utils/confirm';
import type { Dayjs } from 'dayjs';
import {
  nowTokyo,
  isPastDayTokyo,
  nowMinuteFloorTokyo,
  parseDatetimeTokyo,
  pickerToTokyoWallclock,
} from '@/utils/datetime';
import { listRolesDropdown } from '@/api/roles/roles';
import { useCodesStore } from '@/stores/codes.store';
import { OshiraseStatus, OshiraseType, PublishLocation } from '@/constants/enums';

// [m_code-driven] お知らせ種別 / 公開場所 / 状態 のラベル & 選択肢は
// `m_code` 由来とし、ハードコードを排除する（vue.md §m_code rules）。
// 値で分岐するロジックは Group A の TS 定数（PublishLocation /
// OshiraseType / OshiraseStatus）で表現する — マジックナンバーは置かない。
const codes = useCodesStore();
const notify = useNotify();

// 締め切り時間 (OshiraseType.DEADLINE) は PublishLocation.MENU_DEADLINE との
// 1:1 ペアリング・システム全体で一意・削除不可を駆動する特殊スロット。
// 下の computed / watcher で使用。別名を作らず enum を直接参照する。

interface OshiraseFilters {
  // この画面に検索フィルタは無いが useTableQuery が型を要求する。将来拡張用。
  _placeholder?: never;
}

interface OshiraseFormState {
  title: string;
  publish_location: number | null;
  status: number | null;
  publish_start_date: string;
  publish_end_date: string;
  ja_id: number | null;
  oshirase_type: number | null;
  target_kanri_kubun_codes: string[]; // multi-select、送信時に CSV へ結合
  content: string;
}

const REQUIRED_MSG = '必須項目です。';
const DATE_ORDER_MSG = '終了日は開始日より後にしてください。';
const PAST_DATE_MSG = '過去日は選択できません。';

const ACCESS_DENIED_MSG = 'アクセス権がありません。';
const DELETE_CONFIRM_CONTENT = 'このお知らせを削除してもよろしいですか？';

// 機能定義 1.x — アクセス制御。router guard / BE 権限に加え view でも役割チェックし、
// 非管理者には API を呼ばず ACSMS-MSG-031-006 を表示する。
const authStore = useAuthStore();
const canView = computed(() =>
  authStore.user?.permissions?.includes('oshirase.view') ?? false,
);

const { state, loading, total, onChange } = useTableQuery<OshiraseFilters>({
  defaultFilters: {},
  defaultSortBy: 'created_at',
  defaultSortOrder: 'desc',
});

const rows = ref<OshiraseListItem[]>([]);

// フォーム状態 — 編集モードは editingId から導出する。
const editingId = ref<number | null>(null);
const isEdit = computed(() => editingId.value !== null);

function initialFormState(): OshiraseFormState {
  return {
    title: '',
    // 新規作成時の初期選択（画面項目定義 No.2/3 デフォルト値=1）。
    publish_location: PublishLocation.LOGIN,  // ログイン画面
    status: OshiraseStatus.DRAFT,              // 下書き
    publish_start_date: '',
    publish_end_date: '',
    ja_id: null,
    oshirase_type: null,
    target_kanri_kubun_codes: [],
    content: '',
  };
}

const formState = reactive<OshiraseFormState>(initialFormState());
const fieldErrors = reactive<Record<string, string>>({});
// [submit-guard] 保存中フラグ。連続クリック / IME 確定 Enter による多重
// POST を防ぐため、保存・クリア ボタンの活性とリクエスト発火を排他制御する。
const submitting = ref(false);

// [past-start-readonly] 編集モードで読み込まれた publish_start_date が
// 過去日（本日 00:00 JST より前）の場合、開始日ピッカーを read-only に
// する。loadDetail 実行時に算定する。新規作成・編集ともに過去日選択は
// 不可（disabled-date + validateForm の両層で防御）。
const editingStartIsPast = ref(false);
const isStartReadOnly = computed(
  () => isEdit.value && editingStartIsPast.value,
);

// [deadline-readonly] 締め切り時間（oshirase_type=4）のレコードは
// 編集モードで種別変更を禁止し、削除も不可とする（顧客確認 2026-05、
// 1件のみ運用される締め切り時間データの取り違え／消失防止）。
const isTypeReadOnly = computed(
  () => isEdit.value && formState.oshirase_type === OshiraseType.DEADLINE,
);

// [tokyo-tz] 過去日チェックの「今」「本日」は常に Asia/Tokyo を基準にする
// （`.claude/rules/vue.md §Date/Time`）。`dayjs()` 直呼びはブラウザ local
// TZ を参照するため、VN/CI（UTC+7 / UTC）でテストすると JST 環境と挙動が
// ズレる。`@/utils/datetime` 経由で TZ 固定する。

/** 過去日（本日より前）を無効化。a-date-picker の :disabled-date 用。 */
function disabledStartDate(current: Dayjs | null): boolean {
  return isPastDayTokyo(current);
}

/**
 * [tokyo-tz] Picker の time-panel が空状態で開いたときに表示するヘッダー
 * （例: "15:32"）。antd デフォルトはブラウザ local の `dayjs()` を読むため、
 * VN 開発機では 15:32 VN が表示されてしまう。`nowTokyo()` を渡して JST
 * の壁時計を表示する。
 */
function nowForPickerHeader(): Dayjs {
  return nowTokyo();
}

/**
 * [tokyo-tz] Picker フッターの「JST 現在時刻」ボタンが呼ぶハンドラ。
 * antd 標準の「現在時刻」リンク（`:show-now`）はブラウザ local を入れる
 * ため `:show-now="false"` で非表示にし、ここで JST の現在分を文字列で
 * v-model に直接書き込む。
 */
function setStartToNowTokyo(): void {
  formState.publish_start_date = nowMinuteFloorTokyo().format('YYYY/MM/DD HH:mm');
}

function setEndToNowTokyo(): void {
  formState.publish_end_date = nowMinuteFloorTokyo().format('YYYY/MM/DD HH:mm');
}

/** 終了日：過去日 + 開始日より前 を無効化（開始日が選択済みの場合）。 */
function disabledEndDate(current: Dayjs | null): boolean {
  if (!current) return false;
  if (isPastDayTokyo(current)) return true;
  const startDate = parseDatetimeTokyo(formState.publish_start_date);
  if (startDate && current.isBefore(startDate, 'day')) return true;
  return false;
}

/**
 * Picker time-panel の「時」「分」を、指定の閾値 Dayjs より前で無効化する。
 * `< threshold` の時／分を disable する（date-order 厳密チェックは
 * validateForm 側で行うため、ここでは「等しい」は許容）。
 */
function buildDisabledTimeFor(threshold: Dayjs) {
  return {
    disabledHours: () =>
      Array.from({ length: threshold.hour() }, (_, i) => i),
    disabledMinutes: (selectedHour: number) => {
      if (selectedHour > threshold.hour()) return [];
      if (selectedHour === threshold.hour()) {
        return Array.from({ length: threshold.minute() }, (_, i) => i);
      }
      return Array.from({ length: 60 }, (_, i) => i);
    },
  };
}

/**
 * 開始日: 本日選択時に、現在より前の「時」「分」を time-panel で無効化。
 * 他の日（明日以降）では未制限。
 */
function disabledStartTime(current: Dayjs | null) {
  if (!current) return {};
  // `current` はピッカーの Dayjs（ブラウザ local TZ）。その壁時計値を
  // Asia/Tokyo として再解釈し、nowTokyo() との比較の TZ フレームを揃える
  // （.claude/rules/vue.md §Date/Time）。
  const currentTokyo = pickerToTokyoWallclock(current);
  const now = nowTokyo();
  if (!currentTokyo.isSame(now, 'day')) return {};
  return buildDisabledTimeFor(now);
}

/**
 * 終了日: time-panel で
 *   - 当日選択時 → 現在より前
 *   - 開始日と同日選択時 → 開始日時より前
 * の時・分を無効化（より遅い閾値を採用）。他の日では未制限。
 */
function disabledEndTime(current: Dayjs | null) {
  if (!current) return {};
  const currentTokyo = pickerToTokyoWallclock(current);
  const thresholds: Dayjs[] = [];
  const now = nowTokyo();
  if (currentTokyo.isSame(now, 'day')) thresholds.push(now);
  // 開始日文字列（YYYY/MM/DD HH:mm）も Asia/Tokyo として解釈して比較。
  const startStr = formState.publish_start_date;
  if (startStr && /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(startStr)) {
    const [datePart, timePart] = startStr.split(' ');
    const [y, mo, d] = datePart.split('/').map(Number);
    const [h, mi] = timePart.split(':').map(Number);
    const startTokyo = nowTokyo()
      .year(y).month(mo - 1).date(d)
      .hour(h).minute(mi).second(0).millisecond(0);
    if (currentTokyo.isSame(startTokyo, 'day')) thresholds.push(startTokyo);
  }
  if (thresholds.length === 0) return {};
  // 最も遅い閾値（より厳しい制限）を採用。
  const t = thresholds.reduce(
    (a, b) => (a.isAfter(b) ? a : b),
    thresholds[0],
  );
  return buildDisabledTimeFor(t);
}

// 公開場所 / 状態 / お知らせ種別 の選択肢は m_code から取得する。
// codes.options(category) は `[{ value: number, label: string,
// label_short: string }]` を返す（CodeService.normalizeValue で
// 数値化済み）。
const LOCATION_OPTIONS = computed(() => codes.options('PUBLISH_LOCATION'));

// [deadline-pairing] お知らせ種別=4（締め切り時間）は publish_location=3
// （メニュー画面（締め切り時間））と 1:1 で対応する（顧客確認 2026-05）。
// UX 方針：ユーザーは先に「公開場所」を選び、種別ドロップダウンは選んだ
// 公開場所に応じて絞り込まれる（顧客確認 2026-05、driver は location）：
//   - publish_location ∈ {1, 2} → 種別は {1, 2, 3} のみ表示
//   - publish_location = 3      → 種別は {4} のみ表示（締め切り時間専用）
// 公開場所自体はラジオで常に 1 / 2 / 3 を表示する。編集モードで既存
// レコードが type=4 の場合のみ、公開場所も種別も read-only にして
// ペアリング（4↔3）を変更不能にする（type=4 削除不可と同じポリシー）。
// BE 側でも `assertDeadlineLocationPairing` で API 直接呼び出しを遮断。
const isLocationReadOnly = computed(
  () => isEdit.value && formState.oshirase_type === OshiraseType.DEADLINE,
);

watch(
  () => formState.publish_location,
  (newLoc: number | null, oldLoc: number | null) => {
    if (newLoc === PublishLocation.MENU_DEADLINE) {
      // 締め切り時間スロットに切り替えたら、種別をロック。
      formState.oshirase_type = OshiraseType.DEADLINE;
    } else if (
      oldLoc === PublishLocation.MENU_DEADLINE &&
      newLoc !== PublishLocation.MENU_DEADLINE &&
      formState.oshirase_type === OshiraseType.DEADLINE
    ) {
      // 締め切り時間スロットから離れたら、締め切り時間 種別を解除して
      // ユーザーに通常お知らせ種別の中から選ばせる（未選択 = null）。
      formState.oshirase_type = null;
    }
  },
);

const STATUS_OPTIONS = computed(() => codes.options('OSHIRASE_STATUS'));
const OSHIRASE_TYPE_OPTIONS = computed(() => codes.options('OSHIRASE_TYPE'));

// [type-options-by-location] 公開場所の選択に応じて種別ドロップダウンを絞り込む
// （顧客確認 2026-05）。publish_location=3 は「締め切り時間」スロット専用なので
// 種別=OshiraseType.DEADLINE のみ表示。それ以外（1 / 2 / null）は通常お知らせ
// 枠なので 締め切り時間 を除外したリストを返す。
const availableTypeOptions = computed(() =>
  formState.publish_location === PublishLocation.MENU_DEADLINE
    ? OSHIRASE_TYPE_OPTIONS.value.filter((o) => o.value === OshiraseType.DEADLINE)
    : OSHIRASE_TYPE_OPTIONS.value.filter((o) => o.value !== OshiraseType.DEADLINE),
);

// 対象管理者区分 = m_roles.role_id のカンマ区切り（BE: oshirase.service.ts の
// `target_kanri_kubun`）。ロール名は DB の値なので画面にハードコードせず
// COMMON-002 `/roles/dropdown` から取る — 改称や増減で表示が乖離しないように。
const targetKanriKubunOptions = ref<{ value: string; label: string }[]>([]);

async function fetchRoleOptions(): Promise<void> {
  try {
    const resp = await listRolesDropdown();
    targetKanriKubunOptions.value = resp.data.map((r) => ({
      value: String(r.role_id),
      label: r.role_name,
    }));
  } catch {
    // 想定内で握りつぶす: HTTP エラーは共通 interceptor が既にトースト済み。
    // 一覧の対象管理者区分セルは生の role_id 表示にフォールバックする。
    targetKanriKubunOptions.value = [];
  }
}

// 列順は ACSMS-SCR-031/index.html モックアップに一致:
// 編集 / 場所 / 状態 / お知らせタイトル / 表示期間 / JA名 / お知らせ種別 /
// 対象管理者区分 / 操作(削除)。
const columns: TableColumnsType = [
  { title: '編集', key: 'edit', align: 'center', width: 80 },
  { title: '公開場所', key: 'publish_location', width: 130 },
  { title: '状態', key: 'status', width: 100 },
  { title: 'お知らせタイトル', dataIndex: 'title', key: 'title' },
  { title: '表示期間', key: 'publish_period', width: 260 },
  { title: 'JA名', key: 'ja_name', width: 160 },
  { title: 'お知らせ種別', key: 'oshirase_type', width: 140 },
  { title: '対象管理者区分', key: 'target_kanri_kubun', width: 180 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listOshirase({
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as 'created_at',
      sort_order: state.sort_order,
    });
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // global axios interceptor が FORBIDDEN / 500 をトースト。view はローカル
    // 状態のみクリアし、onMounted の fire-and-forget で unhandled rejection を
    // 出さない（.claude/rules/vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!canView.value) return;
  void fetchList();
  void fetchRoleOptions();
  // JA ドロップダウンは <BaseJaDropdown> 内で自己読込。表セルの ja_name は
  // BE 一覧レスポンス（leftJoin m_ja）由来で別途取得不要。
});

function clearFieldErrors(): void {
  for (const k of Object.keys(fieldErrors)) delete fieldErrors[k];
}

function validateStartDateNotPast(): void {
  // 過去日チェック (publish_start_date) — 分精度
  //   - 新規作成: 過去日時不可（disabled-date / disabled-time でも防御）
  //   - 編集モード + 保存済み開始日=未来: 新しい値は現在分以降
  //   - 編集モード + 保存済み開始日=過去: 開始日は read-only。
  //     保存済みの過去日のままサブミットを許容するため、チェックをスキップ。
  if (
    fieldErrors.publish_start_date ||
    !formState.publish_start_date ||
    isStartReadOnly.value
  ) {
    return;
  }
  const start = parseDatetimeTokyo(formState.publish_start_date);
  if (start && start.getTime() < nowMinuteFloorTokyo().valueOf()) {
    fieldErrors.publish_start_date = PAST_DATE_MSG;
  }
}

function validateDateOrder(): void {
  // 日付順チェック（両方あり・解析可能な時のみ）。終了は開始より厳密に後で
  // なければならず、end <= start は同一「終了日は開始日より後にしてください。」を
  // 表示。顧客レビュー 2026-05-29 —「重複」専用 message を廃止し全て順序違反扱い。
  if (
    fieldErrors.publish_start_date ||
    !formState.publish_start_date ||
    !formState.publish_end_date
  ) {
    return;
  }
  const start = parseDatetimeTokyo(formState.publish_start_date);
  const end = parseDatetimeTokyo(formState.publish_end_date);
  if (start && end && end.getTime() <= start.getTime()) {
    fieldErrors.publish_end_date = DATE_ORDER_MSG;
  }
}

function validateForm(): boolean {
  clearFieldErrors();
  if (!formState.title?.trim()) fieldErrors.title = REQUIRED_MSG;
  if (formState.publish_location == null) fieldErrors.publish_location = REQUIRED_MSG;
  if (formState.status == null) fieldErrors.status = REQUIRED_MSG;
  if (!formState.publish_start_date?.trim()) {
    fieldErrors.publish_start_date = REQUIRED_MSG;
  }
  if (formState.oshirase_type == null) fieldErrors.oshirase_type = REQUIRED_MSG;
  if (!formState.content?.trim()) fieldErrors.content = REQUIRED_MSG;

  validateStartDateNotPast();
  validateDateOrder();

  return Object.keys(fieldErrors).length === 0;
}

function buildBody(): CreateOshiraseBody {
  // 対象管理者区分 — 新規作成時にチェックが1つも無い場合は「全区分が対象」と
  // みなし、全コード（1,2,3,4,5）を保存する（顧客要件）。編集時はユーザーの
  // 選択をそのまま尊重する。
  const kanriCodes =
    !isEdit.value && formState.target_kanri_kubun_codes.length === 0
      ? targetKanriKubunOptions.value.map((o) => o.value)
      : formState.target_kanri_kubun_codes;
  return {
    title: formState.title.trim(),
    publish_location: Number(formState.publish_location),
    status: Number(formState.status),
    publish_start_date: formState.publish_start_date,
    publish_end_date: formState.publish_end_date?.trim()
      ? formState.publish_end_date
      : null,
    ja_id: formState.ja_id ?? null,
    oshirase_type: Number(formState.oshirase_type),
    target_kanri_kubun: kanriCodes.join(','),
    content: formState.content,
  };
}

function applyServerErrors(err: unknown): boolean {
  const ax = err as AxiosError<{ error_code?: string; message?: string; errors?: { field: string; message: string }[] }>;
  const data = ax?.response?.data;
  if (!data) return false;

  // DEADLINE_NOTICE_DUPLICATE はユーザーが対処できる文言なのでトースト表示。
  // このコードは axios interceptor の VIEW_HANDLED_CODES にあり既定トーストを
  // スキップするため、この view が唯一の表示元となり二重表示しない。
  if (data.error_code === 'DEADLINE_NOTICE_DUPLICATE' && data.message) {
    notify.error(data.message);
    return true;
  }
  if (data.error_code === 'VALIDATION_ERROR' && Array.isArray(data.errors)) {
    clearFieldErrors();
    for (const e of data.errors) fieldErrors[e.field] = e.message;
    return true;
  }
  return false;
}

async function onSubmit(): Promise<void> {
  // [submit-guard] 連続クリック / IME 確定 Enter による多重 POST を防ぐ。
  // 保存中は 保存 ボタンを :loading + :disabled、クリア ボタンも :disabled に
  // するため、view 側に submitting ref を保持する。
  if (submitting.value) return;
  if (!validateForm()) return;
  submitting.value = true;
  const body = buildBody();
  try {
    if (isEdit.value && editingId.value !== null) {
      await updateOshirase(editingId.value, body);
      notify.updated();
    } else {
      const created = await createOshirase(body);
      editingId.value = created.data.oshirase_id;
      notify.created();
    }
    await fetchList();
    // 保存後はサーバの保存済みデータでフォームを再表示する（新規作成時の
    // 対象管理者区分の自動補完など、サーバ側で確定した値を確実に反映する）。
    if (editingId.value !== null) {
      await loadDetail(editingId.value);
    }
  } catch (err) {
    applyServerErrors(err);
  } finally {
    submitting.value = false;
  }
}

/** フォームをリセットして新規作成モードへ戻す。 */
function resetForm(): void {
  Object.assign(formState, initialFormState());
  editingId.value = null;
  editingStartIsPast.value = false;
  clearFieldErrors();
}

/**
 * フォームに入力があるか判定。各項目を initialFormState() の基準値と比較する。
 * 編集モードは getOshirase で事前入力済みのため editingId !== null も dirty 扱い。
 */
function isFormDirty(): boolean {
  if (editingId.value !== null) return true;
  const init = initialFormState();
  if (formState.title !== init.title) return true;
  if (formState.publish_location !== init.publish_location) return true;
  if (formState.status !== init.status) return true;
  if (formState.publish_start_date !== init.publish_start_date) return true;
  if (formState.publish_end_date !== init.publish_end_date) return true;
  if (formState.ja_id !== init.ja_id) return true;
  if (formState.oshirase_type !== init.oshirase_type) return true;
  if (formState.target_kanri_kubun_codes.length > 0) return true;
  if (formState.content !== init.content) return true;
  return false;
}

/**
 * クリア button handler. SCR-031-local convention: confirm with
 * ACSMS-MSG-031-010 when the form has unsaved input (the spec only
 * mandates this confirm for the 編集 button switch and pagination,
 * but discarding via クリア carries the same data-loss risk).
 */
function onClear(): void {
  if (!isFormDirty()) {
    resetForm();
    return;
  }
  Modal.confirm({
    title: '確認',
    content: '未保存のデータがあります。このまま続けますか？',
    okText: '破棄して続行',
    okType: 'danger',
    cancelText: '編集を続行',
    onOk() {
      resetForm();
    },
  });
}

// 編集フォーム (上段) の BaseCard。編集ボタン押下時に画面最上部へ
// スクロールするためのターゲット。ページをスクロールして一覧から
// 編集を押したユーザーが、フォームへ視点を戻せるようにする。
const formCardRef = ref<InstanceType<typeof BaseCard> | null>(null);

/**
 * 編集フォームを画面内に表示されるまでスクロールする。スクロール
 * コンテナは MainLayout のコンテンツ領域（window ではない）なので、
 * フォーム要素自身の scrollIntoView を使い対象コンテナを自動解決する。
 * loadDetail で DOM 反映が終わってから動くよう nextTick で1フレーム待つ。
 */
function scrollToForm(): void {
  void nextTick(() => {
    const el = (formCardRef.value as unknown as { $el?: HTMLElement } | null)
      ?.$el;
    // jsdom（テスト環境）は scrollIntoView 未実装のため、microtask で
    // unhandled rejection にならぬようガードする。
    if (typeof el?.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/**
 * サーバから1件取得してフォームへ反映し、編集モードへ切り替える。
 * 編集行クリック時（onEdit）と、新規作成／更新の保存成功直後の
 * 再表示（onSubmit）で共用する。保存時にサーバ側で確定した値
 * （対象管理者区分の自動補完など）を確実に画面へ反映するため。
 */
async function loadDetail(id: number): Promise<void> {
  const resp = await getOshirase(id);
  const d = resp.data;
  editingId.value = d.oshirase_id;
  formState.title = d.title;
  formState.publish_location = d.publish_location;
  formState.status = d.status;
  formState.publish_start_date = d.publish_start_date;
  formState.publish_end_date = d.publish_end_date ?? '';
  formState.ja_id = d.ja_id;
  formState.oshirase_type = d.oshirase_type;
  formState.target_kanri_kubun_codes = d.target_kanri_kubun
    ? d.target_kanri_kubun.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  formState.content = d.content;
  // [past-start-readonly] 編集モード突入時に判定。保存済み開始日時が
  // 現在より前（分精度）なら開始日ピッカーは read-only。未来なら編集可。
  const loadedStart = parseDatetimeTokyo(d.publish_start_date);
  editingStartIsPast.value = loadedStart
    ? loadedStart.getTime() < nowMinuteFloorTokyo().valueOf()
    : false;
  clearFieldErrors();
}

/**
 * 編集行クリック時のハンドラ（SCR-031 ローカル規約）:
 *   - 既に同じ行を編集中ならそのまま再読込 (画面遷移なしの refresh).
 *   - 別の行を編集中、または新規作成モードで入力済みデータがある場合、
 *     未保存データの破棄について `クリア` ボタンと同じ ACSMS-MSG-031-010
 *     を含む確認モーダル (Modal.confirm) を表示する。OK 時のみ
 *     loadDetail で切替, キャンセル時は元の編集状態を維持。
 */
async function onEdit(row: OshiraseListItem): Promise<void> {
  // [same-row] 同じ行を選択した場合は確認不要 — 単純に再読込する。
  if (editingId.value === row.oshirase_id) {
    try {
      await loadDetail(row.oshirase_id);
      scrollToForm();
    } catch {
      // global interceptor が 404 / 500 をトースト。
    }
    return;
  }

  // [unsaved-guard] フォームに入力済データがある (編集中 or 新規入力済)
  // 状態で別行へ切替えようとした場合、誤操作によるデータ消失を防ぐため
  // 確認モーダルを挟む。クリアボタンと同じ文言・同じボタン構成で UX 統一。
  if (isFormDirty()) {
    Modal.confirm({
      title: '確認',
      content: '未保存のデータがあります。このまま続けますか？',
      okText: '破棄して続行',
      okType: 'danger',
      cancelText: '編集を続行',
      async onOk() {
        try {
          await loadDetail(row.oshirase_id);
          scrollToForm();
        } catch {
          // global interceptor がトースト。
        }
      },
    });
    return;
  }

  try {
    await loadDetail(row.oshirase_id);
    scrollToForm();
  } catch {
    // global interceptor が 404 / 500 をトースト。
  }
}

function askDelete(row: OshiraseListItem): void {
  // [deadline-not-deletable] 締め切り時間（oshirase_type=4）は削除不可。
  // テンプレート側のリンク非表示で通常は到達しないが、念のため早期 return。
  if (row.oshirase_type === OshiraseType.DEADLINE) return;
  confirmDelete(DELETE_CONFIRM_CONTENT, async () => {
    try {
      await removeOshirase(row.oshirase_id);
      notify.deleted();
      // 削除した行を編集中だった場合は新規作成モードへ戻す。
      if (editingId.value === row.oshirase_id) onClear();
      await fetchList();
    } catch {
      // global interceptor が 409（CONFLICT）/ 500 を処理。
    }
  });
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function statusBadgeClass(status: number): string {
  if (status === OshiraseStatus.PUBLIC) return 'bg-success-subtle text-success';
  if (status === OshiraseStatus.HIDDEN) return 'bg-error-subtle text-error';
  // OshiraseStatus.DRAFT（および将来の未知値）→ ニュートラル。
  return 'bg-surface-hover text-text-description';
}

function locationLabel(value: number): string {
  return codes.label('PUBLISH_LOCATION', value);
}

function statusLabel(value: number): string {
  return codes.label('OSHIRASE_STATUS', value);
}

function publishPeriod(row: OshiraseListItem): string {
  const end = row.publish_end_date ?? '無期限';
  return `${row.publish_start_date} 〜 ${end}`;
}

function targetKanriKubunLabel(value: string): string {
  if (!value?.trim()) return '全管理者';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (v) => targetKanriKubunOptions.value.find((o) => o.value === v)?.label ?? v,
    )
    .join('、');
}

// BaseDataTable で編集中の行をハイライトする行クラスフック。
// --surface-active（選択行と同じ色）に解決される。
function rowClassForEdit(row: Record<string, unknown>): string {
  return (row as unknown as OshiraseListItem).oshirase_id === editingId.value
    ? 'oshirase-row-active'
    : '';
}

// スペック公開用の内部状態 — wrapper.vm.formState / vm.state / vm.fetchList。
defineExpose({ formState, state, fetchList, editingId });
</script>

<template>
  <!-- 機能定義 1.1 — 権限なしのアカウントの場合 ACSMS-MSG-031-006 -->
  <BaseCard v-if="!canView" padding="lg" class="max-w-2xl">
    <p class="text-text-main text-sm">{{ ACCESS_DENIED_MSG }}</p>
  </BaseCard>

  <div v-else class="space-y-6">
    <!-- ─── 編集フォーム (上段) ───────────────────────────────────── -->
    <BaseCard ref="formCardRef" padding="lg">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-text-main text-base">
          {{ isEdit ? '編集中: お知らせ #' + editingId : '新規登録' }}
        </h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        @finish="onSubmit"
        @keydown="preventEnterImplicitSubmit"
      >
        <!-- お知らせタイトル — 公開場所 / 状態 と同じインラインラベルパターン。 -->
        <a-form-item
          name="title"
          :validate-status="fieldErrors.title ? 'error' : ''"
          :help="fieldErrors.title"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              お知らせタイトル<span class="text-error ml-1">*</span>
            </span>
            <a-input
              v-model:value="formState.title"
              :maxlength="200"
              class="flex-1"
            />
          </div>
        </a-form-item>

        <!-- 公開場所 — ラベル + ラジオを1行に。form layout=vertical で antd の
             label-col/wrapper-col は無効なため、ラベルは wrapper 内にインライン描画。 -->
        <a-form-item
          name="publish_location"
          :validate-status="fieldErrors.publish_location ? 'error' : ''"
          :help="fieldErrors.publish_location"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              公開場所<span class="text-error ml-1">*</span>
            </span>
            <a-radio-group
              v-model:value="formState.publish_location"
              :disabled="isLocationReadOnly"
            >
              <a-radio
                v-for="opt in LOCATION_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </div>
        </a-form-item>

        <!-- 状態 — same inline-label pattern as 公開場所. -->
        <a-form-item
          name="status"
          :validate-status="fieldErrors.status ? 'error' : ''"
          :help="fieldErrors.status"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              状態<span class="text-error ml-1">*</span>
            </span>
            <a-radio-group v-model:value="formState.status">
              <a-radio
                v-for="opt in STATUS_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </div>
        </a-form-item>

        <!-- 表示期間 — 表示期間 label + 開始日 / 終了日 pickers all on a single
             row. Same inline-label pattern as 公開場所 / 状態 (form layout is
             vertical so we render the label inside the wrapper). jaJP locale
             is wired globally in App.vue's <ConfigProvider>; value-format
             keeps the form-state field a plain string that validateForm +
             buildBody accept directly. -->
        <a-form-item
          name="publish_start_date"
          :validate-status="fieldErrors.publish_start_date ? 'error' : ''"
          :help="fieldErrors.publish_start_date"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              表示期間
            </span>
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              開始日<span class="text-error ml-1">*</span>
            </span>
            <!-- [tokyo-tz] :show-now="false" 隠す（antd 標準の「現在時刻」は
                 dayjs() ブラウザ local を入れるため）。代わりに JST 版の
                 ボタンを #renderExtraFooter に出す。:show-time.defaultValue
                 で picker 初回 open 時の time-panel ヘッダも JST に揃える。
                 :default-picker-value で v-model 空時のカレンダーも JST。
                 -->
            <a-date-picker
              v-model:value="formState.publish_start_date"
              :show-time="{ format: 'HH:mm', defaultValue: nowForPickerHeader() }"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY/MM/DD HH:mm"
              placeholder="YYYY/MM/DD HH:mm"
              allow-clear
              :show-now="false"
              :default-picker-value="nowForPickerHeader()"
              :disabled="isStartReadOnly"
              :disabled-date="disabledStartDate"
              :disabled-time="disabledStartTime"
              class="flex-1 min-w-0"
            >
              <template #renderExtraFooter>
                <a-button
                  type="link"
                  size="small"
                  @click="setStartToNowTokyo"
                >現在時刻</a-button>
              </template>
            </a-date-picker>
            <span class="text-text-description">〜</span>
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              終了日
            </span>
            <!-- 終了日は同じ行に見えるが別フィールド。<a-form-item-rest> で
                 親 form-item のフィールド収集から外し（"collect one field" 警告
                 回避）、親の validate-status からも隔離するため、必須 開始日エラーの
                 赤枠がこの任意 終了日ピッカーに波及しない。自身の a-form-item は
                 publish_end_date（日付順エラー、validateForm で手動検証）のみ持つ。 -->
            <a-form-item-rest>
              <a-form-item
                class="mb-0 flex-1 min-w-0"
                :validate-status="fieldErrors.publish_end_date ? 'error' : ''"
                :help="fieldErrors.publish_end_date"
              >
                <a-date-picker
                  v-model:value="formState.publish_end_date"
                  :show-time="{ format: 'HH:mm', defaultValue: nowForPickerHeader() }"
                  format="YYYY/MM/DD HH:mm"
                  value-format="YYYY/MM/DD HH:mm"
                  placeholder="YYYY/MM/DD HH:mm（無期限の場合は空欄）"
                  allow-clear
                  :show-now="false"
                  :default-picker-value="nowForPickerHeader()"
                  :disabled-date="disabledEndDate"
                  :disabled-time="disabledEndTime"
                  class="w-full"
                >
                  <template #renderExtraFooter>
                    <a-button
                      type="link"
                      size="small"
                      @click="setEndToNowTokyo"
                    >現在時刻</a-button>
                  </template>
                </a-date-picker>
              </a-form-item>
            </a-form-item-rest>
          </div>
        </a-form-item>

        <!-- JA名 + お知らせ種別 を1行に。各セルは公開場所 / 状態 と同じ
             インラインラベルパターン。 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="ja_id"
            :validate-status="fieldErrors.ja_id ? 'error' : ''"
            :help="fieldErrors.ja_id"
          >
            <div class="flex items-center gap-4">
              <span
                class="text-sm font-medium whitespace-nowrap text-text-main"
              >
                JA名
              </span>
              <!-- BaseJaDropdown: サーバーページング（50/頁）+ 無限スクロール +
                   ja_name のみ ILIKE。SCR-024 アカウント画面と同じ挙動。 -->
              <div class="flex-1">
                <BaseJaDropdown
                  v-model:value="formState.ja_id"
                  placeholder="全JA向け"
                  label-format="name"
                  search-field="name"
                />
              </div>
            </div>
          </a-form-item>

          <a-form-item
            name="oshirase_type"
            :validate-status="fieldErrors.oshirase_type ? 'error' : ''"
            :help="fieldErrors.oshirase_type"
          >
            <div class="flex items-center gap-4">
              <span
                class="text-sm font-medium whitespace-nowrap text-text-main"
              >
                お知らせ種別<span class="text-error ml-1">*</span>
              </span>
              <a-select
                v-model:value="formState.oshirase_type"
                placeholder="選択してください"
                allow-clear
                :disabled="isTypeReadOnly"
                class="flex-1"
              >
                <a-select-option
                  v-for="opt in availableTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </div>
          </a-form-item>
        </div>

        <!-- 対象管理者区分 — same inline-label pattern as 公開場所 / 状態. -->
        <a-form-item
          name="target_kanri_kubun_codes"
          :help="fieldErrors.target_kanri_kubun"
          :validate-status="fieldErrors.target_kanri_kubun ? 'error' : ''"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              対象管理者区分
            </span>
            <a-checkbox-group
              v-model:value="formState.target_kanri_kubun_codes"
              :options="targetKanriKubunOptions"
            />
          </div>
        </a-form-item>

        <a-form-item
          name="content"
          :validate-status="fieldErrors.content ? 'error' : ''"
          :help="fieldErrors.content"
        >
          <template #label>
            <span>内容</span>
            <span class="text-error ml-1">*</span>
          </template>
          <a-textarea
            v-model:value="formState.content"
            :rows="6"
            :maxlength="2000"
          />
        </a-form-item>

        <div
          class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2"
        >
          <a-button
            type="primary"
            html-type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            保存
          </a-button>
          <!-- 常時表示。新規作成時はフォームをリセット、編集時は編集を取消して
               新規作成モードへ戻す（onClear は editingId もクリア）。screen-design.md
               row 11 は「新規モード時」のみだが、隠すと編集から抜ける手段が無くなる
               ため意図的な UX 逸脱。 -->
          <a-button :disabled="submitting" @click="onClear">クリア</a-button>
        </div>
      </a-form>
    </BaseCard>

    <!-- ─── お知らせ一覧 (下段) ───────────────────────────────────── -->
    <BaseDataTable
      title="お知らせ一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="oshirase_id"
      :row-class-name="rowClassForEdit"
      @change="onPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'edit'">
          <a
            class="text-primary hover:underline font-medium"
            @click.prevent="onEdit(record as OshiraseListItem)"
          >
            編集
          </a>
        </template>
        <template v-else-if="column.key === 'publish_location'">
          {{ locationLabel((record as OshiraseListItem).publish_location) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <span
            class="px-2 py-1 rounded text-xs font-bold"
            :class="statusBadgeClass((record as OshiraseListItem).status)"
          >
            {{ statusLabel((record as OshiraseListItem).status) }}
          </span>
        </template>
        <template v-else-if="column.key === 'publish_period'">
          {{ publishPeriod(record as OshiraseListItem) }}
        </template>
        <template v-else-if="column.key === 'ja_name'">
          <!-- ja_name は BE 一覧レスポンス（leftJoin m_ja）由来。null は2種:
                 - ja_id IS NULL      → 全JA向け（意図した全体配信）
                 - ja_id あるが行欠落  → (削除済JA)（作成後に JA が削除された）
               両者を全JA向けにまとめると、対象指定の通知が JA 削除後に
               全体配信に見えて誤解を招くため区別する。 -->
          {{
            (record as OshiraseListItem).ja_name
              ?? ((record as OshiraseListItem).ja_id == null
                ? '全JA向け'
                : '(削除済JA)')
          }}
        </template>
        <template v-else-if="column.key === 'oshirase_type'">
          {{ codes.label('OSHIRASE_TYPE', (record as OshiraseListItem).oshirase_type) }}
        </template>
        <template v-else-if="column.key === 'target_kanri_kubun'">
          {{ targetKanriKubunLabel((record as OshiraseListItem).target_kanri_kubun ?? '') }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- [deadline-not-deletable] 締め切り時間（oshirase_type=4）は
               削除不可（顧客確認 2026-05）。リンクではなく無効スタイルの
               <span> に切り替えて誤クリックを防ぐ。BE 側でも remove() で
               拒否するため、攻撃者の改竄も遮断される。 -->
          <a
            v-if="(record as OshiraseListItem).oshirase_type !== OshiraseType.DEADLINE"
            class="text-error hover:text-error-hover hover:underline font-medium"
            @click.prevent="askDelete(record as OshiraseListItem)"
          >
            削除
          </a>
          <span
            v-else
            class="text-text-disabled cursor-not-allowed select-none"
            title="締め切り時間のお知らせは削除できません"
          >
            削除
          </span>
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

<style scoped>
/* 編集中の行をハイライト（フォーム上部・一覧下部）。antd が hover/zebra で
   セル背景を自前描画するため td を直接指定。トークン --surface-active
   （選択行の色、ダークモードで自動反転）。 */
:deep(.oshirase-row-active > td) {
  background-color: var(--surface-active) !important;
}
</style>
