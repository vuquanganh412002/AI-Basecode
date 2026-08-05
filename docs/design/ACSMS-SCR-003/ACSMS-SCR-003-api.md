---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-003
screen_name: 単価マスタ登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-09
created_date: 2026/04/06
created_by: Tran Duc Tuyen
updated_date: 2026/04/09
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容               | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | ---------------------- | -------------- | -------------- |
| 1   | 2026/04/06 | 1.0  | Tran Duc Tuyen | 初版作成               | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/04/09 | 1.1  | Tran Duc Tuyen | エラーコード標準化対応 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「単価マスタ登録画面（ACSMS-SCR-003）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-002 | 単価マスタ明細検索画面 API設計書 |

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
| 8   | 画面固有     | NOT_FOUND       | 指定された単価が見つかりません。                                       | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | 同一の単価コードが既に登録されています。                               | HTTP 400 |

---

# API ACSMS-API-003-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Tanka Detail                                                                                                                                                                                       |
| 概要                   | 指定した単価の詳細を取得する（編集モード用）                                                                                                                                                           |
| URI                    | /api/v1/tanka/{tanka_id}                                                                                                                                                                               |
| メソッド               | GET                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                   |
| リクエストパラメーター | tanka_id（パスパラメータ）                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に単価詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された単価が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | tanka_id       | Number | -        | 〇   |        |        | 取得対象の tanka_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID             | タイプ | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data               | Object | -        |              | -        |                          |
| 2   | →tanka_id          | Number | -        |              | -        | 単価ID                   |
| 3   | →ja_id             | Number | -        |              | -        | JA ID                    |
| 4   | →tanka_type        | Number | -        |              | -        | 1: 購読料, 2: 配達手数料 |
| 5   | →tanka_code        | String | -        |              | -        | 単価コード               |
| 6   | →tanka_name        | String | -        |              | -        | 単価名                   |
| 7   | →kingaku_zeikomi   | Number | -        |              | 〇       | 税込金額（円）           |
| 8   | →kingaku_zeinuki   | Number | -        |              | 〇       | 税抜金額（円）           |
| 9   | →tax_rate          | Number | -        | ##.##        | 〇       | 税率（%）                |
| 10  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | 適用開始日               |
| 11  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | 適用終了日               |
| 12  | →active_flg        | Boolean | -        |              | -        | 運用上の有効フラグ（FALSE時は新規割当不可。適用期間とは独立） |
| 13  | →campaign_flg      | Boolean | -        |              | -        | キャンペーンフラグ（TRUE: 有効, FALSE: 無効） |
| 14  | →biko              | String  | -        |              | -        | 備考（NOT NULL、空欄は `""`） |
| 15  | →created_at        | String | -        | ISO8601      | -        | 作成日時                 |
| 16  | →updated_at        | String | -        | ISO8601      | 〇       | 更新日時                 |

## リクエスト例

```
GET /api/v1/tanka/1
```

## レスポンス成功例

```json
{
  "data": {
    "tanka_id": 1,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_code": "T001",
    "tanka_name": "基本購読料（月額）",
    "kingaku_zeikomi": 4900,
    "kingaku_zeinuki": 4455,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-01-01",
    "tekiyo_end_date": null,
    "active_flg": true,
    "campaign_flg": false,
    "biko": "",
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
  "message": "指定された単価が見つかりません"
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
  - tanka_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`tanka.view` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件でデータを取得する。

```sql
SELECT tanka_id, ja_id, tanka_type, tanka_code, tanka_name,
       kingaku_zeikomi, kingaku_zeinuki, tax_rate,
       tekiyo_start_date, tekiyo_end_date, created_at, updated_at
FROM m_tanka
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 レスポンス生成

- tanka_type 値をラベルにマッピング（1 → 新聞購読料, 2 → 配達手数料）
- data オブジェクトを含むJSONを返却する。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-003-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Create Tanka                                                                                                                                                                                                                               |
| 概要                   | 新しい単価を登録する                                                                                                                                                                                                                       |
| URI                    | /api/v1/tanka                                                                                                                                                                                                                              |
| メソッド               | POST                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                     |
| HTTPレスポンスコード   | 201:正常に単価を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:同一の単価コードが既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                           |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------- |
| 1   | tanka_type        | Number  | -        | 〇   |        |        | 単価種別（1: 購読料, 2: 配達手数料）           |
| 2   | tanka_code        | String  | -        | 〇   | 1      | 10     | 単価コード                                     |
| 3   | tanka_name        | String  | -        | 〇   | 1      | 100    | 単価名                                         |
| 4   | tax_rate          | Number  | -        | -    |        |        | 税率（%）0〜100、小数点以下2桁。デフォルト: 0  |
| 5   | kingaku_zeikomi   | Number  | -        | -    |        |        | 税込金額（円）≧0。デフォルト: 0                |
| 6   | kingaku_zeinuki   | Number  | -        | -    |        |        | 税抜金額（円）≧0。デフォルト: 0                |
| 7   | tekiyo_start_date | String  | -        | 〇   |        |        | 適用開始日（YYYY-MM-DD）。必須                 |
| 8   | tekiyo_end_date   | String  | -        | 〇   |        |        | 適用終了日（YYYY-MM-DD）。必須、開始日以降      |
| 9   | biko              | String  | -        | -    |        |        | 備考。空欄可（空文字「""」として保存）          |
| 10  | active_flg        | Boolean | -        | -    |        |        | 運用上の有効フラグ。省略時は TRUE              |
| 11  | campaign_flg      | Boolean | -        | -    |        |        | キャンペーンフラグ。省略時は FALSE            |

## レスポンスデータ

| #   | 項目ID             | タイプ | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data               | Object | -        |              | -        | 登録された単価データ     |
| 2   | →tanka_id          | Number | -        |              | -        | 単価ID                   |
| 3   | →ja_id             | Number | -        |              | -        | JA ID                    |
| 4   | →tanka_type        | Number | -        |              | -        | 1: 購読料, 2: 配達手数料 |
| 5   | →tanka_code        | String | -        |              | -        | 単価コード               |
| 6   | →tanka_name        | String | -        |              | -        | 単価名                   |
| 7   | →kingaku_zeikomi   | Number | -        |              | 〇       | 税込金額（円）           |
| 8   | →kingaku_zeinuki   | Number | -        |              | 〇       | 税抜金額（円）           |
| 9   | →tax_rate          | Number | -        | ##.##        | 〇       | 税率（%）                |
| 10  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | 適用開始日               |
| 11  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | 適用終了日               |
| 12  | →active_flg        | Boolean | -        |              | -        | 運用上の有効フラグ（FALSE時は新規割当不可。適用期間とは独立） |
| 13  | →campaign_flg      | Boolean | -        |              | -        | キャンペーンフラグ（TRUE: 有効, FALSE: 無効） |
| 14  | →biko              | String  | -        |              | -        | 備考（NOT NULL、空欄は `""`） |
| 15  | →created_at        | String | -        | ISO8601      | -        | 作成日時                 |
| 16  | →updated_at        | String | -        | ISO8601      | 〇       | 更新日時                 |

## リクエスト例

```json
POST /api/v1/tanka
Content-Type: application/json

{
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "基本購読料（月額）",
  "tax_rate": 10.0,
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null,
  "active_flg": true,
  "campaign_flg": false,
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "tanka_id": 10,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_code": "T001",
    "tanka_name": "基本購読料（月額）",
    "kingaku_zeikomi": 4900,
    "kingaku_zeinuki": 4455,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-04-01",
    "tekiyo_end_date": null,
    "active_flg": true,
    "campaign_flg": false,
    "biko": "",
    "created_at": "2026-04-09T10:00:00Z",
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
    { "field": "tanka_code", "message": "単価コードは必須です" },
    { "field": "tanka_name", "message": "単価名は必須です" }
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
  "message": "同一の単価コードが既に登録されています"
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

- リクエストボディの検証：
  - tanka_type：必須、1 または 2
  - tanka_code：必須、最大10桁
  - tanka_name：必須、最大100桁
  - tax_rate：0〜100、小数点以下2桁
  - kingaku_zeikomi：≧ 0、数値
  - kingaku_zeinuki：≧ 0、数値
  - tekiyo_start_date：有効な日付形式（YYYY-MM-DD）、新規登録時は過去日不可
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック
- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`tanka.create` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 重複チェック

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件で重複を確認する。**単価コードの一意性は JA 単位**（DB の
  `UQ_m_tanka_ja_code (ja_id, tanka_code)`、画面項目定義 No.2「単価はJAごとに持つ」）。
  他 JA が同じコードを使っていても登録できる。

```sql
SELECT COUNT(*) FROM m_tanka
WHERE ja_id = :ja_id
  AND tanka_code = :tanka_code
```

- `deleted_at` では絞らない。DB の UNIQUE INDEX に `deleted_at` の条件が無く、
  論理削除した単価のコードは再利用できない（生涯予約）ため。

- 重複がある場合：HTTP 400 (`DUPLICATE_CODE`)

### 4.4 データ登録

- tekiyo_start_date が空の場合、CURRENT_DATE を設定する。
- 以下のSQLを実行して登録する。

```sql
INSERT INTO m_tanka (ja_id, tanka_type, tanka_code, tanka_name,
                     kingaku_zeikomi, kingaku_zeinuki, tax_rate,
                     tekiyo_start_date, tekiyo_end_date,
                     created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :tanka_type, :tanka_code, :tanka_name,
        :kingaku_zeikomi, :kingaku_zeinuki, :tax_rate,
        :tekiyo_start_date, :tekiyo_end_date,
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
        '単価マスタ登録画面 (ACSMS-SCR-003)', 'CREATE', 1,
        :tanka_id, 'm_tanka',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
`before_value`：INSERT のため空文字列を設定する。
`after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "tanka_id": 10,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "基本購読料（月額）",
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null,
  "active_flg": true,
  "campaign_flg": false,
  "biko": ""
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
        '単価マスタ登録画面 (ACSMS-SCR-003)', 'CREATE', 2,
        NULL, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-003-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Tanka                                                                                                                                                                                                                       |
| 概要                   | 指定した単価を更新する                                                                                                                                                                                                             |
| URI                    | /api/v1/tanka/{tanka_id}                                                                                                                                                                                                           |
| メソッド               | PUT                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                               |
| リクエストパラメーター | tanka_id（パスパラメータ）                                                                                                                                                                                                         |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                             |
| HTTPレスポンスコード   | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された単価が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                  |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | tanka_id          | Number | -        | 〇   |        |        | 更新対象の tanka_id（パスパラメータ） |
| 2   | tanka_type        | Number | -        | 〇   |        |        | 単価種別（1: 購読料, 2: 配達手数料）  |
| 3   | tanka_name        | String | -        | 〇   | 1      | 100    | 単価名                                |
| 4   | tax_rate          | Number | -        | -    |        |        | 税率（%）                             |
| 5   | kingaku_zeikomi   | Number | -        | -    |        |        | 税込金額（円）                        |
| 6   | kingaku_zeinuki   | Number | -        | -    |        |        | 税抜金額（円）                        |
| 7   | tekiyo_start_date | String | -        | 〇   |        |        | 適用開始日（YYYY-MM-DD）。必須         |
| 8   | tekiyo_end_date   | String | -        | 〇   |        |        | 適用終了日（YYYY-MM-DD）。必須、開始日以降 |
| 9   | biko              | String | -        | -    |        |        | 備考。空欄可                          |
| 10  | active_flg        | Boolean | -        | -    |        |        | 運用上の有効フラグ                    |
| 11  | campaign_flg      | Boolean | -        | -    |        |        | キャンペーンフラグ                    |

※ tanka_code は更新不可（画面側でdisabled）。リクエストに含めない。

## レスポンスデータ

| #   | 項目ID             | タイプ | 繰り返し | フォーマット | Nullable | 説明                                |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ----------------------------------- |
| 1   | data               | Object | -        |              | -        | 更新された単価データ                |
| 2   | →tanka_id          | Number | -        |              | -        | 単価ID                              |
| 3   | →ja_id             | Number | -        |              | -        | JA ID                               |
| 4   | →tanka_type        | Number | -        |              | -        | 1: 購読料, 2: 配達手数料            |
| 5   | →tanka_code        | String | -        |              | -        | 単価コード , 編集しないでください。 |
| 6   | →tanka_name        | String | -        |              | -        | 単価名                              |
| 7   | →kingaku_zeikomi   | Number | -        |              | 〇       | 税込金額（円）                      |
| 8   | →kingaku_zeinuki   | Number | -        |              | 〇       | 税抜金額（円）                      |
| 9   | →tax_rate          | Number | -        | ##.##        | 〇       | 税率（%）                           |
| 10  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | 適用開始日                          |
| 11  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | 適用終了日                          |
| 12  | →active_flg        | Boolean | -        |              | -        | 運用上の有効フラグ（FALSE時は新規割当不可。適用期間とは独立） |
| 13  | →campaign_flg      | Boolean | -        |              | -        | キャンペーンフラグ（TRUE: 有効, FALSE: 無効） |
| 14  | →biko              | String  | -        |              | -        | 備考（NOT NULL、空欄は `""`）       |
| 15  | →created_at        | String | -        | ISO8601      | -        | 作成日時                            |
| 16  | →updated_at        | String | -        | ISO8601      | 〇       | 更新日時                            |

## リクエスト例

```json
PUT /api/v1/tanka/1
Content-Type: application/json

{
  "tanka_type": 1,
  "tanka_name": "基本購読料（月額）改定",
  "tax_rate": 10.0,
  "kingaku_zeikomi": 5200,
  "kingaku_zeinuki": 4727,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null,
  "active_flg": true,
  "campaign_flg": false,
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "tanka_id": 1,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_code": "T001",
    "tanka_name": "基本購読料（月額）改定",
    "kingaku_zeikomi": 5200,
    "kingaku_zeinuki": 4727,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-04-01",
    "tekiyo_end_date": null,
    "active_flg": true,
    "campaign_flg": false,
    "biko": "",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-09T14:30:00Z"
  }
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tanka_name", "message": "単価名は必須です" }]
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
  "message": "指定された単価が見つかりません"
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

- パスパラメータ：tanka_id 数値型チェック、必須
- リクエストボディ：
  - tanka_type：必須、1 または 2
  - tanka_name：必須、最大100桁
  - tax_rate：0〜100、小数点以下2桁
  - kingaku_zeikomi：≧ 0、数値
  - kingaku_zeinuki：≧ 0、数値
  - tekiyo_start_date：有効な日付形式。過去日の場合は変更不可
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`tanka.update` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認

- ログインユーザーのスコープを取得する（ja_id）。

```sql
SELECT * FROM m_tanka
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 データ更新

```sql
UPDATE m_tanka
SET tanka_type = :tanka_type,
    tanka_name = :tanka_name,
    kingaku_zeikomi = :kingaku_zeikomi,
    kingaku_zeinuki = :kingaku_zeinuki,
    tax_rate = :tax_rate,
    tekiyo_start_date = :tekiyo_start_date,
    tekiyo_end_date = :tekiyo_end_date,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE tanka_id = :tanka_id
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
        '単価マスタ登録画面 (ACSMS-SCR-003)', 'UPDATE', 1,
        :tanka_id, 'm_tanka',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：更新前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "tanka_id": 1,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "基本購読料（月額）",
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-01-01",
  "tekiyo_end_date": null,
  "active_flg": true,
  "campaign_flg": false,
  "biko": ""
}
```

**after_value 例:**

```json
 `after_value`：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "tanka_id": 1,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "基本購読料（月額）改定",
  "kingaku_zeikomi": 5200,
  "kingaku_zeinuki": 4727,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null,
  "active_flg": true,
  "campaign_flg": false,
  "biko": ""
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
        '単価マスタ登録画面 (ACSMS-SCR-003)', 'UPDATE', 2,
        :tanka_id, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
