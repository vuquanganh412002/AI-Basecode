<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import NoticeList from '@/components/common/NoticeList.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

const form = reactive({
  login_id: '',
  password: '',
});

// Placeholder announcements — replace with GET /api/v1/oshirase/public.
const notices = [
  { date: '2024.05.15', title: '利用規約を改訂・公開しました。' },
  { date: '2024.04.01', title: 'システムメンテナンスに伴う一時停止について。' },
];

async function onSubmit(): Promise<void> {
  await submit(async () => {
    const result = await authStore.login({
      email: form.login_id,
      password: form.password,
    });
    if (result.mfa_required) {
      router.push({ name: 'MfaVerify', query: { mfa_token: result.mfa_token } });
    } else {
      message.success('ログインしました');
      router.push({ name: 'Dashboard' });
    }
  });
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-[400px] space-y-6">
      <header class="text-center">
        <h1 class="text-2xl font-bold text-text-main dark:text-white mb-2">
          __BRAND_NAME__
        </h1>
        <p class="text-text-secondary dark:text-slate-400 text-sm">
          __SYSTEM_NAME__
        </p>
      </header>

      <BaseCard variant="auth" no-padding>
        <a-form layout="vertical" :model="form" class="p-8" @finish="onSubmit">
          <a-form-item
            label="ユーザーID"
            name="login_id"
            :validate-status="fieldErrors.login_id ? 'error' : ''"
            :help="fieldErrors.login_id"
          >
            <a-input
              v-model:value="form.login_id"
              size="large"
              placeholder="IDを入力してください"
              autocomplete="username"
            >
              <template #prefix>
                <span class="material-symbols-outlined text-text-secondary">person</span>
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            label="パスワード"
            name="password"
            :validate-status="fieldErrors.password ? 'error' : ''"
            :help="fieldErrors.password"
          >
            <a-input-password
              v-model:value="form.password"
              size="large"
              placeholder="パスワードを入力してください"
              autocomplete="current-password"
            >
              <template #prefix>
                <span class="material-symbols-outlined text-text-secondary">lock</span>
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item class="mb-4">
            <a-button
              type="primary"
              html-type="submit"
              :loading="submitting"
              size="large"
              block
            >
              ログイン
            </a-button>
          </a-form-item>

          <p class="text-xs text-center text-text-secondary dark:text-slate-500 leading-relaxed">
            ログインすることで
            <a class="text-primary hover:text-primary-hover underline" href="#">利用規約</a>
            に同意したものとみなされます。
          </p>
        </a-form>
      </BaseCard>

      <NoticeList :items="notices" />

      <BaseCard>
        <div class="flex items-start gap-3">
          <div class="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full">
            <span class="material-symbols-outlined text-primary" style="font-size: 20px">headset_mic</span>
          </div>
          <div>
            <h3 class="text-xs font-bold text-text-main dark:text-slate-200">お問い合わせ先</h3>
            <p class="text-[11px] text-text-secondary dark:text-slate-400 mb-1">
              __CONTACT_DEPARTMENT__
            </p>
            <div class="flex items-baseline gap-2">
              <span class="text-base font-bold text-text-main dark:text-white">__CONTACT_PHONE__</span>
              <span class="text-[10px] text-text-secondary dark:text-slate-500">__CONTACT_HOURS__</span>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </AuthLayout>
</template>
