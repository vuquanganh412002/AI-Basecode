/**
 * フォームのキーボードユーティリティ — CRUD 編集ビュー共通の小さな DOM イベントヘルパ。
 *
 * 存在理由: `<button type="submit">` + 単一テキスト入力の HTML フォームは Enter で
 * 自動送信される（ブラウザの暗黙送信）。短いフォーム（ログイン・検索）では正しい UX だが、
 * 10 フィールド以上の長い CRUD フォームでは誤 UX — ユーザーが「次のフィールド」感覚で
 * Enter を押す（特に日本語 IME）。フォームの `@keydown` に `preventEnterImplicitSubmit` を
 * 繋ぎ、誤送信を抑止しつつ以下は維持する:
 *
 *   - `<textarea>` 内の Enter → 改行
 *   - submit ボタン上の Enter → 送信
 *   - antd `<a-select>` / `<a-cascader>` / `<a-date-picker>` 内の Enter
 *     → ハイライト中の option を確定（これらは wrapper に role="combobox" を持つので
 *     `closest()` で検出）
 *
 * 使用例:
 * ```vue
 * <a-form
 *   :model="formState"
 *   @keydown="preventEnterImplicitSubmit"
 *   @finish="onFormSubmit"
 * >
 * ```
 */
export function preventEnterImplicitSubmit(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return;
  if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;

  const target = e.target as HTMLElement | null;
  if (!target) return;
  const tag = target.tagName;

  // textarea 内（改行）と submit ボタンにフォーカスがあるときは Enter を許可。
  if (tag === 'TEXTAREA' || tag === 'BUTTON') return;

  // antd の select 系は wrapper に role="combobox" を持つ。内部の Enter ハンドラが先に走り、
  // ドロップダウンが開いているときこの分岐には到達しない（antd が propagation を止める）が、
  // 念のため二重で防御する。
  if (target.closest('[role="combobox"]')) return;

  // それ以外（テキスト入力・数値入力・パスワード・antd の type="text" 日付入力 等）は
  // 暗黙のフォーム送信をブロック。
  e.preventDefault();
}
