import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

/**
 * `GET /api/v1/file-upload`(一覧)の行形状。各フィールドは
 * api.md §レスポンスデータ の mirror。snake_case キーは意図的
 * (FE クライアント + 全一覧画面が消費)。
 *
 * nullable は UI でなく DB スキーマに従う:
 *   - ja_id, file_size, record_count: nullable(NULL = 全JA向け / 未計算 等)
 *   - upload_datetime, file_name, status, created_by, created_by_name,
 *     created_at: NOT NULL
 */
export class FileUploadListItemDto {
  @ApiProperty({ description: 'ファイルアップロード ID' })
  file_upload_id: number;

  @ApiPropertyOptional({ description: 'JA ID (NULL = 全 JA 向け)' })
  ja_id: number | null;

  // SCR-023 — JOIN した m_ja 列。ja_id IS NULL(全JA向け)のとき NULL。
  @ApiPropertyOptional({ description: 'JAコード（JOIN by ja_id）' })
  ja_code: string | null;

  @ApiPropertyOptional({ description: 'JA名（JOIN by ja_id）' })
  ja_name: string | null;

  @ApiProperty({ description: 'アップロード日時 (ISO 8601)' })
  upload_datetime: string;

  @ApiProperty({ description: 'ファイル名' })
  file_name: string;

  @ApiPropertyOptional({ description: 'ファイルサイズ (バイト)' })
  file_size: number | null;

  @ApiPropertyOptional({ description: 'レコード件数' })
  record_count: number | null;

  // SCR-023 — upload 後に import/notification worker が設定。
  @ApiPropertyOptional({ description: '成功件数' })
  success_count: number | null;

  @ApiPropertyOptional({ description: 'エラー件数' })
  error_count: number | null;

  @ApiProperty({
    description:
      "処理ステータス ※m_code.code_category='FILE_UPLOAD_STATUS'を参照（1:処理中, 2:完了, 3:エラー）",
  })
  status: number;

  // SCR-023 — バックグラウンド通知 worker が設定。
  @ApiProperty({
    description:
      "通知ステータス ※m_code.code_category='NOTIFICATION_STATUS'を参照（1:未送信, 2:送信中, 3:完了, 4:一部失敗）",
  })
  notification_status: number;

  @ApiPropertyOptional({
    description:
      '通知メール送信完了日時 (ISO 8601)。worker が status を 3:完了 / 4:一部失敗 へ更新する際に記録。未送信/送信中の行では NULL',
  })
  notified_at: string | null;

  @ApiPropertyOptional({
    description: '削除予定日 (YYYY-MM-DD)。画面で選択した値。NULL=期限なし',
  })
  scheduled_delete_date: string | null;

  @ApiPropertyOptional({
    description:
      '削除日 (ISO 8601)。論理削除された行のみ値を持つ（未削除は NULL → 画面で「-」）。一覧は削除済みの行も返す（削除ボタンは無効化される）。',
  })
  deleted_at: string | null;

  @ApiProperty({ description: 'エラーファイルパス（NOT NULL、空欄は空文字）' })
  error_file_path: string;

  @ApiProperty({ description: '作成者ログイン ID' })
  created_by: string;

  @ApiProperty({ description: '作成者氏名 (m_account.account_name)' })
  created_by_name: string;

  @ApiProperty({ description: '作成日時 (ISO 8601)' })
  created_at: string;
}

/**
 * `POST /api/v1/file-upload`(SCR-023 upload)が返す行形状。
 * (ja_id × file)の組み合わせ 1 件につき 1 行 — api.md §4.5 参照。
 */
export class FileUploadCreatedItemDto {
  @ApiProperty({ description: 'ファイルアップロード ID' })
  file_upload_id: number;

  @ApiPropertyOptional({ description: 'JA ID' })
  ja_id: number | null;

  @ApiProperty({ description: 'ファイル名' })
  file_name: string;

  @ApiProperty({ description: 'サーバ側保存パス' })
  file_path: string;

  @ApiPropertyOptional({ description: 'ファイルサイズ (バイト)' })
  file_size: number | null;

  @ApiProperty({ description: '処理ステータス (初期値=1:処理中)' })
  status: number;

  @ApiProperty({ description: '通知ステータス (初期値=1:未送信)' })
  notification_status: number;

  @ApiProperty({ description: 'アップロード日時 (ISO 8601)' })
  upload_datetime: string;

  @ApiPropertyOptional({ description: '削除予定日 (ISO 8601, +180日)' })
  scheduled_delete_date: string | null;

  @ApiProperty({ description: 'エラーファイルパス (初期値: 空文字)' })
  error_file_path: string;
}

/** GET /api/v1/file-upload — paginated list response. */
export class FileUploadListResponseDto {
  @ApiProperty({ type: [FileUploadListItemDto] })
  data: FileUploadListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** POST /api/v1/file-upload — array of created rows + verb-only message. */
export class FileUploadCreatedResponseDto {
  @ApiProperty({ type: [FileUploadCreatedItemDto] })
  data: FileUploadCreatedItemDto[];

  @ApiProperty({
    description: 'Verb-only Japanese literal — アップロードしました。',
    example: 'アップロードしました。',
  })
  message: string;
}
