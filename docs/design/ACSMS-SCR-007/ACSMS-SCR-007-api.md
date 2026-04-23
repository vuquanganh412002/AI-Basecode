---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-007
screen_name: 支店マスタ登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Dao Van Thang
updated_date: 2026/04/14
updated_by: Dao Van Thang
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「支店マスタ登録画面（ACSMS-SCR-007）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-006 | 支店マスタ明細検索画面 API設計書 |

※ 本画面の管理支店プルダウンは以下の共用APIを使用する。
- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024

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
| 8   | 画面固有     | NOT_FOUND      | 指定された支店が見つかりません。                                       | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | 同一の支店コードが既に登録されています。                               | HTTP 400 |

---

# API ACSMS-API-007-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Shiten Detail                                                                                                                                                                                      |
| 概要                   | 指定した支店の詳細を取得する（編集モード用）                                                                                                                                                           |
| URI                    | /api/v1/shiten/{shiten_id}                                                                                                                                                                             |
| メソッド               | GET                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                   |
| リクエストパラメーター | shiten_id（パスパラメータ）                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に支店詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id      | Number | -        | 〇   |        |        | 取得対象の shiten_id（パスパラメータ）  |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                | Object  | -        |              | -        |                      |
| 2   | →shiten_id          | Number  | -        |              | -        | 支店ID               |
| 3   | →ja_id              | Number  | -        |              | -        | JA ID                |
| 4   | →shiten_code        | String  | -        |              | -        | 支店コード           |
| 5   | →shiten_name        | String  | -        |              | -        | 支店名称             |
| 6   | →shiten_name_kana   | String  | -        |              | -        | 支店名称（カナ）     |
| 7   | →kinyu_shiten_flg   | Boolean | -        |              | -        | 金融機関支店フラグ   |
| 8   | →kanri_shiten_id    | Number  | -        |              | -        | 管理支店ID           |
| 9   | →created_at         | String  | -        | ISO8601      | -        | 作成日時             |
| 10  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時             |

## リクエスト例

```
GET /api/v1/shiten/1
```

## レスポンス成功例

```json
{
  "data": {
    "shiten_id": 1,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "本店営業部",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
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
  "message": "指定された支店が見つかりません"
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
  - shiten_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`shiten.view` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件でデータを取得する。

```sql
SELECT shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
       kinyu_shiten_flg, kanri_shiten_id, created_at, updated_at
FROM m_shiten
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 レスポンス生成

- data オブジェクトを含むJSONを返却する。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-007-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Shiten                                                                                                                                                                                                                                       |
| 概要                   | 新しい支店を登録する                                                                                                                                                                                                                                |
| URI                    | /api/v1/shiten                                                                                                                                                                                                                                      |
| メソッド               | POST                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                     |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                              |
| HTTPレスポンスコード   | 201:正常に支店を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:同一の支店コードが既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                       |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | shiten_code      | String | -        | 〇   | 1      | 3      | 支店コード                                 |
| 2   | shiten_name      | String | -        | 〇   | 1      | 100    | 支店名称                                   |
| 3   | shiten_name_kana | String | -        | -    |        | 100    | 支店名称（カナ）                           |
| 4   | kanri_shiten_id  | Number | -        | 〇   |        |        | 管理支店ID（プルダウン選択値）             |
| 5   | kinyu_shiten_flg | Boolean| -        |  -   |        |        | 金融機関支店フラグ                        |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                | Object  | -        |              | -        | 登録された支店データ |
| 2   | →shiten_id          | Number  | -        |              | -        | 支店ID               |
| 3   | →ja_id              | Number  | -        |              | -        | JA ID                |
| 4   | →shiten_code        | String  | -        |              | -        | 支店コード           |
| 5   | →shiten_name        | String  | -        |              | -        | 支店名称             |
| 6   | →shiten_name_kana   | String  | -        |              | -        | 支店名称（カナ）     |
| 7   | →kinyu_shiten_flg   | Boolean | -        |              | -        | 金融機関支店フラグ   |
| 8   | →kanri_shiten_id    | Number  | -        |              | -        | 管理支店ID           |
| 9   | →created_at         | String  | -        | ISO8601      | -        | 作成日時             |
| 10  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時             |

## リクエスト例

```json
POST /api/v1/shiten
Content-Type: application/json

{
  "shiten_code": "S01",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id": 1,
  "kinyu_shiten_flg":false
}
```

## レスポンス成功例

```json
{
  "data": {
    "shiten_id": 10,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "本店営業部",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-04-14T10:00:00Z",
    "updated_at": null
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
    { "field": "shiten_code", "message": "支店コードは必須です" },
    { "field": "shiten_name", "message": "支店名は必須です" }
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

### 400 Bad Request（重複）

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "同一の支店コードが既に登録されています"
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

- リクエストボディの検証：
  - shiten_code：必須、最大3桁
  - shiten_name：必須、最大100桁
  - shiten_name_kana：任意、最大100桁
  - kanri_shiten_id：必須、数値型チェック
  - kinyu_shiten_flg:任意
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`shiten.create` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 重複チェック

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件で重複を確認する。

```sql
SELECT COUNT(*) FROM m_shiten
WHERE ja_id = :ja_id
  AND shiten_code = :shiten_code
  AND deleted_at IS NULL
```

- 重複がある場合：HTTP 400 (`DUPLICATE_CODE`)

### 4.4 データ登録

- kinyu_shiten_flg はリクエストから取得する（未提供の場合はデフォルト値 false）。
- 以下のSQLを実行して登録する。

```sql
INSERT INTO m_shiten (ja_id, shiten_code, shiten_name, shiten_name_kana,
                      kinyu_shiten_flg, kanri_shiten_id,
                      created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :shiten_code, :shiten_name, :shiten_name_kana,
        :kinyu_shiten_flg, :kanri_shiten_id,
        NOW(), :user_account_id, NOW(), :user_account_id)
RETURNING *
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
        '支店マスタ登録画面 (ACSMS-SCR-007)', 'CREATE', 1,
        :shiten_id, 'm_shiten',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
`before_value`：INSERT のため空文字列を設定する。
`after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "shiten_id": 10,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

### 4.6 レスポンス生成

- 登録されたデータをdata オブジェクトとして返却する。HTTP 201。

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
        '支店マスタ登録画面 (ACSMS-SCR-007)', 'CREATE', 2,
        NULL, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-007-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Update Shiten                                                                                                                                                                                                                              |
| 概要                   | 指定した支店を更新する                                                                                                                                                                                                                     |
| URI                    | /api/v1/shiten/{shiten_id}                                                                                                                                                                                                                 |
| メソッド               | PUT                                                                                                                                                                                                                                        |
| リクエストボディー     | JSON                                                                                                                                                                                                                                       |
| リクエストパラメーター | shiten_id（パスパラメータ）                                                                                                                                                                                                                |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常に支店を更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id        | Number | -        | 〇   |        |        | 更新対象の shiten_id（パスパラメータ）  |
| 2   | shiten_name      | String | -        | 〇   | 1      | 100    | 支店名称                                |
| 3   | shiten_name_kana | String | -        | -    |        | 100    | 支店名称（カナ）                        |
| 4   | kinyu_shiten_flg | Boolean| -        | -    |        |        | 金融機関支店フラグ                        |
※ shiten_code は更新不可（画面侧でdisabled）。リクエストに含めない。

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                | Object  | -        |              | -        | 更新された支店データ |
| 2   | →shiten_id          | Number  | -        |              | -        | 支店ID               |
| 3   | →ja_id              | Number  | -        |              | -        | JA ID                |
| 4   | →shiten_code        | String  | -        |              | -        | 支店コード           |
| 5   | →shiten_name        | String  | -        |              | -        | 支店名称             |
| 6   | →shiten_name_kana   | String  | -        |              | -        | 支店名称（カナ）     |
| 7   | →kinyu_shiten_flg   | Boolean | -        |              | -        | 金融機関支店フラグ   |
| 8   | →kanri_shiten_id    | Number  | -        |              | -        | 管理支店ID           |
| 9   | →created_at         | String  | -        | ISO8601      | -        | 作成日時             |
| 10  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時             |

## リクエスト例

```json
PUT /api/v1/shiten/1
Content-Type: application/json

{
  "shiten_name": "本店営業部（名称変更）",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id":1
  "kinyu_shiten_flg": true
}
```

## レスポンス成功例

```json
{
  "data": {
    "shiten_id": 1,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "本店営業部（名称変更）",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-01-15T10:00:00Z",
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
  "errors": [{ "field": "shiten_name", "message": "支店名は必須です" }]
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
  "message": "指定された支店が見つかりません"
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

- パスパラメータ：shiten_id 数値型チェック、必須
- リクエストボディ：
  - shiten_name：必須、最大100桁
  - shiten_name_kana：任意、最大100桁
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`shiten.update` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- フィールドレベル制限：ロールに応じて編集可能なフィールドをフィルタリングする。
  - CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN : shiten_name, shiten_name_kana, kinyu_shiten_flg のみ更新可能

### 4.3 対象レコードの存在確認

- ログインユーザーのスコープを取得する（ja_id）。

```sql
SELECT * FROM m_shiten
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 データ更新

```sql
UPDATE m_shiten
SET shiten_name = :shiten_name,
    shiten_name_kana = :shiten_name_kana,
    kinyu_shiten_flg = :kinyu_shiten_flg,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

- 更新前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。
- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '支店マスタ登録画面 (ACSMS-SCR-007)', 'UPDATE', 1,
        :shiten_id, 'm_shiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：更新前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "shiten_id": 1,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

**after_value 例:**

```json
`after_value`：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "shiten_id": 1,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "本店営業部（名称変更）",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
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
        '支店マスタ登録画面 (ACSMS-SCR-007)', 'UPDATE', 2,
        :shiten_id, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
