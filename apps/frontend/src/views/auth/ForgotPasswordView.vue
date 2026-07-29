<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import { useApiForm } from '@/composables/useApiForm';
import { forgotPassword } from '@/api/auth/auth';

const router = useRouter();
const { fieldErrors, submitting, submit } = useApiForm();

const form = reactive({ login_id: '', email: '' });

/** Toggled to true once the BE returns success — hides the form per §3.3 */
const sent = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_ID_REQUIRED_MSG = 'ユーザーIDを入力してください。'; // ACSMS-MSG-001-001
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
  // login_id は必須チェックのみ（半角/長さは BE が検証しフィールドエラーを返す）。
  if (!form.login_id?.trim()) errs.login_id = LOGIN_ID_REQUIRED_MSG;
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
    await forgotPassword(form.login_id, form.email);
    // SCR-012 §3.3 フォーム非表示・§3.4 ACSMS-SCR-012-003 表示。
    // メール有無に関わらず同一メッセージ（列挙対策は BE 側）。
    sent.value = true;
  });
}

function goLogin(): void {
  // SCR-012 §4.2 — 戻る時に入力値をクリア。
  form.login_id = '';
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

      <BaseCard padding="none">
        <div class="p-8">
          <h2 class="text-xl font-medium text-text-main mb-4 text-center">
            パスワードの再設定
          </h2>

          <!-- 送信済み — フォームを隠して成功メッセージを表示。 -->
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

          <!-- 未送信 — フォームを表示。 -->
          <template v-else>
            <p class="text-sm text-text-description leading-relaxed text-center mb-6">
              ユーザーIDと登録済みのメールアドレスを入力してください。<br>
              パスワード再設定用のリンクをメールで送信します。
            </p>

            <a-form layout="vertical" :model="form" @finish="onSubmit">
              <a-form-item
                name="login_id"
                :validate-status="fieldErrors.login_id ? 'error' : ''"
                :help="fieldErrors.login_id"
              >
                <template #label>
                  <span>ユーザーID</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <a-input
                  v-model:value="form.login_id"
                  size="large"
                  placeholder="IDを入力してください"
                  autocomplete="username"
                  :maxlength="20"
                />
              </a-form-item>

              <a-form-item
                name="email"
                :validate-status="fieldErrors.email ? 'error' : ''"
                :help="fieldErrors.email"
              >
                <template #label>
                  <span>メールアドレス</span>
                  <span class="text-error ml-1">*</span>
                </template>
                <!-- text 入力必須。type="email" 禁止（vue.md §HTML5 native input types）
                     — ブラウザ標準ツールチップが日本語エラーを迂回するため。 -->
                <a-input
                  v-model:value="form.email"
                  size="large"
                  placeholder="example@example.com"
                  autocomplete="email"
                  :maxlength="100"
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
