/**
 * 購読者層分類 (`t_dokusya.dokusyaso_bunrui`) / 農業者分類
 * (`t_dokusya.nogyosya_bunrui`) の CSV 取り扱いユーティリティ。
 *
 * **コード値そのものはここで定義しない。** 唯一の出所は Group-A enum
 * (`@/common/enums` の `DokusyasoBunrui` / `NogyosyaBunrui`)、日本語ラベルの
 * 唯一の出所は `m_code`（`DOKUSYASO_BUNRUI` / `NOGYOSYA_BUNRUI`）。
 * このファイルは enum の値を CSV 検証用の形へ写すだけ。
 *
 * 列が `VARCHAR(50)` の CSV なのが他カテゴリとの違い。enum と m_code は数値を
 * 返すので、ここで `String()` に寄せてから突き合わせる（`TANKA_TYPE` の
 * `:value="String(opt.value)"` と同じ境界処理）。
 *
 * DB には電子版システムと同じコード値を保存する
 * （dokusyaso_bunrui ⇔ profession / nogyosya_bunrui ⇔ products が 1:1）。
 * 日本語ラベルは画面表示専用で DB には入れない — 顧客要件 2026-07。
 */
import { DokusyasoBunrui, NogyosyaBunrui } from '@/common/enums';

/** 購読者層分類のコード値（enum 由来。CSV 比較用に文字列化）。 */
export const DOKUSYASO_BUNRUI_CODES: readonly string[] =
  Object.values(DokusyasoBunrui).map(String);

/** 農業者分類のコード値（enum 由来。CSV 比較用に文字列化）。 */
export const NOGYOSYA_BUNRUI_CODES: readonly string[] =
  Object.values(NogyosyaBunrui).map(String);

/** 購読者層分類「農業者」— 主な生産物(農業者分類) を表示・送信する条件。 */
export const DOKUSYASO_BUNRUI_NOGYOSYA = String(DokusyasoBunrui.NOGYOSYA);

/** 購読者層分類「企業・団体」— 農業関係フラグを表示・送信する条件。 */
export const DOKUSYASO_BUNRUI_KIGYO_DANTAI = String(
  DokusyasoBunrui.KIGYO_DANTAI,
);

/** 購読者層分類「その他」— 自由記述欄を表示・送信する条件。 */
export const DOKUSYASO_BUNRUI_SONOTA = String(DokusyasoBunrui.SONOTA);

/** 農業者分類「その他」— 自由記述欄を表示・送信する条件。 */
export const NOGYOSYA_BUNRUI_SONOTA = String(NogyosyaBunrui.SONOTA);

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

/**
 * 不正コード時のメッセージ。
 *
 * 以前はここに「0:農業者 1:JAグループ役職員 …」と日本語ラベルを並べていたが、
 * ラベルは `m_code` で顧客が実行時に変更できるため、コード側に焼き込むと
 * DB の表示名とズレる。値の一覧は画面のプルダウン（m_code 由来）で見えるので
 * メッセージからは落とす。
 */
export const DOKUSYASO_BUNRUI_INVALID_MSG = '購読者層分類の値が不正です。';

/** 不正コード時のメッセージ（農業者分類）。 */
export const NOGYOSYA_BUNRUI_INVALID_MSG = '農業者分類の値が不正です。';

/** CSV 文字列をトークン配列へ（空要素は除去）。 */
export function splitBunruiCsv(csv: string | null | undefined): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** 購読者層分類 CSV の全トークンが定義済みコードか。空文字は true（任意項目）。 */
export function isValidDokusyaSoBunruiCsv(
  csv: string | null | undefined,
): boolean {
  return splitBunruiCsv(csv).every((c) => DOKUSYASO_SET.has(c));
}

/** 農業者分類 CSV の全トークンが定義済みコードか。空文字は true（任意項目）。 */
export function isValidNogyosyaBunruiCsv(
  csv: string | null | undefined,
): boolean {
  return splitBunruiCsv(csv).every((c) => NOGYOSYA_SET.has(c));
}

// ─── 従属項目のゲート ────────────────────────────────────────────────
//
// 顧客DB設計 2026-08 で追加された 4 項目（ja_yakushokuin_flg /
// nogyo_kankei_flg / dokusyaso_bunrui_sonota / nogyosya_bunrui_sonota）は、
// 親の分類が特定コードを含むときだけ値を持てる。列 COMMENT の
// 「〜の場合のみ設定可 / 入力可」がそのまま条件。
//
// 電子版 API 側も同じ条件を**エラーで**強制する（updateUserInfo の条件付き
// 項目。profession に該当コードが無いのに profession_and_ja 等を送ると
// V26〜V30 で create/update ごと弾かれる）。つまりこのゲートは画面の表示制御
// だけでなく push の成否に直結するので、判定はここ 1 箇所に集約して
// service（保存時のクリア）と denshiban-push.mapper（送信可否）で共有する。

/** CSV に指定コードが含まれるか。 */
function bunruiCsvHas(csv: string | null | undefined, code: string): boolean {
  return splitBunruiCsv(csv).includes(code);
}

/** かつJAグループ役職員フラグを持てるか（購読者層分類＝農業者）。 */
export function allowsJaYakushokuinFlg(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, DOKUSYASO_BUNRUI_NOGYOSYA);
}

/** 農業関係フラグを持てるか（購読者層分類＝企業・団体）。 */
export function allowsNogyoKankeiFlg(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, DOKUSYASO_BUNRUI_KIGYO_DANTAI);
}

/** 購読者層分類その他（自由記述）を持てるか（購読者層分類＝その他）。 */
export function allowsDokusyasoBunruiSonota(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, DOKUSYASO_BUNRUI_SONOTA);
}

/** 農業者分類その他（自由記述）を持てるか（農業者分類に「その他」を含む）。 */
export function allowsNogyosyaBunruiSonota(
  nogyosyaBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(nogyosyaBunrui, NOGYOSYA_BUNRUI_SONOTA);
}
