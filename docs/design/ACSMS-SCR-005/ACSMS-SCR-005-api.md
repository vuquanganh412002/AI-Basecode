---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: JACSMS-SCR-005
screen_name: JAマスタ登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Nguyen Duyen Manh
updated_date: 2026/04/07
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
|---|---|---|---|---|---|---|
| 1 | {issue_date} | 1.0 | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「{screen_name}（{screen_id}）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No | 資料コード | 資料名 |
|---|---|---|

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
| 8   | 画面固有     | NOT_FOUND             | 指定されたJAが見つかりません。                                         | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | JAコード「{ja_code}」はすでに登録されています。                          | HTTP 400 |

---

# API ACSMS-API-{screen_number}-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get JA Detail |
| 概要 | 指定されたJA IDのJA情報を取得する（編集画面用） |
| URI | /api/v1/ja/{ja_id} |
| メソッド | GET |
| リクエストボディー | なし |
| リクエストパラメーター | ja_id（パスパラメータ） |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:正常にJA情報を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたJAが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | Number | - | 〇 | | | JA ID（パスパラメータ） |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →ja_id | Number | - | | - | JA ID |
| 3 | →ja_code | String | - | | - | JAコード |
| 4 | →ja_name | String | - | | - | JA名 |
| 5 | →ja_name_kana | String | - | | -   | JA名（カナ） |
| 6 | →todofuken_code | String | - | | - | 都道府県コード |
| 7 | →todofuken_name | String | - | | - | 都道府県名（JOINで取得） |
| 8 | →chuokai_flg | Boolean | - | | - | 中央会フラグ（true: 中央会, false: 単協） |
| 9 | →yubin_no | String | - | | -   | 郵便番号 |
| 10 | →address | String | - | | -   | 住所 |
| 11 | →tel | String | - | | -   | 電話番号 |
| 12 | →fax | String | - | | -   | FAX番号 |
| 13 | →email | String | - | | -   | メールアドレス |
| 14 | →tanto_busho | String | - | | -   | 担当部署名 |
| 15 | →tanto_name | String | - | | -   | 担当者名 |
| 16 | →zei_kubun | Number | - | | - | 税区分（1: 内税, 2: 外税） |
| 17 | →jastem_itakusha_code | String | - | | -   | JASTEM_委託者コード ※空文字許容 |
| 18 | →jastem_itakusha_name | String | - | | -   | JASTEM_委託者名 ※空文字許容 |
| 19 | →jastem_ja_code | String | - | | -   | JASTEM_農協番号 ※空文字許容 |
| 20 | →jastem_ja_name | String | - | | -   | JASTEM_農協名 ※空文字許容 |
| 21 | →biko | String | - | | -   | 備考 |
| 22 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 23 | →updated_at | String | - | ISO 8601 | 〇 | 更新日時 |

## リクエスト例

```
GET /api/v1/ja/1
```

## レスポンス成功例

```json
{
  "data": {
    "ja_id": 1,
    "ja_code": "1301001001",
    "ja_name": "JA東京中央",
    "ja_name_kana": "ジェイエイトウキョウチュウオウ",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "chuokai_flg": true,
    "yubin_no": "1000001",
    "address": "東京都千代田区丸の内1-1-1",
    "tel": "0312345678",
    "fax": "0312345679",
    "email": "info@ja-tokyo-chuo.or.jp",
    "tanto_busho": "総務部",
    "tanto_name": "田中太郎",
    "zei_kubun": 1,
    "jastem_itakusha_code": "1234567890",
    "jastem_itakusha_name": "JA東京中央",
    "jastem_ja_code": "1301",
    "jastem_ja_name": "JA東京中央",
    "biko": "",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
  }
}
```

## レスポンス失敗例


### 400 Bad Request
```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です。"
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
  "message": "指定されたJAが見つかりません。"
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
  - `ja_id`：数値型チェック
  - `ja_id`：必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`ja.view`を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（`m_account.ja_id`）。
- データスコープ制御：
  - NICHINO_ADMIN：`m_account.ja_id` が NULL → 全てのJAレコードにアクセス可能
  - CHUOKAI / JA_HONTEN：`m_ja.ja_id` = `m_account.ja_id` のみアクセス可能
- 基本条件：
  - `m_ja.ja_id` = `:ja_id`
  - `m_ja.deleted_at IS NULL`
  - スコープ条件（`:user_ja_id IS NULL OR m_ja.ja_id = :user_ja_id`）

### 4.4 データ取得

- 以下のSQLを実行してデータを取得する。

```sql
SELECT
  mj.ja_id,
  mj.ja_code,
  mj.ja_name,
  mj.ja_name_kana,
  mj.todofuken_code,
  mt.todofuken_name,
  mj.chuokai_flg,
  mj.yubin_no,
  mj.address,
  mj.tel,
  mj.fax,
  mj.email,
  mj.tanto_busho,
  mj.tanto_name,
  mj.zei_kubun,
  mj.jastem_itakusha_code,
  mj.jastem_itakusha_name,
  mj.jastem_ja_code,
  mj.jastem_ja_name,
  mj.biko,
  mj.created_at,
  mj.updated_at
FROM m_ja mj
LEFT JOIN m_todofuken mt ON mj.todofuken_code = mt.todofuken_code
WHERE mj.ja_id = :ja_id
  AND mj.deleted_at IS NULL
  AND (:user_ja_id IS NULL OR mj.ja_id = :user_ja_id)
```

- 対象レコードが存在しない場合：HTTP 404 Not Found を返却する。

### 4.5 レスポンス生成

- 取得した JA データを JSON 形式で返却する。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-{screen_number}-002

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Create JA |
| 概要 | 新規JAマスタレコードを登録する（NICHINO_ADMINのみ） |
| URI | /api/v1/ja |
| メソッド | POST |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 201:登録しました, 400:入力内容にエラーがあります／JAコードが既に登録されています, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | ja_code | String | - | 〇 | | 10 | JAコード（一意制約） |
| 2 | ja_name | String | - | 〇 | | 200 | JA名 |
| 3 | ja_name_kana | String | - | - | | 200 | JA名（カナ） |
| 4 | todofuken_code | String | - | 〇 | 2 | 2 | 都道府県コード（m_todofukenに存在すること） |
| 5 | chuokai_flg | Boolean | - | 〇 | | | 中央会フラグ（true: 中央会, false: 単協） |
| 6 | yubin_no | String | - | - | 7 | 7 | 郵便番号（半角数字7桁） |
| 7 | address | String | - | - | | 200 | 住所 |
| 8 | tel | String | - | - | | 15 | 電話番号（半角数字のみ） |
| 9 | fax | String | - | - | | 15 | FAX番号（半角数字のみ） |
| 10 | email | String | - | - | | 100 | メールアドレス |
| 11 | tanto_busho | String | - | - | | 100 | 担当部署名 |
| 12 | tanto_name | String | - | - | | 50 | 担当者名 |
| 13 | zei_kubun | Number | - | 〇 | | | 税区分（1: 内税, 2: 外税） |
| 14 | jastem_itakusha_code | String | - | - | | 10 | JASTEM_委託者コード ※空文字許容 |
| 15 | jastem_itakusha_name | String | - | - | | 40 | JASTEM_委託者名 ※空文字許容 |
| 16 | jastem_ja_code | String | - | - | | 4 | JASTEM_農協番号 ※空文字許容 |
| 17 | jastem_ja_name | String | - | - | | 15 | JASTEM_農協名 ※空文字許容 |
| 18 | biko | String | - | - | | 500 | 備考 |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →ja_id | Number | - | | - | 自動採番されたJA ID |
| 3 | →ja_code | String | - | | - | JAコード |
| 4 | →ja_name | String | - | | - | JA名 |
| 5 | →ja_name_kana | String | - | | -   | JA名（カナ） |
| 6 | →todofuken_code | String | - | | - | 都道府県コード |
| 7 | →todofuken_name | String | - | | - | 都道府県名（JOINで取得） |
| 8 | →chuokai_flg | Boolean | - | | - | 中央会フラグ |
| 9 | →yubin_no | String | - | | -   | 郵便番号 |
| 10 | →address | String | - | | -   | 住所 |
| 11 | →tel | String | - | | -   | 電話番号 |
| 12 | →fax | String | - | | -   | FAX番号 |
| 13 | →email | String | - | | -   | メールアドレス |
| 14 | →tanto_busho | String | - | | -   | 担当部署名 |
| 15 | →tanto_name | String | - | | -   | 担当者名 |
| 16 | →zei_kubun | Number | - | | - | 税区分 |
| 17 | →jastem_itakusha_code | String | - | | -   | JASTEM_委託者コード ※空文字許容 |
| 18 | →jastem_itakusha_name | String | - | | -   | JASTEM_委託者名 ※空文字許容 |
| 19 | →jastem_ja_code | String | - | | -   | JASTEM_農協番号 ※空文字許容 |
| 20 | →jastem_ja_name | String | - | | -   | JASTEM_農協名 ※空文字許容 |
| 21 | →biko | String | - | | -   | 備考 |
| 22 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 23 | →updated_at | String | - | ISO 8601 | 〇 | 更新日時 |
| 24 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

```json
POST /api/v1/ja
Content-Type: application/json

{
  "ja_code": "1301003001",
  "ja_name": "JA東京みどり",
  "ja_name_kana": "ジェイエイトウキョウミドリ",
  "todofuken_code": "13",
  "chuokai_flg": false,
  "yubin_no": "1600022",
  "address": "東京都新宿区新宿3-1-1",
  "tel": "0323456789",
  "fax": "0323456780",
  "email": "info@ja-tokyo-midori.or.jp",
  "tanto_busho": "企画課",
  "tanto_name": "鈴木花子",
  "zei_kubun": 1,
  "jastem_itakusha_code": "",
  "jastem_itakusha_name": "",
  "jastem_ja_code": "",
  "jastem_ja_name": "",
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "ja_id": 3,
    "ja_code": "1301003001",
    "ja_name": "JA東京みどり",
    "ja_name_kana": "ジェイエイトウキョウミドリ",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "chuokai_flg": false,
    "yubin_no": "1600022",
    "address": "東京都新宿区新宿3-1-1",
    "tel": "0323456789",
    "fax": "0323456780",
    "email": "info@ja-tokyo-midori.or.jp",
    "tanto_busho": "企画課",
    "tanto_name": "鈴木花子",
    "zei_kubun": 1,
    "jastem_itakusha_code": "",
    "jastem_itakusha_name": "",
    "jastem_ja_code": "",
    "jastem_ja_name": "",
    "biko": "",
    "created_at": "2026-04-07T10:00:00Z",
    "updated_at": null
  },
  "message": "登録しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "ja_code", "message": "JAコードを入力してください。" },
    { "field": "email", "message": "メールアドレスの形式が不正です。" }
  ]
}
```

### 400 Bad Request（都道府県コードが存在しない場合）

```json
{
  "error_code": "BAD_REQUEST",
  "message": "都道府県コードが存在しません。"
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

### 400 Bad Request（JAコード重複）

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "JAコード「002001」はすでに登録されています。"
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

- リクエストボディの全フィールドを検証する：
  - `ja_code`：必須、最大10文字
  - `ja_name`：必須、最大200文字
  - `ja_name_kana`：任意、最大200文字
  - `todofuken_code`：必須、2文字
  - `chuokai_flg`：必須、ブール値（`true` または `false`）
  - `tel`：任意、半角数字のみ、最大15文字
  - `fax`：任意、半角数字のみ、最大15文字
  - `email`：任意、メールアドレス形式、最大100文字
  - `biko`：任意、最大500文字
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`ja.create`を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden

### 4.3 都道府県コードの存在検証

- `todofuken_code` が `m_todofuken` テーブルに存在することを確認する。

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = :todofuken_code
```

- 存在しない場合：HTTP 400 Bad Request を返却する。

### 4.4 JAコードの一意性チェック

- `ja_code` が `m_ja` テーブルに既に存在しないことを確認する。

```sql
SELECT ja_id
FROM m_ja
WHERE ja_code = :ja_code
  AND deleted_at IS NULL
```

- 既に存在する場合：HTTP 400 Bad Request（error_code: DUPLICATE_CODE）を返却する。

### 4.5 データ登録

- 以下のSQLを実行して新規レコードを登録する。

```sql
INSERT INTO m_ja (
  ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
  yubin_no, address, tel, fax, email,
  tanto_busho, tanto_name, zei_kubun,
  jastem_itakusha_code, jastem_itakusha_name, jastem_ja_code, jastem_ja_name,
  biko,
  created_by, created_at
)
VALUES (
  :ja_code, :ja_name, :ja_name_kana, :todofuken_code, :chuokai_flg,
  :yubin_no, :address, :tel, :fax, :email,
  :tanto_busho, :tanto_name, :zei_kubun,
  :jastem_itakusha_code, :jastem_itakusha_name, :jastem_ja_code, :jastem_ja_name,
  :biko,
  :user_account_id, NOW()
)
RETURNING ja_id
```

### 4.6 操作ログの記録

- `t_log` テーブルに操作ログを記録する。

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, NULL,
  'JAマスタ登録画面 (ACSMS-SCR-005)', 'CREATE', 1,
  :ja_id, 'm_ja',
  '', :after_value_json,
  '', '',
  :ip_address, :user_agent
)
```

### 4.7 レスポンス生成

- 登録した JA データと成功メッセージを JSON 形式で返却する。
- HTTP 201 Created

### 4.8 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。
- エラー発生時も操作ログを記録する（`log_type = 3`）。
```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  3, NOW(), :user_account_id, NULL,
  'JAマスタ登録画面 (ACSMS-SCR-005)', 'CREATE', 2,
  NULL, 'm_ja',
  '', '',
  :error_message, :stack_trace,
  :ip_address, :user_agent
)
```

---

# API ACSMS-API-{screen_number}-003

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Update JA |
| 概要 | 既存のJAマスタレコードを更新する。NICHINO_ADMINは全項目更新可能。CHUOKAI/JA_HONTENは部分項目のみ更新可能（※4） |
| URI | /api/v1/ja/{ja_id} |
| メソッド | PUT |
| リクエストボディー | JSON |
| リクエストパラメーター | ja_id（パスパラメータ） |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたJAが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

### パスパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | Number | - | 〇 | | | JA ID（パスパラメータ） |
| 2 | ja_name | String | - | - | | 200 | JA名 |
| 3 | ja_name_kana | String | - | - | | 200 | JA名（カナ） |
| 4 | todofuken_code | String | - | - | 2 | 2 | 都道府県コード |
| 5 | chuokai_flg | Boolean | - | - | | | 中央会フラグ（true: 中央会, false: 単協） |
| 6 | yubin_no | String | - | - | 7 | 7 | 郵便番号（半角数字7桁） |
| 7 | address | String | - | - | | 200 | 住所 |
| 8 | tel | String | - | - | | 15 | 電話番号（半角数字のみ） |
| 9 | fax | String | - | - | | 15 | FAX番号（半角数字のみ） |
| 10 | email | String | - | - | | 100 | メールアドレス |
| 11 | tanto_busho | String | - | - | | 100 | 担当部署名 |
| 12 | tanto_name | String | - | - | | 50 | 担当者名 |
| 13 | zei_kubun | Number | - | - | | | 税区分（1: 内税, 2: 外税） |
| 14 | jastem_itakusha_code | String | - | - | | 10 | JASTEM_委託者コード ※空文字許容 |
| 15 | jastem_itakusha_name | String | - | - | | 40 | JASTEM_委託者名 ※空文字許容 |
| 16 | jastem_ja_code | String | - | - | | 4 | JASTEM_農協番号 ※空文字許容 |
| 17 | jastem_ja_name | String | - | - | | 15 | JASTEM_農協名 ※空文字許容 |
| 18 | biko | String | - | - | | 500 | 備考 |

> **注記:** `ja_code` は更新不可（作成後の変更は不可）。`UpdateJaDto` は `CreateJaDto` の `PartialType`（`ja_code` 除く）のため、ボディの全項目が任意（部分更新可）。未送信の項目は既存値を維持する。CHUOKAI / JA_HONTEN がリクエストボディに ※4 対象外のフィールドを含めた場合、バックエンドはそれらを無視する。

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →ja_id | Number | - | | - | JA ID |
| 3 | →ja_code | String | - | | - | JAコード |
| 4 | →ja_name | String | - | | - | JA名 |
| 5 | →ja_name_kana | String | - | | -   | JA名（カナ） |
| 6 | →todofuken_code | String | - | | - | 都道府県コード |
| 7 | →todofuken_name | String | - | | - | 都道府県名（JOINで取得） |
| 8 | →chuokai_flg | Boolean | - | | - | 中央会フラグ |
| 9 | →yubin_no | String | - | | -   | 郵便番号 |
| 10 | →address | String | - | | -   | 住所 |
| 11 | →tel | String | - | | -   | 電話番号 |
| 12 | →fax | String | - | | -   | FAX番号 |
| 13 | →email | String | - | | -   | メールアドレス |
| 14 | →tanto_busho | String | - | | -   | 担当部署名 |
| 15 | →tanto_name | String | - | | -   | 担当者名 |
| 16 | →zei_kubun | Number | - | | - | 税区分 |
| 17 | →jastem_itakusha_code | String | - | | -   | JASTEM_委託者コード ※空文字許容 |
| 18 | →jastem_itakusha_name | String | - | | -   | JASTEM_委託者名 ※空文字許容 |
| 19 | →jastem_ja_code | String | - | | -   | JASTEM_農協番号 ※空文字許容 |
| 20 | →jastem_ja_name | String | - | | -   | JASTEM_農協名 ※空文字許容 |
| 21 | →biko | String | - | | -   | 備考 |
| 22 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 23 | →updated_at | String | - | ISO 8601 | 〇 | 更新日時 |
| 24 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

### NICHINO_ADMIN（全項目更新）

```json
PUT /api/v1/ja/1
Content-Type: application/json

{
  "ja_name": "JA東京中央（改定）",
  "ja_name_kana": "ジェイエイトウキョウチュウオウカイテイ",
  "todofuken_code": "13",
  "chuokai_flg": true,
  "yubin_no": "1000001",
  "address": "東京都千代田区丸の内2-2-2",
  "tel": "0312345678",
  "fax": "0312345679",
  "email": "info-new@ja-tokyo-chuo.or.jp",
  "tanto_busho": "総務部",
  "tanto_name": "田中太郎",
  "zei_kubun": 2,
  "jastem_itakusha_code": "1234567890",
  "jastem_itakusha_name": "JA東京中央",
  "jastem_ja_code": "1301",
  "jastem_ja_name": "JA東京中央",
  "biko": "住所変更済み"
}
```

### CHUOKAI / JA_HONTEN（部分項目のみ ※4）

```json
PUT /api/v1/ja/1
Content-Type: application/json

{
  "yubin_no": "1000001",
  "address": "東京都千代田区丸の内2-2-2",
  "tel": "0312345678",
  "fax": "0312345679",
  "email": "info-new@ja-tokyo-chuo.or.jp",
  "tanto_busho": "総務部",
  "tanto_name": "田中太郎",
  "zei_kubun": 2,
  "biko": "住所変更済み"
}
```

## レスポンス成功例

```json
{
  "data": {
    "ja_id": 1,
    "ja_code": "1301001001",
    "ja_name": "JA東京中央（改定）",
    "ja_name_kana": "ジェイエイトウキョウチュウオウカイテイ",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "chuokai_flg": true,
    "yubin_no": "1000001",
    "address": "東京都千代田区丸の内2-2-2",
    "tel": "0312345678",
    "fax": "0312345679",
    "email": "info-new@ja-tokyo-chuo.or.jp",
    "tanto_busho": "総務部",
    "tanto_name": "田中太郎",
    "zei_kubun": 2,
    "jastem_itakusha_code": "1234567890",
    "jastem_itakusha_name": "JA東京中央",
    "jastem_ja_code": "1301",
    "jastem_ja_name": "JA東京中央",
    "biko": "住所変更済み",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-07T15:30:00Z"
  },
  "message": "更新しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "email", "message": "メールアドレスの形式が不正です。" }
  ]
}
```

### 400 Bad Request（都道府県コードが存在しない場合。NICHINO_ADMINが変更する場合のみ）

```json
{
  "error_code": "BAD_REQUEST",
  "message": "都道府県コードが存在しません。"
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
  "message": "指定されたJAが見つかりません。"
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

- パスパラメータの検証：
  - `ja_id`：数値型チェック、必須チェック
- リクエストボディの検証：
  - NICHINO_ADMIN の場合：全フィールドをバリデーション
  - CHUOKAI / JA_HONTEN の場合：※4 対象フィールドのみバリデーション
  - 各フィールドの型・長さ・形式チェック（API ACSMS-API-005-002 §4.1 と同様）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。
### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`ja.update`を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 対象レコードの存在確認とデータスコープ検証

- ログインユーザーのスコープを取得する（`m_account.ja_id`）。
- 対象レコードの存在確認と権限検証：

```sql
SELECT ja_id, ja_code, ja_name, ja_name_kana,
       todofuken_code, chuokai_flg,
       yubin_no, address, tel, fax, email,
       tanto_busho, tanto_name, zei_kubun, biko
FROM m_ja
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (:user_ja_id IS NULL OR ja_id = :user_ja_id)
```

- 対象レコードが存在しない場合：HTTP 404 Not Found を返却する。

### 4.4 ロール別の更新フィールド決定

- ユーザーのロールに基づき、更新可能なフィールドを決定する：
  - **NICHINO_ADMIN**：`ja_name`, `ja_name_kana`, `todofuken_code`, `chuokai_flg`, `yubin_no`, `address`, `tel`, `fax`, `email`, `tanto_busho`, `tanto_name`, `zei_kubun`, `jastem_itakusha_code`, `jastem_itakusha_name`, `jastem_ja_code`, `jastem_ja_name`, `biko`（全項目）
  - **CHUOKAI / JA_HONTEN（※4）**：`yubin_no`, `address`, `tel`, `fax`, `email`, `tanto_busho`, `tanto_name`, `zei_kubun`, `jastem_itakusha_code`, `jastem_itakusha_name`, `jastem_ja_code`, `jastem_ja_name`, `biko`
- CHUOKAI / JA_HONTEN がリクエストボディに対象外のフィールドを含めた場合、それらを無視する。

### 4.5 都道府県コードの存在検証（NICHINO_ADMINのみ）

- `todofuken_code` が更新対象に含まれる場合、`m_todofuken` テーブルに存在することを確認する。

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = :todofuken_code
```

- 存在しない場合：HTTP 400 Bad Request を返却する。

### 4.6 データ更新

- NICHINO_ADMIN の場合（全項目更新）：

```sql
UPDATE m_ja
SET ja_name = :ja_name,
    ja_name_kana = :ja_name_kana,
    todofuken_code = :todofuken_code,
    chuokai_flg = :chuokai_flg,
    yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    email = :email,
    tanto_busho = :tanto_busho,
    tanto_name = :tanto_name,
    zei_kubun = :zei_kubun,
    jastem_itakusha_code = :jastem_itakusha_code,
    jastem_itakusha_name = :jastem_itakusha_name,
    jastem_ja_code = :jastem_ja_code,
    jastem_ja_name = :jastem_ja_name,
    biko = :biko,
    updated_by = :user_account_id,
    updated_at = NOW()
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
```

- CHUOKAI / JA_HONTEN の場合（部分項目のみ ※4）：

```sql
UPDATE m_ja
SET yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    email = :email,
    tanto_busho = :tanto_busho,
    tanto_name = :tanto_name,
    zei_kubun = :zei_kubun,
    jastem_itakusha_code = :jastem_itakusha_code,
    jastem_itakusha_name = :jastem_itakusha_name,
    jastem_ja_code = :jastem_ja_code,
    jastem_ja_name = :jastem_ja_name,
    biko = :biko,
    updated_by = :user_account_id,
    updated_at = NOW()
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
```

### 4.7 操作ログの記録

- `t_log` テーブルに操作ログを記録する。

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, :user_ja_id,
  'JAマスタ登録画面 (ACSMS-SCR-005)', 'UPDATE', 1,
  :ja_id, 'm_ja',
  :before_value_json, :after_value_json,
  '', '',
  :ip_address, :user_agent
)
```

### 4.8 レスポンス生成

- 更新した JA データと成功メッセージを JSON 形式で返却する。
- HTTP 200 OK

### 4.9 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。
- エラー発生時も操作ログを記録する（`log_type = 3`）。
```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  3, NOW(), :user_account_id, :user_ja_id,
  'JAマスタ登録画面 (ACSMS-SCR-005)', 'UPDATE', 2,
  :ja_id, 'm_ja',
  '', '',
  :error_message, :stack_trace,
  :ip_address, :user_agent
)
```

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-COMMON-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get Prefecture List |
| 概要 | 都道府県の一覧を取得する（ドロップダウン用） |
| URI | /api/v1/todofuken |
| メソッド | GET |
| リクエストボディー | なし |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:正常に都道府県一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| | （なし） | | | | | | リクエストパラメータなし |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Array | 〇 | | - | |
| 2 | →todofuken_code | String | - | | - | 都道府県コード（01〜47） |
| 3 | →todofuken_name | String | - | | - | 都道府県名 |

## リクエスト例

```
GET /api/v1/todofuken
```

## レスポンス成功例

```json
{
  "data": [
    { "todofuken_code": "01", "todofuken_name": "北海道" },
    { "todofuken_code": "02", "todofuken_name": "青森県" },
    { "todofuken_code": "03", "todofuken_name": "岩手県" },
    { "todofuken_code": "13", "todofuken_name": "東京都" },
    { "todofuken_code": "27", "todofuken_name": "大阪府" },
    { "todofuken_code": "47", "todofuken_name": "沖縄県" }
  ]
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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 認証チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：認証済みユーザーであれば全ロールアクセス可能。

### 4.2 データ取得

- 以下のSQLを実行して都道府県一覧を取得する。

```sql
SELECT todofuken_code, todofuken_name
FROM m_todofuken
ORDER BY todofuken_code ASC
```

### 4.3 レスポンス生成

- 取得した都道府県リストを JSON 形式で返却する。

### 4.4 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。
