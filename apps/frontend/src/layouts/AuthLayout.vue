<script setup lang="ts">
import DarkModeToggle from '@/components/layout/DarkModeToggle.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col font-display bg-bg-layout transition-colors">
    <main class="flex-grow flex items-center justify-center py-12 px-4">
      <!-- Slot receives the full card(s) including header -->
      <slot />
    </main>

    <footer class="py-6 text-center">
      <p class="text-[11px] text-text-secondary">
        © 2026 Japan.
      </p>
    </footer>

    <!-- Floating dark-mode toggle -->
    <div class="fixed bottom-6 right-6 z-50">
      <DarkModeToggle />
    </div>
  </div>
</template>
