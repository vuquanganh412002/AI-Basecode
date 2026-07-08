import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 金融機関支店フラグ = true のとき JASTEM 4項目は必須（create DTO と同条件）。
 */
const isJastemRequired = (o: { kinyu_shiten_flg?: boolean }): boolean =>
  o.kinyu_shiten_flg === true;

/**
 * Request body for ACSMS-API-007-003 — PUT /api/v1/shiten/:id.
 *
 * Drops `shiten_code` (immutable after create — UI disables the input,
 * api.md §3 注記). All other CreateShitenDto fields apply.
 */
export class UpdateShitenDto {
  @ApiProperty({ description: '支店名', maxLength: 100 })
  @IsString({ message: '支店名を入力してください。' })
  @IsNotEmpty({ message: '支店名を入力してください。' })
  @MaxLength(100, { message: '支店名は最大100文字で入力してください。' })
  shiten_name!: string;

  @ApiPropertyOptional({ description: '支店名（カナ）— 半角カタカナ', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '支店名（カナ）は文字列で入力してください。' })
  @MaxLength(100, { message: '支店名（カナ）は最大100文字で入力してください。' })
  // Half-width katakana — downstream Zengin CSV / PDF exports require it.
  // ｦ-ﾟ covers letters ｦ-ﾝ + prolonged mark ｰ + dakuten/handakuten ﾞ ﾟ.
  @Matches(/^[ｦ-ﾟ\s0-9]+$/u, {
    message: '支店名(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  shiten_name_kana?: string;

  @ApiProperty({ description: '管理支店ID（m_kanri_shitenに存在すること）', example: 1 })
  @Type(() => Number)
  @IsInt({ message: '管理支店を選択してください。' })
  kanri_shiten_id!: number;

  // 作成後は変更不可（顧客要件 2026-07）。JASTEM 4項目の必須判定
  // (isJastemRequired) に既存値が必要なため受け取りは残すが、既存値と
  // 異なる値が来た場合は ShitenService.update が 400 VALIDATION_ERROR
  // (field=kinyu_shiten_flg) で拒否し、永続化は常に既存値を維持する。
  @ApiPropertyOptional({ description: '金融機関支店フラグ（作成後変更不可）', default: false })
  @IsOptional()
  @IsBoolean({ message: '金融機関支店フラグはブール値で指定してください。' })
  kinyu_shiten_flg?: boolean;

  @ApiPropertyOptional({
    description: 'JASTEM_データ送信取扱店舗コード ※空文字許容',
    maxLength: 3,
  })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isJastemRequired(o) || o.jastem_toriatsukai_tenpo_code !== undefined,
  )
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: 'データ送信取扱店舗コードは文字列で入力してください。' })
  @MaxLength(3, {
    message: 'データ送信取扱店舗コードは3文字以内で入力してください。',
  })
  @Matches(/^\d+$/, {
    message: 'データ送信取扱店舗コードは半角数字で入力してください（スペース不可）。',
  })
  jastem_toriatsukai_tenpo_code?: string;

  @ApiPropertyOptional({ description: 'JASTEM_店舗名 ※空文字許容', maxLength: 15 })
  @Transform(blankToUndef)
  @ValidateIf((o) => isJastemRequired(o) || o.jastem_tenpo_name !== undefined)
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '店舗名は文字列で入力してください。' })
  @MaxLength(15, { message: '店舗名は15文字以内で入力してください。' })
  // カタカナ・英数字は半角、漢字・ひらがなは入力可（顧客要件 2026-06）。
  @Matches(/^[ｱ-ﾟ A-Z0-9.()-]+$/, {
    message:
      '店舗名は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。',
  })
  jastem_tenpo_name?: string;

  @ApiPropertyOptional({ description: 'JASTEM_貯金種別 ※空文字許容', maxLength: 1 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isJastemRequired(o) || o.jastem_tyokin_shubetsu !== undefined,
  )
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '貯金種別は文字列で入力してください。' })
  @MaxLength(1, { message: '貯金種別は1文字以内で入力してください。' })
  @Matches(/^[129]$/, {
    message: '貯金種別は 1（普通貯金）/ 2（当座貯金）/ 9（その他）のいずれかを指定してください。',
  })
  jastem_tyokin_shubetsu?: string;

  @ApiPropertyOptional({ description: 'JASTEM_口座番号 ※空文字許容', maxLength: 7 })
  @Transform(blankToUndef)
  @ValidateIf((o) => isJastemRequired(o) || o.jastem_koza_no !== undefined)
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '口座番号は文字列で入力してください。' })
  @MaxLength(7, { message: '口座番号は7文字以内で入力してください。' })
  @Matches(/^\d+$/, {
    message: '口座番号は半角数字で入力してください。',
  })
  jastem_koza_no?: string;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '備考は最大500文字で入力してください。' })
  biko?: string;
}
