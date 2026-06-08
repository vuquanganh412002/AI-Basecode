---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-026
screen_name: 購読者名簿出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-05
created_date: 2026/06/05
created_by: Tran Duc Tuyen
updated_date: 2026/06/05
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/05 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者名簿出力画面（ACSMS-SCR-026）」において、システム上で新規作成されるAPIの詳細を記述した資料です。
本画面は、適用日時点の購読者スナップショットを基に、販売店別または管理支店別の購読者名簿をプレビュー表示し、Excel形式で出力する。

## 関連資料

| No  | 資料コード           | 資料名                                            |
| --- | -------------------- | ------------------------------------------------- |
| 1   | ACSMS-SCR-026        | 購読者名簿出力画面 画面設計書                      |
| 2   | ACSMS-API-COMMON-004 | 管理支店プルダウン取得 API（定義元: ACSMS-SCR-024）|
| 3   | ACSMS-API-COMMON-007 | 販売店プルダウン取得 API（定義元: ACSMS-SCR-015） |

※ 本画面の出力条件エリアのプルダウンは以下の共用APIを使用する。新規定義は行わない。

- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 帳票種別 = 管理支店別 のとき使用。DataScope自動適用（JA管理支店は自支店のみ）。
- ACSMS-API-COMMON-007: Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 帳票種別 = 販売店別 のとき使用。電子版ダミー販売店も含めて返却。DataScope自動適用。

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
| 8   | 画面固有     | REPORT_NO_DATA        | 対象のデータが存在しません。                                           | HTTP 404 |

※ 日農 管理者 / 日農 担当者（NICHINO_ADMIN / NICHINO_STAFF）は `report.export_meibo` 権限を保持しないため、両APIとも HTTP 403 (`FORBIDDEN`) を返す。FE はこの場合 ACSMS-MSG-026-001「この機能はJAアカウントのみ使用できます。」を表示する。
※ 出力条件の必須・条件付き必須エラー（適用日未入力 = ACSMS-MSG-026-006、販売店未選択 = ACSMS-MSG-026-002、管理支店未選択 = ACSMS-MSG-026-003）は HTTP 400 (`VALIDATION_ERROR`) の `errors[]` で返す。

---

# API ACSMS-API-026-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Preview Subscriber Meibo Report                                                                                                                                                                                                    |
| 概要                   | 適用日時点の最新スナップショットを基に、販売店別または管理支店別の購読者名簿プレビューデータを取得する。グループ化（小計・合計）済みの構造で返却する。                                                                              |
| URI                    | /api/v1/report/meibo/preview                                                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                                                |
| リクエストボディー     | なし                                                                                                                                                                                                                               |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                  |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID  | タイプ   | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                  |
| --- | --------------- | -------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String   | -        | 〇   |        | 10     | 適用日（YYYY-MM-DD）。各 dokusya_id について `joho_henko_tekiyo_date <= tekiyo_date` の MAX(rireki_no) を対象とする。未入力時 ACSMS-MSG-026-006        |
| 2   | report_type     | String   | -        | 〇   |        |        | 帳票種別。`hanbaiten`: 販売店別購読者名簿（照会用、デフォルト）／`kanri_shiten`: 管理支店別購読者名簿                                                  |
| 3   | hanbaiten_ids   | Number[] | 〇       | △    |        |        | 販売店ID（複数選択可）。`report_type=hanbaiten` のとき必須（1件以上）。未選択時 ACSMS-MSG-026-002                                                      |
| 4   | kanri_shiten_ids| Number[] | 〇       | △    |        |        | 管理支店ID（複数選択可）。`report_type=kanri_shiten` のとき必須（1件以上）。未選択時 ACSMS-MSG-026-003                                                 |
| 5   | dokusya_shubetsu| Number   | -        | -    |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読（紙版＋電子版））。未指定の場合すべて出力                            |
| 6   | shiharai_cycle  | Number   | -        | -    |        |        | 購読料支払サイクル（月数: 1:毎月, 2:隔月, 3:3ヶ月, 6:半年, 12:年払い）。`report_type=kanri_shiten` のときのみ有効。未指定の場合すべて出力              |

## レスポンスデータ

| #   | 項目ID                          | タイプ   | 繰り返し | フォーマット | Nullable | 説明                                                                                              |
| --- | ------------------------------- | -------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                            | Object   | -        |              | -        | プレビューデータ                                                                                  |
| 2   | →report_type                    | String   | -        |              | -        | 帳票種別（`hanbaiten` / `kanri_shiten`）                                                          |
| 3   | →tekiyo_date                    | String   | -        | YYYY-MM-DD   | -        | 適用日                                                                                            |
| 4   | →grand_total_busu               | Number   | -        |              | -        | 全体合計部数                                                                                      |
| 5   | →hanbaiten_groups               | Array    | 〇       |              | -        | 販売店別グループ（`report_type=hanbaiten` のときのみ。それ以外は空配列）                          |
| 6   | →→hanbaiten_id                  | Number   | -        |              | -        | 販売店ID                                                                                          |
| 7   | →→hanbaiten_name                | String   | -        |              | -        | 販売店名                                                                                          |
| 8   | →→total_busu                    | Number   | -        |              | -        | 販売店の合計部数（合計行）                                                                        |
| 9   | →→kanri_shiten_groups           | Array    | 〇       |              | -        | 管理支店別サブグループ                                                                            |
| 10  | →→→kanri_shiten_id              | Number   | -        |              | 〇       | 管理支店ID（未割当の場合 null）                                                                   |
| 11  | →→→kanri_shiten_name            | String   | -        |              | -        | 管理支店名（未割当の場合 `""`）                                                                   |
| 12  | →→→subtotal_busu                | Number   | -        |              | -        | 管理支店の小計部数（小計行）                                                                      |
| 13  | →→→rows                         | Array    | 〇       |              | -        | 購読者明細行（管理支店コード, 購読者ID 順）                                                       |
| 14  | →→→→dokusya_id                  | Number   | -        |              | -        | 購読者ID                                                                                          |
| 15  | →→→→shimei                      | String   | -        |              | -        | 配達先氏名（配達先情報指定がTrueの場合は購読者名を使用）                                          |
| 16  | →→→→shimei_kana                 | String   | -        |              | -        | 配達先氏名かな                                                                                    |
| 17  | →→→→haitatsu_address            | String   | -        | 〒{7}+市町村郡+丁目番地+建物名 | - | 配達先住所（郵便番号+市町村郡+丁目番地+建物名）                                          |
| 18  | →→→→kanri_shiten_name           | String   | -        |              | -        | 管理支店名                                                                                        |
| 19  | →→→→haitatsu_tel                | String   | -        |              | -        | 配達先電話番号（配達先連絡先１、空欄は `""`）                                                     |
| 20  | →→→→dokusya_kaishi_date         | String   | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                        |
| 21  | →→→→dokusya_busu                | Number   | -        |              | -        | 購読部数                                                                                          |
| 22  | →kanri_shiten_groups            | Array    | 〇       |              | -        | 管理支店別グループ（`report_type=kanri_shiten` のときのみ。それ以外は空配列）                     |
| 23  | →→kanri_shiten_id               | Number   | -        |              | 〇       | 管理支店ID（未割当の場合 null）                                                                   |
| 24  | →→kanri_shiten_name             | String   | -        |              | -        | 管理支店名                                                                                        |
| 25  | →→subtotal_busu                 | Number   | -        |              | -        | 管理支店の小計部数（小計行）                                                                      |
| 26  | →→total_busu                    | Number   | -        |              | -        | 管理支店の合計部数（合計行）                                                                      |
| 27  | →→rows                          | Array    | 〇       |              | -        | 購読者明細行（管理支店コード, 購読者ID 順）                                                       |
| 28  | →→→dokusya_id                   | Number   | -        |              | -        | 購読者ID                                                                                          |
| 29  | →→→dokusya_shubetsu             | Number   | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（ラベルはFE側で `useCodesStore().label('DOKUSYA_SHUBETSU', value)` から取得）|
| 30  | →→→shimei                       | String   | -        |              | -        | 購読者名                                                                                          |
| 31  | →→→shimei_kana                  | String   | -        |              | -        | 購読者かな                                                                                        |
| 32  | →→→kumiaiin_code                | String   | -        |              | -        | 組合員コード（空欄は `""`）                                                                       |
| 33  | →→→haitatsu_tel                 | String   | -        |              | -        | 配達先電話番号（配達先連絡先１、空欄は `""`）                                                     |
| 34  | →→→shiten_name                  | String   | -        |              | -        | 支店名（配達担当支店、未割当は `""`）                                                             |
| 35  | →→→haitatsu_address             | String   | -        | 〒{7}+市町村郡+丁目番地+建物名 | - | 配達先住所                                                                              |
| 36  | →→→dokusya_busu                 | Number   | -        |              | -        | 購読部数                                                                                          |
| 37  | →→→shiharai_hoho                | Number   | -        |              | -        | 支払い方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（ラベルはFE側で `useCodesStore().label('SHIHARAI_HOHO', value)` から取得）|
| 38  | →→→dokusya_kaishi_date          | String   | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                        |
| 39  | →→→hanbaiten_name               | String   | -        |              | -        | 配達担当販売店名                                                                                  |

## リクエスト例

```
GET /api/v1/report/meibo/preview?tekiyo_date=2026-04-01&report_type=hanbaiten&hanbaiten_ids=1&hanbaiten_ids=2&dokusya_shubetsu=1
```

## レスポンス成功例

### 販売店別購読者名簿（report_type=hanbaiten）

```json
{
  "data": {
    "report_type": "hanbaiten",
    "tekiyo_date": "2026-04-01",
    "grand_total_busu": 5,
    "hanbaiten_groups": [
      {
        "hanbaiten_id": 1,
        "hanbaiten_name": "東京中央販売店",
        "total_busu": 5,
        "kanri_shiten_groups": [
          {
            "kanri_shiten_id": 10,
            "kanri_shiten_name": "中央管理支店",
            "subtotal_busu": 3,
            "rows": [
              {
                "dokusya_id": 1001,
                "shimei": "農業 太郎",
                "shimei_kana": "ﾉｳｷﾞｮｳ ﾀﾛｳ",
                "haitatsu_address": "〒1000001東京都千代田区千代田1-1サンプルビル101",
                "kanri_shiten_name": "中央管理支店",
                "haitatsu_tel": "03-1234-5678",
                "dokusya_kaishi_date": "2025-04-01",
                "dokusya_busu": 3
              }
            ]
          }
        ]
      }
    ],
    "kanri_shiten_groups": []
  }
}
```

### 管理支店別購読者名簿（report_type=kanri_shiten）

```json
{
  "data": {
    "report_type": "kanri_shiten",
    "tekiyo_date": "2026-04-01",
    "grand_total_busu": 2,
    "hanbaiten_groups": [],
    "kanri_shiten_groups": [
      {
        "kanri_shiten_id": 10,
        "kanri_shiten_name": "中央管理支店",
        "subtotal_busu": 2,
        "total_busu": 2,
        "rows": [
          {
            "dokusya_id": 1001,
            "dokusya_shubetsu": 1,
            "shimei": "農業 太郎",
            "shimei_kana": "ﾉｳｷﾞｮｳ ﾀﾛｳ",
            "kumiaiin_code": "K0001",
            "haitatsu_tel": "03-1234-5678",
            "shiten_name": "千代田支店",
            "haitatsu_address": "〒1000001東京都千代田区千代田1-1サンプルビル101",
            "dokusya_busu": 2,
            "shiharai_hoho": 1,
            "dokusya_kaishi_date": "2025-04-01",
            "hanbaiten_name": "東京中央販売店"
          }
        ]
      }
    ]
  }
}
```

※ 対象データが0件の場合は HTTP 200 で `hanbaiten_groups` / `kanri_shiten_groups` を空配列（`grand_total_busu: 0`）として返す。FE は ACSMS-MSG-026-004「対象のデータが存在しません。」を表示する（プレビューでは404を返さない）。

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" },
    { "field": "hanbaiten_ids", "message": "販売店を1件以上選択してください。" }
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
  - tekiyo_date：必須、有効な日付形式（YYYY-MM-DD）。未入力の場合：`errors[]` に `{ field: "tekiyo_date", message: "必須項目です。" }`（ACSMS-MSG-026-006）
  - report_type：必須、`hanbaiten` または `kanri_shiten`
  - report_type = `hanbaiten` の場合：hanbaiten_ids が1件以上必須。未選択の場合：`{ field: "hanbaiten_ids", message: "販売店を1件以上選択してください。" }`（ACSMS-MSG-026-002）
  - report_type = `kanri_shiten` の場合：kanri_shiten_ids が1件以上必須。未選択の場合：`{ field: "kanri_shiten_ids", message: "管理支店を1件以上選択してください。" }`（ACSMS-MSG-026-003）
  - dokusya_shubetsu：指定時は m_code.code_category='DOKUSYA_SHUBETSU' に存在する値（CodeService で検証）
  - shiharai_cycle：指定時は数値（月数）
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_meibo`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（日農 管理者 / 日農 担当者 は本権限を持たないため403。FE は ACSMS-MSG-026-001 を表示）
- DataScope:
  - CHUOKAI / JA_HONTEN: `ja_id = user.ja_id`
  - JA_KANRI_SHITEN: `ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`
- 指定された hanbaiten_ids / kanri_shiten_ids がスコープ外の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- 各 dokusya_id について `joho_henko_tekiyo_date <= :tekiyo_date` を満たす最大 rireki_no（適用日時点の最新スナップショット）を対象とする。
- 抽出条件：
  - `tetsuzuki_shurui = 1`（新規）のみ。解約（`tetsuzuki_shurui = 0`）は除外
  - dokusya_shubetsu 指定時は該当値で絞込み
  - report_type = `hanbaiten`: `hanbaiten_id IN (:hanbaiten_ids)`
  - report_type = `kanri_shiten`: `kanri_shiten_id IN (:kanri_shiten_ids)` かつ shiharai_cycle 指定時は `dokusyaryo_shiharai_cycle = :shiharai_cycle`
  - DataScope 条件を付与

### 4.4 データ取得

```sql
WITH latest AS (
  SELECT r.*,
         ROW_NUMBER() OVER (
           PARTITION BY r.dokusya_id
           ORDER BY r.rireki_no DESC
         ) AS rn
  FROM t_dokusya_rireki r
  WHERE r.joho_henko_tekiyo_date <= :tekiyo_date
    AND r.ja_id = :ja_id
)
SELECT l.dokusya_id,
       l.dokusya_shubetsu,
       l.shimei_sei, l.shimei_mei,
       l.shimei_kana_sei, l.shimei_kana_mei,
       l.haitatsu_shimei_sei, l.haitatsu_shimei_mei,
       l.haitatsu_shimei_kana_sei, l.haitatsu_shimei_kana_mei,
       l.haitatsu_same_flg,
       l.kumiaiin_code,
       l.haitatsu_yubin_no, l.haitatsu_shikuchoson,
       l.haitatsu_chome_banchi, l.haitatsu_tatemono_mei,
       l.haitatsu_renrakusaki_1,
       l.dokusya_kaishi_date, l.dokusya_busu,
       l.shiharai_hoho, l.dokusyaryo_shiharai_cycle,
       l.kanri_shiten_id, ks.kanri_shiten_name,
       l.shiten_id, s.shiten_name,
       l.hanbaiten_id, h.hanbaiten_name
FROM latest l
JOIN m_hanbaiten h
  ON h.hanbaiten_id = l.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
  ON ks.kanri_shiten_id = l.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s
  ON s.shiten_id = l.shiten_id AND s.deleted_at IS NULL
WHERE l.rn = 1
  AND l.tetsuzuki_shurui = 1
  AND (:dokusya_shubetsu IS NULL OR l.dokusya_shubetsu = :dokusya_shubetsu)
  /* report_type = hanbaiten */
  AND (:hanbaiten_ids IS NULL OR l.hanbaiten_id = ANY(:hanbaiten_ids))
  /* report_type = kanri_shiten */
  AND (:kanri_shiten_ids IS NULL OR l.kanri_shiten_id = ANY(:kanri_shiten_ids))
  AND (:shiharai_cycle IS NULL OR l.dokusyaryo_shiharai_cycle = :shiharai_cycle)
  /* DataScope: JA_KANRI_SHITEN */
  AND (:user_kanri_shiten_id IS NULL OR l.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY
  /* 販売店別: 販売店 → 管理支店コード → 購読者ID */
  /* 管理支店別: 管理支店コード → 購読者ID */
  l.hanbaiten_id, l.kanri_shiten_id, l.dokusya_id
```

### 4.5 レスポンス生成

- 取得結果を report_type に応じてグループ化する。
  - `hanbaiten`: 販売店 → 管理支店 → 購読者 の順でネスト。管理支店ごとに小計（subtotal_busu）、販売店ごとに合計（total_busu）、全体合計（grand_total_busu）を算出。
  - `kanri_shiten`: 管理支店 → 購読者 の順。管理支店ごとに小計・合計、全体合計を算出。
- 配達先氏名・かな：`haitatsu_same_flg = TRUE`（購読者と同じ）の場合は購読者名（shimei_sei + shimei_mei）・かなを使用、それ以外は配達先氏名（haitatsu_shimei_*）を使用。
- haitatsu_address：`〒` + haitatsu_yubin_no + haitatsu_shikuchoson + haitatsu_chome_banchi + haitatsu_tatemono_mei を連結。
- dokusya_shubetsu / shiharai_hoho は m_code の数値コードをそのまま返却し、ラベルはFE側で `useCodesStore().label(...)` から取得する。
- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（FE は ACSMS-MSG-026-005 を表示）

---

# API ACSMS-API-026-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Export Subscriber Meibo Excel                                                                                                                                                                                 |
| 概要                   | プレビューと同一条件で購読者名簿を生成し、Excel形式（.xlsx）でダウンロードする。生成ファイルはS3に保存し、ダウンロード履歴（t_file_download）に記録する。                                                       |
| URI                    | /api/v1/report/meibo/export                                                                                                                                                                                   |
| メソッド               | GET                                                                                                                                                                                                           |
| リクエストボディー     | なし                                                                                                                                                                                                          |
| リクエストパラメーター | クエリパラメータ（ACSMS-API-026-001 と同一）                                                                                                                                                                  |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される。成功時のレスポンスは `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`                                |
| HTTPレスポンスコード   | 200:正常にExcelをダウンロードしました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

ACSMS-API-026-001（Preview）と同一。

| #   | パラメーターID  | タイプ   | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                          |
| --- | --------------- | -------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String   | -        | 〇   |        | 10     | 適用日（YYYY-MM-DD）。ファイル名の対象年月にも使用                                                            |
| 2   | report_type     | String   | -        | 〇   |        |        | 帳票種別（`hanbaiten` / `kanri_shiten`）                                                                     |
| 3   | hanbaiten_ids   | Number[] | 〇       | △    |        |        | 販売店ID（複数選択可）。`report_type=hanbaiten` のとき必須                                                    |
| 4   | kanri_shiten_ids| Number[] | 〇       | △    |        |        | 管理支店ID（複数選択可）。`report_type=kanri_shiten` のとき必須                                               |
| 5   | dokusya_shubetsu| Number   | -        | -    |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）。未指定の場合すべて出力 |
| 6   | shiharai_cycle  | Number   | -        | -    |        |        | 購読料支払サイクル（月数）。`report_type=kanri_shiten` のときのみ有効                                         |

## レスポンスデータ

成功時はExcelバイナリ（添付ファイル）を返却する。JSONボディは返さない。

| 項目                | 内容                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Content-Type        | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet                                    |
| Content-Disposition | attachment; filename="購読者名簿_{YYYY年MM月}.xlsx"（適用日に基づく。例: 購読者名簿_2026年04月.xlsx） |
| シート名            | 購読者名簿                                                                                            |
| データ構成          | プレビューテーブルと同一（小計行・合計行を含む）                                                      |

## リクエスト例

```
GET /api/v1/report/meibo/export?tekiyo_date=2026-04-01&report_type=hanbaiten&hanbaiten_ids=1&hanbaiten_ids=2
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="購読者名簿_2026年04月.xlsx"

（Excelバイナリデータ）
```

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "kanri_shiten_ids", "message": "管理支店を1件以上選択してください。" }]
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
  "error_code": "REPORT_NO_DATA",
  "message": "対象のデータが存在しません"
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

> ※ 4.5 ファイルダウンロード履歴の記録は、S3保存が成功した後に実行する。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- ACSMS-API-026-001 の 4.1 と同一。
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_meibo`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（FE は ACSMS-MSG-026-001 を表示）
- DataScope:
  - CHUOKAI / JA_HONTEN: `ja_id = user.ja_id`
  - JA_KANRI_SHITEN: `ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`
- スコープ外の hanbaiten_ids / kanri_shiten_ids 指定の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- ACSMS-API-026-001 の 4.3 / 4.4 と同一のSQLでデータを取得し、report_type に応じてグループ化（小計・合計を含む）する。
- 取得結果が0件の場合：HTTP 404 (`REPORT_NO_DATA`)（Excelファイルは生成しない。FE は ACSMS-MSG-026-004 を表示）

### 4.4 Excelファイル生成・S3保存

- グループ化済みデータ（小計行・合計行を含む）を Excel（.xlsx）に出力する。
  - シート名：購読者名簿
  - ファイル名：購読者名簿_{YYYY年MM月}.xlsx（適用日 tekiyo_date に基づく）
- 生成した Excel を S3 に保存する（パス：`ja-{ja_id}/report/meibo/...`）。

### 4.5 ファイルダウンロード履歴の記録

- 以下のSQLでダウンロード履歴を記録する（download_type = 5: 購読者名簿）。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 5,
        :file_name, :file_path, :file_size,
        :record_count, :target_month,
        NOW(), :user_account_id)
```

### 4.6 レスポンス生成

- Content-Type / Content-Disposition を設定し、Excelバイナリを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー・S3保存エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（FE は ACSMS-MSG-026-005 を表示）
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者名簿出力画面 (ACSMS-SCR-026)', 'EXPORT', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
