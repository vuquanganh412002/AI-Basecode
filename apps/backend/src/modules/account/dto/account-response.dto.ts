import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  DropdownMetaDto,
  PaginationMetaDto,
} from '@/common/dto/responses.dto';

/**
 * 一覧行の形状（ACSMS-SCR-024）。accounts.mapper.ts の `AccountListItem` をミラー。
 * null 許容は DB スキーマ準拠（役職により todofuken/ja/kanri_shiten が null）。
 */
export class AccountListItemDto {
  @ApiProperty() account_id: number;
  @ApiProperty() login_id: string;
  @ApiProperty() account_name: string;
  @ApiProperty() role_id: number;
  @ApiProperty() role_name: string;
  @ApiPropertyOptional({ nullable: true }) todofuken_code: string | null;
  @ApiPropertyOptional({ nullable: true }) todofuken_name: string | null;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;
  @ApiPropertyOptional({ nullable: true }) ja_name: string | null;
  @ApiPropertyOptional({ nullable: true }) kanri_shiten_id: number | null;
  @ApiPropertyOptional({ nullable: true }) kanri_shiten_name: string | null;
  @ApiPropertyOptional({ nullable: true }) shiten_id: number | null;
  @ApiPropertyOptional({ nullable: true }) shiten_name: string | null;
  @ApiProperty() email: string;
  @ApiProperty() sub_email_1: string;
  @ApiProperty() sub_email_2: string;
  @ApiProperty() sub_email_3: string;
  @ApiProperty() paper_flg: boolean;
  @ApiProperty() denshi_flg: boolean;

  @ApiProperty({
    description:
      'True when login attempts hit the lock threshold — admin can clear it from SCR-025.',
  })
  account_lock_flg: boolean;

  @ApiProperty() created_at: string;
  @ApiPropertyOptional({ nullable: true }) updated_at: string | null;
}

export class AccountListResponseDto {
  @ApiProperty({ type: [AccountListItemDto] })
  data: AccountListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** 詳細行（ACSMS-SCR-025）。`biko` を追加、他は一覧形状をミラー。 */
export class AccountDetailDto extends AccountListItemDto {
  @ApiProperty() biko: string;
}

export class AccountDetailEnvelopeDto {
  @ApiProperty({ type: AccountDetailDto })
  data: AccountDetailDto;
}

export class AccountMutationResponseDto {
  @ApiProperty({ type: AccountDetailDto })
  data: AccountDetailDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

/** スリム dropdown 行（COMMON-005）。 */
export class AccountDropdownItemDto {
  @ApiProperty() account_id: number;
  @ApiProperty() login_id: string;
  @ApiProperty() account_name: string;
  @ApiProperty() role_code: string;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;
}

export class AccountDropdownResponseDto {
  @ApiProperty({ type: [AccountDropdownItemDto] })
  data: AccountDropdownItemDto[];

  @ApiProperty({ type: DropdownMetaDto })
  meta: DropdownMetaDto;
}

/** 自己 MFA トグル応答（PATCH /account/me/mfa）。 */
export class ToggleMfaResultDto {
  @ApiProperty() mfa_enable_flg: boolean;
  @ApiProperty({ description: 'Japanese literal confirming the new state.' })
  message: string;
}

export class ToggleMfaResponseDto {
  @ApiProperty({ type: ToggleMfaResultDto })
  data: ToggleMfaResultDto;
}
