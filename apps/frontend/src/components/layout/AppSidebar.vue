<script setup lang="ts">
import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSidebar, MD_BREAKPOINT } from '@/composables/useSidebar';
import { useMenu } from '@/composables/useMenu';
import DarkModeToggle from './DarkModeToggle.vue';

const { open, hide } = useSidebar();
const route = useRoute();
const router = useRouter();

// Menu source of truth: src/constants/menu-sections.ts. Permission filter:
// src/composables/useMenu.ts. DashboardView consumes the same composable so
// the sidebar and the SCR-010 menu cards never drift apart.
const { visibleSections } = useMenu();

function isActive(name: string): boolean {
  return route.name === name;
}

function navigate(name: string): void {
  // During layout testing many routes aren't registered yet; skip instead of
  // crashing / logging a vue-router warning.
  if (!router.hasRoute(name)) return;
  router.push({ name });
}

// Auto-close the overlay sidebar after navigating on mobile.
watch(
  () => route.fullPath,
  () => {
    if (typeof window !== 'undefined' && window.innerWidth < MD_BREAKPOINT) {
      hide();
    }
  },
);
</script>

<template>
  <!-- Mobile-only backdrop: dims page content and closes sidebar on tap. -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/40 z-30 md:hidden"
    aria-hidden="true"
    @click="hide"
  />

  <aside
    :class="[
      'bg-surface-card border-r border-border flex flex-col h-screen w-72 flex-shrink-0',
      // Mobile: fixed overlay that slides in from the left.
      'fixed top-0 left-0 z-40 transition-transform duration-300',
      open ? 'translate-x-0' : '-translate-x-full',
      // Desktop: in-flow sticky child; animate width when collapsed instead.
      'md:sticky md:top-0 md:z-auto md:translate-x-0 md:transition-[width] md:duration-300',
      open ? '' : 'md:w-0 md:border-r-0 md:overflow-hidden',
    ]"
  >
    <!-- Brand -->
    <div class="p-6 border-b border-border flex items-center gap-3">
      <div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
        <span class="material-icons text-white text-sm">auto_stories</span>
      </div>
      <h1 class="font-bold text-lg tracking-tight">購読者管理システム</h1>
    </div>

    <!-- Nav -->
    <nav class="flex-1 mt-2 overflow-y-auto sidebar-scroll px-4 pb-6 space-y-6">
      <div
        v-for="(section, idx) in visibleSections"
        :key="section.heading ?? `root-${idx}`"
        :class="section.extraClass"
      >
        <h3
          v-if="section.heading"
          class="px-3 text-2xs font-bold text-text-secondary uppercase tracking-wider mb-2"
        >
          {{ section.heading }}
        </h3>
        <div class="space-y-1">
          <button
            v-for="item in section.items"
            :key="item.name"
            type="button"
            :disabled="item.disabled"
            :title="
              item.disabled
                ? '紙版・電子版いずれの取扱い権限もありません'
                : undefined
            "
            class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="
              isActive(item.name)
                ? 'bg-surface-active text-primary font-medium'
                : 'text-text-main hover:bg-surface-hover disabled:hover:bg-transparent'
            "
            @click="navigate(item.name)"
          >
            <span
              class="material-icons text-lg"
              :class="isActive(item.name) ? '' : 'text-icon'"
            >{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Footer: dark mode toggle -->
    <div class="p-4 border-t border-border flex justify-center">
      <DarkModeToggle />
    </div>
  </aside>
</template>
