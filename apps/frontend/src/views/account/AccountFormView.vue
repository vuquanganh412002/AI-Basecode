<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AxiosError } from 'axios';
import { message } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { focusFirstError } from '@/utils/form-focus';
import { useAuthStore } from '@/stores/auth.store';
import {
  getAccount,
  createAccount,
  updateAccount,
  type AccountDetail,
  type CreateAccountBody,
  type UpdateAccountBody,
} from '@/api/account/account';
import {
  listRolesDropdown,
  type RoleDropdownItem,
} from '@/api/roles/roles';
import { getTodofukenList, type TodofukenItem } from '@/api/todofuken/todofuken';
import { DROPDOWN_MAX_PAGE_SIZE } from '@/constants/pagination';
import { getJaDropdown, type JaDropdownItem } from '@/api/ja/ja';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';
import { getShitenDropdown, type ShitenDropdownItem } from '@/api/shiten/shiten';
import { RoleCode } from '@/constants/enums';

interface AccountFormState {
  login_id: string;
  password: string;
  role_id: number | null;
  todofuken_code: string | null;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  // 所属支店（顧客要件 2026-07）— JA管理支店ロールのみ・任意。設定するとその支店の
  // 読者しか扱えず帳票5画面が使用不可になる。
  shiten_id: number | null;
  account_name: string;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  /** 編集専用 — getAccount から hydrate、admin がトグルしたときだけ送信。 */
  account_lock_flg: boolean;
  biko: string;
}

// ─── アクセス制御（機能定義 1.1） ─────────────────────────────────────
// SCR-025 は日農管理者のみアクセス可。view 側ガードで API も叩かない。
const authStore = useAuthStore();
const isAdmin = computed(
  () => authStore.user?.role_code === RoleCode.NICHINO_ADMIN,
);
const ACCESS_DENIED_MSG = 'アクセス権がありません。';

const route = useRoute();
const router = useRouter();
const notify = useNotify();

const accountId = computed<number | null>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === null) return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});
const isEdit = computed(() => accountId.value !== null);

const formState = reactive<AccountFormState>({
  login_id: '',
  password: '',
  role_id: null,
  todofuken_code: null,
  ja_id: null,
  kanri_shiten_id: null,
  shiten_id: null,
  account_name: '',
  email: '',
  sub_email_1: '',
  sub_email_2: '',
  sub_email_3: '',
  paper_flg: false,
  denshi_flg: false,
  account_lock_flg: false,
  biko: '',
});

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

const fieldErrors = ref<Record<string, string>>({});
const submitting = ref(false);

// ─── ドロップダウン状態 ───────────────────────────────────────────────
const roleOptions = ref<RoleDropdownItem[]>([]);
const todofukenOptions = ref<TodofukenItem[]>([]);
const jaOptions = ref<JaDropdownItem[]>([]);
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);
const shitenOptions = ref<ShitenDropdownItem[]>([]);

// `hydrateFromDetail`（編集モード）や他のプログラム的一括ロードは、そのままだと
// 下の cascade watcher を誤発火させる — 同一 tick で `todofuken_code` と `ja_id` を
// 設定すると todofuken watcher が先に走り代入直後の ja_id を消す。ロード中はこの
// フラグを立て、true の間は watcher を no-op にし、次の USER 操作で通常挙動に戻す。
const isHydrating = ref(false);

// 機能定義 4.x — ロールによるドロップダウンの表示制御.
//   日農 (NICHINO_ADMIN / NICHINO_STAFF): 都道府県 / JA / 管理支店 非表示
//   CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN: 都道府県 + JA 表示
//   JA_KANRI_SHITEN のみ: 管理支店も表示
// 選択中ロールの role_code で分岐する。role_id (m_roles の BIGSERIAL PK、
// seeder 採番順依存) を直接ハードコードしない — BE 側の dropdown カスケード
// と同じ方針 (ja.service.ts)。role_code は roleOptions に同梱されている。
const selectedRoleCode = computed(
  () =>
    roleOptions.value.find((r) => r.role_id === formState.role_id)?.role_code ??
    null,
);
const isJaScopedRole = (code: string | null): boolean =>
  code === RoleCode.CHUOKAI ||
  code === RoleCode.JA_HONTEN ||
  code === RoleCode.JA_KANRI_SHITEN;

const showTodofuken = computed(() => isJaScopedRole(selectedRoleCode.value));
const showJa = computed(() => isJaScopedRole(selectedRoleCode.value));
const showKanriShiten = computed(
  () => selectedRoleCode.value === RoleCode.JA_KANRI_SHITEN,
);
// 所属支店は JA管理支店ロール かつ 管理支店を選択済みのときのみ表示（任意）。
const showShiten = computed(
  () =>
    selectedRoleCode.value === RoleCode.JA_KANRI_SHITEN &&
    formState.kanri_shiten_id != null,
);

// ─── マウント / 編集モードロード ───────────────────────────────────────
async function fetchRoleOptions(): Promise<void> {
  try {
    const resp = await listRolesDropdown();
    roleOptions.value = resp.data;
  } catch {
    roleOptions.value = [];
  }
}

async function fetchTodofukenOptions(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    // BE envelope は `{ data: [...] }`。spec fixture は素の配列も渡す
    // （buildTodofukenList）— 両形を受理。
    todofukenOptions.value = Array.isArray(resp)
      ? (resp as unknown as TodofukenItem[])
      : resp.data;
  } catch {
    todofukenOptions.value = [];
  }
}

async function fetchJaOptions(todofukenCode: string, roleId: number | null): Promise<void> {
  try {
    const resp = await getJaDropdown({
      todofuken_code: todofukenCode,
      role_id: roleId ?? undefined,
      per_page: DROPDOWN_MAX_PAGE_SIZE,
    });
    jaOptions.value = resp.data;
  } catch {
    jaOptions.value = [];
  }
}

async function fetchKanriShitenOptions(jaId: number): Promise<void> {
  try {
    const resp = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = resp.data;
  } catch {
    kanriShitenOptions.value = [];
  }
}

// 所属支店ドロップダウン（顧客要件 2026-07）— 管理支店配下の支店を返す。
async function fetchShitenOptions(
  kanriShitenId: number,
  jaId: number | null,
): Promise<void> {
  try {
    const resp = await getShitenDropdown({
      kanri_shiten_id: kanriShitenId,
      ja_id: jaId ?? undefined,
      per_page: DROPDOWN_MAX_PAGE_SIZE,
    });
    shitenOptions.value = resp.data;
  } catch {
    shitenOptions.value = [];
  }
}

function hydrateFromDetail(detail: AccountDetail): void {
  // 編集モードの事前入力 — login_id は read-only、password は空欄（空欄=保持）。
  // isHydrating でガードし、todofuken_code 設定時に cascade watcher が
  // 事前入力の ja_id / kanri_shiten_id を消さないようにする。
  isHydrating.value = true;
  formState.login_id = detail.login_id;
  formState.password = '';
  formState.role_id = detail.role_id;
  formState.todofuken_code = detail.todofuken_code;
  formState.ja_id = detail.ja_id;
  formState.kanri_shiten_id = detail.kanri_shiten_id;
  formState.shiten_id = detail.shiten_id;
  formState.account_name = detail.account_name;
  formState.email = detail.email;
  formState.sub_email_1 = detail.sub_email_1;
  formState.sub_email_2 = detail.sub_email_2;
  formState.sub_email_3 = detail.sub_email_3;
  formState.paper_flg = detail.paper_flg;
  formState.denshi_flg = detail.denshi_flg;
  formState.account_lock_flg = detail.account_lock_flg;
  formState.biko = detail.biko;
  // cascade watcher が走った後（flush:'pre' で次 tick に発火）に次の
  // microtask でリセットする。
  void Promise.resolve().then(() => {
    isHydrating.value = false;
  });
}

onMounted(async () => {
  // 機能定義 1.1 / 1.2 — 日農管理者のみアクセス可。
  // 非 admin: ACCESS_DENIED メッセージを表示し全 API 呼び出しをスキップ。
  if (!isAdmin.value) return;

  void fetchRoleOptions();
  void fetchTodofukenOptions();

  if (isEdit.value && accountId.value !== null) {
    try {
      const resp = await getAccount(accountId.value);
      hydrateFromDetail(resp.data);
      // hydrate 後、事前入力の選択が正しく描画されるよう cascade dropdown を
      // 順に読み込む。
      if (resp.data.todofuken_code) {
        void fetchJaOptions(resp.data.todofuken_code, resp.data.role_id);
      }
      if (resp.data.ja_id) {
        void fetchKanriShitenOptions(resp.data.ja_id);
      }
      if (resp.data.kanri_shiten_id) {
        void fetchShitenOptions(resp.data.kanri_shiten_id, resp.data.ja_id);
      }
      // ロード（＋ハイドレート中の watcher）が確定した状態を基準に控える。
      await editGuard.capture();
    } catch {
      // axios interceptor が NOT_FOUND / 500 をトースト — onMounted で crash せず
      // 空フィールドのまま view をマウントし続ける。
    }
  }
});

// ─── Cascade watcher（機能定義 5.x / 6.x） ───────────────────────────
// 3つの watcher は isHydrating 中 no-op になり、編集モード事前入力
// （同一 tick で todofuken_code, ja_id, kanri_shiten_id を代入）が
// cascade で自身の値を消さないようにする。
watch(
  () => formState.todofuken_code,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    // 新 todofuken の JA 一覧が届いたとき古い値が漏れないよう下流の選択をリセット。
    formState.ja_id = null;
    formState.kanri_shiten_id = null;
    formState.shiten_id = null;
    kanriShitenOptions.value = [];
    shitenOptions.value = [];
    if (next) {
      void fetchJaOptions(next, formState.role_id);
    } else {
      jaOptions.value = [];
    }
  },
);

watch(
  () => formState.ja_id,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    formState.kanri_shiten_id = null;
    formState.shiten_id = null;
    shitenOptions.value = [];
    if (next) {
      void fetchKanriShitenOptions(next);
    } else {
      kanriShitenOptions.value = [];
    }
  },
);

// 管理支店を切り替えたら所属支店をリセットし、配下の支店を読み込む（顧客要件 2026-07）。
watch(
  () => formState.kanri_shiten_id,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    formState.shiten_id = null;
    if (next) {
      void fetchShitenOptions(next, formState.ja_id);
    } else {
      shitenOptions.value = [];
    }
  },
);

// 機能定義 4.x — role_id 切替時に全ての従属項目をリセットする
// (顧客レビュー 2026-05 — 都道府県/JA/管理支店 を全て選び直し).
//
// [role-change-full-reset] 旧仕様は "新しい役割で隠れる項目だけ" を
// クリアしていたが、顧客から「役割を切り替えたら 3 項目とも選び直し
// たい」とフィードバック。理由: 役割 3→4 や 4→5 で同じカラムが
// 見え続けると、前の役割の選択値が残ったまま見えるので「これは
// このまま使うのか?」と判断ミスが起きる。
//
// [skip-initial-pick] `prev` が null/undefined のときはリセットしない。
// = 初回ピック(null → 値) と、新規フォームへの全フィールド一括代入
// (`Object.assign(formState, form)` 系) で隣接フィールドが先に
// 巻き戻されるのを防ぐ。実 UX で問題になるのは「すでに役割を選んだ
// 後で別の役割に切り替える」場面のみ。初回ピック時はもともと従属値が
// null なのでリセットしても観測差はない。
watch(
  () => formState.role_id,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    if (prev === null || prev === undefined) return;
    formState.todofuken_code = null;
    formState.ja_id = null;
    formState.kanri_shiten_id = null;
  },
);

// ─── クライアント側検証（機能定義 2.1） ───────────────────────────────
const REQUIRED_MSG = '必須項目です。';
const LOGIN_ID_FORMAT_MSG = 'ログインIDは半角英数字のみ入力可能です。';
const PASSWORD_FORMAT_MSG =
  'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。';
const EMAIL_FORMAT_MSG = '正しいメールアドレスを入力してください。';

const LOGIN_ID_RE = /^\w+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(value: string): boolean {
  if (value.length < 8 || value.length > 32) return false;
  const hasAlpha = /[A-Za-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(value);
  return [hasAlpha, hasDigit, hasSymbol].filter(Boolean).length >= 2;
}

// フォーム項目の DOM 出現順（submit エラー時に先頭のエラー項目へフォーカスする）。
const FIELD_ORDER: readonly string[] = [
  'login_id',
  'password',
  'role_id',
  'todofuken_code',
  'ja_id',
  'kanri_shiten_id',
  'shiten_id',
  'account_name',
  'email',
  'sub_email_1',
  'sub_email_2',
  'sub_email_3',
];

function validateClient(): boolean {
  const errs: Record<string, string> = {};

  // [required-table] 必須チェックをデータ駆動で回す。if 連鎖より認知的複雑度を
  // 下げ順序を明示（下の FIELD_ORDER が focus-first-error でこのリストに依存）。
  // clearable コントロールへの将来移行で TypeError にならないよう `?.trim()` を使う。
  // [email-required] QA バグ 2026-05 — 通知先メールアドレスは必須。紙版配送通知の
  // フォールバック先はプライマリメールのみで、SCR-023 の worker は空だと受信者を
  // 丸ごと落とすため、未設定のアカウントは何も受信できない。
  const requiredChecks: ReadonlyArray<readonly [string, boolean]> = [
    ['login_id', !isEdit.value && !formState.login_id?.trim()],
    ['password', !isEdit.value && !formState.password],
    ['role_id', formState.role_id === null || formState.role_id === undefined],
    ['account_name', !formState.account_name?.trim()],
    ['todofuken_code', showTodofuken.value && !formState.todofuken_code],
    ['ja_id', showJa.value && !formState.ja_id],
    ['kanri_shiten_id', showKanriShiten.value && !formState.kanri_shiten_id],
    ['email', !formState.email?.trim()],
  ];
  for (const [field, missing] of requiredChecks) {
    if (missing) errs[field] = REQUIRED_MSG;
  }

  // 形式チェック（値がある場合のみ — 同一項目では必須メッセージが形式より優先）。
  if (!errs.login_id && formState.login_id && !LOGIN_ID_RE.test(formState.login_id)) {
    errs.login_id = LOGIN_ID_FORMAT_MSG;
  }
  if (!errs.password && formState.password && !isStrongPassword(formState.password)) {
    errs.password = PASSWORD_FORMAT_MSG;
  }
  if (!errs.email && formState.email && !EMAIL_RE.test(formState.email)) {
    errs.email = EMAIL_FORMAT_MSG;
  }

  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

// ─── Submit パイプライン ──────────────────────────────────────────────
function buildCreateBody(): CreateAccountBody {
  return {
    login_id: formState.login_id,
    password: formState.password,
    role_id: formState.role_id as number,
    todofuken_code: formState.todofuken_code,
    ja_id: formState.ja_id,
    kanri_shiten_id: formState.kanri_shiten_id,
    // 所属支店 — JA管理支店ロール以外は BE が破棄するため null 固定送信。
    shiten_id: showShiten.value ? formState.shiten_id : null,
    account_name: formState.account_name,
    email: formState.email,
    sub_email_1: formState.sub_email_1,
    sub_email_2: formState.sub_email_2,
    sub_email_3: formState.sub_email_3,
    paper_flg: formState.paper_flg,
    denshi_flg: formState.denshi_flg,
    biko: formState.biko,
  };
}

function buildUpdateBody(): UpdateAccountBody {
  return {
    // 空パスワード = 変更なし（BE DTO は空を no-op として受理）。
    password: formState.password,
    role_id: formState.role_id as number,
    todofuken_code: formState.todofuken_code,
    ja_id: formState.ja_id,
    kanri_shiten_id: formState.kanri_shiten_id,
    shiten_id: showShiten.value ? formState.shiten_id : null,
    account_name: formState.account_name,
    email: formState.email,
    sub_email_1: formState.sub_email_1,
    sub_email_2: formState.sub_email_2,
    sub_email_3: formState.sub_email_3,
    paper_flg: formState.paper_flg,
    denshi_flg: formState.denshi_flg,
    // false で送ると BE が login_failure_count → 0 にリセット（ロック解除）。
    account_lock_flg: formState.account_lock_flg,
    biko: formState.biko,
  };
}

interface ServerErrorPayload {
  error_code?: string;
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

function handleServerError(err: unknown): void {
  const axiosErr = err as AxiosError<ServerErrorPayload>;
  const data = axiosErr?.response?.data;
  // VALIDATION_ERROR + DUPLICATE_CODE は共に `errors[]` にフィールド単位の詳細を
  // 返す（api.md §エラー一覧）。form item がインラインメッセージを表示するよう写像。
  if (data && Array.isArray(data.errors) && data.errors.length > 0) {
    fieldErrors.value = Object.fromEntries(
      data.errors
        .filter((e): e is { field: string; message: string } =>
          typeof e.field === 'string' && typeof e.message === 'string',
        )
        .map((e) => [e.field, e.message]),
    );
    focusFirstError(FIELD_ORDER, fieldErrors.value); // 先頭エラー項目へフォーカス
  }
  // 非フィールドエラー（500、汎用 400）は axios interceptor が
  // トースト — view で再トーストしない。
}

async function onSubmit(): Promise<void> {
  if (!validateClient()) {
    focusFirstError(FIELD_ORDER, fieldErrors.value); // 先頭エラー項目へフォーカス
    return;
  }
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && accountId.value !== null && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  // 二重 submit（例: 高速な二連 Enter）を防ぐ: 1回目のリクエスト処理中の
  // 2回目の form-submit は無視する。
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (isEdit.value && accountId.value !== null) {
      await updateAccount(accountId.value, buildUpdateBody());
      notify.updated();
    } else {
      await createAccount(buildCreateBody());
      notify.created();
    }
    void router.push({ name: 'AccountList' });
  } catch (err) {
    handleServerError(err);
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  void router.push({ name: 'AccountList' });
}

defineExpose({ formState, fieldErrors });
</script>

<template>
  <!-- 機能定義 1.1 — 権限なしのアカウントは ACSMS-MSG-025-009 を表示. -->
  <BaseCard v-if="!isAdmin" padding="lg" class="max-w-2xl">
    <p class="text-text-main text-sm">{{ ACCESS_DENIED_MSG }}</p>
  </BaseCard>

  <div v-else class="space-y-6">
    <BaseCard padding="none">
      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onSubmit"
      >
        <!-- v1.3 画面設計: セクション見出しなし、フォームは一続きのブロック。
             JA + 管理支店 は常に描画し、disable + 必須マーカーは role_id により
             showTodofuken / showJa / showKanriShiten でトグル。余白は正準の CRUD
             フォーム（JaFormView / TankaFormView 等）に合わせる:
             <a-form> に `p-4 space-y-2`、各 grid 行に `gap-6`。 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a-form-item
              name="login_id"
              :validate-status="fieldErrors.login_id ? 'error' : ''"
              :help="fieldErrors.login_id"
            >
              <template #label>
                <span>ログインID</span>
                <span class="text-error ml-1">*</span>
              </template>
              <BaseCodeInput
                v-model:value="formState.login_id"
                :maxlength="20"
                :disabled="isEdit"
                placeholder="半角英数字"
              />
            </a-form-item>

            <a-form-item
              name="password"
              :validate-status="fieldErrors.password ? 'error' : ''"
              :help="fieldErrors.password"
            >
              <template #label>
                <span>パスワード</span>
                <span v-if="!isEdit" class="text-error ml-1">*</span>
              </template>
              <a-input-password
                v-model:value="formState.password"
                :maxlength="32"
                :placeholder="isEdit ? '変更時のみ入力' : ''"
                autocomplete="new-password"
              />
            </a-form-item>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <a-form-item
              name="role_id"
              :validate-status="fieldErrors.role_id ? 'error' : ''"
              :help="fieldErrors.role_id"
            >
              <template #label>
                <span>管理者区分</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.role_id"
                placeholder="選択してください"
                allow-clear
              >
                <a-select-option
                  v-for="opt in roleOptions"
                  :key="opt.role_id"
                  :value="opt.role_id"
                >
                  {{ opt.role_name }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              name="todofuken_code"
              :validate-status="fieldErrors.todofuken_code ? 'error' : ''"
              :help="fieldErrors.todofuken_code"
            >
              <template #label>
                <span>都道府県</span>
                <span v-if="showTodofuken" class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.todofuken_code"
                placeholder="選択してください"
                allow-clear
                :disabled="!showTodofuken"
              >
                <a-select-option
                  v-for="opt in todofukenOptions"
                  :key="opt.todofuken_code"
                  :value="opt.todofuken_code"
                >
                  {{ opt.todofuken_name }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              name="ja_id"
              :validate-status="fieldErrors.ja_id ? 'error' : ''"
              :help="fieldErrors.ja_id"
            >
              <template #label>
                <span>JA名</span>
                <span v-if="showJa" class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.ja_id"
                placeholder="選択してください"
                allow-clear
                :disabled="!showJa || !formState.todofuken_code"
              >
                <a-select-option
                  v-for="opt in jaOptions"
                  :key="opt.ja_id"
                  :value="opt.ja_id"
                >
                  {{ opt.ja_name }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              name="kanri_shiten_id"
              :validate-status="fieldErrors.kanri_shiten_id ? 'error' : ''"
              :help="fieldErrors.kanri_shiten_id"
            >
              <template #label>
                <span>管理支店</span>
                <span v-if="showKanriShiten" class="text-error ml-1">*</span>
              </template>
              <a-select
                v-model:value="formState.kanri_shiten_id"
                placeholder="選択してください"
                allow-clear
                :disabled="!showKanriShiten || !formState.ja_id"
              >
                <a-select-option
                  v-for="opt in kanriShitenOptions"
                  :key="opt.kanri_shiten_id"
                  :value="opt.kanri_shiten_id"
                >
                  {{ opt.kanri_shiten_name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>

          <!-- 所属支店 + アカウント名 + 通知先メールアドレス を 1 行 3 列で表示。 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- 所属支店（顧客要件 2026-07）— JA管理支店ロールのみ・任意。
                 他ロール／管理支店未選択時は常に表示のうえグレーアウト
                 （都道府県 / JA / 管理支店 と同じ挙動）。設定すると当該
                 アカウントは対象支店の購読者のみ参照/編集/追加可。 -->
            <a-form-item
              name="shiten_id"
              :validate-status="fieldErrors.shiten_id ? 'error' : ''"
              :help="fieldErrors.shiten_id"
            >
              <template #label>
                <span>所属支店</span>
              </template>
              <a-select
                v-model:value="formState.shiten_id"
                placeholder="選択してください（任意）"
                allow-clear
                :disabled="!showShiten"
              >
                <a-select-option
                  v-for="opt in shitenOptions"
                  :key="opt.shiten_id"
                  :value="opt.shiten_id"
                >
                  {{ opt.shiten_code }} - {{ opt.shiten_name }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              name="account_name"
              :validate-status="fieldErrors.account_name ? 'error' : ''"
              :help="fieldErrors.account_name"
            >
              <template #label>
                <span>アカウント名</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-input v-model:value="formState.account_name" :maxlength="50" />
            </a-form-item>

            <a-form-item
              name="email"
              :validate-status="fieldErrors.email ? 'error' : ''"
              :help="fieldErrors.email"
            >
              <template #label>
                <span>通知先メールアドレス</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-input v-model:value="formState.email" :maxlength="100" />
            </a-form-item>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a-form-item
              name="sub_email_1"
              :validate-status="fieldErrors.sub_email_1 ? 'error' : ''"
              :help="fieldErrors.sub_email_1"
              label="サブメールアドレス1"
            >
              <a-input v-model:value="formState.sub_email_1" :maxlength="100" />
            </a-form-item>

            <a-form-item
              name="sub_email_2"
              :validate-status="fieldErrors.sub_email_2 ? 'error' : ''"
              :help="fieldErrors.sub_email_2"
              label="サブメールアドレス2"
            >
              <a-input v-model:value="formState.sub_email_2" :maxlength="100" />
            </a-form-item>

            <a-form-item
              name="sub_email_3"
              :validate-status="fieldErrors.sub_email_3 ? 'error' : ''"
              :help="fieldErrors.sub_email_3"
              label="サブメールアドレス3"
            >
              <a-input v-model:value="formState.sub_email_3" :maxlength="100" />
            </a-form-item>
          </div>

        <!-- 3列行、各セル = フォームカードの 1/3。上のサブメール行
             （`md:grid-cols-3 gap-6`）に合わせ縦リズムを一定に保つ。
             セル#3 は意図的に空 — 取扱い区分 + ロック状態 を左（セル1+2）に
             寄せ、単独の ロック 列を引き伸ばさない。狭幅では1列スタックに畳む。 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item label="取扱い区分">
            <div class="flex items-center gap-6">
              <a-checkbox v-model:checked="formState.paper_flg">紙版の取扱い</a-checkbox>
              <a-checkbox v-model:checked="formState.denshi_flg">電子版の取扱い</a-checkbox>
            </div>
          </a-form-item>

          <!-- 編集専用: admin はここでアカウントのロックを解除できる。
               account_lock_flg=false 送信で BE が login_failure_count → 0 に
               リセットし即再ログイン可。作成モードでは非表示（新規は未ロック）。 -->
          <a-form-item v-if="isEdit" label="ロック状態">
            <!-- QA バグ 2026-05 — checkbox ラベルが既に「ロック」と表示するため
                 右に出していた赤い ロック pill は重複だった。ロック状態は
                 checkbox の checked 状態のみで伝える。 -->
            <a-checkbox v-model:checked="formState.account_lock_flg">ロック</a-checkbox>
          </a-form-item>
        </div>

        <a-form-item name="biko" label="備考">
          <a-textarea v-model:value="formState.biko" :rows="3" />
        </a-form-item>

        <BaseFormFooter
          :is-edit="isEdit"
          :submitting="submitting"
          @cancel="goBack"
        />
      </a-form>
    </BaseCard>
  </div>
</template>
