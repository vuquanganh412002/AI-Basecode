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
import { Modal } from 'ant-design-vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
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
import { todayIsoTokyo, nextMonthFirstIsoTokyo } from '@/utils/datetime';
import { formatYearMonth } from '@/utils/formatters';

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
  mail_magazine_flg: number;
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
    mail_magazine_flg: 0,
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
const detailDenshiShoninStatus = ref<number | null>(null);
/** 電子版読者種別 (m_code DENSHI_DOKUSYA_SHUBETSU). Edit-mode readonly. */
const detailDenshiDokusyaShubetsu = ref<number | null>(null);
/** 履歴ID — displayed as `DK-{8 桁ゼロ埋め}` per the index.html mockup. */
const detailIdLabel = computed<string>(() => {
  if (dokusyaId.value === null) return '';
  return `DK-${String(dokusyaId.value).padStart(8, '0')}`;
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

async function fetchHanbaitenOptions(): Promise<void> {
  try {
    const resp = await getHanbaitenDropdown(
      sessionJaId.value === null ? {} : { ja_id: sessionJaId.value },
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
      joho_henko_tekiyo_date: resp.data.joho_henko_tekiyo_date,
      seikyu_kaishi_month: resp.data.seikyu_kaishi_month,
      biko: resp.data.biko,
    });
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

// §8 — 手続種類 sets the default 購読部数 on change:
//   解約 (tetsuzuki_shurui=0) → 0 部（解約は部数なし）
//   新規 (tetsuzuki_shurui=1) → 1 部（新規申込の既定）
// Skipped while hydrating an existing record so edit-mode keeps the
// saved 部数.
watch(
  () => formState.tetsuzuki_shurui,
  (next) => {
    if (isHydrating.value) return;
    formState.dokusya_busu = Number(next) === 0 ? 0 : 1;
  },
);

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

// ─── 購読開始日・中止日 — create-mode 電子版 + 口座引落 の特例 ────────
//
// 顧客要件 (create のみ): 電子版(2) かつ 支払方法=口座引落(1) のとき
//   - 購読開始日 : ラジオ 2 択「今日 / 翌月1日」(既定=今日)。実際の保存
//                 値は buildRequestBody でラジオから確定する (今日=本日
//                 JST / 翌月1日=翌月1日 JST)。
//   - 購読中止日 : 読取専用・空欄。submit は null。表示は「月末で終了」
//                 (値があれば YYYY/MM 表示)。
//   - 請求開始月 : 非表示。
// edit モードおよびここに挙げていない組み合わせは従来ロジックを維持。
const isDigitalKozaCreate = computed(
  () =>
    !isEdit.value &&
    Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
    Number(formState.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI,
);

/** 購読開始日ラジオ — 'today'(今日) / 'next_month_first'(翌月1日). */
const kaishiDateMode = ref<'today' | 'next_month_first'>('today');

/** 電子版・口座引落の購読開始日として保存する YYYY-MM-DD を確定する。 */
function resolveKaishiDateDigitalKoza(): string {
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
// 漢字 — CJK統合漢字 + 々(繰返し) + 〇 + CJK互換漢字(﨑/髙等の人名漢字).
// 空白は氏名のトークン区切りとして許容 (かなフィールドと同じ方針)。
const KANJI_RE = /^[一-鿿々〇豈-﫿\s]+$/u;
const KANJI_MSG = '漢字で入力してください。';
const POSTAL_MSG = '郵便番号は半角数字7桁で入力してください。';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MSG = '正しいメールアドレスを入力してください。';
const BIKO_MAX = 500;
const BIKO_MSG = '備考は500文字以内で入力してください。';

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/** Required base 氏名 cluster — 氏/名 は漢字、かな は全角ひらがな (画面項目定義 No.9-13). */
function validateNameCluster(errs: Record<string, string>): void {
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
  if (formState.shiten_id == null) errs.shiten_id = REQUIRED_MSG;
  if (formState.hanbaiten_id == null) errs.hanbaiten_id = REQUIRED_MSG;
  if (formState.tanka_id == null) errs.tanka_id = REQUIRED_MSG;
  if (formState.shiharai_hoho == null) errs.shiharai_hoho = REQUIRED_MSG;
}

/**
 * 購読開始日 required on create (unless 電子版+口座引落, where the radio
 * always fixes it) + §7.1 電子版/併読 → email required & format.
 */
function validateKaishiAndEmail(errs: Record<string, string>): void {
  if (!isDigitalKozaCreate.value && !formState.dokusya_kaishi_date) {
    errs.dokusya_kaishi_date = REQUIRED_MSG;
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
  if (!formState.haitatsu_shimei_sei?.trim())
    errs.haitatsu_shimei_sei = REQUIRED_MSG;
  if (!formState.haitatsu_shimei_mei?.trim())
    errs.haitatsu_shimei_mei = REQUIRED_MSG;
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

/** 備考 max-length + 情報変更適用日 future-date guard. */
function validateMisc(errs: Record<string, string>): void {
  if (formState.biko && formState.biko.length > BIKO_MAX) {
    errs.biko = BIKO_MSG;
  }
  if (formState.joho_henko_tekiyo_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (formState.joho_henko_tekiyo_date <= today) {
      errs.joho_henko_tekiyo_date = '未来日を指定してください。';
    }
  }
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
    // 電子版+口座引落 (create): 購読開始日はラジオで確定、購読中止日は
    // null (月末で終了)、請求開始月は送らない (空)。それ以外は従来通り
    // formState の値をそのまま送る。
    dokusya_kaishi_date: isDigitalKozaCreate.value
      ? resolveKaishiDateDigitalKoza()
      : formState.dokusya_kaishi_date,
    dokusya_chushi_date: isDigitalKozaCreate.value
      ? null
      : formState.dokusya_chushi_date,
    joho_henko_tekiyo_date: formState.joho_henko_tekiyo_date,
    seikyu_kaishi_month: isDigitalKozaCreate.value
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

async function onSubmit(): Promise<void> {
  // 併読(3) / 電子版クレカ は編集不可 — 保存を弾く (BE も 403)。承認/否認は
  // 専用ボタン経由なのでここは更新パスのみガードする。
  if (isRecordReadOnly.value) return;
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
        await updateDokusya(dokusyaId.value, buildRequestBody() as UpdateDokusyaRequest);
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
const shiharaiHohoOptions = computed(() => {
  const all = codes.options('SHIHARAI_HOHO');
  // Create mode: 電子版 (dokusya_shubetsu=2) は クレジットカード (6) だけ除外。
  // クレカは電子版読者管理システム連携専用で本画面では手入力しないため。
  // 残り (口座引落/現金集金/振込集金/JA施設等/給与天引き/その他) は選択可。
  // Edit keeps the full list because an existing 電子版 record may
  // legitimately carry クレカ from that system.
  if (!isEdit.value && Number(formState.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL) {
    return all.filter((o) => Number(o.value) !== ShiharaiHoho.CREDIT_CARD);
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
  } else if (!canPaper.value && canDenshi.value) {
    // Create — preselect the only 購読種別 this account may use so the
    // default radio isn't a disabled option. paper-only / both keep the
    // default 紙版(1); denshi-only switches to 電子版(2); no-flag keeps the
    // default and the submit button stays disabled (account_concept §139-145).
    formState.dokusya_shubetsu = DokusyaShubetsu.DIGITAL;
  }
}

onMounted(() => {
  // Fan out the dropdown lookups in parallel — none of them depend
  // on each other.
  void fetchTodofukenOptions();
  void fetchKanriShitenOptions();
  void fetchShitenOptions();
  void fetchHanbaitenOptions();
  void fetchTankaOptions();
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
defineExpose({ formState, fieldErrors });
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


    <a-form
      layout="vertical"
      :model="formState"
      :disabled="isRecordReadOnly"
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
              <a-radio-group v-model:value="formState.tetsuzuki_shurui">
                <a-radio
                  v-for="opt in tetsuzukiShuruiOptions"
                  :key="opt.value"
                  :value="Number(opt.value)"
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
              <a-select
                v-model:value="formState.kanri_shiten_id"
                :options="kanriShitenOptions.map((k) => ({ value: k.kanri_shiten_id, label: k.kanri_shiten_name }))"
                placeholder="選択してください"
                allow-clear
              />
            </a-form-item>

            <a-form-item
              name="shiten_id"
              :validate-status="fieldErrors.shiten_id ? 'error' : ''"
              :help="fieldErrors.shiten_id"
            >
              <template #label>
                <span>支店</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.shiten_id"
                :options="filteredShitenOptions.map((s) => ({ value: s.shiten_id, label: s.shiten_name }))"
                :disabled="formState.kanri_shiten_id == null"
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

          <!-- Row 3: 氏名(subgrid) / かな(subgrid) / 購読部数 / 新聞単価 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <a-input v-model:value="formState.shimei_sei" :maxlength="50" :disabled="isEdit" />
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
                <a-input v-model:value="formState.shimei_mei" :maxlength="50" :disabled="isEdit" />
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
                <a-input v-model:value="formState.shimei_kana_sei" :maxlength="100" :disabled="isEdit" />
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
                <a-input v-model:value="formState.shimei_kana_mei" :maxlength="100" :disabled="isEdit" />
              </a-form-item>
            </div>

            <!-- Col 3 — 購読部数 -->
            <a-form-item
              name="dokusya_busu"
              :validate-status="fieldErrors.dokusya_busu ? 'error' : ''"
              :help="fieldErrors.dokusya_busu"
            >
              <template #label>
                <span>購読部数</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-input-number
                v-model:value="formState.dokusya_busu"
                :min="0"
                :readonly="Number(formState.tetsuzuki_shurui) === 0"
                class="w-full"
              />
            </a-form-item>

            <!-- Col 4 — 新聞単価 -->
            <a-form-item
              name="tanka_id"
              :validate-status="fieldErrors.tanka_id ? 'error' : ''"
              :help="fieldErrors.tanka_id"
            >
              <template #label>
                <span>新聞単価</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.tanka_id"
                :options="tankaOptions.map((t) => ({ value: t.tanka_id, label: t.tanka_name }))"
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
            <a-input v-model:value="formState.yubin_no" :maxlength="7" />
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
            <a-input v-model:value="formState.shikuchoson" :maxlength="100" />
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
            <a-input v-model:value="formState.chome_banchi" :maxlength="100" />
          </a-form-item>
        </div>

        <a-form-item
          name="tatemono_mei"
          :validate-status="fieldErrors.tatemono_mei ? 'error' : ''"
          :help="fieldErrors.tatemono_mei"
        >
          <template #label><span>マンション・アパート名</span></template>
          <a-input v-model:value="formState.tatemono_mei" :maxlength="100" />
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
            <a-radio-group v-model:value="formState.mail_magazine_flg">
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
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              v-model="formState.haitatsu_same_flg"
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
              <a-input v-model:value="formState.haitatsu_yubin_no" :maxlength="7" />
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
              <a-input v-model:value="formState.haitatsu_shikuchoson" :maxlength="100" />
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
              <a-input v-model:value="formState.haitatsu_chome_banchi" :maxlength="100" />
            </a-form-item>
          </div>

          <!-- Row 2: full マンション・アパート名 -->
          <a-form-item name="haitatsu_tatemono_mei">
            <template #label><span>マンション・アパート名</span></template>
            <a-input
              v-model:value="formState.haitatsu_tatemono_mei"
              :maxlength="100"
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
              class="block py-1 px-2 text-text-main bg-bg-layout rounded-ant border border-border"
              data-test="hanbaiten-name"
            >
              {{ hanbaitenName || '—' }}
            </span>
          </a-form-item>

          <a-form-item name="yubin_kubun">
            <template #label><span>郵送区分</span></template>
            <a-select
              v-model:value="formState.yubin_kubun"
              :options="yubinKubunOptions.map((o) => ({ value: String(o.value), label: o.label }))"
              placeholder="選択してください"
              allow-clear
            />
          </a-form-item>
        </div>

        <!-- Row 2: 支払方法 / 購読料支払サイクル (with ヶ月 suffix) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
              :options="shiharaiHohoOptions.map((o) => ({ value: Number(o.value), label: o.label }))"
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
                電子版+口座引落 (create) はラジオ「今日/翌月1日」で指定し、
                実際の保存値は buildRequestBody で確定する。それ以外は
                a-date-picker（作成時のみ入力可、編集モードは読取専用）。
              -->
              <a-radio-group
                v-if="isDigitalKozaCreate"
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
                :disabled="isEdit"
                class="w-full"
              />
            </a-form-item>

            <a-form-item
              name="dokusya_chushi_date"
              :validate-status="fieldErrors.dokusya_chushi_date ? 'error' : ''"
              :help="fieldErrors.dokusya_chushi_date"
            >
              <template #label><span>購読中止日</span></template>
              <!--
                ① 電子版+口座引落 (create): 読取専用・空欄で「月末で終了」を
                   placeholder 表示。submit は null (値があれば YYYY/MM 表示)。
                ② 電子版+クレカ / 併読 (update): 読取専用で月 YYYY/MM を表示し
                   suffix に「月末で終了」。formState の元値はそのまま保持・送信。
                ③ それ以外: 従来の a-date-picker (編集可能)。
              -->
              <a-input
                v-if="isDigitalKozaCreate"
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
              <a-date-picker
                v-else
                v-model:value="formState.dokusya_chushi_date"
                format="YYYY/MM/DD"
                value-format="YYYY-MM-DD"
                placeholder="YYYY/MM/DD"
                class="w-full"
              />
            </a-form-item>
          </div>

          <!--
            画面項目定義 No.55 — 請求開始月 (seikyu_kaishi_month) は
            電子版/併読の場合のみ表示, 読取専用 (電子版読者管理
            システム決定後の値を受信して表示). ただし create の
            電子版+口座引落 では非表示 (顧客要件)。
          -->
          <div
            v-if="isDigitalOrBoth && !isDigitalKozaCreate"
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
            画面項目定義 No.54 — 読者情報変更適用日 は spec 上で
            言及されているが index.html mockup には含まれていないため
            UI からは外す。formState.joho_henko_tekiyo_date は null の
            まま BE に送信され、未来日チェックも validateClient で発火
            しない (値が空のため). 顧客がフォーム追加を要求した場合は
            ここに `<a-date-picker>` を再挿入する。
          -->

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

          <a-button
            v-else
            type="primary"
            html-type="submit"
            :loading="submitting"
            :disabled="!shubetsuPermitted || isRecordReadOnly"
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
