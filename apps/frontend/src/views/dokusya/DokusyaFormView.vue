<script setup lang="ts">
// ACSMS-SCR-011 — 購読者情報登録画面。
//
// CREATE（route DokusyaCreate）と EDIT（route DokusyaEdit、:id path param）を
// 兼ねる単一コンポーネント。@/api/dokusya/dokusya の ACSMS-SCR-011 6エンドポイントを利用:
//   - getDokusya(id)        → ACSMS-API-011-001
//   - createDokusya(body)   → ACSMS-API-011-002
//   - updateDokusya(id, …)  → ACSMS-API-011-003
//   - approveDokusya(id)    → ACSMS-API-011-004
//   - rejectDokusya(id)     → ACSMS-API-011-005
//
// 履歴表示ボタン（編集のみ）は購読者履歴情報画面（ACSMS-SCR-013,
// DokusyaRireki route）へ遷移する — 旧インライン履歴（getDokusyaHistory）
// は ACSMS-SCR-013 のフル履歴一覧に置き換えた。
//
// 条件付きルール（screen-design.md §機能定義）:
//   §7   購読種別=電子版/併読 → email 必須 + 配達先セクション非表示
//   §8   解約 (tetsuzuki_shurui=0) → dokusya_busu を0に強制
//   §9   配達先=購読者情報と同じ チェック → haitatsu_* クリア + 必須スキップ
//   §10  支払方法=口座引落 (1) → 銀行クラスタ必須
//   §11  購読者層=農業者 → 主な生産物 (nogyosya_bunrui) 表示
//
// 編集モード + denshi_shonin_status=0（承認待ち）では、submit ボタンが
// §3.3 に従い updateDokusya ではなく approveDokusya を発火する。

import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import { useRoute, useRouter } from 'vue-router';
import { Modal, message } from 'ant-design-vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotFoundRedirect } from '@/composables/useNotFoundRedirect';
import {
  getDokusya,
  getDokusyaEffectiveAt,
  createDokusya,
  updateDokusya,
  approveDokusya,
  rejectDokusya,
  registerTankaDokusya,
  type DenshiShoninEditBody,
  type CreateDokusyaRequest,
  type UpdateDokusyaRequest,
  type DokusyaDetail,
} from '@/api/dokusya/dokusya';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';
import {
  getShitenDropdown,
  type ShitenDropdownItem,
} from '@/api/shiten/shiten';
import {
  getHanbaitenDropdown,
  type HanbaitenDropdownItem,
  type HanbaitenDropdownQuery,
} from '@/api/hanbaiten/hanbaiten';
import {
  getTankaDropdown,
  type TankaDropdownItem,
} from '@/api/tanka/tanka';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';
import { useCodesStore } from '@/stores/codes.store';
import {
  DenshiShoninStatus,
  DokusyaShubetsu,
  ShiharaiHoho,
  TetsuzukiShurui,
} from '@/constants/enums';
import {
  DOKUSYASO_BUNRUI_NOGYOSYA,
  allowsDokusyasoBunruiSonota,
  allowsJaYakushokuinFlg,
  allowsNogyoKankeiFlg,
  allowsNogyosyaBunruiSonota,
  splitBunruiCsv,
} from '@/constants/dokusya-bunrui';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { focusFirstError } from '@/utils/form-focus';
import type { Dayjs } from 'dayjs';
import {
  todayIsoTokyo,
  isPastDayTokyo,
  isTodayOrPastDayTokyo,
  tomorrowIsoTokyo,
  nextMonthFirstIsoTokyo,
} from '@/utils/datetime';
import { formatYearMonth, formatYen } from '@/utils/formatters';

// ─── フォーム状態 ────────────────────────────────────────────────────
//
// フィールド名は API リクエストボディと 1:1。スペックの buildCreateDokusyaForm
// ペイロードが名前変換なしで Object.assign できる。末尾の defineExpose({ formState })
// でこのリアクティブオブジェクトをスペックの fillForm ヘルパーへ渡す。

interface DokusyaFormState {
  kanri_shiten_id: number | null;
  shiten_id: number | null;
  kumiaiin_code: string;
  dokusya_shubetsu: number;
  tetsuzuki_shurui: number;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  dokusya_busu: number;
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  // 電子版用項目。紙版時は未選択(null)＝DB も NULL 保存（顧客要件 2026-07）。
  mail_magazine_flg: number | null;
  birth_year: number | null;
  gender: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no: string;
  haitatsu_todofuken_code: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_renrakusaki_1: string;
  haitatsu_renrakusaki_2: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_shimei_kana_sei: string;
  haitatsu_shimei_kana_mei: string;
  hanbaiten_id: number | null;
  tanka_id: number | null;
  yubin_kubun: string;
  shiharai_hoho: number | null;
  dokusyaryo_shiharai_cycle: number | null;
  bank_shiten_id: number | null;
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  dokusyaso_bunrui: string;
  ja_yakushokuin_flg: boolean;
  nogyo_kankei_flg: boolean;
  dokusyaso_bunrui_sonota: string;
  nogyosya_bunrui: string;
  nogyosya_bunrui_sonota: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  // 読者情報変更適用日 — 販売店・支払方法を含む全変更の唯一の適用日（顧客要件
  // 2026-07: 販売店適用日を廃止し joho に統一。1更新1レコード）。
  joho_henko_tekiyo_date: string | null;
  seikyu_kaishi_month: string;
  biko: string;
}

/** 新規作成モードの初期値 — init + reset の単一ソース。 */
function defaultFormState(): DokusyaFormState {
  return {
    kanri_shiten_id: null,
    shiten_id: null,
    kumiaiin_code: '',
    dokusya_shubetsu: DokusyaShubetsu.PAPER,
    tetsuzuki_shurui: TetsuzukiShurui.SHINKI,
    shimei_sei: '',
    shimei_mei: '',
    shimei_kana_sei: '',
    shimei_kana_mei: '',
    dokusya_busu: 1,
    yubin_no: '',
    todofuken_code: '',
    shikuchoson: '',
    chome_banchi: '',
    tatemono_mei: '',
    renrakusaki_1: '',
    renrakusaki_2: '',
    email: '',
    // 新規は既定で紙版(1) → メールマガジンは未選択(null)。
    mail_magazine_flg: null,
    birth_year: null,
    gender: null,
    haitatsu_same_flg: true,
    haitatsu_yubin_no: '',
    haitatsu_todofuken_code: '',
    haitatsu_shikuchoson: '',
    haitatsu_chome_banchi: '',
    haitatsu_tatemono_mei: '',
    haitatsu_renrakusaki_1: '',
    haitatsu_renrakusaki_2: '',
    haitatsu_shimei_sei: '',
    haitatsu_shimei_mei: '',
    haitatsu_shimei_kana_sei: '',
    haitatsu_shimei_kana_mei: '',
    hanbaiten_id: null,
    tanka_id: null,
    yubin_kubun: '0',
    shiharai_hoho: null,
    dokusyaryo_shiharai_cycle: null,
    bank_shiten_id: null,
    hikiotoshi_yokin_shubetsu: null,
    hikiotoshi_koza_no: '',
    hikiotoshi_koza_meigi: '',
    dokusyaso_bunrui: '',
    ja_yakushokuin_flg: false,
    nogyo_kankei_flg: false,
    dokusyaso_bunrui_sonota: '',
    nogyosya_bunrui: '',
    nogyosya_bunrui_sonota: '',
    dokusya_kaishi_date: '',
    dokusya_chushi_date: null,
    joho_henko_tekiyo_date: null,
    seikyu_kaishi_month: '',
    biko: '',
  };
}

const formState = reactive<DokusyaFormState>(defaultFormState());

const fieldErrors = ref<Record<string, string>>({});
const submitting = ref(false);

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { redirectToDashboard } = useNotFoundRedirect();
const codes = useCodesStore();
const authStore = useAuthStore();
// 氏名系8項目 — 登録・更新時に前後空白がトリムされる対象。
const NAME_FIELDS = [
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'haitatsu_shimei_sei',
  'haitatsu_shimei_mei',
  'haitatsu_shimei_kana_sei',
  'haitatsu_shimei_kana_mei',
] as const;

// 編集で何も変更せず更新した場合に PUT/ログ/履歴をスキップするガード。
// 比較は「実際に保存される値」を基準にする：氏名系8項目は送信前にトリム
// されるので、baseline／現在の両方でトリムしてから比較する。これで
// (a) ロード値の前後空白、(b) 前後空白だけの編集、どちらも「変更」と誤検知
// しない（保存結果が変わらないため）。
const editGuard = useEditGuard(() => {
  const snap: Record<string, unknown> = { ...formState };
  for (const f of NAME_FIELDS) {
    if (typeof snap[f] === 'string') snap[f] = (snap[f] as string).trim();
  }
  return snap;
});

/**
 * Session の ja_id (JA-scoped roles: CHUOKAI / JA_HONTEN /
 * JA_KANRI_SHITEN は実数; NICHINO_* は null). 配下のドロップダウン
 * (kanri-shiten / hanbaiten / shiten / tanka) のスコープ絞り込みに使う。
 * `KanriShitenDropdownQueryDto` は ja_id を必須 `@Min(1)` で要求する
 * ため、null の場合は呼び出し自体をスキップする。
 */
const sessionJaId = computed<number | null>(() => {
  const raw = authStore.user?.ja_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
});

// ─── ルート駆動モード ─────────────────────────────────────────────

const dokusyaId = computed<number | null>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === null) return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});
const isEdit = computed(() => dokusyaId.value !== null);

// ─── 購読種別-flag gate (account_concept.md §139-145) ───────────────────
// paper_flg → 紙版(1) を登録・編集できる / denshi_flg → 電子版(2) を登録・
// 編集・承認できる。BE が実際の境界 (assertShubetsuFlag) — ここは UX のみ。
const canPaper = computed(() => !!authStore.user?.paper_flg);
const canDenshi = computed(() => !!authStore.user?.denshi_flg);

/**
 * 制限①③（顧客要件 2026-07）— 所属支店(shiten_id)が設定されたアカウントは
 * 自支店の購読者しか扱えない。新規/追加時は購読者の支店をアカウントの所属支店
 * に固定し、管理支店・支店の選択を非活性化する（BE も buildInsertPayload で
 * session.shiten_id を強制ピンするため、ここは UX ミラー）。
 */
const pinnedShitenId = computed<number | null>(() => {
  const raw = authStore.user?.shiten_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
});
const isShitenPinned = computed(() => pinnedShitenId.value !== null);
const pinnedKanriShitenId = computed<number | null>(() => {
  const raw = authStore.user?.kanri_shiten_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
});

/** Whether this account may create/edit a row of the given 購読種別. */
function isShubetsuAllowed(shubetsu: number): boolean {
  if (shubetsu === DokusyaShubetsu.PAPER) return canPaper.value;
  if (shubetsu === DokusyaShubetsu.DIGITAL) return canDenshi.value;
  if (shubetsu === DokusyaShubetsu.BOTH) {
    return canPaper.value && canDenshi.value;
  }
  return false;
}

/** Selected 購読種別 is operable by this account → submit/approve allowed. */
const shubetsuPermitted = computed(() =>
  isShubetsuAllowed(Number(formState.dokusya_shubetsu)),
);

/**
 * 併読(3) / 電子版クレカ決済者 / 電子版かつ電子版読者管理システム未連携
 * （denshi_kaiin_id=null）で単価が campaign でない読者 は編集不可
 * （どのアカウントでも） — seeder.md §425 / api.md §is_read_only + 顧客要件
 * 2026-08 追補。VIEW（参照）で開けるが保存不可。BE (update/stop) も同じ条件で
 * 403 を返す。
 *
 * 3番目の条件は「ロード時点（DB の実値）の単価」で判定する — 編集中の
 * formState.tanka_id（ドラフト）ではない。BE の guard も更新前の `before`
 * （DB の実値）で判定しており（顧客要件2026-08追補のキャンペーン⇄通常切替
 * ポップアップ機能と対）、campaign→通常へ切替える最中の編集セッションで
 * ライブに読取専用へ倒すと、切替えを完了させるための保存ボタンごと
 * 消えてしまうデッドロックになる（切替えた瞬間に「denshi_kaiin_id=null
 * ＋もう campaign でない」という新条件へ自ら踏み込んでしまうため）。
 * ロード時点の値で判定すれば、保存するまでは編集可能なまま、保存後の
 * 再読込で正しく読取専用に切り替わる。
 *
 * 併読／電子版クレカの2条件は isTankaRegistrationPending（単価初回登録待ち・
 * 下部で定義）の間だけ除外する。単価が未登録の間は「編集不可」ではなく
 * 「単価だけ編集可（承認・登録ボタン）」という第3の状態にするため
 * （不具合修正2026-08）。3番目の条件（denshi_kaiin_id 未連携）は無関係な別
 * シナリオ（UI 作成直後で denshi_shonin_status=PENDING(0) が付くため
 * isTankaRegistrationPending には該当しない）なので対象外のまま。
 */
const isRecordReadOnly = computed(
  () =>
    isEdit.value &&
    ((!isTankaRegistrationPending.value &&
      (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.BOTH ||
        (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
          Number(formState.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD))) ||
      (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
        detailDenshiKaiinId.value === null &&
        !isCampaignTanka(originalTankaId.value))),
);

// 読込んだ詳細から導出する表示専用状態（編集モード）。
const detailRireki = ref<number | null>(null);
// DB 登録時の購読部数（編集モードで 解約→0 にした後、新規 に戻したとき復元する）。
const originalDokusyaBusu = ref<number>(1);
// 読込時の手続種類・支払方法（再加入可否 canResubscribe 判定用。手続種類は編集で
// 可変になり得るため、判定は読込時のスナップショットで固定する＝循環回避）。
const originalTetsuzukiShurui = ref<number | null>(null);
const originalShiharaiHoho = ref<number | null>(null);
// DB 登録時の購読開始日・情報変更適用日・解約予定日（編集で 解約→新規→解約 と
// 切替えたとき、両日付を DB 値へ復元し読取専用に戻すために控える。顧客要件 2026-07）。
const originalKaishiDate = ref<string>('');
const originalJohoDate = ref<string | null>(null);
const originalChushiDate = ref<string | null>(null);
/** ロード時点の適用日（他項目が未変更へ戻ったとき joho を復元する基準値）。 */
const johoHenkoBaseline = ref<string | null>(null);
const detailDenshiShoninStatus = ref<number | null>(null);
/** 電子版読者種別 (m_code DENSHI_DOKUSYA_SHUBETSU). Edit-mode readonly. */
const detailDenshiDokusyaShubetsu = ref<number | null>(null);
/**
 * 本紙購読フラグ — 電子版読者管理システムの users.subscribe_flg 連携値。
 * 読取専用（この画面から更新しない）ので formState ではなく detail 側に持つ。
 */
const detailHonshiKodokuFlg = ref(false);
/**
 * 電子版会員ID — 電子版読者管理システム連携済みなら non-null（顧客要件 2026-08）。
 * null は未連携（isRecordReadOnly の3番目の条件で使用）。
 */
const detailDenshiKaiinId = ref<number | null>(null);
/**
 * ロード時点（DB の実値）の単価ID — isRecordReadOnly の3番目の条件が編集中の
 * formState.tanka_id（ドラフト）ではなくこちらを参照する理由は同 computed の
 * コメント参照。
 */
const originalTankaId = ref<number | null>(null);
/** 購読者ID — DB の値 (dokusya_id) をそのまま表示する（プレフィックス無し）。 */
const detailIdLabel = computed<string>(() => {
  if (dokusyaId.value === null) return '';
  return String(dokusyaId.value);
});

// 電子版(2) の承認ワークフロー（顧客要件）。紙版(null)/併読(既に読取専用) には
// 適用しない。承認待ち(0)=単価のみ編集可＋承認/否認ボタン、否認(2)=全項目読取専用。
const isPending = computed(
  () =>
    isEdit.value &&
    isDigital.value &&
    detailDenshiShoninStatus.value === DenshiShoninStatus.PENDING,
);
const isDenshiRejected = computed(
  () =>
    isEdit.value &&
    isDigital.value &&
    detailDenshiShoninStatus.value === DenshiShoninStatus.REJECTED,
);

/**
 * 単価初回登録待ち（不具合修正2026-08）— 承認/否認ワークフロー自体が存在しない
 * カテゴリ（電子版クレジットカード決済者・併読・電子版無料会員）は
 * denshi_shonin_status=NULL のまま同期される。これらは電子版同期が
 * 「単価は承認画面で登録する」前提で tanka_id を持たせないため、通常の承認
 * フローが無いぶん tanka_id=null のまま固まってしまう。isPending と同じ
 * 形の別モード（第3の状態）として扱い、単価だけ編集可にする専用ボタンを出す。
 * 紙版は denshi_shonin_status が常に NULL のため isDigitalOrBoth で除外する
 * （isPending/isDenshiRejected の isDigital 判定と異なり、併読も対象に含む）。
 */
const isTankaRegistrationPending = computed(
  () =>
    isEdit.value &&
    isDigitalOrBoth.value &&
    detailDenshiShoninStatus.value === null &&
    originalTankaId.value === null,
);

/**
 * 「紙版購読状況　有り」を出すか（顧客要件 2026-08）。
 *
 * 電子版(2) の承認待ち(0) で、電子版読者管理システムから連携された
 * 本紙購読フラグが true のときだけ表示する。承認者に「この申込者は既に
 * 紙版も購読している」ことを知らせるための注記なので、承認待ち以外
 * （承認済み / 否認 / 紙版 / 併読）では出さない。
 */
const showHonshiKodokuHint = computed(
  () => isPending.value && detailHonshiKodokuFlg.value,
);

// ─── ドロップダウン選択肢 ──────────────────────────────────────────────

// 都道府県の候補取得・保持は <BaseTodofukenSelect>（useTodofuken の共有
// キャッシュ）。この画面は2つセレクトがあるが HTTP は1回で済む。
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);
const shitenOptions = ref<ShitenDropdownItem[]>([]);
const hanbaitenOptions = ref<HanbaitenDropdownItem[]>([]);
const tankaOptions = ref<TankaDropdownItem[]>([]);

const hanbaitenName = computed<string>(() => {
  const id = formState.hanbaiten_id;
  if (id == null) return '';
  const hit = hanbaitenOptions.value.find((h) => Number(h.hanbaiten_id) === Number(id));
  return hit ? hit.hanbaiten_name : '';
});

/**
 * 引落口座支店 が選択された後に自動表示する 2 つの読取専用フィールド:
 *   - 引落元口座店舗コード (jastem_toriatsukai_tenpo_code)
 *   - 引落元口座店舗名     (jastem_tenpo_name)
 * 画面項目定義 No.45-46 — 「引落口座支店」で選択した後に自動表示。
 */
const selectedBankShiten = computed<ShitenDropdownItem | null>(() => {
  const id = formState.bank_shiten_id;
  if (id == null) return null;
  return (
    shitenOptions.value.find((s) => Number(s.shiten_id) === Number(id)) ??
    null
  );
});

const jastemTenpoCode = computed<string>(
  () => selectedBankShiten.value?.jastem_toriatsukai_tenpo_code ?? '',
);
const jastemTenpoName = computed<string>(
  () => selectedBankShiten.value?.jastem_tenpo_name ?? '',
);

const kinyuShitenOptions = computed<ShitenDropdownItem[]>(() =>
  shitenOptions.value.filter((s) => s.kinyu_shiten_flg === true),
);

/**
 * 管理支店ドロップダウンを購読種別で絞り込む（顧客要件2026-07）。
 * m_kanri_shiten の取扱いフラグ（paper_flg / denshi_flg）に応じて:
 *   紙版(1)   → paper_flg=true の管理支店のみ
 *   電子版(2) → denshi_flg=true の管理支店のみ
 *   併読(3)   → paper_flg=true かつ denshi_flg=true の管理支店のみ
 * （併読は紙+電子の両方を扱うため両フラグ必須）。
 */
const filteredKanriShitenOptions = computed<KanriShitenDropdownItem[]>(() => {
  const shubetsu = Number(formState.dokusya_shubetsu);
  return kanriShitenOptions.value.filter((k) => {
    if (shubetsu === DokusyaShubetsu.PAPER) return k.paper_flg;
    if (shubetsu === DokusyaShubetsu.DIGITAL) return k.denshi_flg;
    if (shubetsu === DokusyaShubetsu.BOTH) return k.paper_flg && k.denshi_flg;
    return true;
  });
});

/**
 * 支店 (Row 2) は親の 管理支店 に紐づく。管理支店を先に選択し、その
 * 配下の支店だけを候補に出す (画面項目定義 No.6 — 管理支店配下の支店)。
 * 管理支店未選択のときは空配列を返し、テンプレート側で select を非活性化する。
 *
 * 金融支店 (kinyu_shiten_flg=true) も候補に含める（顧客CR 2026-08-24）。
 * 以前は除外していたが、配達担当支店と引落口座支店が同一の物理支店である
 * ケースで、金融フラグ付き支店をここで選べないと JA は同じ支店を非金融版
 * としてもう1件 master 登録する二重登録を強いられていた。引落口座支店
 * (kinyuShitenOptions) 側は従来どおり kinyu_shiten_flg=true のみに絞る。
 */
const filteredShitenOptions = computed<ShitenDropdownItem[]>(() => {
  if (formState.kanri_shiten_id == null) return [];
  return shitenOptions.value.filter(
    (s) => Number(s.kanri_shiten_id) === Number(formState.kanri_shiten_id),
  );
});

// 管理支店を切り替えたら、配下でなくなった 支店 選択をクリアする。
// ハイドレート中 (編集モードの初期ロード) は既存値を残す。
watch(
  () => formState.kanri_shiten_id,
  () => {
    if (isHydrating.value) return;
    formState.shiten_id = null;
  },
);

async function fetchKanriShitenOptions(): Promise<void> {
  // KanriShitenDropdownQueryDto は `@Min(1)` で ja_id を要求。NICHINO_*
  // (session.ja_id=null) は管理支店の選択そのものが業務上必要ないので
  // 呼び出しをスキップする。JA-scoped roles は session.ja_id を渡す。
  if (sessionJaId.value === null) {
    kanriShitenOptions.value = [];
    return;
  }
  try {
    const resp = await getKanriShitenDropdown(sessionJaId.value);
    kanriShitenOptions.value = resp.data;
  } catch {
    kanriShitenOptions.value = [];
  }
}

async function fetchShitenOptions(): Promise<void> {
  try {
    const resp = await getShitenDropdown(
      sessionJaId.value === null ? {} : { ja_id: sessionJaId.value },
    );
    shitenOptions.value = resp.data;
  } catch {
    shitenOptions.value = [];
  }
}

async function fetchHanbaitenOptions(includeId?: number): Promise<void> {
  try {
    // active_only=true → 営業中(haiten_flg=false)のみ。廃店は購読者の販売店
    // 選択から除外する。編集で既存の選択が廃店の場合は include_id で現在の
    // 販売店を先頭にピンし、ラベルが解決できるようにする。
    const base: HanbaitenDropdownQuery = {
      active_only: true,
      // 購読種別で候補が排他に分かれる（顧客要件 2026-08）。電子版は紙を配達
      // しないため受け皿のダミー販売店(9999999999)のみ、紙を含む種別は逆に
      // ダミーを候補から外す。絞り込みは BE の SQL 側。
      dummy: isDigital.value ? 'only' : 'exclude',
    };
    if (sessionJaId.value !== null) base.ja_id = sessionJaId.value;
    const resp = await getHanbaitenDropdown(
      includeId == null ? base : { ...base, include_id: includeId },
    );
    hanbaitenOptions.value = resp.data;
  } catch {
    hanbaitenOptions.value = [];
  }
}

async function fetchTankaOptions(): Promise<void> {
  try {
    // ACSMS-SCR-011 picks the 新聞単価 tanka (tanka_type=1) per 画面項目定義 No.14.
    // ログイン中の JA で絞り込む — shiten / hanbaiten と同じく、JA-scoped
    // roles は session.ja_id を渡し、NICHINO_* (session.ja_id=null) は
    // 渡さず全 JA 対象とする (BE 側で代行入力フロー時に解決)。
    const resp = await getTankaDropdown(
      sessionJaId.value === null
        ? { tanka_type: 1 }
        : { tanka_type: 1, ja_id: sessionJaId.value },
    );
    tankaOptions.value = resp.data;
  } catch {
    tankaOptions.value = [];
  }
}

// ─── 編集モードのハイドレート ─────────────────────────────────────────────

const isHydrating = ref(false);

/**
 * ロード済み詳細レスポンス (master or predecessor) を formState + 各基準
 * スナップショットへ反映する。`johoValue` は情報変更適用日の初期値
 * （通常編集/当日=翌日 / 予約変更=ポップアップで選んだ未来日）。
 * loadDetail(master) と confirmReservedJoho(predecessor) が共用する。
 */
function applyDetailResponse(data: DokusyaDetail, johoValue: string): void {
  isHydrating.value = true;
  Object.assign(formState, {
    kanri_shiten_id: data.kanri_shiten_id ?? null,
    shiten_id: data.shiten_id ?? null,
    kumiaiin_code: data.kumiaiin_code,
    dokusya_shubetsu: data.dokusya_shubetsu,
    tetsuzuki_shurui: data.tetsuzuki_shurui,
    shimei_sei: data.shimei_sei,
    shimei_mei: data.shimei_mei,
    shimei_kana_sei: data.shimei_kana_sei,
    shimei_kana_mei: data.shimei_kana_mei,
    dokusya_busu: data.dokusya_busu,
    yubin_no: data.yubin_no,
    todofuken_code: data.todofuken_code,
    shikuchoson: data.shikuchoson,
    chome_banchi: data.chome_banchi,
    tatemono_mei: data.tatemono_mei,
    renrakusaki_1: data.renrakusaki_1,
    renrakusaki_2: data.renrakusaki_2,
    email: data.email,
    mail_magazine_flg: data.mail_magazine_flg,
    birth_year: data.birth_year,
    gender: data.gender,
    haitatsu_same_flg: data.haitatsu_same_flg,
    haitatsu_yubin_no: data.haitatsu_yubin_no,
    haitatsu_todofuken_code: data.haitatsu_todofuken_code,
    haitatsu_shikuchoson: data.haitatsu_shikuchoson,
    haitatsu_chome_banchi: data.haitatsu_chome_banchi,
    haitatsu_tatemono_mei: data.haitatsu_tatemono_mei,
    haitatsu_renrakusaki_1: data.haitatsu_renrakusaki_1,
    haitatsu_renrakusaki_2: data.haitatsu_renrakusaki_2,
    haitatsu_shimei_sei: data.haitatsu_shimei_sei,
    haitatsu_shimei_mei: data.haitatsu_shimei_mei,
    haitatsu_shimei_kana_sei: data.haitatsu_shimei_kana_sei,
    haitatsu_shimei_kana_mei: data.haitatsu_shimei_kana_mei,
    // NULL 許容。BE は未設定を null で返す（dokusya.mapper.ts の
    // coerceNullableNumber）ので、そのまま「未選択」として流す。
    hanbaiten_id: data.hanbaiten_id,
    tanka_id: data.tanka_id,
    yubin_kubun: data.yubin_kubun,
    shiharai_hoho: data.shiharai_hoho,
    dokusyaryo_shiharai_cycle: data.dokusyaryo_shiharai_cycle,
    bank_shiten_id: data.bank_shiten_id,
    hikiotoshi_yokin_shubetsu: data.hikiotoshi_yokin_shubetsu,
    hikiotoshi_koza_no: data.hikiotoshi_koza_no,
    hikiotoshi_koza_meigi: data.hikiotoshi_koza_meigi,
    // 読者属性は購読種別を問わず単一選択。列は CSV VARCHAR なので旧データや
    // pull 由来の多値が入っていることがあり、ラジオが 1 つしか表示できない以上
    // そのままだと画面と保存値がズレる。先頭コードへ寄せて
    // 「表示＝保存される値」を保つ。
    dokusyaso_bunrui: splitBunruiCsv(data.dokusyaso_bunrui)[0] ?? '',
    ja_yakushokuin_flg: data.ja_yakushokuin_flg,
    nogyo_kankei_flg: data.nogyo_kankei_flg,
    dokusyaso_bunrui_sonota: data.dokusyaso_bunrui_sonota,
    nogyosya_bunrui: data.nogyosya_bunrui,
    nogyosya_bunrui_sonota: data.nogyosya_bunrui_sonota,
    dokusya_kaishi_date: data.dokusya_kaishi_date,
    dokusya_chushi_date: data.dokusya_chushi_date,
    joho_henko_tekiyo_date: johoValue,
    seikyu_kaishi_month: data.seikyu_kaishi_month,
    biko: data.biko,
  });
  // 元の販売店を控えておき、編集中の変更検知 (hanbaitenChanged) に使う。
  originalHanbaitenId.value = data.hanbaiten_id ?? null;
  // 編集前の解約予定日を控える（相対チェックの参照＝直前の有効レコード）。
  originalChushiDate.value = data.dokusya_chushi_date ?? null;
  // DB 値の購読開始日・情報変更適用日を控える（解約→新規→解約 で復元する）。
  // joho は編集初期値(johoValue=翌日)ではなく DB 実値を保持し、復元時は
  // 「データベースの正しい値」を読取専用で表示する（顧客要件 2026-07）。
  originalKaishiDate.value = data.dokusya_kaishi_date;
  originalJohoDate.value = data.joho_henko_tekiyo_date ?? null;
  // DB 登録時の部数を控える（解約→新規 と切替えたとき復元する）。
  originalDokusyaBusu.value = data.dokusya_busu;
  // 読込時の手続種類・支払方法を控える（canResubscribe 判定用スナップショット）。
  originalTetsuzukiShurui.value = data.tetsuzuki_shurui;
  originalShiharaiHoho.value = data.shiharai_hoho;
  // 解約予約ガード（顧客要件 2026-07）。
  hasActiveKaiyaku.value = data.has_active_kaiyaku ?? false;
  maxJohoDate.value = data.max_joho_date ?? null;
  detailRireki.value = data.rireki_no;
  detailDenshiShoninStatus.value = data.denshi_shonin_status;
  detailDenshiDokusyaShubetsu.value = data.denshi_dokusya_shubetsu;
  detailHonshiKodokuFlg.value = data.honshi_kodoku_flg ?? false;
  detailDenshiKaiinId.value = data.denshi_kaiin_id ?? null;
  originalTankaId.value = data.tanka_id;
  queueMicrotask(() => {
    isHydrating.value = false;
  });
}

async function loadDetail(id: number): Promise<void> {
  try {
    const resp = await getDokusya(id);
    // 参照（未編集）の間は t_dokusya の実値をそのまま見せる（顧客要件 2026-08）。
    // 以前は読込時点で翌日を入れていたが、何も触っていないのに DB と違う日付が
    // 出て「この日付で登録済み」と誤読される。未来日への差し替えは編集を始めた
    // 時点（johoEditable が true になる瞬間）で行う。
    applyDetailResponse(resp.data, resp.data.joho_henko_tekiyo_date ?? '');
  } catch (err) {
    const ax = err as AxiosError<{ error_code?: string; message?: string }>;
    const code = ax?.response?.data?.error_code;
    if (code === 'NOT_FOUND') {
      // ACSMS-MSG-011-016。以前は画面内にバナー表示していたが、他の編集画面
      // （account/ja/kanri-shiten/shiten/tanka/hanbaiten）と同じくトースト＋
      // ダッシュボードへの遷移に統一する（顧客要件 2026-08 —
      // useNotFoundRedirect 共通化）。文言は顧客要件の固定文言（IDを含む）
      // なので interceptor の一般メッセージとは別にここで明示的に出す。
      await redirectToDashboard(
        `購読者ID #${dokusyaId.value ?? ''} が見つかりません。`,
      );
      return;
    }
    // 他コード（403 / 500）は global axios interceptor がトースト — リダイレクト
    // せずフォームを空のままにする。
  }
}

// ─── 条件付きルール（機能定義 §7-§11） ────────────────────────────

// §8 — 手続種類 changes drive 購読部数:
//   解約 (=0) → 0 部（解約は部数なし）。
//   新規 (=1) → 新規作成のみ既定 1 部。編集では既存部数を保持（1 に戻さない）。
// 解約は CREATE では disabled、EDIT でのみ選択可。EDIT で 解約→新規 と
// 切替えても数量は維持し、0 へ落とすのは「解約」を選んだときだけ。
// 既存レコードのハイドレート中はスキップし、編集モードで保存済み部数を保持する。
watch(
  () => formState.tetsuzuki_shurui,
  (next) => {
    if (isHydrating.value) return;
    if (Number(next) === TetsuzukiShurui.KAIYAKU) {
      // 解約: 部数=0。
      formState.dokusya_busu = 0;
      if (isEdit.value && Number(originalTetsuzukiShurui.value) === TetsuzukiShurui.KAIYAKU) {
        // 解約済み読込 → 新規へ切替 → 再度 解約へ戻した場合（再購読の取消）:
        // 購読開始日・情報変更適用日・購読中止日を DB 値へ復元し、読取専用表示に
        // 戻す（顧客要件 2026-07）。開始日を DB 値へ戻すと otherInfoChanged=false に
        // なり johoEditable=false → 情報変更適用日も自動的に readonly へ戻る。
        formState.dokusya_kaishi_date = originalKaishiDate.value;
        formState.dokusya_chushi_date = originalChushiDate.value;
        // joho は sync watch(otherInfoChanged 等)が「未変更＝johoHenkoBaseline」へ
        // 追随させるため、基準値と formState の双方を DB 実値へ揃える（そうしないと
        // 再購読中に kaishi へ追随した翌日値へ戻されてしまう）。
        johoHenkoBaseline.value = originalJohoDate.value;
        formState.joho_henko_tekiyo_date = originalJohoDate.value;
      } else if (!formState.dokusya_chushi_date) {
        // 通常フロー（新規読込 → 中止日入力で解約予約）: 購読中止日は必須・未来日のみ
        // （顧客要件 2026-07 改訂）なので空なら翌日を初期値にする。
        formState.dokusya_chushi_date = tomorrowIsoTokyo();
      }
    } else {
      // 新規:
      //  - 新規作成: 既定 1 部。
      //  - 再購読（解約済み→新規）: 解約時の 0 ではなく新規購読の既定 1 部にする
      //    （解約読込の originalDokusyaBusu は 0 のため復元不可・顧客要件 2026-07）。
      //  - 編集(非解約)で 解約→新規 に戻したとき: DB 登録時の部数を復元する。
      const isResubscribe =
        isEdit.value && Number(originalTetsuzukiShurui.value) === TetsuzukiShurui.KAIYAKU;
      formState.dokusya_busu =
        !isEdit.value || isResubscribe ? 1 : originalDokusyaBusu.value;
      // 新規は購読中止日を持たない → クリア（入力不可）。
      formState.dokusya_chushi_date = null;
      // 再購読は購読開始日を翌日(未来日のみ)へリセットする（旧開始日は過去日で
      // 未来日検証に通らないため、そのまま残さず翌日を初期値に）。
      if (isResubscribe) {
        formState.dokusya_kaishi_date = tomorrowIsoTokyo();
      }
    }
  },
);

// [cancel-scheduling] 編集画面で購読中止日(解約予定日)を入力＝解約予約（顧客決定
// 2026-07）。手続種類は編集で disabled だが、中止日を入れたら手続種類を解約(0)へ
// 寄せ（既存 watch が部数を0にする）、フォーム表示を保存結果（BE が解約履歴行を
// 作る）と一致させる。中止日をクリアしたら元の手続種類へ戻す（→ 部数も復元）。
watch(
  () => formState.dokusya_chushi_date,
  (chushi) => {
    if (isHydrating.value || !isEdit.value) return;
    if (chushi) {
      if (Number(formState.tetsuzuki_shurui) !== TetsuzukiShurui.KAIYAKU) {
        formState.tetsuzuki_shurui = TetsuzukiShurui.KAIYAKU;
      }
    } else if (Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.KAIYAKU) {
      formState.tetsuzuki_shurui = Number(
        originalTetsuzukiShurui.value ?? TetsuzukiShurui.SHINKI,
      );
    }
  },
);

// 購読中止日（解約予定日）: 編集画面では任意入力可。中止日入力で解約予約になる
// （上の watch が手続種類=解約へ寄せる）。新規作成画面では入力不可。実際の解約
// 反映（t_dokusya 更新）は日次バッチが到来日に行う（BE は未来日の解約履歴を挿入）。
const isCancelTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.KAIYAKU);

// 電子版(2)は購読部数=1固定（顧客要件 2026-06）。新規は1強制＋入力不可、
// 編集は不変なので入力不可。紙版(1)・併読(3) は従来どおり編集可。
const isDigital = computed(
  () => Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL,
);
// メールマガジンは電子版用項目 — 紙版(1)指定時はグレーアウト（顧客要件）。
const isPaper = computed(
  () => Number(formState.dokusya_shubetsu) === DokusyaShubetsu.PAPER,
);
// 新規で版を電子版へ切替えたら購読部数を1へ強制（解約時は0のまま）。編集では
// 購読種別は不変なので発火しない。
watch(
  () => formState.dokusya_shubetsu,
  (next) => {
    if (isHydrating.value) return;
    if (Number(next) === DokusyaShubetsu.DIGITAL && !isCancelTetsuzuki.value) {
      formState.dokusya_busu = 1;
    }
    // メールマガジンは電子版用項目 — 紙版へ切替えたら未選択(null)にし DB も NULL
    // 保存（グレーアウト中は何も選択しない・顧客要件 2026-07）。電子版/併読へ
    // 切替えたら未選択のままだと分かりにくいので「配信しない」(0)を既定にする。
    if (Number(next) === DokusyaShubetsu.PAPER) {
      formState.mail_magazine_flg = null;
    } else if (formState.mail_magazine_flg == null) {
      formState.mail_magazine_flg = 0;
    }
    // 販売店の候補は購読種別で排他に分かれる（電子版=ダミーのみ / それ以外=
    // ダミー以外）。切替前の選択は新しい候補に必ず存在しないので破棄してから
    // 取り直す — 残すと画面にはコードが出るのに候補に無い（＝BE も別種別の
    // 販売店を受ける）不整合になる。編集では購読種別が不変なので発火しない。
    formState.hanbaiten_id = null;
    void fetchHanbaitenOptions();
  },
);

// 再加入可否（顧客要件 2026-06）: 解約済みの購読者を編集する際、購読開始日と
// 手続種類を再度入力可にする条件。判定は読込時スナップショット（手続種類は
// 編集で可変になるため循環回避）。dokusya_shubetsu は編集で不変。
//   (紙版 かつ 解約) または (電子版 かつ 支払方法≠クレカ かつ 解約)
const canResubscribe = computed(
  () =>
    isEdit.value &&
    Number(originalTetsuzukiShurui.value) === TetsuzukiShurui.KAIYAKU && // 解約
    (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.PAPER ||
      (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
        Number(originalShiharaiHoho.value) !== ShiharaiHoho.CREDIT_CARD)),
);

// 解約済み(master が解約状態)を編集で開いた直後 — まだ 手続種類=新規 へ切替えて
// いない状態。フォーム全体を read-only にして 手続種類ラジオだけで 解約→新規 の
// 切替を許可する（顧客要件 2026-07）。手続種類ラジオは子 <a-radio> に defined な
// :disabled があり form-level disabled をバイパスするので、ここでロックしても
// canResubscribe の間は操作可能なまま。
const isCancelledLocked = computed(
  () =>
    isEdit.value &&
    Number(originalTetsuzukiShurui.value) === TetsuzukiShurui.KAIYAKU && // 読込時=解約
    Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.KAIYAKU, // まだ新規へ切替えていない
);
// 再購読中 — 解約済み → 手続種類=新規 を選択。フォームが編集可になり、購読開始日を
// 再入力できる。情報変更適用日(joho)は購読開始日へ追随して disabled。
const isResubscribing = computed(
  () =>
    isEdit.value &&
    Number(originalTetsuzukiShurui.value) === TetsuzukiShurui.KAIYAKU && // 読込時=解約
    Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.SHINKI, // 新規へ切替
);

// ─── 情報変更モード（顧客要件2026-07・参照→編集フロー・SCR-011）────────────
// 編集画面は最初「参照(read-only)」で表示し、右上の「当日変更」「予約変更」から
// 編集モードを選ぶ。当日変更=適用日を本日固定・帳票非影響項目のみ（紙版）、
// 予約変更=適用日を未来日で入力・全項目可。BE がサーバ側の境界を enforce する。
type ViewMode = 'reference' | 'today' | 'reserved';
const viewMode = ref<ViewMode>('reference');

// 予約変更(未来日)の適用日ポップアップ (B案)。予約変更モードに入る前に
// 適用日(joho)を確定させ、その joho 時点の有効履歴行(predecessor)をフォームへ
// ロードする。これにより editGuard baseline が predecessor になり、BE の
// timeline-diff と一致（未来予約の積み重ねで未編集項目を誤変更しない）。
const reservedJohoModalOpen = ref(false);
const reservedJohoInput = ref<string | null>(null);
const reservedJohoError = ref('');
const reservedJohoLoading = ref(false);
// 読込直後の formState スナップショット（モード切替リセット用）。
const loadedFormSnapshot = ref<Record<string, unknown> | null>(null);

// 2つのモードボタンを出す＝この読者を編集できるか（Q4・顧客決定2026-07）:
// 併読/電子版クレカ(isRecordReadOnly) と 解約済み(isCancelledLocked) は編集不可、
// dokusya.update 権限なしも不可。純電子版は編集可。
const canSelectMode = computed(
  () =>
    isEdit.value &&
    !isRecordReadOnly.value &&
    // 承認待ち(電子版)は承認/否認フロー、単価初回登録待ちは専用ボタン、
    // 解約読込は再購読フローのため、いずれもモード選択（参照→当日/予約）の対象外。
    !isPending.value &&
    !isTankaRegistrationPending.value &&
    Number(originalTetsuzukiShurui.value) !== TetsuzukiShurui.KAIYAKU &&
    authStore.hasPermission('dokusya.update'),
);
// モードバーは紙版・電子版とも出す。以前は電子版だけモードバーを出さず、開いた
// 瞬間から編集可能（当日変更モード）にしていたが、同じ「購読者編集」画面が購読種別
// によって参照で開いたり編集で開いたりするのは一貫性が無く、電子版だけ誤操作で
// 保存しやすかった。両版とも「参照で開く → モードを選ぶ」に統一する（顧客要件
// 2026-07 改訂 / UI 統一）。
const showModeBar = computed(() => canSelectMode.value);
// 予約変更（未来日）が使えるのは紙版のみ。電子版は当日変更だけ（顧客要件 2026-07）。
// ボタンは隠さず disabled にする — 隠すと「この画面に予約変更は無い」と読めてしまい、
// 紙版との違いが伝わらない。理由はモードバーの補足テキストで示す。
const canUseReservedMode = computed(() => isPaper.value);

const isReferenceMode = computed(
  () => isEdit.value && canSelectMode.value && viewMode.value === 'reference',
);
const isTodayMode = computed(() => isEdit.value && viewMode.value === 'today');
const isReservedMode = computed(
  () => isEdit.value && viewMode.value === 'reserved',
);
// フォーム全体が読取専用になる条件（参照モード＋既存の読取専用ロック）。
// a-form の :disabled は明示 :disabled を持つ項目には効かない（antd-vue は
// 明示 disabled がコンテキストより優先）ため、明示 :disabled を持つ項目には
// この computed を OR して参照モードでも確実にロックする。
// 「新聞単価を除く全項目」を読取専用にする基準（否認・参照モード・編集不可
// レコード・解約ロック）。承認待ち(単価のみ編集可)は含めない → 単価フィールドは
// この formLocked を明示 :disabled に用い、承認待ち中も編集可能に保つ。
const formLocked = computed(
  () =>
    isReferenceMode.value ||
    isRecordReadOnly.value ||
    isCancelledLocked.value ||
    isDenshiRejected.value,
);
// フォーム全体の読取専用（formLocked ＋ 承認待ち ＋ 単価初回登録待ち）。
// 承認待ちは単価以外を全ロック、単価初回登録待ちは単価のみ編集可（他は
// formLocked に含めない = tanka_id の :disabled="formLocked" だけ素通りする）。
const readOnlyForm = computed(
  () => formLocked.value || isPending.value || isTankaRegistrationPending.value,
);
// 当日変更モードで帳票影響項目をロックするか（紙版のみ。電子版は全項目 当日反映可）。
const reportFieldsLocked = computed(() => isTodayMode.value && isPaper.value);
// 帳票影響項目の最終 disabled（読取専用 or 当日変更・紙版ロック）。
const reportFieldDisabled = computed(
  () => readOnlyForm.value || reportFieldsLocked.value,
);

/**
 * 編集モードを選択する（参照→当日変更/予約変更、または 当日⇄予約 切替）。
 * 既に編集モードで入力がある状態からの切替は「入力内容をリセット」確認を挟む
 * （顧客要件2026-07: 一度リセットしてからモード切替）。
 */
function selectMode(mode: 'today' | 'reserved'): void {
  if (viewMode.value === mode) return;
  // 予約変更は、モードに入る前に適用日ポップアップで joho を確定し、その joho
  // 時点の有効履歴行(predecessor)をロードする（B案）。
  if (mode === 'reserved') {
    // ボタンは disabled だが、それは UI の都合でしかない。電子版で予約変更へ
    // 入れてしまうと未来日の履歴行ができ、BE の当日変更前提と食い違うので
    // ここでも弾く（BE も change_mode を検証する）。
    if (!canUseReservedMode.value) return;
    reservedJohoInput.value = null;
    reservedJohoError.value = '';
    reservedJohoModalOpen.value = true;
    return;
  }
  // 当日変更: 適用日=本日固定。購読開始日が未来（本日 < 購読開始日）の読者は
  // 当日変更を使えない（BE も同じ判定で VALIDATION_ERROR を返す）。従来は
  // フォーム下部の 読者情報変更適用日 項目まで進んで初めて気づいたため、
  // モード選択の時点でその場でトースト表示して弾く。
  if (originalKaishiDate.value && todayIsoTokyo() < originalKaishiDate.value) {
    notify.error(
      `情報変更適用日は購読開始日（${slashDate(originalKaishiDate.value)}）以降の日付を指定してください。`,
    );
    return;
  }
  const apply = (): void => {
    if (viewMode.value !== 'reference') resetFormToLoaded();
    viewMode.value = 'today';
    formState.joho_henko_tekiyo_date = todayIsoTokyo();
    fieldErrors.value = {};
    // 適用日を本日へ動かした状態を新しい基準にする。これをしないと、モードに
    // 入っただけ（業務項目は未変更）で editGuard が dirty と判定し、「変更が
    // ありません」のスキップが効かず空の履歴行が生まれる。予約変更側は
    // confirmReservedJoho が同じことをしており、当日変更だけ抜けていた。
    void editGuard.capture();
  };
  if (viewMode.value !== 'reference') {
    Modal.confirm({
      title: 'モードを切り替えますか？',
      content: '入力中の変更内容はリセットされます。よろしいですか？',
      okText: 'はい',
      cancelText: 'いいえ',
      onOk: apply,
    });
  } else {
    apply();
  }
}

/**
 * 予約変更ポップアップの確定。適用日(未来日)を検証し、その joho 時点の有効
 * 履歴行(findBefore)をフォームへロードして予約変更モードへ入る。editGuard の
 * baseline はロードした predecessor になり、BE の timeline-diff と一致する
 * （未来予約の積み重ねで未編集項目を誤って revert しない）。
 */
async function confirmReservedJoho(): Promise<void> {
  const joho = reservedJohoInput.value;
  reservedJohoError.value = '';
  if (!joho) {
    reservedJohoError.value = '情報変更適用日を入力してください。';
    return;
  }
  if (joho <= todayIsoTokyo()) {
    reservedJohoError.value =
      '情報変更適用日は本日より後の日付を指定してください。';
    return;
  }
  // 解約予定日は同日も不可（顧客要件2026-08）。ここで弾けばポップアップ内で
  // 即座に選び直せる（以前は update() 送信までこの検証が走らず、フォーム全項目
  // 入力後に弾かれてやり直しになっていた）。この画面は解約済み読者では出せない
  // （canSelectMode が originalTetsuzukiShurui=解約 を除外するため、モード選択
  // バー自体が出ない）ので、再購読の除外は不要。BE(getEffectiveAt)も同じ基準
  // （joho 時点で有効な解約予定日）で二重に検証する。
  if (originalChushiDate.value && joho >= originalChushiDate.value) {
    reservedJohoError.value = `情報変更適用日は解約予定日（${slashDate(
      originalChushiDate.value,
    )}）より前の日付を指定してください。`;
    return;
  }
  const id = dokusyaId.value;
  if (id === null) return;
  reservedJohoLoading.value = true;
  try {
    const resp = await getDokusyaEffectiveAt(id, joho);
    applyDetailResponse(resp.data, joho);
    viewMode.value = 'reserved';
    fieldErrors.value = {};
    reservedJohoModalOpen.value = false;
    // predecessor をロードした状態を基準にする（未編集 = 直前行と同一）。
    await editGuard.capture();
  } catch (err) {
    // VALIDATION_ERROR は axios interceptor がトーストしない契約
    // （.claude/rules/vue.md §Error Handling Architecture）ため、ここで拾って
    // ポップアップ内に表示する（handleServerError と同じ errors[] マッピング）。
    // 未来日という時点情報を含む範囲チェック（購読開始日以降 かつ 解約予定日
    // より前）は t_dokusya_rireki の履歴を辿って初めて確定するため、
    // originalChushiDate.value ベースのクライアント側事前チェックでは
    // 再現できないケースがあり、最終的にはBE(getEffectiveAt)の応答が正。
    const axiosErr = err as AxiosError<ServerErrorPayload>;
    const errs = axiosErr?.response?.data?.errors;
    const match = errs?.filter(
      (e): e is { field: string; message: string } =>
        e.field === 'joho_henko_tekiyo_date' && typeof e.message === 'string',
    );
    reservedJohoError.value = match && match.length > 0 ? match[match.length - 1].message : '';
    // それ以外（NOT_FOUND 等）は axios interceptor が処理済み。ポップアップは開いたまま。
  } finally {
    reservedJohoLoading.value = false;
  }
}

/**
 * 予約変更モード中に、確定済みの適用日を選び直す（顧客要件: 選択ミス時に
 * 当日変更へ一度切り替えてリセット→予約変更へ戻る、という遠回りをさせない）。
 * ポップアップを現在の適用日で再オープンするだけで、確定は既存の
 * confirmReservedJoho() に委ねる（predecessor の再ロードも従来どおり必要
 * — 適用日が変われば有効な履歴行も変わるため）。
 */
function editReservedJoho(): void {
  if (!isReservedMode.value) return;
  reservedJohoInput.value = formState.joho_henko_tekiyo_date || null;
  reservedJohoError.value = '';
  reservedJohoModalOpen.value = true;
}

/** 読込直後のスナップショットへ formState を戻す（モード切替時のリセット）。 */
function resetFormToLoaded(): void {
  if (!loadedFormSnapshot.value) return;
  isHydrating.value = true;
  Object.assign(formState, loadedFormSnapshot.value);
  void Promise.resolve().then(() => {
    isHydrating.value = false;
  });
}

// ── 販売店変更時の情報変更適用日 (画面項目定義 No.54) ─────────────────
// 編集モードで販売店 (hanbaiten_id) を変更した場合のみ「適用日」を表示・
// 必須化し、初期値を翌日 (未来日のみ・当日不可・顧客要件 2026-07 改訂) にする。
// 元の販売店に戻したら非表示にして値もクリアする (変更していない販売店に
// 適用日を送らない)。
const originalHanbaitenId = ref<number | null>(null);
// （originalChushiDate は上部の original* 群にまとめて宣言済み）
// 解約予約ガード（顧客要件 2026-07。loadDetail で設定）:
//  - hasActiveKaiyaku: 有効な解約予約あり → 購読中止日を disabled（履歴画面で取消要）。
//  - maxJohoDate: 履歴の最終変更適用日。解約予定日はこの日より後のみ選択可（同日不可）。
const hasActiveKaiyaku = ref(false);
const maxJohoDate = ref<string | null>(null);
// 販売店を「変更」したか。変更時は読者情報変更適用日(joho)がその適用日を兼ねる
// （顧客要件 2026-07: 販売店適用日を廃止）。再購読は新規作成同様「変更」概念を
// 持たないので常に false。
const hanbaitenChanged = computed(
  () =>
    isEdit.value &&
    !isResubscribing.value &&
    formState.hanbaiten_id != null &&
    originalHanbaitenId.value != null &&
    Number(formState.hanbaiten_id) !== Number(originalHanbaitenId.value),
);

/** 解約予定日(購読中止日)がロード値から変わったか（編集モードのみ）。 */
const chushiChanged = computed(
  () =>
    isEdit.value &&
    (formState.dokusya_chushi_date || null) !==
      (originalChushiDate.value || null),
);

// ── 読者情報変更適用日 (joho_henko_tekiyo_date) の編集可否 (顧客要件 2026-07) ──
// 販売店適用日を廃止し joho に統一（1更新1レコード）。販売店を含む「情報変更」が
// あれば joho をユーザーが入力（編集可）。解約予定日のみ変更のときだけ joho を
// 解約予定日へ自動追随させ disabled にする（解約フローは別扱い・不変）。
// 比較スナップショットからは joho 自体・販売店(hanbaiten_id)・解約予定日を除外する。
const infoChangeGuard = useEditGuard(() => {
  const snap: Record<string, unknown> = { ...formState };
  for (const f of NAME_FIELDS) {
    if (typeof snap[f] === 'string') snap[f] = (snap[f] as string).trim();
  }
  delete snap.joho_henko_tekiyo_date;
  delete snap.hanbaiten_id;
  delete snap.dokusya_chushi_date;
  // 解約予約中（中止日入力）は 手続種類/部数 が中止日に連動する派生値であり
  // 独立編集ではない。「他項目変更」に数えないよう baseline（＝ロード時の元値）へ
  // 正規化して比較する。delete するとキー欠落で baseline とズレて誤検知するため、
  // 元値へ揃える（joho は解約予定日へ追随したまま）。
  if (formState.dokusya_chushi_date) {
    snap.tetsuzuki_shurui = originalTetsuzukiShurui.value ?? snap.tetsuzuki_shurui;
    snap.dokusya_busu = originalDokusyaBusu.value ?? snap.dokusya_busu;
  }
  return snap;
});
/** 販売店・解約予定日・適用日(joho)以外の項目に変更があるか（編集モードのみ）。 */
const otherInfoChanged = computed(
  () => isEdit.value && !infoChangeGuard.isPristine(),
);
/**
 * joho が解約予定日へ自動追随する状態（＝「解約予定日のみ変更」）。joho=解約予定日。
 * 解約予定日は自身のバリデーション（> today / >= 購読開始日）を持ち、joho=解約予定日
 * なら joho 制約も自動的に満たされるため joho 側の追加チェックは不要。解約フローは
 * 別扱い（顧客要件: 解約は別履歴行）なので従来どおり残す。
 */
const johoFollowsChushi = computed(
  () =>
    chushiChanged.value &&
    !hanbaitenChanged.value &&
    !otherInfoChanged.value,
);
/** joho が解約予定日へ自動追随中（編集 disabled）。 */
const johoFollows = computed(() => johoFollowsChushi.value);
/**
 * joho をユーザーが入力できる状態。販売店を含む「情報変更」があれば編集可
 * （顧客要件 2026-07: 販売店適用日は joho に統一）。解約予定日のみ変更・再購読は
 * 自動追随のため不可。
 */
const johoEditable = computed(
  () =>
    isEdit.value &&
    !isResubscribing.value &&
    // 予約変更モードの適用日はポップアップで確定済み → インライン編集不可（表示のみ）。
    // 当日変更モードは本日固定（読取専用）。
    // モード未確定（既存フロー・後方互換）は従来どおり情報/販売店変更で編集可。
    viewMode.value === 'reference' &&
    (otherInfoChanged.value || hanbaitenChanged.value),
);
// joho の自動値（編集不可のとき）:
//  - 解約予定日のみ変更 → 解約予定日(dokusya_chushi_date)へ追随。
//  - それ以外（＝情報変更なし）→ ロード時の基準値へ戻す（→ pristine、PUT/履歴なし）。
// 情報変更 or 販売店変更があるときはユーザー入力（下の watch は早期 return）。
watch(
  [
    otherInfoChanged,
    hanbaitenChanged,
    chushiChanged,
    () => formState.dokusya_chushi_date,
  ],
  ([other, hanbaiten, chushi, chushiDate]) => {
    if (isHydrating.value) return;
    // 当日変更/予約変更モードでは joho はモード側で確定（本日固定 or ユーザー入力）。
    // 自動追随は既存フロー（参照モード＝未選択）のみに限定する。
    if (isTodayMode.value || isReservedMode.value) return;
    if (other || hanbaiten) return; // 情報変更 or 販売店変更 → ユーザー入力（編集可）
    if (chushi && chushiDate) {
      formState.joho_henko_tekiyo_date = chushiDate as string;
    } else {
      formState.joho_henko_tekiyo_date = johoHenkoBaseline.value;
    }
  },
);

// 編集を始めた瞬間（johoEditable が false→true）に適用日を翌日で埋める
// （顧客要件 2026-08）。参照中は DB 実値を出す方針にしたため、そのまま編集に
// 入ると過去日が残り「本日より後」の検証で必ず落ちる。ここで一度だけ既定値を
// 入れ、以降はユーザー入力を尊重する（true の間は再発火しない）。
// 変更を戻して未編集に戻った場合は、上の watch が johoHenkoBaseline（＝DB 実値）
// へ戻すので参照時の表示に復帰する。
watch(johoEditable, (editable, wasEditable) => {
  if (isHydrating.value) return;
  if (editable && !wasEditable) {
    formState.joho_henko_tekiyo_date = tomorrowIsoTokyo();
  }
});

// 再購読中は情報変更適用日(joho)を購読開始日へ追随させる（新規登録と同じく joho=
// 購読開始日。入力は disabled・顧客要件 2026-07）。手続種類 0→1 で otherInfoChanged
// が true になり上の watch は早期 return するため、ここで joho を確定する。
watch(
  [isResubscribing, () => formState.dokusya_kaishi_date],
  ([resub, kaishi]) => {
    if (isHydrating.value) return;
    if (resub && kaishi) {
      formState.joho_henko_tekiyo_date = kaishi as string;
    }
  },
);

// 購読中止日カレンダー（顧客要件 2026-07）。未来日のみ + 最終変更適用日(maxJohoDate)
// より後のみ選択可（解約は最終変更より後・同日不可）。max_joho_date は API 由来の
// YYYY-MM-DD。<= で無効化して maxJoho 当日も弾く。
function disabledChushiDate(current: Dayjs | null): boolean {
  if (isTodayOrPastDayTokyo(current)) return true;
  if (maxJohoDate.value && current) {
    return current.format('YYYY-MM-DD') <= maxJohoDate.value;
  }
  return false;
}

// 購読開始日カレンダー。新規登録・再購読は未来日のみ (当日・過去日 不可・顧客要件
// 2026-07。BE も assertTekiyoDateFuture で当日を弾く)。それ以外(通常編集)は購読開始日
// 自体が disabled だが従来どおり過去日のみ不可。電子版 の新規はラジオ
// 「今日/翌月1日」なので本カレンダー自体を表示しない (特例・当日可)。
function disabledKaishiDate(current: Dayjs | null): boolean {
  return !isEdit.value || isResubscribing.value
    ? isTodayOrPastDayTokyo(current)
    : isPastDayTokyo(current);
}

// §9 / バグ報告2026-08 共通処理 — 配達先情報11項目（住所5＋連絡先2＋氏名4）を
// クリアする。haitatsu_same_flg=true への切替、または 電子版へ種別変更した
// 際に使う（後者は §7.5 参照）。
function clearHaitatsuFields(): void {
  formState.haitatsu_yubin_no = '';
  formState.haitatsu_todofuken_code = '';
  formState.haitatsu_shikuchoson = '';
  formState.haitatsu_chome_banchi = '';
  formState.haitatsu_tatemono_mei = '';
  formState.haitatsu_renrakusaki_1 = '';
  formState.haitatsu_renrakusaki_2 = '';
  formState.haitatsu_shimei_sei = '';
  formState.haitatsu_shimei_mei = '';
  formState.haitatsu_shimei_kana_sei = '';
  formState.haitatsu_shimei_kana_mei = '';
}

// §9 — haitatsu_same_flg が true になったら全 haitatsu_* をクリア。
watch(
  () => formState.haitatsu_same_flg,
  (next) => {
    if (isHydrating.value) return;
    if (next === true) clearHaitatsuFields();
  },
);

// §11 — 農業者 unchecked → clear 主な生産物 (nogyosya_bunrui).
const hasNogyosha = computed(() =>
  splitBunruiCsv(formState.dokusyaso_bunrui).includes(DOKUSYASO_BUNRUI_NOGYOSYA),
);

/**
 * 主な生産物 (画面項目定義 No.51) — agrarian sub-category, same
 * comma-separated code storage convention as 購読者層分類.
 */
const nogyosyaBunruiArr = computed<string[]>({
  get: () => splitBunruiCsv(formState.nogyosya_bunrui),
  set: (next: string[]) => {
    formState.nogyosya_bunrui = next.join(',');
  },
});

/**
 * 読者属性 / 主な生産物 の選択肢 — m_code から取得（実行時にラベル変更可）。
 * m_code は数値 value を返すが、両列は CSV VARCHAR なので String() で寄せる
 * （vue.md §Code Master の type-coercion gotcha）。
 */
const dokusyaSoBunruiOptions = computed(() =>
  codes.options('DOKUSYASO_BUNRUI').map((o) => ({
    value: String(o.value),
    label: o.label,
  })),
);
const nogyosyaBunruiOptions = computed(() =>
  codes.options('NOGYOSYA_BUNRUI').map((o) => ({
    value: String(o.value),
    label: o.label,
  })),
);

watch(hasNogyosha, (next) => {
  if (isHydrating.value) return;
  if (next === false) {
    formState.nogyosya_bunrui = '';
  }
});

// §7 — 電子版 は 配達先 セクションを隠す。併読は紙も届くので表示する
// （顧客要件 2026-08）。読者同期も併読には paper_* 由来の配達先を入れており、
// 隠したままだと同期済みの住所を画面から確認・修正できなかった。
// 値を受け取る素の関数として切り出していたが、唯一の呼出し元だった
// ハイドレートの読者属性分岐が無くなった（紙版も単一選択に統一）ので畳んだ。
const isDigitalOrBoth = computed(
  () =>
    Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL ||
    Number(formState.dokusya_shubetsu) === DokusyaShubetsu.BOTH,
);

/**
 * 配達先セクションの表示可否だけに使う。メール必須・読者属性必須などの
 * 「電子版寄りの入力ルール」は併読にも効くので `isDigitalOrBoth` のまま。
 * 配達の有無だけが 電子版(2) と 併読(3) で分かれる。
 */
const isDigitalOnly = computed(
  () => Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL,
);

// ─── 読者属性の従属項目（顧客DB設計 2026-08）────────────────────────
//
// 読者属性で選んだコードに応じて、追加のチェック / 自由記述欄を出す。
//
// **電子版・併読のみの機能**（顧客要件 2026-08）。4 項目はいずれも電子版
// users.profession_and_* / others_* との連携用で、紙版には送り先が無い。
// 紙版は従来どおり読者属性＝複数選択、従属項目なしで据え置く。
//
// 出す条件は電子版 API の条件付き項目の受理条件と同一（allowsXxx を BE と共有）。
// 条件から外れた値を送ると V26〜V30 で push ごと失敗するため、欄を隠すときは
// 必ず値もクリアする。BE も保存時に同じゲートで落とすので二重防御。
const showJaYakushokuin = computed(
  () => isDigitalOrBoth.value && allowsJaYakushokuinFlg(formState.dokusyaso_bunrui),
);
const showNogyoKankei = computed(
  () => isDigitalOrBoth.value && allowsNogyoKankeiFlg(formState.dokusyaso_bunrui),
);
const showDokusyasoSonota = computed(
  () =>
    isDigitalOrBoth.value &&
    allowsDokusyasoBunruiSonota(formState.dokusyaso_bunrui),
);
const showNogyosyaSonota = computed(
  () =>
    isDigitalOrBoth.value &&
    allowsNogyosyaBunruiSonota(formState.nogyosya_bunrui),
);

/** 読者属性の右カラムに何か出るか（レイアウトを 2 カラムへ切り替える条件）。 */
const hasDokusyasoDependent = computed(
  () => showJaYakushokuin.value || showNogyoKankei.value || showDokusyasoSonota.value,
);

watch(showJaYakushokuin, (next) => {
  if (isHydrating.value) return;
  if (!next) formState.ja_yakushokuin_flg = false;
});
watch(showNogyoKankei, (next) => {
  if (isHydrating.value) return;
  if (!next) formState.nogyo_kankei_flg = false;
});
watch(showDokusyasoSonota, (next) => {
  if (isHydrating.value) return;
  if (!next) formState.dokusyaso_bunrui_sonota = '';
});
watch(showNogyosyaSonota, (next) => {
  if (isHydrating.value) return;
  if (!next) formState.nogyosya_bunrui_sonota = '';
});

/**
 * 読者属性 — 購読種別を問わず単一選択（ラジオ・顧客要件 2026-08 で紙版も統一）。
 *
 * 従属項目（かつJAグループ役職員 / 農業関係）は**主分類を修飾する**設計なので
 * 単一選択が前提。それは電子版だけの機能だが、紙版だけ複数選択のまま残すと
 * 購読種別を切り替えるたびに UI の意味が変わり、保存値も 1 値/多値で揺れる。
 * 入力方法は揃える。
 *
 * 列は引き続きカンマ区切り VARCHAR（電子版 profession が多値仕様で、pull で
 * 複数コードが降ってくる余地を残す）。画面側だけ 1 値に固定する。
 */
const dokusyaSoBunruiSingle = computed<string>({
  get: () => splitBunruiCsv(formState.dokusyaso_bunrui)[0] ?? '',
  set: (next: string) => {
    formState.dokusyaso_bunrui = next;
  },
});

// ─── 購読開始日・中止日 — create-mode 電子版 の特例 ──────────────────
//
// 顧客要件 2026-07 改訂: create かつ 電子版(2) のとき（支払方法は問わない）
//   - 購読開始日 : ラジオ 2 択「今日 / 翌月1日」(既定=今日)。実際の保存
//                 値は buildRequestBody でラジオから確定する (今日=本日
//                 JST / 翌月1日=翌月1日 JST)。
//   - 購読中止日 : 読取専用・空欄。submit は null。表示は「月末で終了」
//                 (値があれば YYYY/MM 表示)。中止（解約予約）は一覧の
//                 「購読を停止する」で行う。紙版も中止日は読取専用。
//   - 請求開始月 : 非表示（電子版システム決定後に受信するため create では未確定）。
// edit モードおよび紙版 create は従来ロジックを維持。
// 顧客要件 2026-07: 電子版の再購読（解約済み→新規）も新規作成と同じフォームに
// する（購読開始日ラジオ・中止日読取専用・請求開始月非表示・当日可）。よって
// 再購読中(isResubscribing)の電子版も create 扱いにする。
const isDigitalCreate = computed(
  () =>
    (!isEdit.value || isResubscribing.value) &&
    Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL,
);

/** 購読開始日ラジオ — 'today'(今日) / 'next_month_first'(翌月1日). */
const kaishiDateMode = ref<'today' | 'next_month_first'>('today');

/** 電子版 create の購読開始日として保存する YYYY-MM-DD を確定する。 */
function resolveKaishiDateDigitalCreate(): string {
  return kaishiDateMode.value === 'next_month_first'
    ? nextMonthFirstIsoTokyo()
    : todayIsoTokyo();
}

/** 購読中止日 読取専用表示 — 値があれば YYYY/MM、無ければ空欄。 */
const chushiMonthDisplay = computed(() =>
  formState.dokusya_chushi_date ? formatYearMonth(formState.dokusya_chushi_date) : '',
);

// ─── 購読中止日・請求開始月 — update(edit)-mode 表示ルール ─────────────
//
// 顧客要件 (update のみ。create と未列挙の組み合わせは従来ロジック):
//   購読開始日 : 全 update で読取専用カレンダー (:disabled="isEdit") —
//               テンプレート側で既に対応済み。
//   購読中止日 : 電子版+クレカ(6) または 併読(3) のとき読取専用 (月 YYYY/MM
//               表示 +「月末で終了」)。紙版 / 電子版+口座引落 / 電子版+その他
//               の支払方法 は従来どおり a-date-picker で編集可能。
//   請求開始月 : 電子版/併読 のとき読取専用ラベル (YYYYMM → YYYY/MM 表示)。
//               紙版は非表示 (isDigitalOrBoth=false)。
// 読取専用フィールドは UI を固定するだけで、formState の元値はそのまま
// 保持し submit でも送り直す (表示は computed 経由。formState は触らない)。
const chushiReadonlyMonthEdit = computed(
  () =>
    isEdit.value &&
    ((Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
      Number(formState.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD) ||
      Number(formState.dokusya_shubetsu) === DokusyaShubetsu.BOTH),
);

/** 請求開始月 (VARCHAR(6) YYYYMM) → 表示用 YYYY/MM。空文字はそのまま空。 */
function formatSeikyuMonth(raw: string | null | undefined): string {
  if (!raw) return '';
  const ym = raw.trim();
  const m6 = /^(\d{4})(\d{2})$/.exec(ym); // YYYYMM (DB 形式)
  if (m6) return `${m6[1]}/${m6[2]}`;
  const md = /^(\d{4})[-/](\d{2})/.exec(ym); // 念のため date / 区切り付きも受ける
  if (md) return `${md[1]}/${md[2]}`;
  return ym;
}

/** 請求開始月 読取専用表示 (update mode) — YYYY/MM。 */
const seikyuMonthDisplay = computed(() =>
  formatSeikyuMonth(formState.seikyu_kaishi_month),
);

/**
 * §9.2 — 配達先住所 + 配達先氏名 が「必須」になる条件:
 *   haitatsu_same_flg = false   (購読者情報と同じ をオフ)
 *   AND 紙版/併読 (= !isDigitalOnly)
 * 電子版のときはセクション全体が消えるためこの値は参照されない。
 */
const haitatsuRequired = computed(
  () => !formState.haitatsu_same_flg && !isDigitalOnly.value,
);

// ─── Validation (機能定義 §2.1 + メッセージ情報) ──────────────────────

const REQUIRED_MSG = '必須項目です。';
const HIRAGANA_RE = /^[ぁ-ゖー0-9０-９\s]+$/u;
const HIRAGANA_MSG = 'ひらがな・数字で入力してください。';
// 氏名 (氏/名) は漢字・ひらがな・カタカナ・アルファベットを許容（顧客要件 2026-07）。
// CJK統合漢字 + 々 + 〇 + CJK互換漢字(﨑/髙等) + ひらがな + 全角カタカナ(長音符ー・中点・
// 含む) + 半角英字(A-Za-z) + 全角英字(Ａ-Ｚ/ａ-ｚ) + 半角カタカナ(ｦ-ﾟ) + 数字(半角0-9/全角０-９)。空白は氏名の
// トークン区切りとして許容。購読者氏名(氏/名)・配達先氏名(氏/名)の4項目に適用。
// BE 側 KANJI_NAME_RE (create-dokusya.dto.ts) と同一文字集合 — 両方同時更新。
const KANJI_RE = /^[一-鿿々〇豈-﫿ぁ-ゟァ-ヿｦ-ﾟA-Za-zＡ-Ｚａ-ｚ0-9０-９\s]+$/u;
const KANJI_MSG = '漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。';
const POSTAL_MSG = '郵便番号は半角数字7桁で入力してください。';
// TEL1/TEL2（旧: 連絡先1/2）— 半角数字のみ・ハイフン不可（顧客CR 2026-08-24）。
// BE create-dokusya.dto.ts の TEL_DIGITS_RE と同一パターン。
const TEL_DIGITS_RE = /^\d+$/;
const TEL_DIGITS_MSG = '半角数字のみで入力してください（ハイフン不可）。';

/**
 * 任意項目の TEL — 入力時のみ半角数字・ハイフン不可を検証する。
 * validateHaitatsuCluster の Cognitive Complexity を抑えるため
 * inline if を関数呼び出しに切り出す（S3776）。
 */
function checkOptionalTelField(
  errs: Record<string, string>,
  field: string,
  value: string | undefined,
): void {
  if (value && !TEL_DIGITS_RE.test(value)) {
    errs[field] = TEL_DIGITS_MSG;
  }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MSG = '正しいメールアドレスを入力してください。';
const BIKO_MAX = 500;
const BIKO_MSG = '備考は500文字以内で入力してください。';
/** 読者属性/主な生産物の「その他」自由記述 — DB VARCHAR(255) と電子版の maxLen(255)。 */
const BUNRUI_SONOTA_MAX = 255;
const DOKUSYASO_SONOTA_MSG =
  '読者属性（その他の内容）は255文字以内で入力してください。';
const NOGYOSYA_SONOTA_MSG =
  '主な生産物（その他の内容）は255文字以内で入力してください。';
const KAISHI_DATE_FUTURE_MSG = '購読開始日は本日より後の日付を入力してください。';
const BUSU_MIN_MSG = '購読部数は1以上で入力してください。';
const DIGITAL_BUSU_MSG = '電子版の購読部数は1で登録してください。';

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/** Required base 氏名 cluster — 氏/名 は漢字、かな は全角ひらがな (画面項目定義 No.9-13). */
function validateNameCluster(errs: Record<string, string>): void {
  // 氏名(氏/名/かな) は作成・編集の両方で入力可（顧客要件 2026-07：編集画面で
  // 氏名を変更できるようにする）。必須＋氏/名は漢字・かなは全角ひらがなを
  // 作成/編集ともに検証する。
  if (!formState.shimei_sei?.trim()) errs.shimei_sei = REQUIRED_MSG;
  if (!formState.shimei_mei?.trim()) errs.shimei_mei = REQUIRED_MSG;
  if (!formState.shimei_kana_sei?.trim()) errs.shimei_kana_sei = REQUIRED_MSG;
  if (!formState.shimei_kana_mei?.trim()) errs.shimei_kana_mei = REQUIRED_MSG;
  // Format — 氏名 (氏/名) は漢字のみ (画面項目定義 No.9-10).
  if (
    !errs.shimei_sei &&
    formState.shimei_sei &&
    !KANJI_RE.test(formState.shimei_sei)
  ) {
    errs.shimei_sei = KANJI_MSG;
  }
  if (
    !errs.shimei_mei &&
    formState.shimei_mei &&
    !KANJI_RE.test(formState.shimei_mei)
  ) {
    errs.shimei_mei = KANJI_MSG;
  }
  if (
    !errs.shimei_kana_sei &&
    formState.shimei_kana_sei &&
    !HIRAGANA_RE.test(formState.shimei_kana_sei)
  ) {
    errs.shimei_kana_sei = HIRAGANA_MSG;
  }
  if (
    !errs.shimei_kana_mei &&
    formState.shimei_kana_mei &&
    !HIRAGANA_RE.test(formState.shimei_kana_mei)
  ) {
    errs.shimei_kana_mei = HIRAGANA_MSG;
  }
}

/** Required 住所 cluster + 郵便番号 7-digit format. */
function validateAddressCluster(errs: Record<string, string>): void {
  if (!formState.yubin_no?.trim()) {
    errs.yubin_no = REQUIRED_MSG;
  } else if (!/^\d{7}$/.test(formState.yubin_no)) {
    errs.yubin_no = POSTAL_MSG;
  }
  if (!formState.todofuken_code?.trim()) errs.todofuken_code = REQUIRED_MSG;
  if (!formState.shikuchoson?.trim()) errs.shikuchoson = REQUIRED_MSG;
  if (!formState.chome_banchi?.trim()) errs.chome_banchi = REQUIRED_MSG;
  if (!formState.renrakusaki_1?.trim()) {
    errs.renrakusaki_1 = REQUIRED_MSG;
  } else if (!TEL_DIGITS_RE.test(formState.renrakusaki_1)) {
    errs.renrakusaki_1 = TEL_DIGITS_MSG;
  }
  checkOptionalTelField(errs, 'renrakusaki_2', formState.renrakusaki_2);
}

/** 必須 FK ドロップダウン（clearable select → 安全のため == null で判定）。 */
function validateFkDropdowns(errs: Record<string, string>): void {
  // 管理支店 は必須（画面上 * 表示）。未選択のまま submit すると BE で
  // kanri_shiten_id=0 → m_kanri_shiten への FK 違反(500)になるため、ここで
  // 必ず required を検証する。購読種別切替の watcher が取扱いフラグ外の
  // 管理支店を null にクリアするケースもここで捕捉される。
  if (formState.kanri_shiten_id == null) errs.kanri_shiten_id = REQUIRED_MSG;
  // 支店 は任意（顧客要件 2026-07：必須を解除）。未選択(null)を許容する。
  if (formState.hanbaiten_id == null) errs.hanbaiten_id = REQUIRED_MSG;
  if (formState.tanka_id == null) errs.tanka_id = REQUIRED_MSG;
  if (formState.shiharai_hoho == null) errs.shiharai_hoho = REQUIRED_MSG;
}

/**
 * 購読開始日 required on create (unless 電子版 create, where the radio
 * always fixes it) + §7.1 電子版/併読 → email required & format.
 */
function validateKaishiAndEmail(errs: Record<string, string>): void {
  if (!isDigitalCreate.value && !formState.dokusya_kaishi_date) {
    errs.dokusya_kaishi_date = REQUIRED_MSG;
  }
  // 購読開始日は新規登録のみ未来日チェック（顧客要件 2026-07 改訂: 当日・過去日
  // 不可）。編集モードは読取専用で既存日を保持するため対象外。電子版 create
  // create はラジオ(今日/翌月1日)で確定する特例なので date-picker 経路
  // （!isDigitalCreate）のみチェックし、当日は許容する。
  if (
    !isEdit.value &&
    !isDigitalCreate.value &&
    !errs.dokusya_kaishi_date &&
    formState.dokusya_kaishi_date &&
    formState.dokusya_kaishi_date <= todayIsoTokyo()
  ) {
    errs.dokusya_kaishi_date = KAISHI_DATE_FUTURE_MSG;
  }
  if (isDigitalOrBoth.value && !formState.email?.trim()) {
    errs.email = REQUIRED_MSG;
  } else if (formState.email && !EMAIL_RE.test(formState.email)) {
    errs.email = EMAIL_MSG;
  }
}

/**
 * §9.2 — 配達先 cluster (住所4 No.28-31 + 氏名4 No.35-38) required when
 * haitatsu_same_flg=false かつ 紙版/併読. 電子版のみはセクション非活性化。
 */
function validateHaitatsuCluster(errs: Record<string, string>): void {
  if (!haitatsuRequired.value) return;
  if (!formState.haitatsu_yubin_no?.trim()) {
    errs.haitatsu_yubin_no = REQUIRED_MSG;
  } else if (!/^\d{7}$/.test(formState.haitatsu_yubin_no)) {
    errs.haitatsu_yubin_no = POSTAL_MSG;
  }
  if (!formState.haitatsu_todofuken_code?.trim())
    errs.haitatsu_todofuken_code = REQUIRED_MSG;
  if (!formState.haitatsu_shikuchoson?.trim())
    errs.haitatsu_shikuchoson = REQUIRED_MSG;
  if (!formState.haitatsu_chome_banchi?.trim())
    errs.haitatsu_chome_banchi = REQUIRED_MSG;
  // 配達先苗字/名前（漢字）— 購読者氏名（氏/名）と同じく必須＋漢字のみ。
  if (!formState.haitatsu_shimei_sei?.trim()) {
    errs.haitatsu_shimei_sei = REQUIRED_MSG;
  } else if (!KANJI_RE.test(formState.haitatsu_shimei_sei)) {
    errs.haitatsu_shimei_sei = KANJI_MSG;
  }
  if (!formState.haitatsu_shimei_mei?.trim()) {
    errs.haitatsu_shimei_mei = REQUIRED_MSG;
  } else if (!KANJI_RE.test(formState.haitatsu_shimei_mei)) {
    errs.haitatsu_shimei_mei = KANJI_MSG;
  }
  if (!formState.haitatsu_shimei_kana_sei?.trim()) {
    errs.haitatsu_shimei_kana_sei = REQUIRED_MSG;
  } else if (!HIRAGANA_RE.test(formState.haitatsu_shimei_kana_sei)) {
    errs.haitatsu_shimei_kana_sei = HIRAGANA_MSG;
  }
  if (!formState.haitatsu_shimei_kana_mei?.trim()) {
    errs.haitatsu_shimei_kana_mei = REQUIRED_MSG;
  } else if (!HIRAGANA_RE.test(formState.haitatsu_shimei_kana_mei)) {
    errs.haitatsu_shimei_kana_mei = HIRAGANA_MSG;
  }
  // TEL1/TEL2（配達先）— 任意項目だが入力時は半角数字のみ・ハイフン不可。
  checkOptionalTelField(errs, 'haitatsu_renrakusaki_1', formState.haitatsu_renrakusaki_1);
  checkOptionalTelField(errs, 'haitatsu_renrakusaki_2', formState.haitatsu_renrakusaki_2);
}

/** §10.1 — 口座引落 → bank cluster (支店/貯金種目/口座番号/口座名義) required. */
function validateBankCluster(errs: Record<string, string>): void {
  if (Number(formState.shiharai_hoho) !== ShiharaiHoho.KOZA_HIKIOTOSHI) return;
  // Every conditional-required slot emits 必須項目です。— the spec asserts
  // the substring 「必須」 (ACSMS-MSG-011-006 wording also contains it).
  if (isBlank(formState.bank_shiten_id)) errs.bank_shiten_id = REQUIRED_MSG;
  if (isBlank(formState.hikiotoshi_yokin_shubetsu))
    errs.hikiotoshi_yokin_shubetsu = REQUIRED_MSG;
  if (!formState.hikiotoshi_koza_no?.trim())
    errs.hikiotoshi_koza_no = REQUIRED_MSG;
  if (!formState.hikiotoshi_koza_meigi?.trim())
    errs.hikiotoshi_koza_meigi = REQUIRED_MSG;
}

/**
 * 備考(biko) の文字数上限 + 電子版/併読の行別上限 +
 * 読者属性(dokusyaso_bunrui) 必須チェック。
 */
function validateBikoAndDokusyaso(errs: Record<string, string>): void {
  // biko は購読種別を問わず同一ルール（500文字以内。顧客要件2026-08-26で
  // 電子版・併読の行別上限チェックは撤廃し紙版と統一）。
  if (formState.biko && formState.biko.length > BIKO_MAX) {
    errs.biko = BIKO_MSG;
  }
  // 電子版・併読は読者属性(dokusyaso_bunrui)を1つ以上選択（紙版は任意・顧客要件）。
  // email 必須と同じ電子版判定 (isDigitalOrBoth) を用いる。BE も同条件で再検証。
  if (isDigitalOrBoth.value && !formState.dokusyaso_bunrui?.trim()) {
    errs.dokusyaso_bunrui = REQUIRED_MSG;
  }
}

/**
 * 読者属性/農業者区分の「その他」自由記述 max-length。入力欄が出ている
 * 時だけ検証する（隠れている間の値は watch がクリア済み）。
 */
function validateSonotaLengths(errs: Record<string, string>): void {
  // maxlength 属性で打ち止めになるが、IME 確定やペースト経路で超過しうる
  // ので BE と同じ 255 をここでも見る。
  if (
    showDokusyasoSonota.value &&
    formState.dokusyaso_bunrui_sonota.length > BUNRUI_SONOTA_MAX
  ) {
    errs.dokusyaso_bunrui_sonota = DOKUSYASO_SONOTA_MSG;
  }
  if (
    showNogyosyaSonota.value &&
    formState.nogyosya_bunrui_sonota.length > BUNRUI_SONOTA_MAX
  ) {
    errs.nogyosya_bunrui_sonota = NOGYOSYA_SONOTA_MSG;
  }
}

/** 購読部数: 解約以外は1以上 + 電子版は1固定。 */
function validateBusu(errs: Record<string, string>): void {
  // 購読部数: 解約以外は 1 以上（解約 (手続種類=0) は §8 で 0 固定・readonly）。
  if (!isCancelTetsuzuki.value && Number(formState.dokusya_busu) <= 0) {
    errs.dokusya_busu = BUSU_MIN_MSG;
  }
  // 電子版は購読部数=1固定（解約以外）。入力欄は disabled だが、改竄や将来の
  // disable 漏れに備え BE と同じ検証を行う。
  if (
    isDigital.value &&
    !isCancelTetsuzuki.value &&
    Number(formState.dokusya_busu) !== 1
  ) {
    errs.dokusya_busu = DIGITAL_BUSU_MSG;
  }
}

/** 備考 max-length + 購読中止日必須 + 販売店適用日 past-date guard. */
function validateMisc(errs: Record<string, string>): void {
  validateBikoAndDokusyaso(errs);
  validateSonotaLengths(errs);
  validateBusu(errs);
  // 購読中止日（解約予約）の入力・検証は本フォームから撤去した（顧客要件 2026-07
  // 改訂）。停止は一覧の「購読を停止する」ポップアップ + 専用APIで行う。
  validateTekiyoDates(errs);
}

const slashDate = (d: string): string => d.replaceAll('-', '/');

/** validateTekiyoDates の共有派生値（各フィールド検証で参照）。 */
interface TekiyoCtx {
  /** 本日 (JST・YYYY-MM-DD)。 */
  todayIso: string;
  /** 購読開始日 (編集不可・下限参照)。 */
  kaishi: string;
  /** 実効解約予定日 (入力値 || ロード値。再購読時は null で上限無効)。 */
  effChushi: string | null;
}

/**
 * 情報変更適用日 (joho_henko_tekiyo_date) の検証 — 編集時必須。販売店を含む全変更の
 * 唯一の適用日（顧客要件 2026-07: 販売店適用日を廃止し joho に統一）。解約予定日のみ
 * 変更は joho=解約予定日 で自動的に妥当（解約予定日側で検証）なので追随中はスキップ。
 * 当日変更モード（電子版は常時・紙版は当日変更選択時）は joho=本日で BE が固定する
 * ため、未来日(> today)チェックはスキップする（joho は本日で正しい）。
 */
function validateJohoTekiyoDate(
  errs: Record<string, string>,
  ctx: TekiyoCtx,
): void {
  if (!isEdit.value || johoFollows.value || isTodayMode.value) return;
  const j = formState.joho_henko_tekiyo_date;
  if (!j?.trim()) {
    errs.joho_henko_tekiyo_date = REQUIRED_MSG;
  } else if (j <= ctx.todayIso) {
    errs.joho_henko_tekiyo_date = '情報変更適用日は本日より後の日付を指定してください。';
  } else if (ctx.kaishi && j < ctx.kaishi) {
    errs.joho_henko_tekiyo_date = `情報変更適用日は購読開始日（${slashDate(ctx.kaishi)}）以降の日付を指定してください。`;
  } else if (ctx.effChushi && j >= ctx.effChushi) {
    // 解約予定日は同日も不可（顧客要件2026-08）。
    errs.joho_henko_tekiyo_date = `情報変更適用日は解約予定日（${slashDate(ctx.effChushi)}）より前の日付を指定してください。`;
  }
}

/**
 * 情報変更適用日 (joho_henko_tekiyo_date) の必須・範囲検証。
 * BE(collectTekiyoDateViolations)と同一ルールを FE でも即時表示する（顧客要件
 * 2026-07 改訂、上限は2026-08改訂で同日不可に変更）:
 *   - 情報変更適用日(joho): 未来日のみ(> today) かつ 購読開始日 <= 値 < 解約予定日
 *     （解約予定日と同日は不可）。販売店・支払方法を含む全変更の唯一の適用日
 *     （販売店適用日は廃止し joho に統一）。
 * 上限の解約予定日はロード値（既存の解約予約）を参照する。購読中止日そのものの
 * 検証は本フォームから撤去した（停止は専用ポップアップ + API）。再購読(解約済み→
 * 新規)時は旧解約予定日を無効化する。
 */
function validateTekiyoDates(errs: Record<string, string>): void {
  const ctx: TekiyoCtx = {
    todayIso: todayIsoTokyo(),
    kaishi: formState.dokusya_kaishi_date,
    effChushi: isResubscribing.value
      ? null
      : formState.dokusya_chushi_date || originalChushiDate.value,
  };
  validateJohoTekiyoDate(errs, ctx);
}

// フォーム項目の DOM 出現順（テンプレート順）。submit で最初にエラーになった
// 項目へフォーカス・スクロールするために使う（`.claude/rules/vue.md §Auto-focus
// the first error on submit`）。バリデータはエラーを任意順で push するため、
// 表示順で先頭のエラー項目を決めるにはこの並びが必要。
const FIELD_ORDER: readonly string[] = [
  'dokusya_shubetsu',
  'tetsuzuki_shurui',
  'kanri_shiten_id',
  'shiten_id',
  'kumiaiin_code',
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'dokusya_busu',
  'tanka_id',
  'yubin_no',
  'todofuken_code',
  'shikuchoson',
  'chome_banchi',
  'tatemono_mei',
  'renrakusaki_1',
  'renrakusaki_2',
  'email',
  'birth_year',
  'haitatsu_yubin_no',
  'haitatsu_todofuken_code',
  'haitatsu_shikuchoson',
  'haitatsu_chome_banchi',
  'haitatsu_shimei_sei',
  'haitatsu_shimei_mei',
  'haitatsu_shimei_kana_sei',
  'haitatsu_shimei_kana_mei',
  'hanbaiten_id',
  'shiharai_hoho',
  'bank_shiten_id',
  'hikiotoshi_yokin_shubetsu',
  'hikiotoshi_koza_no',
  'hikiotoshi_koza_meigi',
  'dokusyaso_bunrui',
  'dokusyaso_bunrui_sonota',
  'nogyosya_bunrui',
  'nogyosya_bunrui_sonota',
  'dokusya_kaishi_date',
  'dokusya_chushi_date',
  'joho_henko_tekiyo_date',
  'biko',
];

function validateClient(): boolean {
  const errs: Record<string, string> = {};
  validateNameCluster(errs);
  validateAddressCluster(errs);
  validateFkDropdowns(errs);
  validateKaishiAndEmail(errs);
  validateHaitatsuCluster(errs);
  validateBankCluster(errs);
  validateMisc(errs);
  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

// ─── リクエストボディ構築 ──────────────────────────────────────────

function buildRequestBody(): CreateDokusyaRequest {
  return {
    kanri_shiten_id: formState.kanri_shiten_id,
    shiten_id: formState.shiten_id,
    kumiaiin_code: formState.kumiaiin_code,
    dokusya_shubetsu: formState.dokusya_shubetsu,
    tetsuzuki_shurui: formState.tetsuzuki_shurui,
    shimei_sei: formState.shimei_sei,
    shimei_mei: formState.shimei_mei,
    shimei_kana_sei: formState.shimei_kana_sei,
    shimei_kana_mei: formState.shimei_kana_mei,
    dokusya_busu: formState.dokusya_busu,
    yubin_no: formState.yubin_no,
    todofuken_code: formState.todofuken_code,
    shikuchoson: formState.shikuchoson,
    chome_banchi: formState.chome_banchi,
    tatemono_mei: formState.tatemono_mei,
    renrakusaki_1: formState.renrakusaki_1,
    renrakusaki_2: formState.renrakusaki_2,
    email: formState.email,
    mail_magazine_flg: formState.mail_magazine_flg,
    birth_year: formState.birth_year,
    gender: formState.gender,
    haitatsu_same_flg: formState.haitatsu_same_flg,
    haitatsu_yubin_no: formState.haitatsu_yubin_no,
    haitatsu_todofuken_code: formState.haitatsu_todofuken_code,
    haitatsu_shikuchoson: formState.haitatsu_shikuchoson,
    haitatsu_chome_banchi: formState.haitatsu_chome_banchi,
    haitatsu_tatemono_mei: formState.haitatsu_tatemono_mei,
    haitatsu_renrakusaki_1: formState.haitatsu_renrakusaki_1,
    haitatsu_renrakusaki_2: formState.haitatsu_renrakusaki_2,
    haitatsu_shimei_sei: formState.haitatsu_shimei_sei,
    haitatsu_shimei_mei: formState.haitatsu_shimei_mei,
    haitatsu_shimei_kana_sei: formState.haitatsu_shimei_kana_sei,
    haitatsu_shimei_kana_mei: formState.haitatsu_shimei_kana_mei,
    hanbaiten_id: Number(formState.hanbaiten_id ?? 0),
    tanka_id: Number(formState.tanka_id ?? 0),
    yubin_kubun: formState.yubin_kubun,
    shiharai_hoho: Number(formState.shiharai_hoho ?? 0),
    dokusyaryo_shiharai_cycle: formState.dokusyaryo_shiharai_cycle,
    bank_shiten_id: formState.bank_shiten_id,
    hikiotoshi_yokin_shubetsu: formState.hikiotoshi_yokin_shubetsu,
    hikiotoshi_koza_no: formState.hikiotoshi_koza_no,
    hikiotoshi_koza_meigi: formState.hikiotoshi_koza_meigi,
    dokusyaso_bunrui: formState.dokusyaso_bunrui,
    // 従属 4 項目 — 欄が隠れたタイミングで watch がクリア済みなので、そのまま
    // 送れば条件を外れた値は載らない。BE も同じゲートで再度落とす。
    ja_yakushokuin_flg: formState.ja_yakushokuin_flg,
    nogyo_kankei_flg: formState.nogyo_kankei_flg,
    dokusyaso_bunrui_sonota: formState.dokusyaso_bunrui_sonota,
    nogyosya_bunrui: formState.nogyosya_bunrui,
    nogyosya_bunrui_sonota: formState.nogyosya_bunrui_sonota,
    // 電子版 (create): 購読開始日はラジオで確定、購読中止日は
    // null (月末で終了)、請求開始月は送らない (空)。それ以外は従来通り
    // formState の値をそのまま送る。
    dokusya_kaishi_date: isDigitalCreate.value
      ? resolveKaishiDateDigitalCreate()
      : formState.dokusya_kaishi_date,
    dokusya_chushi_date: isDigitalCreate.value
      ? null
      : formState.dokusya_chushi_date,
    // 情報変更適用日は編集時にユーザー入力（未来日のみ）。販売店・支払方法を含む
    // 全変更の唯一の適用日（顧客要件 2026-07: 販売店適用日を廃止し joho に統一）。
    // 新規登録では null（UI 非表示）。販売店適用日(hanbaiten_tekiyo_date)は廃止（顧客要件2026-07）。
    joho_henko_tekiyo_date: formState.joho_henko_tekiyo_date,
    seikyu_kaishi_month: isDigitalCreate.value
      ? ''
      : formState.seikyu_kaishi_month,
    biko: formState.biko,
  };
}

// ─── サーバーエラー処理 ──────────────────────────────────────────

interface ServerErrorPayload {
  error_code?: string;
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

function handleServerError(err: unknown): void {
  const axiosErr = err as AxiosError<ServerErrorPayload>;
  const data = axiosErr?.response?.data;
  if (data?.error_code === 'DUPLICATE_EMAIL') {
    // ACSMS-MSG-011-009: このメールアドレスは既に登録されています。
    fieldErrors.value = { email: data.message ?? 'このメールアドレスは既に登録されています。' };
    focusFirstError(FIELD_ORDER, fieldErrors.value);
    return;
  }
  if (data && Array.isArray(data.errors) && data.errors.length > 0) {
    fieldErrors.value = Object.fromEntries(
      data.errors
        .filter(
          (e): e is { field: string; message: string } =>
            typeof e.field === 'string' && typeof e.message === 'string',
        )
        .map((e) => [e.field, e.message]),
    );
    focusFirstError(FIELD_ORDER, fieldErrors.value); // サーバ側検証エラーも先頭項目へフォーカス
  }
  // 500 / 一般的な 400 — global axios interceptor がトースト。view は留まる。
}

// ─── キャンペーン単価の注意喚起（顧客要件 2026-08） ──────────────────────
//
// 電子版の読者で以下いずれかが起きたとき、必ず日農担当者へ連絡するよう
// ポップアップで知らせる:
//   ①② 新聞単価の選択が campaign⇄通常 の境界をまたいだ瞬間
//        （新規作成で未選択→campaign を選ぶ／編集で campaign⇄通常へ切替、
//        どちらも「選択した瞬間」に出す。保存を待たない — 顧客要望 2026-08
//        改訂: 当初は保存成功後に出していたが、選んだ直後に気付けるよう
//        前倒しした）。
//   ②': 購読種別を「電子版でない」→「電子版」へ切替えた瞬間、既に campaign
//        単価が選択されていた場合（顧客要件 2026-08 追補 — 紙版のとき
//        campaign 単価を選んでも通知しないが、その後 電子版 へ切替えたら
//        通知する必要があるケース）。
//   ③ 承認/否認の時点でキャンペーン単価が選択されている
// ①②②' は購読種別・単価どちらの変更が引き金でも判定できるよう、両方を
// 1つの watch でまとめて見る（別々の watch にすると、購読種別と単価を
// 同時に代入するケース — 新規作成の fillForm 等 — で二重発火する）。
// ③ だけ別建てなのは、①②②' が拾えるのは「今回の編集セッションで値が
// 変わった瞬間」だけだから — 承認待ちに入った時点で既に campaign 単価が
// 入っていて今回は何も変更していない（=変化が発生しない）ケースを、
// 承認/否認ボタンを押した瞬間に別途チェックして拾う。

/**
 * 指定 tanka_id が campaign_flg=true の単価か。tankaOptions はこのフォームで
 * 選択可能な単価一覧（ユーザーが選んだ値は必ずここにある）。未選択(null)や
 * 一覧に無い値（ロード直後で未 fetch 等）は false 扱いにする。
 */
function isCampaignTanka(tankaId: number | null): boolean {
  if (tankaId == null) return false;
  const found = tankaOptions.value.find(
    (t) => t.tanka_id === Number(tankaId),
  );
  return found?.campaign_flg ?? false;
}

const CAMPAIGN_TANKA_NOTICE_LINE1 =
  '電子版のキャンペーン単価が登録・更新されています。必ず日本農業新聞担当者に連絡してください。';
const CAMPAIGN_TANKA_NOTICE_LINE2 =
  '連絡先：日本農業新聞企画統括部電子版グループ　03-6281-5807';

/**
 * キャンペーン単価の登録・切替を知らせるポップアップ。はい/いいえ の
 * Modal.confirm ではなく OK のみの Modal.warning を使う — ここで止める
 * 操作ではなく、必ず連絡してほしいという注意喚起だけなので。内容は2行固定文で
 * v-html は使わないため h() で組み立てる（本ファイル唯一の render 関数呼び出し）。
 */
function showCampaignTankaNotice(): void {
  Modal.warning({
    title: 'キャンペーン単価に関する処理',
    content: h('div', { class: 'text-left' }, [
      h('p', { class: 'mb-1' }, CAMPAIGN_TANKA_NOTICE_LINE1),
      h('p', CAMPAIGN_TANKA_NOTICE_LINE2),
    ]),
    okText: '確認',
  });
}

// ①②②': 購読種別 + 新聞単価 のペアが「電子版 かつ campaign⇄通常 の境界を
// またいだ瞬間」または「非電子版→電子版 に変わった瞬間、単価が既に
// campaign だった」ときに通知する。isHydrating 中（loadDetail /
// resetFormToLoaded 等が formState を一括代入している間）は「ユーザーが
// 選んだ」わけではないので無視する — 他の watch と同じガード。
watch(
  [() => formState.dokusya_shubetsu, () => formState.tanka_id],
  ([nextShubetsu, nextTanka], prev) => {
    if (isHydrating.value) return;
    const [prevShubetsu, prevTanka] = prev ?? [nextShubetsu, nextTanka];
    if (nextShubetsu === prevShubetsu && nextTanka === prevTanka) return;

    const nowDigital = Number(nextShubetsu) === DokusyaShubetsu.DIGITAL;
    const wasDigital = Number(prevShubetsu) === DokusyaShubetsu.DIGITAL;
    if (!nowDigital) return; // 対象は電子版のみ（顧客要件「電子版の…」）

    const nowCampaign = isCampaignTanka(nextTanka);
    const tankaCrossedWhileDigital =
      wasDigital && nowCampaign !== isCampaignTanka(prevTanka ?? null);
    const becameDigitalWithCampaignAlready = !wasDigital && nowCampaign;

    if (tankaCrossedWhileDigital || becameDigitalWithCampaignAlready) {
      showCampaignTankaNotice();
    }
  },
);

/**
 * ③: 承認/否認 ボタンを押した瞬間、選択中の単価が campaign なら通知する。
 * 上の watch と違い「変化したか」ではなく「今 campaign か」だけを見る —
 * 承認待ちに入った時点で既に campaign 単価が入っていて今回選び直していない
 * ケースも拾うため。isPending 自体が isDigital 前提（承認/否認ボタンは
 * isPending && canDenshi のときしか出ない）なので、ここでの isDigital
 * チェックは不要。
 */
function notifyIfCurrentTankaIsCampaign(): void {
  if (isCampaignTanka(formState.tanka_id)) showCampaignTankaNotice();
}

// ─── 送信パイプライン ────────────────────────────────────────────────

/**
 * 登録・更新時に氏名系8項目（購読者氏名 漢字/かな・配達先氏名 漢字/かな）の
 * 前後空白を除去する。バリデーション前に formState を直接書き換えるので、
 * 入力欄にもトリム結果が反映される（ペースト/IME確定の余分な空白対策）。
 */
function trimNameFields(): void {
  for (const f of NAME_FIELDS) {
    const v = formState[f];
    if (typeof v === 'string') formState[f] = v.trim();
  }
}

async function onSubmit(): Promise<void> {
  // 併読(3) / 電子版クレカ は編集不可 — 保存を弾く (BE も 403)。承認/否認は
  // 専用ボタン経由なのでここは更新パスのみガードする。
  if (isRecordReadOnly.value) return;
  // 編集で何も変更していない場合は更新（PUT・監査ログ・t_dokusya_rireki 履歴）を
  // スキップ。承認待ち(承認パス)は対象外。
  // trimNameFields() より前に判定すること — ロード値の氏名に前後空白がある
  // レコードで、トリムが formState を書き換えて「変更あり」と誤検知するのを防ぐ。
  if (
    isEdit.value &&
    dokusyaId.value !== null &&
    !isPending.value &&
    editGuard.isPristine()
  ) {
    message.info('変更がありません。');
    return;
  }
  // 氏名系8項目は登録・更新前に前後空白を除去（バリデーション前）。
  trimNameFields();
  if (!validateClient()) {
    focusFirstError(FIELD_ORDER, fieldErrors.value); // 最初のエラー項目へフォーカス
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (isEdit.value && dokusyaId.value !== null) {
      // Edit + 承認待ち → submit performs approve. Otherwise: regular update.
      if (isPending.value) {
        // 承認待ちは新聞単価 + 支払方法 + 引落口座4項目のみ編集可（#56524）→ 承認時に保存。
        await approveDokusya(dokusyaId.value, {
          tanka_id: formState.tanka_id ?? undefined,
          ...buildShoninEditBody(),
        });
        notify.success('承認しました。');
        notifyIfCurrentTankaIsCampaign();
      } else {
        // 購読中止日（解約予約）は本APIでは送らない（顧客要件 2026-07 改訂）。
        // 停止は専用エンドポイント stopDokusya（一覧の「購読を停止する」）で行う。
        // 送ると BE の @IsEmpty で 400 になるため、更新ボディから除外する。
        const updateBody: UpdateDokusyaRequest = {
          ...buildRequestBody(),
          // 情報変更モード（当日変更/予約変更）を BE へ送る。参照モードでは
          // submit ボタンが出ないため viewMode は 'today' | 'reserved'。
          change_mode: viewMode.value === 'today' ? 'today' : 'reserved',
        };
        delete (updateBody as { dokusya_chushi_date?: unknown })
          .dokusya_chushi_date;
        await updateDokusya(dokusyaId.value, updateBody);
        notify.updated();
        // キャンペーン単価の通知は選択した瞬間（上の watch）に既に出しているので
        // ここでは出さない。
      }
    } else {
      await createDokusya(buildRequestBody());
      notify.created();
      // 同上 — 選択した瞬間に通知済み。
    }
    await router.push({ name: 'DokusyaList' });
  } catch (err) {
    handleServerError(err);
  } finally {
    submitting.value = false;
  }
}

// ─── 承認 (機能定義 §3.x) ────────────────────────────────────────────
//
// onSubmit とは別 — jsdom が html-type=submit クリックをフォーム送信へ伝播
// しないため、専用の 承認・登録 ボタンクリック（form の @finish ではない）から
// 発火する。approveDokusya を直接呼び、成功トースト後に一覧へ遷移する。
async function onApproveClick(): Promise<void> {
  if (dokusyaId.value === null) return;
  // 承認画面で編集できる引落口座4項目も、通常編集と同じ条件必須を課す（#56524）。
  // 口座引落なのに項目を空にしたまま承認すると、BE は bank_shiten_id しか弾かない
  // ので残り3項目が空で確定してしまう。全項目チェックではなく口座クラスタだけを
  // 対象にする — 他項目は承認画面で編集できず、既存値に触れられないため。
  const kozaErrs: Record<string, string> = {};
  validateBankCluster(kozaErrs);
  if (Object.keys(kozaErrs).length > 0) {
    fieldErrors.value = kozaErrs;
    focusFirstError(FIELD_ORDER, kozaErrs);
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    // 承認待ちは新聞単価 + 支払方法 + 引落口座4項目のみ編集可（#56524）→ 承認時に保存。
    await approveDokusya(dokusyaId.value, {
      tanka_id: formState.tanka_id ?? undefined,
      ...buildShoninEditBody(),
    });
    notify.success('承認しました。');
    notifyIfCurrentTankaIsCampaign();
    await router.push({ name: 'DokusyaList' });
  } catch (err) {
    handleServerError(err);
  } finally {
    submitting.value = false;
  }
}

/**
 * 承認/否認 時に送る編集項目（支払方法 + 引落口座4項目・#56524）。承認待ち画面
 * ではこの5項目と新聞単価だけが編集可能なので、フォームの現在値をそのまま載せる。
 * 空欄は BE 側 DTO が blank→undefined に寄せるため送っても変更扱いにならない。
 */
function buildShoninEditBody(): DenshiShoninEditBody {
  return {
    shiharai_hoho: formState.shiharai_hoho ?? undefined,
    bank_shiten_id: formState.bank_shiten_id ?? undefined,
    hikiotoshi_yokin_shubetsu: formState.hikiotoshi_yokin_shubetsu ?? undefined,
    hikiotoshi_koza_no: formState.hikiotoshi_koza_no,
    hikiotoshi_koza_meigi: formState.hikiotoshi_koza_meigi,
  };
}

// ─── 単価初回登録 (denshi_shonin_status=NULL 専用・不具合修正2026-08) ─────
//
// 承認/否認ワークフロー自体が存在しないカテゴリ（電子版クレカ・併読・電子版
// 無料会員）は tanka_id=null のまま電子版から同期される（電子版同期は
// 「単価は承認画面で登録する」前提のため、このカテゴリだけ承認が発生せず
// 永久に単価が付かなくなってしまう）。isTankaRegistrationPending 中だけ表示
// する専用ボタン — 選択した単価のみを確定する。denshi_shonin_status は
// 変更しない・電子版へは push しない（registerTankaDokusya は approveDokusya
// と別エンドポイント）。
async function onRegisterTankaClick(): Promise<void> {
  if (dokusyaId.value === null) return;
  if (formState.tanka_id == null) {
    fieldErrors.value = { tanka_id: REQUIRED_MSG };
    focusFirstError(FIELD_ORDER, fieldErrors.value);
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await registerTankaDokusya(dokusyaId.value, { tanka_id: formState.tanka_id });
    notify.created();
    await router.push({ name: 'DokusyaList' });
  } catch (err) {
    handleServerError(err);
  } finally {
    submitting.value = false;
  }
}

// ─── 否認 (機能定義 §4.x) ────────────────────────────────────────────

function onClickReject(): void {
  if (dokusyaId.value === null) return;
  // ACSMS-MSG-011-014.
  Modal.confirm({
    title: '否認確認',
    content: '電子版読者の登録を否認します。よろしいですか？',
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    onOk: async () => {
      try {
        // 否認時も編集された支払方法・引落口座4項目を保存する（#56524）。
        await rejectDokusya(dokusyaId.value as number, buildShoninEditBody());
        notify.success('否認しました。');
        notifyIfCurrentTankaIsCampaign();
        await router.push({ name: 'DokusyaList' });
      } catch {
        // global interceptor がトースト。view は留まる。
      }
    },
  });
}

// ─── 戻る ────────────────────────────────────────────────────────────

function goBack(): void {
  void router.push({ name: 'DokusyaList' });
}

// ─── 履歴情報画面 (ACSMS-SCR-013) への遷移 ───────────────────────────
// 編集時のみ — 対象購読者の dokusya_id が必要。フル履歴一覧
// (ページネーション + 全カラム) を別画面で表示する。画面上部の
// 「履歴表示」ブロックは ACSMS-SCR-011 の簡易インライン履歴で別物。
function goRireki(): void {
  if (dokusyaId.value === null) return;
  void router.push({ name: 'DokusyaRireki', params: { id: dokusyaId.value } });
}

// ─── m_code ヘルパー（Group B — ラベルは実行時編集可能） ──────────

const dokusyaShubetsuOptions = computed(() => codes.options('DOKUSYA_SHUBETSU'));
const tetsuzukiShuruiOptions = computed(() => codes.options('TETSUZUKI_SHURUI'));
const shiharaiHohoOptions = computed<
  Array<{ value: number; label: string; disabled?: boolean }>
>(() => {
  const all = codes
    .options('SHIHARAI_HOHO')
    .map((o) => ({ value: Number(o.value), label: o.label }));
  // 電子版 (dokusya_shubetsu=2) では クレジットカード (6) を本画面で手入力させない。
  // クレカは電子版読者管理システム連携専用のため。
  // - 新規: 連携値を持ち得ない新規レコードなので選択肢から除外する。
  // - 編集: 連携経由で既に クレカ を保持している既存レコードがあり得るため、
  //   選択肢からは外さず disabled にする。現在値の表示は保たれ、かつ
  //   ユーザーが新たに クレカ を選び直すことはできない。
  if (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL) {
    if (isEdit.value) {
      return all.map((o) =>
        o.value === ShiharaiHoho.CREDIT_CARD ? { ...o, disabled: true } : o,
      );
    }
    return all.filter((o) => o.value !== ShiharaiHoho.CREDIT_CARD);
  }
  return all;
});

// 新規作成で 購読種別 を 電子版 に切替えた際、選択不可になった 支払方法
//（クレジットカードのみ除外）を落とし、無効な選択が残らないようにする。
watch(
  () => formState.dokusya_shubetsu,
  () => {
    if (
      !isEdit.value &&
      Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
      Number(formState.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD
    ) {
      formState.shiharai_hoho = null;
    }
    // バグ報告2026-08: 電子版は配達先情報エリアが非活性化される（isDigitalOnly
    // の v-if・§7.5）。紙版/併読で入力した値を残したまま種別だけ電子版へ
    // 切替えて送信すると、隠れた欄に古い配達先データが乗って送られてしまう
    // ため、切替時点でクリアする。haitatsu_same_flg も中立値(true)へ戻す
    // （BE の buildHaitatsuPayload と同じ既定値・entity の DB default と同値）。
    // BE 側でも同じ制約を独立にゲートするため、これは UX 目的のみ。
    if (
      !isEdit.value &&
      Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL
    ) {
      formState.haitatsu_same_flg = true;
      clearHaitatsuFields();
    }
    // 購読種別を切り替えた結果、選択中の管理支店が取扱いフラグ条件から外れた
    // 場合はクリアする（顧客要件2026-07）。管理支店クリアは既存 watcher で
    // 支店(shiten_id)も連鎖クリアする。編集時（非活性）・所属支店固定・
    // ハイドレート中は触らない。
    if (
      isEdit.value ||
      isShitenPinned.value ||
      isHydrating.value ||
      formState.kanri_shiten_id == null
    ) {
      return;
    }
    const stillValid = filteredKanriShitenOptions.value.some(
      (k) => Number(k.kanri_shiten_id) === Number(formState.kanri_shiten_id),
    );
    if (!stillValid) formState.kanri_shiten_id = null;
  },
);
const yubinKubunOptions = computed(() => codes.options('YUBIN_KUBUN'));
const genderOptions = computed(() => codes.options('GENDER'));
const mailMagazineOptions = computed(() => codes.options('MAIL_MAGAZINE_FLG'));
// 表示専用（編集モード・非活性）。ラベルは m_code 由来のため、顧客が 有料/無料 を
// 改称しても FE 再デプロイなしで反映される。
const denshiDokusyaShubetsuOptions = computed(() =>
  codes.options('DENSHI_DOKUSYA_SHUBETSU'),
);
const yokinShubetsuOptions = computed(() => codes.options('YOKIN_SHUBETSU'));

// ─── ライフサイクル ──────────────────────────────────────────────────────

/** 全フィールド + 編集専用の表示状態を新規作成モードの初期値へ戻す。 */
function resetFormState(): void {
  Object.assign(formState, defaultFormState());
  fieldErrors.value = {};
  detailRireki.value = null;
  detailDenshiShoninStatus.value = null;
  detailDenshiDokusyaShubetsu.value = null;
  detailHonshiKodokuFlg.value = false;
  detailDenshiKaiinId.value = null;
  originalTankaId.value = null;
}

/**
 * 現在のルートから作成 / 編集モードを適用する。必ず先にフォームをリセットし、
 * edit→create（や edit-id→別 edit-id）遷移で前レコードのデータが漏れないようにする。
 */
async function applyRouteMode(): Promise<void> {
  resetFormState();
  if (isEdit.value && dokusyaId.value !== null) {
    await loadDetail(dokusyaId.value);
    // 現在紐づく販売店（既に廃店でも）を include_id でピンして取得する。
    await fetchHanbaitenOptions(formState.hanbaiten_id ?? undefined);
    // 参照→編集フロー: 紙版・電子版とも最初は「参照」モードで開き、モードバーから
    // 編集モードを選ばせる（UI 統一）。電子版で選べるのは当日変更のみ。
    // 適用日=本日 は selectMode('today') 側で確定させる（そこで editGuard の基準も
    // 取り直すので、モードに入っただけでは dirty にならない）。
    viewMode.value = 'reference';
    // ロード（＋ハイドレート中 watcher・電子版の当日適用日）が確定した状態を基準に控える。
    await editGuard.capture();
    // 読者情報変更適用日の編集可否判定用に、適用日を除いた基準も控える。
    // 基準値(適用日)は infoChangeGuard.capture より先に確定させる — capture で
    // otherInfoChanged が true→false に変わり watcher が発火するため、その時点で
    // johoHenkoBaseline が null だと適用日が null に戻ってしまう。
    johoHenkoBaseline.value = formState.joho_henko_tekiyo_date;
    await infoChangeGuard.capture();
    // モード切替リセット用に読込直後の formState をスナップショット。
    loadedFormSnapshot.value = { ...formState };
  } else {
    // 新規: 営業中(haiten_flg=false)の販売店のみ取得する。
    await fetchHanbaitenOptions();
    // 制限③ — 所属支店固定アカウントは購読者の管理支店/支店をアカウントの
    // 所属支店に強制ピンする（画面上も非活性化・BE も同値をピン）。
    // isHydrating で kanri_shiten_id watcher（shiten_id をクリアする）を
    // 抑止しないと、同一 tick 内の kanri_shiten_id 代入により shiten_id が
    // null に巻き戻される。
    if (isShitenPinned.value) {
      isHydrating.value = true;
      formState.kanri_shiten_id = pinnedKanriShitenId.value;
      formState.shiten_id = pinnedShitenId.value;
      void Promise.resolve().then(() => {
        isHydrating.value = false;
      });
    }
    if (!canPaper.value && canDenshi.value) {
      // 新規 — このアカウントが使える唯一の 購読種別 を既定選択し、既定ラジオが
      // 非活性オプションにならないようにする。紙版のみ/両方は既定 紙版(1)、電子版
      // のみは 電子版(2) に切替、フラグ無しは既定のまま submit ボタンは非活性
      //（account_concept §139-145）。
      formState.dokusya_shubetsu = DokusyaShubetsu.DIGITAL;
    }
  }
}

onMounted(() => {
  // ドロップダウン取得を並列展開 — 相互依存はない。
  // 都道府県は <BaseTodofukenSelect> が自分で読む（共有キャッシュ）。
  void fetchKanriShitenOptions();
  void fetchShitenOptions();
  void fetchTankaOptions();
  // 販売店ドロップダウンは applyRouteMode 内で取得する（編集時は loadDetail で
  // 確定した hanbaiten_id を include_id ピンに渡すため順序依存）。
  void applyRouteMode();
});

// [route-reuse] create（/dokusya/create）と edit（/dokusya/:id/edit）が共に
// DokusyaFormView に解決するため、vue-router はこのコンポーネントインスタンスを
// 再利用する — メニューから edit→create したとき onMounted は再実行されない。
// ここで route モードを再適用しないと、作成フォームが編集レコードのデータを
// 表示し続ける（報告済みバグ）。:id セグメント変化のたびに再初期化する。
watch(dokusyaId, () => {
  void applyRouteMode();
});

// スペックの fillForm ヘルパー用に state を公開。
defineExpose({
  formState,
  fieldErrors,
  viewMode,
  selectMode,
  canSelectMode,
  reservedJohoModalOpen,
  reservedJohoInput,
  reservedJohoError,
  confirmReservedJoho,
  editReservedJoho,
});
</script>

<template>
  <div class="space-y-6">
    <!-- 情報変更モードバー（顧客要件2026-07・参照→編集フロー）。a-form の外に
         置くことで、参照モードで form 全体が disabled でもボタンは押せる。
         紙版・電子版とも表示する（UI 統一）。電子版は「予約変更」を disabled にして
         当日変更のみに絞る — 隠さないのは、紙版との違いを画面上で伝えるため。 -->
    <div
      v-if="isEdit && showModeBar"
      data-test="dokusya-mode-bar"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4 flex items-center flex-wrap justify-between gap-4"
    >
      <div class="text-sm">
        <template v-if="isReferenceMode">
          <span class="font-bold text-text-main">参照モード</span>
          <span class="text-text-description ml-2">閲覧のみです。編集するにはモードを選択してください。</span>
          <span
            v-if="!canUseReservedMode"
            data-test="dokusya-reserved-disabled-note"
            class="text-text-description ml-2"
          >
            電子版は当日変更のみです（予約変更は使用できません）。
          </span>
        </template>
        <template v-else-if="isTodayMode">
          <span class="font-bold text-primary">当日変更モード</span>
          <span class="text-text-description ml-2" data-test="today-joho-display">
            適用日: {{ slashDate(formState.joho_henko_tekiyo_date ?? '') }}
          </span>
        </template>
        <template v-else>
          <span class="font-bold text-primary">予約変更モード</span>
          <template v-if="formState.joho_henko_tekiyo_date">
            <span class="text-text-description ml-2" data-test="reserved-joho-display">
              適用日: {{ slashDate(formState.joho_henko_tekiyo_date) }}
            </span>
            <a-button
              type="link"
              size="small"
              class="!p-0 !h-auto ml-1 align-baseline"
              data-test="edit-reserved-joho-btn"
              aria-label="適用日を変更"
              @click="editReservedJoho"
            >
              <span class="material-icons text-sm align-middle mr-0.5" aria-hidden="true">edit</span>変更
            </a-button>
          </template>
          <span v-else class="text-text-description ml-2">適用日（未来日）を指定してください。</span>
        </template>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <a-button
          type="primary"
          :ghost="!isTodayMode"
          data-test="mode-today"
          @click="selectMode('today')"
        >
          当日変更
        </a-button>
        <a-button
          type="primary"
          :ghost="!isReservedMode"
          :disabled="!canUseReservedMode"
          data-test="mode-reserved"
          @click="selectMode('reserved')"
        >
          予約変更
        </a-button>
      </div>
    </div>

    <!-- 予約変更 適用日ポップアップ (B案) — 適用日(未来日)を確定してから
         その時点で有効な履歴行(predecessor)をフォームへロードする。 -->
    <a-modal
      :open="reservedJohoModalOpen"
      title="予約変更 — 情報変更適用日"
      :confirm-loading="reservedJohoLoading"
      ok-text="次へ"
      cancel-text="キャンセル"
      data-test="reserved-joho-modal"
      @ok="confirmReservedJoho"
      @cancel="reservedJohoModalOpen = false"
    >
      <p class="text-text-description text-sm mb-3">
        変更を適用する未来日を指定してください。指定日時点で有効な内容を読み込みます。
      </p>
      <!-- `name` が無いと antd は id を生成しないので、<label for> の宛先も
           入力側の id も両方欠ける。ここで明示的に結び付ける。 -->
      <a-form-item
        html-for="reserved-joho-input"
        :validate-status="reservedJohoError ? 'error' : ''"
        :help="reservedJohoError"
      >
        <template #label>
          <span>情報変更適用日</span>
          <span class="text-error ml-1">*</span>
        </template>
        <a-date-picker
          id="reserved-joho-input"
          v-model:value="reservedJohoInput"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="YYYY/MM/DD"
          class="w-full"
          data-test="reserved-joho-input"
          :disabled-date="isTodayOrPastDayTokyo"
        />
      </a-form-item>
    </a-modal>

    <!-- 参照（読取専用）モードでは antd の disabled 既定色だと値がほぼ読めない。
         `readonly-legible` は文字色だけ通常色へ戻す（背景のグレー・not-allowed
         カーソルはそのまま）ので「読めるが編集できない」が一目で伝わる。 -->
    <a-form
      layout="vertical"
      :model="formState"
      :disabled="readOnlyForm"
      class="space-y-6"
      :class="{ 'readonly-legible': readOnlyForm }"
      data-test="dokusya-form"
      @keydown="preventEnterImplicitSubmit"
      @finish="onSubmit"
    >
      <!-- ─── Section 1: 一般情報 ──────────────────────────────────
        Layout mirrors `docs/design/ACSMS-SCR-011/index.html` exactly:
          Row 1 (4 cols): 購読種別 / 手続種類 / 電子版読者種別 / ID
          Row 2 (4 cols): 管理支店 / 支店 / 組合員コード / 履歴No
          Row 3 (4 cols, col1 + col2 are 2-col subgrids):
            ┌─ 氏名_氏 + 氏名_名 ─┐  ┌─ かな_氏 + かな_名 ─┐  部数  単価
        電子版読者種別 と ID は編集モード専用 (画面項目定義 No.3 / No.4).
      -->
      <section class="bg-surface-card border border-border rounded-ant p-4 @md:p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">一般情報</h3>

        <div class="space-y-6">
          <!-- Row 1: 購読種別 / 手続種類 / 電子版読者種別 / ID ─────────
               2列化のしきい値が @3xl(768px) なのはサイドバーの開閉をまたぐため:
                 サイドバー展開 → コンテナ 1024-288-64 = 672px → 1列（1項目1行）
                 サイドバー格納 → コンテナ 1024-0-64  = 960px → 2列（各1/2）
               672 < 768 <= 960 なので、この1つのしきい値で両方の見え方になる。

               4列化は @7xl(1280px) 以上（顧客要望 2026-08）。この行はラジオの
               選択肢が長く、紙版・電子版・併読の3件を折り返さず並べるのに実測
               290px 要る（ラジオ余白を詰めた後の値）。4列で 290px を確保するには
               290×4 + gap 16×3 = 1208px 必要なので、@6xl(1152px) では足りず
               @7xl から。

               電子版読者種別 と ID は編集モード専用だが、列数は編集/新規で
               変えない。新規作成では左半分に 購読種別・手続種類 が各 1/4 で並び
               右半分が空くが、これは編集モードと同じ桁位置に揃えるためで意図的
               （顧客要望 2026-08）。 -->
          <div class="grid grid-cols-1 @3xl:grid-cols-2 @7xl:grid-cols-4 gap-4">
            <a-form-item
              name="dokusya_shubetsu"
              :validate-status="fieldErrors.dokusya_shubetsu ? 'error' : ''"
              :help="fieldErrors.dokusya_shubetsu"
            >
              
              <!--
                画面項目定義 No.1 — 「※併読はJAユーザー選択不可」.
                併読 (value=3) は紙版 + 電子版の両方を購読している
                状態を指し、業務上は CREATE では発生せず、紙→電子
                or 電子→紙への変換時にしか付与されない。よって
                新規作成モードでは 併読 を disabled にする。
                編集モードでは 購読種別 自体が変更不可（紙↔電子↔併読
                の変換は専用フローの業務操作）。グループ全体を disabled
                にし、BE も update 時に既存値へ pin する（UI は UX、
                BE が実際の境界 — security.md Layer 3 同様）。
              -->
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>購読種別</span>
                  <span class="text-error ml-1">*</span>
                </legend>
                <!-- 選択肢3件をスマホ幅でも1行に収める（顧客要望 2026-08）。
                     antd は各ラベルに padding-inline 8px、各ラッパーに
                     margin-inline-end 8px を入れるため、素のままだと
                     「紙版 / 電子版 / 併読（紙版＋電子版）」で ≈322px 必要になり、
                     スマホ（コンテナ358px - セクション p-4 = 326px）に対して
                     ぎりぎり入らず 併読 だけ2行目へ落ちていた。
                     余白を 4px へ詰めると ≈290px となり収まる。
                     antd の CSS-in-JS は unlayered で Tailwind の utilities より
                     強いため `!` が要る（.claude/rules/vue.md §a11y の脚注と同じ理由）。 -->
                <div class="flex items-center flex-wrap min-h-8">
                  <a-radio-group
                    class="min-w-0 [&_.ant-radio-wrapper]:!me-1 [&_.ant-radio+span]:!px-1"
                    name="dokusya_shubetsu"
                    v-model:value="formState.dokusya_shubetsu"
                    :disabled="isEdit"
                  >
                    <a-radio
                      v-for="opt in dokusyaShubetsuOptions"
                      :key="opt.value"
                      :value="Number(opt.value)"
                      :disabled="
                        !isEdit &&
                        (Number(opt.value) === DokusyaShubetsu.BOTH ||
                          !isShubetsuAllowed(Number(opt.value)))
                      "
                    >
                      {{ opt.label }}
                    </a-radio>
                  </a-radio-group>
                </div>
              </fieldset>
            </a-form-item>

            <a-form-item
              name="tetsuzuki_shurui"
              :validate-status="fieldErrors.tetsuzuki_shurui ? 'error' : ''"
              :help="fieldErrors.tetsuzuki_shurui"
            >
              
              <!--
                編集画面では原則 手続種類を変更不可（作成時に確定。顧客要件）。
                例外: 再加入可（canResubscribe = 解約済みの 紙版 / 電子版(非クレカ)）
                のときのみ編集可にする。
                新規作成では解約(0)を選択不可（解約は既存購読者に対する更新操作。
                BE も create() で同値を VALIDATION_ERROR で弾く）。
              -->
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>手続種類</span>
                  <span class="text-error ml-1">*</span>
                </legend>
                <div class="flex items-center flex-wrap min-h-8">
                  <a-radio-group
                    class="min-w-0"
                    name="tetsuzuki_shurui"
                    v-model:value="formState.tetsuzuki_shurui"
                    :disabled="isEdit && !canResubscribe"
                  >
                    <a-radio
                      v-for="opt in tetsuzukiShuruiOptions"
                      :key="opt.value"
                      :value="Number(opt.value)"
                      :disabled="!isEdit && Number(opt.value) === TetsuzukiShurui.KAIYAKU"
                    >
                      {{ opt.label }}
                    </a-radio>
                  </a-radio-group>
                </div>
              </fieldset>
            </a-form-item>

            <!--
              画面項目定義 No.3 — 電子版読者種別 は編集モード専用かつ
              入力不可 (電子版読者管理システムからの連携結果を表示).
              新規作成モードでは非表示。
            -->
            <a-form-item
              v-if="isEdit"
              name="denshi_dokusya_shubetsu"
            >
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>電子版読者種別</span>
                </legend>
                <div class="flex items-center flex-wrap min-h-8">
                  <a-radio-group
                    class="min-w-0"
                    name="denshi_dokusya_shubetsu"
                    :value="detailDenshiDokusyaShubetsu"
                    disabled
                  >
                    <a-radio
                      v-for="opt in denshiDokusyaShubetsuOptions"
                      :key="opt.value"
                      :value="Number(opt.value)"
                    >
                      {{ opt.label }}
                    </a-radio>
                  </a-radio-group>
                </div>
              </fieldset>
            </a-form-item>

            <!--
              画面項目定義 No.4 — ID (dokusya_rireki_id 自動採番) は
              編集モード専用で読取専用。
            -->
            <a-form-item v-if="isEdit" name="dokusya_rireki_id">
              <template #label><span>ID</span></template>
              <a-input :value="detailIdLabel" disabled />
            </a-form-item>
          </div>

          <!-- Row 2: 管理支店 / 支店 / 組合員コード / 履歴No ───────── -->
          <div class="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4">
            <a-form-item
              name="kanri_shiten_id"
              :validate-status="fieldErrors.kanri_shiten_id ? 'error' : ''"
              :help="fieldErrors.kanri_shiten_id"
            >
              <template #label>
                <span>管理支店</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!-- 管理支店は作成時に確定し編集では変更不可（グレーアウト・顧客要件）。
                   所属支店固定アカウント(制限③)も作成時からピン・非活性化。 -->
              <a-select
                v-model:value="formState.kanri_shiten_id"
                :options="filteredKanriShitenOptions.map((k) => ({ value: k.kanri_shiten_id, label: k.kanri_shiten_name }))"
                placeholder="選択してください"
                allow-clear
                show-search
                option-filter-prop="label"
                :disabled="isEdit || isShitenPinned"
              />
            </a-form-item>

            <a-form-item
              name="shiten_id"
              :validate-status="fieldErrors.shiten_id ? 'error' : ''"
              :help="fieldErrors.shiten_id"
            >
              <template #label>
                <span>支店</span>
              </template>
              <a-select
                v-model:value="formState.shiten_id"
                :options="filteredShitenOptions.map((s) => ({ value: s.shiten_id, label: s.shiten_name }))"
                :disabled="formState.kanri_shiten_id == null || isShitenPinned || readOnlyForm"
                :placeholder="formState.kanri_shiten_id == null ? '管理支店を先に選択してください' : '選択してください'"
                allow-clear
                show-search
                option-filter-prop="label"
              />
            </a-form-item>

            <a-form-item
              name="kumiaiin_code"
              :validate-status="fieldErrors.kumiaiin_code ? 'error' : ''"
              :help="fieldErrors.kumiaiin_code"
            >
              <template #label><span>組合員コード</span></template>
              <a-input
                v-model:value="formState.kumiaiin_code"
                :maxlength="10"
              />
            </a-form-item>

            <!-- 履歴No (edit only) + 履歴表示 button.
                 ACSMS-SCR-013 — 履歴表示 は購読者履歴情報画面 (フル履歴
                 一覧) へ遷移する。 -->
            <a-form-item v-if="isEdit" name="rireki_no">
              <template #label><span>履歴No</span></template>
              <div class="flex gap-2 items-center">
                <a-input :value="String(detailRireki ?? '')" disabled class="flex-1 min-w-0" />
                <button
                  type="button"
                  class="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded text-sm whitespace-nowrap"
                  @click="goRireki"
                >
                  履歴表示
                </button>
              </div>
            </a-form-item>
          </div>

          <!-- Row 3: 購読者氏名(subgrid) / 購読者かな(subgrid)。
               2列化は @4xl(896px) から — 各列がさらに 氏+名 の2列サブグリッドを
               持つため、外側が2列になった時点で1行に入力欄が4つ並ぶ。@lg(512px)
               で2列にすると 1欄 ≈155px しかなく氏名が読めない。それ未満では
               漢字グループ / かなグループ を1行ずつに分ける。 -->
          <div class="grid grid-cols-1 @4xl:grid-cols-2 gap-4">
            <!-- Col 1 — 購読者氏名 (氏 + 名 サブグリッド)。
                 氏+名 は本来ペアで横に並べたいが、スマホ幅では
                 コンテナ ≈358px → 1セル ≈150px しかなく、
                 「購読者氏名_氏」(7文字) のラベルに対して入力欄が狭すぎる。
                 @md(448px) 未満は 1 項目 1 行へ落とす（顧客要望 2026-08）。 -->
            <div class="grid grid-cols-1 @md:grid-cols-2 gap-2">
              <a-form-item
                name="shimei_sei"
                :validate-status="fieldErrors.shimei_sei ? 'error' : ''"
                :help="fieldErrors.shimei_sei"
              >
                <template #label>
                  <span>購読者氏名_氏</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.shimei_sei" :maxlength="50" />
              </a-form-item>

              <a-form-item
                name="shimei_mei"
                :validate-status="fieldErrors.shimei_mei ? 'error' : ''"
                :help="fieldErrors.shimei_mei"
              >
                <template #label>
                  <span>購読者氏名_名</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.shimei_mei" :maxlength="50" />
              </a-form-item>
            </div>

            <!-- Col 2 — 購読者かな (氏 + 名 サブグリッド) -->
            <div class="grid grid-cols-1 @md:grid-cols-2 gap-2">
              <a-form-item
                name="shimei_kana_sei"
                :validate-status="fieldErrors.shimei_kana_sei ? 'error' : ''"
                :help="fieldErrors.shimei_kana_sei"
              >
                <template #label>
                  <span>購読者かな_氏</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.shimei_kana_sei" :maxlength="100" />
              </a-form-item>

              <a-form-item
                name="shimei_kana_mei"
                :validate-status="fieldErrors.shimei_kana_mei ? 'error' : ''"
                :help="fieldErrors.shimei_kana_mei"
              >
                <template #label>
                  <span>購読者かな_名</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.shimei_kana_mei" :maxlength="100" />
              </a-form-item>
            </div>
          </div>

          <!-- Row 4: 購読部数 / 新聞単価 -->
          <div class="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4">
            <!-- Col 1 — 購読部数 -->
            <a-form-item
              name="dokusya_busu"
              :validate-status="fieldErrors.dokusya_busu ? 'error' : ''"
              :help="fieldErrors.dokusya_busu"
            >
              <template #label>
                <span>購読部数</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!-- 電子版は購読部数=1固定 → 入力不可（新規=1強制 / 編集=不変）。
                   解約は readonly（0固定）。紙版・併読は編集可。 -->
              <a-input-number
                v-model:value="formState.dokusya_busu"
                :min="isCancelTetsuzuki ? 0 : 1"
                :readonly="isCancelTetsuzuki"
                :disabled="isDigital || reportFieldDisabled"
                class="w-full"
              />
            </a-form-item>

            <!-- Col 2 — 新聞単価 -->
            <a-form-item
              name="tanka_id"
              :validate-status="fieldErrors.tanka_id ? 'error' : ''"
              :help="fieldErrors.tanka_id"
            >
              <template #label>
                <span>新聞単価</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!-- ラベル = 単価名 + 半角スペース + 金額（¥表記・顧客要件）。金額は
                   BE がログイン中 JA の税区分 (zei_kubun=1→税込 / =2→税抜) で解決
                   した `kingaku` を用いる。 -->
              <!-- 承認待ち(電子版)・単価初回登録待ち(不具合修正2026-08)はいずれも
                   単価のみ編集可 → formLocked（両者を含まない）を用い、他項目が
                   ロックされる中でも単価だけ操作可能にする。 -->
              <a-select
                v-model:value="formState.tanka_id"
                :options="tankaOptions.map((t) => ({ value: t.tanka_id, label: `${t.tanka_name} ${formatYen(t.kingaku)}` }))"
                placeholder="選択してください"
                allow-clear
                :disabled="formLocked"
              />
            </a-form-item>
          </div>
        </div>
      </section>

      <!-- ─── Section 2: 購読者情報 ──────────────────────────────── -->
      <section class="bg-surface-card border border-border rounded-ant p-4 @md:p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読者情報</h3>

        <div class="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4">
          <a-form-item
            name="yubin_no"
            :validate-status="fieldErrors.yubin_no ? 'error' : ''"
            :help="fieldErrors.yubin_no"
          >
            <template #label>
              <span>郵便番号</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              autocomplete="off"
              v-model:value="formState.yubin_no"
              :maxlength="7"
              :disabled="reportFieldDisabled"
            />
          </a-form-item>

          <a-form-item
            name="todofuken_code"
            :validate-status="fieldErrors.todofuken_code ? 'error' : ''"
            :help="fieldErrors.todofuken_code"
          >
            <template #label>
              <span>都道府県</span>
              <span class="text-error ml-1">*</span>
            </template>
            <BaseTodofukenSelect
              v-model:value="formState.todofuken_code"
              placeholder="選択してください"
              :disabled="reportFieldDisabled"
            />
          </a-form-item>

          <a-form-item
            name="shikuchoson"
            :validate-status="fieldErrors.shikuchoson ? 'error' : ''"
            :help="fieldErrors.shikuchoson"
          >
            <template #label>
              <span>市町村郡</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.shikuchoson" :maxlength="100" :disabled="reportFieldDisabled" />
          </a-form-item>

          <a-form-item
            name="chome_banchi"
            :validate-status="fieldErrors.chome_banchi ? 'error' : ''"
            :help="fieldErrors.chome_banchi"
          >
            <template #label>
              <span>丁目番地</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.chome_banchi" :maxlength="100" :disabled="reportFieldDisabled" />
          </a-form-item>
        </div>

        <a-form-item
          name="tatemono_mei"
          :validate-status="fieldErrors.tatemono_mei ? 'error' : ''"
          :help="fieldErrors.tatemono_mei"
        >
          <template #label><span>マンション・アパート名</span></template>
          <a-input v-model:value="formState.tatemono_mei" :maxlength="100" :disabled="reportFieldDisabled" />
        </a-form-item>

        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          <a-form-item
            name="renrakusaki_1"
            :validate-status="fieldErrors.renrakusaki_1 ? 'error' : ''"
            :help="fieldErrors.renrakusaki_1"
          >
            <template #label>
              <span>TEL1</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.renrakusaki_1" :maxlength="15" />
          </a-form-item>

          <a-form-item
            name="renrakusaki_2"
            :validate-status="fieldErrors.renrakusaki_2 ? 'error' : ''"
            :help="fieldErrors.renrakusaki_2"
          >
            <template #label><span>TEL2</span></template>
            <a-input v-model:value="formState.renrakusaki_2" :maxlength="15" />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          <a-form-item
            name="email"
            :validate-status="fieldErrors.email ? 'error' : ''"
            :help="fieldErrors.email"
          >
            <template #label>
              <span>メールアドレス</span>
              <span v-if="isDigitalOrBoth" class="text-error ml-1">*</span>
            </template>
            <a-input
              autocomplete="off"
              v-model:value="formState.email"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item
            name="birth_year"
            :validate-status="fieldErrors.birth_year ? 'error' : ''"
            :help="fieldErrors.birth_year"
          >
            <template #label><span>生年（西暦）</span></template>
            <a-input-number
              v-model:value="formState.birth_year"
              :min="1900"
              :max="2100"
              class="w-full"
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          <a-form-item
            name="mail_magazine_flg"
          >
            
            <!-- 電子版用項目 — 紙版指定時はグレーアウト（顧客要件）。 -->
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>メールマガジン</span>
              </legend>
              <div class="flex items-center flex-wrap min-h-8">
                <a-radio-group
                  class="min-w-0"
                  name="mail_magazine_flg"
                  v-model:value="formState.mail_magazine_flg"
                  :disabled="isPaper"
                >
                  <a-radio
                    v-for="opt in mailMagazineOptions"
                    :key="opt.value"
                    :value="Number(opt.value)"
                  >
                    {{ opt.label }}
                  </a-radio>
                </a-radio-group>
              </div>
            </fieldset>
          </a-form-item>

          <a-form-item
            name="gender"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>性別</span>
              </legend>
              <div class="flex items-center flex-wrap min-h-8">
                <a-radio-group
                  class="min-w-0"
                  name="gender"
                  v-model:value="formState.gender"
                >
                  <a-radio
                    v-for="opt in genderOptions"
                    :key="opt.value"
                    :value="Number(opt.value)"
                  >
                    {{ opt.label }}
                  </a-radio>
                </a-radio-group>
              </div>
            </fieldset>
          </a-form-item>
        </div>
      </section>

      <!-- ─── Section 3: 配達先情報 ──────────────────────────────────
        Layout 完全一致 `docs/design/ACSMS-SCR-011/index.html` §配達先情報:
          Row 1 (4 cols): 郵便番号 / 都道府県 / 市町村郡 / 丁目番地
          Row 2 (full):   マンション・アパート名
          Row 3 (2 cols): TEL1 / TEL2
          Row 4 (2 cols, each is 2-col subgrid):
            ┌─ 配達先苗字漢字 + 配達先名前漢字 ─┐  ┌─ 配達先苗字かな + 配達先名前かな ─┐

        Visibility (機能定義 §7.5 + §9.x):
          - 電子版 (isDigitalOnly): セクション全体を `v-if` で消す。配達が
            無いので配達先を持たない。
          - 併読: 紙も届くので表示する（顧客要件 2026-08）。読者同期が
            paper_* 由来の配達先を入れているため、隠すと同期済みの住所を
            画面で確認・修正できない。
          - 紙版/併読 + 購読者情報と同じ チェック時: 入力ブロックのみ消す。
            ヘッダー (title + checkbox) はそのまま残す → ユーザーが
            チェックを外したくなったときに UI が消えてしまわない。
            opacity ではなく `v-show` で完全に隠す (index.html の
            `hidden-field` クラス挙動と一致).
      -->
      <section
        v-if="!isDigitalOnly"
        class="bg-surface-card border border-border rounded-ant p-6"
      >
        <div class="flex justify-between items-start pb-4 mb-6 border-b border-border">
          <h3 class="text-lg font-bold">配達先情報</h3>
          <!-- ネイティブ checkbox は form-level :disabled の対象外なので明示的に
               ロックする（解約ロック中 / 読取専用レコード）。 -->
          <label
            class="flex items-center gap-2 text-sm"
            :class="
              isRecordReadOnly || isCancelledLocked
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer'
            "
          >
            <input
              name="haitatsu_same_flg"
              type="checkbox"
              v-model="formState.haitatsu_same_flg"
              :disabled="isRecordReadOnly || isCancelledLocked"
              class="rounded accent-primary"
            />
            <span class="text-primary">購読者情報と同じ</span>
          </label>
        </div>

        <!--
          入力ブロック。checkbox が ON のときは丸ごと非表示
          (index.html の `hidden-field` 同等). `v-show` を使うので
          watch が走らせた `clearDeliveryFields` の結果は state に残る。
        -->
        <div v-show="!formState.haitatsu_same_flg" class="space-y-4">
          <!-- Row 1: 4-col 住所 -->
          <div class="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4">
            <a-form-item
              name="haitatsu_yubin_no"
              :validate-status="fieldErrors.haitatsu_yubin_no ? 'error' : ''"
              :help="fieldErrors.haitatsu_yubin_no"
            >
              <template #label>
                <span>郵便番号</span>
                <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
              </template>
              <a-input
                autocomplete="off"
                v-model:value="formState.haitatsu_yubin_no"
                :maxlength="7"
                :disabled="reportFieldDisabled"
              />
            </a-form-item>

            <a-form-item
              name="haitatsu_todofuken_code"
              :validate-status="fieldErrors.haitatsu_todofuken_code ? 'error' : ''"
              :help="fieldErrors.haitatsu_todofuken_code"
            >
              <template #label>
                <span>都道府県</span>
                <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
              </template>
              <BaseTodofukenSelect
                v-model:value="formState.haitatsu_todofuken_code"
                placeholder="選択してください"
                :disabled="reportFieldDisabled"
              />
            </a-form-item>

            <a-form-item
              name="haitatsu_shikuchoson"
              :validate-status="fieldErrors.haitatsu_shikuchoson ? 'error' : ''"
              :help="fieldErrors.haitatsu_shikuchoson"
            >
              <template #label>
                <span>市町村郡</span>
                <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
              </template>
              <a-input v-model:value="formState.haitatsu_shikuchoson" :maxlength="100" :disabled="reportFieldDisabled" />
            </a-form-item>

            <a-form-item
              name="haitatsu_chome_banchi"
              :validate-status="fieldErrors.haitatsu_chome_banchi ? 'error' : ''"
              :help="fieldErrors.haitatsu_chome_banchi"
            >
              <template #label>
                <span>丁目番地</span>
                <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
              </template>
              <a-input v-model:value="formState.haitatsu_chome_banchi" :maxlength="100" :disabled="reportFieldDisabled" />
            </a-form-item>
          </div>

          <!-- Row 2: full マンション・アパート名 -->
          <a-form-item name="haitatsu_tatemono_mei">
            <template #label><span>マンション・アパート名</span></template>
            <a-input
              v-model:value="formState.haitatsu_tatemono_mei"
              :maxlength="100"
              :disabled="reportFieldDisabled"
            />
          </a-form-item>

          <!-- Row 3: 2-col TEL -->
          <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
            <a-form-item
              name="haitatsu_renrakusaki_1"
              :validate-status="fieldErrors.haitatsu_renrakusaki_1 ? 'error' : ''"
              :help="fieldErrors.haitatsu_renrakusaki_1"
            >
              <template #label><span>TEL1</span></template>
              <a-input v-model:value="formState.haitatsu_renrakusaki_1" :maxlength="15" />
            </a-form-item>

            <a-form-item
              name="haitatsu_renrakusaki_2"
              :validate-status="fieldErrors.haitatsu_renrakusaki_2 ? 'error' : ''"
              :help="fieldErrors.haitatsu_renrakusaki_2"
            >
              <template #label><span>TEL2</span></template>
              <a-input v-model:value="formState.haitatsu_renrakusaki_2" :maxlength="15" />
            </a-form-item>
          </div>

          <!-- Row 4: 2-col with subgrid 配達先氏名。Row 3（購読者氏名）と同じく
               列内が 2列サブグリッドなので、2列化は @4xl から。 -->
          <div class="grid grid-cols-1 @4xl:grid-cols-2 gap-4">
            <!-- Col 1 — 漢字 group -->
            <div class="grid grid-cols-1 @md:grid-cols-2 gap-2">
              <a-form-item
                name="haitatsu_shimei_sei"
                :validate-status="fieldErrors.haitatsu_shimei_sei ? 'error' : ''"
                :help="fieldErrors.haitatsu_shimei_sei"
              >
                <template #label>
                  <span>配達先苗字</span>
                  <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.haitatsu_shimei_sei" :maxlength="50" />
              </a-form-item>

              <a-form-item
                name="haitatsu_shimei_mei"
                :validate-status="fieldErrors.haitatsu_shimei_mei ? 'error' : ''"
                :help="fieldErrors.haitatsu_shimei_mei"
              >
                <template #label>
                  <span>配達先名前</span>
                  <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.haitatsu_shimei_mei" :maxlength="50" />
              </a-form-item>
            </div>

            <!-- Col 2 — かな group -->
            <div class="grid grid-cols-1 @md:grid-cols-2 gap-2">
              <a-form-item
                name="haitatsu_shimei_kana_sei"
                :validate-status="fieldErrors.haitatsu_shimei_kana_sei ? 'error' : ''"
                :help="fieldErrors.haitatsu_shimei_kana_sei"
              >
                <template #label>
                  <span>配達先苗字（かな）</span>
                  <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.haitatsu_shimei_kana_sei" :maxlength="100" />
              </a-form-item>

              <a-form-item
                name="haitatsu_shimei_kana_mei"
                :validate-status="fieldErrors.haitatsu_shimei_kana_mei ? 'error' : ''"
                :help="fieldErrors.haitatsu_shimei_kana_mei"
              >
                <template #label>
                  <span>配達先名前(かな)</span>
                  <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.haitatsu_shimei_kana_mei" :maxlength="100" />
              </a-form-item>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── Section 4: 販売店・支払方法 ──────────────────────── -->
      <section class="bg-surface-card border border-border rounded-ant p-4 @md:p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">販売店・支払方法</h3>

        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-4">
          <a-form-item
            name="hanbaiten_id"
            :validate-status="fieldErrors.hanbaiten_id ? 'error' : ''"
            :help="fieldErrors.hanbaiten_id"
          >
            <template #label>
              <span>販売店コード</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.hanbaiten_id"
              :options="hanbaitenOptions.map((h) => ({ value: h.hanbaiten_id, label: h.hanbaiten_code }))"
              placeholder="選択してください"
              allow-clear
              :disabled="reportFieldDisabled"
            />
          </a-form-item>

          <!-- 表示専用（フォーム部品が無い）項目。<label> は必ず 1 つの部品を
               指すものなので、見出しは素の <span> で描画する。寸法は antd の
               ラベル欄と同じ 22px + 8px。 -->
          <a-form-item name="hanbaiten_name">
            <span class="form-item-title block h-[22px] leading-[22px] mb-2 text-sm text-text-main">
              販売店名
            </span>
            <!--
              機能定義 §6.2 — 販売店コード選択後に販売店名を表示。
              `<a-input :value="hanbaitenName" disabled>` で出すと値が
              `<input>` の `value` 属性に入り `wrapper.text()` には現れない
              ため、テスト側で `expect(wrapper.text()).toContain('山田販売店')`
              が失敗する。代わりに `<span>` でレンダリングして DOM テキスト
              の一部として可視化する。
            -->
            <span
              class="block py-1 px-2 text-text-main bg-surface-disabled rounded-ant border border-border"
              data-test="hanbaiten-name"
            >
              {{ hanbaitenName || '—' }}
            </span>
          </a-form-item>
          <!-- 販売店適用日は廃止（顧客要件 2026-07）。販売店変更の適用日は
               読者情報変更適用日(joho)に統一（下部の項目で入力・1更新1レコード）。 -->
        </div>

        <!-- Row 2: 郵送区分 / 支払方法 / 購読料支払サイクル (with ヶ月 suffix) -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-4 mt-2">
          <a-form-item name="yubin_kubun">
            <template #label><span>郵送区分</span></template>
            <a-select
              v-model:value="formState.yubin_kubun"
              :options="yubinKubunOptions.map((o) => ({ value: String(o.value), label: o.label }))"
              placeholder="選択してください"
              allow-clear
            />
          </a-form-item>

          <a-form-item
            name="shiharai_hoho"
            :validate-status="fieldErrors.shiharai_hoho ? 'error' : ''"
            :help="fieldErrors.shiharai_hoho"
          >
            <template #label>
              <span>支払方法</span>
              <span class="text-error ml-1">*</span>
            </template>
            <!-- 承認待ち(電子版)でも支払方法は編集可（#56524）。口座引落へ切り替えた
                 場合は下の引落口座4項目が必須になる（validateBankCluster）。 -->
            <a-select
              v-model:value="formState.shiharai_hoho"
              :options="shiharaiHohoOptions"
              placeholder="選択してください"
              allow-clear
              :disabled="formLocked || isTankaRegistrationPending"
            />
          </a-form-item>

          <a-form-item name="dokusyaryo_shiharai_cycle">
            <template #label><span>購読料支払サイクル</span></template>
            <div class="flex items-center gap-2">
              <a-input-number
                v-model:value="formState.dokusyaryo_shiharai_cycle"
                :min="0"
                :max="99"
                class="flex-1 min-w-0"
              />
              <span class="text-sm whitespace-nowrap text-text-description">ヶ月</span>
            </div>
          </a-form-item>
        </div>

        <!--
          Row 3: 引落口座支店 + 引落元口座店舗コード/名 (自動表示・読取専用)
          画面項目定義 No.44-46 — 「引落口座支店」を選択すると BE が
          m_shiten を reverse-lookup し、jastem_toriatsukai_tenpo_code
          と jastem_tenpo_name を返す。FE はドロップダウンに含まれる
          オプション側にこれら値を保持しているため、選択 ID を computed
          で引いて 2 つの読取専用 input にバインドする。
        -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-4 mt-2">
          <a-form-item
            name="bank_shiten_id"
            :validate-status="fieldErrors.bank_shiten_id ? 'error' : ''"
            :help="fieldErrors.bank_shiten_id"
          >
            <template #label>
              <span>引落口座支店</span>
              <span v-if="Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI" class="text-error ml-1">*</span>
            </template>
            <!-- 承認待ち(電子版)でも引落口座4項目は編集可（#56524）→ 承認待ちを
                 含まない formLocked を用い、他項目がロックされる中でも操作可能にする。
                 単価初回登録待ちでは単価以外編集不可なので isTankaRegistrationPending
                 を OR してロックする。 -->
            <a-select
              v-model:value="formState.bank_shiten_id"
              :options="kinyuShitenOptions.map((s) => ({ value: s.shiten_id, label: s.shiten_name }))"
              placeholder="選択してください"
              allow-clear
              show-search
              option-filter-prop="label"
              :disabled="formLocked || isTankaRegistrationPending"
            />
          </a-form-item>

          <a-form-item name="jastem_toriatsukai_tenpo_code">
            <template #label><span>引落元口座店舗コード</span></template>
            <a-input :value="jastemTenpoCode" disabled />
          </a-form-item>

          <a-form-item name="jastem_tenpo_name">
            <template #label><span>引落元口座店舗名</span></template>
            <a-input :value="jastemTenpoName" disabled />
          </a-form-item>
        </div>

        <!-- Row 4: 銀行口座情報 (貯金種目 / 口座番号 / 名義) — ユーザー入力 -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-4 mt-2">
          <a-form-item
            name="hikiotoshi_yokin_shubetsu"
            :validate-status="fieldErrors.hikiotoshi_yokin_shubetsu ? 'error' : ''"
            :help="fieldErrors.hikiotoshi_yokin_shubetsu"
          >
            <template #label>
              <span>引落口座貯金種目</span>
              <span v-if="Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI" class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.hikiotoshi_yokin_shubetsu"
              :options="yokinShubetsuOptions.map((o) => ({ value: Number(o.value), label: o.label }))"
              placeholder="選択してください"
              allow-clear
              :disabled="formLocked || isTankaRegistrationPending"
            />
          </a-form-item>

          <a-form-item
            name="hikiotoshi_koza_no"
            :validate-status="fieldErrors.hikiotoshi_koza_no ? 'error' : ''"
            :help="fieldErrors.hikiotoshi_koza_no"
          >
            <template #label>
              <span>引落口座番号</span>
              <span v-if="Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.hikiotoshi_koza_no"
              :maxlength="10"
              :disabled="formLocked || isTankaRegistrationPending"
            />
          </a-form-item>

          <a-form-item
            name="hikiotoshi_koza_meigi"
            :validate-status="fieldErrors.hikiotoshi_koza_meigi ? 'error' : ''"
            :help="fieldErrors.hikiotoshi_koza_meigi"
          >
            <template #label>
              <span>引落口座名義</span>
              <span v-if="Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.hikiotoshi_koza_meigi"
              :maxlength="50"
              :disabled="formLocked || isTankaRegistrationPending"
            />
          </a-form-item>
        </div>
      </section>

      <!-- ─── Section 5: 購読者層分類 (機能定義 §11.x + 画面項目定義 No.50-51) -->
      <section class="bg-surface-card border border-border rounded-ant p-4 @md:p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読者層分類</h3>

        <div class="space-y-6">
          <!--
            読者属性 — 購読種別を問わず単一選択(ラジオ)。CSV で
            dokusyaso_bunrui に保存する点は従来どおり。

            従属項目が出るとき（電子版/併読のみ）は行を 2 カラムに分け、左に
            読者属性・右に従属項目を置く。従属項目は選択肢が排他なので同時に
            出るのは 1 つだけ。紙版は従属項目が無いので 1 カラムのまま
            全幅で表示する（空の右カラムのために選択肢を狭めない）。
          -->
          <div
            class="grid grid-cols-1 gap-4"
            :class="{ '@lg:grid-cols-2': hasDokusyasoDependent }"
            data-test="dokusyaso-bunrui-row"
          >
            <a-form-item
              name="dokusyaso_bunrui"
              :validate-status="fieldErrors.dokusyaso_bunrui ? 'error' : ''"
              :help="fieldErrors.dokusyaso_bunrui"
            >
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>読者属性</span>
                  <span v-if="isDigitalOrBoth" class="text-error ml-1">*</span>
                </legend>
                <!-- 狭幅は縦積み（flex-col）、@3xl(768px) 以上は横並び。
                     選択肢5件を横一列に並べるには実測 ≈506px 要る。狭幅
                     （特に従属項目が出て2カラムになり幅が半分になるとき）は
                     「農業者 / JAグループ役職員」「企業・団体 / 学生」「その他」と
                     2件・2件・1件で不揃いに折り返り、どこまでが1件か読み取り
                     にくかった。そこで狭いうちは1行1件に統一する。
                     幅が足りる大画面では下の 主な生産物 と同じ横並びに戻す
                     （顧客要望 2026-08）。横並び時も flex-wrap なので、
                     2カラム時など足りない場合は折り返して破綻しない。 -->
                <div class="flex items-start flex-wrap min-h-8">
                  <a-radio-group
                    name="dokusyaSoBunruiSingle"
                    v-model:value="dokusyaSoBunruiSingle"
                    :options="dokusyaSoBunruiOptions"
                    class="min-w-0 flex flex-col gap-y-2 @3xl:flex-row @3xl:flex-wrap @3xl:gap-x-6"
                  />
                </div>
              </fieldset>
            </a-form-item>

            <!--
              読者属性=農業者。電子版 profession_and_ja(0/1) と 1:1。
              チェックボックス自体が「かつJAグループ役職員」と名乗るのでラベルは
              重複になる。ただし枠だけは残す — 消すとラベル 1 行分せり上がり、
              左のラジオと高さが揃わない。読み上げには出さない。

              高さ合わせが要るのは 2 カラムに並ぶ @lg 以上だけ。1 カラムの
              狭幅では上下に積むので、空ラベルはただの余白になってしまう
              （顧客指摘 2026-08）。

              消すのは span ではなく antd のラベル行そのもの。span を
              display:none にしても antd が出す .ant-form-item-label
              （label 22px + padding-bottom 8px）は残り、余白は変わらない。
              antd の CSS-in-JS は unlayered で Tailwind より強いので ! が要る。
            -->
            <a-form-item
              v-if="showJaYakushokuin"
              name="ja_yakushokuin_flg"
              class="[&_.ant-form-item-label]:!hidden @lg:[&_.ant-form-item-label]:!block"
            >
              <template #label>
                <span aria-hidden="true" class="invisible">かつJAグループ役職員</span>
              </template>
              <a-checkbox name="ja_yakushokuin_flg"
                v-model:checked="formState.ja_yakushokuin_flg"
                data-test="ja-yakushokuin-flg"
              >
                かつJAグループ役職員
              </a-checkbox>
            </a-form-item>

            <!-- 読者属性=企業・団体。電子版 profession_and_agri(0/1) と 1:1。 -->
            <a-form-item
              v-if="showNogyoKankei"
              name="nogyo_kankei_flg"
              class="[&_.ant-form-item-label]:!hidden @lg:[&_.ant-form-item-label]:!block"
            >
              <template #label>
                <span aria-hidden="true" class="invisible">農業関係</span>
              </template>
              <a-checkbox name="nogyo_kankei_flg"
                v-model:checked="formState.nogyo_kankei_flg"
                data-test="nogyo-kankei-flg"
              >
                農業関係
              </a-checkbox>
            </a-form-item>

            <!-- 読者属性=その他。電子版 others_profession(255文字以下) と 1:1。 -->
            <a-form-item
              v-if="showDokusyasoSonota"
              name="dokusyaso_bunrui_sonota"
              :validate-status="
                fieldErrors.dokusyaso_bunrui_sonota ? 'error' : ''
              "
              :help="fieldErrors.dokusyaso_bunrui_sonota"
            >
              <template #label><span>読者属性（その他の内容）</span></template>
              <a-input
                v-model:value="formState.dokusyaso_bunrui_sonota"
                :maxlength="BUNRUI_SONOTA_MAX"
                data-test="dokusyaso-bunrui-sonota"
              />
            </a-form-item>
          </div>

          <!--
            機能定義 §11 — 「農業者」を選択した場合のみ「主な生産物」を表示
            する。未チェック・解除時は nogyosya_bunrui を clear (watch側で)。
            こちらは複数選択のままなのでチェックボックス。
            読者属性の行と同じく、左に選択肢・右に「その他」の自由記述。
          -->
          <div
            v-if="hasNogyosha"
            class="grid grid-cols-1 gap-4"
            :class="{ '@lg:grid-cols-2': showNogyosyaSonota }"
            data-test="nogyosya-bunrui-row"
          >
            <a-form-item
              name="nogyosya_bunrui"
              :validate-status="fieldErrors.nogyosya_bunrui ? 'error' : ''"
              :help="fieldErrors.nogyosya_bunrui"
            >
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>主な生産物（農業者の場合）</span>
                </legend>
                <div class="flex items-center flex-wrap min-h-8">
                  <a-checkbox-group
                    name="nogyosyaBunruiArr"
                    v-model:value="nogyosyaBunruiArr"
                    :options="nogyosyaBunruiOptions"
                    class="min-w-0 flex flex-wrap gap-x-6 gap-y-2"
                  />
                </div>
              </fieldset>
            </a-form-item>

            <!-- 「その他」を含むときだけ。電子版 others_products(255文字以下) と 1:1。 -->
            <a-form-item
              v-if="showNogyosyaSonota"
              name="nogyosya_bunrui_sonota"
              :validate-status="
                fieldErrors.nogyosya_bunrui_sonota ? 'error' : ''
              "
              :help="fieldErrors.nogyosya_bunrui_sonota"
            >
              <template #label
                ><span>主な生産物（その他の内容）</span></template
              >
              <a-input
                v-model:value="formState.nogyosya_bunrui_sonota"
                :maxlength="BUNRUI_SONOTA_MAX"
                data-test="nogyosya-bunrui-sonota"
              />
            </a-form-item>
          </div>
        </div>
      </section>

      <!-- ─── Section 6: 購読開始日・中止日 + 備考 ─────────────────
        Layout follows `index.html §購読開始日、中止日`:
          Row 1 (2 cols): 購読開始日 / 購読中止日
          Row 2 (2 cols, left only): 請求開始月 (電子版/併読時のみ表示・読取専用)
          備考 (full width textarea)

        日付入力はプロジェクト規約 (vue.md §HTML5 input types) に従い
        `<input type="date">` は使わず `<a-date-picker>` + value-format
        にしている。`joho_henko_tekiyo_date` (画面項目定義 No.54) は
        index.html mockup には未収録だが業務的に必要な未来日設定項目
        なので別行で残す (任意入力, 未来日チェックは validateClient
        側で実施).
      -->
      <section class="bg-surface-card border border-border rounded-ant p-4 @md:p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読日</h3>

        <div class="space-y-4">
          <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
            <a-form-item
              name="dokusya_kaishi_date"
              :validate-status="fieldErrors.dokusya_kaishi_date ? 'error' : ''"
              :help="fieldErrors.dokusya_kaishi_date"
            >
              
              <!--
                電子版 (create) はラジオ「今日/翌月1日」で指定し、
                実際の保存値は buildRequestBody で確定する。それ以外は
                a-date-picker（作成時のみ入力可、編集モードは読取専用）。
              -->
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>購読開始日</span>
                  <span class="text-error ml-1">*</span>
                </legend>
                <div class="flex items-center flex-wrap min-h-8">
                  <a-radio-group
                    class="min-w-0"
                    name="kaishiDateMode"
                    v-if="isDigitalCreate"
                    v-model:value="kaishiDateMode"
                  >
                    <a-radio value="today">今日から</a-radio>
                    <a-radio value="next_month_first">翌月1日から</a-radio>
                  </a-radio-group>
                  <!-- v-else の相手はラジオなので、両分岐とも fieldset の中に置く
                       （legend はどちらが描画されてもこの項目の名前になる）。 -->
                  <div v-else class="flex items-center gap-2 w-full">
                    <a-date-picker
                      v-model:value="formState.dokusya_kaishi_date"
                      format="YYYY/MM/DD"
                      value-format="YYYY-MM-DD"
                      placeholder="YYYY/MM/DD"
                      :disabled="isEdit && !isResubscribing"
                      :disabled-date="disabledKaishiDate"
                      class="flex-1 min-w-0"
                    />
                    <span class="text-text-main whitespace-nowrap">から</span>
                  </div>
                </div>
              </fieldset>
            </a-form-item>

            <!-- 購読中止日は編集モードで、かつ中止日(値)がある場合のみ表示。
                 新規作成は中止日を持たない（=null・入力不可）ためフォームから撤去。
                 編集でも中止日が null（未解約・再購読で null に戻った等）なら項目ごと
                 非表示にする（顧客要件 2026-07 改訂）。停止（解約予約）は一覧画面の
                 「購読を停止する」で行う。 -->
            <a-form-item
              v-if="isEdit && !!formState.dokusya_chushi_date"
              name="dokusya_chushi_date"
              :validate-status="fieldErrors.dokusya_chushi_date ? 'error' : ''"
              :help="fieldErrors.dokusya_chushi_date"
            >
              <template #label>
                <span>購読中止日</span>
                <span v-if="isCancelTetsuzuki" class="text-error ml-1">*</span>
              </template>
              <!-- 購読中止日はどの分岐でも入力不可（disabled）。中止＝解約予約は
                   一覧画面(ACSMS-SCR-014)の「購読を停止する」ボタンで行うため、本フォーム
                   では現在の解約予定日を表示するのみ（顧客要件 2026-07）。
                ① 電子版 (create): 空欄で「月末で終了」を placeholder 表示。
                   submit は null (値があれば YYYY/MM 表示)。
                ② 電子版+クレカ / 併読 (update): 月 YYYY/MM を表示し suffix に
                   「月末で終了」。formState の元値はそのまま保持・送信。
                ③ それ以外: a-date-picker(disabled)。
              -->
              <a-input
                v-if="isDigitalCreate"
                :value="chushiMonthDisplay"
                disabled
                placeholder="月末で終了"
                class="w-full"
              />
              <div
                v-else-if="chushiReadonlyMonthEdit"
                class="flex items-center gap-2"
              >
                <a-input :value="chushiMonthDisplay" disabled class="flex-1 min-w-0" />
                <span class="text-text-description text-sm whitespace-nowrap">月末で終了</span>
              </div>
              <!-- 購読中止日は読取専用（顧客要件 2026-07 改訂）。停止（解約予約）は
                   一覧画面(ACSMS-SCR-014)の「購読を停止する」ボタン → ポップアップで行う。
                   本フォームでは現在の解約予定日を表示するのみ（編集不可）。
                   disabled-date は残すが disabled のため実質無効。 -->
              <a-date-picker
                v-else
                v-model:value="formState.dokusya_chushi_date"
                format="YYYY/MM/DD"
                value-format="YYYY-MM-DD"
                placeholder="YYYY/MM/DD"
                class="w-full"
                disabled
                :disabled-date="disabledChushiDate"
              />
              <p
                v-if="isEdit && !hasActiveKaiyaku"
                class="text-text-description text-xs mt-1"
                data-test="chushi-stop-hint"
              >
                購読の停止は一覧画面の「購読を停止する」から行ってください。
              </p>
            </a-form-item>
          </div>

          <!-- 読者情報変更適用日 と 請求開始月 は 1 つのグリッドに入れて
               横に並べる（顧客要望 2026-08）。以前はそれぞれ別の 2 列グリッドに
               入っており、各項目が自分の行の左半分だけを使って右半分が空いたまま
               縦に並んでいた。表示条件が違う（適用日=編集時のみ、
               請求開始月=電子版/併読のみ）ので v-if は各 a-form-item 側へ移し、
               両方とも出ないときだけ外側を消す（空の div が space-y-6 の
               余白を作らないようにする）。
               並び順は 適用日（左）→ 請求開始月（右）。 -->
          <div
            v-if="(isDigitalOrBoth && !isDigitalCreate) || isEdit"
            class="grid grid-cols-1 @lg:grid-cols-2 gap-4"
          >
            <a-form-item
              v-if="isEdit"
              name="joho_henko_tekiyo_date"
              :validate-status="fieldErrors.joho_henko_tekiyo_date ? 'error' : ''"
              :help="fieldErrors.joho_henko_tekiyo_date"
            >
              <template #label>
                <span>読者情報変更適用日</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!-- 適用日以外の項目に変更があるときだけ編集可（顧客要件 2026-06）。
                   単独変更で履歴を作らせない。再購読中は購読開始日へ追随して disabled
                   （顧客要件 2026-07）。 -->
              <a-date-picker
                v-model:value="formState.joho_henko_tekiyo_date"
                format="YYYY/MM/DD"
                value-format="YYYY-MM-DD"
                placeholder="YYYY/MM/DD"
                class="w-full"
                :disabled="!johoEditable || isPending || isDenshiRejected"
                :disabled-date="isTodayOrPastDayTokyo"
              />
            </a-form-item>

            <!--
              画面項目定義 No.55 — 請求開始月 (seikyu_kaishi_month) は
              電子版/併読の場合のみ表示, 読取専用 (電子版読者管理
              システム決定後の値を受信して表示). ただし create の
              電子版 create では非表示 (顧客要件)。
            -->
            <a-form-item
              v-if="isDigitalOrBoth && !isDigitalCreate"
              name="seikyu_kaishi_month"
            >
              <template #label><span>請求開始月</span></template>
              <!--
                update: YYYYMM を YYYY/MM に整形して読取専用表示 (電子版読者
                管理システムが決定した値を受信)。create: 未確定なので raw 値 +
                「(電子版システムが決定)」placeholder のまま (従来ロジック)。
                どちらも :value バインドのみで formState は変更しない。
              -->
              <div class="flex items-center gap-2">
                <a-input
                  :value="isEdit ? seikyuMonthDisplay : formState.seikyu_kaishi_month"
                  disabled
                  placeholder="(電子版システムが決定)"
                  class="flex-1 min-w-0"
                />
                <span class="text-text-main whitespace-nowrap">から</span>
              </div>
            </a-form-item>
          </div>

          <!-- 紙版購読状況（顧客要件 2026-08）— 備考の直前。
               電子版の承認待ちで、電子版読者管理システム連携の
               本紙購読フラグが立っている読者にだけ出す注記。入力項目ではなく
               読取専用の表示なので a-form-item ではなく素のブロックで置く。 -->
          <p
            v-if="showHonshiKodokuHint"
            class="text-sm font-medium text-text-main"
            data-test="honshi-kodoku-hint"
          >
            紙版購読状況　有り
          </p>

          <a-form-item
            label="備考"
            name="biko"
            :validate-status="fieldErrors.biko ? 'error' : ''"
            :help="fieldErrors.biko"
          >
            <a-textarea v-model:value="formState.biko" :rows="6" :maxlength="500" show-count />
          </a-form-item>
        </div>
      </section>

      <!-- ─── アクションボタン ───────────────────────────────────────
        ボタン表示ルール（機能定義 §3.x §4.1 + 画面項目定義 No.58-62）:
          - プライマリ — 状態でラベル切替:
               isPending (edit + status=0) → 承認・登録 (approveDokusya)
               isEdit && !isPending        → 更新     (updateDokusya)
               !isEdit                     → 登録     (createDokusya)
          - 承認しない — denshi_shonin_status = 0 (承認待ち) の時のみ
            表示。NULL/1/2 では非表示 (機能定義 §4.1).
          - 前の画面に戻る — 常時表示。

        index.html mockup は 3 ボタンを並べているが、これは「edit +
        status=0」状態を例示しているもので、それ以外の状態では spec
        通り 2 ボタン構成になる。
      -->
      <!-- 承認/否認 は電子版ワークフロー → denshi_flg 必須 (§143). flag が
           無い場合は v-else の更新ボタンが出るが shubetsuPermitted=false で
           非活性となり、実質読み取り専用になる（権限が無い購読種別は
           登録/更新ボタンを非活性にするのみで、警告文は出さない）。 -->
      <div class="flex flex-wrap justify-start gap-2 pt-4">
          <!-- 明示 :disabled を持たせ、a-form の disabled コンテキスト（承認待ちは
               readOnlyForm=true）に飲まれてボタンが無効化されるのを防ぐ。 -->
          <a-button
            v-if="isPending && canDenshi"
            type="primary"
            :loading="submitting"
            :disabled="submitting"
            @click="onApproveClick"
          >
            承認・登録
          </a-button>

          <!-- 単価初回登録待ち（不具合修正2026-08）— 承認/否認ワークフロー自体が
               存在しないカテゴリ（電子版クレカ・併読・電子版無料会員）の単価だけを
               確定する。denshi_shonin_status は変えない・電子版へは push しない。 -->
          <a-button
            v-else-if="isTankaRegistrationPending && canDenshi"
            type="primary"
            :loading="submitting"
            :disabled="submitting"
            @click="onRegisterTankaClick"
          >
            承認・登録
          </a-button>

          <!-- 参照モードでは submit を出さない（モードバーで編集モードを選ぶ）。
               否認(電子版)は読取専用のため更新ボタンも出さない（戻るのみ）。 -->
          <a-button
            v-else-if="!isReferenceMode && !isDenshiRejected"
            type="primary"
            html-type="submit"
            :loading="submitting"
            :disabled="!shubetsuPermitted || isRecordReadOnly || isCancelledLocked"
          >
            {{ isEdit ? '更新' : '登録' }}
          </a-button>

          <a-button
            v-if="isPending && canDenshi"
            :disabled="submitting"
            @click="onClickReject"
          >
            承認しない
          </a-button>

          <a-button :disabled="submitting" @click="goBack">前の画面に戻る</a-button>
      </div>
    </a-form>
  </div>
</template>

<style scoped>
/*
  参照モード（読取専用）の可読性。
  antd の disabled 既定色は `--text-disabled`(不透明度 .25) のため、値がほぼ
  読めない。読取専用フォームでは「文字色だけ」通常色へ戻す:
    - 背景のグレー（--surface-disabled）と not-allowed カーソルは維持する
      → 「編集できない」ことは引き続き視覚的に伝わる。
    - `-webkit-text-fill-color` も併記が必須。WebKit(Safari/iOS) は
      disabled な input/textarea の描画色を color ではなくこの UA プロパティで
      決めるため、color だけ上書きしても灰色のままになる。
  色は runtime トークン（var(--text-main)）なのでダークモードでも自動追随。
*/
.readonly-legible :deep(.ant-input-disabled),
.readonly-legible :deep(.ant-input[disabled]),
.readonly-legible :deep(textarea[disabled]),
.readonly-legible :deep(.ant-input-affix-wrapper-disabled),
.readonly-legible :deep(.ant-input-number-disabled),
.readonly-legible :deep(.ant-input-number-disabled .ant-input-number-input),
.readonly-legible
  :deep(
    .ant-select-disabled:not(.ant-select-customize-input) .ant-select-selector
  ),
.readonly-legible :deep(.ant-select-disabled .ant-select-selection-item),
.readonly-legible :deep(.ant-picker-disabled input),
.readonly-legible :deep(.ant-radio-wrapper-disabled),
.readonly-legible :deep(.ant-radio-wrapper-disabled span),
.readonly-legible :deep(.ant-radio-disabled + span),
.readonly-legible :deep(.ant-checkbox-wrapper-disabled),
.readonly-legible :deep(.ant-checkbox-wrapper-disabled span),
.readonly-legible :deep(.ant-checkbox-disabled + span) {
  color: var(--text-main);
  -webkit-text-fill-color: var(--text-main);
}

/*
  プレースホルダは薄いまま戻す。
  `-webkit-text-fill-color` は継承するため、上のルールだけだと WebKit で
  ::placeholder / .ant-select-selection-placeholder まで本文色で描画され、
  未入力欄の「選択してください」が入力済みの値に見えてしまう。
*/
.readonly-legible :deep(.ant-select-selection-placeholder),
.readonly-legible :deep(input::placeholder),
.readonly-legible :deep(textarea::placeholder) {
  color: var(--text-disabled);
  -webkit-text-fill-color: var(--text-disabled);
}
</style>
