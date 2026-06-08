import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

/**
 * Item shape for SCR-030 ログ参照画面 list (API-030-001).
 * Mirrors `LogListItem` in log.service.ts.
 */
export class LogListItemDto {
  @ApiProperty() log_id: number;
  // [no-labels-policy] Authenticated endpoint — code values only; FE resolves
  // log_type / result_status labels via useCodesStore().label(...).
  @ApiProperty({ description: '1=user_operation, 2=system, 3=error, 4=file_upload' })
  log_type: number;
  @ApiProperty({ description: 'ISO 8601 (TIMESTAMPTZ)' }) log_datetime: string;

  @ApiPropertyOptional({ nullable: true }) account_id: number | null;
  @ApiPropertyOptional({ nullable: true }) login_id: string | null;
  @ApiPropertyOptional({ nullable: true }) account_name: string | null;
  @ApiPropertyOptional({ nullable: true }) ja_id: number | null;

  @ApiProperty() gamen_name: string;
  @ApiProperty() operation: string;
  @ApiProperty({ description: '1=success, 2=failure, 3=warning' })
  result_status: number;

  @ApiPropertyOptional({ nullable: true }) target_id: number | null;
  @ApiProperty() target_table: string;

  @ApiProperty({ description: 'Serialized JSON snapshot of post-write state.' })
  after_value: string;

  @ApiProperty() ip_address: string;
}

export class LogListResponseDto {
  @ApiProperty({ type: [LogListItemDto] })
  data: LogListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
