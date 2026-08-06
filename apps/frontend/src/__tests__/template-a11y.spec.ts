import { describe, expect, it } from 'vitest';

// src 配下の全 .vue を生テキストで取り込む（node:fs は FE tsconfig に
// @types/node が無いため使えない）。
const VUE_SOURCES = import.meta.glob('../**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const FORM_ITEM = /<a-form-item\b(.*?)<\/a-form-item>/gs;

/**
 * Only the template matters, and scanning `<script>` actively breaks the
 * pairing: a comment mentioning `<a-form-item …>` starts a match that runs to
 * the first real `</a-form-item>`, shifting every block boundary after it.
 */
function template(source: string): string {
  const at = source.indexOf('<template>');
  return at < 0 ? '' : source.slice(at);
}
/** id が <div> に載ってしまい <label for> の宛先にできないコントロール。 */
const NON_LABELABLE = /<(a-radio-group|a-checkbox-group|a-switch)\b/;

/**
 * A `<label>` names exactly ONE control. A radio/checkbox group is several, so
 * antd's generated `<label for="form_item_<name>">` can only ever be wrong:
 * the id it injects lands on the group's `<div>` (browser: "Incorrect use of
 * `<label for=FORM_ELEMENT>`"), and suppressing the `for` leaves a label bound
 * to nothing ("No label associated with a form field").
 *
 * The fix is to not let antd render a label for those fields at all — drop the
 * `label` prop / `#label` slot and name the group natively with
 * `<fieldset>` + `<legend>`. Being native, it also needs no `role`/`aria-label`
 * (and Sonar Web:S6819 prefers native elements over ARIA roles).
 *
 * See `.claude/rules/vue.md` §Accessibility 1a for the exact markup, including
 * the class list that reproduces antd's label geometry (22px line + 8px gap,
 * with antd's legend border-bottom and margin reset overridden).
 */
describe('template a11y', () => {
  it('should not put a form-item label on a group field', () => {
    const offenders: string[] = [];

    for (const [file, source] of Object.entries(VUE_SOURCES)) {
      for (const match of template(source).matchAll(FORM_ITEM)) {
        const [head, body] = splitTag(match[0]);
        if (!NON_LABELABLE.test(body)) continue;
        const rendersLabel = /\blabel="/.test(head) || /#label>/.test(body);
        if (!rendersLabel) continue;
        offenders.push(`${/name="([^"]+)"/.exec(head)?.[1] ?? file}  (${file})`);
      }
    }

    expect(Object.keys(VUE_SOURCES).length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  /**
   * antd derives the label's `for` from `name` (`form_item_<name>`) and injects
   * that same id into the control. Setting an explicit `id` on the control
   * (SCR-018 does, because `focusFirstError` looks fields up by field name)
   * overwrites the injected one, so the label ends up pointing at an id that
   * never renders. `html-for` must then be set to the explicit id.
   */
  it('should keep form-item label and explicit control id in sync', () => {
    const offenders: string[] = [];

    for (const [file, source] of Object.entries(VUE_SOURCES)) {
      for (const match of template(source).matchAll(FORM_ITEM)) {
        const [head, body] = splitTag(match[0]);
        const name = /name="([^"]+)"/.exec(head)?.[1];
        if (!name || /html-for/.test(head)) continue;
        if (!/\blabel="/.test(head) && !/#label>/.test(body)) continue;
        const explicitId = /\s+id="([^"]+)"/.exec(body)?.[1];
        if (explicitId) offenders.push(`${file} ${name} -> id="${explicitId}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * Hand-written `<label for="x">` in search forms has the same constraint:
   * a radio/checkbox group renders a `<div>`, which `for` cannot address.
   */
  it('should not point a hand-written label at a group', () => {
    const offenders: string[] = [];
    const LABEL = /<label\b[^>]*?(?<![\w:-])for="([^"]+)"(.*?)<\/label>/gs;

    for (const [file, source] of Object.entries(VUE_SOURCES)) {
      for (const match of template(source).matchAll(LABEL)) {
        if (NON_LABELABLE.test(match[2])) offenders.push(`${file} for="${match[1]}"`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

function splitTag(block: string): [string, string] {
  const idx = block.indexOf('>');
  return [block.slice(0, idx), block.slice(idx + 1)];
}
