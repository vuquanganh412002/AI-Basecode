<script setup lang="ts">
// ACSMS-SCR-011 — 購読者情報登録画面.
//
// Single component for both CREATE (route `DokusyaCreate`) and EDIT
// (route `DokusyaEdit`, `:id` path param). Backed by the 6 SCR-011
// endpoints in `@/api/dokusya/dokusya`:
//   - getDokusya(id)        → ACSMS-API-011-001
//   - createDokusya(body)   → ACSMS-API-011-002
//   - updateDokusya(id, …)  → ACSMS-API-011-003
//   - approveDokusya(id)    → ACSMS-API-011-004
//   - rejectDokusya(id)     → ACSMS-API-011-005
//
// 履歴表示ボタン (edit only) は購読者履歴情報画面 (ACSMS-SCR-013,
// DokusyaRireki route) へ遷移する — 旧インライン履歴 (getDokusyaHistory)
// は SCR-013 のフル履歴一覧に置き換えた。
//
// Conditional rules (screen-design.md §機能定義):
//   §7   購読種別=電子版/併読 → email required + hide 配達先 section
//   §8   解約 (tetsuzuki_shurui=0) → dokusya_busu forced to 0
//   §9   配達先=購読者情報と同じ チェック → clear haitatsu_* + skip required
//   §10  支払方法=口座引落 (1) → bank cluster required
//   §11  購読者層=農業者 → 主な生産物 (nogyosya_bunrui) visible
//
// In edit mode + denshi_shonin_status=0 (承認待ち), the submit button
// triggers `approveDokusya` instead of `updateDokusya` per §3.3.

import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import { useRoute, useRouter } from 'vue-router';
import { Modal, message } from 'ant-design-vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import { useEditGuard } from '@/composables/useEditGuard';
import {
  getDokusya,
  createDokusya,
  updateDokusya,
  approveDokusya,
  rejectDokusya,
  type CreateDokusyaRequest,
  type UpdateDokusyaRequest,
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
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';
import { useCodesStore } from '@/stores/codes.store';
import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import type { Dayjs } from 'dayjs';
import {
  todayIsoTokyo,
  isPastDayTokyo,
  isTodayOrPastDayTokyo,
  tomorrowIsoTokyo,
  nextMonthFirstIsoTokyo,
} from '@/utils/datetime';
import { formatYearMonth, formatYen } from '@/utils/formatters';

// ─── Form state ────────────────────────────────────────────────────
//
// Field names mirror the API request body 1:1 so the spec's
// `buildCreateDokusyaForm` payload maps via `Object.assign` without
// any field-name translation. `defineExpose({ formState })` at the
// bottom hands the reactive object to the spec's `fillForm` helper.

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
  nogyosya_bunrui: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  // 読者情報変更適用日 — 販売店・支払方法を含む全変更の唯一の適用日（顧客要件
  // 2026-07: 販売店適用日を廃止し joho に統一。1更新1レコード）。
  joho_henko_tekiyo_date: string | null;
  seikyu_kaishi_month: string;
  biko: string;
}

/** Blank create-mode defaults — single source for init + reset. */
function defaultFormState(): DokusyaFormState {
  return {
    kanri_shiten_id: null,
    shiten_id: null,
    kumiaiin_code: '',
    dokusya_shubetsu: 1,
    tetsuzuki_shurui: 1,
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
    nogyosya_bunrui: '',
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

// ─── Route-driven mode ─────────────────────────────────────────────

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
 * 併読(3) と 電子版クレカ決済者 は編集不可（どのアカウントでも） —
 * seeder.md §425 / api.md §is_read_only。VIEW（参照）で開けるが保存不可。
 * BE (update) も同じ条件で 403 を返す。
 */
const isRecordReadOnly = computed(
  () =>
    isEdit.value &&
    (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.BOTH ||
      (Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
        Number(formState.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD)),
);

// Display-only state derived from the loaded detail (edit mode).
const detailRireki = ref<number | null>(null);
// DB 登録時の購読部数（編集モードで 解約→0 にした後、新規 に戻したとき復元する）。
const originalDokusyaBusu = ref<number>(1);
// 読込時の手続種類・支払方法（再加入可否 canResubscribe 判定用。手続種類は編集で
// 可変になり得るため、判定は読込時のスナップショットで固定する＝循環回避）。
const originalTetsuzukiShurui = ref<number | null>(null);
const originalShiharaiHoho = ref<number | null>(null);
const detailDenshiShoninStatus = ref<number | null>(null);
/** 電子版読者種別 (m_code DENSHI_DOKUSYA_SHUBETSU). Edit-mode readonly. */
const detailDenshiDokusyaShubetsu = ref<number | null>(null);
/** 購読者ID — DB の値 (dokusya_id) をそのまま表示する（プレフィックス無し）。 */
const detailIdLabel = computed<string>(() => {
  if (dokusyaId.value === null) return '';
  return String(dokusyaId.value);
});

const isPending = computed(
  () => isEdit.value && detailDenshiShoninStatus.value === 0,
);

// ─── Dropdown options ──────────────────────────────────────────────

const todofukenOptions = ref<TodofukenItem[]>([]);
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
 * 金融支店 (kinyu_shiten_flg=true) は除外する — 金融支店は引落口座支店
 * (kinyuShitenOptions) の候補専用で、購読者の所属支店としては選べない。
 */
const filteredShitenOptions = computed<ShitenDropdownItem[]>(() => {
  if (formState.kanri_shiten_id == null) return [];
  return shitenOptions.value.filter(
    (s) =>
      Number(s.kanri_shiten_id) === Number(formState.kanri_shiten_id) &&
      s.kinyu_shiten_flg !== true,
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

async function fetchTodofukenOptions(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    todofukenOptions.value = Array.isArray(resp)
      ? (resp as unknown as TodofukenItem[])
      : resp.data;
  } catch {
    // Global axios interceptor already toasted — keep blank list.
    todofukenOptions.value = [];
  }
}

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
    const base: HanbaitenDropdownQuery = { active_only: true };
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
    // SCR-011 picks the 新聞単価 tanka (tanka_type=1) per 画面項目定義 No.14.
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

// ─── Edit-mode hydrate ─────────────────────────────────────────────

const isHydrating = ref(false);
const notFoundMessage = ref<string>('');

async function loadDetail(id: number): Promise<void> {
  try {
    const resp = await getDokusya(id);
    isHydrating.value = true;
    Object.assign(formState, {
      kanri_shiten_id: resp.data.kanri_shiten_id ?? null,
      shiten_id: resp.data.shiten_id ?? null,
      kumiaiin_code: resp.data.kumiaiin_code,
      dokusya_shubetsu: resp.data.dokusya_shubetsu,
      tetsuzuki_shurui: resp.data.tetsuzuki_shurui,
      shimei_sei: resp.data.shimei_sei,
      shimei_mei: resp.data.shimei_mei,
      shimei_kana_sei: resp.data.shimei_kana_sei,
      shimei_kana_mei: resp.data.shimei_kana_mei,
      dokusya_busu: resp.data.dokusya_busu,
      yubin_no: resp.data.yubin_no,
      todofuken_code: resp.data.todofuken_code,
      shikuchoson: resp.data.shikuchoson,
      chome_banchi: resp.data.chome_banchi,
      tatemono_mei: resp.data.tatemono_mei,
      renrakusaki_1: resp.data.renrakusaki_1,
      renrakusaki_2: resp.data.renrakusaki_2,
      email: resp.data.email,
      mail_magazine_flg: resp.data.mail_magazine_flg,
      birth_year: resp.data.birth_year,
      gender: resp.data.gender,
      haitatsu_same_flg: resp.data.haitatsu_same_flg,
      haitatsu_yubin_no: resp.data.haitatsu_yubin_no,
      haitatsu_todofuken_code: resp.data.haitatsu_todofuken_code,
      haitatsu_shikuchoson: resp.data.haitatsu_shikuchoson,
      haitatsu_chome_banchi: resp.data.haitatsu_chome_banchi,
      haitatsu_tatemono_mei: resp.data.haitatsu_tatemono_mei,
      haitatsu_renrakusaki_1: resp.data.haitatsu_renrakusaki_1,
      haitatsu_renrakusaki_2: resp.data.haitatsu_renrakusaki_2,
      haitatsu_shimei_sei: resp.data.haitatsu_shimei_sei,
      haitatsu_shimei_mei: resp.data.haitatsu_shimei_mei,
      haitatsu_shimei_kana_sei: resp.data.haitatsu_shimei_kana_sei,
      haitatsu_shimei_kana_mei: resp.data.haitatsu_shimei_kana_mei,
      hanbaiten_id: resp.data.hanbaiten_id,
      tanka_id: resp.data.tanka_id,
      yubin_kubun: resp.data.yubin_kubun,
      shiharai_hoho: resp.data.shiharai_hoho,
      dokusyaryo_shiharai_cycle: resp.data.dokusyaryo_shiharai_cycle,
      bank_shiten_id: resp.data.bank_shiten_id,
      hikiotoshi_yokin_shubetsu: resp.data.hikiotoshi_yokin_shubetsu,
      hikiotoshi_koza_no: resp.data.hikiotoshi_koza_no,
      hikiotoshi_koza_meigi: resp.data.hikiotoshi_koza_meigi,
      dokusyaso_bunrui: resp.data.dokusyaso_bunrui,
      nogyosya_bunrui: resp.data.nogyosya_bunrui,
      dokusya_kaishi_date: resp.data.dokusya_kaishi_date,
      dokusya_chushi_date: resp.data.dokusya_chushi_date,
      // 情報変更適用日はこの編集での「変更適用日」。顧客要件 2026-07 改訂により
      // 未来日のみ許可（当日・過去日 不可）。既定値は翌日にする（ロード済みの
      // 過去値も使わない）。
      joho_henko_tekiyo_date: tomorrowIsoTokyo(),
      seikyu_kaishi_month: resp.data.seikyu_kaishi_month,
      biko: resp.data.biko,
    });
    // 元の販売店を控えておき、編集中の変更検知 (hanbaitenChanged) に使う。
    originalHanbaitenId.value = resp.data.hanbaiten_id ?? null;
    // 編集前の解約予定日を控える（販売店適用日 < 解約予定日 の相対チェック用。
    // 参照は「直前の有効レコード」= ロード値。フォームで chushi を同時編集しても
    // 判定はこの旧値を使う。顧客要件 2026-07）。
    originalChushiDate.value = resp.data.dokusya_chushi_date ?? null;
    // DB 登録時の部数を控える（解約→新規 と切替えたとき復元する）。
    originalDokusyaBusu.value = resp.data.dokusya_busu;
    // 読込時の手続種類・支払方法を控える（canResubscribe 判定用スナップショット）。
    originalTetsuzukiShurui.value = resp.data.tetsuzuki_shurui;
    originalShiharaiHoho.value = resp.data.shiharai_hoho;
    // 解約予約ガード（顧客要件 2026-07）: 有効な解約予約があれば購読中止日を disabled、
    // 解約予定日は最終変更適用日(max_joho_date)より後のみ選択可（同日不可）。
    hasActiveKaiyaku.value = resp.data.has_active_kaiyaku ?? false;
    maxJohoDate.value = resp.data.max_joho_date ?? null;
    detailRireki.value = resp.data.rireki_no;
    detailDenshiShoninStatus.value = resp.data.denshi_shonin_status;
    detailDenshiDokusyaShubetsu.value = resp.data.denshi_dokusya_shubetsu;
    // [haitatsu-prefill] Seed the haitatsu-name fields with the source
    // name so the conditional-required cluster passes validation when
    // haitatsu_same_flg=false (the BE will copy from the 購読者氏名
    // cluster, but the FE check is per-field).
    queueMicrotask(() => {
      isHydrating.value = false;
    });
  } catch (err) {
    const ax = err as AxiosError<{ error_code?: string; message?: string }>;
    const code = ax?.response?.data?.error_code;
    if (code === 'NOT_FOUND') {
      // ACSMS-MSG-011-016 — surface the not-found copy in the view so
      // the spec assertion `wrapper.text().toContain('見つかりません')`
      // passes (the global axios interceptor toast is separate).
      notFoundMessage.value =
        `購読者ID #${dokusyaId.value ?? ''} が見つかりません。`;
    }
    // Other codes (403 / 500) are toasted by the global axios
    // interceptor — leave the form blank rather than redirecting.
  }
}

// ─── Conditional rules (機能定義 §7-§11) ────────────────────────────

// §8 — 手続種類 changes drive 購読部数:
//   解約 (=0) → 0 部（解約は部数なし）。
//   新規 (=1) → 新規作成のみ既定 1 部。編集では既存部数を保持（1 に戻さない）。
// 解約は CREATE では disabled、EDIT でのみ選択可。EDIT で 解約→新規 と
// 切替えても数量は維持し、0 へ落とすのは「解約」を選んだときだけ。
// Skipped while hydrating an existing record so edit-mode keeps the
// saved 部数.
watch(
  () => formState.tetsuzuki_shurui,
  (next) => {
    if (isHydrating.value) return;
    if (Number(next) === 0) {
      // 解約: 部数=0。購読中止日は必須・未来日のみ（顧客要件 2026-07 改訂）なので
      // 空なら翌日を初期値にする。
      formState.dokusya_busu = 0;
      if (!formState.dokusya_chushi_date) {
        formState.dokusya_chushi_date = tomorrowIsoTokyo();
      }
    } else {
      // 新規:
      //  - 新規作成: 既定 1 部。
      //  - 編集: DB 登録時の部数に復元する（解約で 0 にした後、新規 に
      //    戻すと元の数量が戻る）。
      formState.dokusya_busu = isEdit.value ? originalDokusyaBusu.value : 1;
      // 新規は購読中止日を持たない → クリア（入力不可）。
      formState.dokusya_chushi_date = null;
      // 再購読（解約済み→新規）は購読開始日を翌日(未来日のみ)へリセットする。
      // 旧開始日は過去日で未来日検証に通らないため、そのまま残さず翌日を初期値に。
      if (isEdit.value && Number(originalTetsuzukiShurui.value) === 0) {
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
      if (Number(formState.tetsuzuki_shurui) !== 0) {
        formState.tetsuzuki_shurui = 0;
      }
    } else if (Number(formState.tetsuzuki_shurui) === 0) {
      formState.tetsuzuki_shurui = Number(originalTetsuzukiShurui.value ?? 1);
    }
  },
);

// 購読中止日（解約予定日）: 編集画面では任意入力可。中止日入力で解約予約になる
// （上の watch が手続種類=解約へ寄せる）。新規作成画面では入力不可。実際の解約
// 反映（t_dokusya 更新）は日次バッチが到来日に行う（BE は未来日の解約履歴を挿入）。
const isCancelTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === 0);

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
  },
);

// 再加入可否（顧客要件 2026-06）: 解約済みの購読者を編集する際、購読開始日と
// 手続種類を再度入力可にする条件。判定は読込時スナップショット（手続種類は
// 編集で可変になるため循環回避）。dokusya_shubetsu は編集で不変。
//   (紙版 かつ 解約) または (電子版 かつ 支払方法≠クレカ かつ 解約)
const canResubscribe = computed(
  () =>
    isEdit.value &&
    Number(originalTetsuzukiShurui.value) === 0 && // 解約
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
    Number(originalTetsuzukiShurui.value) === 0 && // 読込時=解約
    Number(formState.tetsuzuki_shurui) === 0, // まだ新規へ切替えていない
);
// 再購読中 — 解約済み → 手続種類=新規 を選択。フォームが編集可になり、購読開始日を
// 再入力できる。情報変更適用日(joho)は購読開始日へ追随して disabled。
const isResubscribing = computed(
  () =>
    isEdit.value &&
    Number(originalTetsuzukiShurui.value) === 0 && // 読込時=解約
    Number(formState.tetsuzuki_shurui) === 1, // 新規へ切替
);

// ─── 情報変更モード（顧客要件2026-07・参照→編集フロー・SCR-011）────────────
// 編集画面は最初「参照(read-only)」で表示し、右上の「当日変更」「予約変更」から
// 編集モードを選ぶ。当日変更=適用日を本日固定・帳票非影響項目のみ（紙版）、
// 予約変更=適用日を未来日で入力・全項目可。BE がサーバ側の境界を enforce する。
type ViewMode = 'reference' | 'today' | 'reserved';
const viewMode = ref<ViewMode>('reference');
// 読込直後の formState スナップショット（モード切替リセット用）。
const loadedFormSnapshot = ref<Record<string, unknown> | null>(null);

// 2つのモードボタンを出す＝この読者を編集できるか（Q4・顧客決定2026-07）:
// 併読/電子版クレカ(isRecordReadOnly) と 解約済み(isCancelledLocked) は編集不可、
// dokusya.update 権限なしも不可。純電子版は編集可。
const canSelectMode = computed(
  () =>
    isEdit.value &&
    !isRecordReadOnly.value &&
    // 承認待ち(電子版)は承認/否認フロー、解約読込は再購読フローのため
    // モード選択（参照→当日/予約）の対象外とする。
    !isPending.value &&
    Number(originalTetsuzukiShurui.value) !== 0 &&
    authStore.hasPermission('dokusya.update'),
);
// 電子版は当日変更のみ（顧客要件 2026-07 改訂）— モードバー（当日変更/予約変更の
// 2択）を出さず、編集可能な電子版読者は直接「当日変更」モードで開く。紙版のみ
// 参照→当日/予約 のモードバーを出す。
const isPureDigitalEditable = computed(
  () => canSelectMode.value && isDigital.value,
);
// モードバー（2択ボタン）を出すのは紙版の編集可能読者のみ。
const showModeBar = computed(() => canSelectMode.value && isPaper.value);

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
const readOnlyForm = computed(
  () => isReferenceMode.value || isRecordReadOnly.value || isCancelledLocked.value,
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
  const apply = (): void => {
    if (viewMode.value !== 'reference') resetFormToLoaded();
    viewMode.value = mode;
    // 適用日: 当日変更=本日固定 / 予約変更=空欄（必須入力）。
    formState.joho_henko_tekiyo_date =
      mode === 'today' ? todayIsoTokyo() : null;
    fieldErrors.value = {};
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
// 編集前の解約予定日（相対チェックの参照値。loadDetail で設定）。
const originalChushiDate = ref<string | null>(null);
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
    // 予約変更モード: 適用日（未来日）をユーザー入力する。
    // 当日変更/参照モード: 適用日は本日固定/読取専用（編集不可）。
    // モード未確定（既存フロー・後方互換）は従来どおり情報/販売店変更で編集可。
    (isReservedMode.value ||
      (viewMode.value === 'reference' &&
        (otherInfoChanged.value || hanbaitenChanged.value))),
);
/** ロード時点の適用日（他項目が未変更へ戻ったとき復元する基準値）。 */
const johoHenkoBaseline = ref<string | null>(null);
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

// §9 — When haitatsu_same_flg flips to true, clear every haitatsu_* field.
watch(
  () => formState.haitatsu_same_flg,
  (next) => {
    if (isHydrating.value) return;
    if (next === true) {
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
  },
);

// §11 — 農業者 unchecked → clear 主な生産物 (nogyosya_bunrui).
const hasNogyosha = computed(() =>
  formState.dokusyaso_bunrui.split(',').map((s) => s.trim()).includes('農業者'),
);

/**
 * 購読者層分類 (画面項目定義 No.50) — multi-select stored as comma-
 * separated VARCHAR. Bind `<a-checkbox-group>` to this getter/setter
 * computed so the array<->csv conversion is invisible at the template
 * level.
 */
const dokusyaSoBunruiArr = computed<string[]>({
  get: () =>
    formState.dokusyaso_bunrui
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  set: (next: string[]) => {
    formState.dokusyaso_bunrui = next.join(',');
  },
});

/**
 * 主な生産物 (画面項目定義 No.51) — agrarian sub-category, same
 * comma-separated storage convention as 購読者層分類.
 */
const nogyosyaBunruiArr = computed<string[]>({
  get: () =>
    formState.nogyosya_bunrui
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  set: (next: string[]) => {
    formState.nogyosya_bunrui = next.join(',');
  },
});

/** 読者属性 options — 画面 mockup (index.html). */
const dokusyaSoBunruiOptions = [
  { value: '農業者', label: '農業者' },
  { value: '企業・団体', label: '企業・団体' },
  { value: 'その他', label: 'その他' },
  { value: 'JAグループ役職員', label: 'JAグループ役職員' },
  { value: '学生', label: '学生' },
] as const;

/** 主な生産物 options — 画面 mockup (index.html). */
const nogyosyaBunruiOptions = [
  { value: '米', label: '米' },
  { value: '野菜', label: '野菜' },
  { value: '果実', label: '果実' },
  { value: '花', label: '花' },
  { value: '畜産', label: '畜産' },
  { value: 'その他', label: 'その他' },
] as const;
watch(hasNogyosha, (next) => {
  if (isHydrating.value) return;
  if (next === false) {
    formState.nogyosya_bunrui = '';
  }
});

// §7 — 電子版 / 併読 hides the 配達先 section content.
const isDigitalOrBoth = computed(
  () => Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL ||
    Number(formState.dokusya_shubetsu) === DokusyaShubetsu.BOTH,
);

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
const isDigitalCreate = computed(
  () =>
    !isEdit.value &&
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
 *   AND 紙版/併読 (= !isDigitalOrBoth)
 * 電子版/併読 のときはセクション全体が消えるためこの値は参照されない。
 */
const haitatsuRequired = computed(
  () => !formState.haitatsu_same_flg && !isDigitalOrBoth.value,
);

// ─── Validation (機能定義 §2.1 + メッセージ情報) ──────────────────────

const REQUIRED_MSG = '必須項目です。';
const HIRAGANA_RE = /^[ぁ-ゖー\s]+$/u;
const HIRAGANA_MSG = 'ひらがなで入力してください。';
// 氏名 (氏/名) は漢字・ひらがな・カタカナを許容（顧客要件 2026-07 緩和）。
// CJK統合漢字 + 々 + 〇 + CJK互換漢字(﨑/髙等) + ひらがな + 全角カタカナ(長音符ー・
// 中点・含む). 半角カナ/英数字は不可。空白は氏名のトークン区切りとして許容。
// BE 側 KANJI_NAME_RE (create-dokusya.dto.ts) と同一文字集合 — 両方同時更新。
const KANJI_RE = /^[一-鿿々〇豈-﫿ぁ-ゟァ-ヿ\s]+$/u;
const KANJI_MSG = '漢字・ひらがな・カタカナで入力してください。';
const POSTAL_MSG = '郵便番号は半角数字7桁で入力してください。';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MSG = '正しいメールアドレスを入力してください。';
const BIKO_MAX = 500;
const BIKO_MSG = '備考は500文字以内で入力してください。';
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
  if (!formState.renrakusaki_1?.trim()) errs.renrakusaki_1 = REQUIRED_MSG;
}

/** Required FK dropdowns (clearable selects → `== null` for safety). */
function validateFkDropdowns(errs: Record<string, string>): void {
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

/** 備考 max-length + 購読中止日必須 + 販売店適用日 past-date guard. */
function validateMisc(errs: Record<string, string>): void {
  if (formState.biko && formState.biko.length > BIKO_MAX) {
    errs.biko = BIKO_MSG;
  }
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
  } else if (ctx.effChushi && j > ctx.effChushi) {
    errs.joho_henko_tekiyo_date = `情報変更適用日は解約予定日（${slashDate(ctx.effChushi)}）以前の日付を指定してください。`;
  }
}

/**
 * 情報変更適用日 (joho_henko_tekiyo_date) の必須・範囲検証。
 * BE(collectTekiyoDateViolations)と同一ルールを FE でも即時表示する（顧客要件
 * 2026-07 改訂）:
 *   - 情報変更適用日(joho): 未来日のみ(> today) かつ 購読開始日 <= 値 <= 解約予定日。
 *     販売店・支払方法を含む全変更の唯一の適用日（販売店適用日は廃止し joho に統一）。
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

// ─── Build request bodies ──────────────────────────────────────────

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
    nogyosya_bunrui: formState.nogyosya_bunrui,
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
    // 新規登録では null（UI 非表示）。hanbaiten_tekiyo_date は送信しない。
    joho_henko_tekiyo_date: formState.joho_henko_tekiyo_date,
    seikyu_kaishi_month: isDigitalCreate.value
      ? ''
      : formState.seikyu_kaishi_month,
    biko: formState.biko,
  };
}

// ─── Server-error handling ──────────────────────────────────────────

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
  }
  // 500 / generic 400 — global axios interceptor toasts; view stays put.
}

// ─── Submit pipeline ────────────────────────────────────────────────

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
  if (!validateClient()) return;
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (isEdit.value && dokusyaId.value !== null) {
      // Edit + 承認待ち → submit performs approve. Otherwise: regular update.
      if (isPending.value) {
        await approveDokusya(dokusyaId.value);
        notify.success('承認しました。');
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
      }
    } else {
      await createDokusya(buildRequestBody());
      notify.created();
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
// Distinct from `onSubmit` — fires from the dedicated 承認・登録 button
// click (not the form's @finish) because jsdom doesn't propagate
// html-type=submit clicks into form submission. Calls approveDokusya
// directly, toasts on success, navigates to the list.
async function onApproveClick(): Promise<void> {
  if (dokusyaId.value === null) return;
  if (submitting.value) return;
  submitting.value = true;
  try {
    await approveDokusya(dokusyaId.value);
    notify.success('承認しました。');
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
        await rejectDokusya(dokusyaId.value as number);
        notify.success('否認しました。');
        await router.push({ name: 'DokusyaList' });
      } catch {
        // Global interceptor toasts; view stays put.
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
// 「履歴表示」ブロックは SCR-011 の簡易インライン履歴で別物。
function goRireki(): void {
  if (dokusyaId.value === null) return;
  void router.push({ name: 'DokusyaRireki', params: { id: dokusyaId.value } });
}

// ─── m_code helpers (Group B — labels editable at runtime) ──────────

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

// When 購読種別 switches to 電子版 in create mode, drop a 支払方法 value
// that is no longer selectable (クレジットカードのみ除外) so the field
// never keeps a stale/invalid 選択.
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
// Display-only (edit mode, disabled). Labels come from m_code so a customer
// rename of 有料/無料 reflects without an FE redeploy.
const denshiDokusyaShubetsuOptions = computed(() =>
  codes.options('DENSHI_DOKUSYA_SHUBETSU'),
);
const yokinShubetsuOptions = computed(() => codes.options('YOKIN_SHUBETSU'));

// ─── Lifecycle ──────────────────────────────────────────────────────

/** Reset every field + edit-only display state back to create-mode blanks. */
function resetFormState(): void {
  Object.assign(formState, defaultFormState());
  fieldErrors.value = {};
  detailRireki.value = null;
  detailDenshiShoninStatus.value = null;
  detailDenshiDokusyaShubetsu.value = null;
  notFoundMessage.value = '';
}

/**
 * Apply create / edit mode from the current route. Always resets the
 * form FIRST so navigating edit→create (or edit-id→other-edit-id) does
 * not leak the previously loaded record's data.
 */
async function applyRouteMode(): Promise<void> {
  resetFormState();
  if (isEdit.value && dokusyaId.value !== null) {
    await loadDetail(dokusyaId.value);
    // 現在紐づく販売店（既に廃店でも）を include_id でピンして取得する。
    await fetchHanbaitenOptions(formState.hanbaiten_id ?? undefined);
    // 参照→編集フロー: 紙版は最初「参照」モード（当日変更/予約変更を選ぶ）。
    // 電子版は当日変更のみ（顧客要件 2026-07 改訂）— モードバーを出さず、編集可能な
    // 読者は直接「当日変更」モードで開く（適用日=本日）。適用日=本日は capture より
    // 先に確定させる — そうしないと editGuard が「未変更なのに dirty」と誤検知して
    // 「変更がありません」スキップが効かなくなる。
    if (isPureDigitalEditable.value) {
      viewMode.value = 'today';
      formState.joho_henko_tekiyo_date = todayIsoTokyo();
    } else {
      viewMode.value = 'reference';
    }
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
      // Create — preselect the only 購読種別 this account may use so the
      // default radio isn't a disabled option. paper-only / both keep the
      // default 紙版(1); denshi-only switches to 電子版(2); no-flag keeps the
      // default and the submit button stays disabled (account_concept §139-145).
      formState.dokusya_shubetsu = DokusyaShubetsu.DIGITAL;
    }
  }
}

onMounted(() => {
  // Fan out the dropdown lookups in parallel — none of them depend
  // on each other.
  void fetchTodofukenOptions();
  void fetchKanriShitenOptions();
  void fetchShitenOptions();
  void fetchTankaOptions();
  // 販売店ドロップダウンは applyRouteMode 内で取得する（編集時は loadDetail で
  // 確定した hanbaiten_id を include_id ピンに渡すため順序依存）。
  void applyRouteMode();
});

// [route-reuse] vue-router REUSES this component instance because both
// the create (`/dokusya/create`) and edit (`/dokusya/:id/edit`) routes
// resolve to DokusyaFormView — so `onMounted` does NOT re-run when the
// user jumps edit→create via the menu. Without re-applying the route
// mode here, the create form keeps showing the edit record's data
// (reported bug). Re-init whenever the :id segment changes.
watch(dokusyaId, () => {
  void applyRouteMode();
});

// Expose state for the spec's `fillForm` helper.
defineExpose({ formState, fieldErrors, viewMode, selectMode, canSelectMode });
</script>

<template>
  <div class="space-y-6">
    <p
      v-if="notFoundMessage"
      data-test="dokusya-not-found"
      class="bg-error-subtle text-error border border-error rounded-ant p-4"
    >
      {{ notFoundMessage }}
    </p>

    <!-- 電子版は当日変更のみ（顧客要件2026-07 改訂）— モードバーを出さず、当日変更
         (適用日=本日)である旨を表示するだけ。編集可能な電子版読者のみ表示。 -->
    <div
      v-if="isEdit && isPureDigitalEditable"
      data-test="dokusya-digital-today-note"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4 text-sm"
    >
      <span class="font-bold text-primary">当日変更モード</span>
      <span class="text-text-description ml-2">電子版は当日変更のみです（適用日は本日）。</span>
    </div>

    <!-- 情報変更モードバー（顧客要件2026-07・参照→編集フロー）。a-form の外に
         置くことで、参照モードで form 全体が disabled でもボタンは押せる。
         2択（当日変更/予約変更）は紙版のみ（電子版は上の当日変更固定）。 -->
    <div
      v-if="isEdit && showModeBar"
      data-test="dokusya-mode-bar"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4 flex items-center justify-between gap-4"
    >
      <div class="text-sm">
        <template v-if="isReferenceMode">
          <span class="font-bold text-text-main">参照モード</span>
          <span class="text-text-description ml-2">閲覧のみです。編集するにはモードを選択してください。</span>
        </template>
        <template v-else-if="isTodayMode">
          <span class="font-bold text-primary">当日変更モード</span>
          <span class="text-text-description ml-2">適用日は本日（帳票に影響する項目は変更できません／電子版を除く）。</span>
        </template>
        <template v-else>
          <span class="font-bold text-primary">予約変更モード</span>
          <span class="text-text-description ml-2">適用日（未来日）を指定してください。全項目を変更できます。</span>
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
          data-test="mode-reserved"
          @click="selectMode('reserved')"
        >
          予約変更
        </a-button>
      </div>
    </div>


    <a-form
      layout="vertical"
      :model="formState"
      :disabled="isRecordReadOnly || isCancelledLocked || isReferenceMode"
      class="space-y-6"
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
      <section class="bg-surface-card border border-border rounded-ant p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">一般情報</h3>

        <div class="space-y-6">
          <!-- Row 1: 購読種別 / 手続種類 / 電子版読者種別 / ID ───────── -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a-form-item
              name="dokusya_shubetsu"
              :validate-status="fieldErrors.dokusya_shubetsu ? 'error' : ''"
              :help="fieldErrors.dokusya_shubetsu"
            >
              <template #label>
                <span>購読種別</span>
                <span class="text-error ml-1">*</span>
              </template>
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
              <a-radio-group
                v-model:value="formState.dokusya_shubetsu"
                :disabled="isEdit"
              >
                <a-radio
                  v-for="opt in dokusyaShubetsuOptions"
                  :key="opt.value"
                  :value="Number(opt.value)"
                  :disabled="
                    !isEdit &&
                    (Number(opt.value) === 3 ||
                      !isShubetsuAllowed(Number(opt.value)))
                  "
                >
                  {{ opt.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item
              name="tetsuzuki_shurui"
              :validate-status="fieldErrors.tetsuzuki_shurui ? 'error' : ''"
              :help="fieldErrors.tetsuzuki_shurui"
            >
              <template #label>
                <span>手続種類</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!--
                編集画面では原則 手続種類を変更不可（作成時に確定。顧客要件）。
                例外: 再加入可（canResubscribe = 解約済みの 紙版 / 電子版(非クレカ)）
                のときのみ編集可にする。
                新規作成では解約(0)を選択不可（解約は既存購読者に対する更新操作。
                BE も create() で同値を VALIDATION_ERROR で弾く）。
              -->
              <a-radio-group
                v-model:value="formState.tetsuzuki_shurui"
                :disabled="isEdit && !canResubscribe"
              >
                <a-radio
                  v-for="opt in tetsuzukiShuruiOptions"
                  :key="opt.value"
                  :value="Number(opt.value)"
                  :disabled="!isEdit && Number(opt.value) === 0"
                >
                  {{ opt.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>

            <!--
              画面項目定義 No.3 — 電子版読者種別 は編集モード専用かつ
              入力不可 (電子版読者管理システムからの連携結果を表示).
              新規作成モードでは非表示。
            -->
            <a-form-item v-if="isEdit" name="denshi_dokusya_shubetsu">
              <template #label><span>電子版読者種別</span></template>
              <a-radio-group
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
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <a-input :value="String(detailRireki ?? '')" disabled class="flex-1" />
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

          <!-- Row 3: 購読者氏名(subgrid) / 購読者かな(subgrid) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Col 1 — 購読者氏名 (氏 + 名 サブグリッド) -->
            <div class="grid grid-cols-2 gap-2">
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
            <div class="grid grid-cols-2 gap-2">
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
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <a-select
                v-model:value="formState.tanka_id"
                :options="tankaOptions.map((t) => ({ value: t.tanka_id, label: `${t.tanka_name} ${formatYen(t.kingaku)}` }))"
                placeholder="選択してください"
                allow-clear
              />
            </a-form-item>
          </div>
        </div>
      </section>

      <!-- ─── Section 2: 購読者情報 ──────────────────────────────── -->
      <section class="bg-surface-card border border-border rounded-ant p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読者情報</h3>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a-form-item
            name="yubin_no"
            :validate-status="fieldErrors.yubin_no ? 'error' : ''"
            :help="fieldErrors.yubin_no"
          >
            <template #label>
              <span>郵便番号</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.yubin_no" :maxlength="7" :disabled="reportFieldDisabled" />
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
            <a-select
              v-model:value="formState.todofuken_code"
              :options="todofukenOptions.map((t) => ({ value: t.todofuken_code, label: t.todofuken_name }))"
              placeholder="選択してください"
              allow-clear
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="renrakusaki_1"
            :validate-status="fieldErrors.renrakusaki_1 ? 'error' : ''"
            :help="fieldErrors.renrakusaki_1"
          >
            <template #label>
              <span>連絡先1</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.renrakusaki_1" :maxlength="15" />
          </a-form-item>

          <a-form-item
            name="renrakusaki_2"
            :validate-status="fieldErrors.renrakusaki_2 ? 'error' : ''"
            :help="fieldErrors.renrakusaki_2"
          >
            <template #label><span>連絡先2</span></template>
            <a-input v-model:value="formState.renrakusaki_2" :maxlength="15" />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="email"
            :validate-status="fieldErrors.email ? 'error' : ''"
            :help="fieldErrors.email"
          >
            <template #label>
              <span>メールアドレス</span>
              <span v-if="isDigitalOrBoth" class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.email" :maxlength="100" />
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item name="mail_magazine_flg">
            <template #label><span>メールマガジン</span></template>
            <!-- 電子版用項目 — 紙版指定時はグレーアウト（顧客要件）。 -->
            <a-radio-group
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
          </a-form-item>

          <a-form-item name="gender">
            <template #label><span>性別</span></template>
            <a-radio-group v-model:value="formState.gender">
              <a-radio
                v-for="opt in genderOptions"
                :key="opt.value"
                :value="Number(opt.value)"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </div>
      </section>

      <!-- ─── Section 3: 配達先情報 ──────────────────────────────────
        Layout 完全一致 `docs/design/ACSMS-SCR-011/index.html` §配達先情報:
          Row 1 (4 cols): 郵便番号 / 都道府県 / 市町村郡 / 丁目番地
          Row 2 (full):   マンション・アパート名
          Row 3 (2 cols): 連絡先1 / 連絡先2
          Row 4 (2 cols, each is 2-col subgrid):
            ┌─ 配達先苗字漢字 + 配達先名前漢字 ─┐  ┌─ 配達先苗字かな + 配達先名前かな ─┐

        Visibility (機能定義 §7.5 + §9.x):
          - 電子版/併読 (isDigitalOrBoth): セクション全体を `v-if` で消す。
            テスト側の「label.closest(...)」検査をスキップさせる。
          - 紙版/併読 + 購読者情報と同じ チェック時: 入力ブロックのみ消す。
            ヘッダー (title + checkbox) はそのまま残す → ユーザーが
            チェックを外したくなったときに UI が消えてしまわない。
            opacity ではなく `v-show` で完全に隠す (index.html の
            `hidden-field` クラス挙動と一致).
      -->
      <section
        v-if="!isDigitalOrBoth"
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
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a-form-item
              name="haitatsu_yubin_no"
              :validate-status="fieldErrors.haitatsu_yubin_no ? 'error' : ''"
              :help="fieldErrors.haitatsu_yubin_no"
            >
              <template #label>
                <span>郵便番号</span>
                <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
              </template>
              <a-input v-model:value="formState.haitatsu_yubin_no" :maxlength="7" :disabled="reportFieldDisabled" />
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
              <a-select
                v-model:value="formState.haitatsu_todofuken_code"
                :options="todofukenOptions.map((t) => ({ value: t.todofuken_code, label: t.todofuken_name }))"
                placeholder="選択してください"
                allow-clear
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

          <!-- Row 3: 2-col 連絡先 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a-form-item name="haitatsu_renrakusaki_1">
              <template #label><span>連絡先1</span></template>
              <a-input v-model:value="formState.haitatsu_renrakusaki_1" :maxlength="15" />
            </a-form-item>

            <a-form-item name="haitatsu_renrakusaki_2">
              <template #label><span>連絡先2</span></template>
              <a-input v-model:value="formState.haitatsu_renrakusaki_2" :maxlength="15" />
            </a-form-item>
          </div>

          <!-- Row 4: 2-col with subgrid 配達先氏名 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Col 1 — 漢字 group -->
            <div class="grid grid-cols-2 gap-2">
              <a-form-item
                name="haitatsu_shimei_sei"
                :validate-status="fieldErrors.haitatsu_shimei_sei ? 'error' : ''"
                :help="fieldErrors.haitatsu_shimei_sei"
              >
                <template #label>
                  <span>配達先苗字（漢字）</span>
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
                  <span>配達先名前(漢字)</span>
                  <span v-if="haitatsuRequired" class="text-error ml-1">*</span>
                </template>
                <a-input v-model:value="formState.haitatsu_shimei_mei" :maxlength="50" />
              </a-form-item>
            </div>

            <!-- Col 2 — かな group -->
            <div class="grid grid-cols-2 gap-2">
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
      <section class="bg-surface-card border border-border rounded-ant p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">販売店・支払方法</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <a-form-item name="hanbaiten_name">
            <template #label><span>販売店名</span></template>
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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
            <a-select
              v-model:value="formState.shiharai_hoho"
              :options="shiharaiHohoOptions"
              placeholder="選択してください"
              allow-clear
            />
          </a-form-item>

          <a-form-item name="dokusyaryo_shiharai_cycle">
            <template #label><span>購読料支払サイクル</span></template>
            <div class="flex items-center gap-2">
              <a-input-number
                v-model:value="formState.dokusyaryo_shiharai_cycle"
                :min="0"
                :max="99"
                class="flex-1"
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <a-form-item
            name="bank_shiten_id"
            :validate-status="fieldErrors.bank_shiten_id ? 'error' : ''"
            :help="fieldErrors.bank_shiten_id"
          >
            <template #label>
              <span>引落口座支店</span>
              <span v-if="Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI" class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.bank_shiten_id"
              :options="kinyuShitenOptions.map((s) => ({ value: s.shiten_id, label: s.shiten_name }))"
              placeholder="選択してください"
              allow-clear
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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
            <a-input v-model:value="formState.hikiotoshi_koza_no" :maxlength="10" />
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
            <a-input v-model:value="formState.hikiotoshi_koza_meigi" :maxlength="50" />
          </a-form-item>
        </div>
      </section>

      <!-- ─── Section 5: 購読者層分類 (機能定義 §11.x + 画面項目定義 No.50-51) -->
      <section class="bg-surface-card border border-border rounded-ant p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読者層分類</h3>

        <div class="space-y-6">
          <!-- 読者属性 — 複数選択 (CSV stored in dokusyaso_bunrui) -->
          <a-form-item
            name="dokusyaso_bunrui"
            :validate-status="fieldErrors.dokusyaso_bunrui ? 'error' : ''"
            :help="fieldErrors.dokusyaso_bunrui"
          >
            <template #label><span>読者属性</span></template>
            <a-checkbox-group
              v-model:value="dokusyaSoBunruiArr"
              :options="dokusyaSoBunruiOptions"
              class="flex flex-wrap gap-x-6 gap-y-2"
            />
          </a-form-item>

          <!--
            機能定義 §11 — 「農業者」を選択した場合のみ「主な生産物」を表示
            する。未チェック・解除時は nogyosya_bunrui を clear (watch側で)。
          -->
          <a-form-item
            v-if="hasNogyosha"
            name="nogyosya_bunrui"
            :validate-status="fieldErrors.nogyosya_bunrui ? 'error' : ''"
            :help="fieldErrors.nogyosya_bunrui"
          >
            <template #label><span>主な生産物（農業者の場合）</span></template>
            <a-checkbox-group
              v-model:value="nogyosyaBunruiArr"
              :options="nogyosyaBunruiOptions"
              class="flex flex-wrap gap-x-6 gap-y-2"
            />
          </a-form-item>
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
      <section class="bg-surface-card border border-border rounded-ant p-6">
        <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">購読開始日、中止日</h3>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a-form-item
              name="dokusya_kaishi_date"
              :validate-status="fieldErrors.dokusya_kaishi_date ? 'error' : ''"
              :help="fieldErrors.dokusya_kaishi_date"
            >
              <template #label>
                <span>購読開始日</span>
                <span class="text-error ml-1">*</span>
              </template>
              <!--
                電子版 (create) はラジオ「今日/翌月1日」で指定し、
                実際の保存値は buildRequestBody で確定する。それ以外は
                a-date-picker（作成時のみ入力可、編集モードは読取専用）。
              -->
              <a-radio-group
                v-if="isDigitalCreate"
                v-model:value="kaishiDateMode"
              >
                <a-radio value="today">今日</a-radio>
                <a-radio value="next_month_first">翌月1日</a-radio>
              </a-radio-group>
              <a-date-picker
                v-else
                v-model:value="formState.dokusya_kaishi_date"
                format="YYYY/MM/DD"
                value-format="YYYY-MM-DD"
                placeholder="YYYY/MM/DD"
                :disabled="isEdit && !isResubscribing"
                :disabled-date="disabledKaishiDate"
                class="w-full"
              />
            </a-form-item>

            <a-form-item
              name="dokusya_chushi_date"
              :validate-status="fieldErrors.dokusya_chushi_date ? 'error' : ''"
              :help="fieldErrors.dokusya_chushi_date"
            >
              <template #label>
                <span>購読中止日</span>
                <span v-if="isCancelTetsuzuki" class="text-error ml-1">*</span>
              </template>
              <!--
                ① 電子版 (create): 読取専用・空欄で「月末で終了」を
                   placeholder 表示。submit は null (値があれば YYYY/MM 表示)。
                ② 電子版+クレカ / 併読 (update): 読取専用で月 YYYY/MM を表示し
                   suffix に「月末で終了」。formState の元値はそのまま保持・送信。
                ③ それ以外: 従来の a-date-picker (編集可能)。
              -->
              <a-input
                v-if="isDigitalCreate"
                :value="chushiMonthDisplay"
                readonly
                placeholder="月末で終了"
                class="w-full"
              />
              <div
                v-else-if="chushiReadonlyMonthEdit"
                class="flex items-center gap-2"
              >
                <a-input :value="chushiMonthDisplay" readonly class="flex-1" />
                <span class="text-text-description text-sm whitespace-nowrap">月末で終了</span>
              </div>
              <!-- 購読中止日は読取専用（顧客要件 2026-07 改訂）。停止（解約予約）は
                   一覧画面(SCR-014)の「購読を停止する」ボタン → ポップアップで行う。
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
                v-if="hasActiveKaiyaku"
                class="text-text-description text-xs mt-1"
                data-test="active-kaiyaku-hint"
              >
                既に解約予約されています。変更するには履歴画面で解約を取消してください。
              </p>
              <p
                v-else-if="isEdit"
                class="text-text-description text-xs mt-1"
                data-test="chushi-stop-hint"
              >
                購読の停止は一覧画面の「購読を停止する」から行ってください。
              </p>
            </a-form-item>
          </div>

          <!--
            画面項目定義 No.55 — 請求開始月 (seikyu_kaishi_month) は
            電子版/併読の場合のみ表示, 読取専用 (電子版読者管理
            システム決定後の値を受信して表示). ただし create の
            電子版 create では非表示 (顧客要件)。
          -->
          <div
            v-if="isDigitalOrBoth && !isDigitalCreate"
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <a-form-item name="seikyu_kaishi_month">
              <template #label><span>請求開始月</span></template>
              <!--
                update: YYYYMM を YYYY/MM に整形して読取専用表示 (電子版読者
                管理システムが決定した値を受信)。create: 未確定なので raw 値 +
                「(電子版システムが決定)」placeholder のまま (従来ロジック)。
                どちらも :value バインドのみで formState は変更しない。
              -->
              <a-input
                :value="isEdit ? seikyuMonthDisplay : formState.seikyu_kaishi_month"
                disabled
                placeholder="(電子版システムが決定)"
              />
            </a-form-item>
          </div>

          <!--
            読者情報変更適用日 (joho_henko_tekiyo_date / 画面項目定義 No.54)。
            編集時のみ表示。顧客要件によりユーザー入力（既定は当日・過去日不可）。
            備考の直前（末尾）に配置。
          -->
          <div v-if="isEdit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a-form-item
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
                :disabled="!johoEditable"
                :disabled-date="isTodayOrPastDayTokyo"
              />
            </a-form-item>
          </div>

          <a-form-item
            name="biko"
            :validate-status="fieldErrors.biko ? 'error' : ''"
            :help="fieldErrors.biko"
          >
            <template #label><span>備考</span></template>
            <a-textarea v-model:value="formState.biko" :rows="6" :maxlength="500" show-count />
          </a-form-item>
        </div>
      </section>

      <!-- ─── Action buttons ───────────────────────────────────────
        Button visibility rules (機能定義 §3.x §4.1 + 画面項目定義 No.58-62):
          - プライマリ — 状態でラベル切替:
               isPending (edit + status=0) → 承認・登録 (approveDokusya)
               isEdit && !isPending        → 更新     (updateDokusya)
               !isEdit                     → 登録     (createDokusya)
          - 承認しない — denshi_shonin_status = 0 (承認待ち) の時のみ
            表示。NULL/1/2 では非表示 (機能定義 §4.1).
          - 前の画面に戻る — 常時表示。

        index.html mockup は 3 ボタンを並べているが、これは「edit +
        status=0」状態を例示しているもので, それ以外の状態では spec
        通り 2 ボタン構成になる。
      -->
      <!-- 承認/否認 は電子版ワークフロー → denshi_flg 必須 (§143). flag が
           無い場合は v-else の更新ボタンが出るが shubetsuPermitted=false で
           非活性となり、実質読み取り専用になる（権限が無い購読種別は
           登録/更新ボタンを非活性にするのみで、警告文は出さない）。 -->
      <div class="flex justify-start gap-2 pt-4">
          <a-button
            v-if="isPending && canDenshi"
            type="primary"
            :loading="submitting"
            @click="onApproveClick"
          >
            承認・登録
          </a-button>

          <!-- 参照モードでは submit を出さない（モードバーで編集モードを選ぶ）。 -->
          <a-button
            v-else-if="!isReferenceMode"
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
