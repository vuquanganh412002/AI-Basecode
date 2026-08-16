import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

/**
 * `GET /api/v1/tanka/dropdown` のクエリDTO。
 * hanbaiten 作成フォーム(ACSMS-SCR-017 + ACSMS-SCR-018 代行入力)の 配達手数料単価 ドロップダウン用。
 * slim 行 (tanka_id, tanka_code, tanka_name, kingaku_zeikomi) を返す。
 * {@link BaseDropdownQueryDto} 継承 (`q` は tanka_name ILIKE のみ — tanka_code は
 * UI 非表示で検索対象外)。追加フィルタ:
 *   - `tanka_type`: 単一カテゴリへ絞り込み (例 2=配達手数料)。
 *   - `ja_id`: NICHINO_STAFF 代行入力 の明示JA指定。他ロールは DataScope 適用で無視。
 *   - `include_id` (base): 編集フォームの escape hatch。
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
