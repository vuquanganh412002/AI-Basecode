---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: データベース設計書
format_code: 17-BM/PM/VTI
format_version: "1.0"
issue_date: 2019-02-22
created_date: 2026/03/17
created_by: Tran Duc Tuyen
updated_date: 2026/04/02
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No | 発行日 | バージョン | 担当者 | 変更内容 | 確認者 | 承認者 |
|---|---|---|---|---|---|---|
| 1 | 2026/03/17 | 1 | Tran Duc Tuyen | 作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/03/27 | 1.1 | Tran Duc Tuyen | 作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3 | 2026/07/14 | 1.12 | Tran Duc Tuyen | m_account に shiten_id（所属支店ID）とインデックス IX_m_account_shiten_id を追加。JA管理支店アカウントの購読者スコープを支店単位に制限（顧客要件2026-07） | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムである。
購読者情報、購読履歴、口座振替データ等を管理する機能を提供する。

主な機能は以下の通りである。
   ・ 購読者情報の登録・更新・検索
   ・ 購読内容の変更履歴管理
   ・ 口座振替データの作成および管理
   ・ ファイルのアップロード／ダウンロード機能
   ・ システムのお知らせ管理

また、セキュリティおよび監査機能として、以下の機能を提供する。
   ・ ユーザーログイン管理
   ・ ログイン履歴の記録
   ・ 操作ログの記録

## 資料概要

本資料は、当システムにおけるデータベース設計について定義するものである。

## 関連資料

| No | 資料コード | 資料名 |
|---|---|---|
| 1 | ACSMS-SCR-XXX | 画面設計書 |
| 2 | ACSMS-API-XXX-YYY | API設計書 |

---

# m_account (アカウントマスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | account_id | 〇 | BIGINT |  | 〇 |  | アカウントID（IDENTITY） |
| 2 | login_id |  | VARCHAR | 20 |  |  | ログインID |
| 3 | password_hash |  | VARCHAR | 256 |  |  | パスワードハッシュ |
| 4 | account_name |  | VARCHAR | 50 |  |  | アカウント名 |
| 5 | role_id |  | INTEGER |  |  |  | 管理者区分。m_roles.role_idを参照する外部キー |
| 6 | ja_id |  | BIGINT |  |  | 〇 | JA ID（外部キー）日農はNULL、中央会・JA本店・JA管理支店は必須 |
| 7 | kanri_shiten_id |  | BIGINT |  |  | 〇 | 管理支店ID（JA管理支店のみ） |
| 8 | shiten_id |  | BIGINT |  |  | 〇 | 所属支店ID（外部キー → m_shiten.shiten_id）。JA管理支店ロールのみ設定可。NULL=支店制限なし（従来動作）。非NULL=当該支店の購読者のみ参照・編集・追加可（制限①）＋帳票5画面（口座振替/配達手数料/購読者名簿/増減連絡票/増減通知）使用不可（制限②）。顧客要件2026-07 |
| 9 | todofuken_code |  | VARCHAR | 2 |  | 〇 | 都道府県コードは中央会・JA本店・JA管理支店で必須項目とする。※NULL許容 |
| 10 | paper_flg |  | BOOLEAN |  |  |  | 紙版取扱フラグ（DEFAULT false） |
| 11 | denshi_flg |  | BOOLEAN |  |  |  | 電子版取扱フラグ（DEFAULT false）※承認機能有効化に関係 |
| 12 | email |  | VARCHAR | 100 |  |  | 通知先メールアドレス※空文字許容 |
| 13 | sub_email_1 |  | VARCHAR | 100 |  |  | 通知先サブメールアドレス1※空文字許容 |
| 14 | sub_email_2 |  | VARCHAR | 100 |  |  | 通知先サブメールアドレス2※空文字許容 |
| 15 | sub_email_3 |  | VARCHAR | 100 |  |  | 通知先サブメールアドレス3※空文字許容 |
| 16 | password_updated_at |  | TIMESTAMPTZ |  |  | 〇 | パスワード更新日時 |
| 17 | last_login_at |  | TIMESTAMPTZ |  |  | 〇 | 最終ログイン日時 |
| 18 | login_failure_count |  | INTEGER |  |  |  | ログイン失敗回数（DEFAULT 0） |
| 19 | mfa_enable_flg |  | BOOLEAN |  |  |  | 多要素認証有効フラグ（DEFAULT false） |
| 20 | account_lock_flg |  | BOOLEAN |  |  |  | アカウントロックフラグ（DEFAULT false） |
| 21 | account_lock_at |  | TIMESTAMPTZ |  |  | 〇 | アカウントロック日時 |
| 22 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 23 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 24 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 25 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 26 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 27 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_account | account_id | 〇 |  | 主キー |
| 2 | UQ_m_account_login_id | login_id |  | 〇 | ログインIDの一意制約 |
| 3 | IX_m_account_ja_id | ja_id |  |  | JAマスタ参照用（外部キー） |
| 4 | IX_m_account_kanri_shiten_id | kanri_shiten_id |  |  | 管理支店マスタ参照用（外部キー） |
| 5 | IX_m_account_shiten_id | shiten_id |  |  | 支店マスタ参照用（外部キー）。所属支店による購読者スコープ絞込用。顧客要件2026-07 |
| 6 | IX_m_account_todofuken_code | todofuken_code |  |  | 都道府県マスタ参照用（外部キー） |
| 7 | IX_m_account_role_id | role_id |  |  | ロールによる検索用 |

---

# m_roles (ロールマスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | role_id | 〇 | BIGINT |  | 〇 |  | ロールID（IDENTITY） |
| 2 | role_code |  | VARCHAR | 50 |  |  | ロールコード（例：NICHINO_ADMIN） |
| 3 | role_name |  | VARCHAR | 100 |  |  | ロール名（例：日農） |
| 4 | description |  | TEXT |  |  | 〇 | 説明 |
| 5 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL） |
| 6 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 7 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 8 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 9 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_roles | role_id | 〇 |  | 主キー |
| 2 | UQ_m_roles_role_code | role_code |  | 〇 | ロールコードの一意制約 |
| 3 | IX_m_roles_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_permissions (権限マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | permission_id | 〇 | BIGINT |  | 〇 |  | 権限ID（IDENTITY） |
| 2 | permission_code |  | VARCHAR | 50 |  |  | 権限コード（例：SUBSCRIBER_SEARCH） |
| 3 | permission_name |  | VARCHAR | 100 |  |  | 権限名（例：購読者明細検索） |
| 4 | description |  | TEXT |  |  | 〇 | 説明 |
| 5 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL） |
| 6 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 7 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 8 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 9 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_permissions | permission_id | 〇 |  | 主キー |
| 2 | UQ_m_permissions_code | permission_code |  | 〇 | 権限コードの一意制約 |
| 3 | IX_m_permissions_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_roles_permissions (ロール権限紐付けテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | role_permission_id | 〇 | BIGINT |  | 〇 |  | ロール権限ID（IDENTITY） |
| 2 | role_id |  | BIGINT |  |  |  | ロールID（m_roles.role_id） |
| 3 | permission_id |  | BIGINT |  |  |  | 権限ID（m_permissions.permission_id） |
| 4 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除日時（soft delete） |
| 5 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 6 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 7 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 8 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_roles_permissions | role_permission_id | 〇 |  | 主キー |
| 2 | UQ_m_roles_permissions | role_id, permission_id |  | 〇 | ロール×権限の一意制約 |
| 3 | IX_m_roles_permissions_role_id | role_id |  |  | ロール検索用（FK） |
| 4 | IX_m_roles_permissions_permission_id | permission_id |  |  | 権限検索用（FK） |
| 5 | IX_m_roles_permissions_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# t_mfa_otp (MFAワンタイムパスワード)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | otp_id | 〇 | BIGINT |  | 〇 |  | OTP ID（IDENTITY） |
| 2 | account_id |  | BIGINT |  |  |  | アカウントID（外部キー → m_account.account_id） |
| 3 | otp_code_hash |  | VARCHAR | 256 |  |  | OTPコードハッシュ（平文は保存しない） |
| 4 | otp_type |  | INTEGER |  |  |  | OTP種別（1:ログイン, 2:パスワードリセット）※m_code.code_category='OTP_TYPE'を参照 |
| 5 | expired_at |  | TIMESTAMPTZ |  |  |  | OTP有効期限 |
| 6 | verify_attempt_count |  | INTEGER |  |  | 〇 | OTP入力試行回数（DEFAULT 0） |
| 7 | resend_count |  | INTEGER |  |  | 〇 | OTP再送回数（DEFAULT 0） |
| 8 | used_flg |  | BOOLEAN |  |  | 〇 | 使用済フラグ（DEFAULT false） |
| 9 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_mfa_otp | otp_id | 〇 |  | 主キー |
| 2 | IX_t_mfa_otp_account_id | account_id |  |  | アカウント単位検索用（FK） |
| 3 | IX_t_mfa_otp_active | account_id, used_flg, expired_at |  |  | 有効OTP検索用 |
| 4 | IX_t_mfa_otp_expired_at | expired_at |  |  | 期限切れデータ削除用 |

---

# m_ja (JAマスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | 〇 | BIGINT |  | 〇 |  | JA ID（IDENTITY） |
| 2 | ja_code |  | VARCHAR | 10 |  |  | JAコード |
| 3 | ja_name |  | VARCHAR | 200 |  |  | JA名称 |
| 4 | ja_name_kana |  | VARCHAR | 200 |  |  | JA名称（カナ） |
| 5 | todofuken_code |  | VARCHAR | 2 |  |  | 都道府県コード |
| 6 | yubin_no |  | VARCHAR | 7 |  |  | 郵便番号 |
| 7 | address |  | VARCHAR | 200 |  |  | 住所 |
| 8 | tel |  | VARCHAR | 15 |  |  | 電話番号 |
| 9 | fax |  | VARCHAR | 15 |  |  | FAX番号※空文字許容 |
| 10 | email |  | VARCHAR | 100 |  |  | メールアドレス※空文字許容 |
| 11 | tanto_busho |  | VARCHAR | 100 |  |  | 担当部署名※空文字許容 |
| 12 | tanto_name |  | VARCHAR | 50 |  |  | 担当者名※空文字許容 |
| 13 | jastem_itakusha_code |  | VARCHAR | 10 |  |  | JASTEM_委託者コード※空文字許容 |
| 14 | jastem_itakusha_name |  | VARCHAR | 40 |  |  | JASTEM_委託者名※空文字許容 |
| 15 | jastem_ja_code |  | VARCHAR | 4 |  |  | JASTEM_農協番号※空文字許容 |
| 16 | jastem_ja_name |  | VARCHAR | 15 |  |  | JASTEM_農協名※空文字許容 |
| 17 | chuokai_flg |  | BOOLEAN |  |  |  | 1=中央会, 0=単協（DEFAULT 0） |
| 18 | zei_kubun |  | INTEGER |  |  |  | 税区分（1:内税, 2:外税） |
| 19 | biko |  | TEXT |  |  |  | 備考 |
| 20 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 21 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 22 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 23 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 24 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_ja | ja_id | 〇 |  | 主キー |
| 2 | UQ_m_ja_code | ja_code |  | 〇 | JAコードの一意制約 |
| 3 | IX_m_ja_todofuken_code | todofuken_code |  |  | 都道府県マスタ参照用（FK） |
| 4 | IX_m_ja_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_kanri_shiten (管理支店マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | kanri_shiten_id | 〇 | BIGINT |  | 〇 |  | 管理支店ID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（外部キー） |
| 3 | kanri_shiten_code |  | VARCHAR | 15 |  |  | 管理支店コード（1AA-BBBB-CCC形式）例としてBBBBが3300は中央会のコード。5XXXはJAのコード。OAシステム上の「農協コード」に該当する。1JA1管理支店コードではなく同一JAでも請求書を発行する単位を分割している場合、1JAが複数管理支店を持つことがある。 |
| 4 | kanri_shiten_name |  | VARCHAR | 100 |  |  | 管理支店名称 |
| 5 | kanri_shiten_name_kana |  | VARCHAR | 100 |  |  | 管理支店名称（カナ） |
| 6 | yubin_no |  | VARCHAR | 7 |  |  | 郵便番号 |
| 7 | todofuken_code |  | VARCHAR | 2 |  |  | 都道府県コード【必須】 |
| 8 | address |  | VARCHAR | 200 |  |  | 住所 |
| 9 | tel |  | VARCHAR | 15 |  |  | 電話番号 |
| 10 | fax |  | VARCHAR | 15 |  |  | FAX番号 |
| 11 | paper_flg |  | BOOLEAN |  |  |  | 紙版取扱フラグ（DEFAULT false） |
| 12 | denshi_flg |  | BOOLEAN |  |  |  | 電子版取扱フラグ（DEFAULT false） |
| 13 | biko |  | TEXT |  |  |  | 備考 |
| 14 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 16 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 18 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_kanri_shiten | kanri_shiten_id | 〇 |  | 主キー |
| 2 | UQ_m_kanri_shiten_code | kanri_shiten_code |  | 〇 | 管理支店コード一意 |
| 3 | IX_m_kanri_shiten_ja_id | ja_id |  |  | JAマスタ参照用（FK） |
| 4 | IX_m_kanri_shiten_todofuken_code | todofuken_code |  |  | 都道府県マスタ参照用（FK） |
| 5 | IX_m_kanri_shiten_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_shiten (支店マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | shiten_id | 〇 | BIGINT |  | 〇 |  | 支店ID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（外部キー） |
| 3 | shiten_code |  | VARCHAR | 10 |  |  | 支店コード |
| 4 | shiten_name |  | VARCHAR | 100 |  |  | 支店名称 |
| 5 | shiten_name_kana |  | VARCHAR | 100 |  |  | 支店名称（カナ） |
| 6 | kinyu_shiten_flg |  | BOOLEAN |  |  |  | 金融機関支店フラグ（DEFAULT false） |
| 7 | jastem_toriatsukai_tenpo_code |  | VARCHAR | 3 |  |  | JASTEM_データ送信取扱店舗コード※空文字許容 |
| 8 | jastem_tenpo_name |  | VARCHAR | 15 |  |  | JASTEM_店舗名※空文字許容 |
| 9 | jastem_tyokin_shubetsu |  | VARCHAR | 1 |  |  | JASTEM_貯金種別※空文字許容 |
| 10 | jastem_koza_no |  | VARCHAR | 7 |  |  | JASTEM_口座番号※空文字許容 |
| 11 | kanri_shiten_id |  | BIGINT |  |  |  | 管理支店ID（外部キー → m_kanri_shiten.kanri_shiten_id） |
| 12 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 13 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 14 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 15 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 16 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 17 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_shiten | shiten_id | 〇 |  | 主キー |
| 2 | UQ_m_shiten_ja_code | ja_id, shiten_code |  | 〇 | 同一JA内で一意 |
| 3 | IX_m_shiten_ja_id | ja_id |  |  | JAマスタ参照用（FK） |
| 4 | IX_m_shiten_kanri_shiten_id | kanri_shiten_id |  |  | 管理支店マスタ参照用（FK） |
| 5 | IX_m_shiten_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_tanka (単価マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | tanka_id | 〇 | BIGINT |  | 〇 |  | 単価ID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（外部キー） |
| 3 | tanka_code |  | VARCHAR | 10 |  |  | 単価コード |
| 4 | tanka_type |  | INTEGER |  |  |  | 単価種類（1:購読料, 2:配達手数料） |
| 5 | tanka_name |  | VARCHAR | 100 |  |  | 単価名称 |
| 6 | kingaku_zeikomi |  | NUMERIC | 10 |  |  | 金額（税込） |
| 7 | kingaku_zeinuki |  | NUMERIC | 10 |  |  | 金額（税抜） |
| 8 | tax_rate |  | NUMERIC | 5.2 |  |  | 税率（%）例:10.00 |
| 9 | tekiyo_start_date |  | DATE |  |  |  | 適用開始日 |
| 10 | tekiyo_end_date |  | DATE |  |  | 〇 | 適用終了日 |
| 11 | active_flg |  | BOOLEAN |  |  |  | 運用上の有効フラグ（DEFAULT TRUE）。FALSE時は新規割当不可。適用期間判定（tekiyo_start_date / tekiyo_end_date）とは独立 |
| 12 | campaign_flg |  | BOOLEAN |  |  |  | キャンペーンフラグ（TRUE: 有効, FALSE: 無効、DEFAULT FALSE、NOT NULL） |
| 13 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 14 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 16 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 18 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_tanka | tanka_id | 〇 |  | 主キー |
| 2 | UQ_m_tanka_ja_code | ja_id, tanka_code |  | 〇 | 同一JA内で一意 |
| 3 | IX_m_tanka_ja_id | ja_id |  |  | JAマスタ参照用（FK） |
| 4 | IX_m_tanka_type_name | tanka_type, tanka_name |  |  | 単価検索用 |
| 5 | IX_m_tanka_deleted_at | deleted_at |  |  | 論理削除データ除外用 |
| 6 | IX_m_tanka_active_flg_false | active_flg WHERE active_flg = FALSE |  |  | 停止中レコード抽出用（部分インデックス、少数派の active_flg=FALSE のみ） |

---

# m_hanbaiten (販売店マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | hanbaiten_id | 〇 | BIGINT |  | 〇 |  | 販売店ID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（外部キー） |
| 3 | hanbaiten_code |  | VARCHAR | 10 |  |  | 販売店コード |
| 4 | hanbaiten_name |  | VARCHAR | 100 |  |  | 販売店名 |
| 5 | hanbaiten_name_kana |  | VARCHAR | 100 |  |  | 販売店名（カナ）※空文字許容 |
| 6 | torihikisaki_no |  | VARCHAR | 20 |  |  | 適格請求書発行事業者番号※空文字許容 |
| 7 | todofuken_code |  | VARCHAR | 2 |  |  | 都道府県コード |
| 8 | yubin_no |  | VARCHAR | 7 |  |  | 郵便番号※空文字許容 |
| 9 | address |  | VARCHAR | 200 |  |  | 住所※空文字許容 |
| 10 | tel |  | VARCHAR | 15 |  |  | 電話番号※空文字許容 |
| 11 | fax |  | VARCHAR | 15 |  |  | FAX番号※空文字許容 |
| 12 | shocho_name |  | VARCHAR | 50 |  |  | 所長名※空文字許容 |
| 13 | itaku_kubun |  | INTEGER |  |  | 〇 | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 14 | haitatsuryo_tanka_id |  | BIGINT |  |  | 〇 | 配達手数料単価ID（FK:m_tanka） |
| 15 | haitatsuryo_shiharai_cycle |  | INTEGER |  |  | 〇 | 配達手数料支払サイクル（月数） |
| 16 | furikomi_tesuryo_futan_kubun |  | INTEGER |  |  | 〇 | 振込手数料負担区分（1:JA, 2:販売店） |
| 17 | furikomi_tesuryo |  | NUMERIC | 10 |  | 〇 | 振込手数料 |
| 18 | bank_code |  | VARCHAR | 4 |  |  | 金融機関コード |
| 19 | bank_name |  | VARCHAR | 100 |  |  | 金融機関名 |
| 20 | bank_branch_code |  | VARCHAR | 3 |  |  | 引落口座支店コード |
| 21 | bank_branch_name |  | VARCHAR | 100 |  |  | 引落口座支店名 |
| 22 | yokin_shubetsu |  | INTEGER |  |  | 〇 | 預金種別（1:普通, 2:当座） |
| 23 | koza_no |  | VARCHAR | 10 |  |  | 口座番号※空文字許容 |
| 24 | koza_meigi |  | VARCHAR | 50 |  |  | 口座名義※空文字許容 |
| 25 | haiten_flg |  | BOOLEAN |  |  |  | 廃店フラグ（DEFAULT false） |
| 26 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 27 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 28 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 29 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 30 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 31 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_hanbaiten | hanbaiten_id | 〇 |  | 主キー |
| 2 | UQ_m_hanbaiten_ja_code | ja_id, hanbaiten_code |  | 〇 | 同一JA内で一意 |
| 3 | IX_m_hanbaiten_ja_id | ja_id |  |  | JAマスタ参照用（FK） |
| 4 | IX_m_hanbaiten_haitatsuryo_tanka_id | haitatsuryo_tanka_id |  |  | 単価マスタ参照用（FK） |
| 5 | IX_m_hanbaiten_todofuken_code | todofuken_code |  |  | 都道府県マスタ参照用（FK） |
| 6 | IX_m_hanbaiten_deleted_at | deleted_at |  |  | 論理削除データ除外用 |

---

# m_todofuken (都道府県マスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | todofuken_code | 〇 | VARCHAR | 2 |  |  | 都道府県コード（01〜47） |
| 2 | todofuken_name |  | VARCHAR | 10 |  |  | 都道府県名 |
| 3 | todofuken_name_kana |  | VARCHAR | 20 |  |  | 都道府県名（カナ） |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_todofuken | todofuken_code | 〇 |  | 主キー |

---

# m_code (コードマスタ)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | code_id | 〇 | BIGINT |  | 〇 |  | コードID（IDENTITY） |
| 2 | code_category |  | VARCHAR | 50 |  |  | コード分類 |
| 3 | code_value |  | VARCHAR | 20 |  |  | コード値 |
| 4 | code_name |  | VARCHAR | 100 |  |  | コード名称 |
| 5 | code_name_short |  | VARCHAR | 50 |  |  | コード名称（略称）※空文字許容 |
| 6 | sort_order |  | INTEGER |  |  | 〇 | 表示順 |
| 7 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 8 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 9 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 10 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 11 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 12 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_m_code | code_id | 〇 | 〇 | 主キー |
| 2 | UQ_m_code_category_value | code_category, code_value |  | 〇 | 分類内で一意 |
| 3 | IX_m_code_sort_order | sort_order |  |  | 並び替え用 |
| 4 | IX_m_code_deleted_at | deleted_at |  |  | 論理削除除外用 |

---

# t_file_upload (ファイルアップロードテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | file_upload_id | 〇 | BIGINT |  | 〇 |  | ファイルアップロードID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  | 〇 | JA ID（FK:m_ja）※全JA向けの場合はNULL |
| 3 | upload_datetime |  | TIMESTAMPTZ |  |  |  | アップロード日時 |
| 4 | scheduled_delete_date |  | DATE |  |  | 〇 | 削除予定日 |
| 5 | file_name |  | VARCHAR | 255 |  |  | ファイル名 |
| 6 | file_path |  | VARCHAR | 500 |  |  | ファイルパス |
| 7 | file_size |  | INTEGER |  |  | 〇 | ファイルサイズ（バイト） |
| 8 | record_count |  | INTEGER |  |  | 〇 | レコード件数 |
| 9 | success_count |  | INTEGER |  |  | 〇 | 成功件数 |
| 10 | error_count |  | INTEGER |  |  | 〇 | エラー件数 |
| 11 | status |  | INTEGER |  |  |  | 処理ステータス（1:処理中, 2:完了, 3:エラー） |
| 12 | error_file_path |  | VARCHAR | 500 |  |  | エラーファイルパス※空文字許容 |
| 13 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 14 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 15 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 16 | notification_status |  | INTEGER |  |  |  | 通知ステータス（1:未送信, 2:送信中, 3:完了, 4:一部失敗）※m_code.code_category='NOTIFICATION_STATUS'を参照（DEFAULT 1） |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_file_upload | file_upload_id | 〇 |  | 主キー |
| 2 | IX_t_file_upload_ja_datetime | ja_id, upload_datetime |  |  | 一覧表示（最重要） |
| 3 | IX_t_file_upload_upload_datetime | upload_datetime |  |  | 期間検索用（任意） |

---

# t_file_download (ファイルダウンロードテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | file_download_id | 〇 | BIGINT |  | 〇 |  | ファイルダウンロードID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（FK:m_ja） |
| 3 | download_datetime |  | TIMESTAMPTZ |  |  |  | ダウンロード日時 |
| 4 | download_type |  | INTEGER |  |  |  | ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿） |
| 5 | scheduled_delete_date |  | TIMESTAMPTZ |  |  | 〇 | 削除予定日 |
| 6 | nichino_download_allowed_flg |  | BOOLEAN |  |  |  | 日農ダウンロード許可フラグ（TRUE:許可する, FALSE:許可しない、DEFAULT FALSE、NOT NULL） |
| 7 | file_name |  | VARCHAR | 255 |  |  | ファイル名 |
| 8 | file_path |  | VARCHAR | 500 |  |  | ファイルパス |
| 9 | file_size |  | INTEGER |  |  |  | ファイルサイズ（バイト） |
| 10 | record_count |  | INTEGER |  |  |  | レコード件数 |
| 11 | target_month |  | VARCHAR | 6 |  | 〇 | 対象年月（YYYYMM）※空文字許容 |
| 12 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL） |
| 13 | created_at |  | TIMESTAMPTZ |  |  | 〇 | 作成日時 |
| 14 | created_by |  | VARCHAR | 50 |  |  | 作成者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_file_download | file_download_id | 〇 |  | 主キー |
| 2 | IX_t_file_download_ja_datetime | ja_id, download_datetime |  |  | 一覧表示（最重要） |

---

# t_oshirase (お知らせテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | oshirase_id | 〇 | BIGINT |  | 〇 |  | お知らせID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  | 〇 | JA ID（FK:m_ja）NULL=全JA向け |
| 3 | oshirase_type |  | INTEGER |  |  |  | お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間） |
| 4 | publish_location |  | INTEGER |  |  |  | 公開場所（1:ログイン画面, 2:メニュー画面） |
| 5 | status |  | INTEGER |  |  |  | 状態（1:下書き, 2:公開, 3:非公開） |
| 6 | title |  | VARCHAR | 200 |  |  | タイトル |
| 7 | content |  | TEXT |  |  |  | 内容 |
| 8 | publish_start_date |  | TIMESTAMPTZ |  |  |  | 公開開始日時 |
| 9 | publish_end_date |  | TIMESTAMPTZ |  |  | 〇 | 公開終了日時（NULL=無期限） |
| 10 | target_kanri_kubun |  | VARCHAR | 20 |  |  | 対象管理者区分（カンマ区切り）※空文字許容 |
| 11 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 12 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 13 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 14 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 15 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_oshirase | oshirase_id | 〇 |  | 主キー |
| 2 | IX_t_oshirase_publish | status, publish_location, publish_start_date |  |  | 公開中検索（最重要） |
| 3 | IX_t_oshirase_ja_status | ja_id, status |  |  | JA別データ取得 |
| 4 | IX_t_oshirase_deleted_at | deleted_at |  |  | 論理削除除外 |

---

# t_log (操作ログテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | log_id | 〇 | BIGINT |  | 〇 |  | ログID（IDENTITY） |
| 2 | log_type |  | INTEGER |  |  |  | ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード） |
| 3 | log_datetime |  | TIMESTAMPTZ |  |  |  | ログ日時 |
| 4 | account_id |  | BIGINT |  |  | 〇 | アカウントID |
| 5 | ja_id |  | BIGINT |  |  | 〇 | JA ID |
| 6 | gamen_name |  | VARCHAR | 100 |  |  | 画面名※空文字許容 |
| 7 | operation |  | VARCHAR | 100 |  |  | 操作内容※空文字許容 |
| 8 | result_status |  | INTEGER |  |  |  | 結果ステータス（1:成功, 2:失敗, 3:警告） |
| 9 | target_id |  | BIGINT |  |  | 〇 | 操作対象ID |
| 10 | target_table |  | VARCHAR | 50 |  |  | 操作対象テーブル※空文字許容 |
| 11 | before_value |  | TEXT |  |  |  | 変更前値（JSON）※空文字許容 |
| 12 | after_value |  | TEXT |  |  |  | 変更後値（JSON）※空文字許容 |
| 13 | ip_address |  | VARCHAR | 50 |  |  | IPアドレス※空文字許容 |
| 14 | user_agent |  | VARCHAR | 500 |  |  | ユーザーエージェント※空文字許容 |
| 15 | error_message |  | TEXT |  |  |  | エラーメッセージ※空文字許容 |
| 16 | stack_trace |  | TEXT |  |  |  | スタックトレース※空文字許容 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_log | log_id | 〇 |  | 主キー |
| 2 | IX_t_log_type_datetime | log_type, log_datetime |  |  | ログ種別＋日時検索 |
| 3 | IX_t_log_account_id | ja_id, result_status |  |  | アカウント別検索 |
| 4 | IX_t_log_ja_id | ja_id |  |  | JA別データ取得 |

---

# t_login_log (ログインログテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | login_log_id | 〇 | BIGINT |  | 〇 |  | ログインログID（IDENTITY） |
| 2 | login_datetime |  | TIMESTAMPTZ |  |  |  | ログイン日時 |
| 3 | account_id |  | BIGINT |  |  | 〇 | アカウントID（FK:m_account） |
| 4 | login_id |  | VARCHAR | 20 |  |  | 入力されたログインID |
| 5 | login_result |  | INTEGER |  |  |  | ログイン結果（1:成功, 2:失敗） |
| 6 | failure_reason |  | VARCHAR | 100 |  |  | 失敗理由※空文字許容 |
| 7 | ip_address |  | VARCHAR | 50 |  |  | IPアドレス※空文字許容 |
| 8 | user_agent |  | VARCHAR | 500 |  |  | ユーザーエージェント※空文字許容 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_login_log | login_log_id | 〇 |  | 主キー |
| 2 | IX_t_login_log_datetime | login_datetime |  |  | ログイン日時検索 |
| 3 | IX_t_login_log_account_id | account_id |  |  | アカウント別検索 |

---

# t_dokusya (購読者テーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | dokusya_id | 〇 | BIGINT |  | 〇 |  | 購読者ID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（外部キー） |
| 3 | kanri_shiten_id |  | BIGINT |  |  | 〇 | 管理支店ID（外部キー） |
| 4 | shiten_id |  | BIGINT |  |  | 〇 | 支店ID（外部キー） |
| 5 | kumiaiin_code |  | VARCHAR | 20 |  |  | 組合員コード※空文字許容 |
| 6 | dokusya_shubetsu |  | INTEGER |  |  |  | 購読種別（1:紙版, 2:電子版, 3:併読） |
| 7 | tetsuzuki_shurui |  | INTEGER |  |  |  | 手続種類（0:解約, 1:新規） |
| 8 | denshi_dokusya_shubetsu |  | INTEGER |  |  | 〇 | 電子版読者種別（0:無料, 1:有料） |
| 9 | shimei_sei |  | VARCHAR | 50 |  |  | 氏名（姓） |
| 10 | shimei_mei |  | VARCHAR | 50 |  |  | 氏名（名） |
| 11 | shimei_kana_sei |  | VARCHAR | 100 |  |  | 氏名かな（姓） |
| 12 | shimei_kana_mei |  | VARCHAR | 100 |  |  | 氏名かな（名） |
| 13 | dokusya_busu |  | INTEGER |  |  |  | 購読部数 |
| 14 | yubin_no |  | VARCHAR | 7 |  |  | 郵便番号 |
| 15 | todofuken_code |  | VARCHAR | 2 |  |  | 都道府県コード |
| 16 | shikuchoson |  | VARCHAR | 100 |  |  | 市町村郡 |
| 17 | chome_banchi |  | VARCHAR | 100 |  |  | 丁目番地 |
| 18 | tatemono_mei |  | VARCHAR | 100 |  |  | マンション名等※空文字許容 |
| 19 | renrakusaki_1 |  | VARCHAR | 15 |  |  | 連絡先１※空文字許容 |
| 20 | renrakusaki_2 |  | VARCHAR | 15 |  |  | 連絡先２※空文字許容 |
| 21 | email |  | VARCHAR | 100 |  |  | メールアドレス※空文字許容 |
| 22 | mail_magazine_flg |  | INTEGER |  |  |  | メールマガジン（0:配信しない, 1:配信する） |
| 23 | birth_year |  | INTEGER |  |  | 〇 | 生年（西暦） |
| 24 | gender |  | INTEGER |  |  | 〇 | 性別（1:男性, 2:女性, 9:回答しない） |
| 25 | haitatsu_same_flg |  | BOOLEAN |  |  |  | 配達先情報指定（TRUE:購読者と同じ） |
| 26 | haitatsu_yubin_no |  | VARCHAR | 7 |  |  | 配達先郵便番号※空文字許容 |
| 27 | haitatsu_todofuken_code |  | VARCHAR | 2 |  |  | 配達先都道府県コード※空文字許容 |
| 28 | haitatsu_shikuchoson |  | VARCHAR | 100 |  |  | 配達先市町村郡※空文字許容 |
| 29 | haitatsu_chome_banchi |  | VARCHAR | 100 |  |  | 配達先丁目番地※空文字許容 |
| 30 | haitatsu_tatemono_mei |  | VARCHAR | 100 |  |  | 配達先建物名※空文字許容 |
| 31 | haitatsu_renrakusaki_1 |  | VARCHAR | 15 |  |  | 配達先連絡先１※空文字許容 |
| 32 | haitatsu_renrakusaki_2 |  | VARCHAR | 15 |  |  | 配達先連絡先２※空文字許容 |
| 33 | haitatsu_shimei_sei |  | VARCHAR | 50 |  |  | 配達先氏名（姓・漢字）※空文字許容 |
| 34 | haitatsu_shimei_mei |  | VARCHAR | 50 |  |  | 配達先氏名（名・漢字）※空文字許容 |
| 35 | haitatsu_shimei_kana_sei |  | VARCHAR | 100 |  |  | 配達先氏名かな（姓）※空文字許容 |
| 36 | haitatsu_shimei_kana_mei |  | VARCHAR | 100 |  |  | 配達先氏名かな（名）※空文字許容 |
| 37 | hanbaiten_id |  | BIGINT |  |  |  | 販売店ID（外部キー） |
| 38 | tanka_id |  | BIGINT |  |  |  | 単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1） |
| 39 | yubin_kubun |  | VARCHAR | 1 |  |  | 郵送区分（0:空, 1:郵送）DEFAULT 0 |
| 40 | shiharai_hoho |  | INTEGER |  |  |  | 支払方法（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他） |
| 41 | dokusyaryo_shiharai_cycle |  | INTEGER |  |  | 〇 | 購読料支払サイクル（月数） |
| 42 | bank_branch_code |  | VARCHAR | 3 |  |  | 引落口座支店コード |
| 43 | bank_branch_name |  | VARCHAR | 100 |  |  | 引落口座支店名 |
| 44 | hikiotoshi_yokin_shubetsu |  | INTEGER |  |  | 〇 | 引落口座貯金種目（1:普通, 2:当座） |
| 45 | hikiotoshi_koza_no |  | VARCHAR | 10 |  |  | 引落口座番号※空文字許容 |
| 46 | hikiotoshi_koza_meigi |  | VARCHAR | 50 |  |  | 引落口座名義※空文字許容 |
| 47 | dokusyaso_bunrui |  | VARCHAR | 50 |  |  | 購読者層分類（コードのカンマ区切り。0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。電子版 profession と 1:1）※空文字許容 |
| 48 | nogyosya_bunrui |  | VARCHAR | 50 |  |  | 農業者分類（コードのカンマ区切り。0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。電子版 products と 1:1）※空文字許容 |
| 49 | shoki_dokusya_kaishi_date |  | DATE |  |  |  | 初回購読開始日（変更時も保持） |
| 50 | dokusya_kaishi_date |  | DATE |  |  |  | 購読開始日 |
| 51 | dokusya_chushi_date |  | DATE |  |  | 〇 | 購読中止日 |
| 52 | joho_henko_tekiyo_date |  | DATE |  |  | 〇 | 読者情報変更適用日 |
| 53 | seikyu_kaishi_month |  | VARCHAR | 6 |  |  | 請求開始月（YYYYMM）※空文字許容 |
| 54 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 55 | rireki_no |  | INTEGER |  |  |  | 履歴No（最新の履歴番号） |
| 56 | denshi_shonin_status |  | INTEGER |  |  | 〇 | 電子申込承認ステータス |
| 57 | denshi_kaiin_id |  | BIGINT |  |  | 〇 | 電子版会員ID（外部システムの会員ID。外部連携機能が設定。全体一意） |
| 58 | honshi_kodoku_flg |  | BOOLEAN |  |  |  | 本紙購読フラグ（DEFAULT FALSE）。電子版読者管理システムの users.subscribe_flg（0:未購読, 1:購読）を連携。0→FALSE, 1→TRUE。購読種別=電子版の場合のみ画面に「紙版購読状況有り」と表示する。 |
| 59 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | 削除フラグ（DEFAULT NULL) |
| 60 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 61 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 62 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 63 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_dokusya | dokusya_id | 〇 |  | 主キー |
| 2 | IX_t_dokusya_ja_id | ja_id |  |  | JA別検索 |
| 3 | IX_t_dokusya_kanri_shiten_id | kanri_shiten_id |  |  | 管理支店別検索 |
| 4 | IX_t_dokusya_shiten_id | shiten_id |  |  | 支店別検索 |
| 5 | IX_t_dokusya_kumiaiin_code | kumiaiin_code |  |  | 組合員コード検索 |
| 6 | IX_t_dokusya_hanbaiten_id | hanbaiten_id |  |  | 販売店別検索 |
| 7 | IX_t_dokusya_ja_kumiaiin | ja_id, kumiaiin_code |  |  | 組合員コード複合検索 |
| 8 | IX_t_dokusya_hierarchy | ja_id, kanri_shiten_id, shiten_id |  |  | 階層検索 |
| 9 | UQ_t_dokusya_denshi_kaiin_id | denshi_kaiin_id |  | 〇 | 電子版会員ID一意（全レコード対象。NULL・削除済みを除く部分UNIQUE） |

---

# t_dokusya_rireki (購読者履歴テーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | dokusya_rireki_id | 〇 | BIGINT |  | 〇 |  | 購読者履歴ID（IDENTITY） |
| 2 | dokusya_id |  | BIGINT |  |  |  | 購読者ID（外部キー） |
| 3 | rireki_no |  | INTEGER |  |  |  | 履歴No（dokusya_id内の連番） |
| 4 | ja_id |  | BIGINT |  |  |  | JA ID |
| 5 | kanri_shiten_id |  | BIGINT |  |  | 〇 | 管理支店ID |
| 6 | shiten_id |  | BIGINT |  |  | 〇 | 支店ID |
| 7 | kumiaiin_code |  | VARCHAR | 20 |  |  | 組合員コード※空文字許容 |
| 8 | dokusya_shubetsu |  | INTEGER |  |  |  | 購読種別（1:紙版, 2:電子版, 3:併読） |
| 9 | tetsuzuki_shurui |  | INTEGER |  |  |  | 手続種類（0:解約, 1:新規） |
| 10 | denshi_dokusya_shubetsu |  | INTEGER |  |  | 〇 | 電子版読者種別（0:無料, 1:有料） |
| 11 | shimei_sei |  | VARCHAR | 50 |  |  | 氏名（姓） |
| 12 | shimei_mei |  | VARCHAR | 50 |  |  | 氏名（名） |
| 13 | shimei_kana_sei |  | VARCHAR | 100 |  |  | 氏名かな（姓） |
| 14 | shimei_kana_mei |  | VARCHAR | 100 |  |  | 氏名かな（名） |
| 15 | dokusya_busu |  | INTEGER |  |  |  | 購読部数 |
| 16 | yubin_no |  | VARCHAR | 7 |  |  | 郵便番号 |
| 17 | todofuken_code |  | VARCHAR | 2 |  |  | 都道府県コード |
| 18 | shikuchoson |  | VARCHAR | 100 |  |  | 市町村郡 |
| 19 | chome_banchi |  | VARCHAR | 100 |  |  | 丁目番地 |
| 20 | tatemono_mei |  | VARCHAR | 100 |  |  | マンション名等※空文字許容 |
| 21 | renrakusaki_1 |  | VARCHAR | 15 |  |  | 連絡先１※空文字許容 |
| 22 | renrakusaki_2 |  | VARCHAR | 15 |  |  | 連絡先２※空文字許容 |
| 23 | email |  | VARCHAR | 100 |  |  | メールアドレス※空文字許容 |
| 24 | mail_magazine_flg |  | INTEGER |  |  |  | メールマガジン（0:配信しない, 1:配信する） |
| 25 | birth_year |  | INTEGER |  |  | 〇 | 生年（西暦） |
| 26 | gender |  | INTEGER |  |  | 〇 | 性別（1:男性, 2:女性, 9:回答しない） |
| 27 | haitatsu_same_flg |  | BOOLEAN |  |  |  | 配達先情報指定（TRUE:購読者と同じ） |
| 28 | haitatsu_yubin_no |  | VARCHAR | 7 |  |  | 配達先郵便番号※空文字許容 |
| 29 | haitatsu_todofuken_code |  | VARCHAR | 2 |  |  | 配達先都道府県コード※空文字許容 |
| 30 | haitatsu_shikuchoson |  | VARCHAR | 100 |  |  | 配達先市町村郡※空文字許容 |
| 31 | haitatsu_chome_banchi |  | VARCHAR | 100 |  |  | 配達先丁目番地※空文字許容 |
| 32 | haitatsu_tatemono_mei |  | VARCHAR | 100 |  |  | 配達先建物名※空文字許容 |
| 33 | haitatsu_renrakusaki_1 |  | VARCHAR | 15 |  |  | 配達先連絡先１※空文字許容 |
| 34 | haitatsu_renrakusaki_2 |  | VARCHAR | 15 |  |  | 配達先連絡先２※空文字許容 |
| 35 | haitatsu_shimei_sei |  | VARCHAR | 50 |  |  | 配達先氏名（姓・漢字）※空文字許容 |
| 36 | haitatsu_shimei_mei |  | VARCHAR | 50 |  |  | 配達先氏名（名・漢字）※空文字許容 |
| 37 | haitatsu_shimei_kana_sei |  | VARCHAR | 100 |  |  | 配達先氏名かな（姓）※空文字許容 |
| 38 | haitatsu_shimei_kana_mei |  | VARCHAR | 100 |  |  | 配達先氏名かな（名）※空文字許容 |
| 39 | hanbaiten_id |  | BIGINT |  |  |  | 販売店ID |
| 40 | tanka_id |  | BIGINT |  |  |  | 単価ID（FK:m_tanka）※購読料単価のみ（tanka_type=1） |
| 41 | yubin_kubun |  | VARCHAR | 1 |  |  | 郵送区分（0:空, 1:郵送）DEFAULT 0 |
| 42 | shiharai_hoho |  | INTEGER |  |  |  | 支払方法（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他） |
| 43 | dokusyaryo_shiharai_cycle |  | INTEGER |  |  | 〇 | 購読料支払サイクル（月数） |
| 44 | bank_branch_code |  | VARCHAR | 3 |  |  | 引落口座支店コード |
| 45 | bank_branch_name |  | VARCHAR | 100 |  |  | 引落口座支店名 |
| 46 | hikiotoshi_yokin_shubetsu |  | INTEGER |  |  | 〇 | 引落口座貯金種目（1:普通, 2:当座） |
| 47 | hikiotoshi_koza_no |  | VARCHAR | 10 |  |  | 引落口座番号※空文字許容 |
| 48 | hikiotoshi_koza_meigi |  | VARCHAR | 50 |  |  | 引落口座名義※空文字許容 |
| 49 | dokusyaso_bunrui |  | VARCHAR | 50 |  |  | 購読者層分類（コードのカンマ区切り。0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。電子版 profession と 1:1）※空文字許容 |
| 50 | nogyosya_bunrui |  | VARCHAR | 50 |  |  | 農業者分類（コードのカンマ区切り。0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。電子版 products と 1:1）※空文字許容 |
| 51 | shoki_dokusya_kaishi_date |  | DATE |  |  |  | 初回購読開始日（変更時も保持） |
| 52 | dokusya_kaishi_date |  | DATE |  |  |  | 購読開始日 |
| 53 | dokusya_chushi_date |  | DATE |  |  | 〇 | 購読中止日 |
| 54 | joho_henko_tekiyo_date |  | DATE |  |  | 〇 | 読者情報変更適用日 |
| 55 | seikyu_kaishi_month |  | VARCHAR | 6 |  |  | 請求開始月（YYYYMM）※空文字許容 |
| 56 | biko |  | TEXT |  |  |  | 備考※空文字許容 |
| 57 | saishin_data_flg |  | BOOLEAN |  |  |  | 最新データフラグ（DEFAULT false, TRUE=最新レコード）※アプリ側でトランザクション制御必須 |
| 58 | zougen_hokoku_flg |  | BOOLEAN |  |  |  | 増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更） |
| 59 | shinki_flg |  | BOOLEAN |  |  |  | 新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読） |
| 60 | kaiyaku_flg |  | BOOLEAN |  |  |  | 解約フラグ（DEFAULT false, TRUE=購読→解約） |
| 61 | zenkai_hanbaiten_id |  | BIGINT |  |  | 〇 | 前回販売店ID（初回履歴はNULL） |
| 62 | zenkai_dokusya_busu |  | INTEGER |  |  | 〇 | 前回購読部数（初回履歴はNULL） |
| 63 | zenkai_yubin_no |  | VARCHAR | 7 |  | 〇 | 前回郵便番号（初回履歴はNULL） |
| 64 | zenkai_todofuken_code |  | VARCHAR | 2 |  | 〇 | 前回都道府県コード（初回履歴はNULL） |
| 65 | zenkai_shikuchoson |  | VARCHAR | 100 |  | 〇 | 前回市町村郡（初回履歴はNULL） |
| 66 | zenkai_chome_banchi |  | VARCHAR | 100 |  | 〇 | 前回丁目番地（初回履歴はNULL） |
| 67 | zenkai_tatemono_mei |  | VARCHAR | 100 |  | 〇 | 前回建物名（初回履歴はNULL） |
| 68 | denshi_shonin_status |  | INTEGER |  |  | 〇 | 電子申込承認ステータス |
| 69 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時（履歴登録日時） |
| 70 | created_by |  | VARCHAR | 50 |  |  | 作成者（履歴登録者） |
| 71 | torikeshi_flg |  | BOOLEAN |  |  |  | 取消フラグ（DEFAULT false, TRUE=取消レコード/赤伝）。取消処理で誤レコードと打ち消しレコードの両方に立てる。帳票・検索・現在状態から除外し、再計算対象外として取消時点の値で凍結する。物理削除はしない |
| 72 | honshi_kodoku_flg |  | BOOLEAN |  |  |  | 本紙購読フラグ（DEFAULT FALSE）。t_dokusya.honshi_kodoku_flg の履歴スナップショット。電子版読者管理システムの users.subscribe_flg（0:未購読, 1:購読）を連携。0→FALSE, 1→TRUE。 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_dokusya_rireki | dokusya_rireki_id | 〇 | 〇 | 主キー |
| 2 | UQ_t_dokusya_rireki | dokusya_id, rireki_no |  | 〇 | 履歴一意制約 |
| 3 | IX_t_dokusya_rireki_dokusya_id | dokusya_id |  |  | 購読者別検索 |
| 4 | IX_t_dokusya_rireki_latest | dokusya_id, saishin_data_flg |  |  | 最新データ取得 |
| 5 | IX_t_dokusya_rireki_ja_id | ja_id |  |  | JA別検索 |
| 6 | IX_t_dokusya_rireki_kanri_shiten_id | kanri_shiten_id |  |  | 管理支店別検索 |
| 7 | IX_t_dokusya_rireki_shiten_id | shiten_id |  |  | 販売支店別検索 |
| 8 | IX_t_dokusya_rireki_hanbaiten_id | hanbaiten_id |  |  | 販売店別検索 |
| 9 | IX_t_dokusya_rireki_chain | dokusya_id, joho_henko_tekiyo_date, rireki_no |  |  | 双時制チェーン探索（findBefore/findNext/有効レコード判定を適用日順で行う） |

---

# t_koza_furikae (口座振替データテーブル)

| No | 項目名 | PK | 属性 | サイズ | IDENTITY | NULL許容 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | koza_furikae_id | 〇 | BIGINT |  | 〇 |  | 口座振替データID（IDENTITY） |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID（FK:m_ja） |
| 3 | dokusya_id |  | BIGINT |  |  |  | 購読者ID（FK:t_dokusya） |
| 4 | target_month |  | VARCHAR | 6 |  |  | 対象年月（YYYYMM） |
| 5 | furikae_date |  | DATE |  |  | 〇 | 振替日 |
| 6 | furikae_kingaku |  | NUMERIC | 10 |  | 〇 | 振替金額 |
| 8 | koza_no |  | VARCHAR | 10 |  |  | 口座番号 |
| 9 | koza_meigi |  | VARCHAR | 50 |  |  | 口座名義 |
| 10 | yokin_shubetsu |  | INTEGER |  |  | 〇 | 預金種別（1:普通, 2:当座）※出力時点のスナップショット |
| 11 | bank_code |  | VARCHAR | 4 |  |  | 銀行コード |
| 12 | bank_name |  | VARCHAR | 100 |  |  | 銀行名 |
| 13 | bank_branch_code |  | VARCHAR | 3 |  |  | 支店コード |
| 14 | bank_branch_name |  | VARCHAR | 100 |  |  | 支店名 |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | 作成日時 |
| 16 | created_by |  | VARCHAR | 50 |  |  | 作成者 |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | 更新日時 |
| 18 | updated_by |  | VARCHAR | 50 |  |  | 更新者 |

## インデックス

| 項番 | インデックス名 | カラム名 | 主キー | ユニーク | 備考 |
|---|---|---|---|---|---|
| 1 | PK_t_koza_furikae | koza_furikae_id | 〇 | 〇 | 主キー |
| 2 | UQ_t_koza_furikae_dokusya_month | dokusya_id, target_month |  | 〇 | 月次振替の重複防止 |
| 3 | IX_t_koza_furikae_ja_id | ja_id |  |  | JA別検索 |
| 4 | IX_t_koza_furikae_dokusya_id | dokusya_id |  |  | 購読者別検索 |
| 5 | IX_t_koza_furikae_target_month | target_month |  |  | 対象年月検索 |
| 6 | IX_t_koza_furikae_dokusya_month | dokusya_id, target_month |  |  | 月次振替検索高速化 |
