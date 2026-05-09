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

/** UI states driven by token verification + submit results. */
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
  // §1.2 — no token in URL → invalid link, do NOT call verify endpoint.
  if (typeof queryToken !== 'string' || !queryToken) {
    phase.value = 'invalid';
    return;
  }
  token.value = queryToken;

  try {
    await verifyResetToken(queryToken);
    phase.value = 'valid'; // §1.5 — token valid, render form
  } catch (err) {
    // §1.6 / §1.7 — fall back to 'invalid' for any non-token error
    // because at mount-time the only useful action is to surface a
    // dead-link message. Submit-time uses matchTokenError() which
    // is stricter so VALIDATION_ERROR can flow to field-level :help.
    phase.value = matchTokenError(err) ?? 'invalid';
  }
});

onUnmounted(() => {
  if (redirectTimer !== undefined) window.clearTimeout(redirectTimer);
});

/**
 * Mirror the BE password regex (`new_password` rule in
 * `ResetPasswordDto`) so the user sees ACSMS-SCR-012-006 immediately
 * instead of waiting for a 400 round-trip.
 *
 * Rule: 8-32 chars AND ≥2 of {alpha, digit, symbol}.
 */
const PASSWORD_FORMAT_RE = new RegExp(
  '^(?=.{8,32}$)(?:' +
    [
      '(?=.*[A-Za-z])(?=.*\\d).*',
      '(?=.*[A-Za-z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]).*',
      '(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]).*',
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
  // Half-width check fires BEFORE the format check so the user gets the
  // specific "半角文字のみ" message instead of the longer combined
  // "8~32文字で半角英数記号..." when they typed full-width characters.
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
      // §4.4 — token may have expired between page-load verification
      // and submit. Hide the form ONLY when the BE explicitly returns
      // INVALID_RESET_TOKEN / EXPIRED_RESET_TOKEN. Other errors
      // (VALIDATION_ERROR mapped by useApiForm, INTERNAL_SERVER_ERROR
      // toasted by axios interceptor) must bubble so the form stays
      // visible and per-field errors render via :help.
      const phaseAfter = matchTokenError(err);
      if (phaseAfter) {
        phase.value = phaseAfter;
        return;
      }
      throw err;
    }

    // §4.5 — success message + §4.6 auto-redirect to /login after 3s.
    message.success(SUCCESS_MSG);
    phase.value = 'done';
    redirectTimer = window.setTimeout(() => {
      router.push({ name: 'Login' });
    }, REDIRECT_DELAY_MS);
  });
}

/**
 * Return the matching token-error phase, or `null` if the error is
 * NOT one of the two token-specific codes. The submit handler uses
 * the null result to bubble VALIDATION_ERROR / INTERNAL_SERVER_ERROR
 * through to useApiForm + the global axios interceptor; only token
 * errors hide the form.
 */
function matchTokenError(err: unknown): 'expired' | 'invalid' | null {
  const ax = err as AxiosError<{ error_code?: string }>;
  const code = ax?.response?.data?.error_code;
  if (code === 'EXPIRED_RESET_TOKEN') return 'expired';
  if (code === 'INVALID_RESET_TOKEN') return 'invalid';
  return null;
}

function goLogin(): void {
  // §5.2 — clear input data on navigate-back.
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

      <BaseCard variant="auth" no-padding>
        <div class="p-8">
          <h2 class="text-xl font-medium text-text-main mb-6 text-center">
            パスワードの変更
          </h2>

          <!-- §1.4 — token verification in flight. -->
          <div v-if="phase === 'verifying'" class="text-center py-8">
            <a-spin size="large" />
            <p class="text-sm text-text-description mt-4">トークンを検証中...</p>
          </div>

          <!-- §1.7 / §4.7 — invalid or expired token. Form stays hidden. -->
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

          <!-- §4.5 / §4.6 — success state, auto-redirect in 3s. -->
          <div v-else-if="phase === 'done'" class="text-center">
            <p class="text-sm text-text-main mb-6">
              {{ SUCCESS_MSG }}
            </p>
            <p class="text-xs text-text-description">3秒後にログイン画面へ移動します...</p>
          </div>

          <!-- §1.5 — token valid, render the form. -->
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
                maxlength="32"
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
                maxlength="32"
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
