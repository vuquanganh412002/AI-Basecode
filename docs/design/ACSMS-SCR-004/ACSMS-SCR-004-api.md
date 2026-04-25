---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-004
screen_name: JAマスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Nguyen Duyen Manh
updated_date: 2026/04/07
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日       | 版数 | 担当者            | 変更内容 | 確認者         | 承認者         |
| --- | ------------ | ---- | ----------------- | -------- | -------------- | -------------- |
| 1   | {issue_date} | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

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
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため削除できません。                               | HTTP 409 |

---

# API ACSMS-API-{screen_number}-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get list JA                                                                                                                                                                                          |
| 概要                   | JAマスタの一覧を検索・取得する                                                                                                                                                                       |
| URI                    | /api/v1/ja                                                                                                                                                                                           |
| メソッド               | GET                                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                                 |
| リクエストパラメーター | ?ja_code={ja_code}&ja_name={ja_name}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order}                                                                                       |
| ヘッダ                 | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常にJA一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                          |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | ja_code        | String | -        | -    |        | 10     | JAコード（部分一致）                                                                                          |
| 2   | ja_name        | String | -        | -    |        | 100    | JA名（部分一致）                                                                                              |
| 3   | page           | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                                   |
| 4   | per_page       | Number | -        | -    |        |        | 1ページの件数（デフォルト: 20）                                                                               |
| 5   | sort_by        | String | -        | -    |        |        | ソート項目（m_jaテーブルのカラム名を指定。例: ja_code, ja_name, yubin_no, todofuken_name, tel, address, fax） |
| 6   | sort_order     | String | -        | -    |        |        | ソート方向（asc / desc）                                                                                      |

## レスポンスデータ

| #   | 項目ID          | タイプ | 繰り返し | フォーマット | Nullable | 説明                              |
| --- | --------------- | ------ | -------- | ------------ | -------- | --------------------------------- |
| 1   | data            | Array  | 〇       |              | -        | JA一覧データ                      |
| 2   | →ja_id          | Number | -        |              | -        | JA ID                             |
| 3   | →ja_code        | String | -        |              | -        | JAコード                          |
| 4   | →ja_name        | String | -        |              | -        | JA名                              |
| 5   | →yubin_no       | String | -        |              | -         | 郵便番号                          |
| 6   | →todofuken_code | String | -        |              | -        | 都道府県コード                    |
| 7   | →todofuken_name | String | -        |              | -        | 都道府県名（m_todofukenからJOIN） |
| 8   | →tel            | String | -        |              | -         | 電話番号                          |
| 9   | →address        | String | -        |              | -         | 住所                              |
| 10  | →fax            | String | -        |              | -         | FAX番号                           |
| 11  | meta            | Object | -        |              | -        | ページング情報                    |
| 12  | →total          | Number | -        |              | -        | 総件数                            |
| 13  | →page           | Number | -        |              | -        | 現在のページ番号                  |
| 14  | →per_page       | Number | -        |              | -        | 1ページの件数                     |
| 15  | →total_pages    | Number | -        |              | -        | 総ページ数                        |

## リクエスト例

```
GET /api/v1/ja?ja_name=東京&page=1&per_page=20&sort_by=ja_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "ja_id": 1,
      "ja_code": "1301001001",
      "ja_name": "JA東京中央",
      "yubin_no": "100-0001",
      "todofuken_code": "13",
      "todofuken_name": "東京都",
      "tel": "03-1234-5678",
      "address": "東京都千代田区丸の内1-1-1",
      "fax": "03-1234-5679"
    },
    {
      "ja_id": 2,
      "ja_code": "1301002001",
      "ja_name": "JA東京みらい",
      "yubin_no": "160-0022",
      "todofuken_code": "13",
      "todofuken_name": "東京都",
      "tel": "03-2345-6789",
      "address": "東京都新宿区新宿3-1-1",
      "fax": "03-2345-6780"
    }
  ],
  "meta": {
    "total": 2,
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
  - ja_code：文字列型、最大10文字
  - ja_name：文字列型、最大100文字
  - page：数値型、1以上の整数
  - per_page：数値型、1以上100以下の整数
  - sort_by：列挙型（ja_code, ja_name, yubin_no, todofuken_name, tel, address, fax）
  - sort_order：列挙型（asc, desc）
- デフォルト値の適用：
  - page：未指定の場合、1
  - per_page：未指定の場合、20
  - sort_by：未指定の場合、ja_code
  - sort_order：未指定の場合、asc
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：ja.view を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 データ取得条件の設定

- ログインユーザーの `m_account.ja_id` を取得する。
- データスコープの適用：
  - `user.ja_id` が NULL の場合（NICHINO_ADMIN）：ja_idフィルタなし → 全JAレコードを取得
  - `user.ja_id` が NULL でない場合（CHUOKAI / JA_HONTEN）：ja_id = user.ja_id → 自JAのレコードのみ取得
- 基本条件：
  - 論理削除除外（deleted_at IS NULL）
- 検索条件：
  - ja_code：部分一致（ILIKE '%value%'）
  - ja_name：部分一致（ILIKE '%value%'）
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
    mj.ja_id,
    mj.ja_code,
    mj.ja_name,
    mj.yubin_no,
    mj.todofuken_code,
    mt.todofuken_name,
    mj.tel,
    mj.address,
    mj.fax
FROM m_ja mj
LEFT JOIN m_todofuken mt ON mj.todofuken_code = mt.todofuken_code
WHERE mj.deleted_at IS NULL
  AND (:ja_id IS NULL OR mj.ja_id = :ja_id)
  AND (:ja_code IS NULL OR mj.ja_code ILIKE '%' || :ja_code || '%')
  AND (:ja_name IS NULL OR mj.ja_name ILIKE '%' || :ja_name || '%')
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

- `:ja_id` = `user.ja_id`（m_accountから取得）。NICHINO_ADMINはja_id=NULLのため、条件 `:ja_id IS NULL` が真となりJAフィルタがスキップされ全件取得となる。CHUOKAI/JA_HONTENはja_idが設定されているため自JAのみ取得する。

### 4.7 レスポンス生成

- data 配列と meta オブジェクトを含むJSONを返却する。

### 4.8 例外処理

- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-{screen_number}-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete JA                                                                                                                                                                                                                                                                  |
| 概要                   | 指定したJAマスタを論理削除する                                                                                                                                                                                                                                             |
| URI                    | /api/v1/ja/{id}                                                                                                                                                                                                                                                            |
| メソッド               | DELETE                                                                                                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に削除しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたJAが見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明             |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ---------------- |
| 1   | id             | Number | -        | 〇   |        |        | 削除対象の ja_id |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | 処理結果メッセージ |

## リクエスト例

```
DELETE /api/v1/ja/5
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
  "message": "指定されたJAが見つかりません"
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - id：数値型チェック
  - id：必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：ja.delete を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）

### 4.3 データ取得条件の設定

- 対象レコードの検索：
  - ja_id = {id}
  - 論理削除除外（deleted_at IS NULL）
- 対象レコードが存在しない場合：
  - HTTP 404 Not Found を返却する。

### 4.4 関連データの存在チェック

- 以下のテーブルに関連レコードが存在するか確認する。

```sql
-- 管理支店の存在チェック
SELECT COUNT(*) FROM m_kanri_shiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- 支店の存在チェック
SELECT COUNT(*) FROM m_shiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- 販売店の存在チェック
SELECT COUNT(*) FROM m_hanbaiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- 単価マスタの存在チェック
SELECT COUNT(*) FROM m_tanka
WHERE ja_id = :id AND deleted_at IS NULL;

-- 購読者の存在チェック
SELECT COUNT(*) FROM t_dokusya
WHERE ja_id = :id AND deleted_at IS NULL;

-- アカウントの存在チェック
SELECT COUNT(*) FROM m_account
WHERE ja_id = :id AND deleted_at IS NULL;
```

- いずれかに関連レコードが存在する場合：
  - HTTP 409 Conflict を返却する。

### 4.5 論理削除の実行

- 以下のSQLを実行して論理削除を行う。

```sql
UPDATE m_ja
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE ja_id = :id
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
VALUES (1, NOW(), :account_id, :ja_id,
        'JAマスタ明細検索画面 (ACSMS-SCR-004)', 'DELETE', 1,
        :ja_id, 'm_ja',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "ja_id": 5,
  "ja_code": "1301005001",
  "ja_name": "JA削除対象",
  "yubin_no": "100-0001",
  "todofuken_code": "13",
  "todofuken_name": "東京都",
  "tel": "03-5555-5555",
  "address": "東京都千代田区",
  "fax": "03-5555-5556"
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
VALUES (3, NOW(), :account_id, :ja_id,
        'JAマスタ明細検索画面 (ACSMS-SCR-004)', 'DELETE', 2,
        :ja_id, 'm_ja',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
