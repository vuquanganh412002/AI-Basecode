---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-027
screen_name: ロール管理画面
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

「ロール管理画面（ACSMS-SCR-027）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                               |
| --- | ------------- | ------------------------------------ |
| 1   | ACSMS-SCR-024 | アカウントマスタ明細検索画面 API設計書 |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 5   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 6   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 7   | 画面固有     | NOT_FOUND        | 指定されたロールが見つかりません。                                     | HTTP 404 |

---

# API ACSMS-API-027-001

## 概要

| 項目                   | 内容                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Roles List                                                                                                                                                                   |
| 概要                   | ロール一覧を取得する（ロール管理テーブル表示用）                                                                                                                                 |
| URI                    | /api/v1/roles                                                                                                                                                                    |
| メソッド               | GET                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                             |
| リクエストパラメーター | なし                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
| HTTPレスポンスコード   | 200:正常にロール一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました               |

## リクエストパラメータ

パラメータなし。

## レスポンスデータ

| #   | 項目ID        | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ------------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data          | Array  | ○        |              | -        | ロール一覧       |
| 2   | →role_id      | Number | -        |              | -        | ロールID         |
| 3   | →role_code    | String | -        |              | -        | ロールコード     |
| 4   | →role_name    | String | -        |              | -        | ロール名称       |
| 5   | →description  | String | -        |              | 〇       | 説明             |

## リクエスト例

```
GET /api/v1/roles
```

## レスポンス成功例

```json
{
  "data": [
    {
      "role_id": 1,
      "role_code": "NICHINO_ADMIN",
      "role_name": "日農（管理者）",
      "description": "日本農業新聞 管理者アカウント"
    },
    {
      "role_id": 2,
      "role_code": "NICHINO_STAFF",
      "role_name": "日農（担当者）",
      "description": "日本農業新聞 担当者アカウント"
    },
    {
      "role_id": 3,
      "role_code": "CHUOKAI",
      "role_name": "中央会",
      "description": "中央会アカウント"
    },
    {
      "role_id": 4,
      "role_code": "JA_HONTEN",
      "role_name": "JA本店",
      "description": "JA本店アカウント"
    },
    {
      "role_id": 5,
      "role_code": "JA_KANRI_SHITEN",
      "role_name": "JA管理支店",
      "description": "JA管理支店アカウント"
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

- パラメータなし。バリデーション不要。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`@Permissions('role.view')`（`seeder.md §2.14` permission_id=45）。
  - `m_roles_permissions` 上 `role.view` は NICHINO_ADMIN にのみ付与されているため、
    結果として NICHINO_ADMIN のみアクセス可となる（`seeder.md §3` 権限マトリクス）。
  - 実装は他コントローラと同じく `PermissionsGuard` + `@Permissions(...)` を使用し、
    `role_code` 直接比較は行わない（`.claude/rules/security.md §Layer 1` 準拠）。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

```sql
SELECT role_id, role_code, role_name, description
FROM m_roles
WHERE deleted_at IS NULL
ORDER BY role_id ASC
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-027-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Role Detail with Permissions                                                                                                                                                                                                 |
| 概要                   | 指定したロールの詳細と紐付き権限一覧を取得する（編集モード用）                                                                                                                                                                   |
| URI                    | /api/v1/roles/{role_id}                                                                                                                                                                                                          |
| メソッド               | GET                                                                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                                                                             |
| リクエストパラメーター | role_id（パスパラメータ）                                                                                                                                                                                                        |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                           |
| HTTPレスポンスコード   | 200:正常にロール詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたロールが見つかりません, 500:システムエラーが発生しました                             |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                 |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------ |
| 1   | role_id        | Number | -        | 〇   |        |        | 取得対象の role_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID           | タイプ | 繰り返し | フォーマット | Nullable | 説明                         |
| --- | ---------------- | ------ | -------- | ------------ | -------- | ---------------------------- |
| 1   | data             | Object | -        |              | -        | ロール詳細データ             |
| 2   | →role_id         | Number | -        |              | -        | ロールID                     |
| 3   | →role_code       | String | -        |              | -        | ロールコード                 |
| 4   | →role_name       | String | -        |              | -        | ロール名称                   |
| 5   | →description     | String | -        |              | 〇       | 説明                         |
| 6   | →permission_ids  | Array  | ○        |              | -        | 紐付き権限IDの配列           |
| 7   | →locked_permission_ids | Array | ○  |              | -        | `permission_ids` のうち変更不可（システム必須・シード由来）な権限IDの配列。該当チェックボックスはFEでdisabled表示 |
| 8   | →created_at      | String | -        | ISO8601      | -        | 作成日時                     |
| 9   | →updated_at      | String | -        | ISO8601      | 〇       | 更新日時                     |

## リクエスト例

```
GET /api/v1/roles/1
```

## レスポンス成功例

```json
{
  "data": {
    "role_id": 1,
    "role_code": "NICHINO_ADMIN",
    "role_name": "日農（管理者）",
    "description": "日本農業新聞 管理者アカウント",
    "permission_ids": [16, 17, 18, 19, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
    "locked_permission_ids": [16, 17, 18, 19, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定されたロールが見つかりません"
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
  - role_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`@Permissions('role.view')`（`seeder.md §2.14` permission_id=45）。
  - `m_roles_permissions` 上 `role.view` は NICHINO_ADMIN にのみ付与されているため、
    結果として NICHINO_ADMIN のみアクセス可となる（`seeder.md §3` 権限マトリクス）。
  - 実装は他コントローラと同じく `PermissionsGuard` + `@Permissions(...)` を使用し、
    `role_code` 直接比較は行わない（`.claude/rules/security.md §Layer 1` 準拠）。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- ロール基本情報を取得する。

```sql
SELECT role_id, role_code, role_name, description, created_at, updated_at
FROM m_roles
WHERE role_id = :role_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

- ロールに紐付く権限ID一覧を取得する（有効な全件、`permission_ids` 用）。

```sql
SELECT permission_id
FROM m_roles_permissions
WHERE role_id = :role_id
  AND deleted_at IS NULL
ORDER BY permission_id ASC
```

- ロールに紐付く権限のうち、変更不可（`locked = TRUE`）な行のみ取得する（`locked_permission_ids` 用）。

```sql
SELECT permission_id
FROM m_roles_permissions
WHERE role_id = :role_id
  AND deleted_at IS NULL
  AND locked = TRUE
ORDER BY permission_id ASC
```

### 4.4 レスポンス生成

- ロール基本情報・権限ID配列・変更不可権限ID配列を data オブジェクトとして返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-027-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Role                                                                                                                                                                                                                                                                  |
| 概要                   | 指定したロールの情報と権限を更新する                                                                                                                                                                                                                                         |
| URI                    | /api/v1/roles/{role_id}                                                                                                                                                                                                                                                      |
| メソッド               | PUT                                                                                                                                                                                                                                                                          |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                         |
| リクエストパラメーター | role_id（パスパラメータ）                                                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                       |
| HTTPレスポンスコード   | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたロールが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | role_id        | Number | -        | 〇   |        |        | 更新対象の role_id（パスパラメータ）        |
| 2   | role_name      | String | -        | 〇   | 1      | 20     | ロール名称                                 |
| 3   | description    | String | -        | -    |        | 200    | 説明。空欄可                               |
| 4   | permission_ids | Array  | ○        | 〇   |        |        | 紐付ける権限IDの配列（空配列で全権限解除）  |

※ role_code は更新不可（画面側でdisabled）。リクエストに含めない。

## レスポンスデータ

| #   | 項目ID           | タイプ | 繰り返し | フォーマット | Nullable | 説明                         |
| --- | ---------------- | ------ | -------- | ------------ | -------- | ---------------------------- |
| 1   | data             | Object | -        |              | -        | 更新されたロールデータ       |
| 2   | →role_id         | Number | -        |              | -        | ロールID                     |
| 3   | →role_code       | String | -        |              | -        | ロールコード                 |
| 4   | →role_name       | String | -        |              | -        | ロール名称                   |
| 5   | →description     | String | -        |              | 〇       | 説明                         |
| 6   | →permission_ids  | Array  | ○        |              | -        | 紐付き権限IDの配列           |
| 7   | →locked_permission_ids | Array | ○  |              | -        | `permission_ids` のうち変更不可（システム必須・シード由来）な権限IDの配列 |
| 8   | →created_at      | String | -        | ISO8601      | -        | 作成日時                     |
| 9   | →updated_at      | String | -        | ISO8601      | 〇       | 更新日時                     |

## リクエスト例

```json
PUT /api/v1/roles/3
Content-Type: application/json

{
  "role_name": "中央会",
  "description": "中央会アカウント（更新）",
  "permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43]
}
```

## レスポンス成功例

```json
{
  "data": {
    "role_id": 3,
    "role_code": "CHUOKAI",
    "role_name": "中央会",
    "description": "中央会アカウント（更新）",
    "permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43],
    "locked_permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-04-14T14:30:00Z"
  }
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "role_name", "message": "ロール名は必須です" }
  ]
}
```

### 400 Bad Request（変更不可権限の解除）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "システム必須権限のため、解除できません。",
  "errors": [
    { "field": "permission_ids", "message": "次の権限はシステム必須のため解除できません: 2, 5" }
  ]
}
```

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
  "message": "指定されたロールが見つかりません"
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

- パスパラメータ：role_id 数値型チェック、必須
- リクエストボディ：
  - role_name：必須、最大20桁
  - description：空欄可、最大200桁
  - permission_ids：必須、配列型（空配列可）。各要素は数値型。
  - permission_ids 内のすべての permission_id が m_permissions テーブルに存在するか確認する。
    - 存在しない permission_id が1つでもある場合：バリデーションエラー（HTTP 400）

SELECT 1 FROM (
  SELECT unnest(:permission_ids::bigint[]) AS permission_id
) AS input
  SELECT 1
  FROM m_permissions p
  WHERE p.permission_id = input.permission_id
    AND p.deleted_at IS NULL
)
LIMIT 1
```

- クエリが1行以上返される場合（存在しない permission_id がある）：
  - HTTP 400 (`VALIDATION_ERROR`)
  - errors配列に「指定された権限が見つかりません」というメッセージを含める
- 現在有効な割当のうち `locked = TRUE`（システム必須・シード由来）の permission_id が
  リクエストの permission_ids から外れている場合：
  - HTTP 400 (`VALIDATION_ERROR`)
  - message：「システム必須権限のため、解除できません。」
  - errors配列に「次の権限はシステム必須のため解除できません: {対象permission_idのカンマ区切り}」
    というメッセージを含める（field: `permission_ids`）
  - このチェックはトランザクション開始前に行われ、対象ロールが存在しない場合は
    このチェックより先に §4.3 の404が優先される。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`@Permissions('role.view')`（`seeder.md §2.14` permission_id=45）。
  - `m_roles_permissions` 上 `role.view` は NICHINO_ADMIN にのみ付与されているため、
    結果として NICHINO_ADMIN のみアクセス可となる（`seeder.md §3` 権限マトリクス）。
    本画面には `role.update` という専用権限は存在せず、`role.view` が編集操作のゲートも兼ねる。
  - 実装は他コントローラと同じく `PermissionsGuard` + `@Permissions(...)` を使用し、
    `role_code` 直接比較は行わない（`.claude/rules/security.md §Layer 1` 準拠）。
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認

```sql
SELECT * FROM m_roles
WHERE role_id = :role_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.4 データ更新（トランザクション）

- 以下の処理をトランザクション内で実行する。

**4.4.1 ロール基本情報の更新:**

```sql
UPDATE m_roles
SET role_name = :role_name,
    description = :description,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE role_id = :role_id
  AND deleted_at IS NULL
RETURNING *
```

**4.4.2 既存権限の論理削除:**

```sql
UPDATE m_roles_permissions
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE role_id = :role_id
  AND deleted_at IS NULL
```

**4.4.3 新しい権限の登録:**

```sql
INSERT INTO m_roles_permissions (role_id, permission_id, created_at, created_by, updated_at, updated_by)
SELECT :role_id, unnest(:permission_ids::bigint[]), NOW(), :user_account_id, NOW(), :user_account_id
```

※ permission_ids が空配列の場合、INSERT は実行しない（全権限解除）。

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
        'ロール管理画面 (ACSMS-SCR-027)', 'UPDATE', 1,
        :role_id, 'm_roles',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：更新前のデータをJSON形式で格納する。

{
  "role_id": 3,
  "role_code": "CHUOKAI",
  "role_name": "中央会",
  "description": "中央会アカウント",
  "permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43]
}
```

**after_value 例:**

```json
`after_value`：更新後のデータをJSON形式で格納する。

{
  "role_id": 3,
  "role_code": "CHUOKAI",
  "role_name": "中央会",
  "description": "中央会アカウント（更新）",
  "permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43]
}
```

### 4.6 レスポンス生成

- 更新されたデータをdata オブジェクトとして返却する。HTTP 200。

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
        'ロール管理画面 (ACSMS-SCR-027)', 'UPDATE', 2,
        :role_id, 'm_roles',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-027-004

## 概要

| 項目                   | 内容                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Permissions List                                                                                                                                                             |
| 概要                   | 全権限マスタの一覧を取得する（権限設定チェックボックス表示用）                                                                                                                   |
| URI                    | /api/v1/permissions                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                             |
| リクエストパラメーター | なし                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                           |
| HTTPレスポンスコード   | 200:正常に権限一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                 |

## リクエストパラメータ

パラメータなし。

## レスポンスデータ

| #   | 項目ID            | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ----------------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | data              | Array  | ○        |              | -        | 権限一覧         |
| 2   | →permission_id    | Number | -        |              | -        | 権限ID           |
| 3   | →permission_code  | String | -        |              | -        | 権限コード       |
| 4   | →permission_name  | String | -        |              | -        | 権限名称         |
| 5   | →description      | String | -        |              | 〇       | 説明             |

## リクエスト例

```
GET /api/v1/permissions
```

## レスポンス成功例

```json
{
  "data": [
    {
      "permission_id": 1,
      "permission_code": "dokusya.create",
      "permission_name": "購読者登録",
      "description": "購読者情報の新規登録"
    },
    {
      "permission_id": 2,
      "permission_code": "dokusya.view",
      "permission_name": "購読者参照",
      "description": "購読者明細検索・一覧表示"
    },
    {
      "permission_id": 28,
      "permission_code": "account.create",
      "permission_name": "アカウント登録",
      "description": "アカウントの新規作成"
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

- パラメータなし。バリデーション不要。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`@Permissions('role.view')`（`seeder.md §2.14` permission_id=45）。
  - `m_roles_permissions` 上 `role.view` は NICHINO_ADMIN にのみ付与されているため、
    結果として NICHINO_ADMIN のみアクセス可となる（`seeder.md §3` 権限マトリクス）。
  - 実装は他コントローラと同じく `PermissionsGuard` + `@Permissions(...)` を使用し、
    `role_code` 直接比較は行わない（`.claude/rules/security.md §Layer 1` 準拠）。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

```sql
SELECT permission_id, permission_code, permission_name, description
FROM m_permissions
WHERE deleted_at IS NULL
ORDER BY permission_id ASC
```

### 4.4 レスポンス生成

- 取得結果を data 配列として返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
