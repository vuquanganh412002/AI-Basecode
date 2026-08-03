/**
 * リストエンドポイントのページング形状 — 固定のプロジェクト規約
 * （.claude/rules/nestjs.md Response Format 参照）。
 */
export interface PageMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

/** `per_page` の上限（`PaginationDto` 等の `@Max` と同値）。 */
export const PER_PAGE_MAX = 100;

/**
 * `per_page` を [1, PER_PAGE_MAX] にクランプする（未指定・非数値は `fallback`）。
 * DTO の `@Max(100)` を通らない経路（内部呼び出し・生クエリ）でも
 * 上限なし SELECT にならないための二重化。各 service が
 * `Math.max(1, Math.min(100, …))` を書き写していたのを集約したもの。
 */
export function clampPerPage(value: unknown, fallback = 20): number {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(PER_PAGE_MAX, n));
}

/**
 * ページング系リストエンドポイントの標準 `{ data, meta }` — 構造を完全に統一する
 * （FE クライアント + 全 `useTableQuery` がこの形状に依存）。
 *
 *   return paginate(rows, total, page, per_page);
 *
 * `per_page` <= 0 のとき `total_pages` は 0 にクランプし、不正クエリでもゼロ除算しない。
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
): PaginatedResponse<T>;
/**
 * 画面固有の集計を meta に足したい場合の形。第5引数のキーが `meta` へ合流する。
 * 全リストへ波及させたくない項目（例: 購読者検索の `total_busu`）はこちらを使い、
 * `{ data, meta: {...} }` を呼び出し側で組み立てない（規約: 形状は本ヘルパーに集約）。
 */
export function paginate<T, M extends object>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
  extraMeta: M,
): { data: T[]; meta: PageMeta & M };
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
  extraMeta?: object,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      per_page,
      total_pages: per_page > 0 ? Math.ceil(total / per_page) : 0,
      ...extraMeta,
    },
  };
}

/**
 * 無限スクロールドロップダウン用のカーソル式 meta: `total_pages` の代わりに
 * `has_more`（次ページの有無）を公開。FE `useEntityDropdown` がスクロール時に
 * ページングを続けるか判断するのに読む。
 */
export interface CursorPageMeta {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPageMeta;
}

/**
 * カーソル/無限スクロールドロップダウン用の `{ data, meta }`（JA / account /
 * tanka の `*Dropdown`）。`has_more = page * per_page < total` を集約。
 *
 *   return paginateCursor(rows, total, page, per_page);
 */
export function paginateCursor<T>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
): CursorPaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      per_page,
      has_more: page * per_page < total,
    },
  };
}
