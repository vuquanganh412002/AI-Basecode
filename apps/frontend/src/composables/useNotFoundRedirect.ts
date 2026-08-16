import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

/**
 * 編集画面（ACSMS-SCR-005/006/007/009/011/017/025 等）が、直接 URL アクセス等で
 * 存在しない ID の詳細取得に失敗したときの共通後処理 — ダッシュボードへ戻す
 * （顧客要件 2026-08: 空の編集フォームのまま画面に留まらせない。account/
 * hanbaiten は「何もしない」、ja/kanri-shiten/shiten は「戻すが各画面が
 * 個別実装」、tanka は「TankaList へ戻す」とバラバラだった挙動を統一する）。
 *
 * 全ページ共通の「no standalone error pages」方針（.claude/rules/vue.md）の
 * 編集画面版 — FORBIDDEN は axios interceptor がグローバルに処理するが、
 * NOT_FOUND は「その ID が存在しない」という画面ごとの文脈判断が要るため
 * グローバル化せず、各画面の詳細取得 catch から明示的に呼ぶ。
 */
export function useNotFoundRedirect() {
  const router = useRouter();

  /**
   * @param customMessage 画面固有の文言が必要な場合のみ指定する（例:
   *   ACSMS-SCR-011 の ACSMS-MSG-011-016 「購読者ID #{id} が見つかりません。」の
   *   ように ID を含む固定文言が顧客要件で決まっている画面）。省略時は何も
   *   トーストしない — BE の一般メッセージ（`指定された{resource}が見つかり
   *   ません。`）を axios interceptor（src/api/error-handler.ts）が既に
   *   トースト済みのため、ここで再度出すと二重表示になる。
   */
  async function redirectToDashboard(customMessage?: string): Promise<void> {
    if (customMessage) {
      message.error(customMessage);
    }
    try {
      await router.push({ name: 'Dashboard' });
    } catch {
      // テスト用ルーターに Dashboard が未登録のことがある — 無視。
    }
  }

  return { redirectToDashboard };
}
