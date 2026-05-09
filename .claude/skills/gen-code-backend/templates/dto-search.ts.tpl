// Screen: __SCREEN_ID__ — __SCREEN__
//
// Search DTO for list endpoints — extends PaginationDto (page, per_page,
// sort_by, sort_order) and adds screen-specific filter fields.
// Only emit this file when the screen has a list/search endpoint.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class Search__ENTITY__Dto extends PaginationDto {
  // TODO(/gen-code-backend): add real search fields from api.md §2.

  // @ApiPropertyOptional({ description: 'コード検索', example: 'A001' })
  // @IsOptional()
  // @IsString()
  // @MaxLength(20)
  // xxx_code?: string;
}
