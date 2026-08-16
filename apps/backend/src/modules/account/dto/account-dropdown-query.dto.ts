import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * `GET /api/v1/account/dropdown` のクエリ DTO（ACSMS-API-COMMON-005）。
 * {@link BaseDropdownQueryDto}（q/page/per_page/include_id）を継承し、FE 共通
 * dropdown を JaDropdownQueryDto と揃えるため `match_field` を追加:
 *   - `q`（既定）: `login_id OR account_name` を ILIKE。
 *   - `match_field='name'`: `account_name` のみ — 項目名が ユーザ名 の ACSMS-SCR-030
 *     ログ画面用（login_id 部分一致だと紛らわしいヒットになるため）。
 * DataScope（CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN の絞込）は service 側でクエリ knob なし。
 */
export class AccountDropdownQueryDto extends BaseDropdownQueryDto {
  // [match-field] 項目を「ユーザ名」で見せる呼出（ACSMS-SCR-030 ログ画面）向けの名前のみ
  // 検索オプトイン。既定 'both' は login_id OR account_name を維持し既存呼出に無影響。
  // 未知値は typo を fail-fast で拒否。
  @ApiPropertyOptional({
    description:
      '検索対象フィールド。"both"=login_id OR account_name (既定)、"name"=account_nameのみ。',
    enum: ['both', 'name'],
    default: 'both',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(['both', 'name'], {
    message: 'match_fieldは"both"または"name"で指定してください。',
  })
  match_field?: 'both' | 'name';
}
