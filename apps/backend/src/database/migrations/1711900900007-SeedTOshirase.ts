import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTOshirase1711900900007 implements MigrationInterface {
  name = 'SeedTOshirase1711900900007';

  /**
   * Seed public (ja_id IS NULL) oshirase entries shown on SCR-001 login screen.
   * publish_location=1 (login), status=2 (published).
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO t_oshirase (
        ja_id, oshirase_type, publish_location, status, title, content,
        publish_start_date, publish_end_date, target_kanri_kubun,
        created_at, created_by, updated_at, updated_by
      ) VALUES
      (
        NULL, 1, 1, 2,
        'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
        'サービス全般を一時停止いたします。',
        '2026-04-10', NULL, '',
        NOW(), 'SYSTEM', NOW(), 'SYSTEM'
      ),
      (
        NULL, 3, 1, 2,
        '新機能「購読者一括取込」リリースのお知らせ',
        'Excel ファイルから購読者情報を一括取込できるようになりました。',
        '2026-04-05', NULL, '',
        NOW(), 'SYSTEM', NOW(), 'SYSTEM'
      ),
      (
        NULL, 2, 1, 2,
        '利用規約改訂のご案内',
        '2026年4月1日付で利用規約を改訂いたしました。',
        '2026-04-01', NULL, '',
        NOW(), 'SYSTEM', NOW(), 'SYSTEM'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM t_oshirase WHERE ja_id IS NULL AND publish_location = 1`,
    );
  }
}
