---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-015
screen_name: 購読者販売店一括置換画面
format_code: 15-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-15
created_date: 2026/05/15
created_by: Tran Duc Tuyen
updated_date: 2026/07/24
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容                                                                                                                                                | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Tran Duc Tuyen | 初版作成                                                                                                                                                | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/06/02 | 1.1  | Tran Duc Tuyen | 共用ドロップダウンAPIを実装済みの共通エンドポイント仕様に整合：COMMON-007 検索パラメータ `search`→`q`・`ja_id`/`page`/`per_page`・`meta` 追加・レスポンスから `ja_id` 削除、COMMON-006 に `q`/`ja_id`/`page`/`per_page`・`meta` 追加 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/07/13 | 1.2  | Tran Duc Tuyen | 顧客要件（2026-07）：検索 API に `hanbaiten_tekiyo_date`（販売店適用日）を**必須・未来日のみ**で追加。指定適用日時点で置換可能な購読者のみ返す置換可能条件（`購読開始日 <= 適用日` かつ `解約予定日が無い/適用日より後`）を §4.3・§4.4・§4.5 に追記。初期表示は購読者を自動読込しない運用に変更 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/07/18 | 1.3  | Tran Duc Tuyen | 顧客要件（2026-07 改訂）：検索・置換実行 両 API に `dokusya_shubetsu`（購読種別・**必須・1:紙版 / 2:電子版 のみ**）を追加。適用日ルールを種別依存に変更（**紙版=未来日のみ／電子版=当日のみ**）。検索は種別で絞り込み、置換実行は全候補が同一種別であることを整合チェック。UI は種別未選択時に適用日を非活性、電子版選択時は当日を自動セット | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/07/22 | 1.4  | Tran Duc Tuyen | 顧客要件（2026-07 改訂）：**電子版(2) を本画面（販売店一括置換）の対象外**に変更。検索・置換実行 両 API とも `dokusya_shubetsu=2` は日付に関係なく HTTP 400 (`VALIDATION_ERROR`, `{ field: "dokusya_shubetsu", message: "電子版は本画面では対象外です。" }`／ACSMS-MSG-015-009) を返す（候補取得より前に拒否・FE の検索ボタン無効化に対する防御的ガード）。電子版=電子配信で販売店を持たないため一括置換できない。※1.3 の「電子版=当日置換」は撤回。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 6   | 2026/07/23 | 1.5  | Tran Duc Tuyen | 顧客要件（2026-07）：`t_dokusya_rireki.hanbaiten_tekiyo_date`（販売店適用日）カラムを廃止。検索・置換実行 両 API のリクエスト項目 `hanbaiten_tekiyo_date` を `joho_henko_tekiyo_date`（適用日）へ改名し、適用日を読者情報変更適用日に一本化（販売店のみ変更でも同一適用日で履歴1件・専用の販売店適用日列は持たない）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 7   | 2026/07/24 | 1.6  | Tran Duc Tuyen | 顧客要件（2026-07）：検索 API の `hanbaiten_id`（**置換元配達販売店**）を**必須**化。置換対象の判定を現行 master の販売店から **as-of 適用日** に変更：各購読者の「適用日時点で有効な履歴レコード」（`t_dokusya_rireki` で `joho_henko_tekiyo_date ≦ 適用日` の最大 joho・`DISTINCT ON(dokusya_id)`）の配達販売店 = 置換元、かつ適用日時点で購読中（購読中/種別/`kaishi ≦ 適用日 < chushi`）の購読者のみ返す。未来の適用日でもその時点の販売店で母集合を確定する。§4.3 §4.4 §4.5・リクエストパラメータ No.7 を更新。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 8   | 2026/07/24 | 1.7  | Tran Duc Tuyen | 顧客要件（2026-07）：検索 API に `new_hanbaiten_id`（**置換先配達販売店**）を**必須**追加。検索は「= 置換元 かつ ≠ 置換先」で絞り込み（as-of 有効レコードの配達販売店に `eff.hanbaiten_id <> :new_hanbaiten_id` を追加）、既に置換先を配達している購読者を除外する（置換元 = 置換先 は 0 件・FE で事前弾き）。FE は置換先を検索エリア（適用日の直後）へ移動し、選択後の置換先入力欄を廃止して検索条件の値を置換実行にそのまま用いる。リクエストパラメータ No.7.5・§概要・§4.3 を更新。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 9   | 2026/07/25 | 1.8  | Tran Duc Tuyen | 顧客要件（2026-07 改訂）：`hanbaiten_id`（配達販売店）を**必須→任意**へ戻す（ラベルも「置換元配達販売店」→「配達販売店」）。指定時のみ `eff.hanbaiten_id = :hanbaiten_id` で追加絞り込み、未指定なら「置換先以外の全販売店」が対象。`new_hanbaiten_id`（置換先）は引き続き必須で `≠ 置換先` を常に適用。§概要・リクエストパラメータ No.7・§4.3 を更新。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者販売店一括置換画面（ACSMS-SCR-015）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                                                                |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | ACSMS-SCR-011        | 購読者情報登録画面 API設計書                                                                          |
| 2   | ACSMS-SCR-013        | 購読者履歴情報画面 API設計書                                                                          |
| 3   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024              |

※ 本画面の管理支店ドロップダウンは共用API `ACSMS-API-COMMON-004` を使用する。
※ 本画面で新規定義する共用API（COMMON-006: 支店, COMMON-007: 配達販売店）は本ドキュメント末尾に記載する。

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                                                                | 備考     |
| --- | ------------ | --------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                                                                | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                                                              | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                                                          | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                                                                        | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。                                                    | HTTP 400 |
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。                                          | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。                                              | HTTP 500 |
| 8   | 画面固有     | NOT_FOUND             | 指定された購読者が見つかりません。                                                                              | HTTP 404 |
| 9   | 画面固有     | SAME_HANBAITEN        | 現在の販売店と同じ販売店は選択できません。                                                                      | HTTP 400 |
| 10  | 画面固有     | INELIGIBLE_DOKUSYA    | 電子版クレカ決済者・併読者は編集・削除できません。                                                              | HTTP 400 |
| 11  | 画面固有     | DATE_RANGE_INVALID    | 「開始日」は「終了日」以前の日付を入力してください。                                                            | HTTP 400 |

---

# API ACSMS-API-015-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Search Dokusya for Hanbaiten Replacement                                                                                                                                                                              |
| 概要                   | 販売店一括置換対象の購読者を検索する（検索条件 + DataScope + ページネーション対応）。`joho_henko_tekiyo_date`（適用日）・`new_hanbaiten_id`（**置換先**）は**必須**、`hanbaiten_id`（配達販売店）は**任意**。適用日時点で有効な履歴レコード（as-of 適用日）の配達販売店が **置換先と一致せず**（配達販売店を指定した場合はさらに **その値と一致**）、その時点で購読中の購読者のみ返却する（顧客要件 2026-07：画面初期表示では検索しない・適用日＋置換先を入力して検索する運用）。 |
| URI                    | /api/v1/dokusya/replace-hanbaiten/search                                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                                                   |
| リクエストボディー     | なし                                                                                                                                                                                                                  |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に購読者一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                            |

## リクエストパラメータ

| #   | パラメーターID            | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | ------------------------- | ------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -    | -      | -      | 管理支店ID（完全一致）                                                                              |
| 2   | shiten_id                 | Number  | -    | -      | -      | 支店ID（完全一致）。kanri_shiten_id 指定時のみ有効                                                  |
| 3   | kumiaiin_code             | String  | -    | -      | 20     | 組合員コード（完全一致）                                                                            |
| 4   | shimei                    | String  | -    | -      | 100    | 氏名（`shimei_sei + shimei_mei` を連結した値で部分一致 LIKE）                                       |
| 5   | shimei_kana               | String  | -    | -      | 200    | かな氏名（`shimei_kana_sei + shimei_kana_mei` を連結した値で部分一致 LIKE）                         |
| 6   | haitatsu_address          | String  | -    | -      | 300    | 配達先住所（都道府県名＋市区町村郡＋丁目番地＋建物名を連結した値で部分一致 LIKE）                   |
| 7   | hanbaiten_id              | Number  | -    | -      | -      | 配達販売店ID（**任意**）。指定時のみ、適用日時点で有効な履歴（`joho_henko_tekiyo_date ≦ 適用日` の最大 joho）の配達販売店がこの値の購読者に追加で絞り込む（後述 §置換可能条件・as-of 適用日）。未指定なら置換先以外の全販売店が対象 |
| 7.5 | new_hanbaiten_id          | Number  | ○    | -      | -      | 置換先配達販売店ID（**必須**）。検索では有効履歴の配達販売店がこの値**でない**購読者に絞る（= 置換元 かつ ≠ 置換先）。置換元と同一だと 0 件（FE で事前バリデーション）。置換実行 API の `new_hanbaiten_id` と同一値。未選択は HTTP 400（`置換先配達販売店を選択してください。`） |
| 8   | dokusya_kaishi_date_from  | String  | -    | -      | 10     | 購読開始日（開始）YYYY-MM-DD。`shoki_dokusya_kaishi_date >= :date_from` で範囲検索                  |
| 9   | dokusya_kaishi_date_to    | String  | -    | -      | 10     | 購読開始日（終了）YYYY-MM-DD。`shoki_dokusya_kaishi_date <= :date_to` で範囲検索                    |
| 10  | joho_henko_tekiyo_date     | String  | ○    | -      | 10     | 適用日 YYYY-MM-DD。**必須**。**紙版=未来日のみ（`> 当日`）**（顧客要件 2026-07 改訂）。この適用日時点で置換可能な購読者のみ返却する（後述 §置換可能条件）。置換実行 API の適用日と同一基準 |
| 11  | dokusya_shubetsu          | Number  | ○    | -      | -      | 購読種別（**必須・1:紙版 / 2:電子版**。3:併読 は対象外）。この種別で購読者を絞り込む（`d.dokusya_shubetsu = :dokusya_shubetsu`）。**電子版(2) は本画面の対象外** → 日付に関係なく `VALIDATION_ERROR`（`電子版は本画面では対象外です。`／ACSMS-MSG-015-009・顧客要件 2026-07 改訂） |
| 12  | page                      | Number  | -    | -      | -      | ページ番号（デフォルト: 1）                                                                         |
| 12  | per_page                  | Number  | -    | -      | -      | 1ページの件数（デフォルト: 20、最大: 100）                                                          |
| 13  | sort_by                   | String  | -    | -      | -      | ソートカラム（許可: `kanri_shiten_name` / `shiten_name` / `kumiaiin_code` / `hanbaiten_code`。デフォルト: `kumiaiin_code`） |
| 14  | sort_order                | String  | -    | -      | -      | ソート順（asc / desc、デフォルト: asc）                                                             |

## レスポンスデータ

| #   | 項目ID                          | タイプ  | フォーマット | Nullable | 説明                                                                                            |
| --- | ------------------------------- | ------- | ------------ | -------- | ----------------------------------------------------------------------------------------------- |
| 1   | data                            | Array   |              | -        | 購読者一覧                                                                                      |
| 2   | →dokusya_id                     | Number  |              | -        | 購読者ID                                                                                        |
| 3   | →kanri_shiten_id                | Number  |              | 〇       | 管理支店ID                                                                                      |
| 4   | →kanri_shiten_name              | String  |              | 〇       | 管理支店名（`m_kanri_shiten.kanri_shiten_name` を LEFT JOIN）                                  |
| 5   | →shiten_id                      | Number  |              | 〇       | 支店ID                                                                                          |
| 6   | →shiten_name                    | String  |              | 〇       | 支店名（`m_shiten.shiten_name` を LEFT JOIN）                                                  |
| 7   | →kumiaiin_code                  | String  |              | -        | 組合員コード（空文字許容）                                                                     |
| 8   | →shimei                         | String  |              | -        | 氏名（`shimei_sei + ' ' + shimei_mei` を結合）                                                  |
| 9   | →haitatsu_yubin_no              | String  |              | -        | 配達先郵便番号（空文字許容）                                                                   |
| 10  | →haitatsu_address               | String  |              | -        | 配達先住所（`m_todofuken.todofuken_name + haitatsu_shikuchoson + haitatsu_chome_banchi + haitatsu_tatemono_mei` を結合） |
| 11  | →hanbaiten_id                   | Number  |              |  〇       | 販売店ID※未設定(NULL)あり                                                                            |
| 12  | →hanbaiten_code                 | String  |              | -        | 販売店コード（`m_hanbaiten.hanbaiten_code` を JOIN）                                            |
| 13  | →hanbaiten_name                 | String  |              | -        | 販売店名（`m_hanbaiten.hanbaiten_name` を JOIN）                                                |
| 14  | →dokusya_shubetsu               | Number  |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）             |
| 15  | →shiharai_hoho                  | Number  |              | -        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1〜9）                                    |
| 16  | meta                            | Object  |              | -        | ページネーション情報                                                                            |
| 17  | →total                          | Number  |              | -        | 総件数                                                                                          |
| 18  | →page                           | Number  |              | -        | 現在ページ番号                                                                                  |
| 19  | →per_page                       | Number  |              | -        | 1ページの件数                                                                                   |
| 20  | →total_pages                    | Number  |              | -        | 総ページ数                                                                                      |

※ `dokusya_shubetsu` / `shiharai_hoho` は FE 側のフィルタリング（併読・電子版クレカ判定）に使用する。表示はしない。

## リクエスト例

```
GET /api/v1/dokusya/replace-hanbaiten/search?joho_henko_tekiyo_date=2026-08-01&kanri_shiten_id=10&kumiaiin_code=10001&page=1&per_page=20&sort_by=kumiaiin_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_id": 5001,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "東京中央 管理支店",
      "shiten_id": 100,
      "shiten_name": "千代田支店",
      "kumiaiin_code": "10001",
      "shimei": "山田 太郎",
      "haitatsu_yubin_no": "1000001",
      "haitatsu_address": "東京都千代田区1-1-1 千代田マンション101",
      "hanbaiten_id": 200,
      "hanbaiten_code": "H001",
      "hanbaiten_name": "千代田販売店",
      "dokusya_shubetsu": 1,
      "shiharai_hoho": 1
    },
    {
      "dokusya_id": 5002,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "東京中央 管理支店",
      "shiten_id": 100,
      "shiten_name": "千代田支店",
      "kumiaiin_code": "10002",
      "shimei": "鈴木 花子",
      "haitatsu_yubin_no": "1000002",
      "haitatsu_address": "東京都千代田区2-2-2",
      "hanbaiten_id": 200,
      "hanbaiten_code": "H001",
      "hanbaiten_name": "千代田販売店",
      "dokusya_shubetsu": 1,
      "shiharai_hoho": 2
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

### 400 Bad Request (Date Range Invalid)

```json
{
  "error_code": "DATE_RANGE_INVALID",
  "message": "「開始日」は「終了日」以前の日付を入力してください。"
}
```

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "per_page", "message": "per_pageは1〜100の範囲で指定してください。" }
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
  - kumiaiin_code：最大20桁
  - shimei：最大100桁
  - shimei_kana：最大200桁
  - haitatsu_address：最大300桁
  - dokusya_kaishi_date_from / dokusya_kaishi_date_to：YYYY-MM-DD 形式
    - `date_from > date_to` の場合：HTTP 400 (`DATE_RANGE_INVALID`)
  - page：1以上
  - per_page：1〜100
  - sort_by：許可カラム（`kanri_shiten_name` / `shiten_name` / `kumiaiin_code` / `hanbaiten_code`）に含まれるか確認
  - sort_order：`asc` または `desc`
- デフォルト値を設定する（page=1, per_page=20, sort_by=kumiaiin_code, sort_order=asc）
- 不正なパラメータの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.replace_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - 中央会：自中央会配下のJAに紐づく購読者のみ参照可（`d.ja_id IN (中央会のJA一覧)` または `mj.chuokai_id = :user_chuokai_id`）
  - JA本店：自JAのみ参照可（`d.ja_id = :user_ja_id`）
  - JA管理支店：自管理支店配下の購読者のみ参照可（`d.kanri_shiten_id = :user_kanri_shiten_id`）
- DataScope違反（他JA・他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- **入力チェック（購読種別・必須）**：`dokusya_shubetsu` は必須で **1:紙版 / 2:電子版 のみ**。未入力・3(併読)・範囲外は HTTP 400 (`VALIDATION_ERROR`, `{ field: "dokusya_shubetsu", message: "購読種別は紙版または電子版で指定してください。" }`)。
- **入力チェック（適用日・種別依存／顧客要件 2026-07 改訂）**：`joho_henko_tekiyo_date` は必須。未入力は HTTP 400 (`VALIDATION_ERROR`, `適用日を入力してください。`)、形式（YYYY-MM-DD）不正も 400。日付ルールは `dokusya_shubetsu` 依存で判定する（当日判定は `todayIsoJst()` = Asia/Tokyo、置換実行 API と同一基準）：
  - **紙版(1)**：**未来日のみ**（`> 当日`）。当日以下は HTTP 400 (`DATE_RANGE_INVALID`, `紙版の適用日は本日より後の日付を入力してください。`)。
  - **電子版(2)**：**本画面（販売店一括置換）の対象外**。日付に関係なく HTTP 400 (`VALIDATION_ERROR`, `{ field: "dokusya_shubetsu", message: "電子版は本画面では対象外です。" }`／ACSMS-MSG-015-009)。電子版=電子配信で販売店を持たないため一括置換できない（顧客要件 2026-07 改訂で「電子版=当日置換」を撤回）。UI は電子版選択時にトーストでこのメッセージを通知し検索ボタンを非活性化する（インラインメッセージは表示しない）。
- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- DataScope を role_code により適用する（4.2 参照）。
- **購読種別の絞り込み（顧客要件 2026-07）**：`d.dokusya_shubetsu = :dokusya_shubetsu`（必須・1 or 2）で対象種別のみに絞る。
- **置換可能条件（顧客要件 2026-07 改訂・as-of 適用日）**：現行 master ではなく、各購読者の「適用日時点で有効な履歴レコード」で置換元販売店・購読状態を判定する。有効レコード = `t_dokusya_rireki` のうち `joho_henko_tekiyo_date ≦ :joho_henko_tekiyo_date` かつ `joho_henko_tekiyo_date` が最大（同日は `rireki_no` 最大）の行（`DISTINCT ON (dokusya_id)`）。その有効レコードが次を満たす購読者のみ返す：
  - `eff.hanbaiten_id <> :new_hanbaiten_id`（既に置換先を配達している購読者を除外・必須）
  - `hanbaiten_id`（配達販売店）を指定した場合のみ追加：`eff.hanbaiten_id = :hanbaiten_id`（適用日時点の配達販売店 = 指定値）。配達販売店 = 置換先 のときは 0 件
  - `eff.tetsuzuki_shurui = 1`（購読中）
  - `eff.dokusya_shubetsu = :dokusya_shubetsu`（指定種別）
  - `eff.dokusya_kaishi_date <= :joho_henko_tekiyo_date`（購読開始日が適用日以前）
  - `(eff.dokusya_chushi_date IS NULL OR eff.dokusya_chushi_date > :joho_henko_tekiyo_date)`（解約予定日が無い、または適用日より後）
  - 未来の適用日でも、その時点で有効な履歴で判定するため、現行 master の販売店が既に変わっていても正しい母集合を返す。表示・DataScope・その他検索条件は master(`d`) 側で適用する。
- 検索条件を追加する：
  - kanri_shiten_id 指定時：`d.kanri_shiten_id = :kanri_shiten_id`
  - shiten_id 指定時：`d.shiten_id = :shiten_id`
  - kumiaiin_code 指定時：`d.kumiaiin_code = :kumiaiin_code`（完全一致）
  - shimei 指定時：`CONCAT(d.shimei_sei, d.shimei_mei) LIKE :shimei_like`（部分一致）
  - shimei_kana 指定時：`CONCAT(d.shimei_kana_sei, d.shimei_kana_mei) LIKE :shimei_kana_like`（部分一致）
  - haitatsu_address 指定時：`CONCAT(t.todofuken_name, d.haitatsu_shikuchoson, d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei) LIKE :haitatsu_like`（部分一致）
  - hanbaiten_id（置換元・必須）：master ではなく上記 as-of 有効レコードの `eff.hanbaiten_id = :hanbaiten_id` で判定（§置換可能条件）
  - dokusya_kaishi_date_from 指定時：`d.shoki_dokusya_kaishi_date >= :date_from`
  - dokusya_kaishi_date_to 指定時：`d.shoki_dokusya_kaishi_date <= :date_to`
- 固定条件：
  - `d.deleted_at IS NULL`（論理削除除外・master 側）
  - `d.dokusya_id IN (…as-of 有効レコードのサブクエリ…)`（購読中/種別/適用日/置換元は上記 §置換可能条件のサブクエリで判定）

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_dokusya d
LEFT JOIN m_todofuken t ON t.todofuken_code = d.haitatsu_todofuken_code
WHERE d.tetsuzuki_shurui = 1
  AND d.deleted_at IS NULL
  /* 置換可能条件（適用日時点で置換可能な購読者のみ） */
  AND d.dokusya_kaishi_date <= :joho_henko_tekiyo_date
  AND (d.dokusya_chushi_date IS NULL OR d.dokusya_chushi_date > :joho_henko_tekiyo_date)
  /* DataScope: JA_KANRI_SHITEN */
  AND d.kanri_shiten_id = :user_kanri_shiten_id
  /* DataScope: JA_HONTEN / CHUOKAI */
  AND d.ja_id = :user_ja_id
  /* 検索条件 */
  AND (:kanri_shiten_id IS NULL OR d.kanri_shiten_id = :kanri_shiten_id)
  AND (:shiten_id IS NULL OR d.shiten_id = :shiten_id)
  AND (:kumiaiin_code IS NULL OR d.kumiaiin_code = :kumiaiin_code)
  AND (:shimei IS NULL OR CONCAT(d.shimei_sei, d.shimei_mei) LIKE :shimei_like)
  AND (:shimei_kana IS NULL OR CONCAT(d.shimei_kana_sei, d.shimei_kana_mei) LIKE :shimei_kana_like)
  AND (:haitatsu_address IS NULL OR CONCAT(t.todofuken_name, d.haitatsu_shikuchoson, d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei) LIKE :haitatsu_like)
  AND (:hanbaiten_id IS NULL OR d.hanbaiten_id = :hanbaiten_id)
  AND (:date_from IS NULL OR d.shoki_dokusya_kaishi_date >= :date_from)
  AND (:date_to IS NULL OR d.shoki_dokusya_kaishi_date <= :date_to)
```

### 4.5 データ取得

```sql
SELECT d.dokusya_id, d.kanri_shiten_id, ks.kanri_shiten_name,
       d.shiten_id, s.shiten_name,
       d.kumiaiin_code, d.shimei_sei, d.shimei_mei,
       d.haitatsu_yubin_no,
       d.haitatsu_todofuken_code, t.todofuken_name,
       d.haitatsu_shikuchoson, d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei,
       d.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name,
       d.dokusya_shubetsu, d.shiharai_hoho
FROM t_dokusya d
LEFT JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s ON s.shiten_id = d.shiten_id AND s.deleted_at IS NULL
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_todofuken t ON t.todofuken_code = d.haitatsu_todofuken_code
WHERE d.tetsuzuki_shurui = 1
  AND d.deleted_at IS NULL
  /* 置換可能条件 + DataScope + 検索条件: 4.4と同じ */
ORDER BY :sort_by :sort_order
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- `shimei` = `shimei_sei + ' ' + shimei_mei` を結合した値で返却する。
- `haitatsu_address` = `todofuken_name + haitatsu_shikuchoson + haitatsu_chome_banchi + haitatsu_tatemono_mei` を結合した値で返却する。
- data 配列と meta オブジェクトを含む JSON を返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-015-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Bulk Replace Dokusya Hanbaiten                                                                                                                                                                                                                                                                  |
| 概要                   | 選択した購読者の配達販売店を一括置換する。`t_dokusya.hanbaiten_id` を新規販売店IDに更新し、対象購読者ごとに `t_dokusya_rireki` に新規履歴レコード（`rireki_no = 既存最大 + 1`、`saishin_data_flg=TRUE`）を作成する。1トランザクションで処理し、エラー時は全件ロールバック。                          |
| URI                    | /api/v1/dokusya/replace-hanbaiten                                                                                                                                                                                                                                                               |
| メソッド               | POST                                                                                                                                                                                                                                                                                            |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                            |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                          |
| HTTPレスポンスコード   | 200:正常に置換処理が完了しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました                                                                |

## リクエストパラメータ

| #   | パラメーターID         | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                |
| --- | ---------------------- | ------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------- |
| 1   | dokusya_ids            | Array   | ○    | 1      | 1000   | 置換対象購読者IDの配列                                                              |
| 2   | →(item)                | Number  | ○    | -      | -      | 購読者ID                                                                            |
| 3   | new_hanbaiten_id       | Number  | ○    | -      | -      | 置換先配達販売店ID。現在の販売店と異なる必要がある                                  |
| 4   | joho_henko_tekiyo_date  | String  | ○    | -      | 10     | 適用日（YYYY-MM-DD）。**紙版=未来日のみ**（顧客要件 2026-07 改訂） |
| 5   | dokusya_shubetsu       | Number  | ○    | -      | -      | 購読種別（**必須・1:紙版 / 2:電子版**）。全候補が同一種別であることの整合チェックに用いる。**電子版(2) は本画面の対象外** → `VALIDATION_ERROR`（`電子版は本画面では対象外です。`／ACSMS-MSG-015-009・顧客要件 2026-07 改訂） |

## レスポンスデータ

| #   | 項目ID            | タイプ | フォーマット | Nullable | 説明                                            |
| --- | ----------------- | ------ | ------------ | -------- | ----------------------------------------------- |
| 1   | data              | Object |              | -        | 置換結果サマリ                                  |
| 2   | →total_count      | Number |              | -        | 置換対象購読者数                                |
| 3   | →replaced_count   | Number |              | -        | 置換成功件数（= total_count、エラー時は全件ロールバック） |
| 4   | →rireki_count     | Number |              | -        | t_dokusya_rireki に追加した履歴件数             |
| 5   | →new_hanbaiten_id | Number |              | -        | 置換後の販売店ID                                |
| 6   | →applied_at       | String | ISO8601      | -        | 処理完了日時                                    |
| 7   | message           | String |              | -        | 置換処理が完了しました。                        |

## リクエスト例

```json
POST /api/v1/dokusya/replace-hanbaiten
Content-Type: application/json

{
  "dokusya_ids": [5001, 5002, 5003],
  "new_hanbaiten_id": 201,
  "joho_henko_tekiyo_date": "2026-06-01"
}
```

## レスポンス成功例

```json
{
  "data": {
    "total_count": 3,
    "replaced_count": 3,
    "rireki_count": 3,
    "new_hanbaiten_id": 201,
    "applied_at": "2026-05-15T10:00:00+09:00"
  },
  "message": "置換処理が完了しました。"
}
```

## レスポンス失敗例

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "new_hanbaiten_id", "message": "必須項目です。" },
    { "field": "joho_henko_tekiyo_date", "message": "必須項目です。" }
  ]
}
```

### 400 Bad Request (Same Hanbaiten)

```json
{
  "error_code": "SAME_HANBAITEN",
  "message": "現在の販売店と同じ販売店は選択できません。"
}
```

### 400 Bad Request (Ineligible Dokusya)

```json
{
  "error_code": "INELIGIBLE_DOKUSYA",
  "message": "電子版クレカ決済者・併読者は編集・削除できません。",
  "errors": [
    { "dokusya_id": 5001, "reason": "併読者のため置換できません。" },
    { "dokusya_id": 5002, "reason": "電子版クレカ決済者のため置換できません。" }
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

### 403 Forbidden (DataScope Violation)

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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

> ※ 4.5 データ更新 と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - dokusya_ids：必須、配列、1件以上、1000件以下
  - new_hanbaiten_id：必須、数値型、正の整数
  - dokusya_shubetsu：必須、**1:紙版 / 2:電子版 のみ**（3:併読 は対象外・顧客要件 2026-07）
  - dokusya_shubetsu：**電子版(2) は本画面の対象外** → 日付に関係なく HTTP 400 (`VALIDATION_ERROR`, `{ field: "dokusya_shubetsu", message: "電子版は本画面では対象外です。" }`／ACSMS-MSG-015-009・顧客要件 2026-07 改訂)。候補取得(find)より前に拒否する。
  - joho_henko_tekiyo_date：必須、YYYY-MM-DD 形式。**紙版=未来日のみ**（`> 当日`、`DATE_RANGE_INVALID` `紙版の適用日は本日より後の日付を入力してください。`）。当日判定は `todayIsoJst()`（Asia/Tokyo）
- **候補種別の整合チェック（顧客要件 2026-07）**：選択された全候補の `dokusya_shubetsu` が指定の `dokusya_shubetsu` と一致すること（検索で種別絞り込み済みだが、id 改竄・不整合を防ぐ防御）。不一致は HTTP 400 (`DATE_RANGE_INVALID`, `選択した購読者に指定の購読種別と異なる購読者が含まれています。`)。併読・電子版クレカは従来どおり ineligible（4.3）
- 不正な場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.replace_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: ログインユーザーの `ja_id`（および JA_KANRI_SHITEN の場合は `kanri_shiten_id`）を取得する。
- DataScope違反（他JA・他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 事前チェック（対象購読者の取得と検証）

- 対象購読者を取得し、DataScope と業務ルールを検証する。

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id, hanbaiten_id,
       dokusya_shubetsu, shiharai_hoho, rireki_no
FROM t_dokusya
WHERE dokusya_id = ANY(:dokusya_ids)
  AND tetsuzuki_shurui = 1
  AND deleted_at IS NULL
```

- ヒットしなかった `dokusya_id` がある場合：HTTP 404 (`NOT_FOUND`)
- DataScope 違反（取得した行の `ja_id` / `kanri_shiten_id` がセッションのスコープと一致しない）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- 業務ルールチェック：
  - いずれかの行で `hanbaiten_id = :new_hanbaiten_id` の場合：HTTP 400 (`SAME_HANBAITEN`)
  - いずれかの行で `dokusya_shubetsu = 3`（併読者）または（`dokusya_shubetsu = 2` かつ `shiharai_hoho = 6`：電子版クレカ決済）の場合：HTTP 400 (`INELIGIBLE_DOKUSYA`) + errors 配列（`dokusya_id` + `reason`）

### 4.4 置換先販売店の検証

```sql
SELECT hanbaiten_id, ja_id
FROM m_hanbaiten
WHERE hanbaiten_id = :new_hanbaiten_id
  AND deleted_at IS NULL
```

- 未ヒット：HTTP 404 (`NOT_FOUND`)（販売店が存在しない）
- `m_hanbaiten.ja_id` がセッションスコープと一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.5 データ更新（トランザクション）

- DBトランザクションを開始する。

#### 4.5.1 t_dokusya の販売店ID更新（全対象購読者）

```sql
UPDATE t_dokusya
SET hanbaiten_id = :new_hanbaiten_id,
    joho_henko_tekiyo_date = :joho_henko_tekiyo_date,  -- 顧客要件 2026-06: 適用日に揃える
    rireki_no = rireki_no + 1,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = ANY(:dokusya_ids)
  AND tetsuzuki_shurui = 1
  AND deleted_at IS NULL
RETURNING dokusya_id, hanbaiten_id, rireki_no
```

#### 4.5.2 t_dokusya_rireki の履歴追加（対象購読者ごとに1行）

- 既存履歴の `saishin_data_flg` を FALSE に更新：

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = ANY(:dokusya_ids)
  AND saishin_data_flg = TRUE
```

- 新規履歴 INSERT（対象購読者ごと、`zenkai_hanbaiten_id` = 更新前の販売店ID）：

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
  renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg,
  haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
  bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date, joho_henko_tekiyo_date,
  seikyu_kaishi_month, biko,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id,
  created_at, created_by
)
SELECT
  d.dokusya_id, d.rireki_no, d.ja_id, d.kanri_shiten_id, d.shiten_id, d.kumiaiin_code,
  d.dokusya_shubetsu, d.tetsuzuki_shurui,
  d.shimei_sei, d.shimei_mei, d.shimei_kana_sei, d.shimei_kana_mei,
  d.dokusya_busu, d.yubin_no, d.todofuken_code, d.shikuchoson, d.chome_banchi, d.tatemono_mei,
  d.renrakusaki_1, d.renrakusaki_2, d.email, d.mail_magazine_flg, d.birth_year, d.gender,
  d.haitatsu_same_flg,
  d.haitatsu_yubin_no, d.haitatsu_todofuken_code, d.haitatsu_shikuchoson, d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei,
  d.haitatsu_renrakusaki_1, d.haitatsu_renrakusaki_2,
  d.haitatsu_shimei_sei, d.haitatsu_shimei_mei, d.haitatsu_shimei_kana_sei, d.haitatsu_shimei_kana_mei,
  d.hanbaiten_id, d.tanka_id, d.yubin_kubun, d.shiharai_hoho, d.dokusyaryo_shiharai_cycle,
  d.bank_branch_code, d.bank_branch_name, d.hikiotoshi_yokin_shubetsu, d.hikiotoshi_koza_no, d.hikiotoshi_koza_meigi,
  d.dokusyaso_bunrui, d.nogyosya_bunrui,
  d.shoki_dokusya_kaishi_date, d.dokusya_kaishi_date, d.dokusya_chushi_date, :joho_henko_tekiyo_date,
  d.seikyu_kaishi_month, d.biko,
  TRUE, TRUE, FALSE, FALSE,
  :zenkai_hanbaiten_id_per_dokusya,
  NOW(), :user_account_id
FROM t_dokusya d
WHERE d.dokusya_id = :dokusya_id
```

- `zougen_hokoku_flg`：販売店変更のため `TRUE`（増減報告対象）。
- `zenkai_hanbaiten_id`：更新前の `t_dokusya.hanbaiten_id`（4.3 で取得した値）を設定する。
- `joho_henko_tekiyo_date`：リクエストの `joho_henko_tekiyo_date` を設定する（販売店のみ変更イベント。専用の適用日列は廃止し適用日を joho に一本化・顧客要件 2026-07。UI 編集 Rule2 / SCR-011 §8.1・§14.3 と同一）。マスタ側 `t_dokusya.joho_henko_tekiyo_date` も同日に更新し、最新履歴（saishin）と整合させる。

### 4.6 操作ログ記録

- 一括置換操作をバッチ単位で1件記録する（行単位ではなく置換操作1回分）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者販売店一括置換画面 (ACSMS-SCR-015)', 'UPDATE', 1,
        NULL, 't_dokusya', :before_value_json, :after_value_json,
        :ip_address, :user_agent)
```

- `before_value`：置換前データのサマリ JSON `{ "dokusya_ids": [...], "previous_hanbaiten_ids": {dokusya_id: hanbaiten_id, ...} }`
- `after_value`：置換結果サマリ JSON `{ "total_count", "new_hanbaiten_id", "joho_henko_tekiyo_date", "rireki_count" }`
- パスワード等の機密情報は含めないこと。

**after_value 例:**

```json
{
  "total_count": 3,
  "replaced_count": 3,
  "new_hanbaiten_id": 201,
  "joho_henko_tekiyo_date": "2026-06-01",
  "rireki_count": 3,
  "dokusya_ids": [5001, 5002, 5003]
}
```

### 4.7 レスポンス生成

- トランザクションをコミットする。
- 置換結果サマリを `data` オブジェクトとして返却する。HTTP 200。
- `message`：`置換処理が完了しました。`（ACSMS-MSG-015-008）

### 4.8 例外処理

- 置換処理中にエラーが発生した場合、トランザクションを全件ロールバックする。
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時もエラーログを記録する（`log_type = 3`）。**トランザクション外で別途記録する**。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者販売店一括置換画面 (ACSMS-SCR-015)', 'UPDATE', 2,
        NULL, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-COMMON-006

※ 共用API。定義元：ACSMS-SCR-015。本画面では支店ドロップダウンで使用する。

## 概要

| 項目                   | 内容                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Shiten Dropdown                                                                                                                                                       |
| 概要                   | 支店プルダウンリストを取得する（管理支店IDで絞込み、DataScope自動適用。共用API）                                                                                          |
| URI                    | /api/v1/shiten/dropdown                                                                                                                                                   |
| メソッド               | GET                                                                                                                                                                       |
| リクエストボディー     | なし                                                                                                                                                                      |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                          |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                    |
| HTTPレスポンスコード   | 200:正常に支店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました         |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | ----------------- | ------ | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id   | Number | -    | -      | -      | 管理支店IDで絞込み（本画面では管理支店選択時に必ず指定）。BE はセッションスコープ内かをアサート     |
| 2   | q                 | String | -    | -      | 100    | 検索文字列（支店コード or 支店名の部分一致 LIKE）                                                   |
| 3   | ja_id             | Number | -    | -      | -      | JA絞込み（NICHINO_* 代行入力時のみ有効。JA-scoped ロールは session.ja_id を優先しこの値は無視）     |
| 4   | page              | Number | -    | -      | -      | ページ番号（デフォルト: 1）                                                                         |
| 5   | per_page          | Number | -    | -      | -      | 1ページの件数（デフォルト: 50、最大: 100）                                                          |

## レスポンスデータ

| #   | 項目ID            | タイプ | フォーマット | Nullable | 説明                                  |
| --- | ----------------- | ------ | ------------ | -------- | ------------------------------------- |
| 1   | data              | Array  |              | -        | 支店一覧                              |
| 2   | →shiten_id        | Number |              | -        | 支店ID                                |
| 3   | →shiten_code      | String |              | -        | 支店コード                            |
| 4   | →shiten_name      | String |              | -        | 支店名                                |
| 5   | →kanri_shiten_id  | Number |              | -        | 管理支店ID                            |
| 6   | meta              | Object |              | 〇       | ページネーション情報（任意。`{ data }` のみのレスポンスも許容） |
| 7   | →total            | Number |              | -        | 総件数                                |
| 8   | →page             | Number |              | -        | 現在ページ番号                        |
| 9   | →per_page         | Number |              | -        | 1ページの件数                         |
| 10  | →has_more         | Boolean|              | -        | 次ページの有無（無限スクロール判定用）|

## リクエスト例

```
GET /api/v1/shiten/dropdown?kanri_shiten_id=10&page=1&per_page=50
```

## レスポンス成功例

```json
{
  "data": [
    { "shiten_id": 100, "shiten_code": "S001", "shiten_name": "千代田支店", "kanri_shiten_id": 10 },
    { "shiten_id": 101, "shiten_code": "S002", "shiten_name": "中央支店", "kanri_shiten_id": 10 }
  ],
  "meta": { "total": 2, "page": 1, "per_page": 50, "has_more": false }
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{ "error_code": "UNAUTHORIZED", "message": "セッションが切れました。再度ログインしてください。" }
```

### 403 Forbidden

```json
{ "error_code": "FORBIDDEN", "message": "この画面へのアクセス権限がありません。" }
```

### 500 Internal Server Error

```json
{ "error_code": "INTERNAL_SERVER_ERROR", "message": "システムエラーが発生しました。しばらくしてから再度お試しください。" }
```

## 処理手順

### 4.1 リクエストのバリデーション

- `kanri_shiten_id` 指定時：数値型チェック。
- `q` 指定時：最大100桁。
- `page` 指定時：1以上。
- `per_page` 指定時：1〜100（デフォルト50）。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。SCR-015（購読者販売店一括置換画面）では `dokusya.replace_hanbaiten` 保持者が呼び出す。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- DataScope:
  - 中央会：自中央会配下のJAに紐づく支店を取得（`s.ja_id IN (中央会のJA一覧)`）
  - JA本店：自JAのみ取得（`s.ja_id = :user_ja_id`）
  - JA管理支店：自管理支店配下の支店のみ取得（`s.kanri_shiten_id = :user_kanri_shiten_id`）
  - `ja_id` クエリパラメータは NICHINO_* 代行入力時のみ適用。JA-scoped ロールは session.ja_id を優先し無視する。
- BE 側で `kanri_shiten_id` クエリパラメータがセッションスコープ内にあることをアサート（クエリ改ざん防止）。

```sql
SELECT s.shiten_id, s.shiten_code, s.shiten_name, s.kanri_shiten_id
FROM m_shiten s
WHERE s.deleted_at IS NULL
  /* DataScope: CHUOKAI / JA_HONTEN */
  AND s.ja_id = :user_ja_id
  /* DataScope: JA_KANRI_SHITEN */
  AND s.kanri_shiten_id = :user_kanri_shiten_id
  /* クエリパラメータ */
  AND (:kanri_shiten_id IS NULL OR s.kanri_shiten_id = :kanri_shiten_id)
  AND (:q IS NULL OR s.shiten_code LIKE :q_like OR s.shiten_name LIKE :q_like)
ORDER BY s.shiten_code ASC
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- `meta.has_more` は `(page * per_page) < total` で算出する（meta を返さない場合は `{ data }` のみでも可）。

### 4.4 レスポンス生成

- data 配列を含む JSON を返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-COMMON-007

※ 共用API。定義元：ACSMS-SCR-015。本画面では配達販売店ドロップダウンと置換先配達販売店ドロップダウンで使用する。

## 概要

| 項目                   | 内容                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Hanbaiten Dropdown                                                                                                                                                    |
| 概要                   | 販売店プルダウンリストを取得する（DataScope自動適用。共用API）                                                                                                            |
| URI                    | /api/v1/hanbaiten/dropdown                                                                                                                                                |
| メソッド               | GET                                                                                                                                                                       |
| リクエストボディー     | なし                                                                                                                                                                      |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                          |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                    |
| HTTPレスポンスコード   | 200:正常に販売店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました       |

## リクエストパラメータ

| #   | パラメーターID    | タイプ | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | ----------------- | ------ | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | q                 | String | -    | -      | 100    | 検索文字列（販売店コード or 販売店名の部分一致 LIKE）                                               |
| 2   | ja_id             | Number | -    | -      | -      | JA絞込み（NICHINO_* 代行入力時のみ有効。JA-scoped ロールは session.ja_id を優先しこの値は無視）     |
| 3   | page              | Number | -    | -      | -      | ページ番号（デフォルト: 1）                                                                         |
| 4   | per_page          | Number | -    | -      | -      | 1ページの件数（デフォルト: 50、最大: 100）                                                          |

## レスポンスデータ

| #   | 項目ID           | タイプ | フォーマット | Nullable | 説明                                  |
| --- | ---------------- | ------ | ------------ | -------- | ------------------------------------- |
| 1   | data             | Array  |              | -        | 販売店一覧                            |
| 2   | →hanbaiten_id    | Number |              |  〇       | 販売店ID※未設定(NULL)あり                  |
| 3   | →hanbaiten_code  | String |              | -        | 販売店コード                          |
| 4   | →hanbaiten_name  | String |              | -        | 販売店名                              |
| 5   | meta             | Object |              | -        | ページネーション情報                  |
| 6   | →total           | Number |              | -        | 総件数                                |
| 7   | →page            | Number |              | -        | 現在ページ番号                        |
| 8   | →per_page        | Number |              | -        | 1ページの件数                         |
| 9   | →has_more        | Boolean|              | -        | 次ページの有無（無限スクロール判定用）|

## リクエスト例

```
GET /api/v1/hanbaiten/dropdown?q=千代田&page=1&per_page=50
```

## レスポンス成功例

```json
{
  "data": [
    { "hanbaiten_id": 200, "hanbaiten_code": "H001", "hanbaiten_name": "千代田販売店" },
    { "hanbaiten_id": 201, "hanbaiten_code": "H002", "hanbaiten_name": "中央販売店" }
  ],
  "meta": { "total": 2, "page": 1, "per_page": 50, "has_more": false }
}
```

## レスポンス失敗例

### 401 Unauthorized

```json
{ "error_code": "UNAUTHORIZED", "message": "セッションが切れました。再度ログインしてください。" }
```

### 403 Forbidden

```json
{ "error_code": "FORBIDDEN", "message": "この画面へのアクセス権限がありません。" }
```

### 500 Internal Server Error

```json
{ "error_code": "INTERNAL_SERVER_ERROR", "message": "システムエラーが発生しました。しばらくしてから再度お試しください。" }
```

## 処理手順

### 4.1 リクエストのバリデーション

- `q` 指定時：最大100桁。
- `page` 指定時：1以上。
- `per_page` 指定時：1〜100（デフォルト50）。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：認証済みユーザーであればアクセス可能。
  - ※ 呼び出し元画面の権限に依存する。SCR-015（購読者販売店一括置換画面）では `dokusya.replace_hanbaiten` 保持者が呼び出す。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得

- ログインユーザーのスコープ（role_code, ja_id）を取得する。
- DataScope:
  - 中央会：自中央会配下のJAに紐づく販売店を取得（`h.ja_id IN (中央会のJA一覧)`）
  - JA本店 / JA管理支店：自JAに紐づく販売店を取得（`h.ja_id = :user_ja_id`）
  - `ja_id` クエリパラメータは NICHINO_* 代行入力時のみ適用。JA-scoped ロールは session.ja_id を優先し無視する。

```sql
SELECT h.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name
FROM m_hanbaiten h
WHERE h.deleted_at IS NULL
  /* DataScope */
  AND h.ja_id = :user_ja_id
  /* 検索条件 */
  AND (:q IS NULL OR h.hanbaiten_code LIKE :q_like OR h.hanbaiten_name LIKE :q_like)
ORDER BY h.hanbaiten_code ASC
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- `meta.has_more` は `(page * per_page) < total` で算出する。

### 4.4 レスポンス生成

- data 配列を含む JSON を返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
