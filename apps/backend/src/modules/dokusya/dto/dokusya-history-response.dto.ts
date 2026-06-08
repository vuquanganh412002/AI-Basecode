import { ApiProperty } from '@nestjs/swagger';

/**
 * One row of `GET /api/v1/dokusya/:dokusya_id/history`
 * (ACSMS-API-011-006).
 *
 * The response carries the `tetsuzuki_shurui_label` resolved by
 * `CodeService.getLabel('TETSUZUKI_SHURUI', value)` — history is
 * intentionally an EXCEPTION to the "no `*_label` on authenticated
 * endpoints" rule (`.claude/rules/nestjs.md §m_code response
 * serialization`) because the history table renders the label as the
 * primary column (no FE m_code lookup needed in the time-line UI).
 */
export class DokusyaHistoryItemDto {
  @ApiProperty() dokusya_rireki_id: number;
  @ApiProperty() dokusya_id: number;
  @ApiProperty() rireki_no: number;
  @ApiProperty() tetsuzuki_shurui: number;
  @ApiProperty({
    description: 'm_code.code_name の解決済みラベル。',
  })
  tetsuzuki_shurui_label: string;
  @ApiProperty() henko_riyu: string;
  @ApiProperty() saishin_data_flg: boolean;
  @ApiProperty() shinki_flg: boolean;
  @ApiProperty() kaiyaku_flg: boolean;
  @ApiProperty() zougen_hokoku_flg: boolean;
  @ApiProperty({ nullable: true }) denshi_shonin_status: number | null;
  @ApiProperty() created_at: string;
  @ApiProperty() created_by: string;
}

/** Envelope DTO for the history endpoint. `{ data: [...] }`. */
export class DokusyaHistoryResponseDto {
  @ApiProperty({ type: [DokusyaHistoryItemDto] }) data: DokusyaHistoryItemDto[];
}
