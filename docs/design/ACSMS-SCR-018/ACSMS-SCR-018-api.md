---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-018
screen_name: 販売店明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-16
created_date: 2026/04/16
created_by: Dao Van Thang
updated_date: 2026/04/16
updated_by: Dao Van Thang
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/16 | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「販売店明細検索画面（ACSMS-SCR-018）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-017 | 販売店情報登録画面 API設計書     |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400|
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 8   | 画面固有     | NOT_FOUND   | 指定された販売店が見つかりません。                                     | HTTP 404 |
| 9   | 画面固有     | CONFLICT      | 関連データが存在するため削除できません。                               | HTTP 409 |

---

# API ACSMS-API-018-001

## 概要

| 項目                   | 内容                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Hanbaiten List                                                                                                                                                                             |
| 概要                   | 販売店マスタの一覧を検索条件・ページネーション・ソートで取得する                                                                                                                               |
| URI                    | /api/v1/hanbaiten                                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                            |
| リクエストボディー     | なし                                                                                                                                                                                           |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                         |
| HTTPレスポンスコード   | 200:正常に販売店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                               |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                            |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------- |
| 1   | hanbaiten_code | String | -        | -    |        | 10     | 販売店コード（部分一致検索）                                                                     |
| 2   | hanbaiten_name | String | -        | -    |        | 100    | 販売店名（部分一致検索）                                                                         |
| 3   | tel            | String | -        | -    |        | 15     | 電話番号（部分一致検索）                                                                         |
| 4   | fax            | String | -        | -    |        | 15     | FAX番号（部分一致検索）                                                                          |
| 5   | address        | String | -        | -    |        | 200    | 住所（部分一致検索）                                                                             |
| 6   | shocho_name    | String | -        | -    |        | 50     | 所長名（部分一致検索）                                                                           |
| 7   | page           | Number | -        | -    |        |        | ページ番号（1始まり）。デフォルト: 1                                                              |
| 8   | per_page       | Number | -        | -    |        |        | 1ページあたりの件数（1〜100）。デフォルト: 20                                                     |
| 9   | sort_by        | String | -        | -    |        |        | ソート対象カラム（hanbaiten_code, hanbaiten_name）。デフォルト: created_at                         |
| 10  | sort_order     | String | -        | -    |        |        | ソート順（asc, desc）。デフォルト: desc                                                           |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | --------------------------------------------- |
| 1   | data                         | Array   | 〇       |              | -        | 販売店データの配列                             |
| 2   | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                       |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                          |
| 4   | →hanbaiten_code              | String  | -        |              | -        | 販売店コード                                   |
| 5   | →hanbaiten_name              | String  | -        |              | -        | 販売店名                                       |
| 6   | →yubin_no                    | String  | -        |              | -        | 郵便番号                                       |
| 7   | →address                     | String  | -        |              | -        | 住所                                           |
| 8   | →tel                         | String  | -        |              | -        | 電話番号                                       |
| 9   | →fax                         | String  | -        |              | -        | FAX番号                                        |
| 10  | →shocho_name                 | String  | -        |              | -        | 所長名                                         |
| 11  | →itaku_kubun                 | Number  | -        |              | 〇       | 委託区分（1:振込, 2:日農委託, 9:その他）        |
| 12  | →itaku_kubun_label           | String  | -        |              | 〇       | 委託区分のラベル                                |
| 13  | →haitatsuryo_shiharai_cycle  | Number  | -        |              | 〇       | 配達手数料支払サイクル（月数）                   |
| 14  | →tesuryo_kubun               | Number  | -        |              | 〇       | 振込手数料負担区分（1:JA, 2:販売店）             |
| 15  | →tesuryo_kubun_label         | String  | -        |              | 〇       | 振込手数料負担区分のラベル                       |
| 16  | →tesuryo_amount              | Number  | -        |              | 〇       | 手数料金額                                      |
| 17  | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                        |
| 18  | →updated_at                  | String  | -        | ISO8601      | 〇       | 更新日時                                        |
| 19  | meta                         | Object  | -        |              | -        | ページネーション情報                             |
| 20  | →total                       | Number  | -        |              | -        | 総件数                                          |
| 21  | →page                        | Number  | -        |              | -        | 現在のページ番号                                 |
| 22  | →per_page                    | Number  | -        |              | -        | 1ページあたりの件数                              |
| 23  | →total_pages                 | Number  | -        |              | -        | 総ページ数                                      |

## リクエスト例

```
GET /api/v1/hanbaiten?hanbaiten_name=山田&tel=03&page=1&per_page=20&sort_by=hanbaiten_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "hanbaiten_id": 1,
      "ja_id": 1,
      "hanbaiten_code": "H001",
      "hanbaiten_name": "山田新聞販売店",
      "yubin_no": "1000001",
      "address": "東京都千代田区千代田1-1",
      "tel": "0312345678",
      "fax": "0312345679",
      "shocho_name": "山田太郎",
      "itaku_kubun": 1,
      "itaku_kubun_label": "振込",
      "haitatsuryo_shiharai_cycle": 1,
      "tesuryo_kubun": 1,
      "tesuryo_kubun_label": "JA",
      "tesuryo_amount": 500,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "hanbaiten_id": 2,
      "ja_id": 1,
      "hanbaiten_code": "H002",
      "hanbaiten_name": "山田書店",
      "yubin_no": "1500001",
      "address": "東京都渋谷区神宮前1-2-3",
      "tel": "0398765432",
      "fax": "0398765433",
      "shocho_name": "山田花子",
      "itaku_kubun": 2,
      "itaku_kubun_label": "日農委託",
      "haitatsuryo_shiharai_cycle": 3,
      "tesuryo_kubun": 2,
      "tesuryo_kubun_label": "販売店",
      "tesuryo_amount": 300,
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": null
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
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
  - hanbaiten_code：最大10桁
  - hanbaiten_name：最大100桁
  - tel：最大15桁
  - fax：最大15桁
  - address：最大200桁
  - shocho_name：最大50桁
  - page：正の整数。デフォルト: 1
  - per_page：1〜100の整数。デフォルト: 20
  - sort_by：許可カラム（hanbaiten_code, hanbaiten_name, created_at）のみ。デフォルト: created_at
  - sort_order：asc または desc のみ。デフォルト: desc
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.view` を保持しているか確認する。
  - 対象ロール：NICHINO_STAFF（日農担当者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（role_code, ja_id）。
- DataScope条件を構築する：
  - NICHINO_STAFF：ja_id フィルタなし（全JAの販売店にアクセス可能）
  - CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN：`ja_id = :ja_id`（自JAのみ）
- 基本条件：
  - `deleted_at IS NULL`（論理削除除外：必須条件）
- 検索条件（指定時のみ追加）：
  - hanbaiten_code 指定時：`hanbaiten_code ILIKE '%' || :hanbaiten_code || '%'`
  - hanbaiten_name 指定時：`hanbaiten_name ILIKE '%' || :hanbaiten_name || '%'`
  - tel 指定時：`tel ILIKE '%' || :tel || '%'`
  - fax 指定時：`fax ILIKE '%' || :fax || '%'`
  - address 指定時：`address ILIKE '%' || :address || '%'`
  - shocho_name 指定時：`shocho_name ILIKE '%' || :shocho_name || '%'`

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM m_hanbaiten
WHERE deleted_at IS NULL
  AND (:role_code = 'NICHINO_STAFF' OR ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR shocho_name ILIKE '%' || :shocho_name || '%')
```

### 4.5 データ取得

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       yubin_no, address, tel, fax, shocho_name,
       itaku_kubun, haitatsuryo_shiharai_cycle,
       tesuryo_kubun, tesuryo_amount,
       created_at, updated_at
FROM m_hanbaiten
WHERE deleted_at IS NULL
  AND (:role_code = 'NICHINO_STAFF' OR ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR shocho_name ILIKE '%' || :shocho_name || '%')
ORDER BY :sort_by :sort_order
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- コード値をラベルにマッピングする：
  - itaku_kubun：1 → 振込, 2 → 日農委託, 9 → その他
  - tesuryo_kubun：1 → JA, 2 → 販売店
- data 配列と meta オブジェクトを含むJSONを返却する。
- total_pages = CEIL(total / per_page)
- 検索結果が0件の場合も空配列 `[]` を返却する（HTTP 200）。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-018-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Hanbaiten                                                                                                                                                                                                                                                                          |
| 概要                   | 指定した販売店を論理削除する（関連データが存在する場合は削除不可）                                                                                                                                                                                                                        |
| URI                    | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                                                                                                          |
| メソッド               | DELETE                                                                                                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                                      |
| リクエストパラメーター | hanbaiten_id（パスパラメータ）                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                    |
| HTTPレスポンスコード   | 200:正常に販売店を削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された販売店が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                      |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------- |
| 1   | hanbaiten_id   | Number | -        | 〇   |        |        | 削除対象の hanbaiten_id（パスパラメータ）  |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | 削除成功メッセージ |

## リクエスト例

```
DELETE /api/v1/hanbaiten/1
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

### 403 Data Scope Violation

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された販売店が見つかりません"
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
  - hanbaiten_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.delete` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_STAFF（日農担当者）は `hanbaiten.delete` 権限を保持しないため削除不可
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（ja_id）。
- 対象レコードの存在確認とスコープチェックを行う。

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       hanbaiten_name_kana, torihikisaki_no,
       yubin_no, address, tel, fax, shocho_name,
       itaku_kubun, haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
       tesuryo_kubun, tesuryo_amount,
       bank_code, bank_name, bank_branch_code, bank_branch_name,
       yokin_shubetsu, koza_no, koza_meigi, biko,
       created_at, updated_at
FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 関連データの存在チェック

- 以下のテーブルで対象販売店が参照されているか確認する。

**購読者テーブル:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya
WHERE hanbaiten_id = :hanbaiten_id
  AND deleted_at IS NULL
```

**購読者履歴テーブル:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya_rireki
WHERE hanbaiten_id = :hanbaiten_id
```

- いずれかのテーブルで関連データが存在する場合（cnt > 0）：HTTP 409 (`CONFLICT`)

### 4.5 論理削除の実行

```sql
UPDATE m_hanbaiten
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '販売店明細検索画面 (ACSMS-SCR-018)', 'DELETE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "山田新聞販売店",
  "yubin_no": "1000001",
  "address": "東京都千代田区千代田1-1",
  "tel": "0312345678",
  "fax": "0312345679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500
}
```

### 4.7 レスポンス生成

- 削除成功メッセージを返却する。HTTP 200。

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
        '販売店明細検索画面 (ACSMS-SCR-018)', 'DELETE', 2,
        :hanbaiten_id, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
