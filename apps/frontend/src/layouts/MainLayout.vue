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
      <!-- `@container`: 画面内のグリッド列数は **ビューポート幅ではなくこの
           コンテンツ領域の実幅** で決める（各ビューは `@lg:` / `@4xl:` を使う）。
           サイドバー `w-72`(288px) はここから差し引かれるのに `md:` / `lg:` は
           ビューポートで発火するため、iPad 縦(1024px)＋サイドバー展開だと
           実幅 672px しかないのに `lg:grid-cols-4` が効き、1列 ≈148px まで潰れて
           `<a-select>` が「選…」になっていた（実機確認 2026-08）。サイドバーの
           開閉でも同じズレが出るので、ビューポート基準では原理的に直せない。 -->
      <div class="@container px-4 pt-4 pb-6 md:p-8 md:pt-4 overflow-y-auto w-full">
        <AppHeader />

        <div class="mt-4">
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>
