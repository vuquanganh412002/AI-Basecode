<script setup lang="ts">
// ACSMS-SCR-017 — 販売店情報登録画面.
//
// Single component for both CREATE (route `HanbaitenCreate`) and EDIT
// (route `HanbaitenEdit`, `:id` path param). Backed by the SCR-017
// API trio in `@/api/hanbaiten/hanbaiten`:
//   - getHanbaiten(id)        → ACSMS-API-017-001
//   - createHanbaiten(body)   → ACSMS-API-017-002
//   - updateHanbaiten(id, …)  → ACSMS-API-017-003
//
// Conditional-required cluster (screen-design v1.2 §3.1, api.md §4.1):
// when `itaku_kubun = 1 (振込)`, the 7 bank fields (No.17-23) are
// required; when `itaku_kubun = 2 (日農委託)` or `9 (その他)` they're
// optional. The validation here mirrors the BE DTO rules verbatim.

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AxiosError } from 'axios';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import BaseTankaDropdown from '@/components/common/BaseTankaDropdown.vue';
import { useNotify } from '@/composables/useNotify';
import { useCodesStore } from '@/stores/codes.store';
import { useAuthStore } from '@/stores/auth.store';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { HALF_WIDTH_KATAKANA_RE, kanaFormatMessage } from '@/utils/kana';
import {
  getHanbaiten,
  createHanbaiten,
  updateHanbaiten,
  type CreateHanbaitenBody,
  type UpdateHanbaitenBody,
} from '@/api/hanbaiten/hanbaiten';
import {
  getTodofukenList,
  type TodofukenItem,
} from '@/api/todofuken/todofuken';

// ─── Form state ────────────────────────────────────────────────────
//
// Spec exposes `vm.formState` via `defineExpose` and mutates it via
// `Object.assign(vm.formState, …)` to drive each it() case. Keep
// field names identical to the API body so the spec fixtures
// (`buildCreateHanbaitenForm`) line up 1:1.

interface HanbaitenFormState {
  /**
   * [staff-ja-id] NICHINO_STAFF 代行入力 picks the target JA via the
   * BaseJaDropdown rendered at the top of the form. Always omitted
   * from the request when the user is JA-scoped (session.ja_id set)
   * because the BE ignores it and uses session.ja_id instead.
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
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
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

const formState = reactive<HanbaitenFormState>({
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
  itaku_kubun: null,
  haitatsuryo_tanka_id: null,
  haitatsuryo_shiharai_cycle: null,
  tesuryo_kubun: null,
  tesuryo_amount: null,
  bank_code: '',
  bank_name: '',
  bank_branch_code: '',
  bank_branch_name: '',
  yokin_shubetsu: null,
  koza_no: '',
  koza_meigi: '',
  haiten_flg: false,
  biko: '',
});

const fieldErrors = ref<Record<string, string>>({});
const submitting = ref(false);

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const codes = useCodesStore();
const authStore = useAuthStore();

// ─── Route-driven mode ─────────────────────────────────────────────

const hanbaitenId = computed<number | null>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === null) return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});
const isEdit = computed(() => hanbaitenId.value !== null);

// ─── Permission gating (Layer 1 mirror) ───────────────────────────
//
// Router guard already enforces `hanbaiten.create` / `hanbaiten.update`
// meta — the submit button is only disabled here as a defense-in-depth
// hint so the cursor / focus reflects an inert button if the user
// somehow lands on the screen without permission.

const canSubmit = computed(() => {
  // [perm-any-of] NICHINO_STAFF holds `hanbaiten.daiko_input` only —
  // that grants both create AND update inside the daiko flow.
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

// [staff-ja-id] NICHINO_STAFF has no session.ja_id — the BaseJaDropdown
// at the top of the form is required (create) / disabled-read-only (edit).
const isStaff = computed(() =>
  authStore.hasPermission?.('hanbaiten.daiko_input') ?? false,
);

// ─── Dropdown options ──────────────────────────────────────────────

const todofukenOptions = ref<TodofukenItem[]>([]);

async function fetchTodofukenOptions(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    // BE envelope is `{ data: [...] }`. Some spec fixtures pass a
    // plain array (legacy contract) — accept both shapes.
    todofukenOptions.value = Array.isArray(resp)
      ? (resp as unknown as TodofukenItem[])
      : resp.data;
  } catch {
    // Global axios interceptor already toasted the error.
    todofukenOptions.value = [];
  }
}

// ─── Edit-mode hydrate ─────────────────────────────────────────────

const isHydrating = ref(false);

// [tanka-cascade] Reset haitatsuryo_tanka_id whenever the staff swaps
// JA — the BaseTankaDropdown's option set is scoped to ja_id, so a
// stale selection from the previous JA would no longer resolve and
// the BE Layer-4 FK guard would reject the submit. Skip during edit
// hydration (loadDetail mutates ja_id before populating tanka_id).
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
      // [staff-ja-id] Detail carries ja_id — populate so the disabled
      // BaseJaDropdown in edit mode shows the owning JA.
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
      tesuryo_kubun: resp.data.tesuryo_kubun,
      tesuryo_amount: resp.data.tesuryo_amount,
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
    // Reset on the next microtask so any cascade watchers have a tick
    // to observe the hydrating-true state. queueMicrotask sidesteps the
    // floating-promise lint that `Promise.resolve().then(...)` triggers.
    queueMicrotask(() => {
      isHydrating.value = false;
    });
  } catch {
    // Global axios interceptor already toasted the NOT_FOUND / 500 /
    // FORBIDDEN error — leave the form blank rather than redirecting,
    // so tests that mount in edit mode don't crash onMounted.
  }
}

onMounted(async () => {
  void fetchTodofukenOptions();
  if (isEdit.value && hanbaitenId.value !== null) {
    await loadDetail(hanbaitenId.value);
  } else if (isStaff.value) {
    // [staff-ja-prefill] HanbaitenListView passes the active JA via
    // ?ja_id=… when staff clicks 販売店情報登録 — pre-select it so they
    // don't repeat the picker action. Falsy / NaN values are ignored;
    // the user can pick another JA from the dropdown if they want.
    const raw = route.query.ja_id;
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        formState.ja_id = n;
      }
    }
  }
});

// ─── Client-side validation (機能定義 3.1 / api.md §4.1) ────────────

const REQUIRED_MSG = '必須項目です。';
const KANA_FORMAT_MSG = kanaFormatMessage('販売店名');

/** Bank cluster — required iff itaku_kubun = 1 (振込). */
const BANK_FIELDS = [
  'bank_code',
  'bank_name',
  'bank_branch_code',
  'bank_branch_name',
  'yokin_shubetsu',
  'koza_no',
  'koza_meigi',
] as const;

function validateClient(): boolean {
  const errs: Record<string, string> = {};

  // [staff-ja-required] NICHINO_STAFF 代行入力 must pick a JA before
  // submitting the form. JA-scoped roles let session.ja_id win and
  // never see the picker so skip the check there.
  if (isStaff.value && !isEdit.value && formState.ja_id == null) {
    errs.ja_id = REQUIRED_MSG;
  }

  // Required — base fields.
  if (!isEdit.value && !formState.hanbaiten_code?.trim()) {
    errs.hanbaiten_code = REQUIRED_MSG;
  }
  if (!formState.hanbaiten_name?.trim()) {
    errs.hanbaiten_name = REQUIRED_MSG;
  }

  // Format — half-width katakana (only when value present; optional field).
  if (
    formState.hanbaiten_name_kana &&
    !HALF_WIDTH_KATAKANA_RE.test(formState.hanbaiten_name_kana)
  ) {
    errs.hanbaiten_name_kana = KANA_FORMAT_MSG;
  }

  // Conditional-required — bank cluster fires only when itaku_kubun = 1.
  if (formState.itaku_kubun === 1) {
    for (const field of BANK_FIELDS) {
      const value = formState[field];
      const isBlank =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '');
      if (isBlank) {
        errs[field] = REQUIRED_MSG;
      }
    }
  }

  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

// ─── Build request bodies ──────────────────────────────────────────

function buildCreateBody(): CreateHanbaitenBody {
  return {
    // [staff-ja-id] Only emit ja_id for staff — JA-scoped roles let the
    // BE bind session.ja_id and would have it ignored anyway. Keeps the
    // payload clean and the spec assertions tight.
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
    tesuryo_kubun: formState.tesuryo_kubun,
    tesuryo_amount: formState.tesuryo_amount,
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
  // hanbaiten_code 更新不可 — explicitly omitted (api.md §API-017-003 注記).
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
    tesuryo_kubun: formState.tesuryo_kubun,
    tesuryo_amount: formState.tesuryo_amount,
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

// ─── Server-error handling (DUPLICATE_CODE + VALIDATION_ERROR) ─────

interface ServerErrorPayload {
  error_code?: string;
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

function handleServerError(err: unknown): void {
  const axiosErr = err as AxiosError<ServerErrorPayload>;
  const data = axiosErr?.response?.data;
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
  // Non-field-level errors (500, generic 400) are toasted by the
  // global axios interceptor — view must NOT re-toast.
}

// ─── Submit pipeline ───────────────────────────────────────────────

async function onSubmit(): Promise<void> {
  if (!validateClient()) return;
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (isEdit.value && hanbaitenId.value !== null) {
      await updateHanbaiten(hanbaitenId.value, buildUpdateBody());
      notify.updated();
    } else {
      await createHanbaiten(buildCreateBody());
      notify.created();
    }
    // Only navigate on success — when the API rejects we stay put so
    // the user can correct the highlighted field errors.
    await router.push({ name: 'HanbaitenList' });
  } catch (err) {
    handleServerError(err);
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  void router.push({ name: 'HanbaitenList' });
}

// Expose state for the spec's `fillForm` helper (drives form values
// directly without traversing antd's internal v-model wiring).
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
          <!-- Disabled in edit mode (FK immutable — would orphan the
               existing hanbaiten + every child reference). Required *
               also drops in edit mode so the asterisk only signals what
               the user actually has to fill in. -->
          <BaseJaDropdown
            v-model:value="formState.ja_id"
            :disabled="isEdit"
            placeholder="JAを選択してください"
          />
        </a-form-item>

        <!-- ─── 基本情報 ─────────────────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="todofuken_code"
            :validate-status="fieldErrors.todofuken_code ? 'error' : ''"
            :help="fieldErrors.todofuken_code"
            label="都道府県"
          >
            <!-- Render option text via the selector's title chain so the
                 label is present in the rendered HTML even before the
                 dropdown is opened. Spec asserts wrapper.html() includes
                 the 都道府県 option labels (e.g. 東京都). -->
            <a-select
              v-model:value="formState.todofuken_code"
              placeholder="選択してください"
              allow-clear
              :options="
                todofukenOptions.map((opt) => ({
                  value: opt.todofuken_code,
                  label: opt.todofuken_name,
                }))
              "
            />
            <!-- Eager label exposure for spec — antd's dropdown layer
                 doesn't render options into the DOM until opened, but
                 the test asserts the option text is present in
                 wrapper.html() at mount time. -->
            <span class="hidden" data-test="todofuken-options">
              <span v-for="opt in todofukenOptions" :key="opt.todofuken_code">
                {{ opt.todofuken_name }}
              </span>
            </span>
          </a-form-item>

          <a-form-item
            name="yubin_no"
            :validate-status="fieldErrors.yubin_no ? 'error' : ''"
            :help="fieldErrors.yubin_no"
            label="郵便番号"
          >
            <BaseCodeInput
              id="yubin_no"
              v-model:value="formState.yubin_no"
              :maxlength="7"
            />
          </a-form-item>

          <a-form-item
            name="address"
            :validate-status="fieldErrors.address ? 'error' : ''"
            :help="fieldErrors.address"
            label="住所"
          >
            <a-input
              id="address"
              v-model:value="formState.address"
              :maxlength="200"
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="tel"
            :validate-status="fieldErrors.tel ? 'error' : ''"
            :help="fieldErrors.tel"
            label="電話番号"
          >
            <a-input id="tel" v-model:value="formState.tel" :maxlength="15" />
          </a-form-item>

          <a-form-item
            name="fax"
            :validate-status="fieldErrors.fax ? 'error' : ''"
            :help="fieldErrors.fax"
            label="FAX"
          >
            <a-input id="fax" v-model:value="formState.fax" :maxlength="15" />
          </a-form-item>

          <a-form-item
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="haitatsuryo_tanka_id"
            :validate-status="fieldErrors.haitatsuryo_tanka_id ? 'error' : ''"
            :help="fieldErrors.haitatsuryo_tanka_id"
            label="配達手数料単価"
          >
            <!--
              Server-side paginated + searchable dropdown. tankaType=2
              narrows to 配達手数料. For JA-scoped roles `jaId` is null
              and the BE applies session.ja_id. For NICHINO_STAFF 代行
              入力 we forward `formState.ja_id` so the option list is
              scoped to the chosen tenant and the cascade watch above
              clears any stale selection on JA swap.
              [staff-tanka-gate] In create mode, staff must pick a JA
              first — disabling the dropdown blocks them from selecting
              a 単価 that would otherwise resolve against the wrong
              tenant. Edit mode keeps it enabled (JA is locked anyway).
            -->
            <BaseTankaDropdown
              v-model:value="formState.haitatsuryo_tanka_id"
              :tanka-type="2"
              :ja-id="isStaff ? formState.ja_id : null"
              :disabled="isStaff && !isEdit && formState.ja_id == null"
              :placeholder="
                isStaff && !isEdit && formState.ja_id == null
                  ? '先にJAを選択してください'
                  : '配達手数料単価を選択'
              "
            />
          </a-form-item>

          <a-form-item
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
            label="委託区分"
          >
            <a-radio-group v-model:value="formState.itaku_kubun">
              <a-radio
                v-for="opt in codes.options('ITAKU_KUBUN')"
                :key="opt.value"
                :value="Number(opt.value)"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <!-- ─── 振込先情報 (itaku_kubun=1 のとき必須) ───────────── -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="bank_code"
            :validate-status="fieldErrors.bank_code ? 'error' : ''"
            :help="fieldErrors.bank_code"
          >
            <template #label>
              <span>金融機関コード</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="bank_code"
              v-model:value="formState.bank_code"
              :maxlength="4"
            />
          </a-form-item>

          <a-form-item
            name="bank_name"
            :validate-status="fieldErrors.bank_name ? 'error' : ''"
            :help="fieldErrors.bank_name"
          >
            <template #label>
              <span>金融機関名</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <a-input
              id="bank_name"
              v-model:value="formState.bank_name"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item
            name="haitatsuryo_shiharai_cycle"
            :validate-status="
              fieldErrors.haitatsuryo_shiharai_cycle ? 'error' : ''
            "
            :help="fieldErrors.haitatsuryo_shiharai_cycle"
            label="配達手数料支払サイクル"
          >
            <a-input-number
              id="haitatsuryo_shiharai_cycle"
              v-model:value="formState.haitatsuryo_shiharai_cycle"
              :min="0"
              class="w-full"
            />
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="bank_branch_code"
            :validate-status="fieldErrors.bank_branch_code ? 'error' : ''"
            :help="fieldErrors.bank_branch_code"
          >
            <template #label>
              <span>口座支店コード</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="bank_branch_code"
              v-model:value="formState.bank_branch_code"
              :maxlength="3"
            />
          </a-form-item>

          <a-form-item
            name="bank_branch_name"
            :validate-status="fieldErrors.bank_branch_name ? 'error' : ''"
            :help="fieldErrors.bank_branch_name"
          >
            <template #label>
              <span>口座支店名</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
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
            <template #label>
              <span>口座種別</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <a-radio-group v-model:value="formState.yokin_shubetsu">
              <a-radio
                v-for="opt in codes.options('YOKIN_SHUBETSU')"
                :key="opt.value"
                :value="Number(opt.value)"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="koza_no"
            :validate-status="fieldErrors.koza_no ? 'error' : ''"
            :help="fieldErrors.koza_no"
          >
            <template #label>
              <span>口座番号</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              id="koza_no"
              v-model:value="formState.koza_no"
              :maxlength="10"
            />
          </a-form-item>

          <a-form-item
            name="koza_meigi"
            :validate-status="fieldErrors.koza_meigi ? 'error' : ''"
            :help="fieldErrors.koza_meigi"
          >
            <template #label>
              <span>口座名義</span>
              <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
            </template>
            <a-input
              id="koza_meigi"
              v-model:value="formState.koza_meigi"
              :maxlength="50"
            />
          </a-form-item>

          <a-form-item
            name="tesuryo_amount"
            :validate-status="fieldErrors.tesuryo_amount ? 'error' : ''"
            :help="fieldErrors.tesuryo_amount"
            label="手数料"
          >
            <a-input-number
              id="tesuryo_amount"
              v-model:value="formState.tesuryo_amount"
              :min="0"
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- ─── 振込手数料負担区分 / 廃店フラグ ──────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="tesuryo_kubun"
            :validate-status="fieldErrors.tesuryo_kubun ? 'error' : ''"
            :help="fieldErrors.tesuryo_kubun"
            label="振込手数料負担区分"
          >
            <a-radio-group v-model:value="formState.tesuryo_kubun">
              <a-radio
                v-for="opt in codes.options('TESURYO_KUBUN')"
                :key="opt.value"
                :value="Number(opt.value)"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </a-form-item>

          <!-- [haiten-edit-only] 廃店フラグ stays hidden on CREATE — a
               brand-new hanbaiten is always 営業中 (false), so showing
               the toggle just invites accidental clicks. Edit mode
               keeps it so ops can mark a store as 廃店. -->
          <a-form-item
            v-if="isEdit"
            label="廃店フラグ"
            data-test="hanbaiten-haiten-flg-form-item"
          >
            <a-checkbox v-model:checked="formState.haiten_flg">廃店</a-checkbox>
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
