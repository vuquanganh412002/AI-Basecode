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
updated_date: 2026/05/22
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/22 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/11 | 1.1  | VTI Japan | プレビュー→金額編集→ファイル作成の2ステップ化。API-020-003（preview）追加。API-020-002 に rows（編集金額）追加＋スコープ再集計の注記。JASTEM は readonly（マスタ書き戻し撤廃）。ダウンロード名 ZENOUTFD（拡張子なし）。 | | |

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
| 概要                   | 指定された対象年月・引落日・絞込条件で口座振替データ（全銀フォーマット CSV）を生成・S3に保存し、ダウンロードする。同時に t_koza_furikae にスナップショットを登録し、m_ja のJASTEM委託者情報および対象 m_shiten のJASTEM金融機関支店情報を保存／更新する。                                                                              |
| URI                    | /api/v1/koza-furikae/export                                                                                                                                                                                                                                                                                                          |
| メソッド               | POST                                                                                                                                                                                                                                                                                                                                  |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                                                                  |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                                                                       |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                                                                  |
| HTTPレスポンスコード   | 200:正常に口座振替データを生成しダウンロードしました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象データがありません, 500:システムエラーが発生しました                                                                                       |

## リクエストパラメータ

| #   | パラメーターID                | タイプ        | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                          |
| --- | ----------------------------- | ------------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | target_month                  | String        | -        | 〇   | 10     | 10     | 対象年月日（YYYY-MM-DD）。t_dokusya・m_hanbaiten・m_tankaから当該年月で集計する基準日                                          |
| 2   | hikiotoshi_date               | String        | -        | 〇   | 10     | 10     | 引落日（YYYY-MM-DD）。t_koza_furikae.furikae_dateに格納                                                                       |
| 3   | kanri_shiten_ids              | Array<Number> | -        | -    |        |        | 管理支店ID配列（複数選択可、空配列または未指定の場合は全管理支店）。t_dokusya.kanri_shiten_id で絞込                          |
| 4   | shiten_ids                    | Array<Number> | -        | -    |        |        | 支店ID配列（複数選択可、空配列または未指定の場合は全支店）。t_dokusya.shiten_id で絞込                                        |
| 5   | koza_shiten_ids               | Array<Number> | -        | -    |        |        | 口座支店ID配列（m_shiten.kinyu_shiten_flg=TRUE のみ。空配列または未指定の場合は全金融機関支店）                               |
| 6   | jastem_itakusha_code          | String        | -        | 〇   | 1      | 10     | JASTEM委託者コード。半角英数字。m_ja に保存／更新                                                                              |
| 7   | jastem_itakusha_name          | String        | -        | 〇   | 1      | 40     | JASTEM委託者名。m_ja に保存／更新                                                                                              |
| 8   | jastem_ja_code                | String        | -        | 〇   | 1      | 4      | JASTEM農協番号。半角数字。m_ja に保存／更新                                                                                    |
| 9   | jastem_ja_name                | String        | -        | 〇   | 1      | 15     | JASTEM農協名。m_ja に保存／更新                                                                                                |
| 10  | jastem_toriatsukai_tenpo_code | String        | -        | 〇   | 1      | 3      | JASTEMデータ送信取扱店舗コード。半角数字。対象 m_shiten に保存／更新                                                           |
| 11  | jastem_tenpo_name             | String        | -        | 〇   | 1      | 15     | JASTEM店舗名。対象 m_shiten に保存／更新                                                                                       |
| 12  | jastem_tyokin_shubetsu        | String        | -        | 〇   | 1      | 1      | JASTEM貯金種目（"1":普通貯金, "2":当座貯金, "9":その他）。対象 m_shiten に保存／更新                                          |
| 13  | jastem_koza_no                | String        | -        | 〇   | 1      | 7      | JASTEM口座番号。半角数字。（v1.1: readonly 表示のみ・マスタへ書き戻さない）                                                    |
| 14  | rows                          | Array<Object> | 1..N     | 〇   |        |        | v1.1: プレビューで確認・編集した振替対象行。要素＝`{ dokusya_id:Number, furikae_kingaku:Number(0〜9,999,999,999) }`。空配列不可 |

> **v1.1 補足**
> - 6〜13 の JASTEM 情報は **readonly 表示のみ**。出力時に m_ja / m_shiten へは書き戻さない（旧版の保存／更新は撤廃）。
> - `rows` の `dokusya_id` は信用しない。サーバはセッションのスコープ（ja_id / kanri_shiten_id）で **再集計**した対象とのみ突合し、その集合にある行だけ金額を上書きする（スコープ外・不正IDは無視）。編集金額は t_koza_furikae にスナップショット保存する（m_tanka は不変）。

## レスポンスデータ

全銀フォーマット固定長テキスト（`Content-Type: text/plain; charset=Shift_JIS`、1レコード120バイト）

### レスポンスヘッダ

```
Content-Type: text/plain; charset=Shift_JIS
Content-Disposition: attachment; filename="ZENOUTFD"; filename*=UTF-8''ZENOUTFD
```

> v1.1: ダウンロード名は全銀メディア受入名の固定値 `ZENOUTFD`（**拡張子なし**。銀行提出ファイルに .txt 等は付与しない）。S3保存名・t_file_download も拡張子なし。

### CSVフォーマット（全銀フォーマット）

| レコード種別 | 説明                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| ヘッダー     | 1=ヘッダ, 21=預金口座振替, 0=新規, 委託者コード, 委託者名, 引落日(MMDD), 仕向金融機関コード/名, 取扱店舗コード/名 |
| データ       | 2=データ, 引落金融機関コード/名, 預金種目, 口座番号, 口座名義カナ, 引落金額, 顧客番号                                |
| トレーラー   | 8=トレーラ, 件数, 合計金額                                                                                          |
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

全銀フォーマット固定長テキスト（Shift_JIS、拡張子なし固定名 ZENOUTFD）がレスポンスボディとして返却される。

```
1,21,0,1234567890,ﾆﾎﾝﾉｳｷﾞｮｳｼﾝﾌﾞﾝ          ,0527,1234,ﾆﾎﾝﾉｳｷﾞｮｳ      ,001,ﾎﾝﾃﾝ          ,1,1234567,
2,0001,ﾐｽﾞﾎﾌﾞﾝｺｳ      ,001,ﾎﾝﾃﾝ          ,1,1234567,ﾔﾏﾀﾞ ﾀﾛｳ            ,4900,DOK00001,1, ,
2,0001,ﾐｽﾞﾎﾌﾞﾝｺｳ      ,002,ｷﾀｼﾃﾝ         ,1,7654321,ｽｽﾞｷ ﾊﾅｺ           ,4900,DOK00002,1, ,
8,2,9800,
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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

> ※ 4.5 m_ja・m_shiten 更新 と 4.6 t_koza_furikae 登録 と 4.7 t_file_download 登録 と 4.8 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
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

### 4.3 対象データの集計・取得

- ログインユーザーのスコープを取得する（ja_id、必要に応じて kanri_shiten_id）。
- 対象年月（target_month）と絞込条件で集計対象となる購読者データを取得する。

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
       s.shiten_name AS bank_branch_name_master
  FROM t_dokusya d
  INNER JOIN m_hanbaiten h
    ON h.hanbaiten_id = d.hanbaiten_id
   AND h.deleted_at IS NULL
  INNER JOIN m_tanka t
    ON t.tanka_id = d.tanka_id
   AND t.tanka_type = 1
   AND t.deleted_at IS NULL
   AND t.active_flg = TRUE
   AND t.tekiyo_start_date <= :target_month
   AND (t.tekiyo_end_date IS NULL OR t.tekiyo_end_date >= :target_month)
  LEFT JOIN m_shiten s
    ON s.shiten_code = d.bank_branch_code
   AND s.ja_id = d.ja_id
   AND s.kinyu_shiten_flg = TRUE
   AND s.deleted_at IS NULL
 WHERE d.deleted_at IS NULL
   AND d.shiharai_hoho = 1
   AND d.tetsuzuki_shurui = 1
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

### 4.4 CSV生成・S3保存

- 全銀フォーマット（CSV、Shift_JIS、CRLF）に整形する。
  - ヘッダーレコード（1=ヘッダ）：種別コード(21)、コード区分(0)、委託者コード、委託者名（半角カナ40桁、左詰）、引落日(MMDD)、農協番号、農協名（半角カナ15桁）、取扱店舗コード、店舗名（半角カナ15桁）、預金種目、口座番号
  - データレコード（2=データ）：1件につき1レコード、引落金融機関コード/名、預金種目、口座番号、口座名義（半角カナ30桁）、引落金額、顧客番号（dokusya_id）
  - トレーラーレコード（8=トレーラ）：件数、合計金額
  - エンドレコード（9=エンド）
- ファイル名：`koza_furikae_YYYYMMDD_HHmmss.csv`（現在日時）
- 生成したCSVをS3（バケット：環境変数 `S3_BUCKET`、キー：`ja-{ja_id}/koza_furikae/{filename}`）にアップロードする。
  - S3アップロード失敗時はDB処理を行わず、HTTP 500 (`INTERNAL_SERVER_ERROR`) を返却する。

### 4.5 JASTEM情報の更新（m_ja, m_shiten）

- m_ja のJASTEM委託者情報を更新する。

```sql
UPDATE m_ja
   SET jastem_itakusha_code = :jastem_itakusha_code,
       jastem_itakusha_name = :jastem_itakusha_name,
       jastem_ja_code       = :jastem_ja_code,
       jastem_ja_name       = :jastem_ja_name,
       updated_at           = NOW(),
       updated_by           = :user_account_id
 WHERE ja_id = :user_ja_id
   AND deleted_at IS NULL
RETURNING *
```

- 指定された `koza_shiten_ids` の m_shiten レコードのJASTEM金融機関支店情報を更新する。`koza_shiten_ids` が空の場合は対象集計に登場した全 m_shiten レコードを対象とする。

```sql
UPDATE m_shiten
   SET jastem_toriatsukai_tenpo_code = :jastem_toriatsukai_tenpo_code,
       jastem_tenpo_name             = :jastem_tenpo_name,
       jastem_tyokin_shubetsu        = :jastem_tyokin_shubetsu,
       jastem_koza_no                = :jastem_koza_no,
       updated_at                    = NOW(),
       updated_by                    = :user_account_id
 WHERE shiten_id = ANY(:target_shiten_ids)
   AND ja_id = :user_ja_id
   AND kinyu_shiten_flg = TRUE
   AND deleted_at IS NULL
RETURNING *
```

### 4.6 t_koza_furikae 登録

- 集計したデータを t_koza_furikae にスナップショットとして登録する（1購読者×対象年月で1件、重複時は同月再生成として一旦削除し再INSERT、または ON CONFLICT で更新）。

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

### 4.7 t_file_download 登録

- ダウンロード履歴を t_file_download に登録する。

```sql
INSERT INTO t_file_download (
  ja_id, download_datetime, download_type,
  file_name, file_path, file_size, record_count,
  target_month, created_at, created_by
) VALUES (
  :user_ja_id, NOW(), 1,
  :file_name, :s3_file_path, :file_size, :record_count,
  TO_CHAR(:target_month::date, 'YYYYMM'),
  NOW(), :user_account_id
)
RETURNING *
```

### 4.8 操作ログ記録

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
  "file_name": "koza_furikae_20260522_103000.csv",
  "record_count": 2
}
```

### 4.9 レスポンス生成

- 生成したCSVファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: text/csv; charset=Shift_JIS`
- `Content-Disposition: attachment; filename="koza_furikae_YYYYMMDD_HHmmss.csv"`

### 4.10 例外処理

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
| HTTPレスポンスコード   | 200:正常に取得しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象データがありません, 500:システムエラーが発生しました |

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

## 処理手順

- **4.1** バリデーション：target_month / hikiotoshi_date 必須・YYYY-MM-DD 形式。
- **4.2** 認証・認可：SessionAuthGuard + PermissionsGuard（koza_furikae.export）。
- **4.3** 集計：API-020-002 §4.3 と同一の集計SQL（DataScope をパラメータに内包）。取得0件 → HTTP 404（NO_TARGET_DATA）。
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
