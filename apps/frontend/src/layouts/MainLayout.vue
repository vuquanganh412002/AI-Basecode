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

    <!-- Reference docs/design/ACSMS-SCR-003/index.html:
         <main class="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
           <div class="p-8 pt-4 overflow-y-auto w-full">
             <header>…title + breadcrumb + user…</header>
             <div class="mt-4 …page content…"></div>
           </div>
         </main>
    -->
    <main class="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
      <div class="px-4 pt-4 pb-6 md:p-8 md:pt-4 overflow-y-auto w-full">
        <AppHeader />

        <div class="mt-4">
          <a-alert
            v-if="errorMessage"
            type="error"
            :message="errorMessage"
            closable
            class="mb-4"
            @close="errorMessage = null"
          />
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>
