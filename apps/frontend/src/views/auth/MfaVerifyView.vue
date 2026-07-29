<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import MfaInput from '@/components/common/MfaInput.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { submitting, submit } = useApiForm();

const otp = ref('');
const resending = ref(false);

/** OTP は 6 桁・有効期限 5 分・再送クールダウン 60 秒（security.md）。 */
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** 現在の mfa_token（再送で更新される）。 */
const mfaToken = ref<string>(String(route.query.mfa_token ?? ''));
const expiresIn = ref<number>(OTP_EXPIRY_SECONDS);
const resendCooldown = ref<number>(OTP_RESEND_COOLDOWN_SECONDS);

let countdownTimer: number | undefined;
let cooldownTimer: number | undefined;

onMounted(() => {
  if (!mfaToken.value) {
    router.replace({ name: 'Login' });
    return;
  }
  startCountdown();
  startCooldown(60);
});

onUnmounted(() => {
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  if (cooldownTimer !== undefined) window.clearInterval(cooldownTimer);
});

const expired = computed(() => expiresIn.value <= 0);

function startCountdown(seconds = OTP_EXPIRY_SECONDS): void {
  expiresIn.value = seconds;
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    if (expiresIn.value > 0) expiresIn.value -= 1;
    else if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  }, 1000);
}

function startCooldown(seconds: number): void {
  resendCooldown.value = seconds;
  if (cooldownTimer !== undefined) window.clearInterval(cooldownTimer);
  cooldownTimer = window.setInterval(() => {
    if (resendCooldown.value > 0) resendCooldown.value -= 1;
    else if (cooldownTimer !== undefined) window.clearInterval(cooldownTimer);
  }, 1000);
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function verify(value?: string): Promise<void> {
  const code = value ?? otp.value;
  if (code.length !== OTP_LENGTH || !mfaToken.value || expired.value) return;
  await submit(async () => {
    await authStore.verifyMfa(mfaToken.value, code);
    message.success('ログインしました。');
    router.push({ name: 'Dashboard' });
  });
}

async function resend(): Promise<void> {
  if (resending.value || !mfaToken.value || resendCooldown.value > 0) return;
  resending.value = true;
  try {
    const result = await authStore.resendMfa(mfaToken.value);
    mfaToken.value = result.mfa_token;
    otp.value = '';
    startCountdown(result.expires_in);
    startCooldown(60);
    message.success('認証コードを再送しました。');
  } catch {
    // error-handler がトースト表示（OTP_RESEND_LIMIT もトーストで通知）。
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
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-50 dark:opacity-20">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
    </div>

    <div class="w-full max-w-[440px] flex flex-col items-center">
      <BaseCard padding="none" class="w-full">
        <header class="px-8 pt-10 pb-6 text-center">
          <div
            class="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-6"
          >
            <span class="material-symbols-outlined text-4xl">enhanced_encryption</span>
          </div>
          <h1 class="text-2xl font-bold text-text-main mb-3">
            2段階認証
          </h1>
          <p class="text-text-secondary text-sm leading-relaxed">
            セキュリティ保護のため、登録済みのメールに送信された6桁の認証コードを入力してください。
          </p>
          <p class="mt-3 text-xs text-text-secondary">
            有効期限：<span class="font-mono font-bold">{{ formatCountdown(expiresIn) }}</span>
          </p>
        </header>

        <div class="px-8 pb-10">
          <!--
            No @complete handler: per UX feedback, even when the user
            fills 6 digits the form must NOT auto-submit. They click
            the 認証 button below explicitly. The button enables
            automatically once otp.length === 6 (and not expired), so
            the affordance to submit is still obvious.
          -->
          <MfaInput
            v-model="otp"
            class="mb-8"
            :disabled="submitting || expired"
          />

          <a-button
            type="primary"
            :loading="submitting"
            :disabled="otp.length !== OTP_LENGTH || expired"
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
              :disabled="resendCooldown > 0"
              class="font-medium inline-flex items-center gap-1"
              @click="resend"
            >
              <span class="material-symbols-outlined text-base">refresh</span>
              <span v-if="resendCooldown > 0">再送まで {{ resendCooldown }} 秒</span>
              <span v-else>コードを再送する</span>
            </a-button>
          </div>
        </div>
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
