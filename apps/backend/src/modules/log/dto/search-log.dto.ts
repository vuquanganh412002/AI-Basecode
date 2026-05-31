import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';
import { ExportLogDto } from './export-log.dto';

/** Whitelist of sortable columns per api.md §4.1. */
export const LOG_SEARCH_SORT_BY = [
  'log_datetime',
  'log_type',
  'result_status',
] as const;
export type LogSearchSortBy = (typeof LOG_SEARCH_SORT_BY)[number];

/**
 * Query DTO for `GET /api/v1/log` (ACSMS-API-030-001).
 *
 * Combines two mixins via `IntersectionType` (the canonical
 * `@nestjs/swagger` pattern — preserves @ApiProperty + class-validator
 * decorators from both bases):
 *
 *   - {@link ExportLogDto}  — the 4 filter fields shared with
 *     `GET /api/v1/log/export` (date_from / date_to / log_type /
 *     account_id).
 *   - {@link PaginationDto} — page / per_page with Japanese error
 *     messages (default 20 / max 100).
 *
 * `sort_by` + `sort_order` are NOT shared (each search endpoint has a
 * different column whitelist), so they stay local with the log-
 * specific `LOG_SEARCH_SORT_BY` enum.
 *
 * Every field is optional; api.md §2 lists no 必須 column.
 */
export class SearchLogDto extends IntersectionType(ExportLogDto, PaginationDto) {
  @ApiPropertyOptional({
    description: 'ソート対象',
    enum: LOG_SEARCH_SORT_BY,
    default: 'log_datetime',
  })
  @IsOptional()
  @IsIn(LOG_SEARCH_SORT_BY, {
    message: 'sort_byはlog_datetime / log_type / result_statusのいずれかで指定してください。',
  })
  sort_by?: LogSearchSortBy;

  @ApiPropertyOptional({
    description: 'ソート順',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_orderはasc / descのいずれかで指定してください。' })
  sort_order?: 'asc' | 'desc';
}
