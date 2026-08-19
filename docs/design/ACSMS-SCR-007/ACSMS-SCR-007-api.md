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
| 9   | 画面固有     | DUPLICATE_CODE        | 支店コード「{shiten_code}」はすでに登録されています。                  | HTTP 400 |

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
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に支店詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id      | Number | -        | 〇   |        |        | 取得対象の shiten_id（パスパラメータ）  |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                              | Object  | -        |              | -        |                                        |
| 2   | →shiten_id                        | Number  | -        |              | -        | 支店ID                                 |
| 3   | →ja_id                            | Number  | -        |              | -        | JA ID                                  |
| 4   | →shiten_code                      | String  | -        |              | -        | 支店コード                             |
| 5   | →shiten_name                      | String  | -        |              | -        | 支店名称                               |
| 6   | →shiten_name_kana                 | String  | -        |              | -        | 支店名称（カナ）                       |
| 7   | →kinyu_shiten_flg                 | Boolean | -        |              | -        | 金融機関支店フラグ                     |
| 8   | →jastem_toriatsukai_tenpo_code    | String  | -        |              | -        | JASTEM_データ送信取扱店舗コード※空文字許容 |
| 9   | →jastem_tenpo_name                | String  | -        |              | -        | JASTEM_店舗名※空文字許容              |
| 10  | →jastem_tyokin_shubetsu           | String  | -        |              | -        | JASTEM_貯金種別※空文字許容            |
| 11  | →jastem_koza_no                   | String  | -        |              | -        | JASTEM_口座番号※空文字許容            |
| 12  | →kanri_shiten_id                  | Number  | -        |              | -        | 管理支店ID                             |
| 13  | →biko                             | String  | -        |              | -        | 備考※空文字許容                        |
| 14  | →created_at                       | String  | -        | ISO8601      | -        | 作成日時                               |
| 15  | →updated_at                       | String  | -        | ISO8601      | 〇       | 更新日時                               |

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
    "shiten_code": "001",
    "shiten_name": "本店営業部",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "jastem_tyokin_shubetsu": "1",
    "jastem_koza_no": "1234567",
    "kanri_shiten_id": 1,
    "biko": "本店ビル1F",
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
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された支店が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - shiten_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`shiten.view` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件でデータを取得する。

```sql
SELECT shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
       kinyu_shiten_flg,
       jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
       jastem_tyokin_shubetsu, jastem_koza_no,
       kanri_shiten_id, biko, created_at, updated_at
FROM m_shiten
WHERE shiten_id = :shiten_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- レコードは存在するが `ja_id` がログインユーザーのスコープと一致しない場合も
  同じく HTTP 404 (`NOT_FOUND`) を返却する（行の存在を漏らさないため、範囲外の
  ja_id 不一致は 403 でなく 404 でマスクする — `assertJaScope` 実装準拠）。

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
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                              |
| HTTPレスポンスコード   | 201:正常に支店を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:同一の支店コードが既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID                  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                       |
| --- | ------------------------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | shiten_code                     | String | -        | 〇   | 3      | 3      | 支店コード（半角数字3桁固定）              |
| 2   | shiten_name                     | String | -        | 〇   | 1      | 100    | 支店名称                                   |
| 3   | shiten_name_kana                | String | -        | -    |        | 100    | 支店名称（カナ）                           |
| 4   | kanri_shiten_id                 | Number | -        | 〇   |        |        | 管理支店ID（プルダウン選択値、m_kanri_shitenに存在すること） |
| 5   | kinyu_shiten_flg                | Boolean| -        |  -   |        |        | 金融機関支店フラグ（デフォルト: false）   |
| 6   | jastem_toriatsukai_tenpo_code   | String | -        | △※   |        | 3      | JASTEM_データ送信取扱店舗コード。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 7   | jastem_tenpo_name               | String | -        | △※   |        | 15     | JASTEM_店舗名。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 8   | jastem_tyokin_shubetsu          | String | -        | △※   |        | 1      | JASTEM_貯金種別。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 9   | jastem_koza_no                  | String | -        | △※   |        | 7      | JASTEM_口座番号。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 10  | biko                            | String | -        | -    |        | 500    | 備考※空文字許容                            |

> ※ 金融機関支店フラグ（kinyu_shiten_flg）= true のとき、JASTEM 4項目（データ送信取扱店舗コード / 店舗名 / 貯金種別 / 口座番号）は必須。未入力で submit すると `必須項目です。`（VALIDATION_ERROR）。BE は `@ValidateIf` + `@IsNotEmpty` で判定。

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                              | Object  | -        |              | -        | 登録された支店データ                   |
| 2   | →shiten_id                        | Number  | -        |              | -        | 支店ID                                 |
| 3   | →ja_id                            | Number  | -        |              | -        | JA ID                                  |
| 4   | →shiten_code                      | String  | -        |              | -        | 支店コード                             |
| 5   | →shiten_name                      | String  | -        |              | -        | 支店名称                               |
| 6   | →shiten_name_kana                 | String  | -        |              | -        | 支店名称（カナ）                       |
| 7   | →kinyu_shiten_flg                 | Boolean | -        |              | -        | 金融機関支店フラグ                     |
| 8   | →jastem_toriatsukai_tenpo_code    | String  | -        |              | -        | JASTEM_データ送信取扱店舗コード※空文字許容 |
| 9   | →jastem_tenpo_name                | String  | -        |              | -        | JASTEM_店舗名※空文字許容              |
| 10  | →jastem_tyokin_shubetsu           | String  | -        |              | -        | JASTEM_貯金種別※空文字許容            |
| 11  | →jastem_koza_no                   | String  | -        |              | -        | JASTEM_口座番号※空文字許容            |
| 12  | →kanri_shiten_id                  | Number  | -        |              | -        | 管理支店ID                             |
| 13  | →biko                             | String  | -        |              | -        | 備考※空文字許容                        |
| 14  | →created_at                       | String  | -        | ISO8601      | -        | 作成日時                               |
| 15  | →updated_at                       | String  | -        | ISO8601      | 〇       | 更新日時                               |

## リクエスト例

```json
POST /api/v1/shiten
Content-Type: application/json

{
  "shiten_code": "001",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id": 1,
  "kinyu_shiten_flg": false,
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "本店",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "biko": "本店ビル1F"
}
```

## レスポンス成功例

```json
{
  "data": {
    "shiten_id": 10,
    "ja_id": 1,
    "shiten_code": "001",
    "shiten_name": "本店営業部",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "jastem_tyokin_shubetsu": "1",
    "jastem_koza_no": "1234567",
    "kanri_shiten_id": 1,
    "biko": "本店ビル1F",
    "created_at": "2026-04-14T10:00:00Z",
    "updated_at": "2026-04-14T10:00:00Z"
  }
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "shiten_code", "message": "支店コードを入力してください。" },
    { "field": "shiten_name", "message": "支店名を入力してください。" }
  ]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 400 Bad Request（重複）

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "支店コード「001」はすでに登録されています。"
}
```

### 400 Bad Request（管理支店IDが存在しない場合）

```json
{
  "error_code": "BAD_REQUEST",
  "message": "管理支店IDが存在しません。"
}
```

### 403 Forbidden（管理支店IDが別JAに属する場合）

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - shiten_code：必須、半角数字3桁固定
  - shiten_name：必須、最大100桁
  - shiten_name_kana：任意、最大100桁
  - kanri_shiten_id：必須、数値型チェック
  - kinyu_shiten_flg：任意、ブール値（未指定の場合はデフォルト false）
  - jastem_toriatsukai_tenpo_code：任意、最大3桁
  - jastem_tenpo_name：任意、最大15桁
  - jastem_tyokin_shubetsu：任意、最大1桁
  - jastem_koza_no：任意、最大7桁
  - biko：任意、文字列
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`shiten.create` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 管理支店IDの検証・重複チェック

- ログインユーザーのスコープを取得する（ja_id）。
- kanri_shiten_id が m_kanri_shiten に存在し、かつログインユーザーの ja_id に
  属することを検証する（FKガード、他JAの管理支店IDを偽装したcross-tenant書込み
  を防止 — `fetchFkInJa` 実装準拠）。
  - レコードが存在しない場合：HTTP 400 (`BAD_REQUEST`) `管理支店IDが存在しません。`
  - レコードは存在するが ja_id が異なる場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
    `このデータへのアクセス権限がありません。`
- 以下の条件で shiten_code の重複を確認する。

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
                      kinyu_shiten_flg,
                      jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
                      jastem_tyokin_shubetsu, jastem_koza_no,
                      kanri_shiten_id, biko,
                      created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :shiten_code, :shiten_name, :shiten_name_kana,
        :kinyu_shiten_flg,
        :jastem_toriatsukai_tenpo_code, :jastem_tenpo_name,
        :jastem_tyokin_shubetsu, :jastem_koza_no,
        :kanri_shiten_id, :biko,
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
  "shiten_code": "001",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "本店",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "kanri_shiten_id": 1,
  "biko": "本店ビル1F"
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
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                     |
| HTTPレスポンスコード   | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID                  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | ------------------------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id                       | Number | -        | 〇   |        |        | 更新対象の shiten_id（パスパラメータ）  |
| 2   | shiten_name                     | String | -        | 〇   | 1      | 100    | 支店名称                                |
| 3   | shiten_name_kana                | String | -        | -    |        | 100    | 支店名称（カナ）                        |
| 4   | kanri_shiten_id                 | Number | -        | 〇   |        |        | 管理支店ID（m_kanri_shitenに存在し、対象支店と同一JAに属すること） |
| 5   | kinyu_shiten_flg                | Boolean| -        | -    |        |        | 金融機関支店フラグ                       |
| 6   | jastem_toriatsukai_tenpo_code   | String | -        | △※   |        | 3      | JASTEM_データ送信取扱店舗コード。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 7   | jastem_tenpo_name               | String | -        | △※   |        | 15     | JASTEM_店舗名。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 8   | jastem_tyokin_shubetsu          | String | -        | △※   |        | 1      | JASTEM_貯金種別。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 9   | jastem_koza_no                  | String | -        | △※   |        | 7      | JASTEM_口座番号。kinyu_shiten_flg=true 時は必須（必須項目です。）、false 時は空文字許容 |
| 10  | biko                            | String | -        | -    |        | 500    | 備考※空文字許容                          |

> ※ 金融機関支店フラグ（kinyu_shiten_flg）= true のとき、JASTEM 4項目は必須（未入力で submit すると `必須項目です。` / VALIDATION_ERROR）。BE は `@ValidateIf` + `@IsNotEmpty` で判定。
※ shiten_code は更新不可（画面側でdisabled）。リクエストに含めない。

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data                              | Object  | -        |              | -        | 更新された支店データ                   |
| 2   | →shiten_id                        | Number  | -        |              | -        | 支店ID                                 |
| 3   | →ja_id                            | Number  | -        |              | -        | JA ID                                  |
| 4   | →shiten_code                      | String  | -        |              | -        | 支店コード                             |
| 5   | →shiten_name                      | String  | -        |              | -        | 支店名称                               |
| 6   | →shiten_name_kana                 | String  | -        |              | -        | 支店名称（カナ）                       |
| 7   | →kinyu_shiten_flg                 | Boolean | -        |              | -        | 金融機関支店フラグ                     |
| 8   | →jastem_toriatsukai_tenpo_code    | String  | -        |              | -        | JASTEM_データ送信取扱店舗コード※空文字許容 |
| 9   | →jastem_tenpo_name                | String  | -        |              | -        | JASTEM_店舗名※空文字許容              |
| 10  | →jastem_tyokin_shubetsu           | String  | -        |              | -        | JASTEM_貯金種別※空文字許容            |
| 11  | →jastem_koza_no                   | String  | -        |              | -        | JASTEM_口座番号※空文字許容            |
| 12  | →kanri_shiten_id                  | Number  | -        |              | -        | 管理支店ID                             |
| 13  | →biko                             | String  | -        |              | -        | 備考※空文字許容                        |
| 14  | →created_at                       | String  | -        | ISO8601      | -        | 作成日時                               |
| 15  | →updated_at                       | String  | -        | ISO8601      | 〇       | 更新日時                               |

## リクエスト例

```json
PUT /api/v1/shiten/1
Content-Type: application/json

{
  "shiten_name": "本店営業部（名称変更）",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id": 1,
  "kinyu_shiten_flg": true,
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "本店",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "biko": "本店ビル1F 改装済み"
}
```

## レスポンス成功例

```json
{
  "data": {
    "shiten_id": 1,
    "ja_id": 1,
    "shiten_code": "001",
    "shiten_name": "本店営業部（名称変更）",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": true,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "jastem_tyokin_shubetsu": "1",
    "jastem_koza_no": "1234567",
    "kanri_shiten_id": 1,
    "biko": "本店ビル1F 改装済み",
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
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "shiten_name", "message": "支店名を入力してください。" }]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された支店が見つかりません。"
}
```

### 400 Bad Request（管理支店IDが存在しない場合）

```json
{
  "error_code": "BAD_REQUEST",
  "message": "管理支店IDが存在しません。"
}
```

### 403 Forbidden（管理支店IDが別JAに属する場合）

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：shiten_id 数値型チェック、必須
- リクエストボディ：
  - shiten_name：必須、最大100桁
  - shiten_name_kana：任意、最大100桁
  - kanri_shiten_id：必須、数値型チェック
  - kinyu_shiten_flg：任意、ブール値
  - jastem_toriatsukai_tenpo_code：任意、最大3桁
  - jastem_tenpo_name：任意、最大15桁
  - jastem_tyokin_shubetsu：任意、最大1桁
  - jastem_koza_no：任意、最大7桁
  - biko：任意、文字列
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`shiten.update` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- フィールドレベル制限：ロールに応じて編集可能なフィールドをフィルタリングする
  （詳細は §4.4.1 参照）。
  - NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN：全カラム編集可能
  - JA_KANRI_SHITEN：`kanri_shiten_id` 以外の全カラムのみ編集可能
    （管理支店の再割当ては上位ロールのみが行う）

### 4.3 対象レコードの存在確認

- ログインユーザーのスコープを取得する（ja_id）。

```sql
SELECT shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
       kinyu_shiten_flg,
       jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
       jastem_tyokin_shubetsu, jastem_koza_no,
       kanri_shiten_id, biko, created_at, updated_at
FROM m_shiten
WHERE shiten_id = :shiten_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- レコードは存在するが `ja_id` がログインユーザーのスコープと一致しない場合も
  同じく HTTP 404 (`NOT_FOUND`) を返却する（行の存在を漏らさないため、範囲外の
  ja_id 不一致は 403 でなく 404 でマスクする — `assertJaScope` 実装準拠）。
- 同一JA内であっても、JA_KANRI_SHITEN が自身の `kanri_shiten_id` に属さない支店
  （自管理支店配下でない支店）を更新しようとした場合：HTTP 403
  (`DATA_SCOPE_VIOLATION`)。この行は一覧（GET /api/v1/shiten）では閲覧可能な
  ため 404 でマスクせず明示的に拒否する（`assertBranchScopeViolation` 実装準拠。
  CHUOKAI / JA_HONTEN は ja_id のみで判定するため同一JA内は常に通過する）。
- `kinyu_shiten_flg` がリクエストに含まれ、かつ既存値と異なる場合：HTTP 400
  (`VALIDATION_ERROR`)、`errors: [{ "field": "kinyu_shiten_flg", "message":
  "金融機関支店フラグは変更できません。" }]`。金融機関支店フラグは作成後変更
  不可（顧客要件 2026-07）— ロールを問わず一律で拒否する（フィールドレベル
  制限より優先して判定される）。
- kanri_shiten_id がリクエストに含まれる場合、その値が m_kanri_shiten に存在し、
  かつ対象支店の既存 ja_id（`before.ja_id`）に属することを検証する（FKガード —
  `fetchFkInJa` 実装準拠。CHUOKAI/JA_HONTEN 等の制限ロールでは session.ja_id と
  一致、NICHINO_* が別JAの行を操作しても対象行のJAに束縛される）。
  - レコードが存在しない場合：HTTP 400 (`BAD_REQUEST`) `管理支店IDが存在しません。`
  - レコードは存在するが JA が異なる場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
    `このデータへのアクセス権限がありません。`

### 4.4 データ更新

#### 4.4.1 フィールドレベル制限（顧客レビュー 2026-05）

更新リクエストはロールごとに編集可能カラムが異なる。BE 側で
`filterAllowedFields` がリクエストボディの非許可キーをサイレント
ドロップする（HTTP 400 は返さない）。FE 側 `ShitenFormView.vue`
は非許可カラムを `:disabled` で表示するため、UI 通過のリクエストは
通常ドロップ対象を含まない — ただし curl 直叩きへの防御として BE
ドロップは必須。

| ロール             | 編集可能カラム                                    |
|---|---|
| NICHINO_ADMIN      | 全カラム                                          |
| NICHINO_STAFF      | 全カラム                                          |
| CHUOKAI            | 全カラム                                          |
| JA_HONTEN          | 全カラム                                          |
| JA_KANRI_SHITEN    | `kanri_shiten_id` 以外の全カラム ※                |

※ JA_KANRI_SHITEN は支店の所属管理支店を変更できない（上位ロール
のみが管理支店の再割当てを行う）。`kanri_shiten_id` を含む PUT を
送ると BE 側で当該フィールドのみドロップし、他のカラムは通常通り
更新される。`shiten_code` は全ロールで編集不可（`UpdateShitenDto`
に存在しないため `ValidationPipe` が `forbidNonWhitelisted` で
拒否）。

実装：[`shiten.service.ts` `FIELD_RESTRICTIONS`](../../../apps/backend/src/modules/shiten/shiten.service.ts) +
[`.claude/rules/security.md` §Layer 3](../../../.claude/rules/security.md)。

#### 4.4.2 UPDATE SQL

`filterAllowedFields` を通った後の値を `pickXxx(...)` で個別に取得
する — DTO から落とされたキーは `before.*` の現在値が `:column`
にセットされ、結果として「変更なし」になる。

```sql
UPDATE m_shiten
SET shiten_name = :shiten_name,
    shiten_name_kana = :shiten_name_kana,
    kinyu_shiten_flg = :kinyu_shiten_flg,
    jastem_toriatsukai_tenpo_code = :jastem_toriatsukai_tenpo_code,
    jastem_tenpo_name = :jastem_tenpo_name,
    jastem_tyokin_shubetsu = :jastem_tyokin_shubetsu,
    jastem_koza_no = :jastem_koza_no,
    kanri_shiten_id = :kanri_shiten_id,
    biko = :biko,
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
  "shiten_code": "001",
  "shiten_name": "本店営業部",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "本店",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "kanri_shiten_id": 1,
  "biko": "本店ビル1F"
}
```

**after_value 例:**

```json
`after_value`：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "shiten_id": 1,
  "ja_id": 1,
  "shiten_code": "001",
  "shiten_name": "本店営業部（名称変更）",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": true,
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "本店",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "kanri_shiten_id": 1,
  "biko": "本店ビル1F 改装済み"
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
