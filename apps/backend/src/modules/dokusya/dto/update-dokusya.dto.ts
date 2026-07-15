import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmpty, IsIn, IsOptional } from 'class-validator';

import { CreateDokusyaDto } from './create-dokusya.dto';

/**
 * 情報変更モード（顧客要件2026-07・SCR-011 参照→編集フロー）:
 * - `today`（当日変更）: 情報変更適用日=本日固定。帳票に影響しない項目のみ即時反映
 *   （紙版）。電子版は全項目可（帳票を生成しないため）。
 * - `reserved`（予約変更）: 情報変更適用日=未来日（必須・入力）。全変更可。
 */
export type DokusyaChangeMode = 'today' | 'reserved';

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
   * 情報変更モード（顧客要件2026-07）。未指定時は後方互換で `reserved`（予約変更・
   * 未来日のみ）として扱う。`today`（当日変更）は適用日=本日固定＋帳票影響項目の
   * 変更を制限（紙版）する。値の検証はサービス層で行う。
   */
  @ApiPropertyOptional({ enum: ['today', 'reserved'], description: '情報変更モード（当日変更/予約変更）' })
  @IsOptional()
  @IsIn(['today', 'reserved'], { message: '情報変更モードの値が不正です。' })
  change_mode?: DokusyaChangeMode;

  // 氏名(氏/名/かな) は作成・編集の両方で変更可（顧客要件 2026-07）。親
  // CreateDokusyaDto の 必須 + @Matches(漢字/ひらがな) をそのまま継承して
  // 編集でも検証する（プロパティのオーバーライドは行わない）。サービスの
  // name-pin も撤廃済みのため、送信値がそのまま保存・履歴化される。
  //
  // 販売店適用日 (hanbaiten_tekiyo_date) は廃止（顧客要件 2026-07）。販売店変更の
  // 適用日は読者情報変更適用日 (joho_henko_tekiyo_date) に統一され、更新は
  // 1更新1レコードで記録される。UI/取込/置換で同一ロジック。
}
