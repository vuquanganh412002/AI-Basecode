<script setup lang="ts">
/**
 * JAマスタ登録画面 (ACSMS-SCR-005).
 *
 * Single view that handles BOTH the create and edit flows:
 *   /ja        (POST)  -- create mode
 *   /ja/:ja_id (PUT)   -- edit mode (preloads via GET /api/v1/ja/:ja_id)
 *
 * - Validation rules + error message text from
 *   docs/design/ACSMS-SCR-005/screen-design.md (メッセージ情報).
 * - DOM structure / Japanese button copy from
 *   docs/design/ACSMS-SCR-005/index.html.
 * - API contract from docs/design/ACSMS-SCR-005/ACSMS-SCR-005-api.md.
 *
 * Field-level role restrictions (CHUOKAI / JA_HONTEN can only edit a
 * subset per api.md §4.4) are enforced server-side; the FE submits
 * everything and the backend ignores out-of-scope keys.
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BaseCard from '@/components/common/BaseCard.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import {
  createJa,
  getJa,
  updateJa,
  type CreateJaRequest,
  type UpdateJaRequest,
} from '@/api/ja/ja';
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

/**
 * Field-level restriction (edit mode only) per
 * `.claude/rules/security.md §"Field-Level Restriction"` and
 * `account_concept.md §JAマスタ`. CHUOKAI and JA_HONTEN can only edit
 * the contact-info subset of m_ja; everything else is read-only.
 * NICHINO_ADMIN edits everything; create mode is admin-only via
 * `ja.create` so this gate never trips there.
 */
const RESTRICTED_EDITOR_ROLES = ['CHUOKAI', 'JA_HONTEN'];
const isRestrictedEditor = computed(
  () =>
    isEdit.value &&
    RESTRICTED_EDITOR_ROLES.includes(authStore.user?.role_code ?? ''),
);

/** Numeric ja_id from the path, or undefined for create mode. */
const jaIdParam = computed<number | undefined>(() => {
  const raw = route.params.ja_id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => jaIdParam.value !== undefined);

const todofukenOptions = ref<TodofukenItem[]>([]);

const formState = reactive<CreateJaRequest>({
  ja_code: '',
  ja_name: '',
  ja_name_kana: '',
  todofuken_code: '',
  chuokai_flg: false,
  bank_code: '',
  bank_name: '',
  yubin_no: '',
  address: '',
  tel: '',
  fax: '',
  email: '',
  tanto_busho: '',
  tanto_name: '',
  zei_kubun: '1',
  biko: '',
});

/* ─── Lifecycle ────────────────────────────────────────────────────── */

onMounted(async () => {
  // Prefecture dropdown options (§API-COMMON-001).
  try {
    const resp = await getTodofukenList();
    todofukenOptions.value = resp.data;
  } catch {
    // axios interceptor already toasted the error.
    todofukenOptions.value = [];
  }

  // Edit-mode preload.
  if (jaIdParam.value !== undefined) {
    try {
      const resp = await getJa(jaIdParam.value);
      Object.assign(formState, {
        ja_code: resp.data.ja_code,
        ja_name: resp.data.ja_name,
        ja_name_kana: resp.data.ja_name_kana,
        todofuken_code: resp.data.todofuken_code,
        chuokai_flg: resp.data.chuokai_flg,
        bank_code: resp.data.bank_code,
        bank_name: resp.data.bank_name,
        yubin_no: resp.data.yubin_no,
        address: resp.data.address,
        tel: resp.data.tel,
        fax: resp.data.fax,
        email: resp.data.email,
        tanto_busho: resp.data.tanto_busho,
        tanto_name: resp.data.tanto_name,
        // BE returns zei_kubun as a number (1 = 内税, 2 = 外税) per
        // m_code.code_category='ZEI_KUBUN'. The form uses string radio
        // values ('1'/'2'), so coerce here — without this the radio's
        // strict-equality check fails (`'1' !== 1`) and edit mode shows
        // nothing selected.
        zei_kubun: String(resp.data.zei_kubun ?? ''),
        biko: resp.data.biko,
      });
    } catch {
      // 404 / 403 — let the global axios interceptor handle redirect.
      // Drop back to the root so we don't render an empty edit form.
      // `/` is a guaranteed-resolvable path in both prod (redirects to
      // Dashboard) and the in-memory router used by specs.
      try {
        await router.push({ path: '/' });
      } catch {
        /* no-match in some test routers — ignore */
      }
    }
  }
});

/* ─── Validation (per screen-design.md メッセージ情報) ────────────── */

const REQUIRED_MSG = '必須項目です。';
const POSTAL_DIGITS_ONLY_MSG = '郵便番号は数字のみ（ハイフンなし）入力可能です。';
const TEL_DIGITS_ONLY_MSG = '電話番号は数字のみ（ハイフンなし）入力可能です。';
const FAX_DIGITS_ONLY_MSG = 'FAXは数字のみ（ハイフンなし）入力可能です。';
const EMAIL_INVALID_MSG = '有効なメールアドレスを入力してください。';
const BANK_CODE_FORMAT_MSG = '金融機関コードは半角数字4桁で入力してください。';
const KANA_FORMAT_MSG = 'JA名(カナ)は全角カタカナで入力してください。';

// Full-width katakana ァ-ヶ + chouonpu ー + full/half-width spaces.
// Mirrors the BE @Matches in create-ja.dto.ts.
const KATAKANA_RE = /^[ァ-ヶー　\s]+$/u;

function validateClient(form: CreateJaRequest): Record<string, string> {
  const errs: Record<string, string> = {};

  // ─── Required-field checks (apply first; format check below only
  //     fires when the field is non-empty so the user sees one error
  //     at a time per spec).
  //
  //     Optional chaining `?.trim()` is required because antd's
  //     `<a-select allow-clear>` sets the v-model to `undefined` (not
  //     `""`) when the × clear icon is clicked. Calling `.trim()` on
  //     undefined would throw and bubble up to the global error
  //     handler ("エラーが発生しました。ページを更新してください。"),
  //     masking what is really a required-field violation.
  // ──────────────────────────────────────────────────────────────
  if (!isEdit.value && !form.ja_code?.trim()) errs.ja_code = REQUIRED_MSG;
  if (!form.ja_name?.trim()) errs.ja_name = REQUIRED_MSG;
  if (!form.todofuken_code?.trim()) errs.todofuken_code = REQUIRED_MSG;
  if (!form.bank_code?.trim()) errs.bank_code = REQUIRED_MSG;
  if (!form.bank_name?.trim()) errs.bank_name = REQUIRED_MSG;
  if (form.zei_kubun !== '1' && form.zei_kubun !== '2') {
    errs.zei_kubun = REQUIRED_MSG;
  }

  // ─── Format checks (only for non-empty values; required fields
  //     above short-circuit for empties). ─────────────────────────
  if (!errs.bank_code && form.bank_code && !/^\d{4}$/.test(form.bank_code)) {
    errs.bank_code = BANK_CODE_FORMAT_MSG;
  }
  if (form.yubin_no && !/^[0-9]+$/.test(form.yubin_no)) {
    errs.yubin_no = POSTAL_DIGITS_ONLY_MSG;
  }
  if (form.tel && !/^[0-9]+$/.test(form.tel)) {
    errs.tel = TEL_DIGITS_ONLY_MSG;
  }
  if (form.fax && !/^[0-9]+$/.test(form.fax)) {
    errs.fax = FAX_DIGITS_ONLY_MSG;
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = EMAIL_INVALID_MSG;
  }
  if (form.ja_name_kana && !KATAKANA_RE.test(form.ja_name_kana)) {
    errs.ja_name_kana = KANA_FORMAT_MSG;
  }

  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit pipeline ─────────────────────────────────────────────── */

/**
 * DOM order of form fields. Used to pick "the first input with an
 * error" for auto-focus after a failed submit, regardless of the
 * order the validator pushed errors into the map. Keep in sync with
 * the template below.
 */
const FIELD_ORDER: ReadonlyArray<keyof CreateJaRequest> = [
  'ja_code',
  'ja_name',
  'ja_name_kana',
  'todofuken_code',
  'yubin_no',
  'address',
  'tel',
  'fax',
  'email',
  'tanto_busho',
  'tanto_name',
  'zei_kubun',
  'bank_code',
  'bank_name',
  'chuokai_flg',
  'biko',
];

/**
 * Focus the first input (in DOM order) that has a validation error,
 * and scroll it into view so the user always sees the field they
 * need to fix even when it's below the fold.
 *
 * Looking up the DOM element is robustified across the three antd
 * control kinds we use, because antd v4 places the `id` differently
 * for each:
 *   - <a-input>, <a-textarea>  : the native `<input>` / `<textarea>` carries id="X"
 *   - <a-select>               : the wrapper carries id="X"; the actual
 *                                focusable element is the `.ant-select-selector`
 *                                child
 *   - <a-radio-group>          : the wrapper carries id="X"; we focus
 *                                the first `<input type="radio">` inside
 */
function focusFirstError(errors: Record<string, string>): void {
  const first = FIELD_ORDER.find((f) => errors[f]);
  if (!first) return;

  void nextTick(() => {
    // Try the obvious id lookup first.
    let target: HTMLElement | null = document.getElementById(first);
    // Antd sometimes prefixes ids with the form name + underscore.
    if (!target) {
      target = document.querySelector<HTMLElement>(
        `[id$="_${first}"], [id="${first}"]`,
      );
    }
    // Last resort: any descendant of the matching .ant-form-item label.
    if (!target) {
      const items = document.querySelectorAll<HTMLElement>('.ant-form-item');
      for (const item of items) {
        if (item.querySelector(`[name="${first}"], #${first}`)) {
          target = item;
          break;
        }
      }
    }
    if (!target) return;

    // Native focusable control → focus directly.
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement
    ) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Wrapper (a-select / a-radio-group / a-form-item) → drill in to
    // the first focusable descendant.
    const inner =
      target.querySelector<HTMLElement>('.ant-select-selector') ??
      target.querySelector<HTMLElement>(
        'input, textarea, select, [tabindex]:not([tabindex="-1"])',
      ) ??
      target;
    if (typeof (inner as HTMLElement).focus === 'function') {
      (inner as HTMLElement).focus();
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/**
 * Programmatic submit — exposed so the spec can drive the form without
 * reaching into antd's internal form state. The real UX submit handler
 * funnels through this same path on `<form @submit>`.
 */
async function submitWith(form: CreateJaRequest): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(errs);
    return;
  }

  await submit(async () => {
    if (jaIdParam.value !== undefined) {
      const { ja_code: _drop, ...updateBody } = form;
      void _drop;
      await updateJa(jaIdParam.value, updateBody as UpdateJaRequest);
      notify.updated();
    } else {
      await createJa(form);
      notify.created();
    }
    // Inside the callback so it only fires when the API call resolved
    // without throwing — `submit()` swallows the error and toasts via
    // the axios interceptor, so on failure we stay on the form.
    await router.push({ name: 'JaList' });
  });

  // After the round-trip, server-side VALIDATION_ERROR fields are now
  // in fieldErrors (via useApiForm). Focus the first one too so the
  // back-end checks (e.g. duplicate ja_code) feel as snappy as the
  // client-side ones.
  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(fieldErrors.value);
  }
}

async function onFormSubmit(): Promise<void> {
  await submitWith({ ...formState });
}

function onBack(): void {
  router.back();
}

defineExpose({ submitWith });
</script>

<template>
  <div class="space-y-6">
    <!-- Page title + breadcrumb are rendered by AppHeader (in MainLayout)
         based on route meta — do NOT duplicate here. -->

    <BaseCard no-padding>
      <div class="px-4 py-4 border-b border-border">
        <h3 class="text-lg font-medium text-text-main">JA基本情報入力</h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onFormSubmit"
      >
        <!-- Row 1: JA code / name / name kana -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="ja_code"
            :validate-status="allFieldErrors.ja_code ? 'error' : ''"
            :help="allFieldErrors.ja_code"
          >
            <template #label>
              <span>JAコード</span>
              <span v-if="!isEdit" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.ja_code"
              :disabled="isEdit"
              maxlength="10"
            />
          </a-form-item>
          <a-form-item
            name="ja_name"
            :validate-status="allFieldErrors.ja_name ? 'error' : ''"
            :help="allFieldErrors.ja_name"
          >
            <template #label>
              <span>JA名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.ja_name"
              :disabled="isRestrictedEditor"
              maxlength="200"
            />
          </a-form-item>
          <a-form-item
            label="JA名(カナ)"
            name="ja_name_kana"
            :validate-status="allFieldErrors.ja_name_kana ? 'error' : ''"
            :help="allFieldErrors.ja_name_kana"
          >
            <a-input
              v-model:value="formState.ja_name_kana"
              :disabled="isRestrictedEditor"
              maxlength="200"
            />
          </a-form-item>
        </div>

        <!-- Row 2: Prefecture / postal / address -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="todofuken_code"
            :validate-status="allFieldErrors.todofuken_code ? 'error' : ''"
            :help="allFieldErrors.todofuken_code"
          >
            <template #label>
              <span>都道府県</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.todofuken_code"
              :disabled="isRestrictedEditor"
              placeholder="選択してください"
              :options="
                todofukenOptions.map((t) => ({ value: t.todofuken_code, label: t.todofuken_name }))
              "
              allow-clear
            />
          </a-form-item>
          <a-form-item
            label="郵便番号"
            name="yubin_no"
            :validate-status="allFieldErrors.yubin_no ? 'error' : ''"
            :help="allFieldErrors.yubin_no"
          >
            <a-input v-model:value="formState.yubin_no" maxlength="7" />
          </a-form-item>
          <a-form-item label="住所" name="address">
            <a-input v-model:value="formState.address" maxlength="200" />
          </a-form-item>
        </div>

        <!-- Row 3: Phone / FAX / Email -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            label="電話番号"
            name="tel"
            :validate-status="allFieldErrors.tel ? 'error' : ''"
            :help="allFieldErrors.tel"
          >
            <a-input
              v-model:value="formState.tel"
              maxlength="15"
              placeholder="0312345678"
            />
          </a-form-item>
          <a-form-item
            label="FAX"
            name="fax"
            :validate-status="allFieldErrors.fax ? 'error' : ''"
            :help="allFieldErrors.fax"
          >
            <a-input
              v-model:value="formState.fax"
              maxlength="15"
              placeholder="0312345679"
            />
          </a-form-item>
          <a-form-item
            label="メールアドレス"
            name="email"
            :validate-status="allFieldErrors.email ? 'error' : ''"
            :help="allFieldErrors.email"
          >
            <!-- type="text" (NOT "email") so the browser's native HTML5
                 validation tooltip ("Please include an '@'…") doesn't fire.
                 The project uses its own client-side check
                 (`validateClient()` runs the EMAIL_INVALID_MSG regex) and
                 surfaces errors through `<a-form-item :help>` in Japanese. -->
            <a-input
              v-model:value="formState.email"
              maxlength="100"
              placeholder="example@gmail.com"
            />
          </a-form-item>
        </div>

        <!-- Row 4: Department / Contact / Tax type -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item label="担当部署名" name="tanto_busho">
            <a-input v-model:value="formState.tanto_busho" maxlength="100" />
          </a-form-item>
          <a-form-item label="担当者名" name="tanto_name">
            <a-input v-model:value="formState.tanto_name" maxlength="50" />
          </a-form-item>
          <a-form-item
            name="zei_kubun"
            :validate-status="allFieldErrors.zei_kubun ? 'error' : ''"
            :help="allFieldErrors.zei_kubun"
          >
            <template #label>
              <span>税区分</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-radio-group v-model:value="formState.zei_kubun">
              <a-radio value="1">内税</a-radio>
              <a-radio value="2">外税</a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <!-- Row 5: Bank code / Bank name / Central union flag -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="bank_code"
            :validate-status="allFieldErrors.bank_code ? 'error' : ''"
            :help="allFieldErrors.bank_code"
          >
            <template #label>
              <span>金融機関コード</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.bank_code"
              :disabled="isRestrictedEditor"
              maxlength="4"
            />
          </a-form-item>
          <a-form-item
            name="bank_name"
            :validate-status="allFieldErrors.bank_name ? 'error' : ''"
            :help="allFieldErrors.bank_name"
          >
            <template #label>
              <span>金融機関名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.bank_name"
              :disabled="isRestrictedEditor"
              maxlength="100"
            />
          </a-form-item>
          <a-form-item name="chuokai_flg">
            <template #label>
              <span>中央会フラグ</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-radio-group
              v-model:value="formState.chuokai_flg"
              :disabled="isRestrictedEditor"
            >
              <a-radio :value="true">中央会</a-radio>
              <a-radio :value="false">単協</a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <!-- Row 6: Notes -->
        <a-form-item label="備考" name="biko">
          <a-textarea v-model:value="formState.biko" :rows="3" maxlength="500" />
        </a-form-item>

        <!-- Both buttons left-aligned. Primary action label flips between
             '登録' (create) and '更新' (edit) so the user knows whether
             this submit creates or modifies a row. -->
        <div
          class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2"
        >
          <a-button
            type="primary"
            html-type="submit"
            :loading="submitting"
          >
            {{ isEdit ? '更新' : '登録' }}
          </a-button>
          <a-button data-test="btn-back" :disabled="submitting" @click="onBack">
            前の画面に戻る
          </a-button>
        </div>
      </a-form>
    </BaseCard>
  </div>
</template>
