import { ref } from 'vue';

/**
 * Sidebar visibility state — shared across AppSidebar + AppHeader (toggle).
 *
 * Default:
 * - desktop (≥ md / 768px): open
 * - mobile (< md):          closed (sidebar renders as overlay when opened)
 */
const MD_BREAKPOINT = 768;

const open = ref(
  typeof window !== 'undefined' ? window.innerWidth >= MD_BREAKPOINT : true,
);

export function useSidebar() {
  return {
    open,
    toggle: () => {
      open.value = !open.value;
    },
    show: () => {
      open.value = true;
    },
    hide: () => {
      open.value = false;
    },
  };
}

export { MD_BREAKPOINT };
