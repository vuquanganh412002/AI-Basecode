import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Body for `POST /api/v1/dokusya/:dokusya_id/stop` — 購読停止（解約予約）.
 *
 * SCR-014 一覧の「購読を停止する」ボタンから呼ぶ専用エンドポイント。購読中止日
 * (解約予定日) だけを受け取り、Phase 1 の予約行 (`insertScheduledKaiyaku`) を1件挿入
 * する。値の意味は購読種別で異なるが、送信形はどちらも `YYYY-MM-DD`:
 *   - 紙版 (dokusya_shubetsu=1): カレンダーで選んだ日付そのもの。
 *   - 電子版 (dokusya_shubetsu=2): 選択した「終了月」の月末日（FE が月末に丸める）。
 *
 * 種別ごとの相対チェック（紙版=購読開始日以降/未来日/最終変更適用日より後、
 * 電子版=請求開始月以降・当月以降）は service.stop が担う。DTO は形だけ検証する。
 */
export class StopDokusyaDto {
  @ApiProperty({
    description:
      '購読中止日（解約予定日）。紙版はカレンダー選択日、電子版は選択月の月末日。',
    example: '2026-08-31',
  })
  @IsString({ message: '購読中止日を入力してください。' })
  @IsNotEmpty({ message: '購読中止日を入力してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '購読中止日の形式が正しくありません。',
  })
  dokusya_chushi_date!: string;
}
