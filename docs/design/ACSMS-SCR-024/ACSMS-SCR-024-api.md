---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-024
screen_name: アカウントマスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Nguyen Duyen Manh
updated_date: 2026/08/14
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/14 | 1.1  | Tran Duc Tuyen | 検索条件に shiten_id、レスポンス一覧に shiten_id / shiten_name を追加（顧客要件2026-07） | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/08/14 | 1.2  | Tran Duc Tuyen | 実装コードとの差異を修正：検索条件に todofuken_code を追加、sort_by 許可リスト・レスポンス項目（email/sub_email_1-3/account_lock_flg）・DataScope 記述・削除時のCONFLICTメッセージ・before_value例を実装に合わせて修正。共用API（ACSMS-API-COMMON-003/004）に match_field・scope 等の未記載パラメータおよびCOMMON-004のmetaオブジェクトを追加、COMMON-003の権限チェック記述（`@Permissions`なし）を実装に合わせて修正 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「アカウントマスタ明細検索画面（ACSMS-SCR-024）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-025 | アカウントマスタ登録画面 API設計書 |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 8   | 画面固有     | NOT_FOUND     | 指定されたアカウントが見つかりません。                                 | HTTP 404 |
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため処理を実行できません。                 | HTTP 409 |

---

# API ACSMS-API-024-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Search Accounts                                                                                                                                                                                          |
| 概要                   | アカウント一覧を検索条件で取得する（ページネーション付き）                                                                                                                                               |
| URI                    | /api/v1/accounts                                                                                                                                                                                         |
| メソッド               | GET                                                                                                                                                                                                      |
| リクエストボディー     | なし                                                                                                                                                                                                     |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                         |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                   |
| HTTPレスポンスコード   | 200:正常にアカウント一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                   |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                 |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------------------------------------- |
| 1   | login_id         | String | -        | -    |        | 20     | ログインID（部分一致検索）                                           |
| 2   | role_id          | Number | -        | -    |        |        | 管理者区分（1〜5）。未指定=全て                                      |
| 2.1 | todofuken_code   | String | -        | -    |        | 2      | 都道府県コード（完全一致）                                            |
| 3   | ja_id            | Number | -        | -    |        |        | JA ID                                                                |
| 4   | kanri_shiten_id  | Number | -        | -    |        |        | 管理支店ID                                                           |
| 4.1 | shiten_id        | Number | -        | -    |        |        | 所属支店ID（顧客要件2026-07）                                        |
| 5   | page             | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                          |
| 6   | per_page         | Number | -        | -    |        |        | 1ページあたりの件数（デフォルト: 20、最大: 100）                     |
| 7   | sort_by          | String | -        | -    |        |        | ソート項目（デフォルト: created_at）                                  |
| 8   | sort_order       | String | -        | -    |        |        | ソート順（asc / desc、デフォルト: desc）                             |

## レスポンスデータ

| #   | 項目ID                | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                        |
| --- | --------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------- |
| 1   | data                  | Array   | ○        |              | -        | アカウント一覧                              |
| 2   | →account_id           | Number  | -        |              | -        | アカウントID                                |
| 3   | →login_id             | String  | -        |              | -        | ログインID                                  |
| 4   | →account_name         | String  | -        |              | -        | アカウント名                                |
| 5   | →role_id              | Number  | -        |              | -        | 管理者区分ID                                |
| 6   | →role_name            | String  | -        |              | -        | 管理者区分名称                              |
| 7   | →todofuken_code       | String  | -        |              | 〇       | 都道府県コード                              |
| 8   | →todofuken_name       | String  | -        |              | 〇       | 都道府県名                                  |
| 9   | →ja_id                | Number  | -        |              | 〇       | JA ID                                       |
| 10  | →ja_name              | String  | -        |              | 〇       | JA名称                                      |
| 11  | →kanri_shiten_id      | Number  | -        |              | 〇       | 管理支店ID                                  |
| 12  | →kanri_shiten_name    | String  | -        |              | 〇       | 管理支店名称                                |
| 12.1 | →shiten_id           | Number  | -        |              | 〇       | 所属支店ID（顧客要件2026-07）               |
| 12.2 | →shiten_name         | String  | -        |              | 〇       | 所属支店名称                                |
| 13  | →email                | String  | -        |              | -        | メールアドレス（NOT NULL列、未設定時は空文字） |
| 13.1 | →sub_email_1         | String  | -        |              | -        | サブメールアドレス1（NOT NULL列、未設定時は空文字） |
| 13.2 | →sub_email_2         | String  | -        |              | -        | サブメールアドレス2（NOT NULL列、未設定時は空文字） |
| 13.3 | →sub_email_3         | String  | -        |              | -        | サブメールアドレス3（NOT NULL列、未設定時は空文字） |
| 14  | →paper_flg            | Boolean | -        |              | -        | 紙版取扱フラグ                              |
| 15  | →denshi_flg           | Boolean | -        |              | -        | 電子版取扱フラグ                            |
| 15.1 | →account_lock_flg    | Boolean | -        |              | -        | アカウントロックフラグ（ログイン失敗回数が閾値到達時true。ACSMS-SCR-025編集画面で管理者が解除可） |
| 16  | →created_at           | String  | -        | ISO8601      | -        | 作成日時                                    |
| 17  | →updated_at           | String  | -        | ISO8601      | 〇       | 更新日時                                    |
| 18  | meta                  | Object  | -        |              | -        | ページネーション情報                        |
| 19  | →total                | Number  | -        |              | -        | 総件数                                      |
| 20  | →page                 | Number  | -        |              | -        | 現在ページ                                  |
| 21  | →per_page             | Number  | -        |              | -        | 1ページあたりの件数                         |
| 22  | →total_pages          | Number  | -        |              | -        | 総ページ数                                  |

## リクエスト例

```
GET /api/v1/accounts?login_id=admin&role_id=1&page=1&per_page=20&sort_by=created_at&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "account_id": 1,
      "login_id": "admin001",
      "account_name": "管理者 太郎",
      "role_id": 1,
      "role_name": "日農（管理者）",
      "todofuken_code": null,
      "todofuken_name": null,
      "ja_id": null,
      "ja_name": null,
      "kanri_shiten_id": null,
      "kanri_shiten_name": null,
      "shiten_id": null,
      "shiten_name": null,
      "email": "admin001@example.com",
      "sub_email_1": "",
      "sub_email_2": "",
      "sub_email_3": "",
      "paper_flg": true,
      "denshi_flg": false,
      "account_lock_flg": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "account_id": 2,
      "login_id": "ja_honten001",
      "account_name": "JA本店 花子",
      "role_id": 4,
      "role_name": "JA本店",
      "todofuken_code": "13",
      "todofuken_name": "東京都",
      "ja_id": 10,
      "ja_name": "JA東京中央",
      "kanri_shiten_id": null,
      "kanri_shiten_name": null,
      "shiten_id": null,
      "shiten_name": null,
      "email": "ja_honten001@example.com",
      "sub_email_1": "",
      "sub_email_2": "",
      "sub_email_3": "",
      "paper_flg": true,
      "denshi_flg": true,
      "account_lock_flg": false,
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": "2026-03-15T11:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- クエリパラメータの検証：
  - login_id：最大20桁、文字列
  - role_id：1〜5の整数
  - todofuken_code：最大2桁、文字列
  - ja_id：数値型チェック
  - kanri_shiten_id：数値型チェック
  - shiten_id：数値型チェック
  - page：正の整数（デフォルト: 1）
  - per_page：1〜100の整数（デフォルト: 20）
  - sort_by：許可されたカラム名（login_id, account_name, role_id, role_name, todofuken_code, created_at, updated_at。デフォルト: created_at）
  - sort_order：asc または desc（デフォルト: desc）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`account.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- 検索条件を構築する。
  - login_id が指定されている場合：`LIKE '%' || :login_id || '%'`（部分一致）
  - role_id が指定されている場合：`= :role_id`（完全一致）
  - todofuken_code が指定されている場合：`= :todofuken_code`（完全一致）
  - ja_id が指定されている場合：`= :ja_id`（完全一致）
  - kanri_shiten_id が指定されている場合：`= :kanri_shiten_id`（完全一致）
  - shiten_id が指定されている場合：`= :shiten_id`（完全一致、顧客要件2026-07）
- 常に `deleted_at IS NULL` でフィルタリングする。
- DataScope（`applyBranchScope`）を適用する：CHUOKAI / JA_HONTEN は自JAのアカウントのみ、JA_KANRI_SHITEN は自管理支店のアカウントのみを参照可能。NICHINO_ADMIN / NICHINO_STAFF はDataScope制限なし（全アカウント参照可）。
  - ただし本APIの `account.view` 権限は現状 NICHINO_ADMIN のみに付与されているため（seeder.md §3）、実際に呼び出せるのは NICHINO_ADMIN のみ。上記スコープ制限は将来他ロールへ権限が付与された場合に備えた多層防御。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM m_account a
WHERE a.deleted_at IS NULL
  -- DataScope (applyBranchScope, auto-applied per session role)
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:todofuken_code IS NULL OR a.todofuken_code = :todofuken_code)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
  AND (:shiten_id IS NULL OR a.shiten_id = :shiten_id)
```

### 4.5 データ取得

```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, r.role_name,
       a.todofuken_code, t.todofuken_name,
       a.ja_id, j.ja_name,
       a.kanri_shiten_id, ks.kanri_shiten_name,
       a.shiten_id, s.shiten_name,
       a.email, a.sub_email_1, a.sub_email_2, a.sub_email_3,
       a.paper_flg, a.denshi_flg, a.account_lock_flg,
       a.created_at, a.updated_at
FROM m_account a
  LEFT JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
  LEFT JOIN m_todofuken t ON a.todofuken_code = t.todofuken_code
  LEFT JOIN m_ja j ON a.ja_id = j.ja_id AND j.deleted_at IS NULL
  LEFT JOIN m_kanri_shiten ks ON a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL
  LEFT JOIN m_shiten s ON a.shiten_id = s.shiten_id AND s.deleted_at IS NULL
WHERE a.deleted_at IS NULL
  -- DataScope (applyBranchScope, auto-applied per session role)
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:todofuken_code IS NULL OR a.todofuken_code = :todofuken_code)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
  AND (:shiten_id IS NULL OR a.shiten_id = :shiten_id)
-- sort_by=role_name は r.role_name、それ以外は a.<sort_by>（許可リスト外は a.created_at にフォールバック）
ORDER BY :sort_column :sort_order
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- 取得結果を data 配列として返却する。
- ページネーション情報を meta オブジェクトとして返却する。
  - total：4.4 で取得した総件数
  - page：リクエストの page
  - per_page：リクエストの per_page
  - total_pages：CEIL(total / per_page)
- 検索結果が0件の場合：data は空配列 `[]`、meta.total = 0 で返却（HTTP 200）。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-024-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Account                                                                                                                                                                                                                                             |
| 概要                   | 指定したアカウントを論理削除する                                                                                                                                                                                                                           |
| URI                    | /api/v1/accounts/{account_id}                                                                                                                                                                                                                              |
| メソッド               | DELETE                                                                                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | account_id（パスパラメータ）                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたアカウントが見つかりません, 409:関連データが存在するため処理を実行できません。, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                      |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------- |
| 1   | account_id     | Number | -        | 〇   |        |        | 削除対象の account_id（パスパラメータ）   |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明           |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------- |
| 1   | message | String | -        |              | -        | 削除成功メッセージ |

## リクエスト例

```
DELETE /api/v1/accounts/5
```

## レスポンス成功例

```json
{
  "message": "削除しました。"
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定されたアカウントが見つかりません"
}
```

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため処理を実行できません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - account_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 権限チェック：`account.delete` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定（存在確認・関連データチェック）

- 対象アカウントの存在を確認する。

```sql
SELECT a.account_id, a.login_id, a.account_name, a.role_id,
       a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email, a.biko,
       a.created_at, a.updated_at
FROM m_account a
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

- 関連テーブルに紐づくデータが存在するか確認する。

```sql
SELECT COUNT(*) AS related_count
FROM (
  SELECT account_id FROM t_mfa_otp WHERE account_id = :account_id AND used_flg = false AND expired_at > NOW()
) AS related_data
```

※ 有効なMFA OTPが存在する場合など、関連データの紐づき状況に応じて削除可否を判定する。
業務要件に基づき、関連テーブルの確認範囲を拡張する。

- 関連データが存在する場合：HTTP 409 (`CONFLICT`)

### 4.4 論理削除の実行

```sql
UPDATE m_account
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.5 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'アカウントマスタ明細検索画面 (ACSMS-SCR-024)', 'DELETE', 1,
        :target_account_id, 'm_account',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。
{
  "account_id": 5,
  "login_id": "ja_shiten001",
  "account_name": "JA管理支店 次郎",
  "role_id": 5,
  "ja_id": 10,
  "kanri_shiten_id": 20,
  "todofuken_code": "13",
  "paper_flg": true,
  "denshi_flg": false,
  "email": "shiten001@example.com"
}
```

### 4.6 レスポンス生成

- 削除成功メッセージを返却する。HTTP 200。

```json
{
  "message": "削除しました。"
}
```

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'アカウントマスタ明細検索画面 (ACSMS-SCR-024)', 'DELETE', 2,
        :target_account_id, 'm_account',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-COMMON-002

## 概要

| 項目                   | 内容                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Roles Dropdown                                                                                                                                                               |
| 概要                   | 管理者区分（ロール）のプルダウンリストを取得する（共用API：アカウント検索・登録等で使用）                                                                                         |
| URI                    | /api/v1/roles/dropdown                                                                                                                                                           |
| メソッド               | GET                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                             |
| リクエストパラメーター | なし                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
| HTTPレスポンスコード   | 200:正常にロール一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました               |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID      | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ----------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data        | Array  | ○        |              | -        | ロール一覧       |
| 2   | →role_id    | Number | -        |              | -        | ロールID         |
| 3   | →role_code  | String | -        |              | -        | ロールコード     |
| 4   | →role_name  | String | -        |              | -        | ロール名称       |

## リクエスト例

```
GET /api/v1/roles/dropdown
```

## レスポンス成功例

```json
{
  "data": [
    { "role_id": 1, "role_code": "NICHINO_ADMIN", "role_name": "日農（管理者）" },
    { "role_id": 2, "role_code": "NICHINO_STAFF", "role_name": "日農（担当者）" },
    { "role_id": 3, "role_code": "CHUOKAI", "role_name": "中央会" },
    { "role_id": 4, "role_code": "JA_HONTEN", "role_name": "JA本店" },
    { "role_id": 5, "role_code": "JA_KANRI_SHITEN", "role_name": "JA管理支店" }
  ]
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- パラメータなし。バリデーション不要。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

```sql
SELECT role_id, role_code, role_name
FROM m_roles
WHERE deleted_at IS NULL
ORDER BY role_id ASC
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-COMMON-003

## 概要

| 項目                   | 内容                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get JA Dropdown                                                                                                                                                                  |
| 概要                   | JAプルダウンリストを取得する（共用API）。2つのユースケースを1つのエンドポイントで提供：（A）ページング+フリーテキスト検索（SCR-009 等のフォーム用）、（B）都道府県・管理者区分によるカスケード絞込み（SCR-024 アカウント検索／SCR-025 登録用）。両方のレスポンス形状は同一（`{data, meta}`）。 |
| URI                    | /api/v1/ja/dropdown                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                             |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
| HTTPレスポンスコード   | 200:正常にJA一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

すべて任意。組み合わせ自由（フォーム用途は `q`+`page`+`per_page`、カスケード用途は `todofuken_code`+`role_id`）。

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                              |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------- |
| 1   | q               | String | -        | -    | -      | 100    | フリーテキスト検索。`ja_code` または `ja_name` に対する部分一致（ILIKE `%q%`）   |
| 2   | page            | Number | -        | -    |        |        | ページ番号（1以上、デフォルト=1）                                                |
| 3   | per_page        | Number | -        | -    |        |        | 1ページの件数（1〜100、デフォルト=50）                                           |
| 4   | include_id      | Number | -        | -    |        |        | 編集フォーム用エスケープハッチ。指定された ja_id がページ範囲に含まれない場合、レスポンス先頭に追加して返す。DataScope 制限により範囲外のIDは無視（silently dropped） |
| 5   | todofuken_code  | String | -        | -    | 2      | 2      | 都道府県コード（01〜47）。完全一致でカスケード絞込み                            |
| 6   | role_id         | Number | -        | -    |        |        | 管理者区分（3:中央会→`chuokai_flg=TRUE`、4,5:JA→`chuokai_flg=FALSE`、その他/未指定: 絞込みなし） |
| 7   | match_field     | String | -        | -    |        |        | 検索対象フィールド。`both`（既定）=`ja_code` OR `ja_name`、`name`=`ja_name`のみ（`ja_code`非表示のACSMS-SCR-024用） |
| 8   | scope           | String | -        | -    |        |        | DataScope範囲。`own`（既定）=自組織階層のみ、`todofuken`=中央会(CHUOKAI)限定で自都道府県の全JAへ拡大（ACSMS-SCR-022専用） |

## レスポンスデータ

| #   | 項目ID          | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                          |
| --- | --------------- | ------- | -------- | ------------ | -------- | --------------------------------------------- |
| 1   | data            | Array   | ○        |              | -        | JA一覧                                        |
| 2   | →ja_id          | Number  | -        |              | -        | JA ID                                         |
| 3   | →ja_code        | String  | -        |              | -        | JAコード                                      |
| 4   | →ja_name        | String  | -        |              | -        | JA名称                                        |
| 5   | →todofuken_code | String  | -        |              | -        | 都道府県コード                                |
| 6   | →chuokai_flg    | Boolean | -        |              | -        | 中央会フラグ                                  |
| 7   | meta            | Object  | -        |              | -        | ページングメタ                                |
| 8   | →total          | Number  | -        |              | -        | DataScope 適用後の総件数（カスケード絞込み込み） |
| 9   | →page           | Number  | -        |              | -        | 現在のページ番号                              |
| 10  | →per_page       | Number  | -        |              | -        | 1ページの件数                                 |
| 11  | →has_more       | Boolean | -        |              | -        | 次ページが存在するか（`page * per_page < total`） |

## リクエスト例

### ユースケース A — フォーム用フリーテキスト検索（SCR-009 等）

```
GET /api/v1/ja/dropdown?q=東京&page=1&per_page=50
```

編集フォームで現在選択中の JA をプリロード：

```
GET /api/v1/ja/dropdown?page=1&per_page=50&include_id=99
```

### ユースケース B — カスケード絞込み（SCR-024 / SCR-025）

```
GET /api/v1/ja/dropdown?todofuken_code=13&role_id=3
```

## レスポンス成功例

```json
{
  "data": [
    {
      "ja_id": 1,
      "ja_code": "1300001",
      "ja_name": "東京都中央会",
      "todofuken_code": "13",
      "chuokai_flg": true
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 50,
    "has_more": false
  }
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- クエリパラメータの検証：
  - q：最大100文字（部分一致用）
  - page：1以上の整数
  - per_page：1〜100の整数
  - include_id：1以上の整数
  - todofuken_code：2桁の文字列（01〜47）
  - role_id：1以上の整数
  - match_field：`both` / `name` のいずれか（任意、既定 `both`）
  - scope：`own` / `todofuken` のいずれか（任意、既定 `own`）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する（`VALIDATION_ERROR`）。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能（`@Permissions` なし）。単一のCRUD権限（例 `ja.view`）で塞ぐと、その権限を持たない呼び出し元画面（例 JA_KANRI_SHITEN は `file.upload` はあるが `ja.view` なし）を締め出してしまうため。
  - ※ 画面へのアクセス制御自体は呼び出し元画面のルートガードが担保する。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)（未認証の場合を除き通常発生しない）
- DataScope 適用：非 NICHINO_ADMIN/STAFF は自組織配下の JA のみ取得可能。

### 4.3 データ取得

- フィルタ適用順：
  1. DataScope（`applyJaScope`）。`scope=todofuken` かつ CHUOKAI セッションの場合のみ、自JAでなく「セッションの`todofuken_code`に属する全JA」に拡大（ACSMS-SCR-022専用、クライアント指定の都道府県は使わない）。それ以外のロール・`scope`未指定時は通常の自組織スコープ。
  2. `q`（`match_field='name'` なら `ja_name` のみ、既定 `both` は `ja_code OR ja_name` 部分一致）
  3. `todofuken_code`（完全一致）
  4. `role_id` カスケード：
     - role_id = 3（中央会） → `chuokai_flg = TRUE`
     - role_id = 4（JA本店） または 5（JA管理支店） → `chuokai_flg = FALSE`
     - その他 / 未指定 → 絞込みなし
- ソート：`ja_code ASC` 固定
- ページング：`LIMIT :per_page OFFSET (page-1)*per_page`
- `meta.total` は LIMIT 適用前の総件数（DataScope + 絞込み適用後）
- `meta.has_more = page * per_page < total`
- `include_id` 指定時：上記ページ範囲に含まれていなければ、別途同一条件で SELECT して先頭に prepend。DataScope 範囲外なら silently 無視。

```sql
SELECT ja_id, ja_code, ja_name, todofuken_code, chuokai_flg
FROM m_ja
WHERE deleted_at IS NULL
  -- DataScope (auto-applied per session role)
  AND (:scope_ja_id IS NULL OR ja_id = :scope_ja_id)
  -- q: free-text partial match
  AND (:q IS NULL OR ja_code ILIKE :q_like OR ja_name ILIKE :q_like)
  -- todofuken cascade
  AND (:todofuken_code IS NULL OR todofuken_code = :todofuken_code)
  -- role_id cascade
  AND (
    CASE
      WHEN :role_id = 3 THEN chuokai_flg = TRUE
      WHEN :role_id IN (4, 5) THEN chuokai_flg = FALSE
      ELSE TRUE
    END
  )
ORDER BY ja_code ASC
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-COMMON-004

## 概要

| 項目                   | 内容                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Kanri Shiten Dropdown                                                                                                                                                            |
| 概要                   | 管理支店プルダウンリストを取得する（JA選択によるカスケード絞込み。共用API：アカウント検索・登録等で使用）                                                                             |
| URI                    | /api/v1/kanri-shiten/dropdown                                                                                                                                                        |
| メソッド               | GET                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                 |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                     |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                               |
| HTTPレスポンスコード   | 200:正常に管理支店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                 |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                   |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------- |
| 1   | ja_id          | Number | -        | 〇   |        |        | JA ID（カスケード元のJA選択値）        |
| 2   | q              | String | -        | -    |        |        | 部分一致検索（管理支店コード OR 名称）                        |
| 3   | match_field    | String | -        | -    |        |        | 検索対象フィールド。`both`（既定）=コードOR名称、`name`=名称のみ |
| 4   | page           | Number | -        | -    |        |        | ページ番号（1始まり）。未指定時はページングなし＝全件返却     |
| 5   | per_page       | Number | -        | -    |        | 100    | 1ページの件数（1〜100、未指定時50）。`page`指定時のみ有効     |
| 6   | include_id     | Number | -        | -    |        |        | 編集時の選択中ID。現ページ範囲外ならレスポンス先頭に追加       |

## レスポンスデータ

| #   | 項目ID              | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ------------------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data                | Array  | ○        |              | -        | 管理支店一覧     |
| 2   | →kanri_shiten_id    | Number | -        |              | -        | 管理支店ID       |
| 3   | →kanri_shiten_code  | String | -        |              | -        | 管理支店コード   |
| 4   | →kanri_shiten_name  | String | -        |              | -        | 管理支店名称     |
| 5   | →paper_flg          | Boolean | -       |              | -        | 紙版取扱フラグ（SCR-011 の購読種別による絞り込み用・顧客要件2026-07） |
| 6   | →denshi_flg         | Boolean | -       |              | -        | 電子版取扱フラグ（同上） |
| 7   | meta                | Object | -        |              | -        | ページングメタ   |
| 8   | →total              | Number | -        |              | -        | `page` 未指定時は全件、指定時は当該レスポンスの件数（`data.length`。DB全体の総件数ではない） |
| 9   | →page               | Number | -        |              | -        | 現在のページ番号（`page` 未指定時は1固定） |
| 10  | →per_page           | Number | -        |              | -        | 1ページの件数（`per_page` 未指定時は `data.length`） |
| 11  | →has_more           | Boolean | -       |              | -        | 次ページが存在するか（`page` 未指定時は常にfalse） |

## リクエスト例

```
GET /api/v1/kanri-shiten/dropdown?ja_id=10
```

ページング付き（無限スクロール用）：

```
GET /api/v1/kanri-shiten/dropdown?ja_id=10&page=1&per_page=50
```

## レスポンス成功例

```json
{
  "data": [
    {
      "kanri_shiten_id": 20,
      "kanri_shiten_code": "113-5001-001",
      "kanri_shiten_name": "JA東京中央 本店管理支店",
      "paper_flg": true,
      "denshi_flg": true
    },
    {
      "kanri_shiten_id": 21,
      "kanri_shiten_code": "113-5001-002",
      "kanri_shiten_name": "JA東京中央 渋谷管理支店",
      "paper_flg": true,
      "denshi_flg": false
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "per_page": 2,
    "has_more": false
  }
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- クエリパラメータの検証：
  - ja_id：数値型チェック、必須チェック
  - q：文字列（任意）
  - match_field：`both` / `name` のいずれか（任意、既定 `both`）
  - page：1以上の整数（任意）
  - per_page：1〜100の整数（任意、既定50。`page`指定時のみ有効）
  - include_id：1以上の整数（任意）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)
- DataScope 適用：非 NICHINO_ADMIN/STAFF は自組織配下（CHUOKAI/JA_HONTEN は自JA、JA_KANRI_SHITEN は自管理支店）の管理支店のみ取得可能（`applyBranchScope`）。

### 4.3 データ取得

- フィルタ適用順：
  1. `ja_id`（完全一致、必須）
  2. DataScope（`applyBranchScope`）
  3. `q`（`match_field='name'` なら `kanri_shiten_name` のみ、既定 `both` は `kanri_shiten_code OR kanri_shiten_name` の部分一致）
- ソート：`kanri_shiten_code ASC` 固定
- ページング：`page` 未指定時は全件取得（`has_more=false`）。指定時は `LIMIT :per_page OFFSET (page-1)*per_page` し、`per_page+1`件取得して余剰有無で `has_more` を判定。
- `include_id` 指定時：ページ1の範囲に含まれていなければ、同一条件で該当行を SELECT して先頭に prepend。

```sql
SELECT kanri_shiten_id, kanri_shiten_code, kanri_shiten_name, paper_flg, denshi_flg
FROM m_kanri_shiten
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  -- DataScope (applyBranchScope, auto-applied per session role)
  AND (:q IS NULL OR
       CASE WHEN :match_field = 'name' THEN kanri_shiten_name ILIKE :q_like
            ELSE (kanri_shiten_code ILIKE :q_like OR kanri_shiten_name ILIKE :q_like)
       END)
ORDER BY kanri_shiten_code ASC
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。
- 該当データが0件の場合：data は空配列 `[]` で返却。
- meta を付与する：`total`（`page`未指定時は全件数、指定時は`data.length`）、`page`（未指定時1）、`per_page`（未指定時`data.length`）、`has_more`。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
