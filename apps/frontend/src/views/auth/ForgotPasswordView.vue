<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import { useApiForm } from '@/composables/useApiForm';
import { forgotPassword } from '@/api/auth/auth';

const router = useRouter();
const { fieldErrors, submitting, submit } = useApiForm();

const form = reactive({ email: '' });

/** Toggled to true once the BE returns success — hides the form per §3.3 */
const sent = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_MSG = 'メールアドレスを入力してください。'; // ACSMS-SCR-012-001
const FORMAT_MSG = '有効なメールアドレスを入力してください。'; // ACSMS-SCR-012-002
const SUCCESS_MSG =
  'パスワード再設定用のメールを送信しました。メールを確認してください。'; // ACSMS-SCR-012-003

/**
 * Mirror BE DTO (`ForgotPasswordDto`) on the FE so users get instant
 * feedback. Per `vue.md §Validation — mirror BE rules`, required check
 * fires when blank, format check fires when non-blank — guard with
 * `if (!errs.X && form.X)` so users see one message at a time.
 *
 * `form.email?.trim()` (not `.trim()`) is mandatory: even though the
 * field is bound to a plain `<a-input>` today, a future swap to
 * `<a-input allow-clear>` would set `email` to `undefined` on clear
 * and `.trim()` would TypeError.
 */
function validateClient(): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.email?.trim()) errs.email = REQUIRED_MSG;
  if (!errs.email && form.email && !EMAIL_RE.test(form.email)) {
    errs.email = FORMAT_MSG;
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
    await forgotPassword(form.email);
    // §3.3 — フォーム全体を非表示, §3.4 — show ACSMS-SCR-012-003.
    // Same message regardless of whether the email exists (BE handles
    // account-enumeration prevention; FE just renders what comes back).
    sent.value = true;
  });
}

function goLogin(): void {
  // §4.2 — clear input data on navigate-back.
  form.email = '';
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
          <h2 class="text-xl font-medium text-text-main mb-4 text-center">
            パスワードの再設定
          </h2>

          <!-- Sent — hide the form entirely, show success message. -->
          <div
            v-if="sent"
            class="text-center"
            data-testid="forgot-password-sent"
          >
            <p class="text-sm text-text-main leading-relaxed">
              {{ SUCCESS_MSG }}
            </p>
            <div class="text-center pt-6">
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

          <!-- Not yet sent — show the form. -->
          <template v-else>
            <p class="text-sm text-text-description leading-relaxed text-center mb-6">
              登録済みのメールアドレスを入力してください。<br>
              パスワード再設定用のリンクをメールで送信します。
            </p>

            <a-form layout="vertical" :model="form" @finish="onSubmit">
              <a-form-item
                name="email"
                :validate-status="fieldErrors.email ? 'error' : ''"
                :help="fieldErrors.email"
              >
                <template #label>
                  <span>メールアドレス</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <!-- Plain text input — NEVER type="email" per
                     `vue.md §NEVER use HTML5 native input types for validation`.
                     HTML5 `type="email"` triggers a browser-locale tooltip
                     that bypasses our Japanese error messages. -->
                <a-input
                  v-model:value="form.email"
                  size="large"
                  placeholder="example@example.com"
                  autocomplete="email"
                  maxlength="100"
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
                  パスワード再設定メールを送信
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
          </template>
        </div>
      </BaseCard>
    </div>
  </AuthLayout>
</template>
