/**
 * Pagination shape for list endpoints — frozen project convention
 * (see `.claude/rules/nestjs.md` Response Format).
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

/**
 * Build the standard `{ data, meta }` response for paginated list
 * endpoints. Use whenever a service returns a page of rows so all
 * list endpoints stay structurally identical (FE Orval client + every
 * `useTableQuery` consumer rely on this exact shape).
 *
 *   return paginate(rows, total, page, per_page);
 *
 * `total_pages` is derived; clamps to 0 when `per_page` is 0 or
 * negative so a malformed query never throws on division.
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      per_page,
      total_pages: per_page > 0 ? Math.ceil(total / per_page) : 0,
    },
  };
}
