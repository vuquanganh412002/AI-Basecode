<script setup lang="ts">
// ACSMS-SCR-017 — 販売店情報登録画面。
//
// CREATE（route `HanbaitenCreate`）と EDIT（route `HanbaitenEdit`、`:id`）を
// 兼ねる単一コンポーネント。`@/api/hanbaiten/hanbaiten` の ACSMS-SCR-017 API 三種:
//   - getHanbaiten(id)        → ACSMS-API-017-001
//   - createHanbaiten(body)   → ACSMS-API-017-002
//   - updateHanbaiten(id, …)  → ACSMS-API-017-003
//
// 条件付き必須クラスタ（screen-design v1.2 §3.1、api.md §4.1）:
// `itaku_kubun = 1 (振込)` のとき銀行系7項目（No.17-23）が必須、
// `2 (日農委託)` / `9 (その他)` では任意。ここの検証は BE DTO 規則を忠実にミラー。

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import BaseTankaDropdown from '@/components/common/BaseTankaDropdown.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { useNotFoundRedirect } from '@/composables/useNotFoundRedirect';
import { useCodesStore } from '@/stores/codes.store';
import { useAuthStore } from '@/stores/auth.store';
import { ItakuKubun } from '@/constants/enums';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { focusFirstError } from '@/utils/form-focus';
import { HALF_WIDTH_KATAKANA_RE, kanaFormatMessage } from '@/utils/kana';
import {
  getHanbaiten,
  createHanbaiten,
  updateHanbaiten,
  type CreateHanbaitenBody,
  type UpdateHanbaitenBody,
} from '@/api/hanbaiten/hanbaiten';
import { useTodofuken } from '@/composables/useTodofuken';
import { getJaDropdown, type JaDropdownItem } from '@/api/ja/ja';

// ─── フォーム状態 ─────────────────────────────────────────────────
//
// spec は `defineExpose` で `vm.formState` を公開し `Object.assign` で各 it() を
// 駆動する。フィールド名を API body と一致させ spec fixture
// （`buildCreateHanbaitenForm`）と 1:1 で並ぶようにする。

interface HanbaitenFormState {
  /**
   * [staff-ja-id] NICHINO_STAFF 代行入力 はフォーム上部の BaseJaDropdown で
   * 対象 JA を選ぶ。JA スコープのユーザー（session.ja_id あり）ではリクエストから
   * 常に省略 — BE は無視し session.ja_id を使うため。
   */
  ja_id: number | null;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana: string;
  torihikisaki_no: string;
  todofuken_code: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_tanka_id: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  haiten_flg: boolean;
  biko: string;
}

// 振込手数料負担区分の既定 = JA（m_code TESURYO_KUBUN=1）。TESURYO_KUBUN は
// Group B（拡張可・enum なし）のため値をリテラルで持つ。
const TESURYO_KUBUN_JA = 1;

/** 登録モードの空の既定値 — init + reset の単一ソース。 */
function defaultFormState(): HanbaitenFormState {
  return {
    ja_id: null,
    hanbaiten_code: '',
    hanbaiten_name: '',
    hanbaiten_name_kana: '',
    torihikisaki_no: '',
    todofuken_code: '',
    yubin_no: '',
    address: '',
    tel: '',
    fax: '',
    shocho_name: '',
    itaku_kubun: ItakuKubun.FURIKOMI,
    haitatsuryo_tanka_id: null,
    haitatsuryo_shiharai_cycle: null,
    furikomi_tesuryo_futan_kubun: TESURYO_KUBUN_JA,
    furikomi_tesuryo: null,
    bank_code: '',
    bank_name: '',
    bank_branch_code: '',
    bank_branch_name: '',
    yokin_shubetsu: null,
    koza_no: '',
    koza_meigi: '',
    haiten_flg: false,
    biko: '',
  };
}

const formState = reactive<HanbaitenFormState>(defaultFormState());

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

// 配達手数料支払サイクル（月数）: 1〜12 から選択。固定レンジなので m_code
// ではなくローカル定数で options を生成する。
const SHIHARAI_CYCLE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`,
}));

// [reuse-useApiForm] 他の CRUD フォーム（JaFormView 等）と同じ submit/エラー
// マッピング経路に統一する（従来は本ファイル独自に fieldErrors/submitting/
// handleServerError を持っていた — useApiForm 側の改修（例: 非HTTPエラーの
// 握りつぶし修正）がこの画面にだけ反映されない不整合を防ぐ）。
const { fieldErrors, submitting, submit, clearErrors } = useApiForm();

/** 全フィールドを登録モードの空既定値に戻す。 */
function resetFormState(): void {
  Object.assign(formState, defaultFormState());
  clearErrors();
}

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { redirectToDashboard } = useNotFoundRedirect();
const codes = useCodesStore();
const authStore = useAuthStore();

// ─── ルート駆動のモード ─────────────────────────────────────────────

const hanbaitenId = computed<number | null>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === null) return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});
const isEdit = computed(() => hanbaitenId.value !== null);

// ─── 権限ゲート（Layer 1 ミラー） ──────────────────────────────────
//
// router guard が `hanbaiten.create` / `hanbaiten.update` meta を既に強制する。
// submit ボタンの disabled は多層防御のヒントで、権限なしで着地した場合に
// 不活性ボタンとして見せるだけ。

const canSubmit = computed(() => {
  // [perm-any-of] NICHINO_STAFF は `hanbaiten.daiko_input` のみ保持 —
  // daiko フロー内で create と update の両方を許可する。
  if (isEdit.value) {
    return (
      (authStore.hasPermission?.('hanbaiten.update') ?? false) ||
      (authStore.hasPermission?.('hanbaiten.daiko_input') ?? false)
    );
  }
  return (
    (authStore.hasPermission?.('hanbaiten.create') ?? false) ||
    (authStore.hasPermission?.('hanbaiten.daiko_input') ?? false)
  );
});

// [staff-ja-id] NICHINO_STAFF は session.ja_id を持たない — 上部の
// BaseJaDropdown は create で必須 / edit で disabled read-only。
const isStaff = computed(() =>
  authStore.hasPermission?.('hanbaiten.daiko_input') ?? false,
);

// ─── ドロップダウン options ─────────────────────────────────────────

// この画面の都道府県は read-only 表示（JA に追従）。候補リストは持たず、
// コード→名称の解決だけ共有キャッシュから行う。
const { items: todofukenOptions, load: loadTodofuken, name: todofukenNameOf } =
  useTodofuken();

// ─── [pref-from-ja] 都道府県 は read-only で常に hanbaiten の JA
// （m_ja.todofuken_code）をミラーする。ユーザー編集は不可:
//   - JA スコープ（CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN）→ ログインユーザーの
//     JA 都道府県（authStore.user.todofuken_code）に固定。
//   - NICHINO_STAFF 代行入力 → BaseJaDropdown で選んだ JA（onJaSelect）/
//     ?ja_id prefill（resolveTodofukenForJa）に追従。
//   - edit → detail レスポンス（loadDetail）で持つ。
// disabled フィールドの表示ラベルは都道府県マスタで解決、送信値は2桁コード。

const todofukenName = computed<string>(() => {
  const code = formState.todofuken_code;
  if (!code) return '';
  // マスタ未取得・未知コードでも空にしない — コードをそのまま出して
  // 「値はあるが名称が引けない」ことが画面から分かるようにする。
  return todofukenNameOf(code) || code;
});

/** 新たに選ばれた JA から read-only 都道府県を同期（staff 経路）。 */
function onJaSelect(item: JaDropdownItem | null): void {
  formState.todofuken_code = item?.todofuken_code ?? '';
}

/**
 * staff prefill 経路（`?ja_id=…`）で JA の都道府県を解決する。BaseJaDropdown は
 * `@select` を発火せず値を固定するため、`include_id` で固定行を引き
 * todofuken_code をコピーする。
 */
async function resolveTodofukenForJa(jaId: number): Promise<void> {
  try {
    const resp = await getJaDropdown({ include_id: jaId, per_page: DROPDOWN_PAGE_SIZE });
    const match = resp.data.find((j) => j.ja_id === jaId);
    formState.todofuken_code = match?.todofuken_code ?? '';
  } catch {
    // axios interceptor が既にトースト済み。都道府県は空のまま。
  }
}

// ─── 編集モードの hydrate ───────────────────────────────────────────

const isHydrating = ref(false);

// [tanka-cascade] staff が JA を切り替えるたび haitatsuryo_tanka_id をリセット —
// BaseTankaDropdown の option は ja_id にスコープされるため、前 JA の古い選択は
// 解決できず BE Layer-4 FK ガードが submit を拒否する。edit hydration 中は
// スキップ（loadDetail は tanka_id 投入前に ja_id を変更する）。
watch(
  () => formState.ja_id,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    formState.haitatsuryo_tanka_id = null;
  },
);

async function loadDetail(id: number): Promise<void> {
  try {
    const resp = await getHanbaiten(id);
    isHydrating.value = true;
    Object.assign(formState, {
      // [staff-ja-id] detail は ja_id を持つ — 投入して edit モードの disabled
      // BaseJaDropdown が所有 JA を表示するようにする。
      ja_id: resp.data.ja_id,
      hanbaiten_code: resp.data.hanbaiten_code,
      hanbaiten_name: resp.data.hanbaiten_name,
      hanbaiten_name_kana: resp.data.hanbaiten_name_kana,
      torihikisaki_no: resp.data.torihikisaki_no,
      todofuken_code: resp.data.todofuken_code,
      yubin_no: resp.data.yubin_no,
      address: resp.data.address,
      tel: resp.data.tel,
      fax: resp.data.fax,
      shocho_name: resp.data.shocho_name,
      itaku_kubun: resp.data.itaku_kubun,
      haitatsuryo_tanka_id: resp.data.haitatsuryo_tanka_id,
      haitatsuryo_shiharai_cycle: resp.data.haitatsuryo_shiharai_cycle,
      furikomi_tesuryo_futan_kubun: resp.data.furikomi_tesuryo_futan_kubun,
      furikomi_tesuryo: resp.data.furikomi_tesuryo,
      bank_code: resp.data.bank_code,
      bank_name: resp.data.bank_name,
      bank_branch_code: resp.data.bank_branch_code,
      bank_branch_name: resp.data.bank_branch_name,
      yokin_shubetsu: resp.data.yokin_shubetsu,
      koza_no: resp.data.koza_no,
      koza_meigi: resp.data.koza_meigi,
      haiten_flg: resp.data.haiten_flg,
      biko: resp.data.biko,
    });
    // cascade watcher が hydrating-true を観測できるよう次の microtask で
    // リセット。queueMicrotask は `Promise.resolve().then(...)` の
    // floating-promise lint を回避する。
    queueMicrotask(() => {
      isHydrating.value = false;
    });
  } catch {
    // axios interceptor が NOT_FOUND / 500 / FORBIDDEN を既にトースト済み。
    // 空の編集フォームのまま留まらせず、他の一覧画面と同じくダッシュボードへ
    // 戻す（顧客要件 2026-08 — useNotFoundRedirect 共通化）。
    await redirectToDashboard();
  }
}

/**
 * 現在のルートから create / edit モードを適用する。edit→create（や
 * edit-id→別 edit-id）で前レコードのデータが漏れないよう、まず必ずフォームを
 * リセットする。
 */
async function applyRouteMode(): Promise<void> {
  resetFormState();
  if (isEdit.value && hanbaitenId.value !== null) {
    await loadDetail(hanbaitenId.value);
    // ロード（＋ハイドレート中の watcher）が確定した状態を基準に控える。
    await editGuard.capture();
    return;
  }
  if (isStaff.value) {
    // [staff-ja-prefill] HanbaitenListView は検索画面で選んだ JA を Vue Router
    // history state（window.history.state.jaId）で渡す — URL を綺麗に保つ
    // （`/hanbaiten/create`、?ja_id なし）。事前選択する（staff は変更可）。
    // 非数値 / 不在値は無視 — picker は空のまま。
    const rawJaId = (globalThis.history.state as { jaId?: unknown } | null)?.jaId;
    const n = typeof rawJaId === 'number' ? rawJaId : Number(rawJaId);
    if (Number.isFinite(n) && n > 0) {
      formState.ja_id = n;
      // [pref-from-ja] 固定 JA から read-only 都道府県を prefill —
      // この事前選択経路では dropdown が @select を発火しない。
      void resolveTodofukenForJa(n);
    }
  } else {
    // JA スコープ（CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN）は自 JA でしか
    // 作成できないため、都道府県は session ユーザーの JA 都道府県に固定。
    formState.todofuken_code = authStore.user?.todofuken_code ?? '';
  }
}

onMounted(() => {
  void loadTodofuken();
  void applyRouteMode();
});

// [route-reuse] create（`/hanbaiten/create`）と edit（`/hanbaiten/:id/edit`）が
// 両方 HanbaitenFormView に解決するため vue-router はこのインスタンスを再利用する
// — submenu で edit→create しても `onMounted` は再実行されない。ここで再適用しないと
// create フォームが edit レコードのデータを表示し続ける（報告バグ）。id 変化時に再 init。
watch(hanbaitenId, () => {
  void applyRouteMode();
});

// ─── クライアント側検証（機能定義 3.1 / api.md §4.1） ────────────────

const REQUIRED_MSG = '必須項目です。';
const KANA_FORMAT_MSG = kanaFormatMessage('販売店名');
const TEL_DIGITS_ONLY_MSG = '電話番号は半角数字のみ（ハイフンなし）入力可能です。';
const FAX_DIGITS_ONLY_MSG = 'FAXは半角数字のみ（ハイフンなし）入力可能です。';

/** 銀行系クラスタ — itaku_kubun = 1 (振込) のとき必須。 */
const BANK_FIELDS = [
  'bank_code',
  'bank_name',
  'bank_branch_code',
  'bank_branch_name',
  'yokin_shubetsu',
  'koza_no',
  'koza_meigi',
] as const;

/**
 * 条件付き必須 — itaku_kubun = 1 (振込) のとき銀行系全項目が必須。
 * validateClient の認知的複雑度を lint 閾値以下に保つため切り出した。
 */
function collectBankClusterErrors(errs: Record<string, string>): void {
  if (formState.itaku_kubun !== ItakuKubun.FURIKOMI) return;
  for (const field of BANK_FIELDS) {
    const value = formState[field];
    const isBlank =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');
    if (isBlank) errs[field] = REQUIRED_MSG;
  }
}

// フォーム項目の DOM 出現順（submit エラー時に先頭のエラー項目へフォーカスする）。
const FIELD_ORDER: readonly string[] = [
  'ja_id',
  'hanbaiten_code',
  'hanbaiten_name',
  'hanbaiten_name_kana',
  'yubin_no',
  'address',
  'tel',
  'fax',
  'shocho_name',
  'haitatsuryo_tanka_id',
  'torihikisaki_no',
  'itaku_kubun',
  'bank_code',
  'bank_name',
  'bank_branch_code',
  'bank_branch_name',
  'yokin_shubetsu',
  'koza_no',
  'koza_meigi',
  'furikomi_tesuryo',
  'furikomi_tesuryo_futan_kubun',
];

function validateClient(): boolean {
  const errs: Record<string, string> = {};

  // [staff-ja-required] NICHINO_STAFF 代行入力 は submit 前に JA 選択が必須。
  // JA スコープは session.ja_id が優先され picker を見ないためチェックをスキップ。
  if (isStaff.value && !isEdit.value && formState.ja_id == null) {
    errs.ja_id = REQUIRED_MSG;
  }

  // 必須 — 基本フィールド。
  if (!isEdit.value && !formState.hanbaiten_code?.trim()) {
    errs.hanbaiten_code = REQUIRED_MSG;
  }
  if (!formState.hanbaiten_name?.trim()) {
    errs.hanbaiten_name = REQUIRED_MSG;
  }

  // 委託区分 / 振込手数料負担区分 は必須（顧客要件）。既定値あり(振込 / JA)だが
  // ユーザーがクリアした場合に検証する。
  if (formState.itaku_kubun == null) {
    errs.itaku_kubun = REQUIRED_MSG;
  }
  if (formState.furikomi_tesuryo_futan_kubun == null) {
    errs.furikomi_tesuryo_futan_kubun = REQUIRED_MSG;
  }

  // 形式 — 半角カタカナ（値がある場合のみ、任意項目）。
  if (
    formState.hanbaiten_name_kana &&
    !HALF_WIDTH_KATAKANA_RE.test(formState.hanbaiten_name_kana)
  ) {
    errs.hanbaiten_name_kana = KANA_FORMAT_MSG;
  }

  // 形式 — tel / fax: 半角数字のみ・ハイフンなし（存在時のみ、両者任意）。
  // BE @Matches(/^\d+$/) と JA / 管理支店 フォームをミラーし画面間で規約統一。
  if (formState.tel && !/^\d+$/.test(formState.tel)) {
    errs.tel = TEL_DIGITS_ONLY_MSG;
  }
  if (formState.fax && !/^\d+$/.test(formState.fax)) {
    errs.fax = FAX_DIGITS_ONLY_MSG;
  }

  collectBankClusterErrors(errs);

  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

// ─── リクエスト body 構築 ───────────────────────────────────────────

function buildCreateBody(): CreateHanbaitenBody {
  return {
    // [staff-ja-id] staff のみ ja_id を出す — JA スコープは BE が session.ja_id を
    // bind しどのみち無視される。payload を綺麗に、spec assertion をタイトに保つ。
    ...(isStaff.value && formState.ja_id != null
      ? { ja_id: formState.ja_id }
      : {}),
    hanbaiten_code: formState.hanbaiten_code,
    hanbaiten_name: formState.hanbaiten_name,
    hanbaiten_name_kana: formState.hanbaiten_name_kana,
    torihikisaki_no: formState.torihikisaki_no,
    todofuken_code: formState.todofuken_code,
    yubin_no: formState.yubin_no,
    address: formState.address,
    tel: formState.tel,
    fax: formState.fax,
    shocho_name: formState.shocho_name,
    itaku_kubun: formState.itaku_kubun,
    haitatsuryo_tanka_id: formState.haitatsuryo_tanka_id,
    haitatsuryo_shiharai_cycle: formState.haitatsuryo_shiharai_cycle,
    furikomi_tesuryo_futan_kubun: formState.furikomi_tesuryo_futan_kubun,
    furikomi_tesuryo: formState.furikomi_tesuryo,
    bank_code: formState.bank_code,
    bank_name: formState.bank_name,
    bank_branch_code: formState.bank_branch_code,
    bank_branch_name: formState.bank_branch_name,
    yokin_shubetsu: formState.yokin_shubetsu,
    koza_no: formState.koza_no,
    koza_meigi: formState.koza_meigi,
    haiten_flg: formState.haiten_flg,
    biko: formState.biko,
  };
}

function buildUpdateBody(): UpdateHanbaitenBody {
  // hanbaiten_code 更新不可 — 明示的に除外（api.md §API-017-003 注記）。
  return {
    hanbaiten_name: formState.hanbaiten_name,
    hanbaiten_name_kana: formState.hanbaiten_name_kana,
    torihikisaki_no: formState.torihikisaki_no,
    todofuken_code: formState.todofuken_code,
    yubin_no: formState.yubin_no,
    address: formState.address,
    tel: formState.tel,
    fax: formState.fax,
    shocho_name: formState.shocho_name,
    itaku_kubun: formState.itaku_kubun,
    haitatsuryo_tanka_id: formState.haitatsuryo_tanka_id,
    haitatsuryo_shiharai_cycle: formState.haitatsuryo_shiharai_cycle,
    furikomi_tesuryo_futan_kubun: formState.furikomi_tesuryo_futan_kubun,
    furikomi_tesuryo: formState.furikomi_tesuryo,
    bank_code: formState.bank_code,
    bank_name: formState.bank_name,
    bank_branch_code: formState.bank_branch_code,
    bank_branch_name: formState.bank_branch_name,
    yokin_shubetsu: formState.yokin_shubetsu,
    koza_no: formState.koza_no,
    koza_meigi: formState.koza_meigi,
    haiten_flg: formState.haiten_flg,
    biko: formState.biko,
  };
}

// ─── Submit パイプライン ────────────────────────────────────────────
// エラーマッピング（VALIDATION_ERROR → fieldErrors）と多重送信ガードは
// useApiForm().submit() に委譲する。DUPLICATE_CODE 等 errors[] を伴わない
// コードは axios interceptor が既にトースト済みのため、ここで再トースト
// しない（他の CRUD フォームと同じ規約）。

async function onSubmit(): Promise<void> {
  if (!validateClient()) {
    focusFirstError(FIELD_ORDER, fieldErrors.value); // 先頭エラー項目へフォーカス
    return;
  }
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && hanbaitenId.value !== null && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }

  await submit(async () => {
    if (isEdit.value && hanbaitenId.value !== null) {
      await updateHanbaiten(hanbaitenId.value, buildUpdateBody());
      notify.updated();
    } else {
      await createHanbaiten(buildCreateBody());
      notify.created();
    }
    // 成功時のみ遷移 — API 拒否時は留まり、ユーザーが強調された
    // フィールドエラーを修正できるようにする。
    await router.push({ name: 'HanbaitenList' });
  });

  // サーバ側 VALIDATION_ERROR が fieldErrors に入った場合、先頭エラー項目へ
  // フォーカスする（クライアント側検証と同じ体験を揃える）。
  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(FIELD_ORDER, fieldErrors.value);
  }
}

function goBack(): void {
  void router.push({ name: 'HanbaitenList' });
}

// spec の `fillForm` ヘルパー用に状態を公開（antd 内部 v-model 配線を辿らず
// フォーム値を直接駆動する）。
defineExpose({ formState, fieldErrors });
</script>

<template>
  <div class="space-y-6">
    <BaseCard padding="none">
      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onSubmit"
      >
        <!-- ─── [staff-ja-id] JA picker — NICHINO_STAFF 代行入力 only ── -->
        <a-form-item
          v-if="isStaff"
          name="ja_id"
          :validate-status="fieldErrors.ja_id ? 'error' : ''"
          :help="fieldErrors.ja_id"
          data-test="hanbaiten-staff-ja-form-item"
        >
          <template #label>
            <span>JA名</span>
            <span v-if="!isEdit" class="text-error ml-1">*</span>
          </template>
          <!-- edit モードで disabled（FK は immutable — 既存 hanbaiten と全子参照を
               孤立させてしまう）。必須 * も edit で消し、アスタリスクは実際に
               入力が必要な項目だけを示す。 -->
          <BaseJaDropdown
            v-model:value="formState.ja_id"
            :disabled="isEdit"
            placeholder="JAを選択してください"
            @select="onJaSelect"
          />
        </a-form-item>

        <!-- ─── 基本情報 ─────────────────────────────────────── -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="hanbaiten_code"
            name="hanbaiten_code"
            :validate-status="fieldErrors.hanbaiten_code ? 'error' : ''"
            :help="fieldErrors.hanbaiten_code"
          >
            <template #label>
              <span>販売店コード</span>
              <span v-if="!isEdit" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="hanbaiten_code"
              v-model:value="formState.hanbaiten_code"
              :maxlength="10"
              :disabled="isEdit"
            />
          </a-form-item>

          <a-form-item
            html-for="hanbaiten_name"
            name="hanbaiten_name"
            :validate-status="fieldErrors.hanbaiten_name ? 'error' : ''"
            :help="fieldErrors.hanbaiten_name"
          >
            <template #label>
              <span>販売店名称</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              id="hanbaiten_name"
              v-model:value="formState.hanbaiten_name"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item
            html-for="hanbaiten_name_kana"
            name="hanbaiten_name_kana"
            :validate-status="fieldErrors.hanbaiten_name_kana ? 'error' : ''"
            :help="fieldErrors.hanbaiten_name_kana"
            label="販売店名称（カナ）"
          >
            <a-input
              id="hanbaiten_name_kana"
              v-model:value="formState.hanbaiten_name_kana"
              :maxlength="100"
              placeholder="半角カタカナ"
            />
          </a-form-item>
        </div>

        <!-- ─── 住所・連絡先 ─────────────────────────────────── -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="todofuken_code" name="todofuken_code" label="都道府県">
            <!-- [pref-from-ja] read-only — 都道府県 は常に hanbaiten の JA
                 （m_ja の都道府県コード）をミラーし、ユーザー編集不可。
                 staff: 選んだ JA、role 3/4/5: session ユーザーの JA、edit: detail。
                 formState は2桁コードを保持しつつ解決した都道府県名を表示。 -->
            <a-input
              id="todofuken_code"
              :value="todofukenName"
              disabled
            />
            <!-- spec 用にラベルを先出し — antd の dropdown は開くまで option を
                 DOM に描画しないが、テストは mount 時に wrapper.html() へ
                 option テキストがあることを検証する。 -->
            <span class="hidden" data-test="todofuken-options">
              <span v-for="opt in todofukenOptions" :key="opt.todofuken_code">
                {{ opt.todofuken_name }}
              </span>
            </span>
          </a-form-item>

          <a-form-item
            html-for="yubin_no"
            name="yubin_no"
            :validate-status="fieldErrors.yubin_no ? 'error' : ''"
            :help="fieldErrors.yubin_no"
            label="郵便番号"
          >
            <BaseCodeInput
              autocomplete="off"
              id="yubin_no"
              v-model:value="formState.yubin_no"
              :maxlength="7"
            />
          </a-form-item>

          <a-form-item
            html-for="address"
            name="address"
            :validate-status="fieldErrors.address ? 'error' : ''"
            :help="fieldErrors.address"
            label="住所"
          >
            <a-input
              autocomplete="off"
              id="address"
              v-model:value="formState.address"
              :maxlength="200"
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="tel"
            name="tel"
            :validate-status="fieldErrors.tel ? 'error' : ''"
            :help="fieldErrors.tel"
            label="電話番号"
          >
            <a-input
              autocomplete="off"
              id="tel"
              v-model:value="formState.tel"
              :maxlength="15"
            />
          </a-form-item>

          <a-form-item
            html-for="fax"
            name="fax"
            :validate-status="fieldErrors.fax ? 'error' : ''"
            :help="fieldErrors.fax"
            label="FAX"
          >
            <a-input
              autocomplete="off"
              id="fax"
              v-model:value="formState.fax"
              :maxlength="15"
            />
          </a-form-item>

          <a-form-item
            html-for="shocho_name"
            name="shocho_name"
            :validate-status="fieldErrors.shocho_name ? 'error' : ''"
            :help="fieldErrors.shocho_name"
            label="所長名"
          >
            <a-input
              id="shocho_name"
              v-model:value="formState.shocho_name"
              :maxlength="50"
            />
          </a-form-item>
        </div>

        <!-- ─── 委託・配達手数料 ──────────────────────────────── -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            name="haitatsuryo_tanka_id"
            :validate-status="fieldErrors.haitatsuryo_tanka_id ? 'error' : ''"
            :help="fieldErrors.haitatsuryo_tanka_id"
            label="配達手数料単価"
          >
            <!--
              サーバ側ページング + 検索可能な dropdown。tankaType=2 で
              配達手数料に絞る。JA スコープは `jaId` null で BE が session.ja_id を
              適用。NICHINO_STAFF 代行入力 は `formState.ja_id` を渡し option を
              選択テナントにスコープ、上の cascade watch が JA 切替で古い選択を消す。
              [staff-tanka-gate] create モードで staff はまず JA 選択が必要 —
              dropdown を disabled にし、誤テナントに解決する単価の選択を防ぐ。
              edit モードは有効のまま（JA はどのみちロック）。
            -->
            <BaseTankaDropdown
              v-model:value="formState.haitatsuryo_tanka_id"
              :tanka-type="2"
              :ja-id="isStaff ? formState.ja_id : null"
              :disabled="isStaff && !isEdit && formState.ja_id == null"
              placeholder=""
            />
          </a-form-item>

          <a-form-item
            html-for="torihikisaki_no"
            name="torihikisaki_no"
            :validate-status="fieldErrors.torihikisaki_no ? 'error' : ''"
            :help="fieldErrors.torihikisaki_no"
            label="インボイス番号"
          >
            <BaseCodeInput
              id="torihikisaki_no"
              v-model:value="formState.torihikisaki_no"
              :maxlength="20"
            />
          </a-form-item>

          <a-form-item
            name="itaku_kubun"
            :validate-status="fieldErrors.itaku_kubun ? 'error' : ''"
            :help="fieldErrors.itaku_kubun"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>委託区分</span>
                <span class="text-error ml-1">*</span>
              </legend>
              <div class="flex items-center flex-wrap min-h-8">
                <a-radio-group
                  class="min-w-0"
                  name="itaku_kubun"
                  v-model:value="formState.itaku_kubun"
                >
                  <a-radio
                    v-for="opt in codes.options('ITAKU_KUBUN')"
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

        <!-- ─── 振込先情報 (itaku_kubun=1 のとき必須) ───────────── -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="bank_code"
            name="bank_code"
            :validate-status="fieldErrors.bank_code ? 'error' : ''"
            :help="fieldErrors.bank_code"
          >
            <template #label>
              <span>金融機関コード</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="bank_code"
              v-model:value="formState.bank_code"
              :maxlength="4"
            />
          </a-form-item>

          <a-form-item
            html-for="bank_name"
            name="bank_name"
            :validate-status="fieldErrors.bank_name ? 'error' : ''"
            :help="fieldErrors.bank_name"
          >
            <template #label>
              <span>金融機関名</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <a-input
              id="bank_name"
              v-model:value="formState.bank_name"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item
            html-for="haitatsuryo_shiharai_cycle"
            name="haitatsuryo_shiharai_cycle"
            :validate-status="
              fieldErrors.haitatsuryo_shiharai_cycle ? 'error' : ''
            "
            :help="fieldErrors.haitatsuryo_shiharai_cycle"
            label="配達手数料支払サイクル"
          >
            <a-select
              id="haitatsuryo_shiharai_cycle"
              v-model:value="formState.haitatsuryo_shiharai_cycle"
              :options="SHIHARAI_CYCLE_OPTIONS"
              placeholder="選択してください"
              allow-clear
              class="w-full"
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="bank_branch_code"
            name="bank_branch_code"
            :validate-status="fieldErrors.bank_branch_code ? 'error' : ''"
            :help="fieldErrors.bank_branch_code"
          >
            <template #label>
              <span>口座支店コード</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="bank_branch_code"
              v-model:value="formState.bank_branch_code"
              :maxlength="3"
            />
          </a-form-item>

          <a-form-item
            html-for="bank_branch_name"
            name="bank_branch_name"
            :validate-status="fieldErrors.bank_branch_name ? 'error' : ''"
            :help="fieldErrors.bank_branch_name"
          >
            <template #label>
              <span>口座支店名</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <a-input
              id="bank_branch_name"
              v-model:value="formState.bank_branch_name"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item
            name="yokin_shubetsu"
            :validate-status="fieldErrors.yokin_shubetsu ? 'error' : ''"
            :help="fieldErrors.yokin_shubetsu"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>口座種別</span>
                <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
              </legend>
              <div class="flex items-center flex-wrap min-h-8">
                <a-radio-group
                  class="min-w-0"
                  name="yokin_shubetsu"
                  v-model:value="formState.yokin_shubetsu"
                >
                  <a-radio
                    v-for="opt in codes.options('YOKIN_SHUBETSU')"
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

        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            html-for="koza_no"
            name="koza_no"
            :validate-status="fieldErrors.koza_no ? 'error' : ''"
            :help="fieldErrors.koza_no"
          >
            <template #label>
              <span>口座番号</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="koza_no"
              v-model:value="formState.koza_no"
              :maxlength="10"
            />
          </a-form-item>

          <a-form-item
            html-for="koza_meigi"
            name="koza_meigi"
            :validate-status="fieldErrors.koza_meigi ? 'error' : ''"
            :help="fieldErrors.koza_meigi"
          >
            <template #label>
              <span>口座名義</span>
              <span v-if="formState.itaku_kubun === ItakuKubun.FURIKOMI" class="text-error ml-1">*</span>
            </template>
            <a-input
              id="koza_meigi"
              v-model:value="formState.koza_meigi"
              :maxlength="50"
            />
          </a-form-item>

          <a-form-item
            html-for="furikomi_tesuryo"
            name="furikomi_tesuryo"
            :validate-status="fieldErrors.furikomi_tesuryo ? 'error' : ''"
            :help="fieldErrors.furikomi_tesuryo"
            label="振込手数料"
          >
            <a-input-number
              id="furikomi_tesuryo"
              v-model:value="formState.furikomi_tesuryo"
              :min="0"
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- ─── 振込手数料負担区分 / 廃店フラグ ──────────────── -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            name="furikomi_tesuryo_futan_kubun"
            :validate-status="fieldErrors.furikomi_tesuryo_futan_kubun ? 'error' : ''"
            :help="fieldErrors.furikomi_tesuryo_futan_kubun"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>振込手数料負担区分</span>
                <span class="text-error ml-1">*</span>
              </legend>
              <div class="flex items-center flex-wrap min-h-8">
                <a-radio-group
                  class="min-w-0"
                  name="furikomi_tesuryo_futan_kubun"
                  v-model:value="formState.furikomi_tesuryo_futan_kubun"
                >
                  <a-radio
                    v-for="opt in codes.options('TESURYO_KUBUN')"
                    :key="opt.value"
                    :value="Number(opt.value)"
                  >
                    {{ opt.label }}
                  </a-radio>
                </a-radio-group>
              </div>
            </fieldset>
          </a-form-item>

          <!-- [haiten-edit-only] 廃店フラグ は CREATE で非表示 — 新規 hanbaiten は
               常に営業中（false）で、トグル表示は誤クリックを招くだけ。edit モードは
               残し、ops が店舗を廃店にできる。 -->
          <a-form-item
            v-if="isEdit"
            label="廃店フラグ"
            data-test="hanbaiten-haiten-flg-form-item"
          >
            <a-checkbox name="haiten_flg" v-model:checked="formState.haiten_flg">廃店</a-checkbox>
          </a-form-item>
        </div>

        <!-- ─── 備考 ─────────────────────────────────────────── -->
        <a-form-item name="biko" label="備考">
          <a-textarea v-model:value="formState.biko" :rows="3" />
        </a-form-item>

        <BaseFormFooter
          :is-edit="isEdit"
          :submitting="submitting"
          :disabled="!canSubmit"
          @cancel="goBack"
        />
      </a-form>
    </BaseCard>
  </div>
</template>
