import { ref } from 'vue';

/**
 * サイドバー表示状態 — AppSidebar + AppHeader（トグル）で共有。
 *
 * 既定:
 * - デスクトップ（≥ md / 768px）: 開
 * - モバイル（< md）: 閉（開くとオーバーレイ表示）
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
