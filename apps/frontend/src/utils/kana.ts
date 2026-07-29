/**
 * 全 `*_name_kana` フォームフィールド（JA, 管理支店, 支店, …）共通の半角カタカナ検証。
 * 下流の Zengin CSV / PDF エクスポートは仕様上半角必須 — `.claude/rules/vue.md §Kana fields` 参照。
 *
 * 正規表現 + 標準メッセージ文言を画面間で一致させるための唯一の情報源。各 `*_kana` DTO の
 * BE `@Matches(/^[ｦ-ﾟ\s]+$/u)` のミラー。
 */

/**
 * U+FF66 ｦ – U+FF9F ﾟ は文字 ｦ-ﾝ、長音符 ｰ（U+FF70）、濁点/半濁点 ﾞ ﾟ を含む。
 * `\s` は既に全角スペース U+3000 を含むため、文字クラスに `　` を追加しない
 * （SonarLint が重複として指摘する）。
 *
 * `0-9` は 2026-05-21 に追加 — 実際の JA / 支店 / 販売店 名に支店番号サフィックス
 * （例 `ﾃｽﾄ123`, `ｾﾝﾀｰ2`）が付くと顧客報告。Zengin / JASTEM エクスポート側は
 * 半角である限り受理するため、正規表現を緩めても安全。
 */
export const HALF_WIDTH_KATAKANA_RE = /^[ｦ-ﾟ\s0-9]+$/u;

/**
 * 不正な `*_name_kana` フィールド向けの標準エラーメッセージを組み立てる。
 *
 *   kanaFormatMessage('JA名')           -> 'JA名(カナ)は半角カタカナ・半角数字で入力してください。'
 *   kanaFormatMessage('管理支店名')     -> '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。'
 *   kanaFormatMessage('支店名')         -> '支店名(カナ)は半角カタカナ・半角数字で入力してください。'
 *
 * BE DTO の `@Matches` メッセージと文言を同期させ、両層が `<a-form-item :help>` に同じ文を表示するようにする。
 */
export function kanaFormatMessage(fieldLabel: string): string {
  return `${fieldLabel}(カナ)は半角カタカナ・半角数字で入力してください。`;
}

/**
 * JASTEM 連携 名称項目（委託者名・農協名・店舗名）の許容文字（顧客要件 2026-06-25）。
 * 銀行システムが受理する限定文字セットのみ許可する。漢字・ひらがな・全角カタカナ・
 * その他特殊文字は不可（2026-06 の「漢字・ひらがな可」は本要件で取り消し）。
 *
 * 許可（`/^[ｱ-ﾟ A-Z0-9.()\\-]+$/`）:
 *   - U+FF71-FF9F: 半角カタカナ ｱ～ﾟ（清音・濁点ﾞ・半濁点ﾟ）。
 *     ※小書きカナ(ｧｨｩｪｫｬｭｮｯ)・ｦ・長音符ｰ(U+FF70)は範囲外＝不可。
 *   - 半角スペース / 半角英大文字 A-Z / 半角数字 0-9 / 記号 . ( ) -
 * 不可: 漢字・ひらがな・全角カタカナ・半角英小文字・上記以外の記号。
 *
 * BE の create-ja / update-ja / create-shiten / update-shiten DTO の @Matches と
 * 正規表現・メッセージを一致させること。
 */
export const JASTEM_NAME_RE = /^[ｱ-ﾟ A-Z0-9.()-]+$/;

export function jastemNameFormatMessage(fieldLabel: string): string {
  return `${fieldLabel}は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。`;
}
