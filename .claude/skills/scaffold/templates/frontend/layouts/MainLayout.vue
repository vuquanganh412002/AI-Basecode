<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { message } from 'ant-design-vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';

const errorMessage = ref<string | null>(null);

onErrorCaptured((err) => {
  errorMessage.value = 'エラーが発生しました。ページを更新してください。';
  message.error('エラーが発生しました');
  console.error('Component error:', err);
  return false;
});
</script>

<template>
  <div class="min-h-screen flex bg-bg-layout text-text-main">
    <AppSidebar />

    <main class="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
      <AppHeader />

      <div class="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <a-alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          closable
          @close="errorMessage = null"
        />
        <router-view />
      </div>
    </main>
  </div>
</template>
