import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** 空文字を undefined に寄せる（FE は未入力を "" で送るため）。 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 承認/否認 画面で編集を許可する項目（#56524）— 支払方法 + 引落口座4項目。
 *
 * 承認待ち(denshi_shonin_status=0)の電子版読者は、以前は「新聞単価」だけ編集
 * 可能だった。電子版申込の支払方法・口座情報は読者本人の自己申告で誤りが多く、
 * 担当者が承認/否認の判断と同時に直せないと、承認 → 再編集の2操作が必要に
 * なっていた（顧客要件 2026-08 / #56524）。
 *
 * 承認・否認どちらのボディにも載る共通部分。省略したフィールドは変更しない
 * （部分更新）。
 */
export class DenshiShoninEditDto {
  @ApiPropertyOptional({
    description:
      '支払方法 (m_code.code_category=SHIHARAI_HOHO)。指定時のみ更新。' +
      '電子版はクレジットカード(6)を指定できない（電子版連携専用のため）。',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支払方法は整数で指定してください。' })
  shiharai_hoho?: number;

  @ApiPropertyOptional({
    description:
      '引落口座支店 = 銀行支店ID (m_shiten.shiten_id・kinyu_shiten_flg=true)。' +
      'サーバ側で bank_branch_code / bank_branch_name を逆引きして保存。',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '銀行支店IDは整数で指定してください。' })
  bank_shiten_id?: number;

  @ApiPropertyOptional({
    description: '引落口座貯金種目 (m_code.code_category=YOKIN_SHUBETSU)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '引落 預金種別は整数で指定してください。' })
  hikiotoshi_yokin_shubetsu?: number;

  @ApiPropertyOptional({ description: '引落口座番号', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落 口座番号は文字列で指定してください。' })
  @MaxLength(10, { message: '引落 口座番号は最大10文字で指定してください。' })
  hikiotoshi_koza_no?: string;

  @ApiPropertyOptional({ description: '引落口座名義', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落 口座名義は文字列で指定してください。' })
  @MaxLength(50, { message: '引落 口座名義は最大50文字で指定してください。' })
  hikiotoshi_koza_meigi?: string;
}
