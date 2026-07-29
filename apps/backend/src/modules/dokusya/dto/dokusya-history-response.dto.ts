import { ApiProperty } from '@nestjs/swagger';

/**
 * `GET /api/v1/dokusya/:dokusya_id/history` の1行（ACSMS-API-011-006）。
 *
 * レスポンスは `CodeService.getLabel('TETSUZUKI_SHURUI', value)` で解決した
 * `tetsuzuki_shurui_label` を持つ — 履歴は意図的に「認証エンドポイントに
 * `*_label` を持たない」ルール（`.claude/rules/nestjs.md §m_code response
 * serialization`）の例外。履歴テーブルがラベルを主列として描画するため
 * （タイムライン UI で FE の m_code 逆引きが不要）。
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
  @ApiProperty() saishin_data_flg: boolean;
  @ApiProperty() shinki_flg: boolean;
  @ApiProperty() kaiyaku_flg: boolean;
  @ApiProperty() zougen_hokoku_flg: boolean;
  @ApiProperty({ nullable: true }) denshi_shonin_status: number | null;
  @ApiProperty() created_at: string;
  @ApiProperty() created_by: string;
}

/** 履歴エンドポイント用のエンベロープ DTO。`{ data: [...] }`。 */
export class DokusyaHistoryResponseDto {
  @ApiProperty({ type: [DokusyaHistoryItemDto] }) data: DokusyaHistoryItemDto[];
}
