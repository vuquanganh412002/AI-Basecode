<script setup lang="ts">
/**
 * 支店マスタ登録画面 (ACSMS-SCR-007).
 *
 * Shared between create + edit flows:
 *   /shiten/create     (POST) — CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
 *   /shiten/:id/edit   (PUT)  — same 3 roles; shiten_code is immutable
 *
 * - Validation rules + error message text from
 *   docs/design/ACSMS-SCR-007/screen-design.md (機能定義).
 * - DOM structure / Japanese button copy from
 *   docs/design/ACSMS-SCR-007/index.html.
 * - API contract from docs/design/ACSMS-SCR-007/ACSMS-SCR-007-api.md.
 *
 * NICHINO_ADMIN has NO shiten.* permission per api.md §4.2, so the
 * router guard rejects them — the form assumes a JA-scoped session
 * (session.ja_id non-null).
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import {
  HALF_WIDTH_KATAKANA_RE,
  JASTEM_NAME_RE,
  kanaFormatMessage,
  jastemNameFormatMessage,
} from '@/utils/kana';
import { RoleCode } from '@/constants/enums';
import {
  createShiten,
  getShiten,
  updateShiten,
  type CreateShitenRequest,
  type UpdateShitenRequest,
} from '@/api/shiten/shiten';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

/** Numeric id from the path, or undefined for create mode. */
const shitenIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => shitenIdParam.value !== undefined);

// [role5-locked-fields] Customer policy 2026-05 — JA_KANRI_SHITEN can
// edit shiten in edit mode BUT 管理支店 (kanri_shiten_id) must stay
// read-only. That's the shiten's "parent" assignment — only higher
// roles (CHUOKAI / JA_HONTEN / NICHINO_*) reassign a branch to a
// different kanri-shiten; role 5 sees the value for context but
// can't change it. Everything else (金融機関支店フラグ / 支店名 /
// カナ / JASTEM / 備考 / 更新 submit) stays editable for role 5.
//
// Kept as a Set + computed (vs. inline `role_code === ...`) so future
// additions stay one-line: extend the Set, no code-flow changes.
const ROLE5_LOCKED_FIELDS_ROLES: ReadonlySet<string> = new Set([
  RoleCode.JA_KANRI_SHITEN,
]);
const isRole5LockedFields = computed(
  () =>
    isEdit.value &&
    ROLE5_LOCKED_FIELDS_ROLES.has(authStore.user?.role_code ?? ''),
);

// [role5-view-only] 顧客要件 2026-06 — JA_KANRI_SHITEN は同一 JA の全支店を
// 閲覧できるが、自管理支店配下でない行は更新できない（BE は update を 403 で
// 拒否）。編集画面を開いた支店が自管理支店配下でない場合、全項目を読み取り
// 専用にし 更新ボタンを無効化する（読み取り専用ビュー）。loadedKanriShitenId
// は編集プリロード時にだけ確定するので、それまでは false（作成モードは対象外）。
const loadedKanriShitenId = ref<number | null>(null);
const isViewOnly = computed(
  () =>
    isEdit.value &&
    authStore.user?.role_code === RoleCode.JA_KANRI_SHITEN &&
    loadedKanriShitenId.value !== null &&
    loadedKanriShitenId.value !== (authStore.user?.kanri_shiten_id ?? null),
);

const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);

// Form state — kanri_shiten_id stays undefined until the user picks one
// so antd's <a-select> shows the placeholder ("選択してください") instead
// of a literal "0". validateClient catches the unset case.
type FormState = Omit<CreateShitenRequest, 'kanri_shiten_id'> & {
  kanri_shiten_id: number | undefined;
};

const formState = reactive<FormState>({
  shiten_code: '',
  shiten_name: '',
  shiten_name_kana: '',
  kanri_shiten_id: undefined,
  kinyu_shiten_flg: false,
  // JASTEM 店舗単位 4 列 — initialise to '' so the edit-mode preload
  // and the POST body always carry strings (BE column is NOT NULL).
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  jastem_tyokin_shubetsu: '',
  jastem_koza_no: '',
  biko: '',
});

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

/* ─── Lifecycle ────────────────────────────────────────────────────── */

onMounted(async () => {
  // 管理支店 dropdown via ACSMS-API-COMMON-004 — scoped to caller's JA
  // (cascade source). NICHINO_ADMIN has no ja_id, so the form is
  // unreachable for them anyway (router guard rejects on shiten.create
  // / shiten.update which admins don't hold). The 3 JA-level roles
  // always carry a non-null session.ja_id.
  const jaId = authStore.user?.ja_id;
  if (jaId !== null && jaId !== undefined) {
    try {
      const resp = await getKanriShitenDropdown(jaId);
      kanriShitenOptions.value = resp.data;
    } catch {
      // Axios interceptor already toasted on 403/500.
      kanriShitenOptions.value = [];
    }
  }

  // Edit-mode preload.
  if (shitenIdParam.value !== undefined) {
    try {
      const resp = await getShiten(shitenIdParam.value);
      // Capture the loaded branch's parent kanri_shiten for the
      // role-5 view-only check ([role5-view-only]).
      loadedKanriShitenId.value = resp.data.kanri_shiten_id ?? null;
      Object.assign(formState, {
        shiten_code: resp.data.shiten_code,
        shiten_name: resp.data.shiten_name,
        shiten_name_kana: resp.data.shiten_name_kana ?? '',
        kanri_shiten_id: resp.data.kanri_shiten_id,
        kinyu_shiten_flg: !!resp.data.kinyu_shiten_flg,
        // JASTEM 店舗単位 4 列 — `?? ''` guards legacy rows that
        // pre-date the migration (where the column may not be present
        // in the response payload from older BE deploys).
        jastem_toriatsukai_tenpo_code: resp.data.jastem_toriatsukai_tenpo_code ?? '',
        jastem_tenpo_name: resp.data.jastem_tenpo_name ?? '',
        jastem_tyokin_shubetsu: resp.data.jastem_tyokin_shubetsu ?? '',
        jastem_koza_no: resp.data.jastem_koza_no ?? '',
        biko: resp.data.biko ?? '',
      });
      await editGuard.capture();
    } catch {
      // 404 / 403 — global axios interceptor toasts + this view bounces.
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
const SHITEN_CODE_FORMAT_MSG = '支店コードは半角数字3桁で入力してください。';
const KANA_FORMAT_MSG = kanaFormatMessage('支店名');

// JASTEM 店舗単位 fields — mirror BE @Matches regexes for instant feedback.
const TENPO_CODE_FORMAT_MSG =
  'データ送信取扱店舗コードは半角数字で入力してください（スペース不可）。';
// 店舗名 — カタカナ/英数字は半角、漢字・ひらがなは可（JASTEM_NAME_RE）。
const TENPO_NAME_FORMAT_MSG = jastemNameFormatMessage('店舗名');
const TYOKIN_SHUBETSU_FORMAT_MSG =
  '貯金種別は 1（普通貯金）/ 2（当座貯金）/ 9（その他）のいずれかを指定してください。';
const KOZA_NO_FORMAT_MSG = '口座番号は半角数字で入力してください。';
const DIGITS_RE = /^\d+$/;
const TYOKIN_SHUBETSU_RE = /^[129]$/;

// JASTEM Zengin 仕様で固定の3値（m_code 非依存）。labels are spec-mandated.
const TYOKIN_SHUBETSU_OPTIONS = [
  { value: '1', label: '1（普通）' },
  { value: '2', label: '2（当座）' },
  { value: '9', label: '9（その他）' },
];

/**
 * One JASTEM field: required (when 金融機関支店フラグ=true) first, then a
 * format check only when non-empty — so the user sees one message at a time.
 */
function checkJastemField(
  errs: Record<string, string>,
  field: string,
  value: string | undefined,
  required: boolean,
  formatRe: RegExp,
  formatMsg: string,
): void {
  if (required && !value?.trim()) {
    errs[field] = REQUIRED_MSG;
  } else if (value && !formatRe.test(value)) {
    errs[field] = formatMsg;
  }
}

function validateJastemFields(
  form: FormState,
  errs: Record<string, string>,
): void {
  // 金融機関支店フラグ = true のとき JASTEM 4項目（データ送信取扱店舗コード /
  // 店舗名 / 貯金種別 / 口座番号）は必須。
  const required = form.kinyu_shiten_flg === true;
  checkJastemField(
    errs,
    'jastem_toriatsukai_tenpo_code',
    form.jastem_toriatsukai_tenpo_code,
    required,
    DIGITS_RE,
    TENPO_CODE_FORMAT_MSG,
  );
  checkJastemField(
    errs,
    'jastem_tenpo_name',
    form.jastem_tenpo_name,
    required,
    JASTEM_NAME_RE,
    TENPO_NAME_FORMAT_MSG,
  );
  checkJastemField(
    errs,
    'jastem_tyokin_shubetsu',
    form.jastem_tyokin_shubetsu,
    required,
    TYOKIN_SHUBETSU_RE,
    TYOKIN_SHUBETSU_FORMAT_MSG,
  );
  checkJastemField(
    errs,
    'jastem_koza_no',
    form.jastem_koza_no,
    required,
    DIGITS_RE,
    KOZA_NO_FORMAT_MSG,
  );
}

function validateClient(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {};

  // Required checks. ?.trim() is mandatory because antd's <a-select
  // allow-clear> sets v-model to undefined on × click — see vue.md.
  if (!isEdit.value && !form.shiten_code?.trim()) {
    errs.shiten_code = REQUIRED_MSG;
  }
  if (!form.shiten_name?.trim()) {
    errs.shiten_name = REQUIRED_MSG;
  }
  if (!form.kanri_shiten_id || form.kanri_shiten_id === 0) {
    errs.kanri_shiten_id = REQUIRED_MSG;
  }

  // Format check — mirror BE @Matches(/^\d{3}$/) for instant feedback.
  if (
    !errs.shiten_code &&
    form.shiten_code &&
    !/^\d{3}$/.test(form.shiten_code)
  ) {
    errs.shiten_code = SHITEN_CODE_FORMAT_MSG;
  }

  // Half-width katakana — downstream Zengin CSV / PDF exports require
  // half-width per ﾆﾎﾝｼﾞｭｳｼﾞｭｳｺﾞｾﾝﾀｰ format spec. See vue.md §Kana fields.
  if (
    form.shiten_name_kana &&
    !HALF_WIDTH_KATAKANA_RE.test(form.shiten_name_kana)
  ) {
    errs.shiten_name_kana = KANA_FORMAT_MSG;
  }

  validateJastemFields(form, errs);

  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit pipeline ─────────────────────────────────────────────── */

const FIELD_ORDER: ReadonlyArray<keyof FormState> = [
  'kanri_shiten_id',
  'kinyu_shiten_flg',
  'shiten_code',
  'shiten_name',
  'shiten_name_kana',
  // JASTEM 店舗単位 4 列 — DOM order matches the template's row 3.
  'jastem_toriatsukai_tenpo_code',
  'jastem_tenpo_name',
  'jastem_tyokin_shubetsu',
  'jastem_koza_no',
  'biko',
];

function focusFirstError(errors: Record<string, string>): void {
  const first = FIELD_ORDER.find((f) => errors[f as string]);
  if (!first) return;

  void nextTick(() => {
    let target: HTMLElement | null = document.getElementById(first as string);
    if (!target) {
      target = document.querySelector<HTMLElement>(
        `[id$="_${first as string}"], [id="${first as string}"]`,
      );
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

async function submitWith(form: FormState): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(errs);
    return;
  }

  await submit(async () => {
    // [highlight-on-return]
    // Carry the just-touched shiten_id back to the list view via
    // ?highlight=:id so the list can pull that row to position 1
    // (customer ask 2026-05-19 — better feedback than scrolling
    // through a code-sorted list to find the change).
    let highlightId: number | undefined;
    if (shitenIdParam.value === undefined) {
      // validateClient guarantees kanri_shiten_id is set for create mode.
      const created = await createShiten(form as CreateShitenRequest);
      notify.created();
      highlightId = created.data.shiten_id;
    } else {
      // PUT body drops shiten_code (immutable per api.md §3 注記).
      const { shiten_code: _drop, ...updateBody } = form;
      void _drop;
      await updateShiten(
        shitenIdParam.value,
        updateBody as UpdateShitenRequest,
      );
      notify.updated();
      highlightId = shitenIdParam.value;
    }
    await router.push({
      name: 'ShitenList',
      query: highlightId === undefined ? undefined : { highlight: String(highlightId) },
    });
  });

  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(fieldErrors.value);
  }
}

async function onFormSubmit(): Promise<void> {
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  // antd `<a-select allow-clear>` sets v-model to `undefined` on × click.
  // JSON.stringify drops undefined → BE's pickString sees "key absent"
  // and keeps the prior value, so a cleared dropdown wouldn't actually
  // clear the column. Normalize to '' here so the BE receives the key
  // explicitly and `@Transform(blankToUndef)` + pickString's "key
  // present but undefined" branch clears the column. (See vue.md.)
  await submitWith({
    ...formState,
    jastem_tyokin_shubetsu: formState.jastem_tyokin_shubetsu ?? '',
  });
}

/**
 * Back button — straight navigation to the list view (no confirm modal,
 * matching the SCR-009 customer decision to drop the popup).
 */
function onBack(): void {
  router.push({ name: 'ShitenList' });
}

defineExpose({ submitWith, form: formState });
</script>

<template>
  <div class="space-y-6">
    <BaseCard padding="none">
      <div class="px-4 py-4 border-b border-border">
        <h3 class="text-lg font-medium text-text-main">支店情報入力</h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        class="p-4 space-y-2"
        @keydown="preventEnterImplicitSubmit"
        @finish="onFormSubmit"
      >
        <!-- Row 1: 管理支店 (full width) + 金融機関支店フラグ -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            class="md:col-span-2"
            name="kanri_shiten_id"
            :validate-status="allFieldErrors.kanri_shiten_id ? 'error' : ''"
            :help="allFieldErrors.kanri_shiten_id"
          >
            <template #label>
              <span>管理支店</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.kanri_shiten_id"
              placeholder="選択してください"
              :options="
                kanriShitenOptions.map((k) => ({
                  value: k.kanri_shiten_id,
                  label: `${k.kanri_shiten_code} - ${k.kanri_shiten_name}`,
                }))
              "
              allow-clear
              :disabled="isRole5LockedFields || isViewOnly"
            />
          </a-form-item>

          <!-- 金融機関支店フラグは作成後変更不可（顧客要件 2026-07）。編集画面では
               disabled にして固定する。BE も PUT で変更要求を 400 で拒否する（二重防御）。 -->
          <a-form-item name="kinyu_shiten_flg" label=" ">
            <a-checkbox
              v-model:checked="formState.kinyu_shiten_flg"
              :disabled="isViewOnly || isEdit"
            >
              金融機関支店フラグ
            </a-checkbox>
          </a-form-item>
        </div>

        <!-- Row 2: 支店コード / 支店名 / 支店名カナ -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="shiten_code"
            :validate-status="allFieldErrors.shiten_code ? 'error' : ''"
            :help="allFieldErrors.shiten_code"
          >
            <template #label>
              <span>支店コード</span>
              <span v-if="!isEdit" class="text-error ml-1">*</span>
            </template>
            <BaseCodeInput
              v-model:value="formState.shiten_code"
              :disabled="isEdit"
              :maxlength="3"
              placeholder="支店コードを入力してください"
            />
          </a-form-item>

          <a-form-item
            name="shiten_name"
            :validate-status="allFieldErrors.shiten_name ? 'error' : ''"
            :help="allFieldErrors.shiten_name"
          >
            <template #label>
              <span>支店名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.shiten_name"
              :maxlength="100"
              placeholder="支店名を入力してください"
              :disabled="isViewOnly"
            />
          </a-form-item>

          <a-form-item
            label="支店名カナ"
            name="shiten_name_kana"
            :validate-status="allFieldErrors.shiten_name_kana ? 'error' : ''"
            :help="allFieldErrors.shiten_name_kana"
          >
            <a-input
              v-model:value="formState.shiten_name_kana"
              :maxlength="100"
              :disabled="isViewOnly"
            />
          </a-form-item>
        </div>

        <!-- Row 3: JASTEM 店舗単位 — 4 fields (※空文字許容).
             Visible labels drop the JASTEM_ prefix per customer-facing copy;
             the prefix lives only in the DB column / docs comments.
             Lengths mirror database-design.md §m_shiten rows 7-10. -->
        <div class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-6">
          <a-form-item
            name="jastem_toriatsukai_tenpo_code"
            :validate-status="allFieldErrors.jastem_toriatsukai_tenpo_code ? 'error' : ''"
            :help="allFieldErrors.jastem_toriatsukai_tenpo_code"
          >
            <template #label>
              <span>データ送信取扱店舗コード</span>
              <span v-if="formState.kinyu_shiten_flg" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.jastem_toriatsukai_tenpo_code"
              :maxlength="3"
              :disabled="isViewOnly"
            />
          </a-form-item>

          <a-form-item
            name="jastem_tenpo_name"
            :validate-status="allFieldErrors.jastem_tenpo_name ? 'error' : ''"
            :help="allFieldErrors.jastem_tenpo_name"
          >
            <template #label>
              <span>店舗名</span>
              <span v-if="formState.kinyu_shiten_flg" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.jastem_tenpo_name"
              :maxlength="15"
              :disabled="isViewOnly"
            />
          </a-form-item>

          <a-form-item
            name="jastem_tyokin_shubetsu"
            :validate-status="allFieldErrors.jastem_tyokin_shubetsu ? 'error' : ''"
            :help="allFieldErrors.jastem_tyokin_shubetsu"
          >
            <template #label>
              <span>貯金種別</span>
              <span v-if="formState.kinyu_shiten_flg" class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.jastem_tyokin_shubetsu"
              placeholder="選択してください"
              :options="TYOKIN_SHUBETSU_OPTIONS"
              allow-clear
              :disabled="isViewOnly"
            />
          </a-form-item>

          <a-form-item
            name="jastem_koza_no"
            :validate-status="allFieldErrors.jastem_koza_no ? 'error' : ''"
            :help="allFieldErrors.jastem_koza_no"
          >
            <template #label>
              <span>口座番号</span>
              <span v-if="formState.kinyu_shiten_flg" class="text-error ml-1">*</span>
            </template>
            <a-input
              v-model:value="formState.jastem_koza_no"
              :maxlength="7"
              :disabled="isViewOnly"
            />
          </a-form-item>
        </div>

        <!-- Row 4: 備考 -->
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
            :disabled="isViewOnly"
          />
        </a-form-item>

        <BaseFormFooter
          :is-edit="isEdit"
          :submitting="submitting"
          :disabled="isViewOnly"
          @cancel="onBack"
        />
      </a-form>
    </BaseCard>
  </div>
</template>
