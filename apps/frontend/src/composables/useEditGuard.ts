import { nextTick, ref } from 'vue';

/**
 * 編集フォーム共通の「変更なしガード」。
 *
 * 編集モードでレコードを開くと現在値が入ったフォームが表示される。ユーザーが
 * どの入力も変更せずに「更新」を押した場合、PUT API 呼び出しや監査ログ・履歴
 * (t_dokusya_rireki 等) の書き込みは不要 — むしろ有害（無意味な履歴行が増える）。
 * このガードはロード直後のフォーム状態をスナップショットし、送信時に変化が
 * 無ければ `isPristine()` が true を返すので、呼び出し側は更新をスキップできる。
 *
 * 使い方:
 * ```ts
 * const editGuard = useEditGuard(() => formState);
 *
 * onMounted(async () => {
 *   if (isEdit.value) {
 *     await loadDetail(id);
 *     await editGuard.capture();   // ロード（＋カスケード watcher）が落ち着いた後
 *   }
 * });
 *
 * async function onSubmit() {
 *   if (isEdit.value && editGuard.isPristine()) {
 *     message.info('変更がありません。');
 *     return;                       // PUT もログも履歴も発生しない
 *   }
 *   await submit(async () => { await updateX(...); });
 * }
 * ```
 *
 * 比較は「フォーム入力モデル（多くは formState）」を JSON 直列化した文字列で行う。
 * キーは再帰的にソートして直列化するため、スナップショット元が呼び出しごとに
 * 新しいオブジェクトを返す場合（例: buildRequestBody()）でもキー順差で誤検知し
 * ない。`capture()` は `nextTick()` を待ってからスナップショットを取り、ロード時
 * の watcher（カスケードクリア等）が確定した後の値を基準にする。
 *
 * @param snapshot 比較対象を返すゲッター。通常は `() => formState`。
 */
export function useEditGuard<T>(snapshot: () => T) {
  const baseline = ref<string | null>(null);

  async function capture(): Promise<void> {
    await nextTick();
    baseline.value = stableStringify(snapshot());
  }

  function isPristine(): boolean {
    return (
      baseline.value !== null && stableStringify(snapshot()) === baseline.value
    );
  }

  function reset(): void {
    baseline.value = null;
  }

  return { capture, isPristine, reset };
}

/** キーを再帰的にソートして JSON 直列化（キー順差による誤検知を防ぐ）。 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (val as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return val;
  });
}
