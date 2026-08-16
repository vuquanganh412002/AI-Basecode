import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * FE が 履歴一覧 をソート可能な列の allow-list
 * （api.md §ACSMS-API-013-001 §4.1 sort_by 許可リスト）。spec がプロパティ単位の
 * エラーを見られるよう DTO でここで強制する。サービスは自身の SORT_COLUMN_MAP で
 * 値を完全修飾列にマップする（SQL インジェクションへの二重防御）。
 */
const ALLOWED_SORT_COLUMNS = [
  'rireki_no',
  'dokusya_kaishi_date',
  'joho_henko_tekiyo_date',
  'created_at',
] as const;

/**
 * `GET /api/v1/dokusya/:dokusya_id/rireki` のクエリ DTO
 * （ACSMS-SCR-013 — 購読者履歴情報画面）。
 *
 * ページネーション + ソートのみ。`dokusya_id` はパスパラメータ（コントローラの
 * ParseIntPipe）で、この DTO には含まれない。デフォルトは api.md §4.1 に準拠:
 * `page=1`・`per_page=20`・`sort_by=rireki_no`・`sort_order=desc`
 * （機能定義 1.2 — 履歴番号降順／最新レコード先頭）。
 */
export class DokusyaRirekiQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'ページ番号（1始まり）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    maximum: 100,
    description: '1ページあたりの件数（最大100）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '1ページの件数は整数で指定してください。' })
  @Min(1, { message: '1ページの件数は1以上で指定してください。' })
  @Max(100, { message: '1ページの件数は100以下で指定してください。' })
  per_page?: number = 20;

  @ApiPropertyOptional({
    enum: ALLOWED_SORT_COLUMNS,
    default: 'rireki_no',
    description: 'ソート対象カラム',
  })
  @IsOptional()
  @IsIn([...ALLOWED_SORT_COLUMNS], {
    message: 'ソート対象カラムの値が不正です。',
  })
  sort_by?: string = 'rireki_no';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'ソート順はasc / descのいずれかで指定してください。',
  })
  sort_order?: 'asc' | 'desc' = 'desc';
}
