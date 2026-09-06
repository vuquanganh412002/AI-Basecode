import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * t_denshi_sync_state に failed_rows(JSONB) を追加する。
 *
 * dokusya-sync は失敗行を「block して全体を止める」のではなく、その行だけ skip して
 * 次の行へ進めるようにする（バッチ全体が1件の異常データで止まり続けるのを防ぐ、
 * 2026-08 運用要望）。skip した行を紛失させないための保険として、この列に
 * `[{ denshiKaiinId, firstFailedAt, lastFailedAt, attempts, lastError }, ...]`
 * を保持し、次回実行時に watermark とは別経路（id 直指定）で再試行する。
 * 解決（成功 or 対象外化）したら配列から取り除く。
 */
export class AddFailedRowsToTDenshiSyncState1787385181595
  implements MigrationInterface
{
  name = 'AddFailedRowsToTDenshiSyncState1787385181595';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_denshi_sync_state ADD COLUMN failed_rows JSONB NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN t_denshi_sync_state.failed_rows IS '取込失敗のため skip した電子版 users.id の再試行キュー（JSON配列）。dokusya-sync が毎回 id 直指定で再試行し、成功/対象外になったら取り除く。'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE t_denshi_sync_state DROP COLUMN failed_rows`,
    );
  }
}
