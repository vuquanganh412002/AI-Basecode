<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';

// Render / lifecycle errors are caught by the global onErrorCaptured
// in App.vue (covers both auth and main layouts). HTTP errors are
// caught by the axios interceptor in src/api/error-handler.ts.
</script>

<template>
  <div class="min-h-screen flex bg-bg-layout text-text-main">
    <AppSidebar />

    <main class="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
      <div class="px-4 pt-4 pb-6 md:p-8 md:pt-4 overflow-y-auto w-full">
        <AppHeader />

        <div class="mt-4">
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>
