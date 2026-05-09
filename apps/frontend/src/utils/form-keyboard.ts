/**
 * Form keyboard utilities — small DOM-event helpers shared by CRUD edit
 * views.
 *
 * Why this exists: HTML forms with a `<button type="submit">` and a
 * single text input auto-submit on Enter (browser implicit submission).
 * That's the right UX for short forms (login, search) but the wrong UX
 * for long CRUD forms with 10+ fields, where users hit Enter as a
 * "next field" reflex (especially on Japanese IME keyboards). Wire
 * `preventEnterImplicitSubmit` to the form's `@keydown` to suppress
 * the accidental submit while preserving:
 *
 *   - Enter in `<textarea>` → newline
 *   - Enter on the submit button itself → submit
 *   - Enter inside antd `<a-select>` / `<a-cascader>` / `<a-date-picker>`
 *     → confirm highlighted option (these mark their wrapper with
 *     role="combobox" so we detect via `closest()`)
 *
 * Usage:
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

  // Allow Enter in textareas (newline) and when the submit button is
  // the focused element.
  if (tag === 'TEXTAREA' || tag === 'BUTTON') return;

  // antd select-likes use role="combobox" on the wrapper. Their internal
  // Enter handler runs first; we never reach this branch when the
  // dropdown is open (antd stops propagation), but we belt-and-suspender
  // anyway.
  if (target.closest('[role="combobox"]')) return;

  // Everything else (text input, number input, password, date input
  // type="text" antd uses, etc.) — block the implicit form submission.
  e.preventDefault();
}
