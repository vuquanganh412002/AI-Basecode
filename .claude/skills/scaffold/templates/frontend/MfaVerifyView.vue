<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import MfaInput from '@/components/common/MfaInput.vue';
import { useApiForm } from '@/composables/useApiForm';
// import { getAuth } from '@/api/auth/auth';

const route = useRoute();
const router = useRouter();
const { submitting, submit } = useApiForm();

const otp = ref('');
const resending = ref(false);

const mfaToken = computed(() => String(route.query.mfa_token ?? ''));

/** Short display ID for footer (e.g. "2FA-9932-881"). Derived from token tail. */
const displayId = computed(() => {
  const t = mfaToken.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!t) return '—';
  const tail = t.slice(-9).padStart(9, '0');
  return `2FA-${tail.slice(0, 4)}-${tail.slice(4, 7)}`;
});

async function verify(value?: string): Promise<void> {
  const code = value ?? otp.value;
  if (code.length !== 6 || !mfaToken.value) return;
  await submit(async () => {
    // await getAuth().authControllerMfaVerify({ mfa_token: mfaToken.value, otp_code: code });
    message.success('ログインしました。');
    router.push({ name: 'Dashboard' });
  });
}

async function resend(): Promise<void> {
  if (resending.value || !mfaToken.value) return;
  resending.value = true;
  try {
    // await getAuth().authControllerMfaResend({ mfa_token: mfaToken.value });
    message.success('認証コードを再送しました');
  } finally {
    resending.value = false;
  }
}

function backToLogin(): void {
  router.push({ name: 'Login' });
}
</script>

<template>
  <AuthLayout>
    <!-- Background decoration (gradient blobs) — matches SCR-001 MFA design -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-50 dark:opacity-20">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
    </div>

    <div class="w-full max-w-[440px] flex flex-col items-center">
      <BaseCard variant="auth" no-padding class="w-full">
        <header class="px-8 pt-10 pb-6 text-center">
          <div
            class="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-6"
          >
            <span class="material-symbols-outlined text-4xl">enhanced_encryption</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            2段階認証
          </h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            セキュリティ保護のため、登録済みのデバイスに送信された6桁の認証コードを入力してください。
          </p>
        </header>

        <div class="px-8 pb-10">
          <MfaInput
            v-model="otp"
            class="mb-8"
            :disabled="submitting"
            @complete="verify"
          />

          <a-button
            type="primary"
            :loading="submitting"
            :disabled="otp.length !== 6"
            block
            size="large"
            class="mb-6 font-bold"
            @click="verify()"
          >
            認証
            <span class="material-symbols-outlined text-sm ml-1">arrow_forward</span>
          </a-button>

          <div class="text-center">
            <a-button
              type="link"
              :loading="resending"
              class="font-medium inline-flex items-center gap-1"
              @click="resend"
            >
              <span class="material-symbols-outlined text-base">refresh</span>
              コードを再送する
            </a-button>
          </div>
        </div>

        <footer
          class="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center"
        >
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="material-symbols-outlined text-xs">verified_user</span>
            <span>セキュア接続</span>
          </div>
          <div class="text-xs text-slate-400 font-mono">ID: {{ displayId }}</div>
        </footer>
      </BaseCard>

      <a-button
        type="link"
        class="mt-8 !text-text-secondary hover:!text-text-main inline-flex items-center gap-2"
        @click="backToLogin"
      >
        <span class="material-symbols-outlined text-base">arrow_back</span>
        ログイン画面に戻る
      </a-button>
    </div>
  </AuthLayout>
</template>
