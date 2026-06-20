import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `m_hanbaiten` の手数料関連カラムを新名称へリネームする。
 *
 *   tesuryo_kubun  → furikomi_tesuryo_futan_kubun （振込手数料負担区分）
 *   tesuryo_amount → furikomi_tesuryo            （振込手数料）
 *
 * 当初の `CreateMHanbaiten` マイグレーション（1711900800010）は旧名称
 * （tesuryo_kubun / tesuryo_amount）で作成していた。設計書・DBスキーマ
 * ドキュメントの名称変更に合わせ、エンティティ / DTO / API / FE 側を
 * 新名称へ統一したため、DB カラムも揃える。
 *
 * `CreateMHanbaiten` 本体も新名称へ更新済みのため、新規 DB は本 ALTER 無しで
 * 正しい状態になる。本マイグレーションは既にデプロイ済（1711900800010 適用済）
 * の環境向けにカラム名を反映するためのもの。
 *
 * m_code カテゴリ CODE（TESURYO_KUBUN）および値（1:JA / 2:販売店）は不変。
 */
export class AlterMHanbaitenRenameTesuryoColumns1711900900015
  implements MigrationInterface
{
  name = 'AlterMHanbaitenRenameTesuryoColumns1711900900015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 冪等化: 旧名カラムが存在する場合のみリネームする。CreateMHanbaiten 本体は
    // 既に新名称で作成するため、新規 DB（migration を頭から流す環境 / DR / CI の
    // 統合テスト用 DB）では旧カラムが無く、無ガードだと RENAME が
    // 「column "tesuryo_kubun" does not exist」で失敗していた。hasColumn で
    // ガードし、既デプロイ環境ではリネーム、新規環境では no-op にする。
    if (await queryRunner.hasColumn('m_hanbaiten', 'tesuryo_kubun')) {
      await queryRunner.query(
        `ALTER TABLE m_hanbaiten RENAME COLUMN tesuryo_kubun TO furikomi_tesuryo_futan_kubun`,
      );
    }
    if (await queryRunner.hasColumn('m_hanbaiten', 'tesuryo_amount')) {
      await queryRunner.query(
        `ALTER TABLE m_hanbaiten RENAME COLUMN tesuryo_amount TO furikomi_tesuryo`,
      );
    }
    await queryRunner.query(
      `COMMENT ON COLUMN m_hanbaiten.furikomi_tesuryo_futan_kubun IS '振込手数料負担区分（1:JA, 2:販売店）'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN m_hanbaiten.furikomi_tesuryo IS '振込手数料'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten RENAME COLUMN furikomi_tesuryo_futan_kubun TO tesuryo_kubun`,
    );
    await queryRunner.query(
      `ALTER TABLE m_hanbaiten RENAME COLUMN furikomi_tesuryo TO tesuryo_amount`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN m_hanbaiten.tesuryo_kubun IS '手数料区分（1:JA, 2:販売店）'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN m_hanbaiten.tesuryo_amount IS '手数料金額'`,
    );
  }
}
