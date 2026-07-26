import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { ShiharaiHoho } from '@/common/enums/shiharai-hoho.enum';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';

/**
 * 購読停止（解約確定）バッチ — `dokusya-apply-due` の第1段（Batch 2）。
 *
 * UI（Phase 1）で入力された購読中止日(dokusya_chushi_date)の到来日に、実際の
 * 解約行を1件追加し master に反映する（Phase 2）。実処理は既存の idempotent
 * ヘルパ `insertKaiyaku(m, dokusyaId, asOf)` に委譲（適用日=中止日、電子版は+1日、
 * 既に解約済/中止日なしは skip、zenkai_* / 後続行 relink / recompute も内部で実施）。
 *
 * 抽出条件（§6-2 修正版）:
 *   - 紙版(1)   : dokusya_chushi_date <= 当日        （<= で未実行日を取りこぼさない）
 *   - 電子版(2) : dokusya_chushi_date <= 当日-1      （適用日+1日が到来した分。
 *                 かつ shiharai_hoho <> クレカ — クレカは第3システム同期のため除外）
 *   - 併読(3) / 電子版クレカ : 除外（read-only）
 *
 * 1件失敗しても全体は止めない（per-row try/catch）。冪等。
 */
@Injectable()
export class DokusyaKaiyakuService {
  private readonly logger = new Logger(DokusyaKaiyakuService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();
    const yesterday = addDaysIso(today, -1);

    // master(t_dokusya) は予約中の中止日も反映済み（recomputeMaster の
    // scheduled-chushi 反映）なので、抽出は master 1本で足りる。
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
        await this.db.transaction((m) => insertKaiyaku(m, id, today));
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
