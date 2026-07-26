import { nextTick } from 'vue';

/**
 * Focus + scroll to the first errored form field, in the given display order.
 *
 * Shared by CRUD form views (see `.claude/rules/vue.md §Auto-focus the first
 * error on submit`). Call it from BOTH the client-validation-fail path and the
 * server `VALIDATION_ERROR` path so the user always lands on the first problem.
 *
 * Robust across the three Ant Design Vue control kinds we use, because antd v4
 * assigns the control's `id` as `form_item_<name>` (or `<formName>_<name>` when
 * the `<a-form>` has a `name`), NOT the bare field name — so the lookup falls
 * back to an `[id$="_<name>"]` suffix match, then to scanning `.ant-form-item`:
 *   - `<a-input>` / `<a-textarea>` : native control → focus itself
 *   - `<a-select>`                 : focus the `.ant-select-selector` child
 *   - `<a-radio-group>`            : focus the first focusable descendant
 *
 * `scrollIntoView` is called optionally (`?.`) because jsdom doesn't implement
 * it — keeps unit tests free of unhandled rejections.
 *
 * @param fieldOrder - field names in DOM / template order (drives which error is "first")
 * @param errors - the `fieldErrors` map (field name → message)
 */
export function focusFirstError(
  fieldOrder: readonly string[],
  errors: Record<string, string>,
): void {
  const first = fieldOrder.find((f) => errors[f]);
  if (!first) return;

  void nextTick(() => {
    let target: HTMLElement | null = document.getElementById(first);
    // antd prefixes ids (form_item_<name> or <formName>_<name>).
    if (!target) {
      target = document.querySelector<HTMLElement>(
        `[id$="_${first}"], [id="${first}"]`,
      );
    }
    // Last resort: the .ant-form-item that owns a control named/ided `first`.
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

    // Native focusable control → focus directly.
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.focus();
      target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Wrapper (a-select / a-radio-group / a-form-item) → drill to the first
    // focusable descendant.
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
