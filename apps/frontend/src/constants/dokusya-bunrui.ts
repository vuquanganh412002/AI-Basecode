/**
 * 読者属性 (dokusyaso_bunrui) / 主な生産物 (nogyosya_bunrui) の CSV 取り扱い。
 *
 * **コード値もラベルもここでは定義しない。**
 *   - コード値 … `@/constants/enums` の `DokusyasoBunrui` / `NogyosyaBunrui`
 *     （BE `apps/backend/src/common/enums/` のミラー。`enum-sync.spec.ts` が監視）
 *   - ラベル・選択肢 … `useCodesStore()` 経由の `m_code`
 *     （`DOKUSYASO_BUNRUI` / `NOGYOSYA_BUNRUI`）
 *
 * 以前はここに `*_LABELS` / `*_OPTIONS` を持っていた。当時は「値の集合が電子版
 * API 仕様で固定で、顧客が DB から増やす類ではない」ため m_code を使わない判断
 * だったが、顧客DB設計 2026-08 で両分類が m_code に入ったので前提が変わった。
 * ラベルは顧客が DB から変更できるため、コード側に焼き込むと画面と DB がズレる
 * （`.claude/rules/vue.md §Code Master`）。
 *
 * このファイルに残るのは CSV 固有の処理だけ。両列は `VARCHAR(50)` にカンマ区切り
 * で入るが enum と m_code は数値を返すので、突き合わせるときは `String()` に
 * 寄せる（`TANKA_TYPE` の `:value="String(opt.value)"` と同じ境界処理）。
 */
import { DokusyasoBunrui, NogyosyaBunrui } from '@/constants/enums';

/** 読者属性「農業者」— 主な生産物(農業者分類) を表示・送信する条件。 */
export const DOKUSYASO_BUNRUI_NOGYOSYA = String(DokusyasoBunrui.NOGYOSYA);

/** CSV 文字列をトークン配列へ（空要素は除去）。 */
export function splitBunruiCsv(csv: string | null | undefined): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── 従属項目のゲート ────────────────────────────────────────────────
//
// 顧客DB設計 2026-08 の 4 項目は、親の分類が特定コードを含むときだけ入力できる。
// BE `apps/backend/src/common/constants/dokusya-bunrui.constant.ts` の同名関数と
// 対で保つこと — 画面はここで入力欄の出し分けとクリアを行い、BE は保存時に同じ
// ゲートで落とす。ズレると「画面で入力できたのに保存されない」形になる。
//
// このゲートは電子版 API の条件付き項目（profession_and_ja / profession_and_agri /
// others_profession / others_products）の受理条件そのもの。満たさない値を送ると
// V26〜V30 で create/update ごと失敗するため、UI 側の親切機能ではなく契約の一部。

/** CSV に指定コードが含まれるか。 */
function bunruiCsvHas(csv: string | null | undefined, code: string): boolean {
  return splitBunruiCsv(csv).includes(code);
}

/** 「かつJAグループ役職員」チェックを出すか（読者属性＝農業者）。 */
export function allowsJaYakushokuinFlg(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, DOKUSYASO_BUNRUI_NOGYOSYA);
}

/** 「農業関係」チェックを出すか（読者属性＝企業・団体）。 */
export function allowsNogyoKankeiFlg(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, String(DokusyasoBunrui.KIGYO_DANTAI));
}

/** 読者属性その他の自由記述欄を出すか（読者属性＝その他）。 */
export function allowsDokusyasoBunruiSonota(
  dokusyasoBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(dokusyasoBunrui, String(DokusyasoBunrui.SONOTA));
}

/** 主な生産物その他の自由記述欄を出すか（主な生産物に「その他」を含む）。 */
export function allowsNogyosyaBunruiSonota(
  nogyosyaBunrui: string | null | undefined,
): boolean {
  return bunruiCsvHas(nogyosyaBunrui, String(NogyosyaBunrui.SONOTA));
}

/**
 * CSV コード列 → 「農業者、学生」形式のラベル列（一覧・履歴の表示用）。
 *
 * `resolve` には `useCodesStore().label` を部分適用して渡す。ラベルを引けない
 * コードはそのまま残す（電子版側の新コードを取りこぼさないため）。
 */
export function bunruiCsvToLabel(
  csv: string | null | undefined,
  resolve: (code: string) => string,
): string {
  return splitBunruiCsv(csv)
    .map((c) => resolve(c) || c)
    .join('、');
}
