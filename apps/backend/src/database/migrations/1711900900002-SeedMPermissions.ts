import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMPermissions1711900900002 implements MigrationInterface {
  name = 'SeedMPermissions1711900900002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_permissions (permission_code, permission_name, description, created_at, created_by, updated_at, updated_by) VALUES
      ('dokusya.create', '購読者登録', '購読者情報の新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('dokusya.view', '購読者参照', '購読者明細検索・一覧表示', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('dokusya.update', '購読者編集', '購読者情報の編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('dokusya.delete', '購読者削除', '購読者情報の削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('dokusya.import', '購読者Excelデータ取込', '購読者情報のExcel一括取込', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('dokusya.replace_hanbaiten', '購読者販売店一括置換', '購読者の販売店を一括置換', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.create', '販売店登録', '販売店情報の新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.view', '販売店参照', '販売店明細検索・一覧表示', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.update', '販売店編集', '販売店情報の編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.delete', '販売店削除', '販売店情報の削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('hanbaiten.import', '販売店Excelデータ取込', '販売店情報のExcel一括取込', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('tanka.create', '単価登録', '単価マスタの新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('tanka.view', '単価参照', '単価マスタの検索・一覧表示', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('tanka.update', '単価編集', '単価マスタの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('tanka.delete', '単価削除', '単価マスタの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ja.create', 'JA登録', 'JAマスタの新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ja.view', 'JA参照', 'JAマスタの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ja.update', 'JA編集', 'JAマスタの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ja.delete', 'JA削除', 'JAマスタの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('shiten.create', '支店登録', '支店マスタの新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('shiten.view', '支店参照', '支店マスタの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('shiten.update', '支店編集', '支店マスタの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('shiten.delete', '支店削除', '支店マスタの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('kanri_shiten.create', '管理支店登録', '管理支店マスタの新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('kanri_shiten.view', '管理支店参照', '管理支店マスタの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('kanri_shiten.update', '管理支店編集', '管理支店マスタの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('kanri_shiten.delete', '管理支店削除', '管理支店マスタの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('account.create', 'アカウント登録', 'アカウントの新規作成', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('account.view', 'アカウント参照', 'アカウントの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('account.update', 'アカウント編集', 'アカウントの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('account.delete', 'アカウント削除', 'アカウントの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('oshirase.create', 'お知らせ登録', 'お知らせの新規登録', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('oshirase.view', 'お知らせ参照', 'お知らせの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('oshirase.update', 'お知らせ編集', 'お知らせの編集', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('oshirase.delete', 'お知らせ削除', 'お知らせの削除', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('file.upload', 'ファイルアップロード', 'ファイルのアップロード', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('file.download', 'ファイルダウンロード', 'ファイルのダウンロード', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('log.view', 'ログ参照', '操作ログの参照', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('koza_furikae.export', '口座振替データ出力', '口座振替データの出力（全銀フォーマット/Excel）', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('haitatsuryo.export', '配達手数料支払情報出力', '配達手数料支払情報の出力', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('report.export_meibo', '購読者名簿出力', '販売店別・管理支店別購読者名簿の出力', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('report.export_zougen_hanbaiten', '増減連絡票（販売店）出力', '販売店向け増減連絡票の出力', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('report.export_zougen_nichino', '増減通知（日本農業新聞）出力', '日本農業新聞向け増減通知の出力', '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE m_permissions RESTART IDENTITY CASCADE`);
  }
}
