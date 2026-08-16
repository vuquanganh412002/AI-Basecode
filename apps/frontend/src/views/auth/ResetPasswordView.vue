<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import type { AxiosError } from 'axios';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import { useApiForm } from '@/composables/useApiForm';
import { resetPassword, verifyResetToken } from '@/api/auth/auth';

const route = useRoute();
const router = useRouter();
const { fieldErrors, submitting, submit } = useApiForm();

const form = reactive({
  new_password: '',
  confirm_password: '',
});

/** トークン検証・送信結果で切り替わる UI 状態。 */
type Phase = 'verifying' | 'valid' | 'invalid' | 'expired' | 'done';
const phase = ref<Phase>('verifying');

const token = ref<string>('');

const REQUIRED_NEW = '新しいパスワードを入力してください。';   // ACSMS-SCR-012-005
const REQUIRED_CONFIRM = '確認用パスワードを入力してください。'; // ACSMS-SCR-012-009
const HALFWIDTH_MSG = 'パスワードは半角文字のみで入力してください。'; // ACSMS-SCR-001-013（同じ文言）
const FORMAT_MSG =
  'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。'; // ACSMS-SCR-012-006
const MISMATCH_MSG = '新しいパスワードと一致していません。';      // ACSMS-SCR-012-010
const SUCCESS_MSG = 'パスワードを更新しました。ログイン画面に移動します。'; // ACSMS-SCR-012-011
const INVALID_LINK = '無効なリンクです。';                       // ACSMS-SCR-012-008
const EXPIRED_LINK =
  'リンクの有効期限が切れています。再度パスワード再設定をお試しください。'; // ACSMS-SCR-012-007

const REDIRECT_DELAY_MS = 3_000;
let redirectTimer: number | undefined;

onMounted(async () => {
  const queryToken = route.query.token;
  // ACSMS-SCR-012 §1.2 — URL にトークン無し → 無効リンク（verify を呼ばない）。
  if (typeof queryToken !== 'string' || !queryToken) {
    phase.value = 'invalid';
    return;
  }
  token.value = queryToken;

  try {
    await verifyResetToken(queryToken);
    phase.value = 'valid'; // ACSMS-SCR-012 §1.5 — トークン有効、フォーム表示
  } catch (err) {
    // ACSMS-SCR-012 §1.6 / §1.7 — トークン以外のエラーは 'invalid' に倒す
    // （mount 時はデッドリンク表示のみが有効なため）。送信時は matchTokenError()
    // でより厳密に判定し VALIDATION_ERROR を :help に流す。
    phase.value = matchTokenError(err) ?? 'invalid';
  }
});

onUnmounted(() => {
  if (redirectTimer !== undefined) globalThis.clearTimeout(redirectTimer);
});

/**
 * BE のパスワード正規表現（ResetPasswordDto の new_password）と同一。
 * 400 往復を待たず ACSMS-SCR-012-006 を即表示する。
 * ルール: 8~32文字 かつ {英字,数字,記号} のうち2種以上。
 */
const PASSWORD_FORMAT_RE = new RegExp(
  '^(?=.{8,32}$)(?:' +
    [
      String.raw`(?=.*[A-Za-z])(?=.*\d).*`,
      String.raw`(?=.*[A-Za-z])(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).*`,
      String.raw`(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).*`,
    ].join('|') +
    ')$',
);

/**
 * Half-width-only check, identical to login (BE `LoginDto.password`
 * `@Matches(/^[\x21-\x7E]+$/)`). Matches printable ASCII excluding
 * space — full-width chars (Japanese / wide ASCII) fail.
 */
const HALFWIDTH_RE = /^[\x21-\x7E]+$/;

function validateClient(): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.new_password?.trim()) errs.new_password = REQUIRED_NEW;
  // 半角チェックを書式チェックより先に実行し、全角入力時は具体的な
  // 「半角文字のみ」を表示（長い複合メッセージを避ける）。
  if (!errs.new_password && form.new_password && !HALFWIDTH_RE.test(form.new_password)) {
    errs.new_password = HALFWIDTH_MSG;
  }
  if (!errs.new_password && form.new_password && !PASSWORD_FORMAT_RE.test(form.new_password)) {
    errs.new_password = FORMAT_MSG;
  }
  if (!form.confirm_password?.trim()) errs.confirm_password = REQUIRED_CONFIRM;
  if (
    !errs.confirm_password &&
    form.confirm_password &&
    form.new_password !== form.confirm_password
  ) {
    errs.confirm_password = MISMATCH_MSG;
  }
  return errs;
}

async function onSubmit(): Promise<void> {
  const clientErrors = validateClient();
  if (Object.keys(clientErrors).length > 0) {
    fieldErrors.value = clientErrors;
    return;
  }

  await submit(async () => {
    try {
      await resetPassword({
        token: token.value,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
    } catch (err) {
      // ACSMS-SCR-012 §4.4 — 検証後～送信間にトークンが失効し得る。BE が
      // INVALID_RESET_TOKEN / EXPIRED_RESET_TOKEN を返した場合のみフォームを隠す。
      // 他エラー（VALIDATION_ERROR は useApiForm、500 は axios interceptor）は
      // bubble させ、フォームを残して :help に表示する。
      const phaseAfter = matchTokenError(err);
      if (phaseAfter) {
        phase.value = phaseAfter;
        return;
      }
      throw err;
    }

    // ACSMS-SCR-012 §4.5 成功メッセージ + §4.6 3秒後に /login へ自動遷移。
    message.success(SUCCESS_MSG);
    phase.value = 'done';
    redirectTimer = globalThis.setTimeout(() => {
      router.push({ name: 'Login' });
    }, REDIRECT_DELAY_MS);
  });
}

/**
 * トークンエラーに対応する phase を返す。2種のトークン専用コード以外は
 * null を返し、送信ハンドラは VALIDATION_ERROR / 500 を useApiForm +
 * axios interceptor へ bubble させる（フォームを隠すのはトークンエラーのみ）。
 */
function matchTokenError(err: unknown): 'expired' | 'invalid' | null {
  const ax = err as AxiosError<{ error_code?: string }>;
  const code = ax?.response?.data?.error_code;
  if (code === 'EXPIRED_RESET_TOKEN') return 'expired';
  if (code === 'INVALID_RESET_TOKEN') return 'invalid';
  return null;
}

function goLogin(): void {
  // ACSMS-SCR-012 §5.2 — 戻る時に入力値をクリア。
  form.new_password = '';
  form.confirm_password = '';
  router.push({ name: 'Login' });
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-[480px] space-y-6">
      <header class="text-center">
        <h1 class="text-2xl font-bold text-text-main mb-2">
          日本農業新聞
        </h1>
        <p class="text-text-secondary text-sm">
          クラウド版購読者管理システム
        </p>
      </header>

      <BaseCard padding="none">
        <div class="p-8">
          <h2 class="text-xl font-medium text-text-main mb-6 text-center">
            パスワードの変更
          </h2>

          <!-- §1.4 — トークン検証中。 -->
          <div v-if="phase === 'verifying'" class="text-center py-8">
            <a-spin size="large" />
            <p class="text-sm text-text-description mt-4">トークンを検証中...</p>
          </div>

          <!-- §1.7 / §4.7 — 無効・期限切れトークン。フォームは非表示のまま。 -->
          <div
            v-else-if="phase === 'invalid' || phase === 'expired'"
            class="text-center"
          >
            <p class="text-sm text-error font-medium mb-6">
              {{ phase === 'expired' ? EXPIRED_LINK : INVALID_LINK }}
            </p>
            <div class="text-center">
              <a
                class="text-sm text-primary hover:underline inline-flex items-center justify-center"
                href="#"
                @click.prevent="goLogin"
              >
                <span class="material-symbols-outlined text-base mr-1">arrow_back</span>
                ログイン画面に戻る
              </a>
            </div>
          </div>

          <!-- §4.5 / §4.6 — 成功状態。3秒後に自動遷移。 -->
          <div v-else-if="phase === 'done'" class="text-center">
            <p class="text-sm text-text-main mb-6">
              {{ SUCCESS_MSG }}
            </p>
            <p class="text-xs text-text-description">3秒後にログイン画面へ移動します...</p>
          </div>

          <!-- §1.5 — トークン有効、フォーム表示。 -->
          <a-form
            v-else
            layout="vertical"
            :model="form"
            @finish="onSubmit"
          >
            <a-form-item
              name="new_password"
              :validate-status="fieldErrors.new_password ? 'error' : ''"
              :help="fieldErrors.new_password"
            >
              <template #label>
                <span>新しいパスワード</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-input-password
                v-model:value="form.new_password"
                size="large"
                placeholder="******"
                autocomplete="new-password"
                :maxlength="32"
              />
            </a-form-item>

            <a-form-item
              name="confirm_password"
              :validate-status="fieldErrors.confirm_password ? 'error' : ''"
              :help="fieldErrors.confirm_password"
            >
              <template #label>
                <span>新しいパスワード（確認用）</span>
                <span class="text-error ml-1">*</span>
              </template>
              <a-input-password
                v-model:value="form.confirm_password"
                size="large"
                placeholder="******"
                autocomplete="new-password"
                :maxlength="32"
              />
            </a-form-item>

            <a-form-item class="mb-4">
              <a-button
                type="primary"
                html-type="submit"
                :loading="submitting"
                size="large"
                block
              >
                パスワードを更新する
              </a-button>
            </a-form-item>

            <div class="text-center pt-2">
              <a
                class="text-sm text-primary hover:underline inline-flex items-center justify-center"
                href="#"
                @click.prevent="goLogin"
              >
                <span class="material-symbols-outlined text-base mr-1">arrow_back</span>
                ログイン画面に戻る
              </a>
            </div>
          </a-form>
        </div>
      </BaseCard>
    </div>
  </AuthLayout>
</template>
