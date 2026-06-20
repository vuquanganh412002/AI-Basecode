import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmpty, IsOptional, IsString, Matches } from 'class-validator';

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
