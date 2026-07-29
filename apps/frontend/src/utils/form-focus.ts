import { nextTick } from 'vue';

/**
 * 指定の表示順で最初のエラーフィールドにフォーカス + スクロールする。
 *
 * CRUD フォームビュー共通（`.claude/rules/vue.md §Auto-focus the first error on submit`）。
 * クライアント検証失敗パスとサーバー `VALIDATION_ERROR` パスの両方から呼び、
 * ユーザーが常に最初の問題箇所に着地するようにする。
 *
 * 使用する 3 種の Ant Design Vue コントロールに頑健。antd v4 はコントロールの `id` を
 * `form_item_<name>`（`<a-form>` に `name` があれば `<formName>_<name>`）に割り当て、
 * 素のフィールド名ではないため、`[id$="_<name>"]` 後方一致 → `.ant-form-item` 走査 の順にフォールバックする:
 *   - `<a-input>` / `<a-textarea>` : ネイティブコントロール → 自身にフォーカス
 *   - `<a-select>`                 : `.ant-select-selector` 子にフォーカス
 *   - `<a-radio-group>`            : 最初のフォーカス可能子孫にフォーカス
 *
 * `scrollIntoView` は任意呼び出し（`?.`）— jsdom が未実装のため、単体テストの
 * unhandled rejection を防ぐ。
 *
 * @param fieldOrder - DOM / テンプレート順のフィールド名（どのエラーが「最初」かを決める）
 * @param errors - `fieldErrors` マップ（フィールド名 → メッセージ）
 */
export function focusFirstError(
  fieldOrder: readonly string[],
  errors: Record<string, string>,
): void {
  const first = fieldOrder.find((f) => errors[f]);
  if (!first) return;

  void nextTick(() => {
    let target: HTMLElement | null = document.getElementById(first);
    // antd は id に接頭辞を付ける（form_item_<name> または <formName>_<name>）。
    target ??= document.querySelector<HTMLElement>(
      `[id$="_${first}"], [id="${first}"]`,
    );
    // 最終手段: `first` を name/id に持つコントロールを含む .ant-form-item。
    if (!target) {
      const items = document.querySelectorAll<HTMLElement>('.ant-form-item');
      for (const item of items) {
        if (item.querySelector(`[name="${first}"], #${first}`)) {
          target = item;
          break;
        }
      }
    }
    if (!target) return;

    // ネイティブのフォーカス可能コントロール → 直接フォーカス。
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.focus();
      target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    // ラッパ（a-select / a-radio-group / a-form-item）→ 最初のフォーカス可能子孫まで辿る。
    const inner =
      target.querySelector<HTMLElement>('.ant-select-selector') ??
      target.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])',
      ) ??
      target;
    inner?.focus?.();
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  });
}
