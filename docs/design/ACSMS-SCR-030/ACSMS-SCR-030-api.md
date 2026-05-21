---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-030
screen_name: ログ参照画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-20
created_date: 2026/04/20
created_by: Nguyen Duyen Manh
updated_date: 2026/04/20
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/20 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「ログ参照画面（ACSMS-SCR-030）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                                                 |
| --- | -------------------- | -------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-005 | Get Account Dropdown (`GET /api/v1/account/dropdown`) — 定義元: ACSMS-SCR-030          |

※ 本画面の「ユーザー名」セレクトボックスは共用API `ACSMS-API-COMMON-005` を使用する（DataScopeは呼び出しアカウントに基づき自動適用）。

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
| 8   | 画面固有     | DATE_RANGE_INVALID    | 「開始日」は「終了日」以前の日付を入力してください。                   | HTTP 400 |
| 9   | 画面固有     | DATE_RANGE_TOO_LONG   | 検索期間は1年以内で指定してください。                                  | HTTP 400 |
| 10  | 画面固有     | EXPORT_LIMIT_EXCEEDED | 検索結果が5,000件を超えています。条件を絞り込んでください。            | HTTP 409 |

---

# API ACSMS-API-030-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Log List                                                                                                                                                                                                                          |
| 概要                   | 操作ログ一覧を取得する（検索条件・DataScope適用、ページネーション対応）                                                                                                                                                               |
| URI                    | /api/v1/log                                                                                                                                                                                                                           |
| メソッド               | GET                                                                                                                                                                                                                                   |
| リクエストボディー     | なし                                                                                                                                                                                                                                  |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常にログ一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                   |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------------------------------------------------------- |
| 1   | date_from      | String | -        | -    |        |        | 期間（開始日時）（YYYY/MM/DD HH:mm:ss）                                                |
| 2   | date_to        | String | -        | -    |        |        | 期間（終了日時）（YYYY/MM/DD HH:mm:ss）                                                |
| 3   | log_type       | Number | -        | -    |        |        | ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード、未指定=すべて）|
| 4   | account_id     | Number | -        | -    |        |        | アカウントID（ユーザー絞り込み）                                                       |
| 5   | page           | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                                            |
| 6   | per_page       | Number | -        | -    |        |        | 1ページの件数（デフォルト: 20、最大: 100）                                             |
| 7   | sort_by        | String | -        | -    |        |        | ソートカラム（デフォルト: log_datetime）                                               |
| 8   | sort_order     | String | -        | -    |        |        | ソート順（asc / desc、デフォルト: desc）                                               |

## レスポンスデータ

| #   | 項目ID                | タイプ | 繰り返し | フォーマット        | Nullable | 説明                                                        |
| --- | --------------------- | ------ | -------- | ------------------- | -------- | ----------------------------------------------------------- |
| 1   | data                  | Array  | 〇       |                     | -        | ログ一覧                                                    |
| 2   | →log_id               | Number | -        |                     | -        | ログID                                                      |
| 3   | →log_type             | Number | -        |                     | -        | ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード） |
| 4   | →log_type_label       | String | -        |                     | -        | ログ種別ラベル                                              |
| 5   | →log_datetime         | String | -        | YYYY/MM/DD HH:mm:ss | -        | 操作日時                                                    |
| 6   | →account_id           | Number | -        |                     | 〇       | アカウントID                                                |
| 7   | →login_id             | String | -        |                     | 〇       | ログインID                                                  |
| 8   | →account_name         | String | -        |                     | 〇       | アカウント名                                                |
| 9   | →ja_id                | Number | -        |                     | 〇       | JA ID                                                       |
| 10  | →gamen_name           | String | -        |                     | -        | 画面名                                                      |
| 11  | →operation            | String | -        |                     | -        | 操作内容                                                    |
| 12  | →result_status        | Number | -        |                     | -        | 結果ステータス（1:成功, 2:失敗, 3:警告）                    |
| 13  | →result_status_label  | String | -        |                     | -        | 結果ステータスラベル                                        |
| 14  | →target_id            | Number | -        |                     | 〇       | 操作対象ID                                                  |
| 15  | →target_table         | String | -        |                     | -        | 操作対象テーブル                                            |
| 16  | →after_value          | String | -        |                     | -        | 変更後値（JSON、詳細欄に表示）                              |
| 17  | →ip_address           | String | -        |                     | -        | IPアドレス                                                  |
| 18  | meta                  | Object | -        |                     | -        | ページネーション情報                                        |
| 19  | →total                | Number | -        |                     | -        | 総件数                                                      |
| 20  | →page                 | Number | -        |                     | -        | 現在ページ番号                                              |
| 21  | →per_page             | Number | -        |                     | -        | 1ページの件数                                               |
| 22  | →total_pages          | Number | -        |                     | -        | 総ページ数                                                  |

## リクエスト例

```
GET /api/v1/log?date_from=2026/04/01%2000:00:00&date_to=2026/04/17%2023:59:59&log_type=1&page=1&per_page=20&sort_by=log_datetime&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "log_id": 10500,
      "log_type": 1,
      "log_type_label": "ユーザー操作",
      "log_datetime": "2026/04/17 14:30:45",
      "account_id": 10,
      "login_id": "ja_honten_001",
      "account_name": "JA本店 太郎",
      "ja_id": 100,
      "gamen_name": "単価マスタ登録画面 (ACSMS-SCR-003)",
      "operation": "CREATE",
      "result_status": 1,
      "result_status_label": "成功",
      "target_id": 50,
      "target_table": "m_tanka",
      "after_value": "{\"tanka_id\":50,\"tanka_code\":\"T050\",\"tanka_name\":\"新単価\"}",
      "ip_address": "192.168.1.100"
    },
    {
      "log_id": 10499,
      "log_type": 3,
      "log_type_label": "エラー",
      "log_datetime": "2026/04/17 14:25:10",
      "account_id": 10,
      "login_id": "ja_honten_001",
      "account_name": "JA本店 太郎",
      "ja_id": 100,
      "gamen_name": "購読者情報登録画面 (ACSMS-SCR-005)",
      "operation": "CREATE",
      "result_status": 2,
      "result_status_label": "失敗",
      "target_id": null,
      "target_table": "t_dokusya",
      "after_value": "",
      "ip_address": "192.168.1.100"
    }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "per_page": 20,
    "total_pages": 13
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

### 400 Validation Error（期間相関エラー）

```json
{
  "error_code": "DATE_RANGE_INVALID",
  "message": "「開始日」は「終了日」以前の日付を入力してください"
}
```

### 400 Validation Error（期間が1年超過）

```json
{
  "error_code": "DATE_RANGE_TOO_LONG",
  "message": "検索期間は1年以内で指定してください"
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
  - date_from / date_to：有効な日時形式（YYYY/MM/DD HH:mm:ss）
  - date_from > date_to の場合：HTTP 400 (`DATE_RANGE_INVALID`)
  - date_to - date_from > 365日 の場合：HTTP 400 (`DATE_RANGE_TOO_LONG`)
  - log_type：1〜4 または未指定
  - account_id：数値型
  - page：1以上
  - per_page：1〜100
  - sort_by：許可カラム一覧に含まれるか確認（log_datetime, log_type, result_status）
  - sort_order：`asc` または `desc`
- デフォルト値を設定する（page=1, per_page=20, sort_by=log_datetime, sort_order=desc）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`log.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN, NICHINO_STAFF, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN（全ロール保持）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- DataScope を role_code により適用する：
  - `NICHINO_ADMIN` / `NICHINO_STAFF`：全ログを参照可（スコープ絞込なし）
  - `CHUOKAI`：`l.ja_id = :user_ja_id`（自中央会JAのログのみ）
  - `JA_HONTEN`：`l.ja_id = :user_ja_id`（自JAのログのみ、管理支店のログを含む）
  - `JA_KANRI_SHITEN`：ログのアカウントが自管理支店に所属するもののみ（`a.kanri_shiten_id = :user_kanri_shiten_id`）
- 検索条件を追加する：
  - date_from 指定時：`l.log_datetime >= :date_from`
  - date_to 指定時：`l.log_datetime <= :date_to`
  - log_type 指定時：`l.log_type = :log_type`
  - account_id 指定時：`l.account_id = :account_id`

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_log l
LEFT JOIN m_account a ON a.account_id = l.account_id AND a.deleted_at IS NULL
WHERE 1 = 1
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND l.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND a.kanri_shiten_id = :user_kanri_shiten_id
  /* 検索条件 */
  AND (:date_from IS NULL OR l.log_datetime >= :date_from)
  AND (:date_to IS NULL OR l.log_datetime <= :date_to)
  AND (:log_type IS NULL OR l.log_type = :log_type)
  AND (:account_id IS NULL OR l.account_id = :account_id)
```

### 4.5 データ取得

```sql
SELECT l.log_id, l.log_type, l.log_datetime,
       l.account_id, a.login_id, a.account_name,
       l.ja_id, l.gamen_name, l.operation,
       l.result_status, l.target_id, l.target_table,
       l.after_value, l.ip_address
FROM t_log l
LEFT JOIN m_account a ON a.account_id = l.account_id AND a.deleted_at IS NULL
WHERE 1 = 1
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND l.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND a.kanri_shiten_id = :user_kanri_shiten_id
  /* 検索条件 */
  AND (:date_from IS NULL OR l.log_datetime >= :date_from)
  AND (:date_to IS NULL OR l.log_datetime <= :date_to)
  AND (:log_type IS NULL OR l.log_type = :log_type)
  AND (:account_id IS NULL OR l.account_id = :account_id)
ORDER BY l.:sort_by :sort_order
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- log_type をラベルにマッピング（1→ユーザー操作, 2→システム, 3→エラー, 4→ファイルアップロード）
- result_status をラベルにマッピング（1→成功, 2→失敗, 3→警告）
- log_datetime を `YYYY/MM/DD HH:mm:ss` 形式でフォーマットする。
- data 配列と meta オブジェクトを含むJSONを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-030-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Log CSV                                                                                                                                                                                                                                          |
| 概要                   | 現在の検索条件で操作ログをCSV形式で出力する（最大5,000件、超過時は409エラー）                                                                                                                                                                           |
| URI                    | /api/v1/log/export                                                                                                                                                                                                                                      |
| メソッド               | GET                                                                                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                                                                                    |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                                        |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                  |
| HTTPレスポンスコード   | 200:正常にCSVをダウンロードしました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 409:検索結果が5,000件を超えています, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                   |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------------------------------------------------------------- |
| 1   | date_from      | String | -        | -    |        |        | 期間（開始日時）（YYYY/MM/DD HH:mm:ss）                                                |
| 2   | date_to        | String | -        | -    |        |        | 期間（終了日時）（YYYY/MM/DD HH:mm:ss）                                                |
| 3   | log_type       | Number | -        | -    |        |        | ログ種別（1:ユーザー操作, 2:システム, 3:エラー, 4:ファイルアップロード、未指定=すべて）|
| 4   | account_id     | Number | -        | -    |        |        | アカウントID（ユーザー絞り込み）                                                       |

## レスポンスデータ

CSVファイル（`Content-Type: text/csv; charset=utf-8`、UTF-8 BOM付き）

### レスポンスヘッダ

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="log_export_YYYYMMDD_HHmmss.csv"
```

### CSVフォーマット

| 列順 | カラム名           | 説明                         |
| ---- | ------------------ | ---------------------------- |
| 1    | ログID             | log_id                       |
| 2    | ログ種別           | log_type_label               |
| 3    | 日時               | log_datetime                 |
| 4    | ユーザーID         | login_id                     |
| 5    | JA ID              | ja_id                        |
| 6    | 画面名             | gamen_name                   |
| 7    | 操作内容           | operation                    |
| 8    | 結果               | result_status_label          |
| 9    | 対象ID             | target_id                    |
| 10   | 対象テーブル       | target_table                 |
| 11   | IPアドレス         | ip_address                   |

## リクエスト例

```
GET /api/v1/log/export?date_from=2026/04/01%2000:00:00&date_to=2026/04/17%2023:59:59&log_type=1
```

## レスポンス成功例

```csv
"ログID","ログ種別","日時","ユーザーID","JA ID","画面名","操作内容","結果","対象ID","対象テーブル","IPアドレス"
"10500","ユーザー操作","2026/04/17 14:30:45","ja_honten_001","100","単価マスタ登録画面 (ACSMS-SCR-003)","CREATE","成功","50","m_tanka","192.168.1.100"
"10499","エラー","2026/04/17 14:25:10","ja_honten_001","100","購読者情報登録画面 (ACSMS-SCR-005)","CREATE","失敗","","t_dokusya","192.168.1.100"
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

### 409 Conflict（件数超過）

```json
{
  "error_code": "EXPORT_LIMIT_EXCEEDED",
  "message": "検索結果が5,000件を超えています。条件を絞り込んでください"
}
```

### 400 Validation Error

```json
{
  "error_code": "DATE_RANGE_INVALID",
  "message": "「開始日」は「終了日」以前の日付を入力してください"
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
  - date_from / date_to：有効な日時形式（YYYY/MM/DD HH:mm:ss）
  - date_from > date_to の場合：HTTP 400 (`DATE_RANGE_INVALID`)
  - date_to - date_from > 365日 の場合：HTTP 400 (`DATE_RANGE_TOO_LONG`)
  - log_type：1〜4 または未指定
  - account_id：数値型
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`log.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN, NICHINO_STAFF, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN（全ロール保持）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ件数チェック（5,000件上限）

- 検索条件で対象件数を先にカウントする（DataScope適用）。

```sql
SELECT COUNT(*)
FROM t_log l
LEFT JOIN m_account a ON a.account_id = l.account_id AND a.deleted_at IS NULL
WHERE 1 = 1
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND l.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND a.kanri_shiten_id = :user_kanri_shiten_id
  /* 検索条件 */
  AND (:date_from IS NULL OR l.log_datetime >= :date_from)
  AND (:date_to IS NULL OR l.log_datetime <= :date_to)
  AND (:log_type IS NULL OR l.log_type = :log_type)
  AND (:account_id IS NULL OR l.account_id = :account_id)
```

- 件数が 5,000 を超える場合：HTTP 409 (`EXPORT_LIMIT_EXCEEDED`)

### 4.4 データ取得

```sql
SELECT l.log_id, l.log_type, l.log_datetime,
       l.account_id, a.login_id,
       l.ja_id, l.gamen_name, l.operation,
       l.result_status, l.target_id, l.target_table,
       l.ip_address
FROM t_log l
LEFT JOIN m_account a ON a.account_id = l.account_id AND a.deleted_at IS NULL
WHERE 1 = 1
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND l.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND a.kanri_shiten_id = :user_kanri_shiten_id
  /* 検索条件 */
  AND (:date_from IS NULL OR l.log_datetime >= :date_from)
  AND (:date_to IS NULL OR l.log_datetime <= :date_to)
  AND (:log_type IS NULL OR l.log_type = :log_type)
  AND (:account_id IS NULL OR l.account_id = :account_id)
ORDER BY l.log_datetime DESC
LIMIT 5000
```

### 4.5 CSV生成

- ファイル名：`log_export_YYYYMMDD_HHmmss.csv`（現在日時）
- 文字コード：UTF-8 with BOM（日本語Excel対応）
- ヘッダー行：`ログID, ログ種別, 日時, ユーザーID, JA ID, 画面名, 操作内容, 結果, 対象ID, 対象テーブル, IPアドレス`
- log_type をラベルにマッピング（1→ユーザー操作 等）
- result_status をラベルにマッピング（1→成功 等）
- log_datetime を `YYYY/MM/DD HH:mm:ss` 形式でフォーマットする
- CSV escape：値に `,`、`"`、改行を含む場合はダブルクォートで囲み `"` は `""` にエスケープする

### 4.6 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'ログ参照画面 (ACSMS-SCR-030)', 'EXPORT_CSV', 1,
        NULL, 't_log',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：エクスポート条件と件数をJSON形式で格納する。

{
  "date_from": "2026/04/01 00:00:00",
  "date_to": "2026/04/17 23:59:59",
  "log_type": 1,
  "account_id": null,
  "record_count": 250
}
```

### 4.7 レスポンス生成

- CSV ファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="log_export_YYYYMMDD_HHmmss.csv"`

### 4.8 例外処理

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
        'ログ参照画面 (ACSMS-SCR-030)', 'EXPORT_CSV', 2,
        NULL, 't_log',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-COMMON-005

※ 共用API。定義元：ACSMS-SCR-030。本画面ではログ検索の「ユーザー名」セレクトボックスで使用する。

## 概要

| 項目                   | 内容                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Account Dropdown                                                                                                                                                      |
| 概要                   | アカウントプルダウンリストを取得する（DataScopeを呼び出しユーザーのロールに基づき自動適用。共用API）                                                                      |
| URI                    | /api/v1/account/dropdown                                                                                                                                                  |
| メソッド               | GET                                                                                                                                                                       |
| リクエストボディー     | なし                                                                                                                                                                      |
| リクエストパラメーター | なし                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                    |
| HTTPレスポンスコード   | 200:正常にアカウント一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました   |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID          | タイプ | 繰り返し | フォーマット | Nullable | 説明         |
| --- | --------------- | ------ | -------- | ------------ | -------- | ------------ |
| 1   | data            | Array  | 〇       |              | -        | アカウント一覧 |
| 2   | →account_id     | Number | -        |              | -        | アカウントID |
| 3   | →login_id       | String | -        |              | -        | ログインID   |
| 4   | →account_name   | String | -        |              | -        | アカウント名 |
| 5   | →role_code      | String | -        |              | -        | ロールコード |
| 6   | →ja_id          | Number | -        |              | 〇       | JA ID        |

## リクエスト例

```
GET /api/v1/account/dropdown
```

## レスポンス成功例

```json
{
  "data": [
    {
      "account_id": 10,
      "login_id": "ja_honten_001",
      "account_name": "JA本店 太郎",
      "role_code": "JA_HONTEN",
      "ja_id": 100
    },
    {
      "account_id": 11,
      "login_id": "ja_shiten_001",
      "account_name": "管理支店A 花子",
      "role_code": "JA_KANRI_SHITEN",
      "ja_id": 100
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

- リクエストパラメータなし。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。SCR-030（ログ参照画面）では `log.view` 保持者が呼び出す。
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- DataScope を role_code により適用する：
  - `NICHINO_ADMIN` / `NICHINO_STAFF`：全アカウントを取得
  - `CHUOKAI`：`a.ja_id = :user_ja_id`
  - `JA_HONTEN`：`a.ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`：`a.kanri_shiten_id = :user_kanri_shiten_id`

```sql
SELECT a.account_id, a.login_id, a.account_name,
       r.role_code, a.ja_id
FROM m_account a
INNER JOIN m_roles r ON r.role_id = a.role_id AND r.deleted_at IS NULL
WHERE a.deleted_at IS NULL
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND a.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND a.kanri_shiten_id = :user_kanri_shiten_id
ORDER BY a.login_id ASC
```

### 4.4 レスポンス生成

- data 配列を含むJSONを返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
