<script setup lang="ts">
/**
 * JAマスタ登録画面 (ACSMS-SCR-005).
 *
 * 登録・編集を兼ねる単一ビュー:
 *   /ja          (POST)  -- 登録モード
 *   /ja/:id/edit (PUT)   -- 編集モード（GET /api/v1/ja/:id で事前ロード）
 *
 * バリデーション・メッセージ: screen-design.md（メッセージ情報）
 * DOM構造・ボタン文言: index.html / API契約: ACSMS-SCR-005-api.md。
 *
 * フィールドレベルのロール制限（CHUOKAI / JA_HONTEN は api.md §4.4 の一部のみ
 * 編集可）はサーバ側で強制。FE は全項目を送り BE がスコープ外キーを無視する。
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
import { useCodesStore } from '@/stores/codes.store';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { focusFirstError } from '@/utils/form-focus';
import {
  HALF_WIDTH_KATAKANA_RE,
  JASTEM_NAME_RE,
  kanaFormatMessage,
  jastemNameFormatMessage,
} from '@/utils/kana';
import { RoleCode } from '@/constants/enums';
import {
  createJa,
  getJa,
  updateJa,
  type CreateJaRequest,
  type UpdateJaRequest,
} from '@/api/ja/ja';
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();
const { fieldErrors, submitting, submit } = useApiForm();

/**
 * フィールドレベル制限（編集モードのみ、security.md §Field-Level Restriction +
 * account_concept.md §JAマスタ）。CHUOKAI / JA_HONTEN は m_ja の連絡先サブセットのみ
 * 編集可、他は read-only。NICHINO_ADMIN は全編集可。登録モードは `ja.create` で
 * admin 専用のためここは発火しない。
 */
const RESTRICTED_EDITOR_ROLES: ReadonlySet<string> = new Set([
  RoleCode.CHUOKAI,
  RoleCode.JA_HONTEN,
]);
const isRestrictedEditor = computed(
  () =>
    isEdit.value &&
    RESTRICTED_EDITOR_ROLES.has(authStore.user?.role_code ?? ''),
);

/** パスの数値 id。登録モードでは undefined。 */
const jaIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => jaIdParam.value !== undefined);

const formState = reactive<CreateJaRequest>({
  ja_code: '',
  ja_name: '',
  ja_name_kana: '',
  todofuken_code: '',
  chuokai_flg: false,
  yubin_no: '',
  address: '',
  tel: '',
  fax: '',
  email: '',
  tanto_busho: '',
  tanto_name: '',
  zei_kubun: '1',
  jastem_itakusha_code: '',
  jastem_itakusha_name: '',
  jastem_ja_code: '',
  jastem_ja_name: '',
  biko: '',
});

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

/* ─── ライフサイクル ───────────────────────────────────────────────── */

onMounted(async () => {
  // 都道府県の候補は <BaseTodofukenSelect> が自分で読む（共有キャッシュ）。

  // 編集モードの事前ロード。
  if (jaIdParam.value !== undefined) {
    try {
      const resp = await getJa(jaIdParam.value);
      Object.assign(formState, {
        ja_code: resp.data.ja_code,
        ja_name: resp.data.ja_name,
        ja_name_kana: resp.data.ja_name_kana,
        todofuken_code: resp.data.todofuken_code,
        chuokai_flg: resp.data.chuokai_flg,
        yubin_no: resp.data.yubin_no,
        address: resp.data.address,
        tel: resp.data.tel,
        fax: resp.data.fax,
        email: resp.data.email,
        tanto_busho: resp.data.tanto_busho,
        tanto_name: resp.data.tanto_name,
        // BE は zei_kubun を number（1=内税, 2=外税、m_code ZEI_KUBUN）で返すが、
        // フォームは string radio ('1'/'2')。ここで変換しないと radio の
        // strict-equal（`'1' !== 1`）で edit モードが未選択表示になる。
        zei_kubun: String(resp.data.zei_kubun ?? ''),
        jastem_itakusha_code: resp.data.jastem_itakusha_code,
        jastem_itakusha_name: resp.data.jastem_itakusha_name,
        jastem_ja_code: resp.data.jastem_ja_code,
        jastem_ja_name: resp.data.jastem_ja_name,
        biko: resp.data.biko,
      });
      await editGuard.capture();
    } catch {
      // 404 / 403 — axios interceptor がリダイレクトを処理。空の編集フォームを
      // 描画しないよう dashboard へ戻す。
      try {
        await router.push({ name: 'Dashboard' });
      } catch {
        /* 一部テスト用ルーターは no-match — 無視 */
      }
    }
  }
});

/* ─── 検証（screen-design.md メッセージ情報に準拠） ────────────────── */

const REQUIRED_MSG = '必須項目です。';
const POSTAL_DIGITS_ONLY_MSG = '郵便番号は半角数字のみ（ハイフンなし）入力可能です。';
const TEL_DIGITS_ONLY_MSG = '電話番号は半角数字のみ（ハイフンなし）入力可能です。';
const FAX_DIGITS_ONLY_MSG = 'FAXは半角数字のみ（ハイフンなし）入力可能です。';
const EMAIL_INVALID_MSG = '有効なメールアドレスを入力してください。';
const KANA_FORMAT_MSG = kanaFormatMessage('JA名');

// JASTEM 項目 — BE @Matches の regex を 1:1 でミラーし、サーバ往復なしで
// 即時フィードバックを得る。
const ITAKUSHA_CODE_FORMAT_MSG =
  '委託者コードは半角英数字で入力してください（スペース不可）。';
// 委託者名・農協名 — カタカナ/英数字は半角、漢字・ひらがなは可（JASTEM_NAME_RE）。
const ITAKUSHA_NAME_FORMAT_MSG = jastemNameFormatMessage('委託者名');
const JA_NUM_FORMAT_MSG = '農協番号は半角数字で入力してください。';
const JA_NAME_FORMAT_MSG = jastemNameFormatMessage('農協名');
const ITAKUSHA_CODE_RE = /^[A-Za-z0-9]+$/;
const DIGITS_RE = /^\d+$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 非空のときだけ形式チェックする項目表。
 *
 * 以前は `if (form.x && !RE.test(form.x)) errs.x = MSG;` を9本並べていて、
 * validateClient の Cognitive Complexity が 24（上限15）だった。判定の形が全部
 * 同じなので表に落とし、ループ1本にする。項目を足すときはここへ1行足すだけ。
 */
const FORMAT_RULES: ReadonlyArray<{
  field: keyof CreateJaRequest;
  re: RegExp;
  message: string;
}> = [
  { field: 'yubin_no', re: DIGITS_RE, message: POSTAL_DIGITS_ONLY_MSG },
  { field: 'tel', re: DIGITS_RE, message: TEL_DIGITS_ONLY_MSG },
  { field: 'fax', re: DIGITS_RE, message: FAX_DIGITS_ONLY_MSG },
  { field: 'email', re: EMAIL_RE, message: EMAIL_INVALID_MSG },
  { field: 'ja_name_kana', re: HALF_WIDTH_KATAKANA_RE, message: KANA_FORMAT_MSG },
  {
    field: 'jastem_itakusha_code',
    re: ITAKUSHA_CODE_RE,
    message: ITAKUSHA_CODE_FORMAT_MSG,
  },
  {
    field: 'jastem_itakusha_name',
    re: JASTEM_NAME_RE,
    message: ITAKUSHA_NAME_FORMAT_MSG,
  },
  { field: 'jastem_ja_code', re: DIGITS_RE, message: JA_NUM_FORMAT_MSG },
  { field: 'jastem_ja_name', re: JASTEM_NAME_RE, message: JA_NAME_FORMAT_MSG },
];

/**
 * 必須チェック。形式チェックより先に行い、空欄には「必須項目です。」だけを出す
 * （ユーザーが一度に見るエラーを1つにする）。
 *
 * `?.trim()` は必須 — `<a-select allow-clear>` は × クリアで v-model を
 * `undefined`（""ではない）にする。undefined への `.trim()` は throw し
 * グローバルエラーハンドラ（「エラーが発生しました…」）に届き、必須違反を隠す。
 */
function validateRequired(
  form: CreateJaRequest,
  errs: Record<string, string>,
): void {
  if (!isEdit.value && !form.ja_code?.trim()) errs.ja_code = REQUIRED_MSG;
  if (!form.ja_name?.trim()) errs.ja_name = REQUIRED_MSG;
  if (!form.todofuken_code?.trim()) errs.todofuken_code = REQUIRED_MSG;
  // zei_kubun — m_code ZEI_KUBUN に存在する値だけ受理。`'1' | '2'` 決め打ちは
  // 不可: ZEI_KUBUN は Group B（顧客が実行時に値を追加できる）で、radio は
  // codes.options('ZEI_KUBUN') から描画するため、追加値を選べるのに保存できない
  // という不整合になる。
  if (!codes.has('ZEI_KUBUN', form.zei_kubun)) errs.zei_kubun = REQUIRED_MSG;
}

/** FORMAT_RULES に沿った形式チェック。空欄は必須チェックに任せて素通しする。 */
function validateFormats(
  form: CreateJaRequest,
  errs: Record<string, string>,
): void {
  for (const { field, re, message } of FORMAT_RULES) {
    const value = form[field];
    if (typeof value === 'string' && value && !re.test(value)) {
      errs[field] = message;
    }
  }
}

function validateClient(form: CreateJaRequest): Record<string, string> {
  const errs: Record<string, string> = {};
  validateRequired(form, errs);
  validateFormats(form, errs);
  return errs;
}

const clientErrors = ref<Record<string, string>>({});

const allFieldErrors = computed<Record<string, string>>(() => ({
  ...clientErrors.value,
  ...fieldErrors.value,
}));

/* ─── Submit パイプライン ─────────────────────────────────────────── */

/**
 * フォーム項目の DOM 順。submit 失敗後の自動フォーカスで「先頭のエラー入力」を
 * 選ぶのに使う（validator がエラーを push した順に依存しない）。下のテンプレートと
 * 同期を保つこと。
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
  'chuokai_flg',
  'jastem_itakusha_code',
  'jastem_itakusha_name',
  'jastem_ja_code',
  'jastem_ja_name',
  'biko',
];

/**
 * プログラム的 submit — antd 内部フォーム状態に触れず spec から駆動できるよう公開。
 * 実UXの submit ハンドラも `<form @submit>` から同じ経路を通る。
 */
async function submitWith(form: CreateJaRequest): Promise<void> {
  const errs = validateClient(form);
  clientErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    focusFirstError(FIELD_ORDER, errs);
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
    // コールバック内なので API が例外なく解決したときのみ発火 — `submit()` は
    // エラーを飲み込み axios interceptor がトーストするので失敗時はフォームに留まる。
    await router.push({ name: 'JaList' });
  });

  // ラウンドトリップ後、サーバ側 VALIDATION_ERROR が fieldErrors に入る。
  // その先頭にもフォーカスし、BE チェック（例: ja_code 重複）もクライアント側
  // 同様に軽快に感じさせる。
  if (Object.keys(fieldErrors.value).length > 0) {
    focusFirstError(FIELD_ORDER, fieldErrors.value);
  }
}

async function onFormSubmit(): Promise<void> {
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (jaIdParam.value !== undefined && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  await submitWith({ ...formState });
}

function onBack(): void {
  router.back();
}

defineExpose({ submitWith });
</script>

<template>
  <div class="space-y-6">
    <!-- ページタイトル・パンくずは route meta を元に AppHeader（MainLayout）が
         描画する — ここで重複させない。 -->

    <BaseCard padding="none">
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
        <!-- 行1: JAコード / JA名 / JA名(カナ) -->
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
            <BaseCodeInput
              v-model:value="formState.ja_code"
              :disabled="isEdit"
              :maxlength="10"
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
              :maxlength="200"
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
              :maxlength="200"
            />
          </a-form-item>
        </div>

        <!-- 行2: 都道府県 / 郵便番号 / 住所 -->
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
            <BaseTodofukenSelect
              v-model:value="formState.todofuken_code"
              :disabled="isRestrictedEditor"
            />
          </a-form-item>
          <a-form-item
            label="郵便番号"
            name="yubin_no"
            :validate-status="allFieldErrors.yubin_no ? 'error' : ''"
            :help="allFieldErrors.yubin_no"
          >
            <BaseCodeInput
              autocomplete="off"
              v-model:value="formState.yubin_no"
              :maxlength="7"
            />
          </a-form-item>
          <a-form-item label="住所" name="address">
            <a-input
              autocomplete="off"
              v-model:value="formState.address"
              :maxlength="200"
            />
          </a-form-item>
        </div>

        <!-- 行3: 電話番号 / FAX / メールアドレス -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item
            label="電話番号"
            name="tel"
            :validate-status="allFieldErrors.tel ? 'error' : ''"
            :help="allFieldErrors.tel"
          >
            <a-input
              autocomplete="off"
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
              autocomplete="off"
              v-model:value="formState.fax"
              :maxlength="15"
              placeholder="0312345679"
            />
          </a-form-item>
          <a-form-item
            label="メールアドレス"
            name="email"
            :validate-status="allFieldErrors.email ? 'error' : ''"
            :help="allFieldErrors.email"
          >
            <!-- type="text"（"email" ではない）でブラウザ native HTML5 検証
                 ツールチップ（"Please include an '@'…"）を出さない。プロジェクトは
                 独自のクライアント検証（`validateClient()` の EMAIL_INVALID_MSG regex）を
                 使い `<a-form-item :help>` に日本語でエラーを出す。 -->
            <a-input
              autocomplete="off"
              v-model:value="formState.email"
              :maxlength="100"
              placeholder="example@gmail.com"
            />
          </a-form-item>
        </div>

        <!-- 行4: 担当部署（1/3）/ 担当者（1/3）/ 税区分 + 中央会フラグ が
             最後の 1/3 を分け合う（各 radio group が半列に収まる）。 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a-form-item label="担当部署名" name="tanto_busho">
            <a-input v-model:value="formState.tanto_busho" :maxlength="100" />
          </a-form-item>
          <a-form-item label="担当者名" name="tanto_name">
            <a-input v-model:value="formState.tanto_name" :maxlength="50" />
          </a-form-item>
          <div class="flex gap-4">
            <a-form-item
              class="flex-1 mb-0"
              name="zei_kubun"
              :validate-status="allFieldErrors.zei_kubun ? 'error' : ''"
              :help="allFieldErrors.zei_kubun"
            >
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>税区分</span>
                  <span class="text-error ml-1">*</span>
                </legend>
                <div class="flex items-center min-h-8">
                  <a-radio-group
                    name="zei_kubun"
                    v-model:value="formState.zei_kubun"
                  >
                    <a-radio
                      v-for="opt in codes.options('ZEI_KUBUN')"
                      :key="opt.value"
                      :value="String(opt.value)"
                    >
                      {{ opt.label }}
                    </a-radio>
                  </a-radio-group>
                </div>
              </fieldset>
            </a-form-item>
            <a-form-item
              class="flex-1 mb-0"
              name="chuokai_flg"
            >
              <fieldset class="border-0 p-0 m-0 min-w-0">
                <legend class="!flex !items-center box-content !m-0 !mb-2 !p-0 !border-0 !h-[22px] !text-sm !leading-[22px] !text-text-main">
                  <span>中央会フラグ</span>
                  <span class="text-error ml-1">*</span>
                </legend>
                <div class="flex items-center min-h-8">
                  <a-radio-group
                    name="chuokai_flg"
                    v-model:value="formState.chuokai_flg"
                    :disabled="isRestrictedEditor"
                  >
                    <a-radio :value="true">中央会</a-radio>
                    <a-radio :value="false">JA</a-radio>
                  </a-radio-group>
                </div>
              </fieldset>
            </a-form-item>
          </div>
        </div>

        <!-- 行5: JASTEM 決済メタデータ（任意、※空文字許容）。 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a-form-item
            label="委託者コード"
            name="jastem_itakusha_code"
            :validate-status="allFieldErrors.jastem_itakusha_code ? 'error' : ''"
            :help="allFieldErrors.jastem_itakusha_code"
          >
            <a-input
              v-model:value="formState.jastem_itakusha_code"
              :maxlength="10"
            />
          </a-form-item>
          <a-form-item
            label="委託者名"
            name="jastem_itakusha_name"
            :validate-status="allFieldErrors.jastem_itakusha_name ? 'error' : ''"
            :help="allFieldErrors.jastem_itakusha_name"
          >
            <a-input
              v-model:value="formState.jastem_itakusha_name"
              :maxlength="40"
            />
          </a-form-item>
          <a-form-item
            label="農協番号"
            name="jastem_ja_code"
            :validate-status="allFieldErrors.jastem_ja_code ? 'error' : ''"
            :help="allFieldErrors.jastem_ja_code"
          >
            <a-input
              v-model:value="formState.jastem_ja_code"
              :maxlength="4"
            />
          </a-form-item>
          <a-form-item
            label="農協名"
            name="jastem_ja_name"
            :validate-status="allFieldErrors.jastem_ja_name ? 'error' : ''"
            :help="allFieldErrors.jastem_ja_name"
          >
            <a-input
              v-model:value="formState.jastem_ja_name"
              :maxlength="15"
            />
          </a-form-item>
        </div>

        <!-- 行7: 備考 -->
        <a-form-item label="備考" name="biko">
          <a-textarea v-model:value="formState.biko" :rows="3" :maxlength="500" />
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
