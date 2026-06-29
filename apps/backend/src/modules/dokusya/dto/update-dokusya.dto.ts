import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

import {
  CreateDokusyaDto,
  DATE_INPUT_RE,
  blankToUndef,
} from './create-dokusya.dto';

/**
 * Body for PUT /api/v1/dokusya/{dokusya_id} (ACSMS-API-011-003).
 *
 * api.md §3 §API-011-003: "リクエストボディはACSMS-API-011-002と同一構造。
 * dokusya_id は変更不可（URLから取得）".
 *
 * `ja_id` rejection is inherited from `CreateDokusyaDto`. `dokusya_id`
 * is rejected with the same `@IsEmpty()` pattern so a client that
 * smuggles it into the body gets a 400 with a `dokusya_id` field
 * error (the URL path param is the single source of truth).
 *
 * NOT using `PartialType(CreateDokusyaDto)` — the screen submits the
 * full form on update, every required field stays required so the FE
 * gets a consistent validation surface across create and update.
 */
export class UpdateDokusyaDto extends CreateDokusyaDto {
  /**
   * `dokusya_id` is on the URL path — body MUST NOT carry it.
   * See create-dokusya.dto.ts for the `@IsEmpty()` rationale.
   */
  @IsEmpty({ message: 'dokusya_id はリクエストボディに含められません。' })
  dokusya_id?: never;

  /**
   * 氏名(氏/名/かな) は作成時のみ入力可。編集では FE で :disabled、サービスでも
   * `before` の値に pin される（dokusya.service §[name-immutable]）ため、編集での
   * 値は無視される。親 CreateDokusyaDto の @Matches(漢字/ひらがな) を編集では
   * 無効化する — 旧取込等で非準拠の既存データを持つ購読者でも、ユーザーが直せ
   * ない項目の検証で更新がブロックされないようにする。`@ValidateIf(() => false)`
   * は当該プロパティの全バリデータ（継承分含む）をスキップする。whitelist には
   * 残るので値はサービスへ渡り、そこで before に pin される。
   */
  @ValidateIf(() => false)
  shimei_sei!: string;

  @ValidateIf(() => false)
  shimei_mei!: string;

  @ValidateIf(() => false)
  shimei_kana_sei!: string;

  @ValidateIf(() => false)
  shimei_kana_mei!: string;

  /**
   * 販売店適用日 — 編集で販売店 (hanbaiten_id) を変更したときの適用日。
   * 当日以降（過去日不可・当日は即日適用）。サービスで
   * `t_dokusya_rireki.hanbaiten_tekiyo_date` に記録する。マスタには
   * 列が無いため保存しない。販売店を変更しない更新では未送信 (null)。
   * 情報変更適用日 (joho_henko_tekiyo_date) とは別概念（後者は後日定義）。
   */
  @ApiPropertyOptional({
    description: '販売店適用日 (YYYY/MM/DD、当日以降)。販売店変更時のみ。',
    nullable: true,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店適用日は文字列で指定してください。' })
  @Matches(DATE_INPUT_RE, {
    message: '販売店適用日はYYYY/MM/DD形式で指定してください。',
  })
  hanbaiten_tekiyo_date?: string | null;
}
