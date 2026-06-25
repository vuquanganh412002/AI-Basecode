// 購読者名簿の「1文書ページ = A4 1枚」に収める明細行数。
//
// preview（Web）と Excel 出力で**ページ数を一致させる**ため、両者で同じ行数を使う。
// BE 側 EXCEL_ROWS_PER_PAGE（report.service.ts）と必ず同じ値にすること。
// 値は固定 15 行/ページ（販売店別・管理支店別とも）。A4 1枚に収まる目安で、
// 実際の印刷結果に合わせて両側（FE/BE）を揃えて調整する。
const MEIBO_ROWS_PER_PAGE = 15;

/** 帳票種別に関係なく A4 1枚に収める明細行数（preview/Excel 共通・15行）。 */
export function meiboRowsPerA4(_reportType: 'hanbaiten' | 'kanri_shiten'): number {
  return MEIBO_ROWS_PER_PAGE;
}
