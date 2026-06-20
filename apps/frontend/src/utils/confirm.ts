import { Modal } from 'ant-design-vue';

/**
 * プロジェクト共通の削除確認ダイアログ。全リスト画面で見た目・文言を統一する:
 *   - タイトル「削除確認」
 *   - OK ボタン「はい」(okType=danger / 赤)
 *   - キャンセルボタン「いいえ」
 *
 * 破壊的操作の意図は赤ボタン(danger)で示し、ラベルは はい / いいえ に揃える
 * （.claude/rules/vue.md §Modal Confirmation の方針）。
 *
 * 内部で `Modal.confirm` をそのまま呼ぶため、スペックの
 * `vi.spyOn(Modal, 'confirm')` はこれまで通り onOk を捕捉できる。
 *
 * @param content 確認本文（例: 「この販売店を削除してもよろしいですか？」）
 * @param onOk    「はい」押下時の処理（削除 API + notify + 再取得など）
 */
export function confirmDelete(
  content: string,
  onOk: () => void | Promise<void>,
): void {
  Modal.confirm({
    title: '削除確認',
    content,
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    onOk,
  });
}
