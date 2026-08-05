import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: m_account（アカウントマスタ）
 *
 * ログイン可能なユーザーアカウントを管理する。role_id によって
 * ロール（NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN /
 * JA_KANRI_SHITEN / HANBAITEN）が決まり、データスコープが
 * ja_id / kanri_shiten_id で制限される。
 *
 * カラム順序・型・NULL許容は docs/database/database-design.md §m_account に従う。
 * sub_email_1〜3 は通知先サブメールアドレス（最大3件）。
 * mfa_enable_flg は多要素認証の有効化フラグ。
 *
 * 2026-08-04: consolidated patch AlterMAccountAddShitenId1783600000000
 *             — see git history for the split version. The `shiten_id` column,
 *             its FK to m_shiten and IX_m_account_shiten_id are now declared
 *             inline below.
 */
export class CreateMAccount1711900800011 implements MigrationInterface {
  name = 'CreateMAccount1711900800011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE m_account (
        account_id BIGSERIAL PRIMARY KEY,                                   -- アカウントID（IDENTITY）
        login_id VARCHAR(20) NOT NULL,                                      -- ログインID
        password_hash VARCHAR(256) NOT NULL,                                -- パスワードハッシュ
        account_name VARCHAR(50) NOT NULL,                                  -- アカウント名
        role_id INTEGER NOT NULL,                                           -- 管理者区分（FK:m_roles）
        ja_id BIGINT,                                                       -- JA ID（日農はNULL、中央会・JA本店・JA管理支店は必須）
        kanri_shiten_id BIGINT,                                             -- 管理支店ID（JA管理支店のみ）
        shiten_id BIGINT,                                                   -- 所属支店ID（FK: m_shiten）。設定時はその支店の読者のみ参照・編集・追加可、帳票5画面は使用不可。NULL は従来どおり（顧客要件 2026-07）
        todofuken_code VARCHAR(2),                                          -- 都道府県コード（中央会・JA本店・JA管理支店で必須）※NULL許容
        paper_flg BOOLEAN NOT NULL DEFAULT false,                           -- 紙版取扱フラグ（DEFAULT false）
        denshi_flg BOOLEAN NOT NULL DEFAULT false,                          -- 電子版取扱フラグ（DEFAULT false）
        email VARCHAR(100) NOT NULL DEFAULT '',                             -- 通知先メールアドレス※空文字許容
        sub_email_1 VARCHAR(100) NOT NULL DEFAULT '',                       -- 通知先サブメールアドレス1※空文字許容
        sub_email_2 VARCHAR(100) NOT NULL DEFAULT '',                       -- 通知先サブメールアドレス2※空文字許容
        sub_email_3 VARCHAR(100) NOT NULL DEFAULT '',                       -- 通知先サブメールアドレス3※空文字許容
        password_updated_at TIMESTAMPTZ,                                    -- パスワード更新日時
        last_login_at TIMESTAMPTZ,                                          -- 最終ログイン日時
        login_failure_count INTEGER NOT NULL DEFAULT 0,                     -- ログイン失敗回数（DEFAULT 0）
        mfa_enable_flg BOOLEAN NOT NULL DEFAULT false,                      -- 多要素認証有効フラグ（DEFAULT false）
        account_lock_flg BOOLEAN NOT NULL DEFAULT false,                    -- アカウントロックフラグ（DEFAULT false）
        account_lock_at TIMESTAMPTZ,                                        -- アカウントロック日時
        biko TEXT NOT NULL DEFAULT '',                                      -- 備考※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_m_account_m_roles FOREIGN KEY (role_id) REFERENCES m_roles (role_id),
        CONSTRAINT FK_m_account_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id),
        CONSTRAINT FK_m_account_m_kanri_shiten FOREIGN KEY (kanri_shiten_id) REFERENCES m_kanri_shiten (kanri_shiten_id),
        CONSTRAINT fk_m_account_shiten FOREIGN KEY (shiten_id) REFERENCES m_shiten (shiten_id) ON DELETE RESTRICT,
        CONSTRAINT FK_m_account_m_todofuken FOREIGN KEY (todofuken_code) REFERENCES m_todofuken (todofuken_code),
        -- システム予約名の登録禁止（顧客要件 2026-08）。SYSTEM 単体はシード
        -- migration が監査列に入れる値、SYSTEM_* はバッチの実行者名
        -- （src/common/constants/system-actor.constant.ts）。t_dokusya_rireki の
        -- created_by で「電子版同期由来の読者か」を判別するため、一般ユーザが
        -- これらを名乗れると判定が壊れる。
        -- DTO 側（IsNotReservedLoginId）だけでは seeder や直接 SQL を素通しする
        -- ため DB でも塞ぐ。大文字小文字を区別しないのは DTO 側と同じ理由。
        -- LIKE を使わないのは、パターン中の下線がワイルドカード扱いになり、その
        -- エスケープ（バックスラッシュ+下線）が TS のテンプレートリテラルで潰れて
        -- SYSTEMATIC まで弾いてしまうため。LEFT との比較なら曖昧さが無い。
        CONSTRAINT CK_m_account_login_id_not_reserved
          CHECK (UPPER(login_id) <> 'SYSTEM' AND LEFT(UPPER(login_id), 7) <> 'SYSTEM_')
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_m_account_login_id ON m_account (login_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_ja_id ON m_account (ja_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_kanri_shiten_id ON m_account (kanri_shiten_id)`);
    // 引用符付き — 大文字のまま作られる（AlterMAccountAddShitenId1783600000000 と同じ）。
    await queryRunner.query(`CREATE INDEX "IX_m_account_shiten_id" ON m_account (shiten_id)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_todofuken_code ON m_account (todofuken_code)`);
    await queryRunner.query(`CREATE INDEX IX_m_account_role_id ON m_account (role_id)`);

    await queryRunner.query(`COMMENT ON TABLE m_account IS 'アカウントマスタ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.account_id IS 'アカウントID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.login_id IS 'ログインID'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.password_hash IS 'パスワードハッシュ'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.account_name IS 'アカウント名'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.role_id IS '管理者区分（FK:m_roles）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.ja_id IS 'JA ID（日農はNULL、中央会・JA本店・JA管理支店は必須）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.kanri_shiten_id IS '管理支店ID（JA管理支店のみ）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.shiten_id IS '所属支店ID（FK: m_shiten）。設定時はその支店の読者のみ参照・編集・追加可、帳票5画面は使用不可。NULL は従来どおり（顧客要件 2026-07）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.todofuken_code IS '都道府県コード（中央会・JA本店・JA管理支店で必須）※NULL許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.paper_flg IS '紙版取扱フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.denshi_flg IS '電子版取扱フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.email IS '通知先メールアドレス※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.sub_email_1 IS '通知先サブメールアドレス1※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.sub_email_2 IS '通知先サブメールアドレス2※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.sub_email_3 IS '通知先サブメールアドレス3※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.password_updated_at IS 'パスワード更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.last_login_at IS '最終ログイン日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.login_failure_count IS 'ログイン失敗回数（DEFAULT 0）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.mfa_enable_flg IS '多要素認証有効フラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.account_lock_flg IS 'アカウントロックフラグ（DEFAULT false）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.account_lock_at IS 'アカウントロック日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.biko IS '備考※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN m_account.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS m_account`);
  }
}
