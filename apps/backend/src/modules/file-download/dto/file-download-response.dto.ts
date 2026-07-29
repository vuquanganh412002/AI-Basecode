import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

/**
 * `GET /api/v1/file-download`(SCR-022 一覧)の行形状。データ元は
 * `t_file_download`。帳票各画面が生成したダウンロード対象ファイルを一覧表示する
 * （t_file_download への INSERT は各帳票画面が行う。本画面は読み取り＋DL専用）。
 *
 * nullable は t_file_download スキーマ準拠:
 *   - ja_id / target_month / scheduled_delete_date / deleted_at / created_at: nullable
 *   - download_datetime / download_type / file_name / file_size /
 *     record_count / nichino_download_allowed_flg / created_by: NOT NULL
 */
export class FileDownloadListItemDto {
  @ApiProperty({ description: 'ファイルダウンロード ID' })
  file_download_id: number;

  @ApiPropertyOptional({ description: 'JA ID (NULL = 全 JA 向け)' })
  ja_id: number | null;

  @ApiPropertyOptional({ description: 'JAコード（JOIN by ja_id）' })
  ja_code: string | null;

  @ApiPropertyOptional({ description: 'JA名（JOIN by ja_id）' })
  ja_name: string | null;

  @ApiProperty({ description: 'ダウンロード日時 (ISO 8601)' })
  download_datetime: string;

  @ApiProperty({
    description:
      'ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）',
  })
  download_type: number;

  @ApiProperty({ description: 'ファイル名' })
  file_name: string;

  @ApiProperty({ description: 'ファイルサイズ (バイト)' })
  file_size: number;

  @ApiProperty({ description: 'レコード件数' })
  record_count: number;

  @ApiPropertyOptional({ description: '対象年月（YYYYMM）※空文字許容' })
  target_month: string | null;

  @ApiPropertyOptional({ description: '削除予定日 (ISO 8601)。NULL=期限なし' })
  scheduled_delete_date: string | null;

  @ApiProperty({
    description: '日農ダウンロード許可フラグ（TRUE:許可する, FALSE:許可しない）',
  })
  nichino_download_allowed_flg: boolean;

  @ApiPropertyOptional({
    description:
      '削除日 (ISO 8601)。論理削除された行のみ値を持つ（未削除は NULL → 画面で「-」）。',
  })
  deleted_at: string | null;

  @ApiProperty({ description: '作成者 (account_id)' })
  created_by: string;

  @ApiPropertyOptional({ description: '作成者名（JOIN by m_account）' })
  created_by_name: string | null;

  @ApiPropertyOptional({ description: '作成日時 (ISO 8601)' })
  created_at: string | null;
}

export class FileDownloadListResponseDto {
  @ApiProperty({ type: [FileDownloadListItemDto] })
  data: FileDownloadListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** `GET /api/v1/file-download/:id/preview` レスポンス。 */
export class FilePreviewResponseDto {
  @ApiProperty({ description: 'プレビュー用署名付き URL' })
  preview_url: string;

  @ApiProperty({ description: 'ファイル名' })
  file_name: string;
}

export class FilePreviewEnvelopeDto {
  @ApiProperty({ type: FilePreviewResponseDto })
  data: FilePreviewResponseDto;
}
