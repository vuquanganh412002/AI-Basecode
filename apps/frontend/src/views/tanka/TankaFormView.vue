<script setup lang="ts">
/**
 * 単価マスタ登録画面 (ACSMS-SCR-003).
 *
 * 登録・編集を兼ねる単一ビュー:
 *   /tanka/create     (POST)  -- 登録モード
 *   /tanka/:id/edit   (PUT)   -- 編集モード（GET /api/v1/tanka/:id で事前ロード）
 *
 * バリデーション・メッセージ: screen-design.md（機能定義 + メッセージ情報）
 * DOM構造・ボタン文言: index.html / API契約: ACSMS-SCR-003-api.md。
 *
 * tanka_code は編集時 immutable（api.md §API-003-003 脚注: 画面側 disabled、
 * PUT body から除外）。
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs, { type Dayjs } from 'dayjs';
import { message } from 'ant-design-vue';

import { todayIsoTokyo, isPastDayTokyo } from '@/utils/datetime';
// `dayjs` は picker フレームの文字列（YYYY-MM-DD）を同じ TZ フレームの
// Dayjs にパースする用途に限定。引数なしの `dayjs()` は禁止 — `nowTokyo()` /
// `isPastDayTokyo()` を使う（`.claude/rules/vue.md §Date/Time`）。

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
import { focusFirstError } from '@/utils/form-focus';
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

/** パスの数値 id。登録モードでは undefined。 */
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
 * フォーム状態。tanka_type は string-radio（<a-radio-group> + submit時 Number()
 * 変換、JaFormView の zei_kubun と同パターン）。日付は YYYY-MM-DD 文字列。
 *
 * 既定値は機能定義 1.2 に従う（単価種別='1'、税率=0、税込/税抜=0、
 * 適用開始日=本日、備考=''（NOT NULL）、有効フラグ=true）。
 */
interface TankaFormState {
  tanka_type: '1' | '2';
  tanka_code: string;
  tanka_name: string;
  tax_rate: number;
  // 単価（税込）/（税抜）（機能定義: テキスト・数値・10桁・半角数字のみ）。
  // 未入力は null（0 は null と区別される正当な入力値）。両方 null のときだけ
  // 「いずれか必須」の相互チェックが発火する。
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
 * 適用開始日 picker で過去日を選択不可にする（フィールドが操作可能なとき、
 * すなわち登録モード or 開始日が未到来の編集モード。`isStartDateReadOnly` 参照）。
 * 開始日が過去の編集モードでは `:disabled` で完全無効化されこの関数は走らない。
 * 前倒し変更は許可、バックデートは禁止。`validateClient` でも submit時に再検証。
 */
function disableStartDate(current: Dayjs): boolean {
  return isPastDayTokyo(current);
}

/**
 * `end >= start` を満たさない終了日を選択不可にする。登録モードでは過去日も
 * 不可（end >= start >= today）。submit時にも `end >= start` を再検証する。
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
 * 編集モードで既存の開始日が過去になっている場合、適用開始日を read-only にする。
 * 変更は履歴の書き換えになるため（開始日から既に適用中）。BE update() も過去開始日は
 * 既存値を維持するため、curl 経由でも変更不可。
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
  // 初期値 0（顧客はプレースホルダより可視の「0」を好む）。型は `number | null` の
  // ままなのでクリア可能。両方クリアのエッジは validateClient のいずれか必須で捕捉。
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

/* ─── ライフサイクル ───────────────────────────────────────────────── */

onMounted(async () => {
  if (tankaIdParam.value === undefined) return; // 登録モード — ロード不要。

  try {
    const resp = await getTanka(tankaIdParam.value);
    Object.assign(formState, {
      // BE は tanka_type を number（1=新聞購読料, 2=配達手数料、m_code
      // TANKA_TYPE）で返すが、フォームは string radio ('1'/'2')。ロード境界で
      // 変換しないと radio の strict-equal（`'1' !== 1`）で未選択表示になる。
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
    // 404 / 403 — axios interceptor（src/api/error-handler.ts）が既にトースト済み。
    // 空の編集フォームを描画しないよう一覧へ戻す。
    try {
      await router.push({ name: 'TankaList' });
    } catch {
      /* テスト用ルーターは TankaList 未登録の場合あり — 無視。 */
    }
  }
});

/* ─── Validation (per screen-design.md メッセージ情報) ────────────── */

const REQUIRED_MSG = '必須項目です。';
const TAX_RATE_RANGE_MSG = '税率は0から100の範囲で入力してください。';
const KINGAKU_ZEIKOMI_NONNEG_MSG = '単価（税込）は0以上で入力してください。';
const KINGAKU_ZEINUKI_NONNEG_MSG = '単価（税抜）は0以上で入力してください。';
// DB列は NUMERIC(10,0) — 11桁以上は INSERT時に numeric overflow（500）。
// BE DTO も同じ10桁上限を @Max で課すため、即時フィードバック用にミラー。
const KINGAKU_MAX = 9_999_999_999;
const KINGAKU_ZEIKOMI_MAX_MSG = '単価（税込）は10桁以下で入力してください。';
const KINGAKU_ZEINUKI_MAX_MSG = '単価（税抜）は10桁以下で入力してください。';
// 機能定義 (画面設計書): 税込/税抜 のどちらかを入力。
const KINGAKU_EITHER_MSG = '単価（税込）または単価（税抜）のいずれかを入力してください。';
const DATE_ORDER_MSG = '適用終了日は適用開始日以降を指定してください。';
const START_DATE_NOT_PAST_MSG = '適用開始日は本日以降の日付を入力してください。';

/**
 * 適用開始日の過去日ガード。フィールドが操作可能なときのみ発火 — 既存の過去
 * 開始日は `isStartDateReadOnly` で read-only のため保存時に不正扱いしない。
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

  // 必須チェック — clearable コントロール（native date、antd select）は
  // クリア時 v-model を `undefined` にするため `?.trim()` 必須。素の `.trim()` は
  // TypeError → 汎用エラートーストで必須違反が隠れる。.claude/rules/vue.md §Validation。
  if (!isEdit.value && !form.tanka_code?.trim()) {
    errs.tanka_code = REQUIRED_MSG;
  }
  if (!form.tanka_name?.trim()) errs.tanka_name = REQUIRED_MSG;
  if (!form.tekiyo_start_date?.trim()) errs.tekiyo_start_date = REQUIRED_MSG;
  if (!form.tekiyo_end_date?.trim()) errs.tekiyo_end_date = REQUIRED_MSG;
  if (!errs.tekiyo_start_date && isStartDateInPast(form)) {
    errs.tekiyo_start_date = START_DATE_NOT_PAST_MSG;
  }
  // tanka_type — m_code TANKA_TYPE に存在する値だけ受理。`'1' | '2'` 決め打ちは
  // 不可: TANKA_TYPE は Group B（顧客が実行時に値を追加できる）で、radio は
  // codes.options('TANKA_TYPE') から描画するため、追加値を選べるのに保存できない
  // という不整合になる。codes.has() は string/number 差も吸収する。
  if (!codes.has('TANKA_TYPE', form.tanka_type)) errs.tanka_type = REQUIRED_MSG;

  // active_flg — 必須（有効 or 無効）。boolean v-model でクリア不可だが、payload が
  // 省略/null を渡す場合に備え、必須マーカーと整合させるためガード。
  if (typeof form.active_flg !== 'boolean') {
    errs.active_flg = REQUIRED_MSG;
  }

  // campaign_flg — 必須（有効 or 無効）。active_flg と同様。
  if (typeof form.campaign_flg !== 'boolean') {
    errs.campaign_flg = REQUIRED_MSG;
  }

  // 数値範囲・非負チェック（値がある場合のみ）。
  if (
    typeof form.tax_rate === 'number' &&
    (form.tax_rate < 0 || form.tax_rate > 100)
  ) {
    errs.tax_rate = TAX_RATE_RANGE_MSG;
  }
  Object.assign(errs, checkKingakuPair(form));

  // 日付順: 適用終了日 >= 適用開始日（ISO 8601 YYYY-MM-DD は文字列比較で正しい）。
  const tekiyoErr = checkTekiyoOrder(form, errs);
  if (tekiyoErr) errs.tekiyo_end_date = tekiyoErr;

  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit パイプライン ─────────────────────────────────────────── */

/** focusFirstError 用のフィールド DOM 順。テンプレートと同期を保つこと。 */
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

/**
 * プログラム的 submit — antd 内部フォーム状態に触れず spec から駆動できるよう公開。
 * 実UXの submit ハンドラも `<form @submit>` から同じ経路を通る。
 */
async function submitWith(form: TankaFormState): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(FIELD_ORDER, errs);
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
      // UPDATE — tanka_code は immutable（api.md §API-003-003 脚注）。
      // BE の forbidNonWhitelisted に弾かれないよう payload から除外。
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
    // API が例外なく解決したときのみ遷移 — `submit()` はエラーを飲み込み
    // axios interceptor がトーストする。
    await router.push({ name: 'TankaList' });
  });

  // ラウンドトリップ後、サーバ側 VALIDATION_ERROR が fieldErrors に入るので
  // その先頭にもフォーカスする。
  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(FIELD_ORDER, fieldErrors.value);
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
    <!-- ページタイトル・パンくずは route meta を元に AppHeader（MainLayout）が
         描画する — ここで重複させない。 -->

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
        <!-- 単価種別 — ラジオ。既定 '1'（新聞購読料、機能定義 1.2）。
             ラベルは useCodesStore の m_code TANKA_TYPE から（顧客が実行時編集可、
             ハードコードのラベルマップ禁止、vue.md §Code Master）。 -->
        <a-form-item
          name="tanka_type"
          :validate-status="allFieldErrors.tanka_type ? 'error' : ''"
          :help="allFieldErrors.tanka_type"
        >
          <fieldset class="border-0 p-0 m-0 min-w-0">
            <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
              <span>単価種別</span>
              <span class="text-error ml-1">*</span>
            </legend>
            <div class="flex items-center min-h-8">
              <a-radio-group
                name="tanka_type"
                v-model:value="formState.tanka_type"
              >
                <a-radio
                  v-for="opt in codes.options('TANKA_TYPE')"
                  :key="opt.value"
                  :value="String(opt.value)"
                >
                  {{ opt.label }}
                </a-radio>
              </a-radio-group>
            </div>
          </fieldset>
        </a-form-item>

        <!-- 行2: 単価コード + 単価名（コード 1/3、名前 2/3）。 -->
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
            <!-- 単価コードは更新時 immutable — :disabled で無効化（機能定義 2.3 +
                 api.md §API-003-003 脚注）。BE も UpdateTankaDto の
                 forbidNonWhitelisted で拒否（多層防御）。 -->
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

        <!-- 行3: 税率 / 単価（税込）/ 単価（税抜）（3等分）。数値入力で、
             `addon-after` / `addon-before` がモックの ¥/% 装飾を再現。 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            name="tax_rate"
            :validate-status="allFieldErrors.tax_rate ? 'error' : ''"
            :help="allFieldErrors.tax_rate"
            label="税率 (%)"
          >
            <!--
              :min / :max は意図的に省略 — <a-input-number> は blur時に値を
              [min, max] に自動クランプし、入力を 0/100 に無言で書き換えて
              validateClient のエラーを隠す。任意の数値を受理させ、範囲外は
              TAX_RATE_RANGE_MSG で顕在化させる。
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

        <!-- 行4: 適用開始日 + 適用終了日。<a-date-picker> は
             `format="YYYY/MM/DD"`（和式表示）と `value-format="YYYY-MM-DD"`
             （BE DTO regex が期待する wire 形式）。native date は非JPロケールで
             dd/mm/yyyy 表示になるため、OSロケールに依存しない antd picker を使う。 -->
        <!-- 6列グリッド: 適用開始日 / 適用終了日 が各2（計2/3）、
             有効単価フラグ / キャンペーンフラグ が各1で2列合わせて 1/3。 -->
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

          <!-- 有効単価フラグ — ラジオ（有効=true / 無効=false）。必須。
               一覧のフィルタとの UI 整合のため登録・編集の両モードで表示
               （vue.md §Reusable Building Blocks）。formState で既定 true。
               6列中1列を占め、2つのフラグで行の 1/3。 -->
          <a-form-item
            name="active_flg"
            :validate-status="allFieldErrors.active_flg ? 'error' : ''"
            :help="allFieldErrors.active_flg"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>有効単価フラグ</span>
                <span class="text-error ml-1">*</span>
              </legend>
              <div class="flex items-center min-h-8">
                <a-radio-group
                  name="active_flg"
                  v-model:value="formState.active_flg"
                >
                  <a-radio :value="true">有効</a-radio>
                  <a-radio :value="false">無効</a-radio>
                </a-radio-group>
              </div>
            </fieldset>
          </a-form-item>

          <!-- キャンペーンフラグ — ラジオ（有効=true / 無効=false）。必須。
               有効単価フラグと同様、formState で既定 false。 -->
          <a-form-item
            name="campaign_flg"
            :validate-status="allFieldErrors.campaign_flg ? 'error' : ''"
            :help="allFieldErrors.campaign_flg"
          >
            <fieldset class="border-0 p-0 m-0 min-w-0">
              <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                <span>キャンペーンフラグ</span>
                <span class="text-error ml-1">*</span>
              </legend>
              <div class="flex items-center min-h-8">
                <a-radio-group
                  name="campaign_flg"
                  v-model:value="formState.campaign_flg"
                >
                  <a-radio :value="true">有効</a-radio>
                  <a-radio :value="false">無効</a-radio>
                </a-radio-group>
              </div>
            </fieldset>
          </a-form-item>
        </div>

        <!-- 行5: 備考（任意、textarea — フッター直前の最終入力）。 -->
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
