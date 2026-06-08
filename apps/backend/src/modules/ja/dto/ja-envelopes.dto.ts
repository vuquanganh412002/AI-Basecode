import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DropdownMetaDto, PaginationMetaDto } from '@/common/dto/responses.dto';

import { JaResponseDto } from './ja-response.dto';

/**
 * Slim row shape returned by the list endpoint — service projects only
 * the columns the table displays. Matches the `Pick<JaResponseDto, ...>`
 * union in JaService.findAll().
 */
export class JaListItemDto {
  @ApiProperty() ja_id: number;
  @ApiProperty() ja_code: string;
  @ApiProperty() ja_name: string;
  @ApiProperty() yubin_no: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() todofuken_name: string;
  @ApiProperty() tel: string;
  @ApiProperty() address: string;
  @ApiProperty() fax: string;
  @ApiProperty() chuokai_flg: boolean;
}

export class JaListResponseDto {
  @ApiProperty({ type: [JaListItemDto] })
  data: JaListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * Slim row shape for GET /api/v1/ja/dropdown.
 * Returns only the columns dropdowns need (id + code + name + scope).
 */
export class JaDropdownItemDto {
  @ApiProperty() ja_id: number;
  @ApiProperty() ja_code: string;
  @ApiProperty() ja_name: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() chuokai_flg: boolean;
}

export class JaDropdownResponseDto {
  @ApiProperty({ type: [JaDropdownItemDto] })
  data: JaDropdownItemDto[];

  @ApiProperty({ type: DropdownMetaDto })
  meta: DropdownMetaDto;
}

/** Single-resource envelope (GET /:id). */
export class JaDetailEnvelopeDto {
  @ApiProperty({ type: JaResponseDto })
  data: JaResponseDto;
}

/** Mutation success envelope (POST + PUT). */
export class JaMutationResponseDto {
  @ApiProperty({ type: JaResponseDto })
  data: JaResponseDto;

  @ApiPropertyOptional({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message?: string;
}
