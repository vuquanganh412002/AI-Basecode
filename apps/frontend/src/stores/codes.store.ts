import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCodes, type CodeItem, type CodeMap } from '@/api/codes/codes';

/** 画面/BE から渡りうるコード値の型（radio は string、API 応答は number）。 */
type CodeValue = number | string | null | undefined;

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

  /**
   * 値がそのカテゴリの m_code に存在するか（BE `CodeService.has()` のミラー）。
   *
   * Group B カテゴリ（TANKA_TYPE, ZEI_KUBUN, GENDER …）は顧客が実行時に値を
   * 追加できるため、画面側の入力チェックで `'1' | '2'` を決め打ちしてはいけない
   * （追加された値が radio に出るのに保存できない、という不整合になる）。
   *
   * `String()` で寄せるのは、form state は radio 由来の string、BE 応答と
   * `CodeService.normalizeValue()` は number を返すため。
   */
  function has(category: string, value: CodeValue): boolean {
    if (value === null || value === undefined || value === '') return false;
    return (all.value?.[category] ?? []).some(
      (x) => String(x.value) === String(value),
    );
  }

  /** 保存済みコード値の表示ラベルを引く。 */
  function label(category: string, value: CodeValue): string {
    if (value === null || value === undefined) return '';
    return all.value?.[category]?.find((x) => x.value === value)?.label ?? '';
  }

  /** 短縮表示ラベル（列幅が狭いテーブルで使用）。 */
  function labelShort(category: string, value: CodeValue): string {
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
    has,
    label,
    labelShort,
    reset,
  };
});
