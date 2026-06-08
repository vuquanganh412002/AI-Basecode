/**
 * Shared Swagger response DTOs.
 *
 * These exist as `class` declarations (not interfaces) so
 * `@nestjs/swagger`'s reflection can introspect their shape and Orval
 * can emit proper TypeScript types in the FE client. Plain interfaces
 * (e.g. `PageMeta` in `common/utils/paginate.ts`) are invisible to
 * Swagger.
 *
 * Project response conventions enforced here:
 *   - List endpoints: `{ data: T[], meta: PaginationMetaDto }` —
 *     see `.claude/rules/nestjs.md §Response Format`.
 *   - Dropdown endpoints: `{ data: T[], meta: DropdownMetaDto }` —
 *     uses `has_more` (cursor-style) instead of `total_pages` so
 *     infinite-scroll callers don't have to derive it.
 *   - Mutation success: `{ message: string }` via SuccessMessageDto —
 *     verb-only literal (`'登録しました。'` / `'更新しました。'` /
 *     `'削除しました。'`) per the BE message convention.
 *
 * Per-resource list responses are concrete subclasses (e.g.
 * `TankaListResponseDto extends PaginatedResponseDto<TankaResponseDto>`)
 * — Swagger does not introspect generics, so each resource declares
 * its own list response class with `data: ConcreteItemDto[]`.
 */
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total matching rows across all pages.' })
  total: number;

  @ApiProperty({ description: '1-indexed current page.' })
  page: number;

  @ApiProperty({ description: 'Rows per page (capped by per_page query param).' })
  per_page: number;

  @ApiProperty({ description: '`Math.ceil(total / per_page)`; 0 when per_page <= 0.' })
  total_pages: number;
}

export class DropdownMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() per_page: number;

  @ApiProperty({
    description: 'true when more pages are available (drives infinite scroll).',
  })
  has_more: boolean;
}

export class SuccessMessageDto {
  @ApiProperty({
    description:
      'Verb-only Japanese literal — 登録しました。 / 更新しました。 / 削除しました。 etc. ' +
      'Per `.claude/rules/nestjs.md §BE message convention`.',
    example: '登録しました。',
  })
  message: string;
}
