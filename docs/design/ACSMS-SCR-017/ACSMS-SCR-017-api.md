---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-017
screen_name: 販売店情報登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-16
created_date: 2026/04/16
created_by: Dao Van Thang
updated_date: 2026/04/16
updated_by: Dao Van Thang
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容               | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | ---------------------- | -------------- | -------------- |
| 1   | 2026/04/16 | 1.0  | Dao Van Thang | 初版作成               | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「販売店情報登録画面（ACSMS-SCR-017）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-018 | 販売店明細検索画面 API設計書     |

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
| 8   | 画面固有     | NOT_FOUND   | 指定された販売店が見つかりません。                                     | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | 同一の販売店コードが既に登録されています。                             | HTTP 400 |

---

# API ACSMS-API-017-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Hanbaiten Detail                                                                                                                                                                                   |
| 概要                   | 指定した販売店の詳細を取得する（編集モード用）                                                                                                                                                           |
| URI                    | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                   |
| リクエストパラメーター | hanbaiten_id（パスパラメータ）                                                                                                                                                                         |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に販売店詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された販売店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | hanbaiten_id   | Number | -        | 〇   |        |        | 取得対象の hanbaiten_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID                     | タイプ | 繰り返し | フォーマット | Nullable | 説明                       |
| --- | -------------------------- | ------ | -------- | ------------ | -------- | -------------------------- |
| 1   | data                       | Object | -        |              | -        |                            |
| 2   | →hanbaiten_id              | Number | -        |              | -        | 販売店ID                   |
| 3   | →ja_id                     | Number | -        |              | -        | JA ID                      |
| 4   | →hanbaiten_code            | String | -        |              | -        | 販売店コード               |
| 5   | →hanbaiten_name            | String | -        |              | -        | 販売店名                   |
| 6   | →hanbaiten_name_kana       | String | -        |              | 〇       | 販売店名（カナ）           |
| 7   | →torihikisaki_no           | String | -        |              | 〇       | 適格請求書発行事業者番号   |
| 8   | →yubin_no                  | String | -        |              | 〇       | 郵便番号                   |
| 9   | →address                   | String | -        |              | 〇       | 住所                       |
| 10  | →tel                       | String | -        |              | 〇       | 電話番号                   |
| 11  | →fax                       | String | -        |              | 〇       | FAX番号                    |
| 12  | →shocho_name               | String | -        |              | 〇       | 所長名                     |
| 13  | →itaku_kubun               | Number | -        |              | 〇       | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 14  | →haitatsuryo_tanka_id      | Number | -        |              | 〇       | 配達手数料単価ID           |
| 15  | →haitatsuryo_shiharai_cycle| Number | -        |              | 〇       | 配達手数料支払サイクル（月数） |
| 16  | →tesuryo_kubun             | Number | -        |              | 〇       | 手数料区分（1:JA, 2:販売店） |
| 17  | →tesuryo_amount            | Number | -        | 0.00         | 〇       | 手数料金額                 |
| 18  | →bank_code                 | String | -        |              | 〇       | 銀行コード                 |
| 19  | →bank_name                 | String | -        |              | 〇       | 銀行名                     |
| 20  | →bank_branch_code          | String | -        |              | 〇       | 支店コード                 |
| 21  | →bank_branch_name          | String | -        |              | 〇       | 支店名                     |
| 22  | →yokin_shubetsu            | Number | -        |              | 〇       | 預金種別（1:普通, 2:当座） |
| 23  | →koza_no                   | String | -        |              | 〇       | 口座番号                   |
| 24  | →koza_meigi                | String | -        |              | 〇       | 口座名義                   |
| 25  | →biko                      | String | -        |              | 〇       | 備考                       |
| 26  | →created_at                | String | -        | ISO8601      | -        | 作成日時                   |
| 27  | →updated_at                | String | -        | ISO8601      | 〇       | 更新日時                   |

## リクエスト例

```
GET /api/v1/hanbaiten/1
```

## レスポンス成功例

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 500.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "biko": "特別な対応なし",
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
- 権限チェック：`hanbaiten.view` を保持しているか確認する。
  - 対象ロール：NICHINO_STAFF（日農担当者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件でデータを取得する。

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       hanbaiten_name_kana, torihikisaki_no, yubin_no, address,
       tel, fax, shocho_name, itaku_kubun, haitatsuryo_tanka_id,
       haitatsuryo_shiharai_cycle, tesuryo_kubun, tesuryo_amount,
       bank_code, bank_name, bank_branch_code, bank_branch_name,
       yokin_shubetsu, koza_no, koza_meigi, biko,
       created_at, updated_at
FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
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

# API ACSMS-API-017-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Create Hanbaiten                                                                                                                                                                                                                           |
| 概要                   | 新しい販売店を登録する                                                                                                                                                                                                                     |
| URI                    | /api/v1/hanbaiten                                                                                                                                                                                                                          |
| メソッド               | POST                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                     |
| HTTPレスポンスコード   | 201:正常に販売店を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:同一の販売店コードが既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID           | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                     |
| --- | ------------------------ | ------ | -------- | ---- | ------ | ------ | ---------------------------------------- |
| 1   | hanbaiten_code           | String | -        | 〇   | 1      | 10     | 販売店コード                             |
| 2   | hanbaiten_name           | String | -        | 〇   | 1      | 100    | 販売店名                                 |
| 3   | hanbaiten_name_kana      | String | -        | -    | 1      | 100    | 販売店名（カナ）                         |
| 4   | torihikisaki_no          | String | -        | -    | 1      | 20     | 適格請求書発行事業者番号                 |
| 5   | yubin_no                 | String | -        | -    | 1      | 7      | 郵便番号                                 |
| 6   | address                  | String | -        | -    | 1      | 200    | 住所                                     |
| 7   | tel                      | String | -        | -    | 1      | 15     | 電話番号                                 |
| 8   | fax                      | String | -        | -    | 1      | 15     | FAX番号                                  |
| 9   | shocho_name              | String | -        | -    | 1      | 50     | 所長名                                   |
| 10  | itaku_kubun              | Number | -        | -    |        |        | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 11  | haitatsuryo_tanka_id     | Number | -        | -    |        |        | 配達手数料単価ID                         |
| 12  | haitatsuryo_shiharai_cycle| Number | -        | -    |        |        | 配達手数料支払サイクル（月数）           |
| 13  | tesuryo_kubun            | Number | -        | -    |        |        | 手数料区分（1:JA, 2:販売店）             |
| 14  | tesuryo_amount           | Number | -        | -    |        |        | 手数料金額 ≧ 0                          |
| 15  | bank_code                | String | -        | -    | 1      | 4      | 銀行コード（itaku_kubun=1の場合は必須）  |
| 16  | bank_name                | String | -        | -    | 1      | 100    | 銀行名（itaku_kubun=1の場合は必須）      |
| 17  | bank_branch_code         | String | -        | -    | 1      | 3      | 支店コード（itaku_kubun=1の場合は必須）  |
| 18  | bank_branch_name         | String | -        | -    | 1      | 100    | 支店名（itaku_kubun=1の場合は必須）      |
| 19  | yokin_shubetsu           | Number | -        | -    |        |        | 預金種別（1:普通, 2:当座、itaku_kubun=1の場合は必須） |
| 20  | koza_no                  | String | -        | -    | 1      | 10     | 口座番号（itaku_kubun=1の場合は必須）    |
| 21  | koza_meigi               | String | -        | -    | 1      | 50     | 口座名義                                 |
| 22  | biko                     | String | -        | -    |        |        | 備考                                     |

## レスポンスデータ

| #   | 項目ID                     | タイプ | 繰り返し | フォーマット | Nullable | 説明                       |
| --- | -------------------------- | ------ | -------- | ------------ | -------- | -------------------------- |
| 1   | data                       | Object | -        |              | -        | 登録された販売店データ     |
| 2   | →hanbaiten_id              | Number | -        |              | -        | 販売店ID                   |
| 3   | →ja_id                     | Number | -        |              | -        | JA ID                      |
| 4   | →hanbaiten_code            | String | -        |              | -        | 販売店コード               |
| 5   | →hanbaiten_name            | String | -        |              | -        | 販売店名                   |
| 6   | →hanbaiten_name_kana       | String | -        |              | 〇       | 販売店名（カナ）           |
| 7   | →torihikisaki_no           | String | -        |              | 〇       | 適格請求書発行事業者番号   |
| 8   | →yubin_no                  | String | -        |              | 〇       | 郵便番号                   |
| 9   | →address                   | String | -        |              | 〇       | 住所                       |
| 10  | →tel                       | String | -        |              | 〇       | 電話番号                   |
| 11  | →fax                       | String | -        |              | 〇       | FAX番号                    |
| 12  | →shocho_name               | String | -        |              | 〇       | 所長名                     |
| 13  | →itaku_kubun               | Number | -        |              | 〇       | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 14  | →haitatsuryo_tanka_id      | Number | -        |              | 〇       | 配達手数料単価ID           |
| 15  | →haitatsuryo_shiharai_cycle| Number | -        |              | 〇       | 配達手数料支払サイクル（月数） |
| 16  | →tesuryo_kubun             | Number | -        |              | 〇       | 手数料区分（1:JA, 2:販売店） |
| 17  | →tesuryo_amount            | Number | -        | 0.00         | 〇       | 手数料金額                 |
| 18  | →bank_code                 | String | -        |              | 〇       | 銀行コード                 |
| 19  | →bank_name                 | String | -        |              | 〇       | 銀行名                     |
| 20  | →bank_branch_code          | String | -        |              | 〇       | 支店コード                 |
| 21  | →bank_branch_name          | String | -        |              | 〇       | 支店名                     |
| 22  | →yokin_shubetsu            | Number | -        |              | 〇       | 預金種別（1:普通, 2:当座） |
| 23  | →koza_no                   | String | -        |              | 〇       | 口座番号                   |
| 24  | →koza_meigi                | String | -        |              | 〇       | 口座名義                   |
| 25  | →biko                      | String | -        |              | 〇       | 備考                       |
| 26  | →created_at                | String | -        | ISO8601      | -        | 作成日時                   |
| 27  | →updated_at                | String | -        | ISO8601      | 〇       | 更新日時                   |

## リクエスト例

```json
POST /api/v1/hanbaiten
Content-Type: application/json

{
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "biko": "特別な対応なし"
}
```

## レスポンス成功例

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 500.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "biko": "特別な対応なし",
    "created_at": "2026-04-16T10:00:00Z",
    "updated_at": null
  }
}
```

## レスポンス失敗例

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "hanbaiten_code", "message": "販売店コードは必須です" },
    { "field": "hanbaiten_name", "message": "販売店名は必須です" },
    { "field": "bank_code", "message": "委託区分が振込の場合は銀行コードは必須です" }
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
  "message": "同一の販売店コードが既に登録されています"
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
  - hanbaiten_code：必須、最大10桁、同一JA内で一意
  - hanbaiten_name：必須、最大100桁
  - hanbaiten_name_kana：最大100桁
  - torihikisaki_no：最大20桁
  - yubin_no：最大7桁（郵便番号形式チェック）
  - address：最大200桁
  - tel：最大15桁
  - fax：最大15桁
  - shocho_name：最大50桁
  - itaku_kubun：1, 2, 9 のいずれか
  - haitatsuryo_tanka_id：数値型チェック
  - haitatsuryo_shiharai_cycle：数値型チェック、≧ 0
  - tesuryo_kubun：1, 2 のいずれか
  - tesuryo_amount：数値型チェック、≧ 0
  - itaku_kubun = 1（振込）の場合：
    - bank_code：必須、最大4桁
    - bank_name：必須、最大100桁
    - bank_branch_code：必須、最大3桁
    - bank_branch_name：必須、最大100桁
    - yokin_shubetsu：必須、1 または 2
    - koza_no：必須、最大10桁
  - koza_meigi：最大50桁
  - biko：テキスト型
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.create` を保持しているか確認する。
  - 対象ロール：NICHINO_STAFF（日農担当者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 重複チェック

- ログインユーザーのスコープを取得する（ja_id）。
- 以下の条件で重複を確認する。

```sql
SELECT COUNT(*) FROM m_hanbaiten
WHERE hanbaiten_code = :hanbaiten_code
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- 重複がある場合：HTTP 400 (`DUPLICATE_CODE`)

### 4.4 データ登録

- 以下のSQLを実行して登録する。

```sql
INSERT INTO m_hanbaiten (ja_id, hanbaiten_code, hanbaiten_name,
                         hanbaiten_name_kana, torihikisaki_no, yubin_no, address,
                         tel, fax, shocho_name, itaku_kubun,
                         haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
                         tesuryo_kubun, tesuryo_amount,
                         bank_code, bank_name, bank_branch_code, bank_branch_name,
                         yokin_shubetsu, koza_no, koza_meigi, biko,
                         created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :hanbaiten_code, :hanbaiten_name,
        :hanbaiten_name_kana, :torihikisaki_no, :yubin_no, :address,
        :tel, :fax, :shocho_name, :itaku_kubun,
        :haitatsuryo_tanka_id, :haitatsuryo_shiharai_cycle,
        :tesuryo_kubun, :tesuryo_amount,
        :bank_code, :bank_name, :bank_branch_code, :bank_branch_name,
        :yokin_shubetsu, :koza_no, :koza_meigi, :biko,
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
        '販売店情報登録画面 (ACSMS-SCR-017)', 'CREATE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
`before_value`：INSERT のため空文字列を設定する。
`after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "biko": "特別な対応なし"
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
        '販売店情報登録画面 (ACSMS-SCR-017)', 'CREATE', 2,
        NULL, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-017-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Hanbaiten                                                                                                                                                                                                                   |
| 概要                   | 指定した販売店を更新する                                                                                                                                                                                                           |
| URI                    | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                                                   |
| メソッド               | PUT                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                               |
| リクエストパラメーター | hanbaiten_id（パスパラメータ）                                                                                                                                                                                                     |
| ヘッダ                 | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                             |
| HTTPレスポンスコード   | 200:正常に販売店を更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された販売店が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID           | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                     |
| --- | ------------------------ | ------ | -------- | ---- | ------ | ------ | ---------------------------------------- |
| 1   | hanbaiten_id             | Number | -        | 〇   |        |        | 更新対象の hanbaiten_id（パスパラメータ） |
| 2   | hanbaiten_name           | String | -        | 〇   | 1      | 100    | 販売店名                                 |
| 3   | hanbaiten_name_kana      | String | -        | -    | 1      | 100    | 販売店名（カナ）                         |
| 4   | torihikisaki_no          | String | -        | -    | 1      | 20     | 適格請求書発行事業者番号                 |
| 5   | yubin_no                 | String | -        | -    | 1      | 7      | 郵便番号                                 |
| 6   | address                  | String | -        | -    | 1      | 200    | 住所                                     |
| 7   | tel                      | String | -        | -    | 1      | 15     | 電話番号                                 |
| 8   | fax                      | String | -        | -    | 1      | 15     | FAX番号                                  |
| 9   | shocho_name              | String | -        | -    | 1      | 50     | 所長名                                   |
| 10  | itaku_kubun              | Number | -        | -    |        |        | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 11  | haitatsuryo_tanka_id     | Number | -        | -    |        |        | 配達手数料単価ID                         |
| 12  | haitatsuryo_shiharai_cycle| Number | -        | -    |        |        | 配達手数料支払サイクル（月数）           |
| 13  | tesuryo_kubun            | Number | -        | -    |        |        | 手数料区分（1:JA, 2:販売店）             |
| 14  | tesuryo_amount           | Number | -        | -    |        |        | 手数料金額 ≧ 0                          |
| 15  | bank_code                | String | -        | -    | 1      | 4      | 銀行コード（itaku_kubun=1の場合は必須）  |
| 16  | bank_name                | String | -        | -    | 1      | 100    | 銀行名（itaku_kubun=1の場合は必須）      |
| 17  | bank_branch_code         | String | -        | -    | 1      | 3      | 支店コード（itaku_kubun=1の場合は必須）  |
| 18  | bank_branch_name         | String | -        | -    | 1      | 100    | 支店名（itaku_kubun=1の場合は必須）      |
| 19  | yokin_shubetsu           | Number | -        | -    |        |        | 預金種別（1:普通, 2:当座、itaku_kubun=1の場合は必須） |
| 20  | koza_no                  | String | -        | -    | 1      | 10     | 口座番号（itaku_kubun=1の場合は必須）    |
| 21  | koza_meigi               | String | -        | -    | 1      | 50     | 口座名義                                 |
| 22  | biko                     | String | -        | -    |        |        | 備考                                     |

※ hanbaiten_code は更新不可（画面側でdisabled）。リクエストに含めない。

## レスポンスデータ

| #   | 項目ID                     | タイプ | 繰り返し | フォーマット | Nullable | 説明                       |
| --- | -------------------------- | ------ | -------- | ------------ | -------- | -------------------------- |
| 1   | data                       | Object | -        |              | -        | 更新された販売店データ     |
| 2   | →hanbaiten_id              | Number | -        |              | -        | 販売店ID                   |
| 3   | →ja_id                     | Number | -        |              | -        | JA ID                      |
| 4   | →hanbaiten_code            | String | -        |              | -        | 販売店コード (編集不可)    |
| 5   | →hanbaiten_name            | String | -        |              | -        | 販売店名                   |
| 6   | →hanbaiten_name_kana       | String | -        |              | 〇       | 販売店名（カナ）           |
| 7   | →torihikisaki_no           | String | -        |              | 〇       | 適格請求書発行事業者番号   |
| 8   | →yubin_no                  | String | -        |              | 〇       | 郵便番号                   |
| 9   | →address                   | String | -        |              | 〇       | 住所                       |
| 10  | →tel                       | String | -        |              | 〇       | 電話番号                   |
| 11  | →fax                       | String | -        |              | 〇       | FAX番号                    |
| 12  | →shocho_name               | String | -        |              | 〇       | 所長名                     |
| 13  | →itaku_kubun               | Number | -        |              | 〇       | 委託区分（1:振込, 2:日農委託, 9:その他） |
| 14  | →haitatsuryo_tanka_id      | Number | -        |              | 〇       | 配達手数料単価ID           |
| 15  | →haitatsuryo_shiharai_cycle| Number | -        |              | 〇       | 配達手数料支払サイクル（月数） |
| 16  | →tesuryo_kubun             | Number | -        |              | 〇       | 手数料区分（1:JA, 2:販売店） |
| 17  | →tesuryo_amount            | Number | -        | 0.00         | 〇       | 手数料金額                 |
| 18  | →bank_code                 | String | -        |              | 〇       | 銀行コード                 |
| 19  | →bank_name                 | String | -        |              | 〇       | 銀行名                     |
| 20  | →bank_branch_code          | String | -        |              | 〇       | 支店コード                 |
| 21  | →bank_branch_name          | String | -        |              | 〇       | 支店名                     |
| 22  | →yokin_shubetsu            | Number | -        |              | 〇       | 預金種別（1:普通, 2:当座） |
| 23  | →koza_no                   | String | -        |              | 〇       | 口座番号                   |
| 24  | →koza_meigi                | String | -        |              | 〇       | 口座名義                   |
| 25  | →biko                      | String | -        |              | 〇       | 備考                       |
| 26  | →created_at                | String | -        | ISO8601      | -        | 作成日時                   |
| 27  | →updated_at                | String | -        | ISO8601      | 〇       | 更新日時                   |

## リクエスト例

```json
PUT /api/v1/hanbaiten/1
Content-Type: application/json

{
  "hanbaiten_name": "販売店A改定",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 600.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "biko": "更新しました"
}
```

## レスポンス成功例

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A改定",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 600.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "biko": "更新しました",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-16T14:30:00Z"
  }
}
```

## レスポンス失敗例

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "hanbaiten_name", "message": "販売店名は必須です" },
    { "field": "bank_code", "message": "委託区分が振込の場合は銀行コードは必須です" }
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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- パスパラメータ：hanbaiten_id 数値型チェック、必須
- リクエストボディ：
  - hanbaiten_name：必須、最大100桁
  - hanbaiten_name_kana：最大100桁
  - torihikisaki_no：最大20桁
  - yubin_no：最大7桁（郵便番号形式チェック）
  - address：最大200桁
  - tel：最大15桁
  - fax：最大15桁
  - shocho_name：最大50桁
  - itaku_kubun：1, 2, 9 のいずれか
  - haitatsuryo_tanka_id：数値型チェック
  - haitatsuryo_shiharai_cycle：数値型チェック、≧ 0
  - tesuryo_kubun：1, 2 のいずれか
  - tesuryo_amount：数値型チェック、≧ 0
  - itaku_kubun = 1（振込）の場合：
    - bank_code：必須、最大4桁
    - bank_name：必須、最大100桁
    - bank_branch_code：必須、最大3桁
    - bank_branch_name：必須、最大100桁
    - yokin_shubetsu：必須、1 または 2
    - koza_no：必須、最大10桁
  - koza_meigi：最大50桁
  - biko：テキスト型
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.update` を保持しているか確認する。
  - 対象ロール：NICHINO_STAFF（日農担当者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認

- ログインユーザーのスコープを取得する（ja_id）。

```sql
SELECT * FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 データ更新

```sql
UPDATE m_hanbaiten
SET hanbaiten_name = :hanbaiten_name,
    hanbaiten_name_kana = :hanbaiten_name_kana,
    torihikisaki_no = :torihikisaki_no,
    yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    shocho_name = :shocho_name,
    itaku_kubun = :itaku_kubun,
    haitatsuryo_tanka_id = :haitatsuryo_tanka_id,
    haitatsuryo_shiharai_cycle = :haitatsuryo_shiharai_cycle,
    tesuryo_kubun = :tesuryo_kubun,
    tesuryo_amount = :tesuryo_amount,
    bank_code = :bank_code,
    bank_name = :bank_name,
    bank_branch_code = :bank_branch_code,
    bank_branch_name = :bank_branch_name,
    yokin_shubetsu = :yokin_shubetsu,
    koza_no = :koza_no,
    koza_meigi = :koza_meigi,
    biko = :biko,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
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
        '販売店情報登録画面 (ACSMS-SCR-017)', 'UPDATE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：更新前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "biko": "特別な対応なし"
}
```

**after_value 例:**

```json
 `after_value`：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A改定",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 600.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "biko": "更新しました"
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
        '販売店情報登録画面 (ACSMS-SCR-017)', 'UPDATE', 2,
        :hanbaiten_id, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
