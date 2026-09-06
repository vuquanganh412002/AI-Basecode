import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * シード: m_code（コードマスタ）
 *
 * 23 のコード分類（性別・支払方法・単価種類・お知らせ種別など）+
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
 * 2026-08-04: consolidated patch AddPublishLocationMenuDeadline1711900900013
 *             — see git history for the split version. PUBLISH_LOCATION='3'
 *             は他の PUBLISH_LOCATION と同じ位置に並べる。biko を持つのは
 *             この 1 行だけだが、列リストに biko を加えて他行を '' にすれば
 *             INSERT は 1 本で済む（'' は列 DEFAULT と同値）。
 */
export class SeedMCode1711900900005 implements MigrationInterface {
  name = 'SeedMCode1711900900005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO m_code (
        code_category, code_value, code_name, code_name_short, sort_order,
        biko, created_at, created_by, updated_at, updated_by
      ) VALUES
      ('DOKUSYA_SHUBETSU', '1', '紙版', '紙版', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYA_SHUBETSU', '2', '電子版', '電子版', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYA_SHUBETSU', '3', '併読（紙版＋電子版）', '併読', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TETSUZUKI_SHURUI', '0', '解約', '解約', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TETSUZUKI_SHURUI', '1', '新規', '新規', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DENSHI_DOKUSYA_SHUBETSU', '0', '無料', '無料', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DENSHI_DOKUSYA_SHUBETSU', '1', '有料', '有料', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '1', '口座引落', '口座引落', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '2', '現金集金', '現金集金', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '3', '振込集金', '振込集金', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '4', 'JA施設等', 'JA施設等', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '5', '給与天引き', '給与天引き', 5, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '6', 'クレジットカード', 'クレカ', 6, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('SHIHARAI_HOHO', '9', 'その他', 'その他', 7, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('GENDER', '1', '男性', '男性', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('GENDER', '2', '女性', '女性', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('GENDER', '9', '回答しない', '未回答', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('YOKIN_SHUBETSU', '1', '普通', '普通', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('YOKIN_SHUBETSU', '2', '当座', '当座', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('ZEI_KUBUN', '1', '内税', '内税', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('ZEI_KUBUN', '2', '外税', '外税', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TANKA_TYPE', '1', '購読料', '購読料', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TANKA_TYPE', '2', '配達手数料', '配達手数料', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('ITAKU_KUBUN', '1', '振込', '振込', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('ITAKU_KUBUN', '2', '日農委託', '日農委託', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('ITAKU_KUBUN', '9', 'その他', 'その他', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TESURYO_KUBUN', '1', 'JA', 'JA', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('TESURYO_KUBUN', '2', '販売店', '販売店', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('YUBIN_KUBUN', '0', '配達', '配達', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('YUBIN_KUBUN', '1', '郵送', '郵送', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('MAIL_MAGAZINE_FLG', '0', '配信しない', '配信しない', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('MAIL_MAGAZINE_FLG', '1', '配信する', '配信する', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_TYPE', '1', 'システム', 'システム', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_TYPE', '2', '重要', '重要', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_TYPE', '3', '一般', '一般', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_TYPE', '4', '締め切り時間', '締切時間', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('PUBLISH_LOCATION', '1', 'ログイン画面', 'ログイン画面', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('PUBLISH_LOCATION', '2', 'メニュー画面', 'メニュー画面', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      -- 締め切り時間（お知らせ種別=4）専用の掲載場所。メニュー画面ヘッダーの専用枠に
      -- 出すため、通常の「メニュー画面」(=2) とは別コードにしている。
      ('PUBLISH_LOCATION', '3', 'メニュー画面（締め切り時間）', '締切時間', 3, 'お知らせ種別=4 (締め切り時間) 専用枠。1件のみ運用される。', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_STATUS', '1', '下書き', '下書き', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_STATUS', '2', '公開', '公開', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OSHIRASE_STATUS', '3', '非公開', '非公開', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOG_TYPE', '1', 'ユーザー操作', 'ユーザー操作', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOG_TYPE', '2', 'システム', 'システム', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOG_TYPE', '3', 'エラー', 'エラー', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOG_TYPE', '4', 'ファイルアップロード', 'ファイルUP', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('RESULT_STATUS', '1', '成功', '成功', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('RESULT_STATUS', '2', '失敗', '失敗', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('RESULT_STATUS', '3', '警告', '警告', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('FILE_UPLOAD_STATUS', '1', '処理中', '処理中', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('FILE_UPLOAD_STATUS', '2', '完了', '完了', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('FILE_UPLOAD_STATUS', '3', 'エラー', 'エラー', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOWNLOAD_TYPE', '1', '口座振替', '口座振替', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOWNLOAD_TYPE', '2', 'その他', 'その他', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOWNLOAD_TYPE', '3', '増減連絡票', '増減連絡票', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOWNLOAD_TYPE', '4', '増減通知書', '増減通知書', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOWNLOAD_TYPE', '5', '購読者名簿', '購読者名簿', 5, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOGIN_RESULT', '1', '成功', '成功', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('LOGIN_RESULT', '2', '失敗', '失敗', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OTP_TYPE', '1', 'ログイン', 'ログイン', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('OTP_TYPE', '2', 'パスワードリセット', 'PW変更', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOTIFICATION_STATUS', '1', '未送信', '未送信', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOTIFICATION_STATUS', '2', '送信中', '送信中', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOTIFICATION_STATUS', '3', '完了', '完了', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOTIFICATION_STATUS', '4', '一部失敗', '一部失敗', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYASO_BUNRUI', '0', '農業者', '農業者', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYASO_BUNRUI', '1', 'JAグループ役職員', 'JA役職員', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYASO_BUNRUI', '2', '企業・団体', '企業・団体', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYASO_BUNRUI', '3', '学生', '学生', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('DOKUSYASO_BUNRUI', '999', 'その他', 'その他', 5, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '0', '米', '米', 1, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '1', '野菜', '野菜', 2, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '2', '果実', '果実', 3, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '3', '花', '花', 4, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '4', '畜産', '畜産', 5, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '5', '酪農', '酪農', 6, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION'),
      ('NOGYOSYA_BUNRUI', '999', 'その他', 'その他', 7, '', '2026-01-01', 'SYSTEM_MIGRATION', '2026-01-01', 'SYSTEM_MIGRATION')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE m_code RESTART IDENTITY CASCADE`);
  }
}
