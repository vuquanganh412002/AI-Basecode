import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `m_tanka` にキャンペーンフラグ `campaign_flg` を追加する。
 *
 * active_flg と同じ BOOLEAN 運用フラグだが、既定値は FALSE（キャンペーン
 * 非対象が通常）。設計書・DBスキーマドキュメントの追加に合わせてコード側を
 * 同期するためのマイグレーション。
 *
 * `CreateMTanka` 本体も campaign_flg を含むよう更新済みのため、新規 DB は
 * 本 ALTER 無しで正しい状態になる。本マイグレーションは既にデプロイ済
 * （1711900800009 適用済）の環境向けにカラムを追加するためのもの。
 *
 * NOT NULL DEFAULT FALSE のため、既存行は FALSE で埋められ、campaign_flg を
 * 省略する既存の INSERT もそのまま動作する。
 */
export class AddMTankaCampaignFlg1711900900016 implements MigrationInterface {
  name = 'AddMTankaCampaignFlg1711900900016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_tanka ADD COLUMN campaign_flg BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN m_tanka.campaign_flg IS 'キャンペーンフラグ（TRUE: 有効, FALSE: 無効）'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_tanka DROP COLUMN campaign_flg`);
  }
}
