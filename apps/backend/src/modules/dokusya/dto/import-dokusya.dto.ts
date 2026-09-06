import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DokusyaShubetsu } from '@/common/enums';

/**
 * ACSMS-SCR-016 — 購読者Excelデータ取込画面.
 *
 * 取込リクエストのトップレベル (POST /api/v1/dokusya/import — ACSMS-API-016-002)。
 * DTO は形式契約のみ強制する（import_mode enum、selected_columns + rows 配列の
 * 境界、行ごとの最大長）。業務検証（3:併読 拒否、電子版×クレカ、FK 逆引き、
 * モード条件付き必須、dokusya_busu ルール、文言→code マッピング）は
 * `DokusyaService.importExcel` に置き、同一ルールを行ごとに適用して
 * 単一の `IMPORT_VALIDATION_ERROR` に集約できるようにする。
 */

/**
 * 空文字を undefined に（`@IsOptional()` がスキップするよう）、かつ JS `number` を
 * `string` に変換する。Excel は数値らしいセル（郵便番号・組合員コード・引落口座番号・…）
 * を数値で保持するため `sheet_to_json` は DTO に `number` で渡す。これらの列は BE 側で
 * VARCHAR（先頭ゼロ・固定桁が重要）なので、素の `@IsString` は行を弾く — しかも
 * ネスト行エラーは単一の汎用行に潰れる。ここで文字列化すれば数値セルが `@IsString` を
 * 通り、後続の `@MaxLength`／形式チェックが真に不正な値を捕捉する。文字列フィールド専用。
 */
const blankToUndef = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
};

/**
 * `@IsNumber` フィールド用の数値版。`@Type(() => Number) + @Transform(blankToUndef)`
 * の組み合わせを置き換える — `@Type` は `''` を `0` にしてしまい（空チェックを無効化）、
 * 上の数値→文字列化する `blankToUndef` は数値セルを文字列に戻してしまう。単一パス:
 *   - 空／null／undefined → undefined（`@IsOptional` がスキップ）
 *   - 非空の文字列         → 有限なら Number(s)、そうでなければ文字列のまま
 *   - 既に数値            → そのまま通す
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
 * 氏名かな (氏/名・配達先とも共通) は全角ひらがなのみ許容 — 半角カナ・
 * カタカナ・英数字は不可（不具合修正 2026-08）。FE 側 `HIRAGANA_RE`
 * (apps/frontend/src/views/dokusya/DokusyaFormView.vue) と同一文字集合 —
 * 片方を変えたら両方更新すること。
 */
const HIRAGANA_NAME_RE = /^[ぁ-ゖー0-9０-９\s]+$/u;
// FE 側 HIRAGANA_MSG (DokusyaFormView.vue) と同一文言 — 片方を変えたら両方更新すること。
const HIRAGANA_NAME_MSG = 'ひらがな・数字で入力してください。';

/**
 * 氏名 (氏/名・配達先とも共通) は漢字・ひらがな・カタカナ・アルファベット・
 * 数字を許容（顧客要件 2026-07・不具合修正 2026-08）。FE 側 `KANJI_RE` /
 * BE 側 `create-dokusya.dto.ts` の `KANJI_NAME_RE` と同一文字集合 —
 * 3箇所とも変えたら揃えて更新すること。
 */
const KANJI_NAME_RE = /^[一-鿿々〇豈-﫿ぁ-ゟァ-ヿｦ-ﾟA-Za-zＡ-Ｚａ-ｚ0-9０-９\s]+$/u;
const KANJI_NAME_MSG = '漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。';

/**
 * 行の検証・書込みは `selected_columns` 対象列のみ（api.md §4.1「各行 rows[i]
 * の検証（selected_columns 対象列のみ）」・§4.8.1「一括中止ではキー列
 * (dokusya_id)以外は無視される」）。NEW / UPDATE の両モードに適用する
 * （不具合修正 2026-08 — 従来は UPDATE のみ対象で、新規登録でチェックを
 * 外した任意項目に Excel セルの値が残っていると、選択解除＝未入力の
 * つもりなのに誤って検証・登録されていた）。
 *
 * FE は選択解除された列も Excel セルに値が残っていればそのまま送信し得る
 * （例: 一括中止で ID だけチェックしても email/生年 等のセルに元データが
 * 残っている）。この値が @IsEmail/@IsNumber 等の形式チェックへ届くと、
 * 未選択＝書き込まれない列のはずなのに 400 で全体が弾かれてしまう。
 * selected_columns に無いキーは class-validator が見る前にここで剥がし、
 * 対象外列の値を「未指定」として扱う——NEW は INSERT 時にその列を NULL /
 * 空文字（列の NOT NULL 制約に従う既定値）へ、UPDATE は既存値を維持する。
 * `dokusya_id` / `kumiaiin_code` は UPDATE の突合キー（ID優先・無ければ
 * 組合員コードにフォールバック — `resolveImportTargetId`/`classifyImportRow`
 * 参照）のため常に残す。一括中止の画面は列グリッドをID列だけへ縮退させ
 * `kumiaiin_code` は selected_columns に含まれないため、これを残さないと
 * ID未指定・組合員コードのみでの一括中止が「指定された購読者が見つかりません」
 * で必ず失敗する（不具合修正2026-08）。NEW は自動採番のため両方とも
 * 元々未使用 — 画面側も新規登録では ID をグレー表示＋選択不可にする。
 */
const stripUnselectedColumns = ({
  value,
  obj,
}: {
  value: unknown;
  obj: { import_mode?: string; selected_columns?: unknown };
}): unknown => {
  if (!Array.isArray(value)) return value;
  if (!Array.isArray(obj.selected_columns)) {
    // @Transform が値を横取りする代わりに @Type の役目（プレーンオブジェクト
    // → ImportDokusyaRowDto インスタンス化）を肩代わりする必要があるため、
    // 何も剥がさない場合もここで明示的にインスタンス化する。
    return value.map((row) => plainToInstance(ImportDokusyaRowDto, row));
  }
  const allowed = new Set<string>(obj.selected_columns as string[]);
  if (obj.import_mode === 'UPDATE') {
    allowed.add('dokusya_id');
    allowed.add('kumiaiin_code');
  }
  return value.map((row) => {
    if (row === null || typeof row !== 'object') {
      return plainToInstance(ImportDokusyaRowDto, row);
    }
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (allowed.has(k)) filtered[k] = v;
    }
    return plainToInstance(ImportDokusyaRowDto, filtered);
  });
};

/**
 * 取込1行。全フィールドは DTO 層では任意 — モード条件付き必須チェックはサービスが行う。
 * 数値フィールドは `blankOrNumber`（空→undefined、文字列→数値）、文字列フィールドは
 * `blankToUndef`（空→undefined、数値→文字列）を使い、api.md §リクエストパラメータ の
 * 最大長を持つ。
 */
export class ImportDokusyaRowDto {
  @ApiPropertyOptional({ description: '購読者ID（UPDATE_* キー）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '購読者IDは数値で指定してください。' })
  dokusya_id?: number;

  @ApiPropertyOptional({ description: '購読種別（1:紙版, 2:電子版, 3:併読）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '購読種別は数値で指定してください。' })
  dokusya_shubetsu?: number;

  @ApiPropertyOptional({ description: '手続種類（0:解約, 1:新規）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '手続種類は数値で指定してください。' })
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

  @ApiPropertyOptional({ description: '組合員コード', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '組合員コードは10文字以内で入力してください。' })
  kumiaiin_code?: string;

  @ApiPropertyOptional({ description: '氏名（姓・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '氏名（姓）は50文字以内で入力してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  shimei_sei?: string;

  @ApiPropertyOptional({ description: '氏名（名・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '氏名（名）は50文字以内で入力してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  shimei_mei?: string;

  @ApiPropertyOptional({ description: '氏名かな（姓）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '氏名かな（姓）は100文字以内で入力してください。' })
  @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
  shimei_kana_sei?: string;

  @ApiPropertyOptional({ description: '氏名かな（名）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '氏名かな（名）は100文字以内で入力してください。' })
  @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
  shimei_kana_mei?: string;

  @ApiPropertyOptional({ description: '購読部数' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '購読部数は数値で指定してください。' })
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
  @IsNumber({}, { message: 'メールマガジンは数値で指定してください。' })
  mail_magazine_flg?: number;

  @ApiPropertyOptional({ description: '生年（西暦）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '生年（西暦）は数値で指定してください。' })
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

  @ApiPropertyOptional({ description: 'TEL1' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: 'TEL1は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: 'TEL1は半角数字のみで入力してください（ハイフン不可）。' })
  renrakusaki_1?: string;

  @ApiPropertyOptional({ description: 'TEL2' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: 'TEL2は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: 'TEL2は半角数字のみで入力してください（ハイフン不可）。' })
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

  @ApiPropertyOptional({ description: '配達先TEL1' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '配達先TEL1は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: '配達先TEL1は半角数字のみで入力してください（ハイフン不可）。' })
  haitatsu_renrakusaki_1?: string;

  @ApiPropertyOptional({ description: '配達先TEL2' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15, { message: '配達先TEL2は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: '配達先TEL2は半角数字のみで入力してください（ハイフン不可）。' })
  haitatsu_renrakusaki_2?: string;

  @ApiPropertyOptional({ description: '配達先氏名（姓・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '配達先氏名（姓）は50文字以内で入力してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  haitatsu_shimei_sei?: string;

  @ApiPropertyOptional({ description: '配達先氏名（名・漢字）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '配達先氏名（名）は50文字以内で入力してください。' })
  @Matches(KANJI_NAME_RE, { message: KANJI_NAME_MSG })
  haitatsu_shimei_mei?: string;

  @ApiPropertyOptional({ description: '配達先氏名かな（姓）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先氏名かな（姓）は100文字以内で入力してください。' })
  @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
  haitatsu_shimei_kana_sei?: string;

  @ApiPropertyOptional({ description: '配達先氏名かな（名）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '配達先氏名かな（名）は100文字以内で入力してください。' })
  @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
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
  @IsNumber({}, { message: '支払方法は数値で指定してください。' })
  shiharai_hoho?: number;

  @ApiPropertyOptional({ description: '購読料支払サイクル（月数）' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsNumber({}, { message: '購読料支払サイクルは数値で指定してください。' })
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

  // 従属 4 項目（顧客DB設計 2026-08）。電子版・併読の読者だけが値を持てる
  // （電子版 users.profession_and_* / others_* との連携用で、紙版には送り先が
  // 無い）。親の分類が条件コードを含まない組合せは service 側で落とす —
  // 画面登録（ACSMS-SCR-011）と同じ buildBunruiPayload を通す。
  @ApiPropertyOptional({ description: 'かつJAグループ役職員（購読者層分類=農業者のときのみ）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsBoolean({
    message: 'かつJAグループ役職員は TRUE / FALSE で入力してください。',
  })
  ja_yakushokuin_flg?: boolean;

  @ApiPropertyOptional({ description: '農業関係（購読者層分類=企業・団体のときのみ）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsBoolean({ message: '農業関係は TRUE / FALSE で入力してください。' })
  nogyo_kankei_flg?: boolean;

  @ApiPropertyOptional({ description: '読者属性（その他の内容）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: '読者属性（その他の内容）は255文字以内で入力してください。',
  })
  dokusyaso_bunrui_sonota?: string;

  @ApiPropertyOptional({ description: '農業者分類' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '農業者分類は50文字以内で入力してください。' })
  nogyosya_bunrui?: string;

  @ApiPropertyOptional({ description: '主な生産物（その他の内容）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: '主な生産物（その他の内容）は255文字以内で入力してください。',
  })
  nogyosya_bunrui_sonota?: string;

  @ApiPropertyOptional({ description: '購読開始日（YYYY-MM-DD）' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: '購読開始日は10文字以内で入力してください。' })
  dokusya_kaishi_date?: string;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '備考は最大500文字で指定してください。' })
  biko?: string;

  // 読者情報変更適用日 / 購読中止日 は行ではなく payload 直下へ移した
  // （顧客要件 2026-08: 画面の入力欄で1ファイル1つ指定する）。ImportDokusyaDto を参照。
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

  // 購読種別は画面のラジオ（紙版/電子版）で選ぶ取込モード（顧客要件 2026-07）。
  // Excel の列ではなく UI から受け取り、全行へ一律適用する。3:併読は選択不可。
  @ApiProperty({
    description:
      '購読種別（**1:紙版 / 2:電子版**）。画面ラジオで選択し全取込行へ一律適用する。' +
      'Excel の列ではない（3:併読は取込不可）。',
    enum: [DokusyaShubetsu.PAPER, DokusyaShubetsu.DIGITAL],
  })
  @Type(() => Number)
  @IsInt({ message: '購読種別を選択してください。' })
  @IsIn([DokusyaShubetsu.PAPER, DokusyaShubetsu.DIGITAL], {
    message: '購読種別は紙版または電子版で指定してください。',
  })
  dokusya_shubetsu!: number;

  @ApiProperty({
    description: '取込対象の列（物理カラム名）配列',
    type: [String],
  })
  @IsArray({ message: '取込対象の列は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込対象の列は1件以上指定してください。' })
  @ArrayMaxSize(50, { message: '取込対象の列は50件以内で指定してください。' })
  @IsString({ each: true })
  selected_columns!: string[];

  // ─── 適用日 / 中止日（顧客要件 2026-08: Excel 列から画面入力へ）──────────
  //
  // 1ファイルに1つ。行ごとに別々の適用日は持てない。どちらを入れたかで動作が変わる:
  //   joho あり  … 通常の更新（従来どおり）
  //   chushi あり … 一括中止（解約予約を作る）
  // 両方指定は矛盾（同じ操作が更新なのか中止なのか決まらない）ため 400 で弾く。
  // FE も相互排他で入力させるが、UI の抑止は境界ではないのでここでも検証する。

  @ApiPropertyOptional({
    description:
      '読者情報変更適用日（YYYY-MM-DD）。UPDATE で必須（電子版は当日固定のため省略可・' +
      'BE が当日を補う）。dokusya_chushi_date とは排他。',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '読者情報変更適用日の形式が正しくありません。',
  })
  joho_henko_tekiyo_date?: string;

  @ApiPropertyOptional({
    description:
      '購読中止日（YYYY-MM-DD）。指定すると一括中止（解約予約）になる。' +
      'joho_henko_tekiyo_date とは排他。空文字による一括取消は受け付けない。',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '購読中止日の形式が正しくありません。',
  })
  dokusya_chushi_date?: string;

  @ApiProperty({ description: '取込データ行の配列', type: [ImportDokusyaRowDto] })
  @IsArray({ message: '取込データ行は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込データ行は1件以上指定してください。' })
  @ArrayMaxSize(5000, {
    message: 'ファイルの行数が上限（5000行）を超えているため、取込みできません。',
  })
  @Transform(stripUnselectedColumns)
  @ValidateNested({ each: true })
  @Type(() => ImportDokusyaRowDto)
  rows!: ImportDokusyaRowDto[];
}
