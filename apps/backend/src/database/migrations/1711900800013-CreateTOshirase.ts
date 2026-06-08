import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * テーブル: t_oshirase（お知らせテーブル）
 *
 * ログイン画面・メニュー画面に表示するお知らせを管理する。
 * ja_id=NULL のレコードは全 JA 向け。publish_location で
 * 表示場所を、status で公開状態を制御する。
 * docs/database/database-design.md §t_oshirase を参照。
 */
export class CreateTOshirase1711900800013 implements MigrationInterface {
  name = 'CreateTOshirase1711900800013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE t_oshirase (
        oshirase_id BIGSERIAL PRIMARY KEY,                                  -- お知らせID（IDENTITY）
        ja_id BIGINT,                                                       -- JA ID（FK:m_ja）NULL=全JA向け
        oshirase_type INTEGER NOT NULL,                                     -- お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間）
        publish_location INTEGER NOT NULL,                                  -- 公開場所（1:ログイン画面, 2:メニュー画面）
        status INTEGER NOT NULL,                                            -- 状態（1:下書き, 2:公開, 3:非公開）
        title VARCHAR(200) NOT NULL,                                        -- タイトル
        content TEXT NOT NULL,                                              -- 内容
        publish_start_date TIMESTAMPTZ NOT NULL,                            -- 公開開始日時
        publish_end_date TIMESTAMPTZ,                                       -- 公開終了日時（NULL=無期限）
        target_kanri_kubun VARCHAR(20) NOT NULL DEFAULT '',                 -- 対象管理者区分（カンマ区切り）※空文字許容
        deleted_at TIMESTAMPTZ DEFAULT NULL,                                -- 削除フラグ（DEFAULT NULL）
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 作成日時
        created_by VARCHAR(50) NOT NULL,                                    -- 作成者
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                      -- 更新日時
        updated_by VARCHAR(50) NOT NULL,                                    -- 更新者
        CONSTRAINT FK_t_oshirase_m_ja FOREIGN KEY (ja_id) REFERENCES m_ja (ja_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_publish ON t_oshirase (status, publish_location, publish_start_date)`);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_ja_status ON t_oshirase (ja_id, status)`);
    await queryRunner.query(`CREATE INDEX IX_t_oshirase_deleted_at ON t_oshirase (deleted_at)`);

    await queryRunner.query(`COMMENT ON TABLE t_oshirase IS 'お知らせテーブル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.oshirase_id IS 'お知らせID（IDENTITY）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.ja_id IS 'JA ID（FK:m_ja）NULL=全JA向け'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.oshirase_type IS 'お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.publish_location IS '公開場所（1:ログイン画面, 2:メニュー画面）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.status IS '状態（1:下書き, 2:公開, 3:非公開）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.title IS 'タイトル'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.content IS '内容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.publish_start_date IS '公開開始日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.publish_end_date IS '公開終了日時（NULL=無期限）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.target_kanri_kubun IS '対象管理者区分（カンマ区切り）※空文字許容'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.deleted_at IS '削除フラグ（DEFAULT NULL）'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.created_at IS '作成日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.created_by IS '作成者'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.updated_at IS '更新日時'`);
    await queryRunner.query(`COMMENT ON COLUMN t_oshirase.updated_by IS '更新者'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS t_oshirase`);
  }
}
