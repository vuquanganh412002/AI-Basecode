<script setup lang="ts">
/**
 * 管理支店マスタ登録画面 (ACSMS-SCR-009).
 *
 * Single view that handles BOTH create and edit flows:
 *   /kanri-shiten/create     (POST) — NICHINO_ADMIN only
 *   /kanri-shiten/:id/edit   (PUT)  — NICHINO_ADMIN edits everything;
 *                                     CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
 *                                     edit only yubin_no, address, tel,
 *                                     fax, biko (Layer 3 field restriction).
 *
 * - Validation rules + error message text from
 *   docs/design/ACSMS-SCR-009/screen-design.md (メッセージ情報).
 * - DOM structure / Japanese button copy from
 *   docs/design/ACSMS-SCR-009/index.html.
 * - API contract from docs/design/ACSMS-SCR-009/ACSMS-SCR-009-api.md.
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { focusFirstError } from '@/utils/form-focus';
import { HALF_WIDTH_KATAKANA_RE, kanaFormatMessage } from '@/utils/kana';
import { RoleCode } from '@/constants/enums';
import {
  KANRI_SHITEN_CODE_REGEX,
  formatKanriShitenCode,
} from '@/utils/formatters';
import {
  createKanriShiten,
  getKanriShiten,
  updateKanriShiten,
  type CreateKanriShitenRequest,
  type UpdateKanriShitenRequest,
} from '@/api/kanri-shiten/kanri-shiten';
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

/**
 * Field-level restriction per api.md §4.5. Non-admin roles see all
 * fields except yubin_no/address/tel/fax/biko disabled in edit mode.
 * Backend silently drops out-of-scope keys (Layer 3 in security.md);
 * the FE :disabled is UX hint only.
 */
const RESTRICTED_EDITOR_ROLES: ReadonlySet<string> = new Set([
  RoleCode.CHUOKAI,
  RoleCode.JA_HONTEN,
  RoleCode.JA_KANRI_SHITEN,
]);
const isRestrictedEditor = computed(
  () =>
    isEdit.value &&
    RESTRICTED_EDITOR_ROLES.has(authStore.user?.role_code ?? ''),
);

/** Numeric id from the path, or undefined for create mode. */
const kanriShitenIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => kanriShitenIdParam.value !== undefined);

const todofukenOptions = ref<TodofukenItem[]>([]);

// ja_id is typed as number on the request DTO, but the create form
// must start UNSET so antd's <a-select> shows the placeholder
// ("JAを選択してください") instead of a literal "0". `validateClient`
// rejects a null/0 ja_id before the API call. `null` (not `undefined`)
// matches BaseJaDropdown's emit shape, so we can use plain
// `v-model:value` without a ?? bridge.
type FormState = Omit<CreateKanriShitenRequest, 'ja_id'> & {
  ja_id: number | null;
};

const formState = reactive<FormState>({
  ja_id: null,
  kanri_shiten_code: '',
  kanri_shiten_name: '',
  kanri_shiten_name_kana: '',
  todofuken_code: '',
  yubin_no: '',
  address: '',
  tel: '',
  fax: '',
  paper_flg: false,
  denshi_flg: false,
  biko: '',
});

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

/**
 * [ja-name-fallback]
 * JA_KANRI_SHITEN doesn't hold the `ja.view` permission, so calling
 * /api/v1/ja/dropdown 403s. The detail endpoint now returns `ja_name`
 * directly — render it as plain disabled text for users without
 * ja.view; render the dropdown (the previous behaviour) for everyone
 * else. The dropdown is `:disabled="isEdit"` for all roles anyway,
 * so the only operational difference is that we skip the dropdown
 * API call.
 */
const canViewJaDropdown = computed(() =>
  authStore.hasPermission('ja.view'),
);
const jaNameDisplay = ref('');

/* ─── Lifecycle ────────────────────────────────────────────────────── */

onMounted(async () => {
  // BaseJaDropdown self-hydrates via GET /api/v1/ja/dropdown — no
  // listJa() pre-fetch needed here. The component handles
  // search / infinite scroll / edit-mode include_id internally.

  // Prefecture dropdown options.
  try {
    const resp = await getTodofukenList();
    todofukenOptions.value = resp.data;
  } catch {
    todofukenOptions.value = [];
  }

  // Edit-mode preload.
  if (kanriShitenIdParam.value !== undefined) {
    try {
      const resp = await getKanriShiten(kanriShitenIdParam.value);
      jaNameDisplay.value = resp.data.ja_name ?? '';
      Object.assign(formState, {
        ja_id: resp.data.ja_id,
        kanri_shiten_code: resp.data.kanri_shiten_code,
        kanri_shiten_name: resp.data.kanri_shiten_name,
        kanri_shiten_name_kana: resp.data.kanri_shiten_name_kana ?? '',
        todofuken_code: resp.data.todofuken_code,
        yubin_no: resp.data.yubin_no ?? '',
        address: resp.data.address ?? '',
        tel: resp.data.tel ?? '',
        fax: resp.data.fax ?? '',
        paper_flg: !!resp.data.paper_flg,
        denshi_flg: !!resp.data.denshi_flg,
        biko: resp.data.biko ?? '',
      });
      await editGuard.capture();
    } catch {
      // 404 / 403 — axios interceptor toasts; bounce so we don't leave
      // the user staring at an empty edit form.
      try {
        await router.push({ name: 'Dashboard' });
      } catch {
        /* test routers may not declare Dashboard — ignore */
      }
    }
  }
});

/* ─── Validation (per screen-design.md §3.1) ──────────────────────── */

const REQUIRED_MSG = '必須項目です。';
const POSTAL_DIGITS_ONLY_MSG = '郵便番号は半角数字のみ（ハイフンなし）入力可能です。';
const TEL_DIGITS_ONLY_MSG = '電話番号は半角数字のみ（ハイフンなし）入力可能です。';
const FAX_DIGITS_ONLY_MSG = 'FAXは半角数字のみ（ハイフンなし）入力可能です。';
const KANRI_SHITEN_CODE_FORMAT_MSG =
  '管理支店コードは「NNN-NNNN-NNN」の形式（半角数字とハイフンのみ）で入力してください。';
const KANA_FORMAT_MSG = kanaFormatMessage('管理支店名');

function validateOptionalFormatFields(
  form: FormState,
  errs: Record<string, string>,
): void {
  // ─── Format checks (skip for required-empty fields). ────────────
  if (
    form.kanri_shiten_name_kana &&
    !HALF_WIDTH_KATAKANA_RE.test(form.kanri_shiten_name_kana)
  ) {
    errs.kanri_shiten_name_kana = KANA_FORMAT_MSG;
  }
  if (form.yubin_no && !/^\d{7}$/.test(form.yubin_no)) {
    errs.yubin_no = POSTAL_DIGITS_ONLY_MSG;
  }
  if (form.tel && !/^\d+$/.test(form.tel)) {
    errs.tel = TEL_DIGITS_ONLY_MSG;
  }
  if (form.fax && !/^\d+$/.test(form.fax)) {
    errs.fax = FAX_DIGITS_ONLY_MSG;
  }
}

function validateClient(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {};

  // ─── Required checks. Optional chaining (?.trim()) is mandatory
  //     because antd's <a-select allow-clear> sets v-model to
  //     `undefined` (not "") on × click. See vue.md §Validation.
  // ──────────────────────────────────────────────────────────────
  if (!isEdit.value && (!form.ja_id || form.ja_id === 0)) {
    errs.ja_id = REQUIRED_MSG;
  }
  if (!isEdit.value && !form.kanri_shiten_code?.trim()) {
    errs.kanri_shiten_code = REQUIRED_MSG;
  }
  if (!form.kanri_shiten_name?.trim()) {
    errs.kanri_shiten_name = REQUIRED_MSG;
  }
  if (!form.todofuken_code?.trim()) {
    errs.todofuken_code = REQUIRED_MSG;
  }

  // ─── Format check for kanri_shiten_code on create.
  //     Edit drops the field server-side so no need to validate then.
  //     Required check above already short-circuits empty input.
  // ──────────────────────────────────────────────────────────────
  if (
    !isEdit.value &&
    !errs.kanri_shiten_code &&
    form.kanri_shiten_code &&
    !KANRI_SHITEN_CODE_REGEX.test(form.kanri_shiten_code)
  ) {
    errs.kanri_shiten_code = KANRI_SHITEN_CODE_FORMAT_MSG;
  }

  validateOptionalFormatFields(form, errs);

  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit pipeline ─────────────────────────────────────────────── */

const FIELD_ORDER: ReadonlyArray<keyof CreateKanriShitenRequest> = [
  'ja_id',
  'kanri_shiten_code',
  'kanri_shiten_name',
  'kanri_shiten_name_kana',
  'todofuken_code',
  'yubin_no',
  'address',
  'tel',
  'fax',
  'paper_flg',
  'denshi_flg',
  'biko',
];

async function submitWith(form: FormState): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(FIELD_ORDER, errs);
    return;
  }

  await submit(async () => {
    if (kanriShitenIdParam.value === undefined) {
      // validateClient has already guaranteed ja_id is set for create mode.
      await createKanriShiten(form as CreateKanriShitenRequest);
      notify.created();
    } else {
      // PUT body drops ja_id + kanri_shiten_code (immutable after create).
      const {
        ja_id: _drop1,
        kanri_shiten_code: _drop2,
        ...updateBody
      } = form;
      void _drop1;
      void _drop2;
      await updateKanriShiten(
        kanriShitenIdParam.value,
        updateBody as UpdateKanriShitenRequest,
      );
      notify.updated();
    }
    await router.push({ name: 'KanriShitenList' });
  });

  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(FIELD_ORDER, fieldErrors.value);
  }
}

/**
 * Live auto-hyphen as the user types. Maintains the canonical
 * `XXX-XXXX-XXX` shape with trailing hyphens inserted at segment
 * boundaries (after 3rd char → `1AA-`, after 7th bare char →
 * `1AA-BBBB-`). Detects backspace via InputEvent.inputType so the
 * trailing hyphen is NOT re-inserted when the user is deleting
 * across a segment boundary — otherwise the input would feel "sticky"
 * and the user could never delete past the dash.
 */
/**
 * First-line defence — preventDefault when the user types a non-digit,
 * non-hyphen character. Hyphens are allowed even though the auto-format
 * inserts them automatically, because pasting an already-dashed code
 * (`113-3300-001`) shouldn't be rejected here. The view's @input
 * handler below normalises any remaining stray chars (e.g. macOS
 * autocorrect insertions that bypass beforeinput).
 */
function onKanriShitenCodeBeforeInput(e: Event): void {
  if (isEdit.value) return;
  const evt = e as InputEvent;
  if (typeof evt.data === 'string' && !/^[\d-]*$/.test(evt.data)) {
    evt.preventDefault();
  }
}

function onKanriShitenCodeInput(e: Event): void {
  if (isEdit.value) return;
  const isDelete =
    (e as InputEvent).inputType?.startsWith('delete') ?? false;
  const bare = (formState.kanri_shiten_code ?? '')
    .replaceAll(/\D/g, '')
    .slice(0, 10);

  let formatted: string;
  if (bare.length >= 8) {
    formatted = `${bare.slice(0, 3)}-${bare.slice(3, 7)}-${bare.slice(7, 10)}`;
  } else if (bare.length === 7) {
    formatted = isDelete
      ? `${bare.slice(0, 3)}-${bare.slice(3, 7)}`
      : `${bare.slice(0, 3)}-${bare.slice(3, 7)}-`;
  } else if (bare.length > 3) {
    formatted = `${bare.slice(0, 3)}-${bare.slice(3)}`;
  } else if (bare.length === 3) {
    formatted = isDelete ? bare : `${bare}-`;
  } else {
    formatted = bare;
  }
  formState.kanri_shiten_code = formatted;
}

/**
 * Auto-format kanri_shiten_code one more time on blur, covering the
 * paste-then-tab case where @input may have left the value un-dashed.
 * The submit handler also re-formats as a final safety net.
 */
function onKanriShitenCodeBlur(): void {
  if (isEdit.value || !formState.kanri_shiten_code) return;
  formState.kanri_shiten_code = formatKanriShitenCode(
    formState.kanri_shiten_code,
  );
}

async function onFormSubmit(): Promise<void> {
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  // Auto-format kanri_shiten_code one more time on submit in case the
  // user pasted-and-submitted without ever firing @blur (paste with
  // Enter, or programmatic fill). Belt-and-suspenders with the blur
  // handler above.
  if (!isEdit.value && formState.kanri_shiten_code) {
    formState.kanri_shiten_code = formatKanriShitenCode(
      formState.kanri_shiten_code,
    );
  }
  await submitWith({ ...formState });
}

/**
 * Back button — straight navigation to the list view (no confirm modal,
 * per user feedback). Screen-design.md §4.1 originally specified a
 * confirmation popup but the customer opted to drop it.
 */
function onBack(): void {
  router.push({ name: 'KanriShitenList' });
}

defineExpose({
  submitWith,
  form: formState,
  onKanriShitenCodeInput,
  onKanriShitenCodeBeforeInput,
});
</script>

<template>
  <div class="space-y-6">
    <BaseCard padding="none">
      <div class="px-4 py-4 border-b border-border">
        <h3 class="text-lg font-medium text-text-main">管理店支情報入力</h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onFormSubmit"
      >
        <!-- Row 1: JA select (full width) -->
        <a-form-item
          name="ja_id"
          :validate-status="allFieldErrors.ja_id ? 'error' : ''"
          :help="allFieldErrors.ja_id"
        >
          <template #label>
            <span>JA名</span>
            <span class="text-error ml-1">*</span>
          </template>
          <!-- [ja-name-fallback] — JA_KANRI_SHITEN lacks ja.view so it
               can't hit /api/v1/ja/dropdown. Detail response carries
               ja_name; show it as a disabled <a-input> for those users.
               Other roles keep BaseJaDropdown (read-only on edit). -->
          <BaseJaDropdown
            v-if="canViewJaDropdown"
            v-model:value="formState.ja_id"
            :disabled="isEdit"
            placeholder="JAを選択してください"
          />
          <a-input
            v-else
            :value="jaNameDisplay"
            disabled
            placeholder="JA名"
          />
        </a-form-item>

        <!-- Row 2: kanri_shiten_code / name / name kana -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="kanri_shiten_code"
            :validate-status="allFieldErrors.kanri_shiten_code ? 'error' : ''"
            :help="allFieldErrors.kanri_shiten_code"
          >
            <template #label>
              <span>管理支店コード</span>
              <span v-if="!isEdit" class="text-error ml-1">*</span>
            </template>
            <!-- Bypass BaseCodeInput here because BaseCodeInput is a Vue
                 component wrapping <a-input> and the @input listener
                 doesn't fall through cleanly — onKanriShitenCodeInput
                 never fired, so letters typed by the user weren't being
                 stripped. Use <a-input> directly with @beforeinput as
                 the first line of defence, plus the existing @input
                 auto-formatter as the second. Customer spec: digits
                 + hyphens only. -->
            <a-input
              v-model:value="formState.kanri_shiten_code"
              :disabled="isEdit"
              :maxlength="12"
              placeholder="例: 113-3300-001"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              @beforeinput="onKanriShitenCodeBeforeInput"
              @input="onKanriShitenCodeInput"
              @blur="onKanriShitenCodeBlur"
            />
          </a-form-item>
          <a-form-item
            name="kanri_shiten_name"
            :validate-status="allFieldErrors.kanri_shiten_name ? 'error' : ''"
            :help="allFieldErrors.kanri_shiten_name"
          >
            <template #label>
              <span>管理支店名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.kanri_shiten_name"
              :disabled="isRestrictedEditor"
              :maxlength="100"
              placeholder="管理支店名を入力してください"
            />
          </a-form-item>
          <a-form-item
            label="管理支店名(カナ)"
            name="kanri_shiten_name_kana"
            :validate-status="allFieldErrors.kanri_shiten_name_kana ? 'error' : ''"
            :help="allFieldErrors.kanri_shiten_name_kana"
          >
            <a-input
              v-model:value="formState.kanri_shiten_name_kana"
              :disabled="isRestrictedEditor"
              :maxlength="100"
            />
          </a-form-item>
        </div>

        <!-- Row 3: postal / prefecture -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            label="郵便番号"
            name="yubin_no"
            :validate-status="allFieldErrors.yubin_no ? 'error' : ''"
            :help="allFieldErrors.yubin_no"
          >
            <BaseCodeInput v-model:value="formState.yubin_no" :maxlength="7" />
          </a-form-item>
          <a-form-item
            class="md:col-span-2"
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
                todofukenOptions.map((t) => ({
                  value: t.todofuken_code,
                  label: t.todofuken_name,
                }))
              "
              allow-clear
            />
          </a-form-item>
        </div>

        <!-- Row 4: address / tel / fax -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item label="住所" name="address">
            <a-input v-model:value="formState.address" :maxlength="200" />
          </a-form-item>
          <a-form-item
            label="電話番号"
            name="tel"
            :validate-status="allFieldErrors.tel ? 'error' : ''"
            :help="allFieldErrors.tel"
          >
            <a-input
              v-model:value="formState.tel"
              :maxlength="15"
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
              :maxlength="15"
              placeholder="0312345679"
            />
          </a-form-item>
        </div>

        <!-- Row 5: paper / denshi flags -->
        <div class="flex items-center gap-6 pt-2">
          <a-checkbox
            v-model:checked="formState.paper_flg"
            :disabled="isRestrictedEditor"
          >
            紙版フラグ
          </a-checkbox>
          <a-checkbox
            v-model:checked="formState.denshi_flg"
            :disabled="isRestrictedEditor"
          >
            電子版フラグ
          </a-checkbox>
        </div>

        <!-- Row 6: biko -->
        <a-form-item
          label="備考"
          name="biko"
          :validate-status="allFieldErrors.biko ? 'error' : ''"
          :help="allFieldErrors.biko"
        >
          <a-textarea
            v-model:value="formState.biko"
            :rows="4"
            :maxlength="500"
          />
        </a-form-item>

        <BaseFormFooter
          :is-edit="isEdit"
          :submitting="submitting"
          @cancel="onBack"
        />
      </a-form>
    </BaseCard>
  </div>
</template>
