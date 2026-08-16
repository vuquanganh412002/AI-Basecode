<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import NoticeList from '@/components/common/NoticeList.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useAuthStore } from '@/stores/auth.store';
import { fetchLoginOshirase, type LoginOshiraseItem } from '@/api/auth/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { fieldErrors, submitting, submit } = useApiForm();

const form = reactive({
  login_id: '',
  password: '',
});

const notices = ref<{ date: string; title: string }[]>([]);

onMounted(async () => {
  try {
    const items = await fetchLoginOshirase(20);
    notices.value = items.map((n: LoginOshiraseItem) => ({
      date: n.publish_start_date.replaceAll('-', '.'),
      title: n.title,
    }));
  } catch {
    // §14.4: お知らせ取得失敗はログインを妨げない。
    notices.value = [];
  }
});

// §2.1 / §3.1 / §4.1: 必須チェックは送信前に FE で行い、ACSMS-MSG-001-001 /
// -002 を直接表示（BE 400 往復に頼らない）。
function validateClient(): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.login_id.trim()) errs.login_id = 'ユーザーIDを入力してください。';
  if (!form.password) errs.password = 'パスワードを入力してください。';
  return errs;
}

async function onSubmit(): Promise<void> {
  const clientErrors = validateClient();
  if (Object.keys(clientErrors).length > 0) {
    fieldErrors.value = clientErrors;
    return;
  }
  await submit(async () => {
    const result = await authStore.login({
      login_id: form.login_id,
      password: form.password,
    });
    if (result.mfa_required) {
      router.push({ name: 'MfaVerify', query: { mfa_token: result.mfa_token } });
      return;
    }
    message.success('ログインしました。');
    const redirect = (route.query.redirect as string) || undefined;
    router.push(redirect ?? { name: 'Dashboard' });
  });
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-[400px] space-y-6">
      <header class="text-center">
        <h1 class="text-2xl font-bold text-text-main mb-2">
          日本農業新聞
        </h1>
        <p class="text-text-secondary text-sm">
          クラウド版購読者管理システム
        </p>
      </header>

      <BaseCard padding="none">
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
              :maxlength="20"
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
              :maxlength="32"
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

          <!-- ACSMS-SCR-012 入口。ログインボタン直下・利用規約行の上（screen-design.md）。
               named routes only 規約に従い named route を使用。 -->
          <div class="text-center mb-4">
            <router-link
              :to="{ name: 'ForgotPassword' }"
              class="text-sm text-primary hover:underline"
            >
              パスワードを忘れた場合
            </router-link>
          </div>

          <p class="text-xs text-center text-text-secondary leading-relaxed">
            ログインすることで
            <a class="text-primary hover:text-primary-hover underline" href="#">利用規約</a>
            に同意したものとみなされます。
          </p>
        </a-form>
      </BaseCard>

      <NoticeList :items="notices" />

      <BaseCard>
        <div class="flex items-start gap-3">
          <div class="bg-info-subtle p-2 rounded-full">
            <span class="material-symbols-outlined text-primary text-xl">headset_mic</span>
          </div>
          <div>
            <h3 class="text-xs font-bold text-text-main">お問い合わせ先</h3>
            <p class="text-2xs text-text-secondary mb-1">
              日本農業新聞 協同事業局業務管理部
            </p>
            <div class="flex items-baseline gap-2">
              <span class="text-base font-bold text-text-main">03-6281-5808</span>
              <span class="text-xxs text-text-secondary">（平日 9:30〜17:30）</span>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </AuthLayout>
</template>
