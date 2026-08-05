import { ref } from 'vue';
import { getTodofukenList, type TodofukenItem } from '@/api/todofuken/todofuken';

/**
 * 都道府県マスタ（47件・静的）の共有キャッシュ。
 *
 * モジュールレベルで持つ理由: 1画面に都道府県セレクトが複数ある（購読者登録は
 * 購読者住所と配達先住所の2つ）ため、コンポーネント側で素直に読み込むと同じ
 * GET が件数ぶん飛ぶ。値は運用中に変わらないので TTL は設けない。
 *
 * m_code と違いログアウトで破棄する必要はない（テナント非依存の公開マスタ）。
 * テストからは resetTodofukenCache() で明示的に初期化する。
 */
const items = ref<TodofukenItem[]>([]);
/** 同時 mount で重複 GET しないための in-flight 共有。 */
let inflight: Promise<void> | null = null;

/** テスト用: モジュール状態を捨てる（spec の beforeEach から呼ぶ）。 */
export function resetTodofukenCache(): void {
  items.value = [];
  inflight = null;
}

export function useTodofuken() {
  /** 未取得なら取得する。取得済み・取得中なら HTTP は増やさない。 */
  async function load(): Promise<void> {
    if (items.value.length > 0) return;
    inflight ??= getTodofukenList()
      .then((resp) => {
        // 実装は envelope を返すが、過去に配列直返しのモックがあったため両対応。
        items.value = Array.isArray(resp)
          ? (resp as unknown as TodofukenItem[])
          : (resp?.data ?? []);
      })
      .catch(() => {
        // 共通 interceptor がトースト済み。空のままにして画面は動かす。
        items.value = [];
      })
      .finally(() => {
        inflight = null;
      });
    await inflight;
  }

  /** コード → 都道府県名。未選択・未知コードは空文字。 */
  function name(code: string | null | undefined): string {
    if (!code) return '';
    return items.value.find((o) => o.todofuken_code === code)?.todofuken_name ?? '';
  }

  return { items, load, name };
}
