import { IsEmpty } from 'class-validator';
import { CreateDokusyaDto } from './create-dokusya.dto';

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
}
