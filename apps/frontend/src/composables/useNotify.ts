import { message } from 'ant-design-vue';

/**
 * ユーザーフィードバックの共通トースト。生の `message.success(...)` の代わりに
 * 使い、同一操作には全画面で同一の日本語表現を使う。
 *
 * **コピー規約（主語を接頭しない）** — トーストは動詞のみ（「登録しました。」で
 * あって「JAを登録しました。」ではない）。押したボタン + 画面が主語を暗示するため、
 * 付けると Captain Obvious 化する。全画面共通。カスタム文言が必要な画面は
 * `notify.success(text)` を直接呼ぶ。
 *
 * 使用例:
 * ```ts
 * const notify = useNotify();
 * await api.create(form);
 * notify.created();   // ⇒ "登録しました。"
 * ```
 *
 * 顧客が後で別文言を求めた場合はここを一度変更するだけ。
 */
export function useNotify() {
  return {
    /** CREATE 成功 — `登録しました。`。 */
    created() {
      message.success('登録しました。');
    },
    /** UPDATE 成功 — `更新しました。`。 */
    updated() {
      message.success('更新しました。');
    },
    /** DELETE 成功 — `削除しました。`。 */
    deleted() {
      message.success('削除しました。');
    },
    /** ファイルアップロード成功 — `アップロードしました。`。 */
    uploaded() {
      message.success('アップロードしました。');
    },
    /** エクスポート/ダウンロード成功 — `ダウンロードを開始しました。`。 */
    downloaded() {
      message.success('ダウンロードを開始しました。');
    },
    /** 汎用成功 — 呼び出し元が文言を指定。 */
    success(text: string) {
      message.success(text);
    },
    /** エラートースト — 呼び出し元が文言を指定。
        HTTP エラーは src/api/error-handler.ts のグローバル axios interceptor に
        トーストを任せることを推奨。 */
    error(text: string) {
      message.error(text);
    },
    /** 警告トースト — 非ブロッキングな注意喚起。 */
    warning(text: string) {
      message.warning(text);
    },
    /** 情報トースト — 中立的フィードバック。 */
    info(text: string) {
      message.info(text);
    },
  };
}
