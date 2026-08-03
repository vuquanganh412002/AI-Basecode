import { Modal } from 'ant-design-vue';

/**
 * プロジェクト共通の「取り返しがつかない操作」確認ダイアログ。見た目・文言を
 * 全画面で統一する:
 *   - OK ボタン「はい」(okType=danger / 赤)
 *   - キャンセルボタン「いいえ」
 *
 * 破壊的操作の意図は赤ボタン(danger)で示し、ラベルは はい / いいえ に揃える
 * （.claude/rules/vue.md §Modal Confirmation の方針）。動詞ラベル
 * （「有効にする」等）は曖昧さを解く場合の例外で、ここでは使わない。
 *
 * 内部で `Modal.confirm` をそのまま呼ぶため、スペックの
 * `vi.spyOn(Modal, 'confirm')` は onOk を捕捉できる。
 *
 * @param title    ダイアログ見出し（例: 「削除確認」「購読中止確認」）
 * @param content  確認本文（例: 「この販売店を削除してもよろしいですか？」）
 * @param onOk     「はい」押下時の処理
 * @param onCancel 「いいえ」/ ✕ / ESC / マスククリック時の処理。呼び出し元が
 *   ダイアログ表示中に自前のモーダルを隠している場合、ここで戻す。
 */
export function confirmDanger(
  title: string,
  content: string,
  onOk: () => void | Promise<void>,
  onCancel?: () => void,
): void {
  Modal.confirm({
    title,
    content,
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    onOk,
    onCancel,
  });
}

/**
 * 削除確認ダイアログ（タイトル固定「削除確認」）。全リスト画面の削除リンクが使う。
 *
 * @param content 確認本文（例: 「この購読者を削除してもよろしいですか？」）
 * @param onOk    「はい」押下時の処理（削除 API + notify + 再取得など）
 */
export function confirmDelete(
  content: string,
  onOk: () => void | Promise<void>,
): void {
  confirmDanger('削除確認', content, onOk);
}
