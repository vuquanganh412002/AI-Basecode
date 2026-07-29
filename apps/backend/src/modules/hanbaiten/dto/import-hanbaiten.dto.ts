import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * 空セル（xlsx sheet_to_json の `defval: ''` で `""`）を `undefined` に変換し、
 * `@IsOptional` が後続の length / format バリデータを確実に短絡できるようにする
 * （`.claude/rules/nestjs.md §DTO validation gotchas #1`）。coerce した `undefined`
 * が届くよう `@IsOptional()` の前に置く。
 *
 * JS `number` → `string` も変換する。Excel は数値的セル（郵便番号・金融機関コード・
 * 口座番号・口座支店コード…）を数値で保持し `sheet_to_json` が `number` で渡すが、
 * これらは BE では VARCHAR（先頭ゼロ / 固定幅が重要）。素の `@IsString` だと行全体を
 * 弾き、ネスト行エラーは汎用1行「取込データ / 入力値が不正です」に潰れる。ここで
 * 文字列化すれば数値セルが `@IsString` を通り、真に不正な値は後続の `@Length` /
 * `@Matches` が項目別メッセージで捕捉する。
 */
const blankToUndef = ({ value }: { value: unknown }) => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
};

/**
 * 数値版 — 任意数値項目で `@Type(() => Number) + @Transform(blankToUndef)` の
 * 組合せを置き換える。`@Type(() => Number)` は class-transformer 段で `""` を `0`
 * にしてしまい後段の blank 変換を無効化する。本版は1パスで両方を処理:
 *   - 空文字 / null / undefined → undefined（@IsOptional がスキップ）
 *   - 非空文字               → Number(s)（@IsInt が通る）
 *   - 既に数値               → そのまま
 * 任意数値 DTO 項目では `@Type(() => Number)` の代わりに使う。
 */
const blankOrNumber = ({ value }: { value: unknown }) => {
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
 * 半角カタカナ regex — create-hanbaiten.dto.ts と同一（FE/BE 契約を grep 可能に
 * 保つためインライン維持・`.claude/rules/vue.md §Kana`）。範囲 `ｦ-ﾟ`(U+FF66-FF9F)
 * ＝ 文字 + 長音符 + 濁点/半濁点。`\s` は全角スペース U+3000 を含む。半角数字も許可
 * （店名に半角数字が入りうる）。
 */
const HALF_WIDTH_KATAKANA_RE = /^[ｦ-ﾟ\s0-9]+$/u;

/**
 * 廃店フラグ 用の Excel 向け boolean 変換。xlsx セルは入力次第で boolean / number /
 * 文字列（'TRUE' / '1' / '○' …）で DTO に届き、素の `@IsBoolean` だと妥当な `1` でも
 * 取込全体を 400 にする。よくある真偽形をマップし、空→undefined（`@IsOptional` が
 * スキップし service が false 既定）、未知値はそのまま通し `@IsBoolean` が項目別
 * メッセージで弾く。
 */
const TRUE_TOKENS = new Set(['true', '1', '○', '〇', '◯', '✓', 'yes', 'y']);
const FALSE_TOKENS = new Set(['false', '0', '×', '✕', 'no', 'n']);
const excelToBool = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (t === '') return undefined;
    if (TRUE_TOKENS.has(t)) return true;
    if (FALSE_TOKENS.has(t)) return false;
  }
  return value;
};

/**
 * POST /api/v1/hanbaiten/import のボディ (ACSMS-API-019-002)。
 * バリデーション規則は ACSMS-SCR-019-api.md §4.1 準拠。
 * - `import_mode` ∈ { NEW, UPDATE }（顧客要件 2026-07：全項目更新を廃止し更新1本に
 *   統合。UPDATE は selected_columns の列のみ更新、全列更新は全列を含める）
 * - `selected_columns` は物理列名 1..23 件。service 層が多層防御として
 *   `hanbaiten_code` 含有を再検証（規則が「selected_columns に hanbaiten_code 必須」に
 *   帰着するため DTO 層の相関チェックは不要）。
 * - `rows` は 1..500 件。将来クライアントが DTO 上限をバイパスしても
 *   ROW_LIMIT_EXCEEDED を返せるよう service で再度上限を課す。
 *
 * m_code の allow-list 検証（itaku_kubun / furikomi_tesuryo_futan_kubun /
 * yokin_shubetsu）は `class-validator` が Nest DI 前に走るため service 層の責務。
 */

const IMPORT_MODES = ['NEW', 'UPDATE'] as const;

export class ImportHanbaitenRowDto {
  @ApiProperty({ description: '販売店コード', maxLength: 10 })
  @Transform(blankToUndef)
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '販売店コードは必須です。' })
  @MinLength(1, { message: '販売店コードは1文字以上で指定してください。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code!: string;

  @ApiPropertyOptional({ description: '販売店名称', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名称は文字列で指定してください。' })
  @MaxLength(100, { message: '販売店名称は最大100文字で指定してください。' })
  hanbaiten_name?: string;

  @ApiPropertyOptional({ description: '販売店名称(カナ)', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名称(カナ)は文字列で指定してください。' })
  @MaxLength(100, {
    message: '販売店名称(カナ)は最大100文字で指定してください。',
  })
  @Matches(HALF_WIDTH_KATAKANA_RE, {
    message: '販売店名称(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  hanbaiten_name_kana?: string;

  @ApiPropertyOptional({ description: 'インボイス番号', maxLength: 20 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'インボイス番号は文字列で指定してください。' })
  @MaxLength(20, { message: 'インボイス番号は最大20文字で指定してください。' })
  torihikisaki_no?: string;

  @ApiPropertyOptional({ description: '郵便番号(7桁)' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '郵便番号は文字列で指定してください。' })
  @Length(7, 7, { message: '郵便番号は7桁で指定してください。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '住所は文字列で指定してください。' })
  @MaxLength(200, { message: '住所は最大200文字で指定してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  @Matches(/^\d+$/, {
    message: '電話番号は半角数字のみ（ハイフンなし）入力可能です。',
  })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  @Matches(/^\d+$/, {
    message: 'FAXは半角数字のみ（ハイフンなし）入力可能です。',
  })
  fax?: string;

  @ApiPropertyOptional({ description: '所長名', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  @ApiPropertyOptional({ description: '委託区分 (m_code ITAKU_KUBUN)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '委託区分は整数で指定してください。' })
  itaku_kubun?: number;

  @ApiPropertyOptional({ description: '配達手数料単価コード', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達手数料単価コードは文字列で指定してください。' })
  @MaxLength(10, {
    message: '配達手数料単価コードは最大10文字で指定してください。',
  })
  haitatsuryo_tanka_code?: string;

  @ApiPropertyOptional({ description: '金融機関コード', maxLength: 4 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関コードは文字列で指定してください。' })
  @MaxLength(4, { message: '金融機関コードは最大4文字で指定してください。' })
  bank_code?: string;

  @ApiPropertyOptional({ description: '金融機関名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関名は文字列で指定してください。' })
  @MaxLength(100, { message: '金融機関名は最大100文字で指定してください。' })
  bank_name?: string;

  @ApiPropertyOptional({ description: '配達手数料支払サイクル(月数)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '配達手数料支払サイクルは整数で指定してください。' })
  @Min(0, {
    message: '配達手数料支払サイクルは0以上で指定してください。',
  })
  haitatsuryo_shiharai_cycle?: number;

  @ApiPropertyOptional({ description: '口座支店コード', maxLength: 3 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店コードは文字列で指定してください。' })
  @MaxLength(3, { message: '口座支店コードは最大3文字で指定してください。' })
  bank_branch_code?: string;

  @ApiPropertyOptional({ description: '口座支店名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '口座支店名は最大100文字で指定してください。' })
  bank_branch_name?: string;

  @ApiPropertyOptional({ description: '口座種別 (m_code YOKIN_SHUBETSU)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '口座種別は整数で指定してください。' })
  yokin_shubetsu?: number;

  @ApiPropertyOptional({ description: '口座番号', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座番号は文字列で指定してください。' })
  @MaxLength(10, { message: '口座番号は最大10文字で指定してください。' })
  koza_no?: string;

  @ApiPropertyOptional({ description: '口座名義', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座名義は文字列で指定してください。' })
  @MaxLength(50, { message: '口座名義は最大50文字で指定してください。' })
  koza_meigi?: string;

  @ApiPropertyOptional({ description: '振込手数料負担区分 (m_code TESURYO_KUBUN)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '振込手数料負担区分は整数で指定してください。' })
  furikomi_tesuryo_futan_kubun?: number;

  @ApiPropertyOptional({ description: '振込手数料(≧0)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '振込手数料は整数で指定してください。' })
  @Min(0, { message: '振込手数料は0以上で指定してください。' })
  furikomi_tesuryo?: number;

  @ApiPropertyOptional({ description: '備考' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;

  @ApiPropertyOptional({ description: '廃店フラグ' })
  @Transform(excelToBool)
  @IsOptional()
  @IsBoolean({ message: '廃店フラグは true / false（1 / 0）で指定してください。' })
  haiten_flg?: boolean;
}

export class ImportHanbaitenDto {
  @ApiProperty({
    description: '取込モード',
    enum: IMPORT_MODES,
  })
  @IsString({ message: '取込モードは文字列で指定してください。' })
  @IsNotEmpty({ message: '取込モードは必須です。' })
  @IsIn(IMPORT_MODES, {
    message: '取込モードは NEW / UPDATE のいずれかを指定してください。',
  })
  import_mode!: (typeof IMPORT_MODES)[number];

  @ApiProperty({
    description: '取込対象列(物理名)。1〜23件。',
    type: [String],
  })
  @IsArray({ message: '取込対象列は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込対象列は1件以上で指定してください。' })
  @ArrayMaxSize(23, { message: '取込対象列は23件以下で指定してください。' })
  @IsString({ each: true, message: '取込対象列は文字列で指定してください。' })
  selected_columns!: string[];

  @ApiProperty({
    description: '取込データ。1〜500件。',
    type: [ImportHanbaitenRowDto],
  })
  @IsArray({ message: '取込データは配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込データは1件以上で指定してください。' })
  @ArrayMaxSize(500, {
    message: '取込データ行数の上限(500行)を超えています。',
  })
  @ValidateNested({ each: true })
  @Type(() => ImportHanbaitenRowDto)
  rows!: ImportHanbaitenRowDto[];
}
