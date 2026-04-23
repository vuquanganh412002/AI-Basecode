---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-008
screen_name: 管理支店マスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Dao Van Thang
updated_date: 2026/04/07
updated_by: Dao Van Thang
---

## 変更履歴

| No  | 発行日       | 版数 | 担当者        | 変更内容 | 確認者         | 承認者         |
| --- | ------------ | ---- | ------------- | -------- | -------------- | -------------- |
| 1   | {issue_date} | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

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

| No  | 資料コード | 資料名 |
| --- | ---------- | ------ |

## エラー一覧

| #   | エラータイプ          | エラーコード          | エラーメッセージ                                                   |
| --- | --------------------- | --------------------- | ------------------------------------------------------------------ |
| 1   | UNAUTHORIZED          | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                 |
| 2   | FORBIDDEN             | FORBIDDEN             | この画面へのアクセス権限がありません。                             |
| 3   | BAD_REQUEST           | BAD_REQUEST           | リクエストパラメータが不正です。                                   |
| 4   | VALIDATION_ERROR      | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。       |
| 5   | NOT_FOUND             | NOT_FOUND             | 指定された管理支店が見つかりません。                               |
| 6   | CONFLICT              | CONFLICT              | 関連データが存在するため削除できません。                           |
| 7   | INTERNAL_SERVER_ERROR | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。 |

---

# API ACSMS-API-{screen_number}-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get list Management Branch                                                                                                                                                                                 |
| 概要                   | 管理支店マスタの一覧を検索・取得する                                                                                                                                                                       |
| URI                    | /api/v1/kanri-shiten                                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                       |
| リクエストパラメーター | ?kanri_shiten_code={kanri_shiten_code}&kanri_shiten_name={kanri_shiten_name}&tel={tel}&fax={fax}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order}                                 |
| ヘッダ                 | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に管理支店一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                      |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_code | String | -        | -    |        | 15     | 管理支店コード（部分一致）                                                                                                                                |
| 2   | kanri_shiten_name | String | -        | -    |        | 100    | 管理支店名（部分一致）                                                                                                                                    |
| 3   | tel               | String | -        | -    |        | 15     | 電話番号（部分一致）                                                                                                                                      |
| 4   | fax               | String | -        | -    |        | 15     | FAX番号（部分一致）                                                                                                                                       |
| 5   | page              | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                                                                               |
| 6   | per_page          | Number | -        | -    |        |        | 1ページの件数（デフォルト: 20）                                                                                                                           |
| 7   | sort_by           | String | -        | -    |        |        | ソート項目（m_kanri_shitenテーブルのカラム名を指定。例: kanri_shiten_code, kanri_shiten_name, yubin_no, todofuken_name, tel, fax, paper_flg, denshi_flg） |
| 8   | sort_order        | String | -        | -    |        |        | ソート方向（asc / desc）                                                                                                                                  |

## レスポンスデータ

| #   | 項目ID             | タイプ  | 繰り返し | フォーマット | Nullable | 説明                              |
| --- | ------------------ | ------- | -------- | ------------ | -------- | --------------------------------- |
| 1   | data               | Array   | 〇       |              | -        | 管理支店一覧データ                |
| 2   | →kanri_shiten_id   | Number  | -        |              | -        | 管理支店ID                        |
| 3   | →kanri_shiten_code | String  | -        |              | -        | 管理支店コード                    |
| 4   | →kanri_shiten_name | String  | -        |              | -        | 管理支店名                        |
| 5   | →yubin_no          | String  | -        |              | 〇       | 郵便番号                          |
| 6   | →todofuken_code    | String  | -        |              | 〇       | 都道府県コード                    |
| 7   | →todofuken_name    | String  | -        |              | 〇       | 都道府県名（m_todofukenからJOIN） |
| 8   | →address           | String  | -        |              | 〇       | 住所                              |
| 9   | →tel               | String  | -        |              | 〇       | 電話番号                          |
| 10  | →fax               | String  | -        |              | 〇       | FAX番号                           |
| 11  | →paper_flg         | Boolean | -        |              | -        | 紙版取扱フラグ                    |
| 12  | →denshi_flg        | Boolean | -        |              | -        | 電子版取扱フラグ                  |
| 13  | meta               | Object  | -        |              | -        | ページング情報                    |
| 14  | →total             | Number  | -        |              | -        | 総件数                            |
| 15  | →page              | Number  | -        |              | -        | 現在のページ番号                  |
| 16  | →per_page          | Number  | -        |              | -        | 1ページの件数                     |
| 17  | →total_pages       | Number  | -        |              | -        | 総ページ数                        |

## リクエスト例

```
GET /api/v1/kanri-shiten?kanri_shiten_code=3300&kanri_shiten_name=北海道&page=1&per_page=20&sort_by=kanri_shiten_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "kanri_shiten_id": 1,
      "kanri_shiten_code": "013-3300-001",
      "kanri_shiten_name": "JA北海道中央管理支店",
      "yubin_no": "060-0001",
      "todofuken_code": "01",
      "todofuken_name": "北海道",
      "address": "札幌市中央区北1条西2丁目",
      "tel": "011-222-3333",
      "fax": "011-222-3334",
      "paper_flg": true,
      "denshi_flg": true
    },
    {
      "kanri_shiten_id": 2,
      "kanri_shiten_code": "013-3300-002",
      "kanri_shiten_name": "JA北海道東部管理支店",
      "yubin_no": "085-0017",
      "todofuken_code": "01",
      "todofuken_name": "北海道",
      "address": "釧路市幸町10-1",
      "tel": "0154-41-5678",
      "fax": "0154-41-5679",
      "paper_flg": true,
      "denshi_flg": false
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
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
  - kanri_shiten_code：文字列型、最大15文字
  - kanri_shiten_name：文字列型、最大100文字
  - tel：文字列型、最大15文字
  - fax：文字列型、最大15文字
  - page：数値型、1以上の整数
  - per_page：数値型、1以上100以下の整数
  - sort_by：列挙型（kanri_shiten_code, kanri_shiten_name, yubin_no, todofuken_name, tel, fax, paper_flg, denshi_flg）
  - sort_order：列挙型（asc, desc）
- デフォルト値の適用：
  - page：未指定の場合、1
  - per_page：未指定の場合、20
  - sort_by：未指定の場合、kanri_shiten_code
  - sort_order：未指定の場合、asc
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：kanri-shiten.view を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する。
- データスコープの適用：
  - NICHINO_ADMIN：全JA管理支店レコードを取得（ja_idフィルタなし）
- 基本条件：
  - 論理削除除外（deleted_at IS NULL）
- 検索条件：
  - kanri_shiten_code：部分一致（ILIKE '%value%'）
  - kanri_shiten_name：部分一致（ILIKE '%value%'）
  - tel：部分一致（ILIKE '%value%'）
  - fax：部分一致（ILIKE '%value%'）
  - sort_by / sort_order：ソート適用

### 4.4 データ件数の取得

- 条件に一致する総件数を取得する。
- meta.total に使用する。

### 4.5 ソート・ページング

- sort_by / sort_order でソート適用。
- OFFSET = (page - 1) \* per_page, LIMIT = per_page

### 4.6 データ取得

- 以下のSQLを実行してデータを取得する。

```sql
SELECT
    mks.kanri_shiten_id,
    mks.kanri_shiten_code,
    mks.kanri_shiten_name,
    mks.yubin_no,
    mks.todofuken_code,
    mt.todofuken_name,
    mks.address,
    mks.tel,
    mks.fax,
    mks.paper_flg,
    mks.denshi_flg
FROM m_kanri_shiten mks
LEFT JOIN m_todofuken mt ON mks.todofuken_code = mt.todofuken_code
WHERE mks.deleted_at IS NULL
  AND (:kanri_shiten_code IS NULL OR mks.kanri_shiten_code ILIKE '%' || :kanri_shiten_code || '%')
  AND (:kanri_shiten_name IS NULL OR mks.kanri_shiten_name ILIKE '%' || :kanri_shiten_name || '%')
  AND (:tel IS NULL OR mks.tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR mks.fax ILIKE '%' || :fax || '%')
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

- NICHINO_ADMIN は全JA横断で管理支店を取得するため、ja_idフィルタは適用しない。

### 4.7 レスポンス生成

- data 配列と meta オブジェクトを含むJSONを返却する。

### 4.8 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-{screen_number}-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Management Branch                                                                                                                                                                                                                                                         |
| 概要                   | 指定した管理支店マスタを論理削除する                                                                                                                                                                                                                                             |
| URI                    | /api/v1/kanri-shiten/{kanri_shiten_id}                                                                                                                                                                                                                                           |
| メソッド               | DELETE                                                                                                                                                                                                                                                                           |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                             |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                  |
| ヘッダ                 | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                             |
| HTTPレスポンスコード   | 200:正常に削除しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された管理支店が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | -------------------------- |
| 1   | id             | Number | -        | 〇   |        |        | 削除対象の kanri_shiten_id |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | 処理結果メッセージ |

## リクエスト例

```
DELETE /api/v1/kanri-shiten/5
```

## レスポンス成功例

```json
{
  "message": "正常に削除しました"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
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

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため削除できません"
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
  - id：数値型チェック
  - id：必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：kanri-shiten.delete を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 データ取得条件の設定

- 対象レコードの検索：
  - kanri_shiten_id = {id}
  - 論理削除除外（deleted_at IS NULL）
- 対象レコードが存在しない場合：
  - HTTP 404 Not Found を返却する。

### 4.4 関連データの存在チェック

- 以下のテーブルに関連レコードが存在するか確認する。

```sql
-- 支店の存在チェック
SELECT COUNT(*) FROM m_shiten
WHERE kanri_shiten_id = :id AND deleted_at IS NULL;

-- 購読者の存在チェック
SELECT COUNT(*) FROM t_dokusya
WHERE kanri_shiten_id = :id AND deleted_at IS NULL;

-- アカウントの存在チェック
SELECT COUNT(*) FROM m_account
WHERE kanri_shiten_id = :id AND deleted_at IS NULL;
```

- いずれかに関連レコードが存在する場合：
  - HTTP 409 Conflict を返却する。

### 4.5 論理削除の実行

- 以下のSQLを実行して論理削除を行う。

```sql
UPDATE m_kanri_shiten
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE kanri_shiten_id = :id
  AND deleted_at IS NULL
```

### 4.6 操作ログ記録

- 削除前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。
- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, NULL,
        '管理支店マスタ明細検索画面 (ACSMS-SCR-008)', 'DELETE', 1,
        :kanri_shiten_id, 'm_kanri_shiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "kanri_shiten_id": 5,
  "kanri_shiten_code": "013-3300-005",
  "kanri_shiten_name": "JA削除対象管理支店",
  "yubin_no": "060-0001",
  "todofuken_code": "01",
  "todofuken_name": "北海道",
  "address": "札幌市中央区",
  "tel": "011-333-3333",
  "fax": "011-333-3334",
  "paper_flg": true,
  "denshi_flg": false
}
```

### 4.7 レスポンス生成

- 成功メッセージを返却する。

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
VALUES (3, NOW(), :account_id, NULL,
        '管理支店マスタ明細検索画面 (ACSMS-SCR-008)', 'DELETE', 2,
        :kanri_shiten_id, 'm_kanri_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
