<script setup lang="ts">
/**
 * 支店マスタ登録画面 (ACSMS-SCR-007).
 *
 * 登録・編集を兼ねる:
 *   /shiten/create     (POST) — CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
 *   /shiten/:id/edit   (PUT)  — 同3ロール、shiten_code は immutable
 *
 * バリデーション・メッセージ: screen-design.md（機能定義）
 * DOM構造・ボタン文言: index.html / API契約: ACSMS-SCR-007-api.md。
 *
 * NICHINO_ADMIN は api.md §4.2 で shiten.* 権限を持たず router guard が拒否する。
 * フォームは JA スコープの session（session.ja_id 非 null）を前提とする。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useEditGuard } from '@/composables/useEditGuard';
import { useNotify } from '@/composables/useNotify';
import { useNotFoundRedirect } from '@/composables/useNotFoundRedirect';
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
  TYOKIN_SHUBETSU_OPTIONS,
  TYOKIN_SHUBETSU_RE,
} from '@/constants/tyokin-shubetsu';
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
const { redirectToDashboard } = useNotFoundRedirect();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit, clearErrors } = useApiForm();

/** パスの数値 id。登録モードでは undefined。 */
const shitenIdParam = computed<number | undefined>(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === '') return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : undefined;
});

const isEdit = computed(() => shitenIdParam.value !== undefined);

// [role5-locked-fields] 顧客方針 2026-05 — JA_KANRI_SHITEN は編集モードで支店を
// 編集できるが 管理支店（kanri_shiten_id）は read-only のまま。これは支店の
// 「親」割当で、別の管理支店への再割当は上位ロール（CHUOKAI / JA_HONTEN /
// NICHINO_*）のみ。role 5 は文脈として値を見るが変更不可。他項目（金融機関支店
// フラグ / 支店名 / カナ / JASTEM / 備考 / 更新 submit）は role 5 も編集可。
//
// 将来の追加を1行で済ませるため inline の `role_code === ...` でなく Set + computed。
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

// フォーム状態 — kanri_shiten_id はユーザーが選ぶまで undefined にして antd の
// <a-select> が "0" ではなく placeholder（"選択してください"）を表示するようにする。
// 未設定は validateClient が捕捉。
type FormState = Omit<CreateShitenRequest, 'kanri_shiten_id'> & {
  kanri_shiten_id: number | undefined;
};

/** フォーム初期値。登録モード復帰時（[route-reuse] リセット）にも使う。 */
function defaultFormState(): FormState {
  return {
    shiten_code: '',
    shiten_name: '',
    shiten_name_kana: '',
    kanri_shiten_id: undefined,
    kinyu_shiten_flg: false,
    // JASTEM 店舗単位 4列 — '' で初期化し、編集プリロードと POST body が常に
    // 文字列を持つようにする（BE 列は NOT NULL）。
    jastem_toriatsukai_tenpo_code: '',
    jastem_tenpo_name: '',
    jastem_tyokin_shubetsu: '',
    jastem_koza_no: '',
    biko: '',
  };
}

const formState = reactive<FormState>(defaultFormState());

// 編集で何も変更せず更新した場合に PUT/ログをスキップするガード。
const editGuard = useEditGuard(() => formState);

/* ─── ライフサイクル ───────────────────────────────────────────────── */

function resetFormState(): void {
  Object.assign(formState, defaultFormState());
  loadedKanriShitenId.value = null;
  clientErrors.value = {};
  clearErrors();
}

async function loadDetail(id: number): Promise<void> {
  try {
    const resp = await getShiten(id);
    // role-5 view-only チェック用に、ロードした支店の親 kanri_shiten を控える
    // （[role5-view-only]）。
    loadedKanriShitenId.value = resp.data.kanri_shiten_id ?? null;
    Object.assign(formState, {
      shiten_code: resp.data.shiten_code,
      shiten_name: resp.data.shiten_name,
      shiten_name_kana: resp.data.shiten_name_kana ?? '',
      kanri_shiten_id: resp.data.kanri_shiten_id,
      kinyu_shiten_flg: !!resp.data.kinyu_shiten_flg,
      // JASTEM 店舗単位 4列 — `?? ''` は migration 以前のレガシー行
      // （旧 BE デプロイの応答に列がない場合）を守る。
      jastem_toriatsukai_tenpo_code: resp.data.jastem_toriatsukai_tenpo_code ?? '',
      jastem_tenpo_name: resp.data.jastem_tenpo_name ?? '',
      jastem_tyokin_shubetsu: resp.data.jastem_tyokin_shubetsu ?? '',
      jastem_koza_no: resp.data.jastem_koza_no ?? '',
      biko: resp.data.biko ?? '',
    });
    await editGuard.capture();
  } catch {
    // 404 / 403 — axios interceptor が既にトースト済み。この view は
    // 遷移させる（顧客要件 2026-08 — useNotFoundRedirect 共通化）。
    await redirectToDashboard();
  }
}

/**
 * [route-reuse] 登録（`/shiten/create`）と編集（`/shiten/:id/edit`）は同じ
 * ShitenFormView インスタンスに解決されるため、vue-router はコンポーネントを
 * 再利用する — 編集→登録や編集id→別編集id へ遷移しても `onMounted` は再実行
 * されない。ここで再適用しないと、フォームが前レコードのデータを表示し続ける
 * （HanbaitenFormView と同じ既知パターン）。id 変化時に再初期化する。
 */
async function applyRouteMode(): Promise<void> {
  resetFormState();
  if (shitenIdParam.value !== undefined) {
    await loadDetail(shitenIdParam.value);
  }
}

onMounted(() => {
  // 管理支店 dropdown（ACSMS-API-COMMON-004）— 呼び出し元の JA にスコープ
  // （cascade 元）。NICHINO_ADMIN は ja_id を持たずどのみち到達不可（router guard が
  // admin の持たない shiten.create / shiten.update で拒否）。JA レベル3ロールは
  // 常に非 null の session.ja_id を持つ。ログイン中の JA は route 遷移で変わらない
  // ため、ここは一度だけ取得すれば十分（applyRouteMode 側で再取得しない）。
  const jaId = authStore.user?.ja_id;
  if (jaId !== null && jaId !== undefined) {
    void getKanriShitenDropdown(jaId)
      .then((resp) => {
        kanriShitenOptions.value = resp.data;
      })
      .catch(() => {
        // axios interceptor が 403/500 を既にトースト済み。
        kanriShitenOptions.value = [];
      });
  }

  void applyRouteMode();
});

watch(shitenIdParam, () => {
  void applyRouteMode();
});

/* ─── 検証（screen-design.md §3.1 に準拠） ─────────────────────────── */

const REQUIRED_MSG = '必須項目です。';
const SHITEN_CODE_FORMAT_MSG = '支店コードは半角数字3桁で入力してください。';
const KANA_FORMAT_MSG = kanaFormatMessage('支店名');

// JASTEM 店舗単位 項目 — 即時フィードバックのため BE @Matches の regex をミラー。
const TENPO_CODE_FORMAT_MSG =
  'データ送信取扱店舗コードは半角数字で入力してください（スペース不可）。';
// 店舗名 — カタカナ/英数字は半角、漢字・ひらがなは可（JASTEM_NAME_RE）。
const TENPO_NAME_FORMAT_MSG = jastemNameFormatMessage('店舗名');
const TYOKIN_SHUBETSU_FORMAT_MSG =
  '貯金種別は 1（普通貯金）/ 2（当座貯金）/ 9（その他）のいずれかを指定してください。';
const KOZA_NO_FORMAT_MSG = '口座番号は半角数字で入力してください。';
const DIGITS_RE = /^\d+$/;

/**
 * JASTEM 1項目: まず必須（金融機関支店フラグ=true のとき）、次に非空のときのみ
 * 形式チェック — ユーザーは一度に1メッセージを見る。
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

  // 必須チェック。`?.trim()` は必須 — antd `<a-select allow-clear>` は
  // × クリックで v-model を undefined にする（vue.md）。
  if (!isEdit.value && !form.shiten_code?.trim()) {
    errs.shiten_code = REQUIRED_MSG;
  }
  if (!form.shiten_name?.trim()) {
    errs.shiten_name = REQUIRED_MSG;
  }
  if (!form.kanri_shiten_id || form.kanri_shiten_id === 0) {
    errs.kanri_shiten_id = REQUIRED_MSG;
  }

  // 形式チェック — 即時フィードバックのため BE @Matches(/^\d{3}$/) をミラー。
  if (
    !errs.shiten_code &&
    form.shiten_code &&
    !/^\d{3}$/.test(form.shiten_code)
  ) {
    errs.shiten_code = SHITEN_CODE_FORMAT_MSG;
  }

  // 半角カタカナ — 下流の Zengin CSV / PDF 出力は半角必須（ﾆﾎﾝｼﾞｭｳｼﾞｭｳｺﾞｾﾝﾀｰ
  // 形式仕様）。vue.md §Kana fields。
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

/* ─── Submit パイプライン ─────────────────────────────────────────── */

const FIELD_ORDER: ReadonlyArray<keyof FormState> = [
  'kanri_shiten_id',
  'kinyu_shiten_flg',
  'shiten_code',
  'shiten_name',
  'shiten_name_kana',
  // JASTEM 店舗単位 4列 — DOM 順はテンプレートの行3に一致。
  'jastem_toriatsukai_tenpo_code',
  'jastem_tenpo_name',
  'jastem_tyokin_shubetsu',
  'jastem_koza_no',
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
    // [highlight-on-return]
    // 直近操作した shiten_id を ?highlight=:id で一覧へ持ち帰り、一覧がその行を
    // 先頭に引き上げられるようにする（顧客要望 2026-05-19 — コード順一覧を
    // スクロールして変更を探すより良いフィードバック）。
    let highlightId: number | undefined;
    if (shitenIdParam.value === undefined) {
      // validateClient が登録モードで kanri_shiten_id 設定済みを保証。
      const created = await createShiten(form as CreateShitenRequest);
      notify.created();
      highlightId = created.data.shiten_id;
    } else {
      // PUT body は shiten_code を落とす（immutable、api.md §3 注記）。
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
    focusFirstError(FIELD_ORDER, fieldErrors.value);
  }
}

async function onFormSubmit(): Promise<void> {
  // 編集で何も変更していなければ更新（PUT・監査ログ）をスキップ。
  if (isEdit.value && editGuard.isPristine()) {
    message.info('変更がありません。');
    return;
  }
  // antd `<a-select allow-clear>` は × クリックで v-model を `undefined` にする。
  // JSON.stringify が undefined を落とすと BE の pickString は「キー不在」と見て
  // 既存値を維持し、クリアした dropdown が実際には列をクリアしない。ここで '' に
  // 正規化し BE がキーを明示的に受け取り `@Transform(blankToUndef)` + pickString の
  // 「キーあり・undefined」分岐が列をクリアするようにする。（vue.md）
  await submitWith({
    ...formState,
    jastem_tyokin_shubetsu: formState.jastem_tyokin_shubetsu ?? '',
  });
}

/**
 * 戻るボタン — 一覧へ直接遷移（確認モーダルなし、ACSMS-SCR-009 のポップアップ廃止決定に合わせる）。
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
        <!-- 行1: 管理支店（全幅） + 金融機関支店フラグ -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
          <a-form-item
            class="@lg:col-span-2"
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
            <a-checkbox name="kinyu_shiten_flg"
              v-model:checked="formState.kinyu_shiten_flg"
              :disabled="isViewOnly || isEdit"
            >
              金融機関支店フラグ
            </a-checkbox>
          </a-form-item>
        </div>

        <!-- 行2: 支店コード / 支店名 / 支店名カナ -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6">
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

        <!-- 行3: JASTEM 店舗単位 — 4項目（※空文字許容）。
             表示ラベルは顧客向け文言で JASTEM_ プレフィックスを外す
             （プレフィックスは DB 列 / docs コメントのみ）。
             桁数は database-design.md §m_shiten 行7-10 をミラー。 -->
        <div class="grid grid-cols-1 @3xl:grid-cols-[1.5fr_1fr_1fr_1fr] gap-6">
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

        <!-- 行4: 備考 -->
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
