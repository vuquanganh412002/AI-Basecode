import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMAccount1711900900006 implements MigrationInterface {
  name = 'SeedMAccount1711900900006';

  /**
   * Seed the default administrator account.
   *
   * - login_id: `admin`
   * - password: `Admin@1234`
   * - role:     NICHINO_ADMIN (role_id=1)
   * - mfa_enable_flg: false — scaffold default (toggle per account via UI later)
   *
   * The password_hash is bcrypt(cost=10, 'Admin@1234'). Reset on first login in production.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_account (
        login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id, todofuken_code,
        paper_flg, denshi_flg, email, password_updated_at, last_login_at,
        login_failure_count, account_lock_flg, account_lock_at, biko, mfa_enable_flg,
        created_at, created_by, updated_at, updated_by
      ) VALUES (
        'admin',
        '$2b$10$apStxwsx52mbnab98IOrWuY6UcakvNCgNgrhkVVJT.UQLwpZ0W2oS',
        '日農 管理者',
        1, NULL, NULL, NULL,
        false, false, 'admin@agrinews.jp', '2026-01-01', NULL,
        0, false, NULL, '初期管理者アカウント (Password: Admin@1234)', false,
        '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM m_account WHERE login_id='admin'`);
  }
}
