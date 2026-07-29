/**
 * 購読者層分類 (`t_dokusya.dokusyaso_bunrui`) / 農業者分類
 * (`t_dokusya.nogyosya_bunrui`) のコード値。
 *
 * DB には**電子版システムと同じコード値**をカンマ区切りで保存する
 * （dokusyaso_bunrui ⇔ profession / nogyosya_bunrui ⇔ products が 1:1）。
 * 日本語ラベルは画面表示専用で DB には入れない — 顧客要件 2026-07。
 * 旧データ（ラベル保存）はマイグレーション
 * `1784100000000-NormalizeDokusyaBunruiCodes` でコードへ変換済み。
 *
 * FE 側のミラーは `apps/frontend/src/constants/dokusya-bunrui.ts`
 * （選択肢の並び・ラベルもそちらに定義）。
 */

/** 購読者層分類 — 0農業者 / 1JAグループ役職員 / 2企業・団体 / 3学生 / 999その他。 */
export const DOKUSYASO_BUNRUI_CODES = ['0', '1', '2', '3', '999'] as const;
export type DokusyaSoBunruiCode = (typeof DOKUSYASO_BUNRUI_CODES)[number];

/** 農業者分類 — 0米 / 1野菜 / 2果実 / 3花 / 4畜産 / 5酪農 / 999その他。 */
export const NOGYOSYA_BUNRUI_CODES = ['0', '1', '2', '3', '4', '5', '999'] as const;
export type NogyosyaBunruiCode = (typeof NOGYOSYA_BUNRUI_CODES)[number];

/** 購読者層分類「農業者」— 主な生産物(農業者分類) を表示・送信する条件。 */
export const DOKUSYASO_BUNRUI_NOGYOSYA = '0';

const DOKUSYASO_SET: ReadonlySet<string> = new Set(DOKUSYASO_BUNRUI_CODES);
const NOGYOSYA_SET: ReadonlySet<string> = new Set(NOGYOSYA_BUNRUI_CODES);

/** `0` / `0,3` のようなコード CSV だけを許す正規表現を組み立てる。 */
function csvPattern(codes: readonly string[]): RegExp {
  const alt = `(?:${codes.join('|')})`;
  return new RegExp(`^${alt}(?:,${alt})*$`);
}

/** DTO `@Matches` 用 — 購読者層分類 CSV（空文字は blankToUndef で除外済み前提）。 */
export const DOKUSYASO_BUNRUI_CSV_RE = csvPattern(DOKUSYASO_BUNRUI_CODES);

/** DTO `@Matches` 用 — 農業者分類 CSV。 */
export const NOGYOSYA_BUNRUI_CSV_RE = csvPattern(NOGYOSYA_BUNRUI_CODES);

/** 不正コード時のメッセージ（FE `useApiForm` が `<a-form-item :help>` に表示）。 */
export const DOKUSYASO_BUNRUI_INVALID_MSG =
  '購読者層分類の値が不正です。（0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他）';

/** 不正コード時のメッセージ（農業者分類）。 */
export const NOGYOSYA_BUNRUI_INVALID_MSG =
  '農業者分類の値が不正です。（0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他）';

/** CSV 文字列をトークン配列へ（空要素は除去）。 */
export function splitBunruiCsv(csv: string | null | undefined): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** 購読者層分類 CSV の全トークンが定義済みコードか。空文字は true（任意項目）。 */
export function isValidDokusyaSoBunruiCsv(csv: string | null | undefined): boolean {
  return splitBunruiCsv(csv).every((c) => DOKUSYASO_SET.has(c));
}

/** 農業者分類 CSV の全トークンが定義済みコードか。空文字は true（任意項目）。 */
export function isValidNogyosyaBunruiCsv(csv: string | null | undefined): boolean {
  return splitBunruiCsv(csv).every((c) => NOGYOSYA_SET.has(c));
}
