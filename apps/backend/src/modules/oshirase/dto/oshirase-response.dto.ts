import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

import { LoginOshiraseItemDto } from './login-oshirase-query.dto';

/**
 * SCR-031 admin list row — mirrors `OshiraseListItem` in oshirase.mapper.ts.
 */
export class OshiraseListItemDto {
  @ApiProperty() oshirase_id: number;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Resolved from m_ja via BE leftJoin. null when ja_id is null OR the referenced JA was hard-deleted.',
  })
  ja_name: string | null;

  // [no-labels-policy] Authenticated endpoint — code values only; the FE
  // resolves labels via useCodesStore().label(...). No `*_label` fields.
  @ApiProperty() oshirase_type: number;
  @ApiProperty() publish_location: number;
  @ApiProperty() status: number;
  @ApiProperty() title: string;
  @ApiProperty({ description: 'YYYY/MM/DD HH:mm (JST)' }) publish_start_date: string;
  @ApiPropertyOptional({ nullable: true }) publish_end_date: string | null;

  @ApiPropertyOptional({
    description:
      'Comma-separated 1〜5 role codes; empty string = 全管理者 (all).',
  })
  target_kanri_kubun?: string;

  @ApiProperty({ description: 'ISO 8601 (TIMESTAMPTZ)' }) created_at: string;
  @ApiProperty({ description: 'ISO 8601 (TIMESTAMPTZ)' }) updated_at: string;
}

/** Detail adds `content` (markdown / rich text body). */
export class OshiraseDetailDto extends OshiraseListItemDto {
  @ApiProperty() content: string;
}

export class OshiraseListResponseDto {
  @ApiProperty({ type: [OshiraseListItemDto] })
  data: OshiraseListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class OshiraseDetailEnvelopeDto {
  @ApiProperty({ type: OshiraseDetailDto })
  data: OshiraseDetailDto;
}

export class OshiraseMutationResponseDto {
  @ApiProperty({ type: OshiraseDetailDto })
  data: OshiraseDetailDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

/** GET /api/v1/oshirase/login — public, no auth, flat array. */
export class LoginOshiraseListResponseDto {
  @ApiProperty({ type: [LoginOshiraseItemDto] })
  data: LoginOshiraseItemDto[];
}

/**
 * SCR-010 menu item — subset shown on the dashboard. Defined inline
 * (mirrors `MenuOshiraseItem` in oshirase.service.ts).
 */
export class MenuOshiraseItemDto {
  @ApiProperty() oshirase_id: number;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  // [no-labels-policy] Authenticated — code value only; FE resolves label.
  @ApiProperty() oshirase_type: number;
  @ApiProperty() publish_start_date: string;
  @ApiPropertyOptional({ nullable: true }) publish_end_date: string | null;
  @ApiProperty({ description: 'True when first seen within the last N days.' })
  is_new: boolean;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;
}

export class MenuOshiraseListPayloadDto {
  @ApiProperty({ type: [MenuOshiraseItemDto] })
  oshirase_list: MenuOshiraseItemDto[];

  @ApiPropertyOptional({
    type: MenuOshiraseItemDto,
    nullable: true,
    description: 'Pinned 締め切り時間 (deadline) notice or null.',
  })
  deadline_notice: MenuOshiraseItemDto | null;
}

export class MenuOshiraseListResponseDto {
  @ApiProperty({ type: MenuOshiraseListPayloadDto })
  data: MenuOshiraseListPayloadDto;
}
