import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Query DTO for `GET /api/v1/kanri-shiten/dropdown` (ACSMS-API-COMMON-004).
 * `ja_id` is required — the BE filters m_kanri_shiten by this JA only.
 * Spec: docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004.
 */
export class KanriShitenDropdownQueryDto {
  @ApiProperty({ description: 'JA ID（カスケード元）', example: 13 })
  @Type(() => Number)
  @IsInt({ message: 'ja_idは整数で指定してください。' })
  @Min(1, { message: 'ja_idは1以上で指定してください。' })
  ja_id!: number;
}

/** Single row in the dropdown response. */
export class KanriShitenDropdownItemDto {
  @ApiProperty() kanri_shiten_id!: number;
  @ApiProperty() kanri_shiten_code!: string;
  @ApiProperty() kanri_shiten_name!: string;
}
