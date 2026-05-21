/**
 * Half-width katakana validation shared by every `*_name_kana` form
 * field (JA, 管理支店, 支店, …). Downstream Zengin CSV / PDF exports
 * mandate half-width per spec — see `.claude/rules/vue.md §Kana fields`.
 *
 * Single source of truth so the regex + canonical message wording stay
 * identical across screens. Mirrors the BE `@Matches(/^[ｦ-ﾟ\s]+$/u)` in
 * each `*_kana` DTO field.
 */

/**
 * U+FF66 ｦ – U+FF9F ﾟ covers letters ｦ-ﾝ, the prolonged sound mark ｰ
 * (U+FF70), and dakuten/handakuten ﾞ ﾟ. `\s` already includes the
 * full-width space U+3000, so we do NOT add `　` to the character class
 * (SonarLint flags it as a duplicate).
 *
 * `0-9` was added 2026-05-21 — customer reported that real-world JA /
 * 支店 / 販売店 names carry branch numbering suffixes (e.g.
 * `ﾃｽﾄ123`, `ｾﾝﾀｰ2`). The Zengin / JASTEM export-side accepts these as
 * long as they're half-width, so loosening the regex is safe.
 */
export const HALF_WIDTH_KATAKANA_RE = /^[ｦ-ﾟ\s0-9]+$/u;

/**
 * Build the canonical error message for an invalid `*_name_kana` field.
 *
 *   kanaFormatMessage('JA名')           -> 'JA名(カナ)は半角カタカナ・半角数字で入力してください。'
 *   kanaFormatMessage('管理支店名')     -> '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。'
 *   kanaFormatMessage('支店名')         -> '支店名(カナ)は半角カタカナ・半角数字で入力してください。'
 *
 * Keep the wording in sync with the BE DTO `@Matches` message so both
 * layers surface the same text via `<a-form-item :help>`.
 */
export function kanaFormatMessage(fieldLabel: string): string {
  return `${fieldLabel}(カナ)は半角カタカナ・半角数字で入力してください。`;
}
