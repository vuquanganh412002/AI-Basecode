---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-021
screen_name: 配達手数料支払情報出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-22
created_date: 2026/05/22
created_by: Tran Duc Tuyen
updated_date: 2026/05/22
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/22 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「配達手数料支払情報出力画面（ACSMS-SCR-021）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                                |
| --- | ------------- | ------------------------------------- |
| 1   | ACSMS-SCR-021 | 配達手数料支払情報出力画面 設計書    |
| 2   | ACSMS-SCR-022 | ファイルダウンロード画面 設計書       |

※ 本画面で出力した Excel ファイルは S3 に保存され、`t_file_download` テーブルにエクスポート履歴を登録する。ファイルダウンロード画面（ACSMS-SCR-022）から再ダウンロード可能。

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

※ 対象0件は業務エラーではなく「検索成功・結果なし」として扱う。プレビュー・出力とも
HTTP 200 を返し（プレビュー: `data:[]`、出力: `application/json` の `{ data: [] }`）、FE が画面内に
ACSMS-MSG-021-003「該当する支払い情報が存在しません。」を表示する（トーストではない）。
SCR-026 / SCR-028 と方針統一。

---

# API ACSMS-API-021-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Haitatsuryo Preview                                                                                                                                                                                                                                                             |
| 概要                   | 指定された対象年月・配達手数料支払サイクルで、販売店ごとに集計した配達手数料支払情報をプレビューする。t_dokusya（読者）・m_hanbaiten（販売店）・m_tanka（配達手数料単価, tanka_type=2）から都度集計する。データソースは永続化されず、Excel出力前の確認用一覧として返却する。 |
| URI                    | /api/v1/haitatsuryo/preview                                                                                                                                                                                                                                                         |
| メソッド               | GET                                                                                                                                                                                                                                                                                 |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                                |
| リクエストパラメーター | クエリパラメーター（後述）                                                                                                                                                                                                                                                          |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に集計情報を取得しました（対象0件のときは data:[]）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                                       |

## リクエストパラメータ

| #   | パラメーターID              | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                          |
| --- | --------------------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | target_month                | String  | ○    | 10     | 10     | 対象年月日（`YYYY-MM-DD` 形式）。年月単位で集計するため日は任意（月初を推奨）。t_dokusya・m_hanbaiten・m_tanka の当該年月時点のスナップショットで集計する。 |
| 2   | haitatsuryo_shiharai_cycle  | Integer |      | -      | -      | 配達手数料支払サイクル（月数、1〜12）。指定時は `m_hanbaiten.haitatsuryo_shiharai_cycle` で絞込。未指定時は全サイクルを対象。                                |
| 3   | page                        | Integer |      | -      | -      | ページ番号（1始まり）。preview のみ有効。未指定時は 1。                                                       |
| 4   | per_page                    | Integer |      | -      | -      | 1ページ件数（1〜100）。preview のみ有効。未指定時は 20。export は無視し全件出力する。                          |

## レスポンスデータ

| #   | 項目ID                        | タイプ        | フォーマット | Nullable | 説明                                                                                                  |
| --- | ----------------------------- | ------------- | ------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| 1   | data                          | Array<Object> | -            |          | 販売店ごとの集計行配列（0 件時は空配列）                                                              |
| 2   | →target_month                 | String        | YYYYMM       |          | 対象年月（リクエストの `target_month` 年月部分）                                                      |
| 3   | →hanbaiten_id                 | Integer       | -            |          | 販売店 ID（PK）                                                                                       |
| 4   | →hanbaiten_code               | String        | -            |          | 販売店コード                                                                                          |
| 5   | →hanbaiten_name               | String        | -            |          | 販売店名                                                                                              |
| 6   | →total_busu                   | Integer       | -            |          | 当月部数（`SUM(t_dokusya.dokusya_busu)`、販売店単位でグループ化）                                     |
| 7   | →total_kingaku                | Integer       | -            |          | 当月金額（`Σ (dokusya_busu × m_tanka.kingaku_zeikomi)`（内税）または `kingaku_zeinuki`（外税））。税区分は `m_ja.zei_kubun` を参照 |
| 8   | →haitatsuryo_shiharai_cycle   | Integer       | -            | 〇       | 配達手数料支払サイクル（月数、`m_hanbaiten.haitatsuryo_shiharai_cycle`）                              |
| 9   | →bank_code                    | String        | -            |          | 金融機関コード（`m_hanbaiten.bank_code`、半角数字 4 桁）※空文字許容                                   |
| 10  | →bank_name                    | String        | -            |          | 金融機関名（`m_hanbaiten.bank_name`）※空文字許容                                                      |
| 11  | →bank_branch_code             | String        | -            |          | 口座支店コード（`m_hanbaiten.bank_branch_code`、半角数字 3 桁）※空文字許容                            |
| 12  | →bank_branch_name             | String        | -            |          | 口座支店名（`m_hanbaiten.bank_branch_name`）※空文字許容                                               |
| 13  | →yokin_shubetsu               | Integer       | -            | 〇       | 預金種別 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                              |
| 14  | →koza_no                      | String        | -            |          | 口座番号（`m_hanbaiten.koza_no`、半角数字最大 10 桁）※空文字許容                                      |
| 15  | →koza_meigi                   | String        | -            |          | 口座名義（`m_hanbaiten.koza_meigi`、半角カナ最大 50 桁）※空文字許容                                   |
| 16  | →tesuryo                      | Integer       | -            |          | 手数料（配達手数料単価、1部あたり）。税区分で `m_tanka.kingaku_zeikomi`（内税）/`kingaku_zeinuki`（外税）を切替。`当月金額 = 当月部数 × 手数料` |
| 17  | →biko                         | String        | -            |          | 備考（`m_hanbaiten.biko`）※空文字許容                                                                 |
| 18  | meta                          | Object        | -            |          | 集計サマリ＋ページ情報                                                                                |
| 19  | →total                        | Integer       | -            |          | 集計対象の販売店総数（全ページ通算）                                                                  |
| 20  | →page                         | Integer       | -            |          | 現在ページ（1始まり）                                                                                 |
| 21  | →per_page                     | Integer       | -            |          | 1ページ件数                                                                                           |
| 22  | →total_pages                  | Integer       | -            |          | 総ページ数（`ceil(total / per_page)`）                                                                |
| 23  | →grand_total_busu             | Integer       | -            |          | 全販売店合計部数（`Σ total_busu`、全件通算でページ非依存）                                            |
| 24  | →grand_total_kingaku          | Integer       | -            |          | 全販売店合計金額（`Σ total_kingaku`、全件通算でページ非依存）                                         |
| 25  | →zei_kubun                    | Integer       | -            |          | 適用税区分（`m_ja.zei_kubun`、1:内税, 2:外税）— 金額計算に使用した区分                                |

## リクエスト例

```
GET /api/v1/haitatsuryo/preview?target_month=2026-04-01&haitatsuryo_shiharai_cycle=3
```

## レスポンス成功例

```json
{
  "data": [
    {
      "target_month": "202604",
      "hanbaiten_id": 101,
      "hanbaiten_code": "H001",
      "hanbaiten_name": "東京中央販売店",
      "total_busu": 120,
      "total_kingaku": 588000,
      "haitatsuryo_shiharai_cycle": 3,
      "bank_code": "0001",
      "bank_name": "みずほ銀行",
      "bank_branch_code": "001",
      "bank_branch_name": "本店",
      "yokin_shubetsu": 1,
      "koza_no": "1234567",
      "koza_meigi": "ﾄｳｷｮｳﾁｭｳｵｳﾊﾝﾊﾞｲﾃﾝ",
      "biko": ""
    },
    {
      "target_month": "202604",
      "hanbaiten_id": 102,
      "hanbaiten_code": "H002",
      "hanbaiten_name": "北支店販売店",
      "total_busu": 80,
      "total_kingaku": 392000,
      "haitatsuryo_shiharai_cycle": 6,
      "bank_code": "0001",
      "bank_name": "みずほ銀行",
      "bank_branch_code": "002",
      "bank_branch_name": "北支店",
      "yokin_shubetsu": 2,
      "koza_no": "7654321",
      "koza_meigi": "ｷﾀｼﾃﾝﾊﾝﾊﾞｲﾃﾝ",
      "biko": "月末締め"
    }
  ],
  "meta": {
    "total": 2,
    "grand_total_busu": 200,
    "grand_total_kingaku": 980000,
    "zei_kubun": 1
  }
}
```

## レスポンス失敗例

### HTTP 400 — VALIDATION_ERROR

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "target_month", "message": "必須項目です。" }
  ]
}
```

### HTTP 401 — UNAUTHORIZED

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### HTTP 403 — FORBIDDEN

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### HTTP 200 — 対象データなし

対象0件は業務エラーではないため 200 を返す。FE は `data.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-021-003「該当する
支払い情報が存在しません。」を表示する。

```json
{
  "data": [],
  "meta": { "total": 0, "grand_total_busu": 0, "grand_total_kingaku": 0, "zei_kubun": 1 }
}
```

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- `target_month`: 必須、`YYYY-MM-DD` 形式。未指定の場合：HTTP 400 (`VALIDATION_ERROR`)、`{ field: 'target_month', message: '必須項目です。' }`（ACSMS-MSG-021-001）。
- `haitatsuryo_shiharai_cycle`: 任意、整数 1〜12。範囲外の場合：HTTP 400 (`VALIDATION_ERROR`)。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `haitatsuryo.export`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`t_dokusya.ja_id` ベース）:
  - CHUOKAI / JA_HONTEN: `d.ja_id = :user_ja_id`
  - JA_KANRI_SHITEN: `d.ja_id = :user_ja_id AND d.kanri_shiten_id = :user_kanri_shiten_id`
- DataScope 違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 税区分の取得（m_ja）

- ログインユーザーの所属 JA の税区分を取得する。

```sql
SELECT zei_kubun
  FROM m_ja
 WHERE ja_id = :user_ja_id
   AND deleted_at IS NULL
```

- 税区分により金額計算に使用する単価カラムを切替:
  - `zei_kubun = 1`（内税）→ `m_tanka.kingaku_zeikomi`
  - `zei_kubun = 2`（外税）→ `m_tanka.kingaku_zeinuki`

### 4.4 集計データの取得

- 対象年月の最新スナップショットを購読者ごとに特定（変更適用日 DESC、created_at DESC で最上位 1 件）し、販売店単位でグループ化して集計する。

```sql
WITH latest_dokusya AS (
  /* 対象年月時点の最新「新規」レコード（読者ごと） */
  SELECT DISTINCT ON (d.dokusya_id)
         d.dokusya_id,
         d.ja_id,
         d.kanri_shiten_id,
         d.hanbaiten_id,
         d.tanka_id,
         d.dokusya_busu,
         d.tetsuzuki_shurui,
         d.joho_henko_tekiyo_date
    FROM t_dokusya d
   WHERE d.deleted_at IS NULL
     AND d.tetsuzuki_shurui = 1                                    -- 新規のみ
     AND d.joho_henko_tekiyo_date <= DATE_TRUNC('month', :target_month::date) + INTERVAL '1 month' - INTERVAL '1 day'
     /* DataScope */
     AND d.ja_id = :user_ja_id
     AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
   ORDER BY d.dokusya_id,
            d.joho_henko_tekiyo_date DESC,
            d.created_at DESC
)
SELECT TO_CHAR(:target_month::date, 'YYYYMM')        AS target_month,
       h.hanbaiten_id,
       h.hanbaiten_code,
       h.hanbaiten_name,
       SUM(ld.dokusya_busu)                          AS total_busu,
       SUM(ld.dokusya_busu * CASE
            WHEN :zei_kubun = 1 THEN t.kingaku_zeikomi
            ELSE t.kingaku_zeinuki
       END)                                          AS total_kingaku,
       MAX(CASE
            WHEN :zei_kubun = 1 THEN t.kingaku_zeikomi
            ELSE t.kingaku_zeinuki
       END)                                          AS tesuryo,        -- 配達手数料単価（1部）
       h.haitatsuryo_shiharai_cycle,
       h.bank_code,
       h.bank_name,
       h.bank_branch_code,
       h.bank_branch_name,
       h.yokin_shubetsu,
       h.koza_no,
       h.koza_meigi,
       h.biko
  FROM latest_dokusya ld
  INNER JOIN m_hanbaiten h
    ON h.hanbaiten_id = ld.hanbaiten_id
   AND h.deleted_at IS NULL
   AND h.haiten_flg = FALSE                                        -- 廃店除外
  INNER JOIN m_tanka t
    ON t.tanka_id = h.haitatsuryo_tanka_id                         -- 配達手数料単価（FK）
   AND t.tanka_type = 2                                            -- 配達手数料
   AND t.deleted_at IS NULL
 WHERE (:haitatsuryo_shiharai_cycle IS NULL
        OR h.haitatsuryo_shiharai_cycle = :haitatsuryo_shiharai_cycle)
 GROUP BY h.hanbaiten_id,
          h.hanbaiten_code, h.hanbaiten_name,
          h.haitatsuryo_shiharai_cycle,
          h.bank_code, h.bank_name,
          h.bank_branch_code, h.bank_branch_name,
          h.yokin_shubetsu, h.koza_no, h.koza_meigi, h.biko
 ORDER BY h.hanbaiten_code
```

- 取得件数が 0 件の場合：HTTP 200 + `data:[]`（FE が ACSMS-MSG-021-003 を画面内表示）。

### 4.5 レスポンス生成

- 集計結果を `data` 配列にマッピング。
- `meta` には:
  - `total`: 販売店件数
  - `grand_total_busu`: `SUM(total_busu)`
  - `grand_total_kingaku`: `SUM(total_kingaku)`
  - `zei_kubun`: 4.3 で取得した値（FE での「内税／外税」表示用）

### 4.6 例外処理

- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors 配列
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- DataScope 違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- 対象データ 0 件の場合：HTTP 200 + `data:[]`（FE が画面内表示）
- DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-021-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Export Haitatsuryo Excel                                                                                                                                                                                                                                                                                                                   |
| 概要                   | 指定された対象年月・配達手数料支払サイクルで集計した配達手数料支払情報を Excel ファイル（`.xlsx`）に出力し、S3 に保存する。同時に `t_file_download` テーブルにエクスポート履歴を 1 件登録し、操作ログ（`t_log`, `log_type=4`）を記録する。レスポンスはバイナリストリーム。集計ロジックは API-021-001 と同一。 |
| URI                    | /api/v1/haitatsuryo/export                                                                                                                                                                                                                                                                                                                 |
| メソッド               | POST                                                                                                                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                                                                       |
| リクエストパラメーター | リクエストボディ（後述）                                                                                                                                                                                                                                                                                                                   |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                                                                        |
| HTTPレスポンスコード   | 200:正常に Excel ファイルを出力しました（バイナリ応答。対象0件のときは application/json で { data: [] }）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                                                                       |

## リクエストパラメータ

| #   | パラメーターID              | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                                            |
| --- | --------------------------- | ------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | target_month                | String  | ○    | 10     | 10     | 対象年月日（`YYYY-MM-DD` 形式）。API-021-001 と同一意味。                                                       |
| 2   | haitatsuryo_shiharai_cycle  | Integer |      | -      | -      | 配達手数料支払サイクル（月数、1〜12）。API-021-001 と同一意味。                                                 |

## レスポンスデータ

正常時はバイナリストリーム（Excel `.xlsx`）を返却する。JSON ボディは存在しない。レスポンスヘッダで以下を返却する。

| ヘッダ                | 説明                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content-Type          | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`                                                                                            |
| Content-Disposition   | `attachment; filename="haitatsuryo_shiharai_YYYYMM.xlsx"; filename*=UTF-8''配達手数料支払情報出力_{YYYY年MM月}.xlsx`（target_month の年月）                    |
| Content-Length        | Excel ファイルサイズ（バイト）                                                                                                                                |
| Cache-Control         | `no-store`                                                                                                                                                    |

## リクエスト例

```json
POST /api/v1/haitatsuryo/export
Content-Type: application/json

{
  "target_month": "2026-04-01",
  "haitatsuryo_shiharai_cycle": 3
}
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="haitatsuryo_shiharai_202604.xlsx"; filename*=UTF-8''%E9%85%8D%E9%81%94%E6%89%8B%E6%95%B0%E6%96%99%E6%94%AF%E6%89%95%E6%83%85%E5%A0%B1%E5%87%BA%E5%8A%9B_2026%E5%B9%B404%E6%9C%88.xlsx
Content-Length: 18432
Cache-Control: no-store

<binary XLSX stream>
```

ACSMS-MSG-021-004「Excelファイルを出力しました。」は FE 側で 200 受領時に表示する。

## レスポンス失敗例

### HTTP 400 — VALIDATION_ERROR

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "target_month", "message": "必須項目です。" }
  ]
}
```

### HTTP 401 — UNAUTHORIZED

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### HTTP 403 — FORBIDDEN

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### HTTP 200 — 対象データなし

対象0件は業務エラーではないため 200 を返す。FE は `data.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-021-003「該当する
支払い情報が存在しません。」を表示する。

```json
{
  "data": [],
  "meta": { "total": 0, "grand_total_busu": 0, "grand_total_kingaku": 0, "zei_kubun": 1 }
}
```

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

> ※ 4.5 t_file_download 登録 と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。
> S3 保存（4.4 の一部）はトランザクション外で実行する。S3 アップロード成功後に DB 更新を行い、DB 側がロールバックした場合の S3 残骸ファイルは別途バッチでクリーンアップする運用とする。

### 4.1 リクエストのバリデーション

- API-021-001 §4.1 と同一。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `haitatsuryo.export`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI / JA_HONTEN: `d.ja_id = :user_ja_id`
  - JA_KANRI_SHITEN: `d.ja_id = :user_ja_id AND d.kanri_shiten_id = :user_kanri_shiten_id`
- DataScope 違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 集計データの取得

- API-021-001 §4.3 + §4.4 と同一 SQL で集計データを取得する。
- 取得件数が 0 件の場合：HTTP 200 + `application/json` `{ data: [] }`（Excel 出力 / S3 保存 / DB 登録は実行しない。FE が画面内表示）。

### 4.4 Excel 生成・S3 保存（トランザクション外）

- ExcelJS 等で `.xlsx` を生成する。
  - シート名：`配達手数料支払情報`
  - ヘッダ行：対象月 / 販売店コード / 販売店名 / 当月部数 / 当月金額 / 支払サイクル / 金融機関コード / 金融機関名 / 口座支店コード / 口座支店名 / 貯金種目 / 口座番号 / 口座名義 / 備考
  - データ行：4.3 の集計結果を行に展開
  - 合計行（末尾）：「合計」ラベル + `grand_total_busu` + `grand_total_kingaku`
- ファイル名（クライアントダウンロード用）：`配達手数料支払情報出力_{YYYY年MM月}.xlsx`
- ファイル名（S3 保存用）：`haitatsuryo_shiharai_{YYYYMM}_{YYYYMMDDHHmmss}.xlsx`
- 保存先 S3 キー：`{s3_bucket}/delivery_fee/{YYYY}/{MM}/{filename}`（例: `s3://example-bucket/delivery_fee/2026/04/haitatsuryo_shiharai_202604_20260522103000.xlsx`）
- 同一条件で複数回出力された場合でも、ファイルは上書きせず別ファイルとして保存する（タイムスタンプ付き）。
- S3 アップロード失敗時は DB 処理を行わず、HTTP 500 (`INTERNAL_SERVER_ERROR`) を返却する。

### 4.5 t_file_download 登録

```sql
INSERT INTO t_file_download (
    ja_id,
    download_datetime,
    download_type,
    file_name,
    file_path,
    file_size,
    record_count,
    target_month,
    created_at,
    created_by
) VALUES (
    :user_ja_id,                            -- ダウンロード実行者の所属 JA
    NOW(),                                  -- ダウンロード実行日時
    2,                                      -- 2: その他（配達手数料）
    :file_name,                             -- 'haitatsuryo_shiharai_YYYYMM_YYYYMMDDHHmmss.xlsx'
    :s3_file_path,                          -- S3 オブジェクトキー
    :file_size,                             -- バイト数
    :record_count,                          -- 集計後の販売店件数
    TO_CHAR(:target_month::date, 'YYYYMM'), -- 対象年月（YYYYMM）
    NOW(),
    :user_login_id                          -- ダウンロード実行者のログイン ID
)
RETURNING file_download_id
```

### 4.6 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :user_ja_id,
        '配達手数料支払情報出力画面 (ACSMS-SCR-021)', 'CREATE', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        :ip_address, :user_agent)
```

- `log_type = 4`（ファイル操作）。
- `operation = 'CREATE'`（バレ動詞のみ — エンティティ／画面プレフィックス禁止）。
- `before_value`: 空文字（INSERT のため状態変化前なし）。
- `after_value`: エクスポート条件と件数の JSON。

```json
{
  "target_month": "2026-04-01",
  "haitatsuryo_shiharai_cycle": 3,
  "zei_kubun": 1,
  "record_count": 2,
  "grand_total_busu": 200,
  "grand_total_kingaku": 980000,
  "file_name": "haitatsuryo_shiharai_202604_20260522103000.xlsx",
  "s3_file_path": "delivery_fee/2026/04/haitatsuryo_shiharai_202604_20260522103000.xlsx"
}
```

### 4.7 レスポンス生成

- 生成した Excel ファイルをバイナリストリームでクライアントへ送信。
- レスポンスヘッダ:
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="haitatsuryo_shiharai_YYYYMM.xlsx"; filename*=UTF-8''<URL-encoded 配達手数料支払情報出力_YYYY年MM月.xlsx>`
  - `Content-Length: <bytes>`
  - `Cache-Control: no-store`
- HTTP 200。

### 4.8 例外処理

- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors 配列
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- DataScope 違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- 対象データ 0 件の場合：HTTP 200 + `application/json` `{ data: [] }`（Excel 出力 / S3 保存 / DB 登録は実行しない。FE が画面内表示）。
- S3 / DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（ACSMS-MSG-021-002）。
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)
- エラーログ記録（トランザクション外で別途記録）:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :user_ja_id,
        '配達手数料支払情報出力画面 (ACSMS-SCR-021)', 'CREATE', 2,
        NULL, 't_file_download',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
