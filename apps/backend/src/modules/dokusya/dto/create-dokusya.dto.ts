import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEmpty,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DokusyaShubetsu } from '@/common/enums';
import {
  DOKUSYASO_BUNRUI_CSV_RE,
  DOKUSYASO_BUNRUI_INVALID_MSG,
  NOGYOSYA_BUNRUI_CSV_RE,
  NOGYOSYA_BUNRUI_INVALID_MSG,
} from '@/common/constants/dokusya-bunrui.constant';

/**
 * 空文字 → undefined 変換。`@IsOptional()` は `null`／`undefined` のみスキップし
 * `""` は対象外。フォームは空の任意項目を `""` で送るため、これが無いと
 * `@MaxLength`／`@Matches` が弾く。`.claude/rules/nestjs.md §DTO validation gotchas #1` 参照。
 */
export const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 配達先 住所・氏名 が「必須」になる条件 (機能定義 §9.2 / FE
 * `haitatsuRequired` computed と一致):
 *   haitatsu_same_flg = false（購読者情報と同じ をオフ）
 *   AND 紙版 (dokusya_shubetsu = 1)  ※電子版/併読 (2/3) は配達先
 *   セクションが非表示のため検証しない。
 *
 * 各 haitatsu_* 必須項目には `@ValidateIf(d => isHaitatsuAddressRequired(d)
 * || d.<field> !== undefined)` を付与する。これにより:
 *   - 紙版+別住所 → 必須 (@IsNotEmpty) + フォーマット検証
 *   - それ以外で値が入力済み → フォーマット/桁数のみ検証 (旧挙動維持)
 *   - それ以外で空 → スキップ (blankToUndef で undefined 化済み)
 * `@IsOptional()` は使えない — undefined を先に握り潰し @IsNotEmpty が
 * 走らなくなる (`.claude/rules/nestjs.md §DTO validation gotchas #4`)。
 */
function isHaitatsuAddressRequired(o: {
  haitatsu_same_flg?: boolean;
  dokusya_shubetsu?: number;
}): boolean {
  return (
    o.haitatsu_same_flg === false &&
    Number(o.dokusya_shubetsu) === DokusyaShubetsu.PAPER
  );
}

/**
 * 両区切りを許容する日付リテラル: YYYY/MM/DD（ピッカー表示形式＝ユーザーが見て
 * 入力する形）と YYYY-MM-DD（ISO）。サービスは保存前にスラッシュをハイフンに
 * 正規化し、varchar(10) 列を辞書順範囲フィルタ（`d.dokusya_kaishi_date <= :to`）
 * 用にハイフン統一で保つ。ファイルアップロード／お知らせ／ログ画面の
 * YYYY/MM/DD 対応入力と同様。
 */
export const DATE_INPUT_RE = /^\d{4}[/-]\d{2}[/-]\d{2}$/;

/**
 * 氏名 (氏/名) は漢字・ひらがな・カタカナを許容（顧客要件 2026-07 緩和）— CJK統合漢字 (U+4E00-9FFF) + 々(U+3005 繰返し)
 * + 〇(U+3007) + CJK互換漢字 (U+F900-FAFF, 﨑/髙等の人名漢字) + ひらがな(U+3041-309F)
 * + 全角カタカナ(U+30A1-30FF ァ-ヿ、長音符ー・中点・含む). 半角カナ/英数字は不可. 空白は
 * トークン区切りとして許容。FE 側 `KANJI_RE`
 * (apps/frontend/src/views/dokusya/DokusyaFormView.vue) と同一文字集合 —
 * 片方を変えたら両方更新すること。
 */
const KANJI_NAME_RE = /^[一-鿿々〇豈-﫿ぁ-ゟァ-ヿｦ-ﾟA-Za-zＡ-Ｚａ-ｚ0-9０-９\s]+$/u;
const KANJI_NAME_MSG =
  '漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。';

/**
 * POST /api/v1/dokusya (ACSMS-API-011-002) のボディ。
 *
 * `ja_id` / `dokusya_id` は意図的に未宣言 — グローバルな
 * `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` が
 * コントローラ境界で除去／拒否する。両者はサーバ側で導出（ja_id はセッション、
 * dokusya_id は自動採番）。
 *
 * `m_code` に対する実行時 allow-list チェック（dokusya_shubetsu・
 * tetsuzuki_shurui・yubin_kubun・shiharai_hoho 等）と `joho_henko_tekiyo_date`
 * の未来日チェックはサービス層に置く — `class-validator` デコレータは Nest DI
 * 配線前に走るため `CodeService` を注入できない。
 */
export class CreateDokusyaDto {
  /**
   * `ja_id` はセッションからサーバ側で導出 — ボディで指定してはならない。
   * `@IsEmpty()` を付与し、`whitelist:true`／`forbidNonWhitelisted:true` が
   * 無効でも `ja_id` を紛れ込ませたクライアントには `ja_id` フィールドエラーの
   * 400 を返す。dto.spec.ts の `should reject ja_id in body` が使用。
   */
  @IsEmpty({ message: 'ja_id はリクエストボディに含められません。' })
  ja_id?: never;

  // 管理支店は必須（画面上 * 表示・顧客要件）。未指定/0 を許すと BE で
  // kanri_shiten_id=0 → m_kanri_shiten への FK 違反(500)になるため、DTO 層で
  // 明示的に必須＋1以上を検証し、VALIDATION_ERROR(400) を返す。
  @ApiProperty({ description: '管理支店ID (FK: m_kanri_shiten)' })
  @Type(() => Number)
  @IsNotEmpty({ message: '管理支店を選択してください。' })
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  @Min(1, { message: '管理支店を選択してください。' })
  kanri_shiten_id!: number;

  @ApiPropertyOptional({
    description:
      '支店ID (FK: m_shiten)。任意（顧客要件 2026-07：必須を解除）。未指定時は NULL で保存。金融支店 (kinyu_shiten_flg=true) は対象外（引落口座支店専用）。',
    nullable: true,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支店IDは整数で指定してください。' })
  shiten_id?: number | null;

  @ApiPropertyOptional({ description: '組合員コード', maxLength: 20 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '組合員コードは文字列で指定してください。' })
  @MaxLength(20, { message: '組合員コードは最大20文字で指定してください。' })
  kumiaiin_code?: string;

  @ApiProperty({
    description: '購読者種別 (m_code.code_category=DOKUSYA_SHUBETSU)',
  })
  @Type(() => Number)
  @IsInt({ message: '購読者種別は整数で指定してください。' })
  dokusya_shubetsu!: number;

  @ApiProperty({
    description: '手続種類 (m_code.code_category=TETSUZUKI_SHURUI)',
  })
  @Type(() => Number)
  @IsInt({ message: '手続種類は整数で指定してください。' })
  tetsuzuki_shurui!: number;

  @ApiProperty({ description: '購読部数 (0以上、解約時は0)' })
  @Type(() => Number)
  @IsInt({ message: '購読部数は整数で指定してください。' })
  @Min(0, { message: '購読部数は0以上で指定してください。' })
  dokusya_busu!: number;

  @ApiProperty({ description: '氏名 (姓) — 漢字・かな・アルファベット', maxLength: 50 })
  @IsString({ message: '氏名(姓)は文字列で指定してください。' })
  @IsNotEmpty({ message: '氏名(姓)は必須です。' })
  @MaxLength(50, { message: '氏名(姓)は最大50文字で指定してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  shimei_sei!: string;

  @ApiProperty({ description: '氏名 (名) — 漢字・かな・アルファベット', maxLength: 50 })
  @IsString({ message: '氏名(名)は文字列で指定してください。' })
  @IsNotEmpty({ message: '氏名(名)は必須です。' })
  @MaxLength(50, { message: '氏名(名)は最大50文字で指定してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  shimei_mei!: string;

  @ApiProperty({ description: '氏名カナ (姓)', maxLength: 100 })
  @IsString({ message: '氏名カナ(姓)は文字列で指定してください。' })
  @IsNotEmpty({ message: '氏名カナ(姓)は必須です。' })
  @MaxLength(100, {
    message: '氏名カナ(姓)は最大100文字で指定してください。',
  })
  shimei_kana_sei!: string;

  @ApiProperty({ description: '氏名カナ (名)', maxLength: 100 })
  @IsString({ message: '氏名カナ(名)は文字列で指定してください。' })
  @IsNotEmpty({ message: '氏名カナ(名)は必須です。' })
  @MaxLength(100, {
    message: '氏名カナ(名)は最大100文字で指定してください。',
  })
  shimei_kana_mei!: string;

  @ApiProperty({ description: '郵便番号 (半角数字7桁)' })
  @IsString({ message: '郵便番号は文字列で指定してください。' })
  @IsNotEmpty({ message: '郵便番号は必須です。' })
  @Matches(/^\d{7}$/, {
    message: '郵便番号は半角数字7桁で指定してください。',
  })
  yubin_no!: string;

  @ApiProperty({ description: '都道府県コード (2桁)' })
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '都道府県コードは必須です。' })
  @Length(2, 2, { message: '都道府県コードは2桁で指定してください。' })
  todofuken_code!: string;

  @ApiProperty({ description: '市区町村', maxLength: 100 })
  @IsString({ message: '市区町村は文字列で指定してください。' })
  @IsNotEmpty({ message: '市区町村は必須です。' })
  @MaxLength(100, { message: '市区町村は最大100文字で指定してください。' })
  shikuchoson!: string;

  @ApiProperty({ description: '町域・番地', maxLength: 100 })
  @IsString({ message: '町域・番地は文字列で指定してください。' })
  @IsNotEmpty({ message: '町域・番地は必須です。' })
  @MaxLength(100, { message: '町域・番地は最大100文字で指定してください。' })
  chome_banchi!: string;

  @ApiPropertyOptional({ description: '建物名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '建物名は文字列で指定してください。' })
  @MaxLength(100, { message: '建物名は最大100文字で指定してください。' })
  tatemono_mei?: string;

  @ApiProperty({ description: '連絡先1 (電話番号)', maxLength: 15 })
  @IsString({ message: '連絡先1は文字列で指定してください。' })
  @IsNotEmpty({ message: '連絡先1は必須です。' })
  @MaxLength(15, { message: '連絡先1は最大15文字で指定してください。' })
  renrakusaki_1!: string;

  @ApiPropertyOptional({ description: '連絡先2 (電話番号)', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '連絡先2は文字列で指定してください。' })
  @MaxLength(15, { message: '連絡先2は最大15文字で指定してください。' })
  renrakusaki_2?: string;

  @ApiPropertyOptional({
    description:
      'メールアドレス。電子版(dokusya_shubetsu=2)・併読(3) では必須かつ ' +
      '電子版/併読レコード間で一意（紙版(1) は任意・重複可）。必須・一意の判定は ' +
      'dokusya_shubetsu に依存するため DTO ではなく DokusyaService で検証する。',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @MaxLength(100, {
    message: 'メールアドレスは最大100文字で指定してください。',
  })
  @IsEmail({}, { message: 'メールアドレスの形式が不正です。' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'メルマガ配信フラグ (m_code.code_category=MAIL_MAGAZINE_FLG)。電子版用項目。' +
      '紙版時は未選択で NULL 保存（顧客要件 2026-07）。',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'メルマガ配信フラグは整数で指定してください。' })
  mail_magazine_flg?: number | null;

  @ApiPropertyOptional({ description: '生年 (西暦)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '生年は整数で指定してください。' })
  birth_year?: number;

  @ApiPropertyOptional({
    description: '性別 (m_code.code_category=GENDER)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '性別は整数で指定してください。' })
  gender?: number;

  @ApiProperty({
    description: '配達先=連絡先と同じフラグ (true=同じ、配達先カラムは空)',
  })
  @IsBoolean({ message: '配達先=連絡先と同じフラグはbool型で指定してください。' })
  haitatsu_same_flg!: boolean;

  @ApiPropertyOptional({ description: '配達先 郵便番号 (半角数字7桁)', maxLength: 7 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isHaitatsuAddressRequired(o) || o.haitatsu_yubin_no !== undefined,
  )
  @IsNotEmpty({ message: '配達先 郵便番号は必須です。' })
  @IsString({ message: '配達先 郵便番号は文字列で指定してください。' })
  @Matches(/^\d{7}$/, {
    message: '配達先 郵便番号は半角数字7桁で指定してください。',
  })
  haitatsu_yubin_no?: string;

  @ApiPropertyOptional({ description: '配達先 都道府県コード', maxLength: 2 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) =>
      isHaitatsuAddressRequired(o) || o.haitatsu_todofuken_code !== undefined,
  )
  @IsNotEmpty({ message: '配達先 都道府県コードは必須です。' })
  @IsString({ message: '配達先 都道府県コードは文字列で指定してください。' })
  @MaxLength(2, {
    message: '配達先 都道府県コードは最大2文字で指定してください。',
  })
  haitatsu_todofuken_code?: string;

  @ApiPropertyOptional({ description: '配達先 市区町村', maxLength: 100 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isHaitatsuAddressRequired(o) || o.haitatsu_shikuchoson !== undefined,
  )
  @IsNotEmpty({ message: '配達先 市区町村は必須です。' })
  @IsString({ message: '配達先 市区町村は文字列で指定してください。' })
  @MaxLength(100, {
    message: '配達先 市区町村は最大100文字で指定してください。',
  })
  haitatsu_shikuchoson?: string;

  @ApiPropertyOptional({ description: '配達先 町域・番地', maxLength: 100 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isHaitatsuAddressRequired(o) || o.haitatsu_chome_banchi !== undefined,
  )
  @IsNotEmpty({ message: '配達先 町域・番地は必須です。' })
  @IsString({ message: '配達先 町域・番地は文字列で指定してください。' })
  @MaxLength(100, {
    message: '配達先 町域・番地は最大100文字で指定してください。',
  })
  haitatsu_chome_banchi?: string;

  @ApiPropertyOptional({ description: '配達先 建物名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達先 建物名は文字列で指定してください。' })
  @MaxLength(100, {
    message: '配達先 建物名は最大100文字で指定してください。',
  })
  haitatsu_tatemono_mei?: string;

  @ApiPropertyOptional({ description: '配達先 連絡先1', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達先 連絡先1は文字列で指定してください。' })
  @MaxLength(15, {
    message: '配達先 連絡先1は最大15文字で指定してください。',
  })
  haitatsu_renrakusaki_1?: string;

  @ApiPropertyOptional({ description: '配達先 連絡先2', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達先 連絡先2は文字列で指定してください。' })
  @MaxLength(15, {
    message: '配達先 連絡先2は最大15文字で指定してください。',
  })
  haitatsu_renrakusaki_2?: string;

  @ApiPropertyOptional({ description: '配達先 氏名 (姓)', maxLength: 50 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isHaitatsuAddressRequired(o) || o.haitatsu_shimei_sei !== undefined,
  )
  @IsNotEmpty({ message: '配達先 氏名(姓)は必須です。' })
  @IsString({ message: '配達先 氏名(姓)は文字列で指定してください。' })
  @MaxLength(50, {
    message: '配達先 氏名(姓)は最大50文字で指定してください。',
  })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  haitatsu_shimei_sei?: string;

  @ApiPropertyOptional({ description: '配達先 氏名 (名)', maxLength: 50 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) => isHaitatsuAddressRequired(o) || o.haitatsu_shimei_mei !== undefined,
  )
  @IsNotEmpty({ message: '配達先 氏名(名)は必須です。' })
  @IsString({ message: '配達先 氏名(名)は文字列で指定してください。' })
  @MaxLength(50, {
    message: '配達先 氏名(名)は最大50文字で指定してください。',
  })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  haitatsu_shimei_mei?: string;

  @ApiPropertyOptional({ description: '配達先 氏名カナ (姓)', maxLength: 100 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) =>
      isHaitatsuAddressRequired(o) || o.haitatsu_shimei_kana_sei !== undefined,
  )
  @IsNotEmpty({ message: '配達先 氏名カナ(姓)は必須です。' })
  @IsString({ message: '配達先 氏名カナ(姓)は文字列で指定してください。' })
  @MaxLength(100, {
    message: '配達先 氏名カナ(姓)は最大100文字で指定してください。',
  })
  haitatsu_shimei_kana_sei?: string;

  @ApiPropertyOptional({ description: '配達先 氏名カナ (名)', maxLength: 100 })
  @Transform(blankToUndef)
  @ValidateIf(
    (o) =>
      isHaitatsuAddressRequired(o) || o.haitatsu_shimei_kana_mei !== undefined,
  )
  @IsNotEmpty({ message: '配達先 氏名カナ(名)は必須です。' })
  @IsString({ message: '配達先 氏名カナ(名)は文字列で指定してください。' })
  @MaxLength(100, {
    message: '配達先 氏名カナ(名)は最大100文字で指定してください。',
  })
  haitatsu_shimei_kana_mei?: string;

  @ApiProperty({ description: '販売店ID (FK: m_hanbaiten)' })
  @Type(() => Number)
  @IsInt({ message: '販売店IDは整数で指定してください。' })
  hanbaiten_id!: number;

  @ApiProperty({ description: '単価ID (FK: m_tanka)' })
  @Type(() => Number)
  @IsInt({ message: '単価IDは整数で指定してください。' })
  tanka_id!: number;

  @ApiPropertyOptional({
    description: '郵送区分 (m_code.code_category=YUBIN_KUBUN, 1文字)',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '郵送区分は文字列で指定してください。' })
  @Length(1, 1, { message: '郵送区分は1文字で指定してください。' })
  yubin_kubun?: string;

  @ApiProperty({
    description: '支払方法 (m_code.code_category=SHIHARAI_HOHO)',
  })
  @Type(() => Number)
  @IsInt({ message: '支払方法は整数で指定してください。' })
  shiharai_hoho!: number;

  @ApiPropertyOptional({
    description: '購読料支払サイクル (月数、最大99)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '購読料支払サイクルは整数で指定してください。' })
  @Min(0, { message: '購読料支払サイクルは0以上で指定してください。' })
  dokusyaryo_shiharai_cycle?: number;

  @ApiPropertyOptional({
    description:
      '銀行支店ID (m_shiten.shiten_id、支払方法=1 口座引落 の場合は必須)。' +
      'サーバ側で jastem_toriatsukai_tenpo_code / jastem_tenpo_name を逆引き。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '銀行支店IDは整数で指定してください。' })
  bank_shiten_id?: number;

  @ApiPropertyOptional({
    description: '引落 預金種別 (m_code.code_category=YOKIN_SHUBETSU)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '引落 預金種別は整数で指定してください。' })
  hikiotoshi_yokin_shubetsu?: number;

  @ApiPropertyOptional({ description: '引落 口座番号', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落 口座番号は文字列で指定してください。' })
  @MaxLength(10, {
    message: '引落 口座番号は最大10文字で指定してください。',
  })
  hikiotoshi_koza_no?: string;

  @ApiPropertyOptional({ description: '引落 口座名義', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落 口座名義は文字列で指定してください。' })
  @MaxLength(50, {
    message: '引落 口座名義は最大50文字で指定してください。',
  })
  hikiotoshi_koza_meigi?: string;

  @ApiPropertyOptional({
    description:
      '購読者層分類 — コードのカンマ区切り（0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他）。電子版 profession と 1:1。',
    maxLength: 50,
    example: '0',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読者層分類は文字列で指定してください。' })
  @MaxLength(50, {
    message: '購読者層分類は最大50文字で指定してください。',
  })
  @Matches(DOKUSYASO_BUNRUI_CSV_RE, { message: DOKUSYASO_BUNRUI_INVALID_MSG })
  dokusyaso_bunrui?: string;

  @ApiPropertyOptional({
    description:
      'かつJAグループ役職員フラグ。購読者層分類＝農業者(0)のときのみ有効 — 満たさない場合はサーバ側で false に落とす。電子版 profession_and_ja と 1:1。',
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'かつJAグループ役職員フラグは true/false で指定してください。',
  })
  ja_yakushokuin_flg?: boolean;

  @ApiPropertyOptional({
    description:
      '農業関係フラグ。購読者層分類＝企業・団体(2)のときのみ有効 — 満たさない場合はサーバ側で false に落とす。電子版 profession_and_agri と 1:1。',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: '農業関係フラグは true/false で指定してください。' })
  nogyo_kankei_flg?: boolean;

  @ApiPropertyOptional({
    description:
      '購読者層分類その他（自由記述）。購読者層分類＝その他(999)のときのみ有効 — 満たさない場合はサーバ側で空にする。電子版 others_profession と 1:1。',
    maxLength: 255,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読者層分類その他は文字列で指定してください。' })
  @MaxLength(255, {
    message: '購読者層分類その他は最大255文字で指定してください。',
  })
  dokusyaso_bunrui_sonota?: string;

  @ApiPropertyOptional({
    description:
      '農業者分類 — コードのカンマ区切り（0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他）。電子版 products と 1:1。',
    maxLength: 50,
    example: '0,1',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '農業者分類は文字列で指定してください。' })
  @MaxLength(50, {
    message: '農業者分類は最大50文字で指定してください。',
  })
  @Matches(NOGYOSYA_BUNRUI_CSV_RE, { message: NOGYOSYA_BUNRUI_INVALID_MSG })
  nogyosya_bunrui?: string;

  @ApiPropertyOptional({
    description:
      '農業者分類その他（自由記述）。農業者分類に その他(999) を含むときのみ有効 — 満たさない場合はサーバ側で空にする。電子版 others_products と 1:1。',
    maxLength: 255,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '農業者分類その他は文字列で指定してください。' })
  @MaxLength(255, {
    message: '農業者分類その他は最大255文字で指定してください。',
  })
  nogyosya_bunrui_sonota?: string;

  @ApiProperty({ description: '購読開始日 (YYYY/MM/DD)' })
  @IsString({ message: '購読開始日は文字列で指定してください。' })
  @IsNotEmpty({ message: '購読開始日は必須です。' })
  @Matches(DATE_INPUT_RE, {
    message: '購読開始日はYYYY/MM/DD形式で指定してください。',
  })
  dokusya_kaishi_date!: string;

  @ApiPropertyOptional({
    description: '購読中止日 (YYYY/MM/DD)',
    nullable: true,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読中止日は文字列で指定してください。' })
  @Matches(DATE_INPUT_RE, {
    message: '購読中止日はYYYY/MM/DD形式で指定してください。',
  })
  dokusya_chushi_date?: string | null;

  @ApiPropertyOptional({
    description: '情報変更適用日 (YYYY/MM/DD、未来日)',
    nullable: true,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '情報変更適用日は文字列で指定してください。' })
  @Matches(DATE_INPUT_RE, {
    message: '情報変更適用日はYYYY/MM/DD形式で指定してください。',
  })
  joho_henko_tekiyo_date?: string | null;

  @ApiPropertyOptional({
    description: '請求開始月 (YYYYMM)',
    maxLength: 6,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '請求開始月は文字列で指定してください。' })
  @MaxLength(6, { message: '請求開始月は最大6文字で指定してください。' })
  seikyu_kaishi_month?: string;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  @MaxLength(500, { message: '備考は最大500文字で指定してください。' })
  biko?: string;
}
