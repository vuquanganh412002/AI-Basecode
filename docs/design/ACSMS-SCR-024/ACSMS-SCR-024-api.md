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
updated_date: 2026/04/14
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

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
| 9   | 画面固有     | CONFLICT              | このレコードは現在使用中のため、削除できません。                       | HTTP 409 |

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
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                   |
| HTTPレスポンスコード   | 200:正常にアカウント一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                   |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                 |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------------------------------------- |
| 1   | login_id         | String | -        | -    |        | 20     | ログインID（部分一致検索）                                           |
| 2   | role_id          | Number | -        | -    |        |        | 管理者区分（1〜5）。未指定=全て                                      |
| 3   | ja_id            | Number | -        | -    |        |        | JA ID                                                                |
| 4   | kanri_shiten_id  | Number | -        | -    |        |        | 管理支店ID                                                           |
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
| 13  | →paper_flg            | Boolean | -        |              | -        | 紙版取扱フラグ                              |
| 14  | →denshi_flg           | Boolean | -        |              | -        | 電子版取扱フラグ                            |
| 15  | →created_at           | String  | -        | ISO8601      | -        | 作成日時                                    |
| 16  | →updated_at           | String  | -        | ISO8601      | 〇       | 更新日時                                    |
| 17  | meta                  | Object  | -        |              | -        | ページネーション情報                        |
| 18  | →total                | Number  | -        |              | -        | 総件数                                      |
| 19  | →page                 | Number  | -        |              | -        | 現在ページ                                  |
| 20  | →per_page             | Number  | -        |              | -        | 1ページあたりの件数                         |
| 21  | →total_pages          | Number  | -        |              | -        | 総ページ数                                  |

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
      "paper_flg": true,
      "denshi_flg": false,
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
      "paper_flg": true,
      "denshi_flg": true,
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
  - ja_id：数値型チェック
  - kanri_shiten_id：数値型チェック
  - page：正の整数（デフォルト: 1）
  - per_page：1〜100の整数（デフォルト: 20）
  - sort_by：許可されたカラム名（login_id, role_id, created_at）
  - sort_order：asc または desc（デフォルト: desc）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`account.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- 検索条件を構築する。
  - login_id が指定されている場合：`LIKE '%' || :login_id || '%'`（部分一致）
  - role_id が指定されている場合：`= :role_id`（完全一致）
  - ja_id が指定されている場合：`= :ja_id`（完全一致）
  - kanri_shiten_id が指定されている場合：`= :kanri_shiten_id`（完全一致）
- 常に `deleted_at IS NULL` でフィルタリングする。
- NICHINO_ADMINは全アカウントを参照可能（DataScope制限なし）。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM m_account a
WHERE a.deleted_at IS NULL
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
```

### 4.5 データ取得

```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, r.role_name,
       a.todofuken_code, t.todofuken_name,
       a.ja_id, j.ja_name,
       a.kanri_shiten_id, ks.kanri_shiten_name,
       a.paper_flg, a.denshi_flg,
       a.created_at, a.updated_at
FROM m_account a
  LEFT JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
  LEFT JOIN m_todofuken t ON a.todofuken_code = t.todofuken_code
  LEFT JOIN m_ja j ON a.ja_id = j.ja_id AND j.deleted_at IS NULL
  LEFT JOIN m_kanri_shiten ks ON a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL
WHERE a.deleted_at IS NULL
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
ORDER BY a.:sort_by :sort_order
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
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常にアカウントを削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたアカウントが見つかりません, 409:このレコードは現在使用中のため、削除できません。, 500:システムエラーが発生しました |

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
  "message": "正常に削除しました"
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
  "message": "このレコードは現在使用中のため、削除できません。"
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

- パスパラメータの検証：
  - account_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`account.delete` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)
- 自分自身のアカウントは削除不可とする。

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
  "message": "正常に削除しました"
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
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
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

- 認証情報を検証する（JWT / Cookie）。
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
| 概要                   | JAプルダウンリストを取得する（都道府県・管理者区分によるカスケード絞込み。共用API：アカウント検索・登録等で使用）                                                                 |
| URI                    | /api/v1/ja/dropdown                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                             |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
| HTTPレスポンスコード   | 200:正常にJA一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                   |

## リクエストパラメータ

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                              |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------- |
| 1   | todofuken_code  | String | -        | -    | 2      | 2      | 都道府県コード（01〜47）                                                          |
| 2   | role_id         | Number | -        | -    |        |        | 管理者区分（3:中央会→chuokai_flg=true、4,5:JA→chuokai_flg=false）                |

## レスポンスデータ

| #   | 項目ID          | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | --------------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data            | Array  | ○        |              | -        | JA一覧           |
| 2   | →ja_id          | Number | -        |              | -        | JA ID            |
| 3   | →ja_code        | String | -        |              | -        | JAコード         |
| 4   | →ja_name        | String | -        |              | -        | JA名称           |
| 5   | →todofuken_code | String | -        |              | -        | 都道府県コード   |
| 6   | →chuokai_flg    | Boolean| -        |              | -        | 中央会フラグ     |

## リクエスト例

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

- クエリパラメータの検証：
  - todofuken_code：2桁の文字列（01〜47）
  - role_id：1〜5の整数
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- 管理者区分によりカスケード条件を切り替える。
  - role_id = 3（中央会）の場合：`chuokai_flg = true` のJAを取得
  - role_id = 4（JA本店）または 5（JA管理支店）の場合：`chuokai_flg = false` のJAを取得
  - role_id 未指定またはその他の場合：全てのJAを取得

```sql
SELECT ja_id, ja_code, ja_name, todofuken_code, chuokai_flg
FROM m_ja
WHERE deleted_at IS NULL
  AND (:todofuken_code IS NULL OR todofuken_code = :todofuken_code)
  AND (
    CASE
      WHEN :role_id = 3 THEN chuokai_flg = true
      WHEN :role_id IN (4, 5) THEN chuokai_flg = false
      ELSE true
    END
  )
ORDER BY ja_code ASC
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
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                               |
| HTTPレスポンスコード   | 200:正常に管理支店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                 |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                   |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------- |
| 1   | ja_id          | Number | -        | 〇   |        |        | JA ID（カスケード元のJA選択値）        |

## レスポンスデータ

| #   | 項目ID              | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ------------------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data                | Array  | ○        |              | -        | 管理支店一覧     |
| 2   | →kanri_shiten_id    | Number | -        |              | -        | 管理支店ID       |
| 3   | →kanri_shiten_code  | String | -        |              | -        | 管理支店コード   |
| 4   | →kanri_shiten_name  | String | -        |              | -        | 管理支店名称     |

## リクエスト例

```
GET /api/v1/kanri-shiten/dropdown?ja_id=10
```

## レスポンス成功例

```json
{
  "data": [
    {
      "kanri_shiten_id": 20,
      "kanri_shiten_code": "113-5001-001",
      "kanri_shiten_name": "JA東京中央 本店管理支店"
    },
    {
      "kanri_shiten_id": 21,
      "kanri_shiten_code": "113-5001-002",
      "kanri_shiten_name": "JA東京中央 渋谷管理支店"
    }
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

- クエリパラメータの検証：
  - ja_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

```sql
SELECT kanri_shiten_id, kanri_shiten_code, kanri_shiten_name
FROM m_kanri_shiten
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
ORDER BY kanri_shiten_code ASC
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。
- 該当データが0件の場合：data は空配列 `[]` で返却。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
