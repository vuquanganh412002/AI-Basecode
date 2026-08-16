import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * シード: t_oshirase（お知らせテーブル — 「締め切り時間」固定行）
 *
 * 顧客スペックでプロジェクト全体に EXACTLY ONE 行だけ存在する
 * `oshirase_type=4`（締め切り時間）レコードをここで投入する。
 * ダッシュボードヘッダーのチップに常時表示される業務要件のため、
 * 本番・staging・dev すべての環境で必須となり、dev 専用の
 * `scripts/seed-dev.ts` ではなくマイグレーションで管理する。
 *
 * 旧版で投入していた 3 件のログイン画面用サンプル
 * （メンテナンス / 一括取込 / 利用規約改訂）は dev 専用の
 * `seed-dev.ts buildOshiraseSeeds()` に移行済。
 *
 * 2026-08-04: consolidated patch AddPublishLocationMenuDeadline1711900900013
 *             — see git history for the split version. その patch は本行を
 *             publish_location=2 → 3 へ UPDATE していたので、最初から 3 で
 *             INSERT する（m_code の '3' は SeedMCode1711900900005 で投入）。
 */
export class SeedTOshirase1711900900007 implements MigrationInterface {
  name = 'SeedTOshirase1711900900007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO t_oshirase (
        ja_id, oshirase_type, publish_location, status, title, content,
        publish_start_date, publish_end_date, target_kanri_kubun,
        created_at, created_by, updated_at, updated_by
      ) VALUES (
        NULL,         -- 全JA向け
        4,            -- oshirase_type=4: 締め切り時間
        3,            -- publish_location=3: メニュー画面（締め切り時間）専用枠
        2,            -- status=2: 公開
        '締め切り時間　14時まで',
        '当日処理分の集計を14時までに確定してください。14時以降の更新は翌営業日扱いとなります。',
        NOW(),        -- publish_start_date: 投入時から有効
        NULL,         -- publish_end_date: 無期限
        '',           -- target_kanri_kubun: 全選択
        NOW(), 'SYSTEM_MIGRATION', NOW(), 'SYSTEM_MIGRATION'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM t_oshirase WHERE oshirase_type = 4 AND title = '締め切り時間　14時まで'`,
    );
  }
}
