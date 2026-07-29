import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';
import { ExportLogDto } from './export-log.dto';

/** ソート可能カラムの許可リスト（api.md §4.1）。 */
export const LOG_SEARCH_SORT_BY = [
  'log_datetime',
  'log_type',
  'result_status',
] as const;
export type LogSearchSortBy = (typeof LOG_SEARCH_SORT_BY)[number];

/**
 * GET /api/v1/log (ACSMS-API-030-001) の Query DTO。
 *
 * `IntersectionType`（@nestjs/swagger 標準パターン — 両 base の
 * @ApiProperty + class-validator デコレータを保持）で2つを合成:
 *   - {@link ExportLogDto}  — GET /api/v1/log/export と共有する4フィルタ
 *     （date_from / date_to / log_type / account_id）。
 *   - {@link PaginationDto} — page / per_page（日本語エラー、既定20/max100）。
 *
 * sort_by / sort_order は非共有（エンドポイント毎にカラム許可リストが異なる）
 * のため log 固有の `LOG_SEARCH_SORT_BY` enum とともにローカル定義。
 * 全フィールド任意（api.md §2 に必須カラムなし）。
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
