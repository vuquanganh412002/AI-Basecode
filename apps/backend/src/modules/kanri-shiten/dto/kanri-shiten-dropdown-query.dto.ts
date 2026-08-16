import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * GET /api/v1/kanri-shiten/dropdown (ACSMS-API-COMMON-004) クエリ DTO。
 * ja_id 必須 — BE は此の JA のみで m_kanri_shiten を絞る。検索 (q) / ページング
 * (page・per_page) / 編集ピン (include_id) は任意。ページングは opt-in（page 未指定なら
 * 全件・has_more=false）で既存呼び出し元と後方互換。
 * Spec: docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004.
 */
export class KanriShitenDropdownQueryDto {
  @ApiProperty({ description: 'JA ID（カスケード元）', example: 13 })
  @Type(() => Number)
  @IsInt({ message: 'ja_idは整数で指定してください。' })
  @Min(1, { message: 'ja_idは1以上で指定してください。' })
  ja_id!: number;

  @ApiPropertyOptional({ description: '部分一致検索（管理支店コード OR 名称）' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: '検索対象。name=名称のみ / both=コードOR名称（既定）', enum: ['both', 'name'] })
  @IsOptional()
  @IsIn(['both', 'name'])
  match_field?: 'both' | 'name';

  @ApiPropertyOptional({ description: 'ページ番号（1始まり）。未指定なら全件', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '1ページ件数（1〜100）。未指定時50', example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ description: '編集時の選択中ID（ページ1に強制包含）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  include_id?: number;
}

/** dropdown 応答の 1 行。 */
export class KanriShitenDropdownItemDto {
  @ApiProperty() kanri_shiten_id!: number;
  @ApiProperty() kanri_shiten_code!: string;
  @ApiProperty() kanri_shiten_name!: string;
  // 顧客要件2026-07: ACSMS-SCR-011 で購読種別（紙版/電子版）に応じ管理支店ドロップダウンを
  // 絞り込むためのフラグ（m_kanri_shiten.paper_flg/denshi_flg）。
  @ApiProperty({ description: '紙版取扱フラグ' }) paper_flg!: boolean;
  @ApiProperty({ description: '電子版取扱フラグ' }) denshi_flg!: boolean;
}
