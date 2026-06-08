import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Item shape for SCR-027 ロール管理画面 list (API-027-001). */
export class RoleListItemDto {
  @ApiProperty() role_id: number;
  @ApiProperty() role_code: string;
  @ApiProperty() role_name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
}

/** List response wrapper (no pagination — roles fit in one page). */
export class RoleListResponseDto {
  @ApiProperty({ type: [RoleListItemDto] })
  data: RoleListItemDto[];
}

/** Detail shape (API-027-002) — adds permission_ids + timestamps. */
export class RoleDetailResponseDto extends RoleListItemDto {
  @ApiProperty({
    type: [Number],
    description: 'Active permission IDs sorted ascending.',
  })
  permission_ids: number[];

  @ApiPropertyOptional({ nullable: true, description: 'ISO 8601 or null' })
  created_at: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'ISO 8601 or null' })
  updated_at: string | null;
}

/** Detail endpoint envelope. */
export class RoleDetailEnvelopeDto {
  @ApiProperty({ type: RoleDetailResponseDto })
  data: RoleDetailResponseDto;
}

/** Item shape for SCR-027 permission grid (API-027-004). */
export class PermissionListItemDto {
  @ApiProperty() permission_id: number;
  @ApiProperty() permission_code: string;
  @ApiProperty() permission_name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

/** List response wrapper for permissions. */
export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionListItemDto] })
  data: PermissionListItemDto[];
}

/**
 * Slim dropdown row for SCR-024 / SCR-025 admin screens
 * (API-COMMON-002 — authenticated-only).
 */
export class RoleDropdownItemDto {
  @ApiProperty() role_id: number;
  @ApiProperty() role_code: string;
  @ApiProperty() role_name: string;
}

export class RoleDropdownResponseDto {
  @ApiProperty({ type: [RoleDropdownItemDto] })
  data: RoleDropdownItemDto[];
}

/** Mutation success envelope (PUT /:role_id). */
export class RoleMutationResponseDto {
  @ApiProperty({ type: RoleDetailResponseDto })
  data: RoleDetailResponseDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 更新しました。',
    example: '更新しました。',
  })
  message: string;
}
