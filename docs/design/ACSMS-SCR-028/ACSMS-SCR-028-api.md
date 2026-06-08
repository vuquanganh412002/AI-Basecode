---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-028
screen_name: 増減連絡票（販売店）出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-31
created_date: 2026/05/31
created_by: Nguyen Truong An
updated_date: 2026/05/31
updated_by: Nguyen Truong An
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者           | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/31 | 1.0  | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「増減連絡票（販売店）出力画面（ACSMS-SCR-028）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

本画面は、指定した適用日における購読者の増減（増部・減部）および住所変更を、販売店＋管理支店の組み合わせ単位で集計し、
画面上にプレビュー表示（API-028-002）し、また電子帳票（PDF）として生成・S3保存（API-028-003）する機能を提供する。
画面初期表示時には、出力条件として選択可能な販売店・管理支店の一覧（API-028-001）を取得する。

## 関連資料

| No  | 資料コード    | 資料名                                   |
| --- | ------------- | ---------------------------------------- |
| 1   | ACSMS-SCR-029 | 増減通知（日本農業新聞）出力画面 API設計書 |

※ 本画面の出力条件（販売店・管理支店チェックボックス）は、廃店除外・JA管理支店の自支店限定など
本画面固有の絞り込みを必要とするため、共用API（ACSMS-API-COMMON-004 / COMMON-007）は使用せず、
専用の出力条件取得API（ACSMS-API-028-001）を定義する。

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
| 8   | 画面固有     | NO_TARGET_DATA        | 対象のデータが存在しません。                                           | HTTP 404 |

※ 日農 管理者 / 日農 担当者（NICHINO_ADMIN / NICHINO_STAFF）は `report.export_zougen_hanbaiten` 権限を保持しないため、
本画面の各APIは HTTP 403 (`FORBIDDEN`) を返却する。画面側は ACSMS-MSG-028-001「この機能はJAアカウントのみ使用できます。」を表示する。

---

# API ACSMS-API-028-001

## 概要

| 項目                   | 内容                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Zougen Hanbaiten Report Filter Options                                                                                                                   |
| 概要                   | 増減連絡票（販売店）出力画面の出力条件（販売店・管理支店のチェックボックス一覧）を取得する。画面初期表示時に1回呼び出す。                                       |
| URI                    | /api/v1/reports/zougen-hanbaiten/filter-options                                                                                                              |
| メソッド               | GET                                                                                                                                                          |
| リクエストボディー     | なし                                                                                                                                                         |
| リクエストパラメーター | なし                                                                                                                                                         |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                         |
| HTTPレスポンスコード   | 200:正常に出力条件を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

なし（ログインユーザーのDataScopeに基づき自動的に絞り込む）。

## レスポンスデータ

| #   | 項目ID              | タイプ | 繰り返し | フォーマット | Nullable | 説明                             |
| --- | ------------------- | ------ | -------- | ------------ | -------- | -------------------------------- |
| 1   | data                | Object | -        |              | -        | 出力条件オブジェクト             |
| 2   | →hanbaiten          | Array  | ○        |              | -        | 販売店チェックボックス一覧       |
| 3   | →→hanbaiten_id      | Number | -        |              | -        | 販売店ID                         |
| 4   | →→hanbaiten_code    | String | -        |              | -        | 販売店コード                     |
| 5   | →→hanbaiten_name    | String | -        |              | -        | 販売店名                         |
| 6   | →kanri_shiten       | Array  | ○        |              | -        | 管理支店チェックボックス一覧     |
| 7   | →→kanri_shiten_id   | Number | -        |              | -        | 管理支店ID                       |
| 8   | →→kanri_shiten_code | String | -        |              | -        | 管理支店コード                   |
| 9   | →→kanri_shiten_name | String | -        |              | -        | 管理支店名称                     |

## リクエスト例

```
GET /api/v1/reports/zougen-hanbaiten/filter-options
```

## レスポンス成功例

```json
{
  "data": {
    "hanbaiten": [
      { "hanbaiten_id": 200, "hanbaiten_code": "H001", "hanbaiten_name": "A新聞店" },
      { "hanbaiten_id": 201, "hanbaiten_code": "H002", "hanbaiten_name": "B新聞店" },
      { "hanbaiten_id": 202, "hanbaiten_code": "H003", "hanbaiten_name": "C新聞店" }
    ],
    "kanri_shiten": [
      { "kanri_shiten_id": 20, "kanri_shiten_code": "113-5001-001", "kanri_shiten_name": "A支所" },
      { "kanri_shiten_id": 21, "kanri_shiten_code": "113-5001-002", "kanri_shiten_name": "B支所" }
    ]
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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- リクエストパラメータなし。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会） / JA_HONTEN（JA本店） / JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため、この時点で 403 となる（画面は ACSMS-MSG-028-001 を表示）。
- DataScope:
  - 中央会：自中央会配下のJAに紐づくデータ（`ja_id IN (中央会配下のJA一覧)`）
  - JA本店：自JAのデータ（`ja_id = :user_ja_id`）
  - JA管理支店：自JAのデータ かつ 自管理支店のみ（`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 販売店一覧の取得

- 廃店（`haiten_flg = true`）の販売店、および電子版ダミー販売店は除外する。
- DataScope条件を付与する。

```sql
SELECT h.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name
FROM m_hanbaiten h
WHERE h.deleted_at IS NULL
  AND h.haiten_flg = false
  /* DataScope（中央会：ja_id IN(...), JA本店/JA管理支店：ja_id = :user_ja_id） */
  AND h.ja_id = :user_ja_id
ORDER BY h.hanbaiten_code ASC
```

### 4.4 管理支店一覧の取得

- JA管理支店ロールの場合は、自アカウントの `kanri_shiten_id` のみを取得する。

```sql
SELECT ks.kanri_shiten_id, ks.kanri_shiten_code, ks.kanri_shiten_name
FROM m_kanri_shiten ks
WHERE ks.deleted_at IS NULL
  /* DataScope（中央会：ja_id IN(...), JA本店：ja_id = :user_ja_id） */
  AND ks.ja_id = :user_ja_id
  /* JA管理支店ロールのみ付与 */
  AND (:user_kanri_shiten_id IS NULL OR ks.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY ks.kanri_shiten_code ASC
```

### 4.5 レスポンス生成

- `hanbaiten` 配列・`kanri_shiten` 配列を含む data オブジェクトを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-028-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Zougen Hanbaiten Report Preview                                                                                                                                                                         |
| 概要                   | 指定した適用日・販売店・管理支店の条件で、増部／減部／住所変更のデータを抽出し、販売店＋管理支店の組み合わせ単位（帳票単位）でグループ化してプレビュー表示用データを取得する。                                  |
| URI                    | /api/v1/reports/zougen-hanbaiten/preview                                                                                                                                                                   |
| メソッド               | GET                                                                                                                                                                                                         |
| リクエストボディー     | なし                                                                                                                                                                                                        |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                            |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------- |
| 1   | tekiyo_date       | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。`t_dokusya_rireki.joho_henko_tekiyo_date` と一致するデータを抽出。未入力の場合 ACSMS-MSG-028-004 |
| 2   | hanbaiten_ids     | String | -        | -    |        |        | 販売店ID（カンマ区切り。例:`200,201`）。未指定の場合はDataScope内の全販売店を対象 |
| 3   | kanri_shiten_ids  | String | -        | -    |        |        | 管理支店ID（カンマ区切り。例:`20,21`）。未指定の場合はDataScope内の全管理支店を対象 |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                       |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ---------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | プレビューデータ                                           |
| 2   | →tekiyo_date                 | String  | -        | YYYY-MM-DD   | -        | 適用日                                                     |
| 3   | →total_pages                 | Number  | -        |              | -        | 帳票総数（販売店＋管理支店の組み合わせ数）                 |
| 4   | →reports                     | Array   | ○        |              | -        | 帳票一覧（販売店コード昇順）。1要素 = 1帳票               |
| 5   | →→page_no                    | Number  | -        |              | -        | ページ番号（1始まり）                                      |
| 6   | →→hanbaiten_id               | Number  | -        |              | -        | 販売店ID                                                   |
| 7   | →→hanbaiten_code             | String  | -        |              | -        | 販売店コード                                               |
| 8   | →→hanbaiten_name             | String  | -        |              | -        | 販売店名（帳票宛先「〇〇〇 新聞販売店 御中」）             |
| 9   | →→hanbaiten_tel              | String  | -        |              | -        | 販売店電話番号（空欄は `""`）                              |
| 10  | →→hanbaiten_fax              | String  | -        |              | -        | 販売店FAX番号（空欄は `""`）                               |
| 11  | →→kanri_shiten_id            | Number  | -        |              | -        | 管理支店ID                                                 |
| 12  | →→kanri_shiten_name          | String  | -        |              | -        | 管理支店名称                                               |
| 13  | →→ja_name                    | String  | -        |              | -        | JA名称（帳票発信者「JA〇〇 + 管理支店」）                 |
| 14  | →→tanto_name                 | String  | -        |              | -        | 担当者名（m_ja.tanto_name、空欄は `""`）                  |
| 15  | →→tel                        | String  | -        |              | -        | 発信者TEL（管理支店の電話番号 m_kanri_shiten.tel）        |
| 16  | →→fax                        | String  | -        |              | -        | 発信者FAX（管理支店のFAX番号 m_kanri_shiten.fax）         |
| 17  | →→zoubu                      | Array   | ○        |              | -        | 増部データ（`dokusya_busu > zenkai_dokusya_busu`）        |
| 18  | →→→busu                      | String  | -        | {前} → {後}  | -        | 部数（`zenkai_dokusya_busu → dokusya_busu`）              |
| 19  | →→→address                   | String  | -        |              | -        | 配達先住所（都道府県名＋市町村郡＋丁目番地＋建物名）      |
| 20  | →→→name                      | String  | -        |              | -        | 新規氏名（`shimei_sei` ＋ `shimei_mei`）                  |
| 21  | →→→delivery_name             | String  | -        |              | -        | 配達先読者名（`haitatsu_shimei_sei` ＋ `haitatsu_shimei_mei`、空欄は `""`） |
| 22  | →→→phone                     | String  | -        |              | -        | 電話番号（`haitatsu_renrakusaki_1`、空欄は `""`）         |
| 23  | →→→biko                      | String  | -        |              | -        | 備考（帳票上での手入力欄。初期値 `""`）                   |
| 24  | →→genbu                      | Array   | ○        |              | -        | 減部データ（`dokusya_busu < zenkai_dokusya_busu`）        |
| 25  | →→→busu                      | String  | -        | {前} → {後}  | -        | 部数（`zenkai_dokusya_busu → dokusya_busu`）              |
| 26  | →→→address                   | String  | -        |              | -        | 配達先住所                                                 |
| 27  | →→→name                      | String  | -        |              | -        | 中止氏名（`shimei_sei` ＋ `shimei_mei`）                  |
| 28  | →→→delivery_name             | String  | -        |              | -        | 配達先読者名（空欄は `""`）                               |
| 29  | →→→phone                     | String  | -        |              | -        | 電話番号（空欄は `""`）                                   |
| 30  | →→→biko                      | String  | -        |              | -        | 備考（手入力欄。初期値 `""`）                             |
| 31  | →→address_change             | Array   | ○        |              | -        | 住所変更データ（前回配達先住所 ≠ 現配達先住所）           |
| 32  | →→→name                      | String  | -        |              | -        | 氏名（`shimei_sei` ＋ `shimei_mei`）                      |
| 33  | →→→delivery_name             | String  | -        |              | -        | 配達先読者名（空欄は `""`）                               |
| 34  | →→→phone                     | String  | -        |              | -        | 電話番号（空欄は `""`）                                   |
| 35  | →→→before_address            | String  | -        |              | -        | 変更前住所（前回配達先住所 `zenkai_*`）                   |
| 36  | →→→after_address             | String  | -        |              | -        | 変更後住所（現配達先住所 `haitatsu_*`）                   |
| 37  | →→→biko                      | String  | -        |              | -        | 備考（手入力欄。初期値 `""`）                             |

## リクエスト例

```
GET /api/v1/reports/zougen-hanbaiten/preview?tekiyo_date=2026-04-01&hanbaiten_ids=200,201&kanri_shiten_ids=20
```

## レスポンス成功例

```json
{
  "data": {
    "tekiyo_date": "2026-04-01",
    "total_pages": 1,
    "reports": [
      {
        "page_no": 1,
        "hanbaiten_id": 200,
        "hanbaiten_code": "H001",
        "hanbaiten_name": "A新聞店",
        "hanbaiten_tel": "09999999999",
        "hanbaiten_fax": "09999999999",
        "kanri_shiten_id": 20,
        "kanri_shiten_name": "A支所",
        "ja_name": "JA東京中央",
        "tanto_name": "農協太郎",
        "tel": "09999999999",
        "fax": "09999999999",
        "zoubu": [
          {
            "busu": "1 → 3",
            "address": "東京都千代田区丸の内1-1-1",
            "name": "農協太郎",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          },
          {
            "busu": "0 → 1",
            "address": "東京都千代田区大手町2-2-2",
            "name": "農協花子",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          }
        ],
        "genbu": [
          {
            "busu": "3 → 2",
            "address": "東京都千代田区神田3-3-3",
            "name": "農協次郎",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          }
        ],
        "address_change": [
          {
            "name": "農協A郎",
            "delivery_name": "",
            "phone": "9999999999",
            "before_address": "東京都千代田区A町1-1",
            "after_address": "東京都千代田区B町2-2",
            "biko": ""
          }
        ]
      }
    ]
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" }
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

### 403 Forbidden（DataScope違反）

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found（対象データなし）

```json
{
  "error_code": "NO_TARGET_DATA",
  "message": "対象のデータが存在しません。"
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

- クエリパラメータの検証：
  - tekiyo_date：必須、日付形式（YYYY-MM-DD）。未入力の場合：HTTP 400 (`VALIDATION_ERROR`)、メッセージ「必須項目です。」（ACSMS-MSG-028-004）
  - hanbaiten_ids：任意、カンマ区切りの数値列。各要素が数値型であること
  - kanri_shiten_ids：任意、カンマ区切りの数値列。各要素が数値型であること
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会） / JA_HONTEN（JA本店） / JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（NICHINO_ADMIN / NICHINO_STAFF はここで 403。画面は ACSMS-MSG-028-001 を表示）
- DataScope:
  - 中央会：自中央会配下のJAに属するデータ（`ja_id IN (中央会配下のJA一覧)`）
  - JA本店：自JAのデータ（`ja_id = :user_ja_id`）
  - JA管理支店：自JAのデータ かつ 自管理支店のみ（`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`）
- 指定された `hanbaiten_ids` / `kanri_shiten_ids` がDataScope外のレコードを含む場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- 抽出条件：
  - `joho_henko_tekiyo_date = :tekiyo_date`（適用日一致）
  - `zougen_hokoku_flg = true`（増減報告フラグ）
  - DataScope条件（上記）
  - `hanbaiten_ids` 指定時：`hanbaiten_id IN (:hanbaiten_ids)`。未指定時は絞り込まない（全販売店）
  - `kanri_shiten_ids` 指定時：`kanri_shiten_id IN (:kanri_shiten_ids)`。未指定時は絞り込まない（全管理支店）
- 配達先住所の都道府県名は `m_todofuken` を `haitatsu_todofuken_code` で結合して取得する。

### 4.4 データ取得

```sql
SELECT
  r.dokusya_rireki_id,
  r.dokusya_id,
  r.hanbaiten_id,
  h.hanbaiten_code,
  h.hanbaiten_name,
  h.tel  AS hanbaiten_tel,
  h.fax  AS hanbaiten_fax,
  r.kanri_shiten_id,
  ks.kanri_shiten_name,
  ks.tel AS kanri_shiten_tel,
  ks.fax AS kanri_shiten_fax,
  j.ja_name,
  j.tanto_name,
  r.dokusya_busu,
  r.zenkai_dokusya_busu,
  r.shimei_sei,
  r.shimei_mei,
  r.haitatsu_shimei_sei,
  r.haitatsu_shimei_mei,
  r.haitatsu_renrakusaki_1,
  td.todofuken_name AS haitatsu_todofuken_name,
  r.haitatsu_shikuchoson,
  r.haitatsu_chome_banchi,
  r.haitatsu_tatemono_mei,
  ztd.todofuken_name AS zenkai_todofuken_name,
  r.zenkai_shikuchoson,
  r.zenkai_chome_banchi,
  r.zenkai_tatemono_mei
FROM t_dokusya_rireki r
INNER JOIN m_hanbaiten h
  ON h.hanbaiten_id = r.hanbaiten_id
  AND h.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
  ON ks.kanri_shiten_id = r.kanri_shiten_id
  AND ks.deleted_at IS NULL
INNER JOIN m_ja j
  ON j.ja_id = r.ja_id
  AND j.deleted_at IS NULL
LEFT JOIN m_todofuken td
  ON td.todofuken_code = r.haitatsu_todofuken_code
LEFT JOIN m_todofuken ztd
  ON ztd.todofuken_code = r.zenkai_todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  /* DataScope */
  AND r.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
  /* 出力条件（未指定時は条件を付与しない） */
  AND (:hanbaiten_ids IS NULL OR r.hanbaiten_id = ANY(:hanbaiten_ids))
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
ORDER BY h.hanbaiten_code ASC, ks.kanri_shiten_code ASC
```

- 取得件数が0件の場合：HTTP 404 (`NO_TARGET_DATA`)、メッセージ「対象のデータが存在しません。」（ACSMS-MSG-028-002）

### 4.5 グループ化・振り分け

- 取得レコードを `hanbaiten_id + kanri_shiten_id` の組み合わせでグループ化する（1グループ = 1帳票 = 1ページ）。
- 帳票は販売店コードの昇順、同一販売店内は管理支店コードの昇順で並べる。`page_no` を1始まりで採番し、`total_pages` をグループ総数とする。
- 各グループ内で、各レコードを以下の条件で各テーブルに振り分ける（同一レコードが増部／減部と住所変更の双方に該当しうる）：
  - 増部（zoubu）：`dokusya_busu > zenkai_dokusya_busu`
  - 減部（genbu）：`dokusya_busu < zenkai_dokusya_busu`
  - 住所変更（address_change）：前回配達先住所（`zenkai_*`）と現配達先住所（`haitatsu_*`）が異なる
- 並び順：①増部を昇順で表示 → ②減部を表示 → ③住所変更を表示。各カテゴリが0件の場合はタイトルと空行のみ表示する（FE側でレンダリング）。
- 整形：
  - `busu`：`{zenkai_dokusya_busu} → {dokusya_busu}` 形式の文字列
  - `address` / `before_address` / `after_address`：都道府県名＋市町村郡＋丁目番地＋建物名を連結
  - `name`：`shimei_sei` ＋ `shimei_mei`
  - `delivery_name`：`haitatsu_shimei_sei` ＋ `haitatsu_shimei_mei`
  - `phone`：`haitatsu_renrakusaki_1`
  - `biko`：常に `""`（帳票上の手入力欄。データソースなし）
  - `tel` / `fax`（発信者）：管理支店（`m_kanri_shiten`）の値を使用する

### 4.6 レスポンス生成

- グループ化・整形済みのデータを data オブジェクトとして返却する。HTTP 200。
- ※ 本APIは参照系（GET）のため操作ログ（t_log）は記録しない。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（ACSMS-MSG-028-003）

---

# API ACSMS-API-028-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Zougen Hanbaiten Report (PDF)                                                                                                                                                                                             |
| 概要                   | 指定した条件で増減連絡票（販売店）を電子帳票（PDF）として生成し、S3に保存する。ダウンロード履歴（t_file_download）を登録し、操作ログ（t_log）を記録する。                                                                          |
| URI                    | /api/v1/reports/zougen-hanbaiten/export                                                                                                                                                                                          |
| メソッド               | POST                                                                                                                                                                                                                            |
| リクエストボディー     | JSON                                                                                                                                                                                                                            |
| リクエストパラメーター |                                                                                                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                            |
| HTTPレスポンスコード   | 201:正常に電子帳票を作成しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                  |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------------------------------- |
| 1   | tekiyo_date       | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。未入力の場合 ACSMS-MSG-028-004                   |
| 2   | hanbaiten_ids     | Array  | ○        | -    |        |        | 販売店ID配列。未指定の場合はDataScope内の全販売店を対象               |
| 3   | kanri_shiten_ids  | Array  | ○        | -    |        |        | 管理支店ID配列。未指定の場合はDataScope内の全管理支店を対象           |

## レスポンスデータ

| #   | 項目ID            | タイプ | 繰り返し | フォーマット | Nullable | 説明                                       |
| --- | ----------------- | ------ | -------- | ------------ | -------- | ------------------------------------------ |
| 1   | data              | Object | -        |              | -        | 作成された電子帳票情報                     |
| 2   | →file_download_id | Number | -        |              | -        | ファイルダウンロードID                     |
| 3   | →file_name        | String | -        |              | -        | ファイル名（増減連絡票_販売店_{YYYY年MM月DD日}.pdf） |
| 4   | →download_type    | Number | -        |              | -        | ダウンロード種別 ※m_code.code_category='DOWNLOAD_TYPE'を参照（3:増減連絡票） |
| 5   | →record_count     | Number | -        |              | -        | 対象レコード件数                           |
| 6   | →file_size        | Number | -        |              | -        | ファイルサイズ（バイト）                   |
| 7   | →download_url     | String | -        |              | -        | ダウンロード用署名付きURL（有効期限1時間） |
| 8   | →created_at       | String | -        | ISO8601      | -        | 作成日時                                   |

## リクエスト例

```json
POST /api/v1/reports/zougen-hanbaiten/export
Content-Type: application/json

{
  "tekiyo_date": "2026-04-01",
  "hanbaiten_ids": [200, 201],
  "kanri_shiten_ids": [20]
}
```

## レスポンス成功例

```json
{
  "data": {
    "file_download_id": 5001,
    "file_name": "増減連絡票_販売店_2026年04月01日.pdf",
    "download_type": 3,
    "record_count": 4,
    "file_size": 245760,
    "download_url": "https://s3.ap-northeast-1.amazonaws.com/agrinews-prod/reports/ja-1/zougen_hanbaiten_20260401_103000.pdf?X-Amz-Signature=...",
    "created_at": "2026-04-01T10:30:00+09:00"
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" }
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

### 403 Forbidden（DataScope違反）

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found（対象データなし）

```json
{
  "error_code": "NO_TARGET_DATA",
  "message": "対象のデータが存在しません。"
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

> ※ 4.5 ダウンロード履歴登録 と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。
> ※ S3へのファイルアップロード（4.4）はトランザクション開始前に完了させ、DB登録が失敗した場合は
> アップロード済みオブジェクトを削除（補償処理）すること。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - tekiyo_date：必須、日付形式（YYYY-MM-DD）。未入力の場合：HTTP 400 (`VALIDATION_ERROR`)、メッセージ「必須項目です。」（ACSMS-MSG-028-004）
  - hanbaiten_ids：任意、数値配列
  - kanri_shiten_ids：任意、数値配列
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会） / JA_HONTEN（JA本店） / JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（NICHINO_ADMIN / NICHINO_STAFF はここで 403。画面は ACSMS-MSG-028-001 を表示）
- DataScope:
  - 中央会：自中央会配下のJAに属するデータ（`ja_id IN (中央会配下のJA一覧)`）
  - JA本店：自JAのデータ（`ja_id = :user_ja_id`）
  - JA管理支店：自JAのデータ かつ 自管理支店のみ（`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`）
- 指定された `hanbaiten_ids` / `kanri_shiten_ids` がDataScope外のレコードを含む場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- API-028-002「4.3 〜 4.5」と同一のロジックでデータを抽出・グループ化・整形する。
- 取得件数が0件の場合：HTTP 404 (`NO_TARGET_DATA`)（ACSMS-MSG-028-002）。ファイルは生成しない。

### 4.4 電子帳票（PDF）生成・S3保存

- グループ化したデータをHandlebarsテンプレート → HTML → Puppeteer で A4・PDF を生成する（1グループ＝1ページ、ヘッダに `Page：現在ページ/全体数`）。
- ファイル名：`増減連絡票_販売店_{YYYY年MM月DD日}.pdf`（`tekiyo_date` に基づく）
- S3に保存する（キー：`reports/ja-{ja_id}/zougen_hanbaiten_{YYYYMMDD_HHmmss}.pdf`）。
- file_size（バイト数）、record_count（対象レコード件数）を保持する。

### 4.5 ダウンロード履歴登録

- 以下のSQLを実行して `t_file_download` に登録する。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size, record_count,
                            target_month, created_at, created_by)
VALUES (:ja_id, NOW(), 3,
        :file_name, :file_path, :file_size, :record_count,
        :target_month, NOW(), :user_account_id)
RETURNING *
```

- `download_type = 3`（増減連絡票 ※m_code.code_category='DOWNLOAD_TYPE'）
- `target_month`：適用日の年月（YYYYMM）を設定する。

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'CREATE', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `log_type = 4`（ファイル操作 ※m_code.code_category='LOG_TYPE'）
- `operation`：`'CREATE'`（帳票ファイルの新規生成）

**after_value 例:**

```json
`before_value`：新規生成のため空文字列を設定する。
`after_value`：登録されたダウンロード履歴をJSON形式で格納する。機密情報は含めないこと。

{
  "file_download_id": 5001,
  "ja_id": 1,
  "download_type": 3,
  "file_name": "増減連絡票_販売店_2026年04月01日.pdf",
  "file_size": 245760,
  "record_count": 4,
  "target_month": "202604"
}
```

### 4.7 レスポンス生成

- S3署名付きURL（有効期限1時間）を生成し、登録された電子帳票情報を data オブジェクトとして返却する。HTTP 201。

### 4.8 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（ACSMS-MSG-028-003）
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。
- S3アップロード済みでDB登録に失敗した場合は、アップロードしたオブジェクトを削除する（補償処理）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'CREATE', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
