---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-020
screen_name: 口座振替データ出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-22
created_date: 2026/05/22
created_by: Tran Duc Tuyen
updated_date: 2026/07/16
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/22 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/11 | 1.1  | VTI Japan | プレビュー→金額編集→ファイル作成の2ステップ化。API-020-003（preview）追加。API-020-002 に rows（編集金額）追加＋スコープ再集計の注記。JASTEM は readonly（マスタ書き戻し撤廃）。ダウンロード名 ZENOUTFD（拡張子なし）。 | | |
| 3   | 2026/07/16 | 1.1  | Tran Duc Tuyen | 実装との整合更新：§4.5 の m_ja/m_shiten 書き戻しSQLを撤廃（readonly 反映）、手順を 4.5 t_koza_furikae→4.6 t_file_download→4.7 ログ→4.8 応答→4.9 例外 に再採番。全銀種別を 21→**91**（預金口座振替・固定長120バイト）に修正。応答 Content-Type を text/plain・固定名 ZENOUTFD に統一。集計SQLに shiten_name_kana 追加。t_file_download に scheduled_delete_date / nichino_download_allowed_flg 反映。 | | |
| 4   | 2026/07/16 | 1.1  | Tran Duc Tuyen | 顧客要件（単価失効バッチ運用）反映：集計SQLの単価有効判定を **`active_flg = TRUE` のみ**に変更し、適用期間の日付判定（tekiyo_start/end vs target_month）を撤廃（日付↔active_flg の整合は 0:05 の失効バッチが担保）。出力時に**失効単価参照チェック（error gate）**を追加し、失効単価(active_flg=FALSE)を参照する購読者が居れば HTTP 409 `INACTIVE_TANKA_REFERENCED`（errors[]＝該当購読者）で出力を止める。エラー一覧 #9 追加。 | | |
| 5  | 2026/08/05 | 1.2 | Tran Duc Tuyen | 顧客要件 2026-08（#56600）：集計対象を**紙版(1)と電子版(2)のみ**に限定。電子版は**承認済（denshi_shonin_status = 1）かつ有料（denshi_dokusya_shubetsu = 1）**に限る（未承認・無料は購読料が発生せず引き落とす対象が無いため）。**併読(3)は対象外**。従来は購読種別で一切絞っておらず、併読も無料の電子版も口座引落の対象になり得た。集計SQLと失効単価チェックSQLの双方に条件を追加する — 片方だけだと「引落対象ではない購読者が参照する失効単価でエラーになり出力できない」という不整合が起きるため。 | | |
| 6  | 2026/08/13 | 1.3 | Tran Duc Tuyen | 実装との整合更新（API-020-002）：ダウンロード名を全銀メディア受入名の固定値 `ZENOUTFD` から引落日ベースの説明的名称 `口座振替データ_YYYY年MM月DD日`（拡張子なし、ja_code・タイムスタンプなし）へ変更。t_file_download.file_name（SCR-022再DL名）も同名に統一。応答 Content-Type を `text/plain; charset=Shift_JIS` から **`application/octet-stream`** に変更（拡張子なしファイル名だと text/plain 等の既知タイプではブラウザが `.txt` を自動付与してしまうため）。S3保存名（内部）は従来通り `口座振替データ_{ja_code}_{YYYY}年{MM}月{DD}日_{タイムスタンプ}`（拡張子なし）で一意化。 | | |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「口座振替データ出力画面（ACSMS-SCR-020）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                       |
| --- | ------------- | ---------------------------- |
| 1   | ACSMS-SCR-020 | 口座振替データ出力画面 設計書 |
| 2   | ACSMS-SCR-005 | JAマスタ登録画面 API設計書    |
| 3   | ACSMS-SCR-007 | 支店マスタ登録画面 API設計書  |

※ 本画面の管理支店／支店プルダウンは以下の共用APIを使用する。

- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024
- ACSMS-API-COMMON-006: Get Shiten Dropdown (`GET /api/v1/shiten/dropdown`) — 定義元: ACSMS-SCR-015
- ACSMS-API-COMMON-008: Get Koza Shiten Dropdown (`GET /api/v1/shiten/koza-dropdown`) — 定義元: ACSMS-SCR-020（本資料）

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
| 8   | 画面固有     | NO_TARGET_DATA        | 対象データがありません。                                               | HTTP 404 |
| 9   | 画面固有     | INACTIVE_TANKA_REFERENCED | 失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。 | HTTP 409（`total`＝総該当件数、`errors[]`＝先頭15件の該当購読者。field=dokusya_id） |

---

# API ACSMS-API-020-001

## 概要

| 項目                   | 内容                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Koza Furikae Initial Data                                                                                                                                                 |
| 概要                   | 口座振替データ出力画面の初期表示用データを取得する。ログインユーザーのJASTEM委託者情報（m_ja）と、最後に使用された口座支店のJASTEM金融機関支店情報（m_shiten）を返却する。     |
| URI                    | /api/v1/koza-furikae/initial                                                                                                                                                  |
| メソッド               | GET                                                                                                                                                                           |
| リクエストボディー     | なし                                                                                                                                                                          |
| リクエストパラメーター | なし                                                                                                                                                                          |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                          |
| HTTPレスポンスコード   | 200:正常に初期データを取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました              |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID                          | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                                  |
| --- | ------------------------------- | ------ | -------- | ------------ | -------- | ------------------------------------------------------------------------------------- |
| 1   | data                            | Object | -        |              | -        | 初期データ                                                                            |
| 2   | →ja_id                          | Number | -        |              | -        | ログインユーザーのJA ID                                                               |
| 3   | →jastem_itakusha_code           | String | -        |              |          | JASTEM委託者コード（m_ja.jastem_itakusha_code、空文字許容）                           |
| 4   | →jastem_itakusha_name           | String | -        |              |          | JASTEM委託者名（m_ja.jastem_itakusha_name、空文字許容）                               |
| 5   | →jastem_ja_code                 | String | -        |              |          | JASTEM農協番号（m_ja.jastem_ja_code、空文字許容）                                      |
| 6   | →jastem_ja_name                 | String | -        |              |          | JASTEM農協名（m_ja.jastem_ja_name、空文字許容）                                       |
| 7   | →jastem_toriatsukai_tenpo_code  | String | -        |              |          | JASTEMデータ送信取扱店舗コード（最終使用m_shiten.jastem_toriatsukai_tenpo_code、空文字許容） |
| 8   | →jastem_tenpo_name              | String | -        |              |          | JASTEM店舗名（最終使用m_shiten.jastem_tenpo_name、空文字許容）                        |
| 9   | →jastem_tyokin_shubetsu         | String | -        |              |          | JASTEM貯金種目（"1":普通貯金, "2":当座貯金, "9":その他。デフォルト "1"、空文字許容）  |
| 10  | →jastem_koza_no                 | String | -        |              |          | JASTEM口座番号（最終使用m_shiten.jastem_koza_no、空文字許容）                          |

## リクエスト例

```
GET /api/v1/koza-furikae/initial
```

## レスポンス成功例

```json
{
  "data": {
    "ja_id": 1,
    "jastem_itakusha_code": "1234567890",
    "jastem_itakusha_name": "ニホンノウギョウシンブン",
    "jastem_ja_code": "1234",
    "jastem_ja_name": "ニホンノウギョウ",
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "ホンテン",
    "jastem_tyokin_shubetsu": "1",
    "jastem_koza_no": "1234567"
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

- パラメータなし。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `koza_furikae.export`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: `ja_id = user.ja_id`（NICHINO_ADMIN / NICHINO_STAFF は本APIの権限を保持しないため対象外）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- ログインユーザーのスコープ（ja_id）でm_jaのJASTEM委託者情報を取得する。

```sql
SELECT ja_id,
       jastem_itakusha_code,
       jastem_itakusha_name,
       jastem_ja_code,
       jastem_ja_name
FROM m_ja
WHERE ja_id = :user_ja_id
  AND deleted_at IS NULL
```

- 同一JA内で最終更新（updated_at DESC）の金融機関支店（kinyu_shiten_flg=true）のJASTEM情報を取得する。該当レコードが無い場合は空文字を返す。

```sql
SELECT jastem_toriatsukai_tenpo_code,
       jastem_tenpo_name,
       jastem_tyokin_shubetsu,
       jastem_koza_no
FROM m_shiten
WHERE ja_id = :user_ja_id
  AND kinyu_shiten_flg = TRUE
  AND deleted_at IS NULL
ORDER BY updated_at DESC NULLS LAST,
         created_at DESC
LIMIT 1
```

### 4.4 レスポンス生成

- 上記取得結果を `data` オブジェクトとして返却する。HTTP 200。
- 金融機関支店レコードが取得できなかった場合は、`jastem_toriatsukai_tenpo_code` / `jastem_tenpo_name` / `jastem_koza_no` は空文字を、`jastem_tyokin_shubetsu` は `"1"`（普通貯金、画面デフォルト）を返却する。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-020-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Koza Furikae CSV                                                                                                                                                                                                                                                                                                              |
| 概要                   | 指定された対象年月・引落日・絞込条件で口座振替データ（全銀フォーマット固定長・種別91）を生成・S3に保存し、ダウンロードする。同時に t_koza_furikae にスナップショット（編集金額）を登録する。JASTEM委託者情報（m_ja）／金融機関支店情報（m_shiten）は readonly 表示のみで、出力時にマスタへは書き戻さない（v1.1）。                                                                              |
| URI                    | /api/v1/koza-furikae/export                                                                                                                                                                                                                                                                                                          |
| メソッド               | POST                                                                                                                                                                                                                                                                                                                                  |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                                                                  |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                                                                       |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                                                                  |
| HTTPレスポンスコード   | 200:正常に口座振替データを生成しダウンロードしました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象データがありません, 409:失効単価を参照する購読者が存在します, 500:システムエラーが発生しました                                                                                       |

## リクエストパラメータ

| #   | パラメーターID                | タイプ        | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                          |
| --- | ----------------------------- | ------------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | target_month                  | String        | -        | 〇   | 10     | 10     | 対象年月日（YYYY-MM-DD）。t_dokusya・m_hanbaiten・m_tankaから当該年月で集計する基準日                                          |
| 2   | hikiotoshi_date               | String        | -        | 〇   | 10     | 10     | 引落日（YYYY-MM-DD）。t_koza_furikae.furikae_dateに格納                                                                       |
| 3   | kanri_shiten_ids              | Array<Number> | -        | -    |        |        | 管理支店ID配列（複数選択可、空配列または未指定の場合は全管理支店）。t_dokusya.kanri_shiten_id で絞込                          |
| 4   | shiten_ids                    | Array<Number> | -        | -    |        |        | 支店ID配列（複数選択可、空配列または未指定の場合は全支店）。t_dokusya.shiten_id で絞込                                        |
| 5   | koza_shiten_ids               | Array<Number> | -        | -    |        |        | 口座支店ID配列（m_shiten.kinyu_shiten_flg=TRUE のみ。空配列または未指定の場合は全金融機関支店）                               |
| 6   | jastem_itakusha_code          | String        | -        | 〇   | 1      | 10     | JASTEM委託者コード。半角英数字。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）                              |
| 7   | jastem_itakusha_name          | String        | -        | 〇   | 1      | 40     | JASTEM委託者名。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）                                              |
| 8   | jastem_ja_code                | String        | -        | 〇   | 1      | 4      | JASTEM農協番号。半角数字。（v1.1: readonly 表示・全銀ヘッダ/データに使用、マスタへ書き戻さない）                            |
| 9   | jastem_ja_name                | String        | -        | 〇   | 1      | 15     | JASTEM農協名。（v1.1: readonly 表示・全銀ヘッダ/データに使用、マスタへ書き戻さない）                                        |
| 10  | jastem_toriatsukai_tenpo_code | String        | -        | 〇   | 1      | 3      | JASTEMデータ送信取扱店舗コード。半角数字。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）                    |
| 11  | jastem_tenpo_name             | String        | -        | 〇   | 1      | 15     | JASTEM店舗名。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）                                                |
| 12  | jastem_tyokin_shubetsu        | String        | -        | 〇   | 1      | 1      | JASTEM貯金種目（"1":普通貯金, "2":当座貯金, "9":その他）。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）    |
| 13  | jastem_koza_no                | String        | -        | 〇   | 1      | 7      | JASTEM口座番号。半角数字。（v1.1: readonly 表示・全銀ヘッダに使用、マスタへ書き戻さない）                                    |
| 14  | rows                          | Array<Object> | 1..N     | 〇   |        |        | v1.1: プレビューで確認・編集した振替対象行。要素＝`{ dokusya_id:Number, furikae_kingaku:Number(0〜9,999,999,999) }`。空配列不可 |

> **v1.1 補足**
> - 6〜13 の JASTEM 情報は **readonly 表示のみ**。出力時に m_ja / m_shiten へは書き戻さない（旧版の保存／更新は撤廃）。
> - `rows` の `dokusya_id` は信用しない。サーバはセッションのスコープ（ja_id / kanri_shiten_id）で **再集計**した対象とのみ突合し、その集合にある行だけ金額を上書きする（スコープ外・不正IDは無視）。編集金額は t_koza_furikae にスナップショット保存する（m_tanka は不変）。

## レスポンスデータ

全銀フォーマット固定長テキスト（`Content-Type: application/octet-stream`、1レコード120バイト）

### レスポンスヘッダ

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="________2026_05_27_"; filename*=UTF-8''%E5%8F%A3%E5%BA%A7%E6%8C%AF%E6%9B%BF%E3%83%87%E3%83%BC%E3%82%BF_2026%E5%B9%B405%E6%9C%8827%E6%97%A5
```

> v1.3（2026/08/13）: ダウンロード名は引落日ベースの説明的名称 `口座振替データ_YYYY年MM月DD日`（**拡張子なし**。ja_code・タイムスタンプは含まない）。日本語名は `filename*`（RFC 5987, UTF-8 percent-encode）に、非ASCII文字をアンダースコアへ置換したASCIIフォールバック名を `filename` に設定する（上記例は引落日 2026-05-27 の場合）。t_file_download.file_name（SCR-022再DL名）も同名。Content-Type は `application/octet-stream` 固定（拡張子なしファイル名で text/plain 等の既知タイプだとブラウザが `.txt` を自動付与するため）。S3保存名（内部管理用）は `口座振替データ_{ja_code}_{YYYY}年{MM}月{DD}日_{タイムスタンプ}`（拡張子なし）で一意化する。

### 全銀フォーマット（固定長・1レコード120バイト）

| レコード種別 | 説明                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| ヘッダー     | 1=ヘッダ, 91=預金口座振替, 0=コード区分, 委託者コード, 委託者名, 引落日(MMDD), 取引銀行コード/名, 取扱店舗コード/名, 預金種目, 口座番号 |
| データ       | 2=データ, 引落銀行コード/名, 引落支店コード/名, 預金種目, 口座番号, 預金者名カナ, 引落金額, 新規コード, 顧客番号                                |
| トレーラー   | 8=トレーラ, 合計件数, 合計金額, 振替済件数/金額, 振替不能件数/金額                                                                          |
| エンド       | 9=エンド                                                                                                            |

## リクエスト例

```json
POST /api/v1/koza-furikae/export
Content-Type: application/json

{
  "target_month": "2026-05-01",
  "hikiotoshi_date": "2026-05-27",
  "kanri_shiten_ids": [1, 2],
  "shiten_ids": [],
  "koza_shiten_ids": [10, 11],
  "jastem_itakusha_code": "1234567890",
  "jastem_itakusha_name": "ニホンノウギョウシンブン",
  "jastem_ja_code": "1234",
  "jastem_ja_name": "ニホンノウギョウ",
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tenpo_name": "ホンテン",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "1234567",
  "rows": [
    { "dokusya_id": 1, "furikae_kingaku": 8000 },
    { "dokusya_id": 2, "furikae_kingaku": 4900 }
  ]
}
```

## レスポンス成功例

全銀フォーマット固定長テキスト（Shift_JIS、1レコード120バイト、拡張子なし、ファイル名は引落日ベースの `口座振替データ_YYYY年MM月DD日`）がレスポンスボディとして返却される。

> 下記は各フィールドを可読化のためカンマ区切りで示したイメージ。実ファイルは**区切り文字なしの固定長**（各フィールドはゼロ埋め／スペース埋め）。種別コードは **91**（預金口座振替）、顧客番号は購読者ID（右詰20桁）。

```
1,91,0,1234567890,ﾆﾎﾝﾉｳｷﾞｮｳｼﾝﾌﾞﾝ          ,0527,1234,ﾆﾎﾝﾉｳｷﾞｮｳ      ,001,ﾎﾝﾃﾝ          ,1,1234567,
2,1234,ﾆﾎﾝﾉｳｷﾞｮｳ      ,001,ﾎﾝﾃﾝ          ,1,1234567,ﾔﾏﾀﾞ ﾀﾛｳ            ,0000004900,0,00000000000000000001,0,
2,1234,ﾆﾎﾝﾉｳｷﾞｮｳ      ,002,ｷﾀｼﾃﾝ         ,1,7654321,ｽｽﾞｷ ﾊﾅｺ           ,0000004900,0,00000000000000000002,0,
8,000002,000000009800,000000,000000000000,000000,000000000000,
9,
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "target_month", "message": "必須項目です。" },
    { "field": "hikiotoshi_date", "message": "必須項目です。" },
    { "field": "jastem_itakusha_code", "message": "必須項目です。" }
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

### 404 Not Found（対象データなし）

```json
{
  "error_code": "NO_TARGET_DATA",
  "message": "対象データがありません。"
}
```

### 409 Conflict（失効単価参照）

```json
{
  "error_code": "INACTIVE_TANKA_REFERENCED",
  "message": "失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。",
  "total": 245,
  "errors": [
    { "field": "1", "message": "ﾔﾏﾀﾞ ﾀﾛｳ（単価: T001 旧購読料）" },
    { "field": "5", "message": "ｽｽﾞｷ ﾊﾅｺ（単価: T001 旧購読料）" }
  ]
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

> ※ 4.5 t_koza_furikae 登録（+ ファイルアーカイブ共通サービスによる t_file_download 登録）と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> v1.1: JASTEM委託者情報（m_ja）／金融機関支店情報（m_shiten）への書き戻しは撤廃した（readonly 表示のみ）。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。
> S3保存（4.4の一部）はトランザクション外で実行する。S3アップロード成功後にDB更新を行い、DB側がロールバックした場合の S3 残骸ファイルは別途バッチでクリーンアップする運用とする。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - target_month：必須、有効な日付形式（YYYY-MM-DD）。未指定の場合：HTTP 400 (`VALIDATION_ERROR`)、`{ field: 'target_month', message: '必須項目です。' }`
  - hikiotoshi_date：必須、有効な日付形式（YYYY-MM-DD）。未指定の場合：HTTP 400 (`VALIDATION_ERROR`)、`{ field: 'hikiotoshi_date', message: '必須項目です。' }`
  - kanri_shiten_ids：任意、数値配列
  - shiten_ids：任意、数値配列
  - koza_shiten_ids：任意、数値配列
  - jastem_itakusha_code：必須、半角英数字、最大10桁
  - jastem_itakusha_name：必須、最大40桁
  - jastem_ja_code：必須、半角数字、最大4桁
  - jastem_ja_name：必須、最大15桁
  - jastem_toriatsukai_tenpo_code：必須、半角数字、最大3桁
  - jastem_tenpo_name：必須、最大15桁
  - jastem_tyokin_shubetsu：必須、"1" / "2" / "9" のいずれか
  - jastem_koza_no：必須、半角数字、最大7桁
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `koza_furikae.export`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI / JA_HONTEN：`ja_id = user.ja_id`
  - JA_KANRI_SHITEN：`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`
- 指定された `kanri_shiten_ids` / `shiten_ids` / `koza_shiten_ids` が自JA配下のレコードでない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- JA_KANRI_SHITEN ロールで自管理支店以外の `kanri_shiten_ids` を指定した場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 失効単価チェック（error gate）＋ 対象データの集計・取得

> **単価の有効判定（顧客要件 2026-07）**
> 単価の適用期間（`tekiyo_start_date` / `tekiyo_end_date`）と `active_flg` の整合は、
> 毎日 0:05 に走る**単価失効バッチ**（`tekiyo_end_date < 本日 かつ active_flg=TRUE
> → active_flg=FALSE`）が担保する。したがって本APIの集計では**期間の日付判定は行わず、
> `active_flg = TRUE` のみ**で有効単価を判定する。
> 失効した単価（`active_flg=FALSE`）は「新規に選択できない」だけで、既存購読者は
> 失効単価を参照したまま自動移行しない。そこで**出力時に失効単価参照を検証**し、
> 該当購読者が居ればエラーで出力を止める（運用者が手動で新単価へ変更 → 当日中に再出力）。

**① 失効単価参照チェック（1件でも該当すれば HTTP 409 `INACTIVE_TANKA_REFERENCED` で出力中止）**

- 出力対象の母集合（口座引落・継続・スコープ・画面絞込）のうち、参照単価が
  `active_flg = FALSE` の購読者を抽出する。1件以上あれば出力を止める。
- **大量該当への配慮**: 該当が多数（同一失効単価を多数の購読者が参照）になり得るため、
  `errors[]` は**先頭15件で打ち切り**、`total`（総該当件数・`COUNT(*) OVER()`）を別途返す。
  FE は「該当 N 件中 15 件を表示」と要約し、全件の確認・単価変更は**購読者明細検索画面
  （「失効単価参照」絞込）**へ誘導する（レスポンス肥大・DOM肥大の回避）。

```sql
SELECT d.dokusya_id,
       d.shimei_kana_sei || ' ' || d.shimei_kana_mei AS koza_meigi,
       t.tanka_code,
       t.tanka_name,
       COUNT(*) OVER() AS total_count   -- LIMIT 前の総該当件数（window は LIMIT より先に評価）
  FROM t_dokusya d
  INNER JOIN m_hanbaiten h
    ON h.hanbaiten_id = d.hanbaiten_id
   AND h.deleted_at IS NULL
  INNER JOIN m_tanka t
    ON t.tanka_id = d.tanka_id
   AND t.tanka_type = 1
   AND t.deleted_at IS NULL
   AND t.active_flg = FALSE          -- ← 失効単価のみ
  LEFT JOIN m_shiten s
    ON s.shiten_code = d.bank_branch_code
   AND s.ja_id = d.ja_id
   AND s.kinyu_shiten_flg = TRUE
   AND s.deleted_at IS NULL
 WHERE d.deleted_at IS NULL
   AND d.shiharai_hoho = 1
   AND d.tetsuzuki_shurui = 1
   -- 集計対象は紙版(1)と電子版(2)のみ。電子版は承認済かつ有料に限る（#56600）
   AND ( d.dokusya_shubetsu = 1
      OR (d.dokusya_shubetsu = 2
          AND d.denshi_shonin_status = 1
          AND d.denshi_dokusya_shubetsu = 1) )
   AND d.dokusya_kaishi_date <= :target_month
   AND (d.dokusya_chushi_date IS NULL OR d.dokusya_chushi_date > :target_month)
   AND d.ja_id = :user_ja_id
   AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
   AND (:kanri_shiten_ids IS NULL OR d.kanri_shiten_id = ANY(:kanri_shiten_ids))
   AND (:shiten_ids IS NULL OR d.shiten_id = ANY(:shiten_ids))
   AND (:koza_shiten_ids IS NULL OR s.shiten_id = ANY(:koza_shiten_ids))
 ORDER BY d.kanri_shiten_id, d.shiten_id, d.dokusya_id
 LIMIT 15
```

**② 対象データの集計・取得（① を通過した後に実行）**

- ログインユーザーのスコープを取得する（ja_id、必要に応じて kanri_shiten_id）。
- 対象年月（target_month）と絞込条件で集計対象となる購読者データを取得する。
  有効単価は `active_flg = TRUE` のみで判定する（日付判定はバッチが担保）。

```sql
SELECT d.dokusya_id,
       d.shimei_kana_sei || ' ' || d.shimei_kana_mei AS koza_meigi,
       d.bank_branch_code,
       d.bank_branch_name,
       d.hikiotoshi_yokin_shubetsu,
       d.hikiotoshi_koza_no,
       d.hikiotoshi_koza_meigi,
       d.ja_id,
       d.kanri_shiten_id,
       d.shiten_id,
       t.kingaku_zeikomi AS furikae_kingaku,
       s.shiten_id AS koza_shiten_id,
       s.shiten_code AS bank_branch_code_master,
       s.shiten_name AS bank_branch_name_master,
       s.shiten_name_kana AS bank_branch_name_kana  /* 全銀データレコードの引落支店名（カナ）用 */
  FROM t_dokusya d
  INNER JOIN m_hanbaiten h
    ON h.hanbaiten_id = d.hanbaiten_id
   AND h.deleted_at IS NULL
  INNER JOIN m_tanka t
    ON t.tanka_id = d.tanka_id
   AND t.tanka_type = 1
   AND t.deleted_at IS NULL
   AND t.active_flg = TRUE          -- ← 有効単価のみ（日付判定は失効バッチが担保）
  LEFT JOIN m_shiten s
    ON s.shiten_code = d.bank_branch_code
   AND s.ja_id = d.ja_id
   AND s.kinyu_shiten_flg = TRUE
   AND s.deleted_at IS NULL
 WHERE d.deleted_at IS NULL
   AND d.shiharai_hoho = 1
   AND d.tetsuzuki_shurui = 1
   -- 集計対象は紙版(1)と電子版(2)のみ。電子版は承認済かつ有料に限る（#56600）
   AND ( d.dokusya_shubetsu = 1
      OR (d.dokusya_shubetsu = 2
          AND d.denshi_shonin_status = 1
          AND d.denshi_dokusya_shubetsu = 1) )
   AND d.dokusya_kaishi_date <= :target_month
   AND (d.dokusya_chushi_date IS NULL OR d.dokusya_chushi_date > :target_month)
   /* DataScope */
   AND d.ja_id = :user_ja_id
   /* JA_KANRI_SHITEN の場合 */
   AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
   /* 画面の絞込条件 */
   AND (:kanri_shiten_ids IS NULL OR d.kanri_shiten_id = ANY(:kanri_shiten_ids))
   AND (:shiten_ids IS NULL OR d.shiten_id = ANY(:shiten_ids))
   AND (:koza_shiten_ids IS NULL OR s.shiten_id = ANY(:koza_shiten_ids))
 ORDER BY d.kanri_shiten_id, d.shiten_id, d.dokusya_id
```

- 取得件数が 0 件の場合：HTTP 404 (`NO_TARGET_DATA`)

### 4.4 全銀フォーマット生成・S3保存

- 全銀フォーマット（**固定長テキスト・1レコード120バイト**、Shift_JIS、CRLF）に整形する。**CSV ではない。**
  - ヘッダーレコード（1=ヘッダ）：データ区分(1)、**種別コード(91=預金口座振替)**、コード区分(0)、委託者コード(10)、委託者名（半角カナ40桁、左詰）、引落日(MMDD)、取引銀行番号(4)、取引銀行名（半角カナ15桁）、取引支店番号(3)、取引支店名（半角カナ15桁）、預金種目(1)、口座番号(7)
  - データレコード（2=データ）：1件につき1レコード、引落銀行番号/名、引落支店番号/名（半角カナ15桁）、預金種目、口座番号、預金者名（半角カナ30桁）、引落金額、新規コード、顧客番号（dokusya_id・右詰20桁）
  - トレーラーレコード（8=トレーラ）：合計件数、合計金額、振替済件数/金額(0)、振替不能件数/金額(0)
  - エンドレコード（9=エンド）
- v1.3（2026/08/13）: ダウンロード名（＝t_file_download.file_name）は引落日ベースの**説明的名称 `口座振替データ_YYYY年MM月DD日`（拡張子なし、ja_code・タイムスタンプなし）**。旧版の全銀メディア受入名固定値 `ZENOUTFD` は撤廃した。
- 生成したファイルを共通のファイルアーカイブサービス（FileArchiveService）経由でS3に保存する。`displayName`（上記ダウンロード名）を指定し、S3保存名とDL表示名を分離する。
  - S3キー: `koza-furikae/{ja_code}/{YYYY}/{baseName}_{yyyyMMddHHmmss}`（`baseName` = `口座振替データ_{ja_code}_{YYYY}年{MM}月{DD}日`、拡張子なし。ja_code・タイムスタンプ付きで一意化する内部保管用の名称であり、ダウンロード名とは異なる）。
  - `scheduled_delete_date` = 作成日(JST)+5年、`download_type = KOZA_FURIKAE`、日農担当者DL不可（`nichino_download_allowed_flg = false`）を設定する。
  - S3アップロード失敗時はDB処理を行わず、HTTP 500 (`INTERNAL_SERVER_ERROR`) を返却する。

> v1.1: 取引/引落銀行番号は暫定的に `jastem_ja_code`（農協番号）を使用する（統一金融機関番号の正式ソース確定までのつなぎ・顧客合意 2026-07）。

### 4.5 t_koza_furikae 登録

- v1.1: 再集計した対象行の**編集金額**を t_koza_furikae にスナップショットとして登録する（1購読者×対象年月で1件、重複時は ON CONFLICT で更新）。`bank_code` には委託元 `jastem_ja_code`、`bank_name` には `jastem_tenpo_name` を格納する。`target_month` は `YYYYMM` 形式で保存する。

```sql
INSERT INTO t_koza_furikae (
  ja_id, dokusya_id, target_month, furikae_date, furikae_kingaku,
  koza_no, koza_meigi, yokin_shubetsu,
  bank_code, bank_name, bank_branch_code, bank_branch_name,
  created_at, created_by, updated_at, updated_by
) VALUES (
  :ja_id, :dokusya_id, :target_month, :hikiotoshi_date, :furikae_kingaku,
  :koza_no, :koza_meigi, :yokin_shubetsu,
  :bank_code, :bank_name, :bank_branch_code, :bank_branch_name,
  NOW(), :user_account_id, NOW(), :user_account_id
)
ON CONFLICT (dokusya_id, target_month)
DO UPDATE SET
  furikae_date     = EXCLUDED.furikae_date,
  furikae_kingaku  = EXCLUDED.furikae_kingaku,
  koza_no          = EXCLUDED.koza_no,
  koza_meigi       = EXCLUDED.koza_meigi,
  yokin_shubetsu   = EXCLUDED.yokin_shubetsu,
  bank_code        = EXCLUDED.bank_code,
  bank_name        = EXCLUDED.bank_name,
  bank_branch_code = EXCLUDED.bank_branch_code,
  bank_branch_name = EXCLUDED.bank_branch_name,
  updated_at       = NOW(),
  updated_by       = :user_account_id
```

### 4.6 t_file_download 登録

- ダウンロード履歴を t_file_download に登録する（FileArchiveService が S3 保存と同一フローで登録する）。`download_type = 1`（KOZA_FURIKAE）、`nichino_download_allowed_flg = false`、`scheduled_delete_date` = 作成日(JST)+5年、拡張子なしのファイル名を設定する。

```sql
INSERT INTO t_file_download (
  ja_id, download_datetime, download_type,
  file_name, file_path, file_size, record_count,
  target_month, scheduled_delete_date, nichino_download_allowed_flg,
  created_at, created_by
) VALUES (
  :user_ja_id, NOW(), 1,
  :file_name, :s3_file_path, :file_size, :record_count,
  TO_CHAR(:target_month::date, 'YYYYMM'), :scheduled_delete_date, FALSE,
  NOW(), :user_account_id
)
RETURNING *
```

### 4.7 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '口座振替データ出力画面 (ACSMS-SCR-020)', 'CREATE', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
`before_value`：INSERT のため空文字列を設定する。
`after_value`：エクスポート条件と件数をJSON形式で格納する。JASTEM 口座番号等の機密情報はマスクすること。

{
  "target_month": "2026-05-01",
  "hikiotoshi_date": "2026-05-27",
  "kanri_shiten_ids": [1, 2],
  "shiten_ids": [],
  "koza_shiten_ids": [10, 11],
  "jastem_itakusha_code": "1234567890",
  "jastem_ja_code": "1234",
  "jastem_toriatsukai_tenpo_code": "001",
  "jastem_tyokin_shubetsu": "1",
  "jastem_koza_no": "*******",
  "file_name": "口座振替データ_2026年05月27日",
  "s3_file_path": "koza-furikae/JA1301/2026/口座振替データ_JA1301_2026年05月27日_20260522103000",
  "record_count": 2
}
```

### 4.8 レスポンス生成

- 生成した全銀フォーマット固定長ファイル（Shift_JIS）をレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/octet-stream`（拡張子なしファイル名で text/plain 等の既知タイプだとブラウザが `.txt` を自動付与してしまうため固定）
- `Content-Disposition: attachment; filename="<ASCIIフォールバック名>"; filename*=UTF-8''<パーセントエンコードした表示名>`（表示名は `口座振替データ_YYYY年MM月DD日`、拡張子なし。ASCIIフォールバック名は表示名の非ASCII文字をアンダースコアへ置換した文字列）

### 4.9 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '口座振替データ出力画面 (ACSMS-SCR-020)', 'CREATE', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-020-003

## 概要

| 項目                   | 内容                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | 口座振替データ プレビュー取得（v1.1）                                                                                                                            |
| エンドポイント         | POST /api/v1/koza-furikae/preview                                                                                                                                |
| 概要                   | 「作成開始」= 対象年月・フィルタで振替対象を集計し、プレビュー一覧（金額編集用）を返す。**DB / S3 / 監査ログは書き込まない（閲覧のみ）**                          |
| 権限                   | koza_furikae.export                                                                                                                                              |
| リクエストパラメーター | JSON body                                                                                                                                                        |
| HTTPレスポンスコード   | 200:正常に取得しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象データがありません, 409:失効単価を参照する購読者が存在します, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ        | 必須 | 最小長 | 最大長 | 説明                                                             |
| --- | ---------------- | ------------- | ---- | ------ | ------ | ---------------------------------------------------------------- |
| 1   | target_month     | String        | 〇   | 10     | 10     | 対象年月日（YYYY-MM-DD）。集計基準日                             |
| 2   | hikiotoshi_date  | String        | 〇   | 10     | 10     | 引落日（YYYY-MM-DD）                                             |
| 3   | kanri_shiten_ids | Array<Number> | -    |        |        | 管理支店ID配列（絞込。空/未指定は全件）                          |
| 4   | shiten_ids       | Array<Number> | -    |        |        | 支店ID配列（絞込）                                               |
| 5   | koza_shiten_ids  | Array<Number> | -    |        |        | 口座支店ID配列（絞込）                                           |

（JASTEM 各項目・金額は不要。JASTEM の必須チェックと金額編集は「ファイル作成」= API-020-002 で行う。）

## レスポンスデータ

`{ data, meta }` エンベロープ。`data` は集計した振替対象の配列（金額は編集可能な初期値）。

| フィールド                     | タイプ | 説明                                       |
| ------------------------------ | ------ | ------------------------------------------ |
| data[].dokusya_id              | Number | 購読者ID（突合キー）                       |
| data[].koza_meigi              | String | 預金者名（カナ）                           |
| data[].kanri_shiten_id         | Number | 管理支店ID（null 許容）                    |
| data[].bank_branch_code        | String | 引落支店コード                             |
| data[].bank_branch_name        | String | 引落支店名                                 |
| data[].hikiotoshi_yokin_shubetsu | Number | 預金種目（1:普通,2:当座,9:その他）        |
| data[].hikiotoshi_koza_no      | String | 引落口座番号                               |
| data[].furikae_kingaku         | Number | 振替金額（集計初期値・FEで編集可）         |
| meta.total                     | Number | 対象件数                                   |

## リクエスト例

```json
POST /api/v1/koza-furikae/preview
Content-Type: application/json

{
  "target_month": "2026-05-01",
  "hikiotoshi_date": "2026-05-27",
  "kanri_shiten_ids": [1, 2],
  "shiten_ids": [],
  "koza_shiten_ids": [10, 11]
}
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_id": 1,
      "koza_meigi": "ﾔﾏﾀﾞ ﾀﾛｳ",
      "kanri_shiten_id": 1,
      "bank_branch_code": "001",
      "bank_branch_name": "ﾎﾝﾃﾝ",
      "hikiotoshi_yokin_shubetsu": 1,
      "hikiotoshi_koza_no": "1234567",
      "furikae_kingaku": 4900
    }
  ],
  "meta": { "total": 1, "page": 1, "per_page": 1, "total_pages": 1 }
}
```

## レスポンス失敗例（404 対象データなし）

```json
{ "error_code": "NO_TARGET_DATA", "message": "対象データがありません。" }
```

## レスポンス失敗例（409 失効単価参照）

```json
{
  "error_code": "INACTIVE_TANKA_REFERENCED",
  "message": "失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。",
  "total": 245,
  "errors": [
    { "field": "1", "message": "ﾔﾏﾀﾞ ﾀﾛｳ（単価: T001 旧購読料）" },
    { "field": "5", "message": "ｽｽﾞｷ ﾊﾅｺ（単価: T001 旧購読料）" }
  ]
}
```

## 処理手順

- **4.1** バリデーション：target_month / hikiotoshi_date 必須・YYYY-MM-DD 形式。
- **4.2** 認証・認可：SessionAuthGuard + PermissionsGuard（koza_furikae.export）。
- **4.3** 失効単価チェック（§4.3 ①）＋ 集計（§4.3 ②）を実行する。
  - v1.1: **プレビュー時点でも失効単価チェックを行う**（顧客要件 2026-07）。出力対象に失効単価(`active_flg=FALSE`)を参照する購読者が居れば HTTP 409（`INACTIVE_TANKA_REFERENCED`）で止め、該当購読者を `errors[]`（`field=dokusya_id`, `message=購読者名 + 単価`）で列挙して返す。FE は Excel取込画面と同様のインラインエラー一覧で該当購読者を提示し、手動で単価変更へ誘導する（トーストではない）。
  - チェック通過後、②の集計SQL（`active_flg = TRUE` のみ・DataScope をパラメータに内包）を実行。取得0件 → HTTP 404（NO_TARGET_DATA）。
  - **S3保存・t_koza_furikae更新・監査ログは行わない（閲覧のみ）。**
- **4.4** レスポンス生成：集計行を `{ data, meta }` で返す。**S3保存・t_koza_furikae更新・監査ログは行わない。**

---

# API ACSMS-API-COMMON-008

## 概要

| 項目                   | 内容                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Koza Shiten Dropdown                                                                                                                                            |
| 概要                   | 口座支店（金融機関支店フラグ=TRUE）のプルダウンリストを取得する。DataScope自動適用。                                                                                |
| URI                    | /api/v1/shiten/koza-dropdown                                                                                                                                        |
| メソッド               | GET                                                                                                                                                                 |
| リクエストボディー     | なし                                                                                                                                                                |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                |
| HTTPレスポンスコード   | 200:正常に口座支店リストを取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID    | タイプ        | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                          |
| --- | ----------------- | ------------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | kanri_shiten_ids  | Array<Number> | -        | -    |        |        | 管理支店ID配列で絞込（未指定の場合は自JA配下の全口座支店）    |

## レスポンスデータ

| #   | 項目ID            | タイプ | 繰り返し | フォーマット | Nullable | 説明                       |
| --- | ----------------- | ------ | -------- | ------------ | -------- | -------------------------- |
| 1   | data              | Array  | -        |              | -        | 口座支店リスト             |
| 2   | →shiten_id        | Number | -        |              | -        | 支店ID                     |
| 3   | →shiten_code      | String | -        |              | -        | 支店コード                 |
| 4   | →shiten_name      | String | -        |              | -        | 支店名                     |
| 5   | →kanri_shiten_id  | Number | -        |              | -        | 管理支店ID                 |

## リクエスト例

```
GET /api/v1/shiten/koza-dropdown
GET /api/v1/shiten/koza-dropdown?kanri_shiten_ids=1,2
```

## レスポンス成功例

```json
{
  "data": [
    { "shiten_id": 10, "shiten_code": "001", "shiten_name": "本店", "kanri_shiten_id": 1 },
    { "shiten_id": 11, "shiten_code": "002", "shiten_name": "北支店", "kanri_shiten_id": 1 },
    { "shiten_id": 12, "shiten_code": "003", "shiten_name": "南支店", "kanri_shiten_id": 2 }
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

- クエリパラメータの検証：
  - kanri_shiten_ids：任意、数値配列（カンマ区切り）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 認証済みユーザーであればアクセス可能。呼び出し元画面の権限に依存する。
- DataScope: `ja_id = user.ja_id`（JA_KANRI_SHITEN は加えて `kanri_shiten_id = user.kanri_shiten_id`）

### 4.3 データ取得

```sql
SELECT shiten_id,
       shiten_code,
       shiten_name,
       kanri_shiten_id
  FROM m_shiten
 WHERE deleted_at IS NULL
   AND kinyu_shiten_flg = TRUE
   AND ja_id = :user_ja_id
   /* JA_KANRI_SHITEN */
   AND (:user_kanri_shiten_id IS NULL OR kanri_shiten_id = :user_kanri_shiten_id)
   /* 画面の絞込条件 */
   AND (:kanri_shiten_ids IS NULL OR kanri_shiten_id = ANY(:kanri_shiten_ids))
 ORDER BY shiten_code ASC
```

### 4.4 レスポンス生成

- 取得結果を `data` 配列として返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
