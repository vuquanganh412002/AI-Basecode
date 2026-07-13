import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ExportRowDto } from './export-row.dto';

/** `YYYY-MM-DD` 日付フォーマット。 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/v1/koza-furikae/export のリクエストボディ (ACSMS-API-020-002)。
 * api.md §リクエストパラメータ (13 項目) と §4.1 バリデーションに 1:1 対応。
 * jastem_* は m_ja / m_shiten に保存／更新される（CSVの全銀ヘッダにも使用）。
 */
export class ExportKozaFurikaeDto {
  @ApiProperty({ description: '対象年月日（YYYY-MM-DD）', example: '2026-05-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '対象年月日は文字列で指定してください。' })
  @Matches(DATE_RE, { message: '対象年月日はYYYY-MM-DD形式で指定してください。' })
  target_month!: string;

  @ApiProperty({ description: '引落日（YYYY-MM-DD）', example: '2026-05-27' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '引落日は文字列で指定してください。' })
  @Matches(DATE_RE, { message: '引落日はYYYY-MM-DD形式で指定してください。' })
  hikiotoshi_date!: string;

  @ApiPropertyOptional({ description: '管理支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '管理支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_ids?: number[];

  @ApiPropertyOptional({ description: '支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '支店IDは整数で指定してください。' })
  shiten_ids?: number[];

  @ApiPropertyOptional({ description: '口座支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '口座支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '口座支店IDは整数で指定してください。' })
  koza_shiten_ids?: number[];

  @ApiProperty({ description: 'JASTEM委託者コード（半角英数字、最大10桁）', example: '1234567890' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '委託者コードは文字列で指定してください。' })
  @MaxLength(10, { message: '委託者コードは10桁以内で入力してください。' })
  @Matches(/^[0-9A-Za-z]+$/, { message: '委託者コードは半角英数字で入力してください。' })
  jastem_itakusha_code!: string;

  @ApiProperty({ description: 'JASTEM委託者名（最大40桁）', example: 'ニホンノウギョウシンブン' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '委託者名は文字列で指定してください。' })
  @MaxLength(40, { message: '委託者名は40桁以内で入力してください。' })
  jastem_itakusha_name!: string;

  @ApiProperty({ description: 'JASTEM農協番号（半角数字、最大4桁）', example: '1234' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '農協番号は文字列で指定してください。' })
  @MaxLength(4, { message: '農協番号は4桁以内で入力してください。' })
  @Matches(/^\d+$/, { message: '農協番号は半角数字で入力してください。' })
  jastem_ja_code!: string;

  @ApiProperty({ description: 'JASTEM農協名（最大15桁）', example: 'ニホンノウギョウ' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '農協名は文字列で指定してください。' })
  @MaxLength(15, { message: '農協名は15桁以内で入力してください。' })
  jastem_ja_name!: string;

  @ApiProperty({ description: 'JASTEMデータ送信取扱店舗コード（半角数字、最大3桁）', example: '001' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: 'データ送信取扱店舗コードは文字列で指定してください。' })
  @MaxLength(3, { message: 'データ送信取扱店舗コードは3桁以内で入力してください。' })
  @Matches(/^\d+$/, { message: 'データ送信取扱店舗コードは半角数字で入力してください。' })
  jastem_toriatsukai_tenpo_code!: string;

  @ApiProperty({ description: 'JASTEM店舗名（最大15桁）', example: 'ホンテン' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '店舗名は文字列で指定してください。' })
  @MaxLength(15, { message: '店舗名は15桁以内で入力してください。' })
  jastem_tenpo_name!: string;

  @ApiProperty({ description: 'JASTEM貯金種目（1:普通, 2:当座, 9:その他）', example: '1' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsIn(['1', '2', '9'], { message: '貯金種目は1・2・9のいずれかで指定してください。' })
  jastem_tyokin_shubetsu!: string;

  @ApiProperty({ description: 'JASTEM口座番号（半角数字、最大7桁）', example: '1234567' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '口座番号は文字列で指定してください。' })
  @MaxLength(7, { message: '口座番号は7桁以内で入力してください。' })
  @Matches(/^\d+$/, { message: '口座番号は半角数字で入力してください。' })
  jastem_koza_no!: string;

  @ApiProperty({
    description:
      'プレビューで確認・編集した振替対象行（v1.1）。dokusya_id で突合し、' +
      'サーバはスコープ再集計した集合にある行だけ金額を上書きする。',
    type: [ExportRowDto],
  })
  @IsArray({ message: '対象データがありません。' })
  @ArrayNotEmpty({ message: '対象データがありません。' })
  @ValidateNested({ each: true })
  @Type(() => ExportRowDto)
  rows!: ExportRowDto[];
}
