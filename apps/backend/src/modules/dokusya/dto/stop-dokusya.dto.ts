import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * Body for `POST /api/v1/dokusya/:dokusya_id/stop` — 購読中止（解約予約 / 予約変更 / 予約取消）.
 *
 * ACSMS-SCR-014 一覧の「購読中止」ボタンから呼ぶ専用エンドポイント。購読中止日(解約予定日)
 * だけを受け取り、Phase 1 の予約行 (`insertScheduledKaiyaku`) を1件挿入する。値の意味は
 * 購読種別で異なるが、送信形はどちらも `YYYY-MM-DD`:
 *   - 紙版 (dokusya_shubetsu=1): カレンダーで選んだ日付そのもの。
 *   - 電子版 (dokusya_shubetsu=2): 選択した「終了月」の月末日（FE が月末に丸める）。
 *
 * 空文字 = 解約予約の取消（顧客要件 2026-08・電子版のみ）。ポップアップで中止日を
 * クリアして確定した場合に送られる。DTO は空文字を通し、「種別ごとに取消を許すか」
 * `''` の妥当性判定は service.stop が担う（紙版は履歴画面の取消が既存導線なので拒否）。
 *
 * 種別ごとの相対チェック（紙版=購読開始日以降/未来日/最終変更適用日より後、
 * 電子版=請求開始月以降・当月以降）も同じく service.stop 側。DTO は形だけ検証する。
 */
export class StopDokusyaDto {
  @ApiProperty({
    description:
      '購読中止日（解約予定日）。紙版はカレンダー選択日、電子版は選択月の月末日。' +
      '空文字は解約予約の取消（電子版のみ）。',
    example: '2026-08-31',
  })
  @IsString({ message: '購読中止日を入力してください。' })
  // 空文字(取消)を許すため `?` 付き。必須性の判定は service.stop が種別を見て行う。
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/, {
    message: '購読中止日の形式が正しくありません。',
  })
  dokusya_chushi_date!: string;
}
