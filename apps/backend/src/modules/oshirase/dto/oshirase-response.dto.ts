import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

import { LoginOshiraseItemDto } from './login-oshirase-query.dto';

/** SCR-031 管理一覧行 — oshirase.mapper.ts の `OshiraseListItem` と一致。 */
export class OshiraseListItemDto {
  @ApiProperty() oshirase_id: number;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Resolved from m_ja via BE leftJoin. null when ja_id is null OR the referenced JA was hard-deleted.',
  })
  ja_name: string | null;

  // [no-labels-policy] 認証エンドポイントはコード値のみ返す。ラベルは FE が
  // useCodesStore().label(...) で解決（`*_label` フィールドなし）。
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

/** Detail は `content`（本文）を追加。 */
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

/** GET /api/v1/oshirase/login — 公開・未認証・フラット配列。 */
export class LoginOshiraseListResponseDto {
  @ApiProperty({ type: [LoginOshiraseItemDto] })
  data: LoginOshiraseItemDto[];
}

/**
 * SCR-010 メニュー項目 — ダッシュボード表示用サブセット
 * （oshirase.service.ts の `MenuOshiraseItem` と一致）。
 */
export class MenuOshiraseItemDto {
  @ApiProperty() oshirase_id: number;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  // [no-labels-policy] 認証エンドポイント — コード値のみ。ラベルは FE が解決。
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
