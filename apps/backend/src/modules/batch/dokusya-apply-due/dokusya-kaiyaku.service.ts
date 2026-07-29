import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { ShiharaiHoho } from '@/common/enums/shiharai-hoho.enum';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { isDigitalOrBoth } from '@/modules/dokusya/dokusya-shubetsu.rules';
import { DenshibanPushService } from '@/modules/denshiban/denshiban-push.service';
import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';

/**
 * 解約確定バッチ — dokusya-apply-due の第1段。購読中止日の到来日に解約行を1件追加し
 * master へ反映（idempotent ヘルパ insertKaiyaku に委譲）。per-row try/catch で
 * 1件失敗しても全体は止めない。
 *
 * 抽出条件（§6-2）:
 *   - 紙版(1)   : dokusya_chushi_date <= 当日
 *   - 電子版(2) : dokusya_chushi_date <= 当日-1（適用日+1日）かつ shiharai_hoho≠クレカ
 *   - 併読(3) / 電子版クレカ : 除外（read-only）
 */
/** 購読中止日 'YYYY-MM-DD' → cancel_ym 'YYYYMM'（電子版 cancel の解約対象月）。 */
function toCancelYm(chushiDate: string | null): string {
  return (chushiDate ?? '').replaceAll('-', '').slice(0, 6);
}

@Injectable()
export class DokusyaKaiyakuService {
  private readonly logger = new Logger(DokusyaKaiyakuService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly denshiPush: DenshibanPushService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();
    const yesterday = addDaysIso(today, -1);

    // master は予約中の中止日も反映済み（recomputeMaster）なので抽出は master 1本で足りる。
    const rows: { dokusya_id: string }[] = await this.db.query(
      `SELECT dokusya_id FROM t_dokusya
        WHERE deleted_at IS NULL
          AND dokusya_chushi_date IS NOT NULL
          AND (
            (dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3) OR
            (dokusya_shubetsu = $2 AND dokusya_chushi_date <= $4 AND shiharai_hoho <> $5)
          )
        ORDER BY dokusya_id`,
      [
        DokusyaShubetsu.PAPER,
        DokusyaShubetsu.DIGITAL,
        today,
        yesterday,
        ShiharaiHoho.CREDIT_CARD,
      ],
    );

    let ok = 0;
    let ng = 0;
    for (const { dokusya_id } of rows) {
      const id = Number(dokusya_id);
      try {
        await this.db.transaction(async (m) => {
          await insertKaiyaku(m, id, today);
          // cloud → 電子版 cancel（cloud 起点の解約なので echo ではない）。抽出は解約
          // 確定のため紙版も含むが、紙版は push を呼ばない。push 失敗はこの行の tx を
          // ロールバック → 翌バッチで再試行（idempotent）。
          const after = await m.findOne(Dokusya, { where: { dokusyaId: id } });
          if (after && isDigitalOrBoth(after.dokusyaShubetsu)) {
            await this.denshiPush.pushOnBatch(m, {
              action: 'cancel',
              after,
              cancelYm: toCancelYm(after.dokusyaChushiDate),
            });
          }
        });
        ok++;
      } catch (err) {
        ng++; // 1件失敗で全体を止めない
        this.logger.error({
          event: 'kaiyaku.fail',
          dokusyaId: id,
          message: (err as Error).message,
        });
      }
    }

    this.logger.log({
      event: 'kaiyaku.done',
      today,
      target: rows.length,
      ok,
      ng,
      durationMs: Date.now() - startedAt,
    });
  }
}
