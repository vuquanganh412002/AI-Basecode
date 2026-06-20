<script setup lang="ts">
/**
 * 単価マスタ登録画面 (ACSMS-SCR-003).
 *
 * Single view that handles BOTH the create and edit flows:
 *   /tanka/create     (POST)  -- create mode
 *   /tanka/:id/edit   (PUT)   -- edit mode (preloads via GET /api/v1/tanka/:id)
 *
 * - Validation rules + error message text from
 *   docs/design/ACSMS-SCR-003/screen-design.md (機能定義 + メッセージ情報).
 * - DOM structure / Japanese button copy from
 *   docs/design/ACSMS-SCR-003/index.html.
 * - API contract from docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md.
 *
 * tanka_code is immutable on edit per api.md §API-003-003 footnote
 * (画面側でdisabled、 PUT body omits it).
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs, { type Dayjs } from 'dayjs';
import { message } from 'ant-design-vue';

import { todayIsoTokyo, isPastDayTokyo } from '@/utils/datetime';
// `dayjs` is kept ONLY to parse picker-frame strings (e.g. user-selected
// YYYY-MM-DD) into a Dayjs that lives in the same TZ frame as the picker
// output. NEVER call `dayjs()` (no args) here — use `nowTokyo()` /
// `isPastDayTokyo()` instead per `.claude/rules/vue.md §Date/Time`.

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseCurrencyInput from '@/components/common/BaseCurrencyInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import {
  createTanka,
  getTanka,
  updateTanka,
  type CreateTankaRequest,
  type UpdateTankaRequest,
} from '@/api/tanka/tanka';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();
const { fieldErrors, submitting, submit } = useApiForm();

/** Numeric id from the path, or undefined for create mode. */
const tankaIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => tankaIdParam.value !== undefined);

const canSubmit = computed(() =>
  isEdit.value
    ? authStore.hasPermission('tanka.update')
    : authStore.hasPermission('tanka.create'),
);

/**
 * Form-state shape — string-radio for tanka_type to align with the
 * project's <a-radio-group> + Number() coercion at the submit boundary
 * (same pattern as zei_kubun in JaFormView). Date inputs bind to
 * YYYY-MM-DD strings.
 *
 * Defaults follow 機能定義 1.2:
 *   - 単価種別 = '1' (新聞購読料)
 *   - 税率 = 0
 *   - 単価税込 / 税抜 = 0
 *   - 適用開始日 = 本日 (computed below)
 *   - 備考 = '' (NOT NULL, blank = '')
 *   - 有効フラグ = true
 */
interface TankaFormState {
  tanka_type: '1' | '2';
  tanka_code: string;
  tanka_name: string;
  tax_rate: number;
  // 単価（税込）/（税抜） per 機能定義: コントロール=テキスト, 数値, 10桁,
  // 半角数字のみ. null when the user hasn't entered anything (empty input);
  // 0 is a legitimate user-entered value distinct from null. The "at-least
  // -one-of" cross-field rule fires only when BOTH are null.
  kingaku_zeikomi: number | null;
  kingaku_zeinuki: number | null;
  tekiyo_start_date: string;
  tekiyo_end_date: string;
  biko: string;
  active_flg: boolean;
  campaign_flg: boolean;
}

// [tokyo-tz] 「本日」は常に Asia/Tokyo で計算する
// （`.claude/rules/vue.md §Date/Time`）— ブラウザ TZ に依存させない。
function todayIso(): string {
  return todayIsoTokyo();
}

/**
 * Disable past dates on the 適用開始日 picker whenever the field is
 * interactive (CREATE mode, or EDIT mode where the existing start_date
 * has NOT yet passed — see `isStartDateReadOnly`). In EDIT mode where
 * the field is read-only (start already in the past), the picker is
 * fully disabled by `:disabled` so this function doesn't run.
 *
 * Lets a "starts next week" tanka be re-scheduled forward, but blocks
 * the user from backdating it. The submit-time validator in
 * `validateClient` re-enforces this as defence-in-depth.
 */
function disableStartDate(current: Dayjs): boolean {
  return isPastDayTokyo(current);
}

/**
 * Disable end-date selections that would violate `end >= start`. Also
 * disables past dates in CREATE mode (end >= today is implied by
 * end >= start >= today). The submit-time validator still enforces
 * `end >= start` as a defence-in-depth check.
 */
function disableEndDate(current: Dayjs): boolean {
  if (!current) return false;
  // 開始日も picker フレーム（ブラウザ local）に揃えてカレンダー日比較する。
  // 「今日」基準だけは Asia/Tokyo に固定 — BE もその解釈で受け取るため
  // （`.claude/rules/vue.md §Date/Time`）。`dayjs(s)` 直呼びは picker-
  // frame の文字列パース用途に限り許容する（now/today 取得には不可）。
  const start = formState.tekiyo_start_date
    ? dayjs(formState.tekiyo_start_date)
    : null;
  if (start && current.isBefore(start, 'day')) return true;
  if (!isEdit.value && isPastDayTokyo(current)) return true;
  return false;
}

/**
 * 適用開始日 becomes read-only in EDIT mode once the existing record's
 * start date has already passed — changing it would rewrite history
 * (the price has been in effect since `formState.tekiyo_start_date`,
 * so retroactively shifting the start makes no business sense). The
 * BE update() mirrors this by silently preserving the existing value
 * when the stored start is in the past, so a curl bypass can't
 * change it either.
 */
const isStartDateReadOnly = computed(() => {
  if (!isEdit.value || !formState.tekiyo_start_date) return false;
  return formState.tekiyo_start_date < todayIso();
});

const formState = reactive<TankaFormState>({
  tanka_type: '1',
  tanka_code: '',
  tanka_name: '',
  tax_rate: 0,
  // Initial value 0 to match the screen mockup (customer prefers a visible
  // "0" rather than empty placeholder). The type stays `number | null` so
  // user CAN clear the field via the text input; the at-least-one-of guard
  // in validateClient still catches the both-cleared edge case.
  kingaku_zeikomi: 0,
  kingaku_zeinuki: 0,
  tekiyo_start_date: todayIso(),
  tekiyo_end_date: '',
  biko: '',
  active_flg: true,
  // キャンペーンフラグは既定 FALSE（キャンペーン非対象が通常）.
  campaign_flg: false,
});

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

/* ─── Lifecycle ────────────────────────────────────────────────────── */

onMounted(async () => {
  if (tankaIdParam.value === undefined) return; // create mode — nothing to load.

  try {
    const resp = await getTanka(tankaIdParam.value);
    Object.assign(formState, {
      // BE returns tanka_type as a number (1 = 新聞購読料, 2 = 配達手数料)
      // per m_code.code_category='TANKA_TYPE'. The form uses a string
      // radio v-model ('1'/'2'), so coerce at the load boundary —
      // without this the radio's strict-equality check fails (`'1' !== 1`)
      // and edit mode shows nothing selected.
      tanka_type: String(resp.data.tanka_type ?? '1') as '1' | '2',
      tanka_code: resp.data.tanka_code,
      tanka_name: resp.data.tanka_name,
      tax_rate: Number(resp.data.tax_rate ?? 0),
      kingaku_zeikomi:
        resp.data.kingaku_zeikomi === null || resp.data.kingaku_zeikomi === undefined
          ? null
          : Number(resp.data.kingaku_zeikomi),
      kingaku_zeinuki:
        resp.data.kingaku_zeinuki === null || resp.data.kingaku_zeinuki === undefined
          ? null
          : Number(resp.data.kingaku_zeinuki),
      tekiyo_start_date: resp.data.tekiyo_start_date ?? '',
      tekiyo_end_date: resp.data.tekiyo_end_date ?? '',
      biko: resp.data.biko ?? '',
      active_flg: Boolean(resp.data.active_flg),
      campaign_flg: Boolean(resp.data.campaign_flg),
    });
    await editGuard.capture();
  } catch {
    // 404 / 403 — global axios interceptor already toasted via
    // src/api/error-handler.ts. Drop back to the list so we don't
    // render an empty edit form.
    try {
      await router.push({ name: 'TankaList' });
    } catch {
      /* test routers may not register TankaList — ignore. */
    }
  }
});

/* ─── Validation (per screen-design.md メッセージ情報) ────────────── */

const REQUIRED_MSG = '必須項目です。';
const TAX_RATE_RANGE_MSG = '税率は0から100の範囲で入力してください。';
const KINGAKU_ZEIKOMI_NONNEG_MSG = '単価（税込）は0以上で入力してください。';
const KINGAKU_ZEINUKI_NONNEG_MSG = '単価（税抜）は0以上で入力してください。';
// DB column is NUMERIC(10, 0) — 11+ digits triggers PostgreSQL numeric
// overflow on INSERT (a 500). The BE DTO now @Max-bounds the value to
// the same 10-digit ceiling; mirror it here for instant feedback.
const KINGAKU_MAX = 9_999_999_999;
const KINGAKU_ZEIKOMI_MAX_MSG = '単価（税込）は10桁以下で入力してください。';
const KINGAKU_ZEINUKI_MAX_MSG = '単価（税抜）は10桁以下で入力してください。';
// 機能定義 (画面設計書): 税込/税抜 のどちらかを入力。
const KINGAKU_EITHER_MSG = '単価（税込）または単価（税抜）のいずれかを入力してください。';
const DATE_ORDER_MSG = '適用終了日は適用開始日以降を指定してください。';
const START_DATE_NOT_PAST_MSG = '適用開始日は本日以降の日付を入力してください。';

/**
 * Past-date guard for 適用開始日. Only enforces when the field is
 * interactive — an existing record with a historical start_date stays
 * read-only via `isStartDateReadOnly` and must not be flagged invalid
 * on save.
 */
function isStartDateInPast(form: TankaFormState): boolean {
  if (!form.tekiyo_start_date) return false;
  if (isStartDateReadOnly.value) return false;
  return form.tekiyo_start_date < todayIso();
}

function checkKingaku(
  value: number | null,
  belowZeroMsg: string,
  overflowMsg: string,
): string | null {
  if (value === null || typeof value !== 'number') return null;
  if (value < 0) return belowZeroMsg;
  if (value > KINGAKU_MAX) return overflowMsg;
  return null;
}

function checkTekiyoOrder(form: TankaFormState, errs: Record<string, string>): string | null {
  if (errs.tekiyo_start_date || errs.tekiyo_end_date) return null;
  if (!form.tekiyo_start_date || !form.tekiyo_end_date) return null;
  if (form.tekiyo_end_date < form.tekiyo_start_date) return DATE_ORDER_MSG;
  return null;
}

function checkKingakuPair(form: TankaFormState): Record<string, string> {
  const errs: Record<string, string> = {};
  const zeikomiErr = checkKingaku(
    form.kingaku_zeikomi,
    KINGAKU_ZEIKOMI_NONNEG_MSG,
    KINGAKU_ZEIKOMI_MAX_MSG,
  );
  if (zeikomiErr) errs.kingaku_zeikomi = zeikomiErr;
  const zeinukiErr = checkKingaku(
    form.kingaku_zeinuki,
    KINGAKU_ZEINUKI_NONNEG_MSG,
    KINGAKU_ZEINUKI_MAX_MSG,
  );
  if (zeinukiErr) errs.kingaku_zeinuki = zeinukiErr;
  // At-least-one-of: 税込/税抜 のどちらかを入力 (機能定義).
  if (form.kingaku_zeikomi === null && form.kingaku_zeinuki === null) {
    errs.kingaku_zeikomi = KINGAKU_EITHER_MSG;
  }
  return errs;
}

function validateClient(form: TankaFormState): Record<string, string> {
  const errs: Record<string, string> = {};

  // Required-field checks — `?.trim()` is mandatory for string fields
  // bound to clearable controls (native <input type="date">, antd
  // selects) which set v-model to `undefined` on clear. A bare
  // `.trim()` would throw TypeError → generic "エラーが発生しました…"
  // toast → masks the required-field violation. See
  // .claude/rules/vue.md §Validation — mirror BE rules.
  if (!isEdit.value && !form.tanka_code?.trim()) {
    errs.tanka_code = REQUIRED_MSG;
  }
  if (!form.tanka_name?.trim()) errs.tanka_name = REQUIRED_MSG;
  if (!form.tekiyo_start_date?.trim()) errs.tekiyo_start_date = REQUIRED_MSG;
  if (!form.tekiyo_end_date?.trim()) errs.tekiyo_end_date = REQUIRED_MSG;
  if (!errs.tekiyo_start_date && isStartDateInPast(form)) {
    errs.tekiyo_start_date = START_DATE_NOT_PAST_MSG;
  }
  // tanka_type — accept either string ('1'/'2' from radio v-model) OR
  // number (1/2 from the fixture payload + the BE response in edit mode).
  // String() collapses both into the same comparable form so the spec's
  // numeric payload doesn't trip a phantom "required" error.
  {
    const t = String(form.tanka_type ?? '');
    if (t !== '1' && t !== '2') errs.tanka_type = REQUIRED_MSG;
  }

  // active_flg — required (radio must be 有効 or 無効). With boolean
  // v-model the user can't actually clear it, but guard for the case
  // where the payload omits it / passes null so the validator stays
  // consistent with the visual required-marker.
  if (typeof form.active_flg !== 'boolean') {
    errs.active_flg = REQUIRED_MSG;
  }

  // campaign_flg — required (radio must be 有効 or 無効). Mirrors active_flg.
  if (typeof form.campaign_flg !== 'boolean') {
    errs.campaign_flg = REQUIRED_MSG;
  }

  // Numeric range / non-negative checks (only when value is present).
  if (
    typeof form.tax_rate === 'number' &&
    (form.tax_rate < 0 || form.tax_rate > 100)
  ) {
    errs.tax_rate = TAX_RATE_RANGE_MSG;
  }
  Object.assign(errs, checkKingakuPair(form));

  // Date-order: 適用終了日 >= 適用開始日 (string compare is correct for
  // ISO 8601 YYYY-MM-DD format).
  const tekiyoErr = checkTekiyoOrder(form, errs);
  if (tekiyoErr) errs.tekiyo_end_date = tekiyoErr;

  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit pipeline ─────────────────────────────────────────────── */

/** DOM order of form fields for focusFirstError. Keep in sync with the template. */
const FIELD_ORDER: ReadonlyArray<keyof TankaFormState> = [
  'tanka_type',
  'tanka_code',
  'tanka_name',
  'tax_rate',
  'kingaku_zeikomi',
  'kingaku_zeinuki',
  'tekiyo_start_date',
  'tekiyo_end_date',
  'active_flg',
  'campaign_flg',
  'biko',
];

function focusFirstError(errors: Record<string, string>): void {
  const first = FIELD_ORDER.find((f) => errors[f]);
  if (!first) return;

  void nextTick(() => {
    let target: HTMLElement | null = document.getElementById(first);
    if (!target) {
      target = document.querySelector<HTMLElement>(
        `[id$="_${first}"], [id="${first}"]`,
      );
    }
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
async function submitWith(form: TankaFormState): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(errs);
    return;
  }

  await submit(async () => {
    if (tankaIdParam.value === undefined) {
      const createBody: CreateTankaRequest = {
        tanka_type: Number(form.tanka_type),
        tanka_code: form.tanka_code,
        tanka_name: form.tanka_name,
        tax_rate: form.tax_rate,
        kingaku_zeikomi: form.kingaku_zeikomi ?? undefined,
        kingaku_zeinuki: form.kingaku_zeinuki ?? undefined,
        tekiyo_start_date: form.tekiyo_start_date,
        tekiyo_end_date: form.tekiyo_end_date,
        biko: form.biko,
        active_flg: form.active_flg,
        campaign_flg: form.campaign_flg,
      };
      await createTanka(createBody);
      notify.created();
    } else {
      // UPDATE — tanka_code is immutable per api.md §API-003-003 footnote.
      // Strip it from the payload so the BE's forbidNonWhitelisted pipe
      // doesn't reject the request.
      const updateBody: UpdateTankaRequest = {
        tanka_type: Number(form.tanka_type),
        tanka_name: form.tanka_name,
        tax_rate: form.tax_rate,
        kingaku_zeikomi: form.kingaku_zeikomi ?? undefined,
        kingaku_zeinuki: form.kingaku_zeinuki ?? undefined,
        tekiyo_start_date: form.tekiyo_start_date,
        tekiyo_end_date: form.tekiyo_end_date,
        biko: form.biko,
        active_flg: form.active_flg,
        campaign_flg: form.campaign_flg,
      };
      await updateTanka(tankaIdParam.value, updateBody);
      notify.updated();
    }
    // Only navigate when the API call resolved without throwing —
    // `submit()` swallows the error and the axios interceptor toasts.
    await router.push({ name: 'TankaList' });
  });

  // After the round-trip, server-side VALIDATION_ERROR fields are now
  // in fieldErrors (via useApiForm). Focus the first one too.
  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(fieldErrors.value);
  }
}

async function onFormSubmit(): Promise<void> {
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (tankaIdParam.value !== undefined && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  await submitWith({ ...formState });
}

function onBack(): void {
  router.back();
}

defineExpose({
  submitWith,
  form: formState,
  disableStartDate,
  disableEndDate,
  isStartDateReadOnly,
});
</script>

<template>
  <div class="space-y-6">
    <!-- Page title + breadcrumb are rendered by AppHeader (in MainLayout)
         based on route meta — do NOT duplicate here. -->

    <BaseCard padding="none">
      <div class="px-4 py-4 border-b border-border">
        <h3 class="text-lg font-medium text-text-main">単価情報入力</h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onFormSubmit"
      >
        <!-- 単価種別 — ラジオ. Default '1' (新聞購読料) per 機能定義 1.2.
             m_code TANKA_TYPE labels read from useCodesStore — runtime-editable
             customer copy, no hardcoded label map (vue.md §Code Master). -->
        <a-form-item
          name="tanka_type"
          :validate-status="allFieldErrors.tanka_type ? 'error' : ''"
          :help="allFieldErrors.tanka_type"
        >
          <template #label>
            <span>単価種別</span>
            <span class="text-error ml-1">*</span>
          </template>
          <a-radio-group v-model:value="formState.tanka_type">
            <a-radio
              v-for="opt in codes.options('TANKA_TYPE')"
              :key="opt.value"
              :value="String(opt.value)"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- Row 2: tanka_code + tanka_name (code takes 1/3, name 2/3). -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="tanka_code"
            :validate-status="allFieldErrors.tanka_code ? 'error' : ''"
            :help="allFieldErrors.tanka_code"
          >
            <template #label>
              <span>単価コード</span>
              <span class="text-error ml-1">*</span>
            </template>
            <!-- tanka_code is immutable on update — disabled via :disabled
                 (per 機能定義 2.3 + api.md §API-003-003 footnote). The
                 BE additionally rejects it via forbidNonWhitelisted on the
                 UpdateTankaDto — defence in depth. -->
            <BaseCodeInput
              v-model:value="formState.tanka_code"
              :maxlength="10"
              :disabled="isEdit"
              placeholder="単価コード"
            />
          </a-form-item>

          <a-form-item
            class="md:col-span-2"
            name="tanka_name"
            :validate-status="allFieldErrors.tanka_name ? 'error' : ''"
            :help="allFieldErrors.tanka_name"
          >
            <template #label>
              <span>単価名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.tanka_name"
              :maxlength="100"
              placeholder="単価名"
            />
          </a-form-item>
        </div>

        <!-- Row 3: tax_rate / kingaku_zeikomi / kingaku_zeinuki (3 equal cols).
             Each is a number input; `addon-after` / `addon-before` mimics the
             mockup's ¥/% adornments. -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="tax_rate"
            :validate-status="allFieldErrors.tax_rate ? 'error' : ''"
            :help="allFieldErrors.tax_rate"
            label="税率 (%)"
          >
            <!--
              :min / :max intentionally omitted — antd's <a-input-number>
              auto-clamps the v-model value to the [min, max] range on
              blur, which silently rewrites user input to 0 or 100 and
              hides the validation error from validateClient. Letting
              the field accept any number means out-of-range values
              surface ACSMS-MSG TAX_RATE_RANGE_MSG instead.
            -->
            <a-input-number
              v-model:value="formState.tax_rate"
              :step="0.01"
              :precision="2"
              class="w-full"
            />
          </a-form-item>

          <a-form-item
            name="kingaku_zeikomi"
            :validate-status="allFieldErrors.kingaku_zeikomi ? 'error' : ''"
            :help="allFieldErrors.kingaku_zeikomi"
            label="単価 (税込)"
          >
            <BaseCurrencyInput
              v-model:value="formState.kingaku_zeikomi"
              :maxlength="10"
              placeholder="単価 (税込)"
            />
          </a-form-item>

          <a-form-item
            name="kingaku_zeinuki"
            :validate-status="allFieldErrors.kingaku_zeinuki ? 'error' : ''"
            :help="allFieldErrors.kingaku_zeinuki"
            label="単価 (税抜)"
          >
            <BaseCurrencyInput
              v-model:value="formState.kingaku_zeinuki"
              :maxlength="10"
              placeholder="単価 (税抜)"
            />
          </a-form-item>
        </div>

        <!-- Row 4: tekiyo_start_date + tekiyo_end_date. <a-date-picker>
             with `format="YYYY/MM/DD"` (Japanese display convention) and
             `value-format="YYYY-MM-DD"` (wire format the BE DTO regex
             expects). Native <input type="date"> rendered as dd/mm/yyyy
             on non-JP locale browsers — switching to antd's picker pins
             the display format regardless of the user's OS locale. -->
        <!-- 6-col grid: 適用開始日 / 適用終了日 span 2 each (2/3 total),
             有効単価フラグ / キャンペーンフラグ span 1 each so the two
             radio columns together occupy 1/3 of the row. -->
        <div class="grid grid-cols-1 md:grid-cols-6 gap-6">
          <a-form-item
            name="tekiyo_start_date"
            class="md:col-span-2"
            :validate-status="allFieldErrors.tekiyo_start_date ? 'error' : ''"
            :help="allFieldErrors.tekiyo_start_date"
          >
            <template #label>
              <span>適用開始日</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.tekiyo_start_date"
              format="YYYY/MM/DD"
              value-format="YYYY-MM-DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
              :disabled="isStartDateReadOnly"
              :disabled-date="disableStartDate"
            />
          </a-form-item>

          <a-form-item
            name="tekiyo_end_date"
            class="md:col-span-2"
            :validate-status="allFieldErrors.tekiyo_end_date ? 'error' : ''"
            :help="allFieldErrors.tekiyo_end_date"
          >
            <template #label>
              <span>適用終了日</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.tekiyo_end_date"
              format="YYYY/MM/DD"
              value-format="YYYY-MM-DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
              :disabled-date="disableEndDate"
            />
          </a-form-item>

          <!-- 有効単価フラグ — ラジオ (有効=true / 無効=false). Required —
               the user must pick one. Visible in both create AND edit
               modes for UI consistency with the list-view filter
               (vue.md §Reusable Building Blocks pattern). Defaults to
               true via formState. Spans 1 of the 6 grid columns; the two
               radio flags together fill 1/3 of the row (適用開始日 /
               適用終了日 take 2/6 each). -->
          <a-form-item
            name="active_flg"
            :validate-status="allFieldErrors.active_flg ? 'error' : ''"
            :help="allFieldErrors.active_flg"
          >
            <template #label>
              <span>有効単価フラグ</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-radio-group v-model:value="formState.active_flg">
              <a-radio :value="true">有効</a-radio>
              <a-radio :value="false">無効</a-radio>
            </a-radio-group>
          </a-form-item>

          <!-- キャンペーンフラグ — ラジオ (有効=true / 無効=false). Required.
               Mirrors 有効単価フラグ; defaults to false via formState. -->
          <a-form-item
            name="campaign_flg"
            :validate-status="allFieldErrors.campaign_flg ? 'error' : ''"
            :help="allFieldErrors.campaign_flg"
          >
            <template #label>
              <span>キャンペーンフラグ</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-radio-group v-model:value="formState.campaign_flg">
              <a-radio :value="true">有効</a-radio>
              <a-radio :value="false">無効</a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <!-- Row 5: 備考 (optional, textarea — last input before the footer). -->
        <a-form-item
          name="biko"
          :validate-status="allFieldErrors.biko ? 'error' : ''"
          :help="allFieldErrors.biko"
          label="備考"
        >
          <a-textarea
            v-model:value="formState.biko"
            :rows="3"
            placeholder="備考があれば入力してください"
          />
        </a-form-item>

        <BaseFormFooter
          :is-edit="isEdit"
          :submitting="submitting"
          :disabled="!canSubmit"
          @cancel="onBack"
        />
      </a-form>
    </BaseCard>
  </div>
</template>
