import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  DropdownMetaDto,
  PaginationMetaDto,
} from '@/common/dto/responses.dto';

/**
 * List row shape (SCR-024). Mirrors `AccountListItem` in accounts.mapper.ts.
 * Nullability follows DB schema (todofuken/ja/kanri_shiten nullable per role).
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

/** Detail row (SCR-025). Adds `biko`; everything else mirrors list shape. */
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

/** Slim dropdown row (COMMON-005). */
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

/** Self-service MFA toggle response (PATCH /account/me/mfa). */
export class ToggleMfaResultDto {
  @ApiProperty() mfa_enable_flg: boolean;
  @ApiProperty({ description: 'Japanese literal confirming the new state.' })
  message: string;
}

export class ToggleMfaResponseDto {
  @ApiProperty({ type: ToggleMfaResultDto })
  data: ToggleMfaResultDto;
}
