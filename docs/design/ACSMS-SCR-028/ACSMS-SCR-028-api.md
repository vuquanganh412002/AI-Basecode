---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-028
screen_name: 増減連絡票（販売店）出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-01
created_date: 2026/06/01
created_by: Nguyen Truong An
updated_date: 2026/06/01
updated_by: Nguyen Truong An
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者           | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/01 | 1.0  | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

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

本画面は、指定した適用日に購読部数や配達先住所の変更があった購読者を抽出し、
販売店＋管理支店の組み合わせごとに「増部」「減部」「住所変更」の3区分でプレビュー表示、
および電子帳票（PDF）として出力する画面である。日農（NICHINO_ADMIN / NICHINO_STAFF）は
本機能を利用できず、JA系ロール（中央会・JA本店・JA管理支店）のみが利用可能である。

## 関連資料

| No  | 資料コード           | 資料名                                                                              |
| --- | -------------------- | ----------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-007 | Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 定義元: ACSMS-SCR-015    |
| 2   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024 |

※ 本画面の出力条件エリアの2つのチェックボックスは以下の共用APIを使用する（新規APIは作成しない）。

- **販売店チェックボックス**：`ACSMS-API-COMMON-007`（DataScope自動適用）を使用する。
  本画面では廃店（`haiten_flg = true`。電子版ダミー販売店を含む）を除外する必要があるため、
  抽出の正となるプレビュー／出力API（`ACSMS-API-028-001` / `ACSMS-API-028-002`）の
  SQLにて `h.haiten_flg = false` を**サーバ側で強制**する。チェックボックス表示も廃店を除いた一覧とする。
- **管理支店チェックボックス**：`ACSMS-API-COMMON-004`（カスケード絞込み）を呼び出しユーザーの `ja_id` で使用する。
  JA管理支店ロールが自管理支店分のみを対象とする制御は、プレビュー／出力API側のDataScope
  （`r.kanri_shiten_id = :user_kanri_shiten_id`）で**サーバ側で強制**する。

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
| 8   | 画面固有     | NO_REPORT_DATA        | 対象のデータが存在しません。                                           | HTTP 404 |

※ ACSMS-MSG-028-001「この機能はJAアカウントのみ使用できます。」は、画面ルートガード（FE）で
NICHINO_ADMIN / NICHINO_STAFF をブロックする際に表示するメッセージである。API側は権限
`report.export_zougen_hanbaiten` 不所持のため `FORBIDDEN`（HTTP 403）を返す（多層防御）。

※ ACSMS-MSG-028-004「必須項目です。」は、適用日未入力時の `VALIDATION_ERROR`（`errors[].field = "tekiyo_date"`）として返却する。

---

# API ACSMS-API-028-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Zougen Hanbaiten Report Preview                                                                                                                                                                                                  |
| 概要                   | 指定した適用日・販売店・管理支店の条件で増減対象データを抽出し、販売店＋管理支店の組み合わせごとに「増部」「減部」「住所変更」の3区分でプレビューデータを取得する                                                                       |
| URI                    | /api/v1/report/zougen-hanbaiten/preview                                                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                                                                |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                  |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------- |
| 1   | tekiyo_date      | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。`t_dokusya_rireki.joho_henko_tekiyo_date` と一致するレコードを抽出。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-028-004） |
| 2   | hanbaiten_id     | Number | 〇       | -    |        |        | 販売店ID（繰り返し指定可：`hanbaiten_id=200&hanbaiten_id=201`）。未指定の場合は全販売店を対象とする |
| 3   | kanri_shiten_id  | Number | 〇       | -    |        |        | 管理支店ID（繰り返し指定可）。未指定の場合は全管理支店を対象とする                     |

## レスポンスデータ

| #   | 項目ID                  | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                       |
| --- | ----------------------- | ------ | -------- | ------------ | -------- | -------------------------------------------------------------------------- |
| 1   | data                    | Object | -        |              | -        | プレビュー結果                                                             |
| 2   | →tekiyo_date            | String | -        | YYYY-MM-DD   | -        | 適用日（リクエストのエコーバック）                                         |
| 3   | →reports                | Array  | 〇       |              | -        | 販売店＋管理支店の組み合わせごとの帳票データ（販売店コード昇順）            |
| 4   | →→hanbaiten_id          | Number | -        |              | -        | 販売店ID                                                                   |
| 5   | →→hanbaiten_code        | String | -        |              | -        | 販売店コード                                                               |
| 6   | →→hanbaiten_name        | String | -        |              | -        | 販売店名                                                                   |
| 7   | →→kanri_shiten_id       | Number | -        |              | 〇       | 管理支店ID                                                                 |
| 8   | →→kanri_shiten_name     | String | -        |              | 〇       | 管理支店名称                                                               |
| 9   | →→kanri_shiten_tel      | String | -        |              | 〇       | 管理支店電話番号（帳票TEL欄に表示）                                        |
| 10  | →→kanri_shiten_fax      | String | -        |              | 〇       | 管理支店FAX番号（帳票FAX欄に表示）                                         |
| 11  | →→zoubu                 | Array  | 〇       |              | -        | 増部レコード一覧（`dokusya_busu > zenkai_dokusya_busu`）                    |
| 12  | →→→busu                 | String | -        | {前} → {後}  | -        | 部数（前回購読部数→購読部数）                                              |
| 13  | →→→address              | String | -        |              | -        | 配達先住所（都道府県名＋市町村郡＋丁目番地＋建物名）                        |
| 14  | →→→name                 | String | -        |              | -        | 新規氏名（氏名（姓）＋氏名（名））                                         |
| 15  | →→→delivery_name        | String | -        |              | -        | 配達先読者名（配達先氏名（姓）＋配達先氏名（名））                         |
| 16  | →→→phone                | String | -        |              | -        | 電話番号（配達先連絡先１）                                                 |
| 17  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |
| 18  | →→genbu                 | Array  | 〇       |              | -        | 減部レコード一覧（`dokusya_busu < zenkai_dokusya_busu`）                    |
| 19  | →→→busu                 | String | -        | {前} → {後}  | -        | 部数（前回購読部数→購読部数）                                              |
| 20  | →→→address              | String | -        |              | -        | 配達先住所                                                                 |
| 21  | →→→name                 | String | -        |              | -        | 中止氏名（氏名（姓）＋氏名（名））                                         |
| 22  | →→→delivery_name        | String | -        |              | -        | 配達先読者名                                                               |
| 23  | →→→phone                | String | -        |              | -        | 電話番号（配達先連絡先１）                                                 |
| 24  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |
| 25  | →→address_change        | Array  | 〇       |              | -        | 住所変更レコード一覧（前回配達先住所 ≠ 現配達先住所）。1購読者につき2行（変更前／変更後） |
| 26  | →→→label                | String | -        |              | -        | ラベル（`変更前` / `変更後`）                                              |
| 27  | →→→address              | String | -        |              | -        | 住所（変更前＝前回住所、変更後＝現住所）                                   |
| 28  | →→→name                 | String | -        |              | -        | 氏名（氏名（姓）＋氏名（名））                                             |
| 29  | →→→delivery_name        | String | -        |              | -        | 配達先読者名                                                               |
| 30  | →→→phone                | String | -        |              | -        | 電話番号（配達先連絡先１）                                                 |
| 31  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |

## リクエスト例

```
GET /api/v1/report/zougen-hanbaiten/preview?tekiyo_date=2026-05-01&hanbaiten_id=200&hanbaiten_id=201&kanri_shiten_id=20
```

## レスポンス成功例

```json
{
  "data": {
    "tekiyo_date": "2026-05-01",
    "reports": [
      {
        "hanbaiten_id": 200,
        "hanbaiten_code": "H001",
        "hanbaiten_name": "千代田販売店",
        "kanri_shiten_id": 20,
        "kanri_shiten_name": "JA東京中央 本店管理支店",
        "kanri_shiten_tel": "03-1234-5678",
        "kanri_shiten_fax": "03-1234-5679",
        "zoubu": [
          {
            "busu": "1 → 2",
            "address": "東京都千代田区神田1-1-1 神田ビル101",
            "name": "農業 太郎",
            "delivery_name": "農業 太郎",
            "phone": "03-1111-2222",
            "biko": ""
          }
        ],
        "genbu": [
          {
            "busu": "3 → 1",
            "address": "東京都千代田区丸の内2-2-2",
            "name": "新聞 次郎",
            "delivery_name": "新聞 次郎",
            "phone": "03-3333-4444",
            "biko": ""
          }
        ],
        "address_change": [
          {
            "label": "変更前",
            "address": "東京都中央区銀座3-3-3",
            "name": "購読 花子",
            "delivery_name": "購読 花子",
            "phone": "03-5555-6666",
            "biko": ""
          },
          {
            "label": "変更後",
            "address": "東京都港区赤坂4-4-4 赤坂タワー505",
            "name": "購読 花子",
            "delivery_name": "購読 花子",
            "phone": "03-5555-6666",
            "biko": ""
          }
        ]
      }
    ]
  }
}
```

## レスポンス失敗例

### 400 Validation Error（適用日未入力）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

### 404 Not Found（対象データなし）

```json
{
  "error_code": "NO_REPORT_DATA",
  "message": "対象のデータが存在しません。"
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
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-028-004）。有効な日付形式（YYYY-MM-DD）
  - hanbaiten_id：数値型（繰り返し指定可）。未指定可
  - kanri_shiten_id：数値型（繰り返し指定可）。未指定可
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。FE側ルートガードは ACSMS-MSG-028-001 を表示する。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：`r.ja_id = :user_ja_id`（自中央会分のみ）
  - `JA_HONTEN`：`r.ja_id = :user_ja_id`（自JA分のみ）
  - `JA_KANRI_SHITEN`：`r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id`（自管理支店分のみ）
- DataScope違反（他JA・他管理支店のデータへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- 抽出条件を設定する：
  - `r.joho_henko_tekiyo_date = :tekiyo_date`（画面の適用日と一致）
  - `r.zougen_hokoku_flg = true`（増減報告対象の変更）
  - `h.haiten_flg = false`（廃店・電子版ダミー販売店を除外）
  - hanbaiten_id 指定時：`r.hanbaiten_id = ANY(:hanbaiten_ids)`
  - kanri_shiten_id 指定時：`r.kanri_shiten_id = ANY(:kanri_shiten_ids)`
  - DataScope条件（4.2 参照）を追加する。

### 4.4 データ取得

```sql
SELECT r.dokusya_rireki_id,
       r.hanbaiten_id, r.kanri_shiten_id,
       r.dokusya_busu, r.zenkai_dokusya_busu,
       r.shimei_sei, r.shimei_mei,
       r.haitatsu_shimei_sei, r.haitatsu_shimei_mei,
       r.haitatsu_renrakusaki_1,
       /* 現配達先住所 */
       td_now.todofuken_name AS now_todofuken_name,
       r.haitatsu_shikuchoson, r.haitatsu_chome_banchi, r.haitatsu_tatemono_mei,
       /* 前回住所（住所変更判定・変更前表示用） */
       td_zen.todofuken_name AS zen_todofuken_name,
       r.zenkai_shikuchoson, r.zenkai_chome_banchi, r.zenkai_tatemono_mei,
       r.biko,
       h.hanbaiten_code, h.hanbaiten_name,
       ks.kanri_shiten_name, ks.tel AS kanri_shiten_tel, ks.fax AS kanri_shiten_fax
FROM t_dokusya_rireki r
INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
        ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_todofuken td_now
        ON td_now.todofuken_code = r.haitatsu_todofuken_code
LEFT JOIN m_todofuken td_zen
        ON td_zen.todofuken_code = r.zenkai_todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  AND h.haiten_flg = false
  /* 販売店フィルタ（任意） */
  AND (:hanbaiten_ids IS NULL OR r.hanbaiten_id = ANY(:hanbaiten_ids))
  /* 管理支店フィルタ（任意） */
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* DataScope: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN */
  AND r.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY h.hanbaiten_code ASC, r.kanri_shiten_id ASC
```

- 取得件数が0件の場合：HTTP 404 (`NO_REPORT_DATA`)（ACSMS-MSG-028-002「対象のデータが存在しません。」）

### 4.5 レスポンス生成

- 取得レコードを 販売店ID＋管理支店ID の組み合わせでグループ化する（`reports` 配列。販売店コード昇順）。
- 各レコードを以下の条件で各区分に振り分ける：
  - **増部**（`zoubu`）：`dokusya_busu > zenkai_dokusya_busu`
  - **減部**（`genbu`）：`dokusya_busu < zenkai_dokusya_busu`
  - **住所変更**（`address_change`）：前回配達先住所（`zenkai_*`）と現配達先住所（`haitatsu_*`）が異なる場合。1購読者につき `変更前` / `変更後` の2行を生成する。
- 各行の整形：
  - 部数（`busu`）：`"{zenkai_dokusya_busu} → {dokusya_busu}"`
  - 住所：`{todofuken_name}{shikuchoson}{chome_banchi}{tatemono_mei}` を連結（現＝`td_now`、変更前＝`td_zen`＋`zenkai_*`）
  - 氏名（`name`）：`{shimei_sei} {shimei_mei}`
  - 配達先読者名（`delivery_name`）：`{haitatsu_shimei_sei} {haitatsu_shimei_mei}`
  - 電話番号（`phone`）：`haitatsu_renrakusaki_1`
  - TEL / FAX は管理支店（`m_kanri_shiten.tel` / `fax`）の情報を返す。
- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- 本APIは参照のみのため操作ログ（t_log）への記録は行わない。

---

# API ACSMS-API-028-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Zougen Hanbaiten Report (PDF)                                                                                                                                                                                                                                |
| 概要                   | プレビューと同一条件で増減対象データを抽出し、販売店＋管理支店の組み合わせごとに1枚（増部／減部／住所変更）の電子帳票PDFを生成してS3に保存し、ダウンロードを返却する                                                                                                  |
| URI                    | /api/v1/report/zougen-hanbaiten/export                                                                                                                                                                                                                              |
| メソッド               | POST                                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に電子帳票を出力しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                  |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------- |
| 1   | tekiyo_date      | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-028-004）               |
| 2   | hanbaiten_id     | Number | 〇       | -    |        |        | 販売店ID（配列）。未指定の場合は全販売店を対象とする                                   |
| 3   | kanri_shiten_id  | Number | 〇       | -    |        |        | 管理支店ID（配列）。未指定の場合は全管理支店を対象とする                               |

## レスポンスデータ

PDFファイル（`Content-Type: application/pdf`）

### レスポンスヘッダ

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_hanbaiten_YYYYMMDD.pdf"
```

※ ファイル名は適用日に基づく（例：適用日 2026-05-01 → `増減連絡票_販売店_2026年05月01日.pdf`）。
  `Content-Disposition` の `filename` には ASCII 別名（`zougen_hanbaiten_20260501.pdf`）、
  `filename*`（RFC 5987）には日本語名（`増減連絡票_販売店_2026年05月01日.pdf`）を設定する。

### PDFレイアウト

| 区分        | 表示内容                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| ヘッダ      | 販売店名 / 管理支店名 / TEL / FAX（管理支店情報）/ ページ数（`Page: 現在/全体`）|
| 増部テーブル | 部数（前→後）/ 住所 / 新規氏名 / 配達先読者名 / 電話番号 / 備考                 |
| 減部テーブル | 部数（前→後）/ 住所 / 中止氏名 / 配達先読者名 / 電話番号 / 備考                 |
| 住所変更    | ラベル（変更前/変更後）/ 住所 / 氏名 / 配達先読者名 / 電話番号 / 備考（1購読者2行）|

※ 表示順序：①増部を昇順表示 → ②増部が尽きたら減部を表示 → ③減部が尽きたら住所変更を表示。
  いずれかの区分が0件の場合はタイトルと空白行を表示する。販売店＋管理支店の組み合わせごとに改ページする（販売店コード昇順）。

## リクエスト例

```json
POST /api/v1/report/zougen-hanbaiten/export
Content-Type: application/json

{
  "tekiyo_date": "2026-05-01",
  "hanbaiten_id": [200, 201],
  "kanri_shiten_id": [20]
}
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_hanbaiten_20260501.pdf"; filename*=UTF-8''%E5%A2%97%E6%B8%9B%E9%80%A3%E7%B5%A1%E7%A5%A8_%E8%B2%A9%E5%A3%B2%E5%BA%97_2026%E5%B9%B405%E6%9C%8801%E6%97%A5.pdf

（PDFバイナリ）
```

## レスポンス失敗例

### 400 Validation Error（適用日未入力）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

### 404 Not Found（対象データなし）

```json
{
  "error_code": "NO_REPORT_DATA",
  "message": "対象のデータが存在しません。"
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

> ※ 4.5 ダウンロード履歴登録 と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。
> なお、S3へのPDF保存（4.4）は外部I/Oのためトランザクション外で実行し、DB登録（4.5/4.6）の前に完了させる。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-028-004）。有効な日付形式（YYYY-MM-DD）
  - hanbaiten_id：数値配列。未指定可
  - kanri_shiten_id：数値配列。未指定可
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`：`r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id`
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- `ACSMS-API-028-001` の 4.3 / 4.4 と同一の抽出条件・SQLでデータを取得する（`joho_henko_tekiyo_date = :tekiyo_date`、`zougen_hokoku_flg = true`、`h.haiten_flg = false`、DataScope適用）。
- 取得件数が0件の場合：HTTP 404 (`NO_REPORT_DATA`)（ファイルは生成しない。ACSMS-MSG-028-002 を表示）。

### 4.4 PDF生成・S3保存

- 取得レコードを 販売店ID＋管理支店ID の組み合わせでグループ化する（販売店コード昇順）。
- 各組み合わせを1枚として、増部／減部／住所変更の3テーブルを描画する（PDFレイアウト参照）。
- ヘッダにページ数（`Page: 現在ページ/全体ページ数`）、管理支店のTEL / FAXを表示する。
- 出力形式：PDF（A4）。テンプレート（Handlebars）→ HTML → Puppeteer で生成する。
- 生成したPDFをS3に保存する（キー例：`ja-{ja_id}/report/zougen_hanbaiten_{YYYYMMDD}_{timestamp}.pdf`）。
- ファイル名（表示名）：`増減連絡票_販売店_{YYYY年MM月DD日}.pdf`（適用日に基づく）。

### 4.5 ダウンロード履歴登録

- 以下のSQLでダウンロード履歴を登録する。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 3,
        :file_name, :file_path, :file_size,
        :record_count, :target_month,
        NOW(), :user_account_id)
```

- `download_type`：3（増減連絡票 ※m_code.code_category='DOWNLOAD_TYPE' を参照）
- `target_month`：適用日の年月（YYYYMM）
- `record_count`：抽出した対象購読者件数

### 4.6 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'EXPORT_PDF', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：出力条件と件数をJSON形式で格納する。個人情報（氏名・住所等）は含めないこと。

{
  "tekiyo_date": "2026-05-01",
  "hanbaiten_id": [200, 201],
  "kanri_shiten_id": [20],
  "report_count": 1,
  "record_count": 3,
  "file_name": "増減連絡票_販売店_2026年05月01日.pdf"
}
```

### 4.7 レスポンス生成

- 生成したPDFファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="zougen_hanbaiten_YYYYMMDD.pdf"; filename*=UTF-8''{URLエンコードした日本語ファイル名}`

### 4.8 例外処理

- DB接続エラー・PDF生成エラー・S3保存エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'EXPORT_PDF', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
