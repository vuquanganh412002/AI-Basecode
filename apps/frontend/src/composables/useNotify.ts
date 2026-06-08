import { message } from 'ant-design-vue';

/**
 * Centralized user-feedback toasts. Use these instead of raw
 * `message.success(...)` so every screen uses the same Japanese
 * phrasing for the same action.
 *
 * **Project copy convention (DO NOT prefix the subject)** — toasts are
 * verb-only ("登録しました。", not "JAを登録しました。"). The button the
 * user just clicked + the screen they're on already imply the subject;
 * adding it makes every toast read like "Captain Obvious". This is
 * project-wide for ALL screens. If a screen genuinely needs a custom
 * message, call `notify.success(text)` directly with the literal copy.
 *
 * Usage:
 * ```ts
 * const notify = useNotify();
 * await api.create(form);
 * notify.created();   // ⇒ "登録しました。"
 * ```
 *
 * If a customer later asks for different copy, change it here once.
 */
export function useNotify() {
  return {
    /** Success after CREATE — `登録しました。`. */
    created() {
      message.success('登録しました。');
    },
    /** Success after UPDATE — `更新しました。`. */
    updated() {
      message.success('更新しました。');
    },
    /** Success after DELETE — `削除しました。`. */
    deleted() {
      message.success('削除しました。');
    },
    /** Success after FILE UPLOAD — `アップロードしました。`. */
    uploaded() {
      message.success('アップロードしました。');
    },
    /** Success after EXPORT/DOWNLOAD — `ダウンロードを開始しました。`. */
    downloaded() {
      message.success('ダウンロードを開始しました。');
    },
    /** Generic success — caller supplies the message. */
    success(text: string) {
      message.success(text);
    },
    /** Error toast — caller supplies the message.
        For HTTP errors prefer letting the global axios interceptor
        in src/api/error-handler.ts handle the toast. */
    error(text: string) {
      message.error(text);
    },
    /** Warning toast — non-blocking caution. */
    warning(text: string) {
      message.warning(text);
    },
    /** Info toast — neutral feedback. */
    info(text: string) {
      message.info(text);
    },
  };
}
