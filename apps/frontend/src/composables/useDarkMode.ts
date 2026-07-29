import { ref, watchEffect } from 'vue';

const STORAGE_KEY = 'theme-mode';
type Mode = 'light' | 'dark';

/**
 * ダークモードのシングルトン — アプリ毎に一度呼ぶ。
 * localStorage に永続化し `documentElement.classList` を同期。
 */
const mode = ref<Mode>(loadInitial());

function loadInitial(): Mode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

watchEffect(() => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode.value === 'dark');
  localStorage.setItem(STORAGE_KEY, mode.value);
});

export function useDarkMode() {
  function toggle(): void {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
  }
  function set(next: Mode): void {
    mode.value = next;
  }
  return { mode, toggle, set };
}
