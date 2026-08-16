import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * ソート可能列のホワイトリスト。画面設計書 v1.2 §8.1 ではローカル2列のみ公開。
 * この `@IsIn` ガードがユーザー指定 `sort_by` 経由の SQL インジェクションを防ぐ。
 */
export const HANBAITEN_SEARCH_SORT_BY = [
  'hanbaiten_code',
  'hanbaiten_name',
  // 既定の表示順 — 最終更新が新しい順。UI ではクリック可能な列ではない（画面設計書
  // §8.1 は code / name のみソートヘッダに公開）。暗黙の既定で、作成/取込/更新した
  // 販売店が先頭に来る（updated_at は書込毎に更新される）。
  'updated_at',
] as const;
export type HanbaitenSearchSortBy =
  (typeof HANBAITEN_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 文字列化された boolean（'true' / 'false'）を実 boolean に変換する — Express の
 * クエリ解析は常に文字列を生む。それ以外はそのまま返し、後続の `@IsBoolean()` が
 * 妥当なバリデーションエラーで弾けるようにする。
 */
const stringToBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return value;
};

/**
 * `GET /api/v1/hanbaiten` のクエリ文字列 DTO (ACSMS-API-018-001)。
 *
 * 全項目任意。class-transformer が下記の既定を適用するので service は常に
 * 充填済みオブジェクトを見る。
 *
 * page/per_page は {@link PaginationDto} から継承。省略時クエリは `undefined` で届くため、
 * 実行時既定（page=1, per_page=20）は service 層が `?? 1` / `?? 20` で適用する。
 */
export class SearchHanbaitenDto extends PaginationDto {
  @ApiPropertyOptional({ description: '販売店コード（部分一致検索）', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code?: string;

  @ApiPropertyOptional({ description: '販売店名（部分一致検索）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名は文字列で指定してください。' })
  @MaxLength(100, { message: '販売店名は最大100文字で指定してください。' })
  hanbaiten_name?: string;

  @ApiPropertyOptional({ description: '電話番号（部分一致検索）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（部分一致検索）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  fax?: string;

  @ApiPropertyOptional({ description: '住所（部分一致検索）', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '住所は文字列で指定してください。' })
  @MaxLength(200, { message: '住所は最大200文字で指定してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '所長名（部分一致検索）', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  // [staff-ja-filter] 明示 JA フィルタ — ユーザーが <BaseJaDropdown> で先に JA を選ぶ
  // NICHINO_STAFF 代行入力 フロー用。セッションスコープ役は無視（applyJaScope が
  // 既に session.ja_id を固定）。service は session.ja_id が null(NICHINO_*)のときのみ適用。
  @ApiPropertyOptional({
    description: 'JA絞り込み (NICHINO_STAFF 代行入力 専用)。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ja_idは整数で指定してください。' })
  @Min(1, { message: 'ja_idは1以上で指定してください。' })
  ja_id?: number;

  @ApiPropertyOptional({
    description:
      '廃店フラグ（true:廃店も含む, false:廃店を除外）。省略時は false。',
    type: Boolean,
  })
  // `enableImplicitConversion: true` だと @Transform 前に Boolean() で任意の非空文字列
  // （'false' 含む）が `true` に変換されてしまう。@Type(() => String) を強制すると
  // class-transformer はその原始変換をスキップし raw 文字列を残すので、下の
  // stringToBoolean が 'true'/'false' を正しくマップし、'maybe' は @IsBoolean が弾く。
  @Type(() => String)
  @Transform(stringToBoolean)
  @IsOptional()
  @IsBoolean({ message: '廃店フラグはbooleanで指定してください。' })
  haiten_flg?: boolean;

  // 有効単価フラグ（ACSMS-SCR-021 error gate 連携・顧客要件2026-07 改訂）。配達手数料単価
  // (haitatsuryo_tanka_id → m_tanka.tanka_type=2)の active_flg で絞り込むトライステート
  // ラジオ: true=有効単価(active_flg=TRUE)を参照する販売店、false=失効単価
  // (active_flg=FALSE)を参照する販売店のみ、省略時は絞り込まない（両方）。ACSMS-SCR-021 の
  // 失効単価エラーからは「無効(false)」で初期選択される。
  @ApiPropertyOptional({
    description:
      '有効単価フラグ（true=有効単価を参照する販売店のみ、false=失効単価を参照する販売店のみ、省略=両方）。',
    type: Boolean,
  })
  @Type(() => String)
  @Transform(stringToBoolean)
  @IsOptional()
  @IsBoolean({ message: '有効単価フラグはbooleanで指定してください。' })
  active_tanka_flg?: boolean;

  @ApiPropertyOptional({
    enum: HANBAITEN_SEARCH_SORT_BY,
    default: 'updated_at',
    description:
      'ソート項目（hanbaiten_code / hanbaiten_name / updated_at）。未指定時は updated_at（最終更新が新しい順）。',
  })
  @IsOptional()
  @IsIn(HANBAITEN_SEARCH_SORT_BY, {
    message:
      'sort_byは hanbaiten_code / hanbaiten_name / updated_at のいずれかで指定してください。',
  })
  sort_by?: HanbaitenSearchSortBy = 'updated_at';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'ソート方向。未指定時は desc（最新順）。',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_orderは asc または desc で指定してください。',
  })
  sort_order?: 'asc' | 'desc' = 'desc';
}
