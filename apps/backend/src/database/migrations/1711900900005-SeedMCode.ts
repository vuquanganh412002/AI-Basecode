import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * シード: m_code（コードマスタ）
 *
 * 21 のコード分類（性別・支払方法・単価種類・お知らせ種別など）+
 * NOTIFICATION_STATUS の全コード値を一括投入する。
 * docs/database/seeder.md §5 を参照。
 *
 * FE は GET /api/v1/codes でこの内容を一度取得し useCodesStore で
 * セッション中キャッシュする。code_name を DB から書き換えると
 * 次回ログイン以降の FE 表示ラベルが切り替わる（再デプロイ不要）。
 *
 * 2026-05-20: consolidated patch AddNotificationStatusToTFileUpload1779172466000
 *             — see git history for the split version. The 4
 *             NOTIFICATION_STATUS rows are now seeded inline below.
 */
export class SeedMCode1711900900005 implements MigrationInterface {
  name = 'SeedMCode1711900900005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_code (code_category, code_value, code_name, code_name_short, sort_order, created_at, created_by, updated_at, updated_by) VALUES
      ('DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOKUSYA_SHUBETSU', '3', '併読（紙版＋電子版）', '併読', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DENSHI_DOKUSYA_SHUBETSU', '0', '無料', '無料', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DENSHI_DOKUSYA_SHUBETSU', '1', '有料', '有料', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '3', '振込集金', '振込集金', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '4', 'JA施設等', 'JA施設等', 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '5', '給与天引き', '給与天引き', 5, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('SHIHARAI_HOHO', '9', 'その他', 'その他', 7, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('GENDER', '1', '男性', '男性', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('GENDER', '2', '女性', '女性', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('GENDER', '9', '回答しない', '未回答', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('YOKIN_SHUBETSU', '1', '普通', '普通', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('YOKIN_SHUBETSU', '2', '当座', '当座', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ZEI_KUBUN', '1', '内税', '内税', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ZEI_KUBUN', '2', '外税', '外税', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TANKA_TYPE', '1', '購読料', '購読料', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TANKA_TYPE', '2', '配達手数料', '配達手数料', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ITAKU_KUBUN', '1', '振込', '振込', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ITAKU_KUBUN', '2', '日農委託', '日農委託', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('ITAKU_KUBUN', '9', 'その他', 'その他', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TESURYO_KUBUN', '1', 'JA', 'JA', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('TESURYO_KUBUN', '2', '販売店', '販売店', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('YUBIN_KUBUN', '0', '空', '空', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('YUBIN_KUBUN', '1', '郵送', '郵送', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('MAIL_MAGAZINE_FLG', '0', '配信しない', '配信しない', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('MAIL_MAGAZINE_FLG', '1', '配信する', '配信する', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_TYPE', '1', 'システム', 'システム', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_TYPE', '2', '重要', '重要', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_TYPE', '3', '一般', '一般', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_TYPE', '4', '締め切り時間', '締切時間', 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('PUBLISH_LOCATION', '1', 'ログイン画面', 'ログイン画面', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('PUBLISH_LOCATION', '2', 'メニュー画面', 'メニュー画面', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_STATUS', '1', '下書き', '下書き', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_STATUS', '2', '公開', '公開', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OSHIRASE_STATUS', '3', '非公開', '非公開', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOG_TYPE', '1', 'ユーザー操作', 'ユーザー操作', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOG_TYPE', '2', 'システム', 'システム', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOG_TYPE', '3', 'エラー', 'エラー', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOG_TYPE', '4', 'ファイルアップロード', 'ファイルUP', 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('RESULT_STATUS', '1', '成功', '成功', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('RESULT_STATUS', '2', '失敗', '失敗', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('RESULT_STATUS', '3', '警告', '警告', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('FILE_UPLOAD_STATUS', '1', '処理中', '処理中', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('FILE_UPLOAD_STATUS', '2', '完了', '完了', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('FILE_UPLOAD_STATUS', '3', 'エラー', 'エラー', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOWNLOAD_TYPE', '1', '口座振替', '口座振替', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOWNLOAD_TYPE', '2', 'その他', 'その他', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOWNLOAD_TYPE', '3', '増減連絡票', '増減連絡票', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOWNLOAD_TYPE', '4', '増減通知書', '増減通知書', 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('DOWNLOAD_TYPE', '5', '購読者名簿', '購読者名簿', 5, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOGIN_RESULT', '1', '成功', '成功', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('LOGIN_RESULT', '2', '失敗', '失敗', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OTP_TYPE', '1', 'ログイン', 'ログイン', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('OTP_TYPE', '2', 'パスワードリセット', 'PW変更', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('NOTIFICATION_STATUS', '1', '未送信', '未送信', 1, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('NOTIFICATION_STATUS', '2', '送信中', '送信中', 2, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('NOTIFICATION_STATUS', '3', '完了', '完了', 3, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM'),
      ('NOTIFICATION_STATUS', '4', '一部失敗', '一部失敗', 4, '2026-01-01', 'SYSTEM', '2026-01-01', 'SYSTEM')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE m_code RESTART IDENTITY CASCADE`);
  }
}
