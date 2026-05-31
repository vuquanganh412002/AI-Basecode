import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string DTO for `GET /api/v1/account/dropdown` (ACSMS-API-COMMON-005).
 *
 * Extends {@link BaseDropdownQueryDto} (q/page/per_page/include_id) and
 * adds the `match_field` toggle so the FE common dropdown primitives
 * are uniform with JaDropdownQueryDto:
 *
 *   - `q` (default): match `login_id OR account_name` ILIKE.
 *   - `match_field='name'`: scope to `account_name` only — used by
 *     SCR-030 log view whose field label is just ユーザ名 and would
 *     surface confusing hits via login_id substring otherwise.
 *
 * DataScope (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN narrowing) lives
 * in the service — no query knob.
 */
export class AccountDropdownQueryDto extends BaseDropdownQueryDto {
  // [match-field] Opt-in name-only search for callers that present the
  // field as "ユーザ名" (SCR-030 log view). Default 'both' preserves
  // login_id OR account_name behavior so existing call sites are
  // unaffected. Unknown values rejected to fail-fast on typos.
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
