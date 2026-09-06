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
  Min,
  ValidateIf,
} from 'class-validator';

// 空文字→undefined（@IsOptional 前に実行）。.claude/rules/nestjs.md §DTO validation gotchas
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// kinyu_shiten_flg=true のとき JASTEM 4項目（取扱店舗コード/店舗名/貯金種別/口座番号）は必須。
// 各項目を @ValidateIf(isJastemRequired || 値指定あり) で gate し @IsNotEmpty を効かせる。
const isJastemRequired = (o: { kinyu_shiten_flg?: boolean }): boolean =>
  o.kinyu_shiten_flg === true;

/**
 * POST /api/v1/shiten (ACSMS-API-007-002) リクエストボディ。
 * 制約は api.md §リクエストパラメータ + §4.1。shiten_code は半角3桁固定
 * (screen-design §3.1)、kinyu_shiten_flg 既定 false (database-design §m_shiten)。
 */
export class CreateShitenDto {
  /**
   * [staff-ja-id] NICHINO_ADMIN 代行入力ではフォームの BaseJaDropdown で ja_id を
   * 明示指定する（このロールは session.ja_id が null・顧客CR 2026-08-24）。他ロールが
   * 送っても BE service は無視し session.ja_id を使うため、クロステナント注入は不可。
   */
  @ApiPropertyOptional({
    description: 'JA ID（NICHINO_ADMIN 代行入力 専用）。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  @Min(1, { message: 'JA IDは1以上で指定してください。' })
  ja_id?: number;

  @ApiProperty({ description: '支店コード（半角数字3桁固定）', minLength: 3, maxLength: 3 })
  @IsString({ message: '支店コードを入力してください。' })
  @IsNotEmpty({ message: '支店コードを入力してください。' })
  @Matches(/^\d{3}$/, { message: '支店コードは半角数字3桁で入力してください。' })
  shiten_code!: string;

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
  // 半角カタカナ（Zengin CSV / PDF 出力が要求）。ｦ-ﾟ = 文字ｦ-ﾝ + 長音ｰ + 濁点/半濁点ﾞﾟ。
  @Matches(/^[ｦ-ﾟ\s0-9]+$/u, {
    message: '支店名(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  shiten_name_kana?: string;

  @ApiProperty({ description: '管理支店ID（m_kanri_shitenに存在すること）', example: 1 })
  @Type(() => Number)
  @IsInt({ message: '管理支店を選択してください。' })
  kanri_shiten_id!: number;

  @ApiPropertyOptional({ description: '金融機関支店フラグ', default: false })
  @IsOptional()
  @IsBoolean({ message: '金融機関支店フラグはブール値で指定してください。' })
  kinyu_shiten_flg?: boolean;

  // データ送信取扱店舗コード — 半角数字のみ（スペース不可）。
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

  // 店舗名 — 銀行charset限定：半角カナ ｱ-ﾟ・A-Z・0-9・. ( ) -（顧客要件 2026-06-25、漢字/ひらがな/全角不可）。
  // FE utils/kana.ts JASTEM_NAME_RE と一致。
  @ApiPropertyOptional({ description: 'JASTEM_店舗名 ※空文字許容', maxLength: 15 })
  @Transform(blankToUndef)
  @ValidateIf((o) => isJastemRequired(o) || o.jastem_tenpo_name !== undefined)
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '店舗名は文字列で入力してください。' })
  @MaxLength(15, { message: '店舗名は15文字以内で入力してください。' })
  @Matches(/^[ｱ-ﾟ A-Z0-9.()-]+$/, {
    message:
      '店舗名は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。',
  })
  jastem_tenpo_name?: string;

  // 貯金種別 — 1=普通貯金 / 2=当座貯金 / 9=その他。1文字コードで保存。
  // import 時はラベル文字列を '1'/'2'/'9' に変換して永続化。フォーム入力はコードのみ。
  @ApiPropertyOptional({
    description: 'JASTEM_貯金種別 ※空文字許容（1=普通貯金, 2=当座貯金, 9=その他）',
    maxLength: 1,
  })
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

  // 口座番号 — 半角数字。
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
  @IsString({ message: '備考は文字列で入力してください。' })
  @MaxLength(500, { message: '備考は最大500文字で入力してください。' })
  biko?: string;
}
