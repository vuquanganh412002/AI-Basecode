import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Tanka } from '@/database/entities/tanka.entity';
import { todayIsoJst } from '@/common/utils/datetime';
import type { BatchJob } from '@/batch/batch-job.interface';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { SystemActor } from '@/common/constants/system-actor.constant';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { logBatchRun } from '../batch-run-audit';

/**
 * 単価 有効期限切れバッチ（顧客レビュー 2026-07 No.1・「問題なし」で確定）。
 *
 * m_tanka の適用終了日(tekiyo_end_date)が過ぎた「運用上有効(active_flg=TRUE)」の
 * 単価を active_flg=FALSE にする。冪等（何度実行しても同結果）。
 *
 * 条件（1本の UPDATE で処理）:
 *   - active_flg = TRUE      … 既に FALSE は対象外
 *   - tekiyo_end_date IS NOT NULL … NULL=無期限は対象外（＝失効しない）
 *   - tekiyo_end_date < 当日(JST) … 当日はまだ有効なので `<`
 *   - deleted_at IS NULL     … 論理削除済みは対象外
 *
 * 一方向のみ（失効 → FALSE）。FALSE→TRUE の復帰はしない（active_flg は運用者の
 * 手動フラグでもあるため、期限内でも手動 FALSE を尊重する）。
 *
 * スケジュール(0:05 JST)は agrinews-terraform の EventBridge ルールが持つ。
 * エントリ: src/batch/tanka-expire.main.ts（`npm run tanka:expire:{dev,prod}`）。
 */
@Injectable()
export class TankaExpireService implements BatchJob {
  private readonly logger = new Logger(TankaExpireService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();

    const res = await this.db
      .createQueryBuilder()
      .update(Tanka)
      .set({ activeFlg: false })
      .where('active_flg = true')
      .andWhere('tekiyo_end_date IS NOT NULL')
      // 当日はまだ有効なので厳密不等号。tekiyo_end_date は DATE、today は
      // JST の YYYY-MM-DD 文字列。
      .andWhere('tekiyo_end_date < :today', { today })
      .andWhere('deleted_at IS NULL')
      .execute();

    const affected = res.affected ?? 0;
    const durationMs = Date.now() - startedAt;

    this.logger.log({
      event: 'tanka_expire.done',
      affected,
      today,
      durationMs,
    });

    // 実行サマリを t_log へ 1 行（顧客要望 2026-08）。
    await logBatchRun(this.auditLog, {
      screen: ScreenName.TANKA_EXPIRE_BATCH,
      operation: '単価有効期限切れ',
      actor: SystemActor.BATCH_NIGHTLY, // 0:05 JST の夜間バッチ
      table: 'm_tanka',
      summary: { today, affected, durationMs },
    });
  }
}
