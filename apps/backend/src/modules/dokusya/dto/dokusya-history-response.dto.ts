import { ApiProperty } from '@nestjs/swagger';

/**
 * `GET /api/v1/dokusya/:dokusya_id/history` の1行（ACSMS-API-011-006）。
 *
 * コード値のみを返す（`.claude/rules/nestjs.md §m_code response serialization`）。
 * 以前は `tetsuzuki_shurui_label` を同梱していたが、画面 (SCR-012 履歴タブ) は
 * `useCodesStore().label('TETSUZUKI_SHURUI', …)` で描画しており誰も読んでいな
 * かったため削除した。ラベルは顧客が m_code から変更できるので、キャッシュ済み
 * の値をレスポンスに焼き込まない方が乖離しない。
 */
export class DokusyaHistoryItemDto {
  @ApiProperty() dokusya_rireki_id: number;
  @ApiProperty() dokusya_id: number;
  @ApiProperty() rireki_no: number;
  @ApiProperty() tetsuzuki_shurui: number;
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
