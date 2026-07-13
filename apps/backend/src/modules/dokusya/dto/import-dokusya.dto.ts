import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * ACSMS-SCR-016 — 購読者Excelデータ取込画面.
 *
 * Top-level import request (POST /api/v1/dokusya/import — API-016-002).
 * The DTO enforces the SHAPE contract only (import_mode enum,
 * selected_columns + rows array bounds, per-row max-lengths). All
 * BUSINESS validation (3:併読 reject, 電子版×クレカ, FK lookups,
 * mode-conditional required, dokusya_busu rules, 文言→code mapping)
 * lives in `DokusyaService.importExcel` so the same rule set can be
 * applied per-row and aggregated into one `IMPORT_VALIDATION_ERROR`.
 */

/**
 * Coerce blank strings to undefined so `@IsOptional()` skips them, AND a
 * JS `number` to `string`. Excel stores numeric-looking cells (郵便番号,
 * 組合員コード, 引落口座番号, …) as numbers, so `sheet_to_json` hands them
 * to the DTO as `number`. These columns are VARCHAR on the BE (leading
 * zeros / fixed widths matter), so a bare `@IsString` would reject the
 * row — and because the failure is a nested-row error it collapses to a
 * single generic line. Stringifying here lets a numeric cell pass
 * `@IsString`; the downstream `@MaxLength` / format checks still catch
 * genuinely malformed values. Use on STRING fields only.
 */
const blankToUndef = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
};

/**
 * Numeric variant for `@IsNumber` fields. Replaces the
 * `@Type(() => Number) + @Transform(blankToUndef)` combo — `@Type` turns
 * `''` into `0` (defeating the blank check), and the number-stringifying
 * `blankToUndef` above would push a numeric cell back to a string. Single
 * pass:
 *   - blank / null / undefined → undefined (so `@IsOptional` skips)
 *   - non-blank string         → Number(s) when finite, else the string
 *   - already numeric          → pass through
 */
const blankOrNumber = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  return value;
};

/**
 * Boolean variant — Excel の真偽セル（boolean / TRUE/FALSE / 1/0 / ○/× /
 * はい/いいえ）を boolean へ。空欄は undefined（未指定＝BE 側で従来挙動に
 * フォールバック）。
 */
const blankOrBool = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim();
  if (s === '') return undefined;
  if (/^(true|1|○|はい|yes|y)$/i.test(s)) return true;
  if (/^(false|0|×|いいえ|no|n)$/i.test(s)) return false;
  return undefined;
};

/**
 * One import row. Every field is OPTIONAL at the DTO level — the
 * service applies mode-conditional required checks. Numeric fields use
 * `blankOrNumber` (blank → undefined, string → number); string fields use
 * `blankToUndef` (blank → undefined, number → string) and carry the
 * api.md §リクエストパラメータ max-lengths.
 */
export class ImportDokusyaRowDto {
  @ApiPropertyOptional({ description: '購読者ID（UPDATE_* キー）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  dokusya_id?: number;

  @ApiPropertyOptional({ description: '購読種別（1:紙版, 2:電子版, 3:併読）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  dokusya_shubetsu?: number;

  @ApiPropertyOptional({ description: '手続種類（0:解約, 1:新規）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  tetsuzuki_shurui?: number;

  @ApiPropertyOptional({ description: '管理支店コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '管理支店コードは20文字以内で入力してください。' })
  kanri_shiten_code?: string;

  @ApiPropertyOptional({ description: '支店コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '支店コードは20文字以内で入力してください。' })
  shiten_code?: string;

  @ApiPropertyOptional({ description: '組合員コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '組合員コードは20文字以内で入力してください。' })
  kumiaiin_code?: string;

  @ApiPropertyOptional({ description: '氏名（姓・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '氏名（姓）は50文字以内で入力してください。' })
  shimei_sei?: string;

  @ApiPropertyOptional({ description: '氏名（名・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '氏名（名）は50文字以内で入力してください。' })
  shimei_mei?: string;

  @ApiPropertyOptional({ description: '氏名かな（姓）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '氏名かな（姓）は100文字以内で入力してください。' })
  shimei_kana_sei?: string;

  @ApiPropertyOptional({ description: '氏名かな（名）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '氏名かな（名）は100文字以内で入力してください。' })
  shimei_kana_mei?: string;

  @ApiPropertyOptional({ description: '購読部数' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  dokusya_busu?: number;

  @ApiPropertyOptional({ description: '新聞単価コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '新聞単価コードは10文字以内で入力してください。' })
  tanka_code?: string;

  @ApiPropertyOptional({
    description:
      'メールアドレス。電子版(2)・併読(3) では必須かつ電子版/併読レコード間で ' +
      '一意（紙版(1) は任意・重複可）。必須・一意の判定は DokusyaService の ' +
      '取込バリデーションで行う（実効購読種別は更新時に既存レコードの値を使う）。',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'メールアドレスは100文字以内で入力してください。' })
  @IsEmail({}, { message: 'メールアドレスの形式が不正です。' })
  email?: string;

  @ApiPropertyOptional({ description: 'メールマガジン（0:配信しない, 1:配信する）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  mail_magazine_flg?: number;

  @ApiPropertyOptional({ description: '生年（西暦）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  birth_year?: number;

  @ApiPropertyOptional({ description: '性別（1:男性, 2:女性, 9:回答しない）。文言も可' })
  @Transform(blankToUndef)
  @IsOptional()
  gender?: number | string;

  @ApiPropertyOptional({ description: '郵便番号（7桁）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(7, { message: '郵便番号は7文字以内で入力してください。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '都道府県コード（2桁）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(2, { message: '都道府県コードは2文字以内で入力してください。' })
  todofuken_code?: string;

  @ApiPropertyOptional({ description: '市町村郡' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '市町村郡は100文字以内で入力してください。' })
  shikuchoson?: string;

  @ApiPropertyOptional({ description: '丁目番地' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '丁目番地は100文字以内で入力してください。' })
  chome_banchi?: string;

  @ApiPropertyOptional({ description: 'マンション・アパート名' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'マンション名等は100文字以内で入力してください。' })
  tatemono_mei?: string;

  @ApiPropertyOptional({ description: '連絡先１' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '連絡先１は15文字以内で入力してください。' })
  renrakusaki_1?: string;

  @ApiPropertyOptional({ description: '連絡先２' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '連絡先２は15文字以内で入力してください。' })
  renrakusaki_2?: string;

  @ApiPropertyOptional({ description: '購読者情報と同じ（true: 配達先＝購読者住所）' })
  @Transform(blankOrBool)
  @IsOptional()
  @IsBoolean({ message: '購読者情報と同じフラグはbool型で指定してください。' })
  haitatsu_same_flg?: boolean;

  @ApiPropertyOptional({ description: '配達先郵便番号' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(7, { message: '配達先郵便番号は7文字以内で入力してください。' })
  haitatsu_yubin_no?: string;

  @ApiPropertyOptional({ description: '配達先都道府県コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(2, { message: '配達先都道府県コードは2文字以内で入力してください。' })
  haitatsu_todofuken_code?: string;

  @ApiPropertyOptional({ description: '配達先市町村郡' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先市町村郡は100文字以内で入力してください。' })
  haitatsu_shikuchoson?: string;

  @ApiPropertyOptional({ description: '配達先丁目番地' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先丁目番地は100文字以内で入力してください。' })
  haitatsu_chome_banchi?: string;

  @ApiPropertyOptional({ description: '配達先建物名' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先建物名は100文字以内で入力してください。' })
  haitatsu_tatemono_mei?: string;

  @ApiPropertyOptional({ description: '配達先連絡先１' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '配達先連絡先１は15文字以内で入力してください。' })
  haitatsu_renrakusaki_1?: string;

  @ApiPropertyOptional({ description: '配達先連絡先２' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '配達先連絡先２は15文字以内で入力してください。' })
  haitatsu_renrakusaki_2?: string;

  @ApiPropertyOptional({ description: '配達先氏名（姓・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '配達先氏名（姓）は50文字以内で入力してください。' })
  haitatsu_shimei_sei?: string;

  @ApiPropertyOptional({ description: '配達先氏名（名・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '配達先氏名（名）は50文字以内で入力してください。' })
  haitatsu_shimei_mei?: string;

  @ApiPropertyOptional({ description: '配達先氏名かな（姓）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先氏名かな（姓）は100文字以内で入力してください。' })
  haitatsu_shimei_kana_sei?: string;

  @ApiPropertyOptional({ description: '配達先氏名かな（名）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先氏名かな（名）は100文字以内で入力してください。' })
  haitatsu_shimei_kana_mei?: string;

  @ApiPropertyOptional({ description: '販売店コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '販売店コードは10文字以内で入力してください。' })
  hanbaiten_code?: string;

  @ApiPropertyOptional({ description: '郵送区分（0:空, 1:郵送）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(1, { message: '郵送区分は1文字以内で入力してください。' })
  yubin_kubun?: string;

  @ApiPropertyOptional({ description: '支払方法（1:口座引落 等）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  shiharai_hoho?: number;

  @ApiPropertyOptional({ description: '購読料支払サイクル（月数）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber()
  dokusyaryo_shiharai_cycle?: number;

  @ApiPropertyOptional({ description: '引落口座貯金種目（1:普通, 2:当座）。文言も可' })
  @Transform(blankToUndef)
  @IsOptional()
  hikiotoshi_yokin_shubetsu?: number | string;

  @ApiPropertyOptional({ description: '引落口座支店コード' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(3, { message: '引落口座支店コードは3文字以内で入力してください。' })
  bank_branch_code?: string;

  @ApiPropertyOptional({ description: '引落口座支店名' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '引落口座支店名は100文字以内で入力してください。' })
  bank_branch_name?: string;

  @ApiPropertyOptional({ description: '引落口座番号' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '引落口座番号は10文字以内で入力してください。' })
  hikiotoshi_koza_no?: string;

  @ApiPropertyOptional({ description: '引落口座名義' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '引落口座名義は50文字以内で入力してください。' })
  hikiotoshi_koza_meigi?: string;

  @ApiPropertyOptional({ description: '購読者層分類' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '購読者層分類は50文字以内で入力してください。' })
  dokusyaso_bunrui?: string;

  @ApiPropertyOptional({ description: '農業者分類' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '農業者分類は50文字以内で入力してください。' })
  nogyosya_bunrui?: string;

  @ApiPropertyOptional({ description: '購読開始日（YYYY-MM-DD）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '購読開始日は10文字以内で入力してください。' })
  dokusya_kaishi_date?: string;

  @ApiPropertyOptional({ description: '購読中止日（YYYY-MM-DD）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '購読中止日は10文字以内で入力してください。' })
  dokusya_chushi_date?: string;

  @ApiPropertyOptional({ description: '備考' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  biko?: string;

  @ApiPropertyOptional({ description: '読者情報変更適用日（YYYY-MM-DD）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '読者情報変更適用日は10文字以内で入力してください。' })
  joho_henko_tekiyo_date?: string;

  @ApiPropertyOptional({ description: '販売店適用日（YYYY-MM-DD。販売店変更時に必須）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '販売店適用日は10文字以内で入力してください。' })
  hanbaiten_tekiyo_date?: string;
}

export class ImportDokusyaDto {
  @ApiProperty({
    description:
      '取込モード（NEW / UPDATE）。UPDATE は selected_columns の列のみ更新（空欄は' +
      'スキップ）。全列更新は全列を selected_columns に含める。旧 UPDATE_ALL は廃止。',
    enum: ['NEW', 'UPDATE'],
  })
  @IsIn(['NEW', 'UPDATE'], {
    message: '取込モードの値が不正です。',
  })
  import_mode!: 'NEW' | 'UPDATE';

  @ApiProperty({
    description: '取込対象の列（物理カラム名）配列',
    type: [String],
  })
  @IsArray({ message: '取込対象の列は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込対象の列は1件以上指定してください。' })
  @ArrayMaxSize(50, { message: '取込対象の列は50件以内で指定してください。' })
  @IsString({ each: true })
  selected_columns!: string[];

  @ApiProperty({ description: '取込データ行の配列', type: [ImportDokusyaRowDto] })
  @IsArray({ message: '取込データ行は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込データ行は1件以上指定してください。' })
  @ArrayMaxSize(30000, {
    message: 'ファイルの行数が上限（30000行）を超えているため、取込みできません。',
  })
  @ValidateNested({ each: true })
  @Type(() => ImportDokusyaRowDto)
  rows!: ImportDokusyaRowDto[];
}
