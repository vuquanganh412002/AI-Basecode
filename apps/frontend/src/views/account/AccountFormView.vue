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
import { getJaDropdown, type JaDropdownItem } from '@/api/ja/ja';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';
import { RoleCode } from '@/constants/enums';

interface AccountFormState {
  login_id: string;
  password: string;
  role_id: number | null;
  todofuken_code: string | null;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  account_name: string;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  /** Edit-only — hydrated from getAccount, sent only when admin toggles. */
  account_lock_flg: boolean;
  biko: string;
}

// ─── Access control (機能定義 1.1) ─────────────────────────────────
// SCR-025 は日農管理者のみアクセス可。view-side guard で API も叩かない。
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

// ─── Dropdown state ─────────────────────────────────────────────────
const roleOptions = ref<RoleDropdownItem[]>([]);
const todofukenOptions = ref<TodofukenItem[]>([]);
const jaOptions = ref<JaDropdownItem[]>([]);
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);

// `hydrateFromDetail` (edit mode) and other programmatic bulk-loads
// would otherwise trip the cascade watchers below — setting both
// `todofuken_code` and `ja_id` in the same tick lets the todofuken
// watcher fire first and wipe the just-assigned ja_id. Flip this flag
// while loading; the watchers no-op while it's true and the next
// USER-driven change reverts to normal cascade behaviour.
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

// ─── Mount / edit-mode load ─────────────────────────────────────────
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
    // BE envelope is `{ data: [...] }`; the spec fixture also passes
    // a plain array (buildTodofukenList) — accept both shapes.
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
      per_page: 100,
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

function hydrateFromDetail(detail: AccountDetail): void {
  // Edit mode pre-fill — login_id read-only, password blank (空欄=保持).
  // Guard with isHydrating so the cascade watchers don't wipe the
  // pre-filled ja_id / kanri_shiten_id when todofuken_code is set.
  isHydrating.value = true;
  formState.login_id = detail.login_id;
  formState.password = '';
  formState.role_id = detail.role_id;
  formState.todofuken_code = detail.todofuken_code;
  formState.ja_id = detail.ja_id;
  formState.kanri_shiten_id = detail.kanri_shiten_id;
  formState.account_name = detail.account_name;
  formState.email = detail.email;
  formState.sub_email_1 = detail.sub_email_1;
  formState.sub_email_2 = detail.sub_email_2;
  formState.sub_email_3 = detail.sub_email_3;
  formState.paper_flg = detail.paper_flg;
  formState.denshi_flg = detail.denshi_flg;
  formState.account_lock_flg = detail.account_lock_flg;
  formState.biko = detail.biko;
  // Reset on the next microtask, AFTER the cascade watchers have run
  // (they're flush:'pre' and fire on the upcoming tick).
  void Promise.resolve().then(() => {
    isHydrating.value = false;
  });
}

onMounted(async () => {
  // 機能定義 1.1 / 1.2 — 日農管理者のみアクセス可。
  // Non-admin: render the ACCESS_DENIED message and skip all API calls.
  if (!isAdmin.value) return;

  void fetchRoleOptions();
  void fetchTodofukenOptions();

  if (isEdit.value && accountId.value !== null) {
    try {
      const resp = await getAccount(accountId.value);
      hydrateFromDetail(resp.data);
      // After hydrate, sequentially load cascade dropdowns so the
      // pre-filled selections render correctly.
      if (resp.data.todofuken_code) {
        void fetchJaOptions(resp.data.todofuken_code, resp.data.role_id);
      }
      if (resp.data.ja_id) {
        void fetchKanriShitenOptions(resp.data.ja_id);
      }
      // ロード（＋ハイドレート中の watcher）が確定した状態を基準に控える。
      await editGuard.capture();
    } catch {
      // Global axios interceptor toasts NOT_FOUND / 500 — view stays
      // mounted with empty fields rather than crashing onMounted.
    }
  }
});

// ─── Cascade watchers (機能定義 5.x / 6.x) ───────────────────────────
// All three watchers no-op during isHydrating so edit-mode pre-fill
// (which assigns todofuken_code, ja_id, kanri_shiten_id in the same
// tick) doesn't wipe its own values via the cascade.
watch(
  () => formState.todofuken_code,
  (next, prev) => {
    if (isHydrating.value) return;
    if (next === prev) return;
    // Reset downstream selections so a stale value can't leak when the
    // new todofuken's JA list arrives.
    formState.ja_id = null;
    formState.kanri_shiten_id = null;
    kanriShitenOptions.value = [];
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
    if (next) {
      void fetchKanriShitenOptions(next);
    } else {
      kanriShitenOptions.value = [];
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

// ─── Client-side validation (機能定義 2.1) ──────────────────────────
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

function validateClient(): boolean {
  const errs: Record<string, string> = {};

  // [required-table] Drives the required-field pass via data. Cuts
  // cognitive complexity vs. a chain of if-statements and keeps the
  // ordering explicit (FIELD_ORDER below relies on this list for
  // focus-first-error). Use `?.trim()` (not `.trim()`) so a future
  // migration to a clearable control doesn't crash with TypeError.
  // [email-required] QA bug 2026-05 — 通知先メールアドレス must be
  // required. Primary email is the only address paper-based delivery
  // notifications fall back to; SCR-023's worker drops the recipient
  // entirely when it's blank, so an account without one silently
  // receives nothing.
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

  // Format checks (only when value is present — required-message takes
  // priority over format-message for the same field).
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

// ─── Submit pipeline ────────────────────────────────────────────────
function buildCreateBody(): CreateAccountBody {
  return {
    login_id: formState.login_id,
    password: formState.password,
    role_id: formState.role_id as number,
    todofuken_code: formState.todofuken_code,
    ja_id: formState.ja_id,
    kanri_shiten_id: formState.kanri_shiten_id,
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
    // Empty password = leave unchanged (BE DTO accepts blank as no-op).
    password: formState.password,
    role_id: formState.role_id as number,
    todofuken_code: formState.todofuken_code,
    ja_id: formState.ja_id,
    kanri_shiten_id: formState.kanri_shiten_id,
    account_name: formState.account_name,
    email: formState.email,
    sub_email_1: formState.sub_email_1,
    sub_email_2: formState.sub_email_2,
    sub_email_3: formState.sub_email_3,
    paper_flg: formState.paper_flg,
    denshi_flg: formState.denshi_flg,
    // BE resets login_failure_count → 0 when this is sent as false (unlock).
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
  // VALIDATION_ERROR + DUPLICATE_CODE both surface field-level details
  // in `errors[]` (per api.md §エラー一覧). Map them so the form item
  // shows the inline message instead of a generic toast.
  if (data && Array.isArray(data.errors) && data.errors.length > 0) {
    fieldErrors.value = Object.fromEntries(
      data.errors
        .filter((e): e is { field: string; message: string } =>
          typeof e.field === 'string' && typeof e.message === 'string',
        )
        .map((e) => [e.field, e.message]),
    );
  }
  // Non-field-level errors (500, generic 400) are toasted by the
  // global axios interceptor — the view must NOT re-toast.
}

async function onSubmit(): Promise<void> {
  if (!validateClient()) return;
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && accountId.value !== null && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  // Guard against a double submit (e.g. rapid double-Enter): a second
  // form-submit while the first request is in flight must be ignored.
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
        <!-- v1.3 screen design: no section headers; the form is one
             continuous block. JA + 管理支店 always render — disable +
             required-marker toggle by role_id via showTodofuken /
             showJa / showKanriShiten. Spacing matches the canonical
             CRUD form pattern (JaFormView / TankaFormView / etc.):
             `p-4 space-y-2` on <a-form>, `gap-6` on every grid row. -->
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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <!-- 3-column row, each cell = 1/3 of the form card. Mirrors
             the sub-mail row above (`md:grid-cols-3 gap-6`) so vertical
             rhythm stays consistent. Cell #3 is intentionally empty —
             keeps 取扱い区分 + ロック状態 anchored to the LEFT
             (cells 1 + 2) instead of stretching the lone ロック
             column. On narrow viewports collapses to 1-column stack. -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item label="取扱い区分">
            <div class="flex items-center gap-6">
              <a-checkbox v-model:checked="formState.paper_flg">紙版の取扱い</a-checkbox>
              <a-checkbox v-model:checked="formState.denshi_flg">電子版の取扱い</a-checkbox>
            </div>
          </a-form-item>

          <!-- Edit-only: admin can unlock the account here. Sending
               account_lock_flg=false resets login_failure_count → 0 on
               the BE so the user can log in again immediately. Hidden
               in create mode (new accounts can't be locked yet). -->
          <a-form-item v-if="isEdit" label="ロック状態">
            <!-- QA bug 2026-05 — checkbox label already says "ロック";
                 the red ロック pill previously shown to the right was
                 a duplicate. Lock state is now communicated solely by
                 the checkbox's checked state. -->
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
