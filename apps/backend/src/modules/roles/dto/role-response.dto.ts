import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** SCR-027 ロール管理画面 一覧の形状（API-027-001）。 */
export class RoleListItemDto {
  @ApiProperty() role_id: number;
  @ApiProperty() role_code: string;
  @ApiProperty() role_name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
}

/** 一覧応答ラッパ（ページングなし — ロールは1ページに収まる）。 */
export class RoleListResponseDto {
  @ApiProperty({ type: [RoleListItemDto] })
  data: RoleListItemDto[];
}

/** 詳細形状（API-027-002）— permission_ids + timestamp を追加。 */
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

/** 詳細 endpoint の envelope。 */
export class RoleDetailEnvelopeDto {
  @ApiProperty({ type: RoleDetailResponseDto })
  data: RoleDetailResponseDto;
}

/** SCR-027 権限グリッドの形状（API-027-004）。 */
export class PermissionListItemDto {
  @ApiProperty() permission_id: number;
  @ApiProperty() permission_code: string;
  @ApiProperty() permission_name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

/** 権限一覧応答ラッパ。 */
export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionListItemDto] })
  data: PermissionListItemDto[];
}

/** SCR-024/SCR-025 admin 画面向けスリム dropdown 行（API-COMMON-002, 認証のみ）。 */
export class RoleDropdownItemDto {
  @ApiProperty() role_id: number;
  @ApiProperty() role_code: string;
  @ApiProperty() role_name: string;
}

export class RoleDropdownResponseDto {
  @ApiProperty({ type: [RoleDropdownItemDto] })
  data: RoleDropdownItemDto[];
}

/** 更新成功 envelope（PUT /:role_id）。 */
export class RoleMutationResponseDto {
  @ApiProperty({ type: RoleDetailResponseDto })
  data: RoleDetailResponseDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 更新しました。',
    example: '更新しました。',
  })
  message: string;
}
