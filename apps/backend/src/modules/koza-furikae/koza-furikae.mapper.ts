// Screen: ACSMS-SCR-020 — 口座振替データ出力画面（v1.1 プレビュー）
//
// 集計 raw 行（KozaFurikaeAggRow / snake_case SQL 別名）→ プレビュー一覧の
// レスポンス行（KozaPreviewRow）へ変換する純関数。DI / IO を持たず、service が
// オーケストレータ、mapper は純変換という分担（nestjs.md §mapper）。

import type { KozaFurikaeAggRow } from './koza-furikae.service';

/** プレビュー一覧の1行（API-020-003 §レスポンス）。FE の編集テーブルに1:1対応。 */
export interface KozaPreviewRow {
  dokusya_id: number;
  /** 預金者名（カナ）。 */
  koza_meigi: string;
  kanri_shiten_id: number | null;
  /** 引落支店コード / 名称（m_shiten）。 */
  bank_branch_code: string;
  bank_branch_name: string;
  /** 預金種目（1:普通, 2:当座, 9:その他）。 */
  hikiotoshi_yokin_shubetsu: number | null;
  /** 引落口座番号（表示用。監査ログ側は現行どおりマスク）。 */
  hikiotoshi_koza_no: string;
  /** 振替金額（集計初期値。FE で編集可）。 */
  furikae_kingaku: number;
}

/** raw 数値列（pg ドライバが string を返すことがある）を number へ。 */
function toNumberOrNull(v: number | string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** 集計1行 → プレビュー行。null/型を整形するだけ（副作用なし）。 */
export function toKozaPreviewRow(r: KozaFurikaeAggRow): KozaPreviewRow {
  return {
    dokusya_id: Number(r.dokusya_id),
    koza_meigi: r.hikiotoshi_koza_meigi ?? r.koza_meigi ?? '',
    kanri_shiten_id: toNumberOrNull(r.kanri_shiten_id),
    bank_branch_code: r.bank_branch_code ?? '',
    bank_branch_name: r.bank_branch_name ?? '',
    hikiotoshi_yokin_shubetsu: r.hikiotoshi_yokin_shubetsu ?? null,
    hikiotoshi_koza_no: r.hikiotoshi_koza_no ?? '',
    furikae_kingaku: r.furikae_kingaku == null ? 0 : Number(r.furikae_kingaku),
  };
}
