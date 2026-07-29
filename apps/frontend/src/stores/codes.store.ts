import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCodes, type CodeItem, type CodeMap } from '@/api/codes/codes';

/**
 * コードマスタストア。
 *
 * ログイン後の 1 回の HTTP 呼び出しで BE `m_code` テーブル（21 カテゴリ）を
 * ミラー。全ドロップダウン/ラベル対応はこのキャッシュから読み、
 * コンポーネントは API を直接呼ばない。
 *
 * ライフサイクル:
 *   - login / MFA verify 成功 / アプリ起動（refreshSession）→ loadAll()
 *   - logout → reset() でキャッシュ破棄し次ユーザーが再取得
 *
 * m_code 値は実行時にほぼ変わらないため TTL 無し。管理画面が後で m_code を
 * 変更した場合は `reload()` で再取得。
 */
export const useCodesStore = defineStore('codes', () => {
  const all = ref<CodeMap | null>(null);
  const loading = ref(false);

  const isLoaded = computed(() => all.value !== null);

  async function loadAll(): Promise<void> {
    if (all.value !== null) return;
    loading.value = true;
    try {
      all.value = await getCodes();
    } finally {
      loading.value = false;
    }
  }

  async function reload(): Promise<void> {
    loading.value = true;
    try {
      all.value = await getCodes();
    } finally {
      loading.value = false;
    }
  }

  /** `<a-select :options="…">` 用の option（value + label ペア）。 */
  function options(category: string): CodeItem[] {
    return all.value?.[category] ?? [];
  }

  /** 保存済みコード値の表示ラベルを引く。 */
  function label(category: string, value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return all.value?.[category]?.find((x) => x.value === value)?.label ?? '';
  }

  /** 短縮表示ラベル（列幅が狭いテーブルで使用）。 */
  function labelShort(category: string, value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return all.value?.[category]?.find((x) => x.value === value)?.label_short ?? '';
  }

  function reset(): void {
    all.value = null;
    loading.value = false;
  }

  return {
    all,
    loading,
    isLoaded,
    loadAll,
    reload,
    options,
    label,
    labelShort,
    reset,
  };
});
