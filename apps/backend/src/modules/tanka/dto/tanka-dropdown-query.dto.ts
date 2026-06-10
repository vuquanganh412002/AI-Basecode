import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

/**
 * Query DTO for `GET /api/v1/tanka/dropdown`.
 *
 * Powers the 配達手数料単価 dropdown on the hanbaiten create form
 * (SCR-017 + the SCR-018 daiko 代行入力 flow). Returns slim
 * (tanka_id, tanka_code, tanka_name, kingaku_zeikomi) rows.
 *
 * Inherits the shared search/paging shape from {@link BaseDropdownQueryDto}
 * (`q` matches `tanka_name` ILIKE only — `tanka_code` is hidden in the
 * UI so searching it would surface invisible hits) and adds tanka-
 * specific filters:
 *
 *   - `tanka_type` lets the caller scope to a single category
 *     (e.g. `2` = 配達手数料).
 *   - `ja_id` is the explicit-JA path for NICHINO_STAFF (代行入力).
 *     For other roles DataScope (session-bound JA) takes effect and
 *     this param is ignored.
 *   - `include_id` (from base) is the edit-form escape hatch.
 */
export class TankaDropdownQueryDto extends BaseDropdownQueryDto {
  @ApiPropertyOptional({
    description: '単価種類でフィルタ (m_code.code_category=TANKA_TYPE)。例: 2=配達手数料',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'tanka_typeは整数で指定してください。' })
  @Min(1, { message: 'tanka_typeは1以上で指定してください。' })
  tanka_type?: number;

  @ApiPropertyOptional({
    description:
      'JA絞り込み (NICHINO_STAFF 代行入力 専用)。指定されない場合 DataScope が適用される。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ja_idは整数で指定してください。' })
  @Min(1, { message: 'ja_idは1以上で指定してください。' })
  ja_id?: number;
}
