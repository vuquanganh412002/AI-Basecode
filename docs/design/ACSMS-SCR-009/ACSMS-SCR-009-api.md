---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-009
screen_name: 管理支店マスタ登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Dao Van Thang
updated_date: 2026/04/07
updated_by: Dao Van Thang
---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
|---|---|---|---|---|---|---|
| 1 | {issue_date} | 1.0 | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

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
| 8   | 画面固有     | NOT_FOUND             | 指定された管理支店が見つかりません。                                   | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | 管理支店コード「{kanri_shiten_code}」はすでに登録されています。           | HTTP 400 |

## メッセージコード一覧（画面表示用）

画面側で表示するメッセージコード。BE 応答の `message` field または FE 直接表示の文言を網羅。

> 注：画面設計書 v1.3 のメッセージ情報シートで #1（ACSMS-MSG-009-001）が欠番のため、本資料を canonical な番号付けとして扱う。

| #   | メッセージコード   | メッセージ内容                                                       | 使用箇所                                  |
| --- | ------------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| 1   | ACSMS-MSG-009-001  | 登録しました。                                                       | 機能詳細§3.4（POST success）              |
| 2   | ACSMS-MSG-009-002  | 更新しました。                                                       | 機能詳細§3.4（PUT success）               |
| 3   | ACSMS-MSG-009-003  | 必須項目です。                                                       | 機能詳細§3.1（VALIDATION_ERROR per-field） |
| 4   | ACSMS-MSG-009-004  | 管理支店コード「{kanri_shiten_code}」はすでに登録されています。       | 機能詳細§3.4（DUPLICATE_CODE）             |
| 5   | ACSMS-MSG-009-005  | 管理支店 #{kanri_shiten_id} が見つかりません。                       | 機能詳細§2.2 / §3.4（NOT_FOUND）           |
| 6   | ACSMS-MSG-009-006  | アクセス権がありません。                                             | 機能詳細§2.2 / §3.4（FORBIDDEN）          |
| 7   | ACSMS-MSG-009-007  | システムエラーが発生しました。しばらくしてから再度お試しください。   | 機能詳細§3.4（INTERNAL_SERVER_ERROR）      |
| 8   | ACSMS-MSG-009-008  | 入力データが削除されます。よろしいですか？                           | 機能詳細§4.1（confirm dialog 戻る）         |

---

# API ACSMS-API-{screen_number}-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get Management Branch Detail |
| 概要 | 指定された管理支店IDの管理支店情報を取得する（編集画面用） |
| URI | /api/v1/kanri-shiten/{kanri_shiten_id} |
| メソッド | GET |
| リクエストボディー | なし |
| リクエストパラメーター | kanri_shiten_id（パスパラメータ） |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:正常に管理支店情報を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された管理支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | kanri_shiten_id | Number | - | 〇 | | | 管理支店ID（パスパラメータ） |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →kanri_shiten_id | Number | - | | - | 管理支店ID |
| 3 | →ja_id | Number | - | | - | JA ID |
| 4 | →kanri_shiten_code | String | - | | - | 管理支店コード |
| 5 | →kanri_shiten_name | String | - | | - | 管理支店名 |
| 6 | →kanri_shiten_name_kana | String | - | | -   | 管理支店名（カナ） |
| 7 | →todofuken_code | String | - | | - | 都道府県コード |
| 8 | →todofuken_name | String | - | | - | 都道府県名（JOINで取得） |
| 9 | →yubin_no | String | - | | -   | 郵便番号 |
| 10 | →address | String | - | | -   | 住所 |
| 11 | →tel | String | - | | -   | 電話番号 |
| 12 | →fax | String | - | | -   | FAX番号 |
| 13 | →paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 14 | →denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 15 | →biko | String | - | | -   | 備考 |
| 16 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 17 | →updated_at | String | - | ISO 8601 | 〇 | 更新日時 |

## リクエスト例

```
GET /api/v1/kanri-shiten/1
```

## レスポンス成功例

```json
{
  "data": {
    "kanri_shiten_id": 1,
    "ja_id": 1,
    "kanri_shiten_code": "113-3300-001",
    "kanri_shiten_name": "東京中央会支店",
    "kanri_shiten_name_kana": "トウキョウチュウオウカイシテン",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "yubin_no": "1000001",
    "address": "千代田区千代田1-1-1",
    "tel": "0312345678",
    "fax": "0312345679",
    "paper_flg": true,
    "denshi_flg": false,
    "biko": "中央会管轄",
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
  "message": "指定された管理支店が見つかりません"
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
  - `kanri_shiten_id`：数値型チェック
  - `kanri_shiten_id`：必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`kanri-shiten.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限がない場合：HTTP 403 Forbidden（ACSMS-MSG-009-006）

### 4.3 データ取得条件の設定

- 基本条件：
  - `m_kanri_shiten.kanri_shiten_id` = `:kanri_shiten_id`
  - `m_kanri_shiten.deleted_at IS NULL`
- データスコープ（画面定義§1.3）：
  - NICHINO_ADMIN：制限なし（全JA管理支店にアクセス可能）
  - CHUOKAI / JA_HONTEN：自JAの管理支店のみ（`mks.ja_id = session.ja_id`）
  - JA_KANRI_SHITEN：自JA自管理支店のみ（`mks.ja_id = session.ja_id AND mks.kanri_shiten_id = session.kanri_shiten_id`）
- スコープ違反の場合：HTTP 404 Not Found（ACSMS-MSG-009-005）を返す（行の存在を漏らさない）

### 4.4 データ取得

- 以下のSQLを実行してデータを取得する。

```sql
SELECT
    mks.kanri_shiten_id,
    mks.ja_id,
    mks.kanri_shiten_code,
    mks.kanri_shiten_name,
    mks.kanri_shiten_name_kana,
    mks.todofuken_code,
    mt.todofuken_name,
    mks.yubin_no,
    mks.address,
    mks.tel,
    mks.fax,
    mks.paper_flg,
    mks.denshi_flg,
    mks.biko,
    mks.created_at,
    mks.updated_at
FROM m_kanri_shiten mks
LEFT JOIN m_todofuken mt ON mks.todofuken_code = mt.todofuken_code
WHERE mks.kanri_shiten_id = :kanri_shiten_id
  AND mks.deleted_at IS NULL
```

- 対象レコードが存在しない場合：HTTP 404 Not Found を返却する。

### 4.5 レスポンス生成

- 取得した管理支店データを JSON 形式で返却する。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-{screen_number}-002

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Create Management Branch |
| 概要 | 新規管理支店マスタレコードを登録する（NICHINO_ADMINのみ） |
| URI | /api/v1/kanri-shiten |
| メソッド | POST |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 201:登録しました, 400:入力内容にエラーがあります／管理支店コードが既に登録されています, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | Number | - | 〇 | | | JA ID（m_ja.ja_idに存在すること） |
| 2 | kanri_shiten_code | String | - | 〇 | | 15 | 管理支店コード（一意制約） |
| 3 | kanri_shiten_name | String | - | 〇 | | 100 | 管理支店名 |
| 4 | kanri_shiten_name_kana | String | - | - | | 100 | 管理支店名（カナ） |
| 5 | todofuken_code | String | - | 〇 | 2 | 2 | 都道府県コード（m_todofukenに存在すること） |
| 6 | yubin_no | String | - | - | 7 | 7 | 郵便番号（半角数字7桁） |
| 7 | address | String | - | - | | 200 | 住所 |
| 8 | tel | String | - | - | | 15 | 電話番号（半角数字のみ） |
| 9 | fax | String | - | - | | 15 | FAX番号（半角数字のみ） |
| 10 | paper_flg | Boolean | - | - | | | 紙版取扱フラグ（デフォルト: false） |
| 11 | denshi_flg | Boolean | - | - | | | 電子版取扱フラグ（デフォルト: false） |
| 12 | biko | String | - | - | | 500 | 備考 |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →kanri_shiten_id | Number | - | | - | 自動採番された管理支店ID |
| 3 | →ja_id | Number | - | | - | JA ID |
| 4 | →kanri_shiten_code | String | - | | - | 管理支店コード |
| 5 | →kanri_shiten_name | String | - | | - | 管理支店名 |
| 6 | →kanri_shiten_name_kana | String | - | | -   | 管理支店名（カナ） |
| 7 | →todofuken_code | String | - | | - | 都道府県コード |
| 8 | →yubin_no | String | - | | -   | 郵便番号 |
| 9 | →address | String | - | | -   | 住所 |
| 10 | →tel | String | - | | -   | 電話番号 |
| 11 | →fax | String | - | | -   | FAX番号 |
| 12 | →paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 13 | →denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 14 | →biko | String | - | | -   | 備考 |
| 15 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 16 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

```json
POST /api/v1/kanri-shiten
Content-Type: application/json

{
  "ja_id": 1,
  "kanri_shiten_code": "113-3300-002",
  "kanri_shiten_name": "東京第二支店",
  "kanri_shiten_name_kana": "トウキョウダイニシテン",
  "todofuken_code": "13",
  "yubin_no": "1000002",
  "address": "千代田区千代田2-2-2",
  "tel": "0312345680",
  "fax": "0312345681",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": "新規登録テスト"
}
```

## レスポンス成功例

```json
{
  "data": {
    "kanri_shiten_id": 2,
    "ja_id": 1,
    "kanri_shiten_code": "113-3300-002",
    "kanri_shiten_name": "東京第二支店",
    "kanri_shiten_name_kana": "トウキョウダイニシテン",
    "todofuken_code": "13",
    "yubin_no": "1000002",
    "address": "千代田区千代田2-2-2",
    "tel": "0312345680",
    "fax": "0312345681",
    "paper_flg": true,
    "denshi_flg": true,
    "biko": "新規登録テスト",
    "created_at": "2026-04-07T10:00:00Z"
  },
  "message": "登録しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "kanri_shiten_code", "message": "管理支店コードは必須です" },
    { "field": "kanri_shiten_name", "message": "管理支店名は必須です" }
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

### 400 Duplicate Code

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "管理支店コード「113-3300-002」はすでに登録されています。"
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

- リクエストボディの全フィールドを検証する：
  - `ja_id`：必須、数値型
  - `kanri_shiten_code`：必須、最大15文字
  - `kanri_shiten_name`：必須、最大100文字
  - `kanri_shiten_name_kana`：任意、最大200文字
  - `todofuken_code`：必須、2文字
  - `yubin_no`：任意、半角数字7桁
  - `address`：任意、最大200文字
  - `fax`：任意、半角数字のみ、最大15文字
  - `paper_flg`：任意、ブール値（デフォルト: false）
  - `denshi_flg`：任意、ブール値（デフォルト: false）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`kanri-shiten.create`を保持しているか確認する。
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

### 4.4 JA IDの存在検証

- `ja_id` が `m_ja` テーブルに存在することを確認する。

```sql
SELECT ja_id
FROM m_ja
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
```

- 存在しない場合：HTTP 400 Bad Request を返却する。

### 4.5 管理支店コードの一意性チェック

- `kanri_shiten_code` が `m_kanri_shiten` テーブルに既に存在しないことを確認する。

```sql
SELECT kanri_shiten_id
FROM m_kanri_shiten
WHERE kanri_shiten_code = :kanri_shiten_code
  AND deleted_at IS NULL
```

- 既に存在する場合：HTTP 400 (`DUPLICATE_CODE`) を返却する（`管理支店コード「{kanri_shiten_code}」はすでに登録されています。`）。

### 4.6 データ登録

- 以下のSQLを実行して新規レコードを登録する。

```sql
INSERT INTO m_kanri_shiten (
  ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
  todofuken_code, yubin_no, address, tel, fax,
  paper_flg, denshi_flg, biko,
  created_by, created_at
)
VALUES (
  :ja_id, :kanri_shiten_code, :kanri_shiten_name, :kanri_shiten_name_kana,
  :todofuken_code, :yubin_no, :address, :tel, :fax,
  :paper_flg, :denshi_flg, :biko,
  :user_account_id, NOW()
)
RETURNING kanri_shiten_id
```

### 4.7 操作ログの記録

- `t_log` テーブルに操作ログを記録する。

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table, after_value, ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, :ja_id,
  '管理支店マスタ登録画面(ACSMS-SCR-009)', 'CREATE', 1,
  :new_kanri_shiten_id, 'm_kanri_shiten', :after_value_json, :ip_address, :user_agent
)
```

**after_value 例:**
```json
before_value は INSERT のため空文字列を設定する。
after_value：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "kanri_shiten_id": 2,
  "ja_id": 1,
  "kanri_shiten_code": "113-3300-002",
  "kanri_shiten_name": "東京第二支店",
  "kanri_shiten_name_kana": "トウキョウダイニシテン",
  "todofuken_code": "13",
  "yubin_no": "1000002",
  "address": "千代田区千代田2-2-2",
  "tel": "0312345680",
  "fax": "0312345681",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": "新規登録テスト"
}
```

### 4.8 レスポンス生成

- 登録した管理支店データと成功メッセージを JSON 形式で返却する。
- HTTP 201 Created

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
  3, NOW(), :user_account_id, :ja_id,
  '管理支店マスタ登録画面(ACSMS-SCR-009)', 'CREATE', 2,
  NULL, 'm_kanri_shiten',
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
| API名 | Update Management Branch |
| 概要 | 既存の管理支店マスタレコードを更新する（NICHINO_ADMINのみ全項目更新可能） |
| URI | /api/v1/kanri-shiten/{kanri_shiten_id} |
| メソッド | PUT |
| リクエストボディー | JSON |
| リクエストパラメーター | kanri_shiten_id（パスパラメータ） |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された管理支店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

### パスパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | kanri_shiten_id | Number | - | 〇 | | | 管理支店ID（パスパラメータ） |

### リクエストボディ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | kanri_shiten_name | String | - | 〇 | | 100 | 管理支店名 |
| 2 | kanri_shiten_name_kana | String | - | - | |  100 | 管理支店名（カナ） |
| 3 | todofuken_code | String | - | 〇 | 2 | 2 | 都道府県コード（m_todofukenに存在すること） |
| 4 | yubin_no | String | - | - | 7 | 7 | 郵便番号（半角数字7桁） |
| 5 | address | String | - | - | | 200 | 住所 |
| 6 | tel | String | - | - | | 15 | 電話番号（半角数字のみ） |
| 7 | fax | String | - | - | | 15 | FAX番号（半角数字のみ） |
| 8 | paper_flg | Boolean | - | - | | | 紙版取扱フラグ（デフォルト: false） |
| 9 | denshi_flg | Boolean | - | - | | | 電子版取扱フラグ（デフォルト: false） |
| 10 | biko | String | - | - | | 500 | 備考 |

> **注記：** `kanri_shiten_code` と `ja_id` は更新ボディに含めない。管理支店コードは作成後に変更不可。

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →kanri_shiten_id | Number | - | | - | 管理支店ID |
| 3 | →ja_id | Number | - | | - | JA ID |
| 4 | →kanri_shiten_code | String | - | | - | 管理支店コード |
| 5 | →kanri_shiten_name | String | - | | - | 管理支店名 |
| 6 | →kanri_shiten_name_kana | String | - | | -   | 管理支店名（カナ） |
| 7 | →todofuken_code | String | - | | - | 都道府県コード |
| 8 | →yubin_no | String | - | | -   | 郵便番号 |
| 9 | →address | String | - | | -   | 住所 |
| 10 | →tel | String | - | | -   | 電話番号 |
| 11 | →fax | String | - | | -   | FAX番号 |
| 12 | →paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 13 | →denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 14 | →biko | String | - | | -   | 備考 |
| 15 | →created_at | String | - | ISO 8601 | - | 作成日時 |
| 16 | →updated_at | String | - | ISO 8601 | - | 更新日時 |
| 17 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

```json
PUT /api/v1/kanri-shiten/1
Content-Type: application/json

{
  "kanri_shiten_name": "東京中央会支店（改称）",
  "kanri_shiten_name_kana": "トウキョウチュウオウカイシテン（カイショウ）",
  "todofuken_code": "13",
  "yubin_no": "1000001",
  "address": "千代田区千代田1-1-1 改修ビル3F",
  "tel": "0312345678",
  "fax": "0312345679",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": "住所変更済み"
}
```

## レスポンス成功例

```json
{
  "data": {
    "kanri_shiten_id": 1,
    "ja_id": 1,
    "kanri_shiten_code": "113-3300-001",
    "kanri_shiten_name": "東京中央会支店（改称）",
    "kanri_shiten_name_kana": "トウキョウチュウオウカイシテン（カイショウ）",
    "todofuken_code": "13",
    "yubin_no": "1000001",
    "address": "千代田区千代田1-1-1 改修ビル3F",
    "tel": "0312345678",
    "fax": "0312345679",
    "paper_flg": true,
    "denshi_flg": true,
    "biko": "住所変更済み",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-07T14:30:00Z"
  },
  "message": "更新しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "kanri_shiten_name", "message": "管理支店名は必須です" }
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
  "message": "指定された管理支店が見つかりません"
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
  - `kanri_shiten_id`：数値型チェック、必須チェック
- リクエストボディの全フィールドを検証する：
  - `kanri_shiten_name`：必須、最大100文字
  - `kanri_shiten_name_kana`：任意、最大100文字
  - `todofuken_code`：必須、2文字
  - `yubin_no`：任意、半角数字7桁
  - `address`：任意、最大200文字
  - `fax`：任意、半角数字のみ、最大15文字
  - `paper_flg`：任意、ブール値（デフォルト: false）
  - `denshi_flg`：任意、ブール値（デフォルト: false）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：`kanri-shiten.update` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
  - NICHINO_ADMIN：全項目更新可能
  - CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN：許可フィールドのみ更新可能（§4.5 参照）
- 権限がない場合：HTTP 403 Forbidden（ACSMS-MSG-009-006）

### 4.3 対象レコードの存在確認 + データスコープ

- `kanri_shiten_id` が `m_kanri_shiten` テーブルに存在し、論理削除されていないことを確認する。
- 同時にデータスコープ（画面定義§1.3）も適用：

```sql
SELECT kanri_shiten_id, ja_id
FROM m_kanri_shiten
WHERE kanri_shiten_id = :kanri_shiten_id
  AND deleted_at IS NULL
  AND (
    :role = 'NICHINO_ADMIN'
    OR (:role IN ('CHUOKAI', 'JA_HONTEN') AND ja_id = :session_ja_id)
    OR (:role = 'JA_KANRI_SHITEN' AND ja_id = :session_ja_id AND kanri_shiten_id = :session_kanri_shiten_id)
  )
```

- 存在しない／スコープ違反の場合：HTTP 404 Not Found（ACSMS-MSG-009-005）を返却する（行の存在を漏らさない）。

### 4.4 都道府県コードの存在検証

- `todofuken_code` が `m_todofuken` テーブルに存在することを確認する（NICHINO_ADMIN のみ通る経路 — §4.5 の allow-list で他ロールは弾かれる）。

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = :todofuken_code
```

- 存在しない場合：HTTP 400 Bad Request を返却する。

### 4.5 フィールドレベル制限の適用

画面定義§1.3より、ロール別に更新可能フィールドを制限する：

| ロール | 更新可能フィールド |
|---|---|
| NICHINO_ADMIN | 全項目 |
| CHUOKAI | yubin_no, address, tel, fax, biko |
| JA_HONTEN | yubin_no, address, tel, fax, biko |
| JA_KANRI_SHITEN | yubin_no, address, tel, fax, biko |

- 許可されていないフィールドがリクエストボディに含まれていても、サーバー側で**サイレントに破棄**（リクエストは 200 で成功するが、該当フィールドは DB に反映されない）。
- UI側は事前に該当フィールドを `:disabled` でグレーアウトすることで二重防御する（`.claude/rules/security.md §Layer 3` 参照）。

### 4.6 データ更新

- §4.5 で許可されたフィールドのみ UPDATE 文に含める。NICHINO_ADMIN 経路は以下の全項目更新：

```sql
UPDATE m_kanri_shiten
SET kanri_shiten_name = :kanri_shiten_name,
    kanri_shiten_name_kana = :kanri_shiten_name_kana,
    todofuken_code = :todofuken_code,
    yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    paper_flg = :paper_flg,
    denshi_flg = :denshi_flg,
    biko = :biko,
    updated_by = :user_account_id,
    updated_at = NOW()
WHERE kanri_shiten_id = :kanri_shiten_id
  AND deleted_at IS NULL
```

### 4.7 操作ログの記録

- `t_log` テーブルに操作ログを記録する。

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table, before_value, after_value, ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, :ja_id,
  '管理支店マスタ登録画面(ACSMS-SCR-009)', 'UPDATE', 1,
  :kanri_shiten_id, 'm_kanri_shiten', :before_value_json, :after_value_json, :ip_address, :user_agent
)
```

**before_value 例:**
```json
before_value：更新前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "kanri_shiten_id": 1,
  "ja_id": 1,
  "kanri_shiten_code": "113-3300-001",
  "kanri_shiten_name": "東京中央会支店",
  "kanri_shiten_name_kana": "トウキョウチュウオウカイシテン",
  "todofuken_code": "13",
  "yubin_no": "1000001",
  "address": "千代田区千代田1-1-1",
  "tel": "0312345678",
  "fax": "0312345679",
  "paper_flg": true,
  "denshi_flg": false,
  "biko": "中央会管轄"
}
```

**after_value 例:**
```json
after_value：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "kanri_shiten_id": 1,
  "ja_id": 1,
  "kanri_shiten_code": "113-3300-001",
  "kanri_shiten_name": "東京中央会支店（改称）",
  "kanri_shiten_name_kana": "トウキョウチュウオウカイシテン（カイショウ）",
  "todofuken_code": "13",
  "yubin_no": "1000001",
  "address": "千代田区千代田1-1-1 改修ビル3F",
  "tel": "0312345678",
  "fax": "0312345679",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": "住所変更済み"
}
```

### 4.8 レスポンス生成

- 更新した管理支店データと成功メッセージを JSON 形式で返却する。
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
  3, NOW(), :user_account_id, :ja_id,
  '管理支店マスタ登録画面(ACSMS-SCR-009)', 'UPDATE', 2,
  :kanri_shiten_id, 'm_kanri_shiten',
  '', '',
  :error_message, :stack_trace,
  :ip_address, :user_agent
)
```

---

# API ACSMS-API-COMMON-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get Prefecture List |
| 概要 | 都道府県マスタの一覧を取得する（ドロップダウン用） |
| URI | /api/v1/todofuken |
| メソッド | GET |
| リクエストボディー | なし |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:正常に都道府県一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|

パラメータなし。

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Array | 〇 | | - | 都道府県一覧データ |
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
  "message": "セッションが切れました。再度ログインしてください"
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
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：認証済みユーザーであれば全ロールアクセス可能。

### 4.3 データ取得

- 以下のSQLを実行してデータを取得する。

```sql
SELECT todofuken_code, todofuken_name
FROM m_todofuken
ORDER BY todofuken_code ASC
```

### 4.4 レスポンス生成

- 全47都道府県レコードを data 配列として返却する。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。
