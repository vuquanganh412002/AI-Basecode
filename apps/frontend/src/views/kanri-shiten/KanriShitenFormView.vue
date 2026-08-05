<script setup lang="ts">
/**
 * 管理支店マスタ登録画面 (ACSMS-SCR-009).
 *
 * 登録・編集を兼ねる単一ビュー:
 *   /kanri-shiten/create     (POST) — NICHINO_ADMIN のみ
 *   /kanri-shiten/:id/edit   (PUT)  — NICHINO_ADMIN は全編集可、
 *                                     CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN は
 *                                     yubin_no, address, tel, fax, biko のみ編集可
 *                                     （Layer 3 フィールド制限）。
 *
 * バリデーション・メッセージ: screen-design.md（メッセージ情報）
 * DOM構造・ボタン文言: index.html / API契約: ACSMS-SCR-009-api.md。
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
import BaseTodofukenSelect from '@/components/common/BaseTodofukenSelect.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

/**
 * フィールドレベル制限（api.md §4.5）。非 admin ロールは編集モードで
 * yubin_no/address/tel/fax/biko 以外を disabled にする。BE はスコープ外キーを
 * 無言で落とす（security.md Layer 3）。FE の :disabled は UX ヒントのみ。
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

/** パスの数値 id。登録モードでは undefined。 */
const kanriShitenIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => kanriShitenIdParam.value !== undefined);

// 都道府県の候補取得・保持は <BaseTodofukenSelect>（useTodofuken の共有
// キャッシュ）に任せる。

// ja_id は request DTO では number 型だが、登録フォームは未設定で始め antd の
// <a-select> が "0" ではなく placeholder（"JAを選択してください"）を表示するように
// する。`validateClient` が API 前に null/0 の ja_id を弾く。`null`（undefined
// ではない）は BaseJaDropdown の emit 形に合い、?? ブリッジなしで v-model:value を使える。
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
 * JA_KANRI_SHITEN は `ja.view` 権限を持たないため /api/v1/ja/dropdown が 403。
 * detail エンドポイントは `ja_name` を直接返すので、ja.view のないユーザーには
 * disabled テキストで表示し、他は従来通り dropdown を表示する。dropdown は
 * どのみち全ロール `:disabled="isEdit"` なので、違いは dropdown API 呼び出しを
 * 省くことだけ。
 */
const canViewJaDropdown = computed(() =>
  authStore.hasPermission('ja.view'),
);
const jaNameDisplay = ref('');

/* ─── ライフサイクル ───────────────────────────────────────────────── */

onMounted(async () => {
  // BaseJaDropdown は GET /api/v1/ja/dropdown で自己 hydrate — ここで listJa()
  // 事前取得は不要。検索 / 無限スクロール / edit-mode include_id は内部処理。

  // 都道府県 dropdown options。

  // 編集モードの事前ロード。
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
      // 404 / 403 — axios interceptor がトースト。空の編集フォームを見せないよう
      // 遷移させる。
      try {
        await router.push({ name: 'Dashboard' });
      } catch {
        /* テスト用ルーターは Dashboard 未定義の場合あり — 無視 */
      }
    }
  }
});

/* ─── 検証（screen-design.md §3.1 に準拠） ─────────────────────────── */

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
  // ─── 形式チェック（必須で空の項目はスキップ）。 ────────────────────
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

  // ─── 必須チェック。`?.trim()` は必須 — antd `<a-select allow-clear>` は
  //     × クリックで v-model を `undefined`（""ではない）にする。vue.md §Validation。
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

  // ─── 登録時の kanri_shiten_code 形式チェック。
  //     編集は BE がこの項目を落とすため検証不要。空入力は上の必須チェックで短絡。
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

/* ─── Submit パイプライン ─────────────────────────────────────────── */

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
      // validateClient が登録モードで ja_id 設定済みを既に保証。
      await createKanriShiten(form as CreateKanriShitenRequest);
      notify.created();
    } else {
      // PUT body は ja_id + kanri_shiten_code を落とす（作成後 immutable）。
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
 * 入力中のライブ自動ハイフン。正準形 `XXX-XXXX-XXX` を維持し、区切り境界で
 * 末尾ハイフンを挿入する（3文字後→`1AA-`、bare 7文字後→`1AA-BBBB-`）。
 * InputEvent.inputType で backspace を検出し、区切りを跨いで削除中は末尾
 * ハイフンを再挿入しない — さもないと入力が「ねばつき」ダッシュを越えて削除できない。
 */
/**
 * 第一防御線 — 数字・ハイフン以外の文字入力を preventDefault。auto-format が
 * 自動挿入するがハイフンは許可する（既にダッシュ済みコード `113-3300-001` の
 * ペーストをここで弾かないため）。beforeinput を回避する残りの異物（macOS
 * オートコレクト挿入等）は下の @input ハンドラが正規化する。
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
 * blur 時にもう一度 kanri_shiten_code を自動整形。@input がダッシュなしのまま
 * 残しうる paste-then-tab ケースをカバー。submit ハンドラも最終安全網として再整形する。
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
  // @blur を発火させずに paste-and-submit された場合（Enter でのペースト、
  // プログラム的 fill）に備え submit 時にも kanri_shiten_code を自動整形。
  // 上の blur ハンドラとの二重の備え。
  if (!isEdit.value && formState.kanri_shiten_code) {
    formState.kanri_shiten_code = formatKanriShitenCode(
      formState.kanri_shiten_code,
    );
  }
  await submitWith({ ...formState });
}

/**
 * 戻るボタン — 一覧へ直接遷移（確認モーダルなし、顧客フィードバック）。
 * screen-design.md §4.1 は当初確認ポップアップを指定したが顧客が廃止を選択。
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
        <!-- 行1: JA 選択（全幅） -->
        <a-form-item
          name="ja_id"
          :validate-status="allFieldErrors.ja_id ? 'error' : ''"
          :help="allFieldErrors.ja_id"
        >
          <template #label>
            <span>JA名</span>
            <span class="text-error ml-1">*</span>
          </template>
          <!-- [ja-name-fallback] — JA_KANRI_SHITEN は ja.view がなく
               /api/v1/ja/dropdown を叩けない。detail は ja_name を持つので
               そのユーザーには disabled <a-input> で表示。他ロールは
               BaseJaDropdown（edit で read-only）のまま。 -->
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

        <!-- 行2: 管理支店コード / 管理支店名 / 管理支店名(カナ) -->
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
            <!-- ここでは BaseCodeInput を使わない。BaseCodeInput は <a-input> を
                 ラップする Vue コンポーネントで @input が綺麗に伝播せず
                 onKanriShitenCodeInput が発火せずユーザー入力の英字が除去されなかった。
                 <a-input> を直接使い、@beforeinput を第一防御、既存の @input
                 auto-formatter を第二とする。顧客仕様: 数字 + ハイフンのみ。 -->
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

        <!-- 行3: 郵便番号 / 都道府県 -->
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
            <BaseTodofukenSelect
              v-model:value="formState.todofuken_code"
              :disabled="isRestrictedEditor"
            />
          </a-form-item>
        </div>

        <!-- 行4: 住所 / 電話番号 / FAX -->
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

        <!-- 行5: 紙版 / 電子版 フラグ -->
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

        <!-- 行6: 備考 -->
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
