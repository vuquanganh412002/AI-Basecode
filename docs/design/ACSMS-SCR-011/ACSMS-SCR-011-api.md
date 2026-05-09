---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-011
screen_name: 購読者情報登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-07
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/05/07
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/07 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者情報登録画面（ACSMS-SCR-011）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                |
| --- | -------------------- | ------------------------------------- |
| 1   | ACSMS-SCR-002        | 購読者明細検索画面 API設計書          |
| 2   | ACSMS-API-COMMON-001 | Get Prefecture List（都道府県取得）   |

※ 本画面の都道府県プルダウンは共用APIを使用する。
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — 定義元: ACSMS-SCR-009

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
| 8   | 画面固有     | NOT_FOUND             | 指定された購読者が見つかりません。                                     | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_EMAIL       | このメールアドレスは既に登録されています。                             | HTTP 400 |
| 10  | 画面固有     | INVALID_STATUS        | 承認待ちの読者ではありません。                                         | HTTP 400 |

---

# API ACSMS-API-011-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Dokusya Detail                                                                                                                                                                                         |
| 概要                   | 指定した購読者の詳細を取得する（編集モード用）                                                                                                                                                             |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                               |
| メソッド               | GET                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に購読者詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 取得対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | 購読者データ                                                                                                                                                  |
| 2   | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                                                                                                      |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                                                                                                    |
| 5   | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                                                                                                        |
| 6   | →kumiaiin_code               | String  | -        |              |          | 組合員コード（空文字許容）                                                                                                                                    |
| 7   | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）                                                                            |
| 8   | →tetsuzuki_shurui            | Number  | -        |              | -        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                                     |
| 9   | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | 電子版読者種別 ※m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'を参照（0:無料, 1:有料）                                                                        |
| 10  | →shimei_sei                  | String  | -        |              | -        | 氏名（姓）                                                                                                                                                    |
| 11  | →shimei_mei                  | String  | -        |              | -        | 氏名（名）                                                                                                                                                    |
| 12  | →shimei_kana_sei             | String  | -        |              | -        | 氏名かな（姓）                                                                                                                                                |
| 13  | →shimei_kana_mei             | String  | -        |              | -        | 氏名かな（名）                                                                                                                                                |
| 14  | →dokusya_busu                | Number  | -        |              | -        | 購読部数                                                                                                                                                      |
| 15  | →yubin_no                    | String  | -        |              | -        | 郵便番号                                                                                                                                                      |
| 16  | →todofuken_code              | String  | -        |              | -        | 都道府県コード                                                                                                                                                |
| 17  | →shikuchoson                 | String  | -        |              | -        | 市町村郡                                                                                                                                                      |
| 18  | →chome_banchi                | String  | -        |              | -        | 丁目番地                                                                                                                                                      |
| 19  | →tatemono_mei                | String  | -        |              |          | マンション名等（空文字許容）                                                                                                                                  |
| 20  | →renrakusaki_1               | String  | -        |              |          | 連絡先１（空文字許容）                                                                                                                                        |
| 21  | →renrakusaki_2               | String  | -        |              |          | 連絡先２（空文字許容）                                                                                                                                        |
| 22  | →email                       | String  | -        |              |          | メールアドレス（空文字許容）                                                                                                                                  |
| 23  | →mail_magazine_flg           | Number  | -        |              | -        | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                                                                    |
| 24  | →birth_year                  | Number  | -        |              | 〇       | 生年（西暦）                                                                                                                                                  |
| 25  | →gender                      | Number  | -        |              | 〇       | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）                                                                                     |
| 26  | →haitatsu_same_flg           | Boolean | -        |              | -        | 配達先情報指定（true:購読者と同じ）                                                                                                                           |
| 27  | →haitatsu_yubin_no           | String  | -        |              |          | 配達先郵便番号（空文字許容）                                                                                                                                  |
| 28  | →haitatsu_todofuken_code     | String  | -        |              |          | 配達先都道府県コード（空文字許容）                                                                                                                            |
| 29  | →haitatsu_shikuchoson        | String  | -        |              |          | 配達先市町村郡（空文字許容）                                                                                                                                  |
| 30  | →haitatsu_chome_banchi       | String  | -        |              |          | 配達先丁目番地（空文字許容）                                                                                                                                  |
| 31  | →haitatsu_tatemono_mei       | String  | -        |              |          | 配達先建物名（空文字許容）                                                                                                                                    |
| 32  | →haitatsu_renrakusaki_1      | String  | -        |              |          | 配達先連絡先１（空文字許容）                                                                                                                                  |
| 33  | →haitatsu_renrakusaki_2      | String  | -        |              |          | 配達先連絡先２（空文字許容）                                                                                                                                  |
| 34  | →haitatsu_shimei_sei         | String  | -        |              |          | 配達先氏名（姓・漢字）（空文字許容）                                                                                                                          |
| 35  | →haitatsu_shimei_mei         | String  | -        |              |          | 配達先氏名（名・漢字）（空文字許容）                                                                                                                          |
| 36  | →haitatsu_shimei_kana_sei    | String  | -        |              |          | 配達先氏名かな（姓）（空文字許容）                                                                                                                            |
| 37  | →haitatsu_shimei_kana_mei    | String  | -        |              |          | 配達先氏名かな（名）（空文字許容）                                                                                                                            |
| 38  | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                                                                                                                                      |
| 39  | →hanbaiten_name              | String  | -        |              | -        | 販売店名（m_hanbaiten結合取得）                                                                                                                               |
| 40  | →tanka_id                    | Number  | -        |              | -        | 単価ID                                                                                                                                                        |
| 41  | →tanka_name                  | String  | -        |              | -        | 単価名（m_tanka結合取得）                                                                                                                                     |
| 42  | →yubin_kubun                 | String  | -        |              | -        | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）                                                                                            |
| 43  | →shiharai_hoho               | Number  | -        |              | -        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）             |
| 44  | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | 購読料支払サイクル（月数）                                                                                                                                    |
| 45  | →bank_branch_code            | String  | -        |              | -        | 引落口座支店コード                                                                                                                                            |
| 46  | →bank_branch_name            | String  | -        |              | -        | 引落口座支店名                                                                                                                                                |
| 47  | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                                                                               |
| 48  | →hikiotoshi_koza_no          | String  | -        |              |          | 引落口座番号（空文字許容）                                                                                                                                    |
| 49  | →hikiotoshi_koza_meigi       | String  | -        |              |          | 引落口座名義（空文字許容）                                                                                                                                    |
| 50  | →dokusyaso_bunrui            | String  | -        |              |          | 購読者層分類（カンマ区切り、空文字許容）                                                                                                                      |
| 51  | →nogyosya_bunrui             | String  | -        |              |          | 農業者分類（カンマ区切り、空文字許容）                                                                                                                        |
| 52  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | 初回購読開始日                                                                                                                                                |
| 53  | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                                                                                    |
| 54  | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | 購読中止日                                                                                                                                                    |
| 55  | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | 読者情報変更適用日                                                                                                                                            |
| 56  | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | 請求開始月（空文字許容）                                                                                                                                      |
| 57  | →biko                        | String  | -        |              |          | 備考（空文字許容）                                                                                                                                            |
| 58  | →rireki_no                   | Number  | -        |              | -        | 履歴No（最新の履歴番号）                                                                                                                                      |
| 59  | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子申込承認ステータス（0:承認待ち, 1:承認済み, 2:否認）                                                                                                      |
| 60  | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                                                                                                                                      |
| 61  | →updated_at                  | String  | -        | ISO8601      | -        | 更新日時                                                                                                                                                      |

## リクエスト例

```
GET /api/v1/dokusya/1
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 1,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "hanbaiten_name": "山田販売店",
    "tanka_id": 1,
    "tanka_name": "基本購読料（月額）",
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-01-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-04-01T10:00:00+09:00"
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

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - dokusya_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 (`BAD_REQUEST`) を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ参照可能（管轄JAの読者は不可）
  - JA_HONTEN（JA本店）：自JAのみ参照可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ参照可能（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 データ取得

- ログインユーザーのスコープを取得する。
- 以下のSQLを実行して購読者情報を取得する（販売店名・単価名を結合）。

```sql
SELECT d.*,
       h.hanbaiten_name,
       t.tanka_name
FROM t_dokusya d
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_tanka t ON t.tanka_id = d.tanka_id AND t.deleted_at IS NULL
WHERE d.dokusya_id = :dokusya_id
  AND d.ja_id = :ja_id
  AND d.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 レスポンス生成

- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-011-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 新しい購読者を登録する（t_dokusya + t_dokusya_rireki を1トランザクションで作成）                                                                                                                                                                           |
| URI                    | /api/v1/dokusya                                                                                                                                                                                                                                            |
| メソッド               | POST                                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                       |
| HTTPレスポンスコード   | 201:正常に購読者を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:このメールアドレスは既に登録されています, 500:システムエラーが発生しました                |

## リクエストパラメータ

| #   | パラメーターID            | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                              |
| --- | ------------------------- | ------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -        | -    |        |        | 管理支店ID                                                                                                                                        |
| 2   | shiten_id                 | Number  | -        | -    |        |        | 支店ID                                                                                                                                            |
| 3   | kumiaiin_code             | String  | -        | -    | 0      | 20     | 組合員コード                                                                                                                                      |
| 4   | dokusya_shubetsu          | Number  | -        | 〇   |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）                                                               |
| 5   | tetsuzuki_shurui          | Number  | -        | 〇   |        |        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                         |
| 6   | denshi_dokusya_shubetsu   | Number  | -        | -    |        |        | 電子版読者種別 ※m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'を参照（0:無料, 1:有料）                                                            |
| 7   | shimei_sei                | String  | -        | 〇   | 1      | 50     | 氏名（姓）                                                                                                                                        |
| 8   | shimei_mei                | String  | -        | 〇   | 1      | 50     | 氏名（名）                                                                                                                                        |
| 9   | shimei_kana_sei           | String  | -        | 〇   | 1      | 100    | 氏名かな（姓）                                                                                                                                    |
| 10  | shimei_kana_mei           | String  | -        | 〇   | 1      | 100    | 氏名かな（名）                                                                                                                                    |
| 11  | dokusya_busu              | Number  | -        | 〇   |        |        | 購読部数（解約時は0）                                                                                                                             |
| 12  | yubin_no                  | String  | -        | 〇   | 7      | 7      | 郵便番号（半角数字7桁）                                                                                                                           |
| 13  | todofuken_code            | String  | -        | 〇   | 2      | 2      | 都道府県コード                                                                                                                                    |
| 14  | shikuchoson               | String  | -        | 〇   | 1      | 100    | 市町村郡                                                                                                                                          |
| 15  | chome_banchi              | String  | -        | 〇   | 1      | 100    | 丁目番地                                                                                                                                          |
| 16  | tatemono_mei              | String  | -        | -    | 0      | 100    | マンション名等                                                                                                                                    |
| 17  | renrakusaki_1             | String  | -        | 〇   | 1      | 15     | 連絡先１（半角数字）                                                                                                                              |
| 18  | renrakusaki_2             | String  | -        | -    | 0      | 15     | 連絡先２（半角数字）                                                                                                                              |
| 19  | email                     | String  | -        | △   | 0      | 100    | メールアドレス（電子版/併読の場合は必須）                                                                                                         |
| 20  | mail_magazine_flg         | Number  | -        | -    |        |        | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                                                        |
| 21  | birth_year                | Number  | -        | -    |        |        | 生年（西暦）                                                                                                                                      |
| 22  | gender                    | Number  | -        | -    |        |        | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）                                                                         |
| 23  | haitatsu_same_flg         | Boolean | -        | 〇   |        |        | 配達先情報指定（true:購読者と同じ）                                                                                                               |
| 24  | haitatsu_yubin_no         | String  | -        | △   | 0      | 7      | 配達先郵便番号（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 25  | haitatsu_todofuken_code   | String  | -        | △   | 0      | 2      | 配達先都道府県コード（haitatsu_same_flg=falseの場合必須）                                                                                         |
| 26  | haitatsu_shikuchoson      | String  | -        | △   | 0      | 100    | 配達先市町村郡（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 27  | haitatsu_chome_banchi     | String  | -        | △   | 0      | 100    | 配達先丁目番地（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 28  | haitatsu_tatemono_mei     | String  | -        | -    | 0      | 100    | 配達先建物名                                                                                                                                      |
| 29  | haitatsu_renrakusaki_1    | String  | -        | -    | 0      | 15     | 配達先連絡先１                                                                                                                                    |
| 30  | haitatsu_renrakusaki_2    | String  | -        | -    | 0      | 15     | 配達先連絡先２                                                                                                                                    |
| 31  | haitatsu_shimei_sei       | String  | -        | △   | 0      | 50     | 配達先氏名（姓）                                                                                                                                  |
| 32  | haitatsu_shimei_mei       | String  | -        | △   | 0      | 50     | 配達先氏名（名）                                                                                                                                  |
| 33  | haitatsu_shimei_kana_sei  | String  | -        | △   | 0      | 100    | 配達先氏名かな（姓）                                                                                                                              |
| 34  | haitatsu_shimei_kana_mei  | String  | -        | △   | 0      | 100    | 配達先氏名かな（名）                                                                                                                              |
| 35  | hanbaiten_id              | Number  | -        | 〇   |        |        | 販売店ID                                                                                                                                          |
| 36  | tanka_id                  | Number  | -        | 〇   |        |        | 単価ID（tanka_type=1: 購読料）                                                                                                                    |
| 37  | yubin_kubun               | String  | -        | -    | 1      | 1      | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）。デフォルト: '0'                                                               |
| 38  | shiharai_hoho             | Number  | -        | 〇   |        |        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他） |
| 39  | dokusyaryo_shiharai_cycle | Number  | -        | -    |        |        | 購読料支払サイクル（月数）                                                                                                                        |
| 40  | bank_branch_code          | String  | -        | △   | 0      | 3      | 引落口座支店コード（口座引落時は必須）                                                                                                            |
| 41  | bank_branch_name          | String  | -        | △   | 0      | 100    | 引落口座支店名                                                                                                                                    |
| 42  | hikiotoshi_yokin_shubetsu | Number  | -        | △   |        |        | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                                                                   |
| 43  | hikiotoshi_koza_no        | String  | -        | △   | 0      | 10     | 引落口座番号                                                                                                                                      |
| 44  | hikiotoshi_koza_meigi     | String  | -        | △   | 0      | 50     | 引落口座名義                                                                                                                                      |
| 45  | dokusyaso_bunrui          | String  | -        | -    | 0      | 50     | 購読者層分類（カンマ区切り）                                                                                                                      |
| 46  | nogyosya_bunrui           | String  | -        | -    | 0      | 50     | 農業者分類（カンマ区切り）                                                                                                                        |
| 47  | dokusya_kaishi_date       | String  | -        | 〇   |        |        | 購読開始日（YYYY-MM-DD）                                                                                                                          |
| 48  | dokusya_chushi_date       | String  | -        | -    |        |        | 購読中止日（YYYY-MM-DD、解約時のみ）                                                                                                              |
| 49  | seikyu_kaishi_month       | String  | -        | △   | 0      | 6      | 請求開始月（YYYYMM、電子版/併読の場合）                                                                                                           |
| 50  | biko                      | String  | -        | -    | 0      | 500    | 備考                                                                                                                                              |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | 登録された購読者データ                                                                                                                                        |
| 2   | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                                                                                                      |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                                                                                                    |
| 5   | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                                                                                                        |
| 6   | →kumiaiin_code               | String  | -        |              |          | 組合員コード（空文字許容）                                                                                                                                    |
| 7   | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別                                                                                                                                                      |
| 8   | →tetsuzuki_shurui            | Number  | -        |              | -        | 手続種類                                                                                                                                                      |
| 9   | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | 電子版読者種別                                                                                                                                                |
| 10  | →shimei_sei                  | String  | -        |              | -        | 氏名（姓）                                                                                                                                                    |
| 11  | →shimei_mei                  | String  | -        |              | -        | 氏名（名）                                                                                                                                                    |
| 12  | →shimei_kana_sei             | String  | -        |              | -        | 氏名かな（姓）                                                                                                                                                |
| 13  | →shimei_kana_mei             | String  | -        |              | -        | 氏名かな（名）                                                                                                                                                |
| 14  | →dokusya_busu                | Number  | -        |              | -        | 購読部数                                                                                                                                                      |
| 15  | →yubin_no                    | String  | -        |              | -        | 郵便番号                                                                                                                                                      |
| 16  | →todofuken_code              | String  | -        |              | -        | 都道府県コード                                                                                                                                                |
| 17  | →shikuchoson                 | String  | -        |              | -        | 市町村郡                                                                                                                                                      |
| 18  | →chome_banchi                | String  | -        |              | -        | 丁目番地                                                                                                                                                      |
| 19  | →tatemono_mei                | String  | -        |              |          | マンション名等（空文字許容）                                                                                                                                  |
| 20  | →renrakusaki_1               | String  | -        |              |          | 連絡先１（空文字許容）                                                                                                                                        |
| 21  | →renrakusaki_2               | String  | -        |              |          | 連絡先２（空文字許容）                                                                                                                                        |
| 22  | →email                       | String  | -        |              |          | メールアドレス（空文字許容）                                                                                                                                  |
| 23  | →mail_magazine_flg           | Number  | -        |              | -        | メールマガジン                                                                                                                                                |
| 24  | →birth_year                  | Number  | -        |              | 〇       | 生年（西暦）                                                                                                                                                  |
| 25  | →gender                      | Number  | -        |              | 〇       | 性別                                                                                                                                                          |
| 26  | →haitatsu_same_flg           | Boolean | -        |              | -        | 配達先情報指定                                                                                                                                                |
| 27  | →haitatsu_yubin_no           | String  | -        |              |          | 配達先郵便番号（空文字許容）                                                                                                                                  |
| 28  | →haitatsu_todofuken_code     | String  | -        |              |          | 配達先都道府県コード（空文字許容）                                                                                                                            |
| 29  | →haitatsu_shikuchoson        | String  | -        |              |          | 配達先市町村郡（空文字許容）                                                                                                                                  |
| 30  | →haitatsu_chome_banchi       | String  | -        |              |          | 配達先丁目番地（空文字許容）                                                                                                                                  |
| 31  | →haitatsu_tatemono_mei       | String  | -        |              |          | 配達先建物名（空文字許容）                                                                                                                                    |
| 32  | →haitatsu_renrakusaki_1      | String  | -        |              |          | 配達先連絡先１（空文字許容）                                                                                                                                  |
| 33  | →haitatsu_renrakusaki_2      | String  | -        |              |          | 配達先連絡先２（空文字許容）                                                                                                                                  |
| 34  | →haitatsu_shimei_sei         | String  | -        |              |          | 配達先氏名（姓・漢字）（空文字許容）                                                                                                                          |
| 35  | →haitatsu_shimei_mei         | String  | -        |              |          | 配達先氏名（名・漢字）（空文字許容）                                                                                                                          |
| 36  | →haitatsu_shimei_kana_sei    | String  | -        |              |          | 配達先氏名かな（姓）（空文字許容）                                                                                                                            |
| 37  | →haitatsu_shimei_kana_mei    | String  | -        |              |          | 配達先氏名かな（名）（空文字許容）                                                                                                                            |
| 38  | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                                                                                                                                      |
| 39  | →tanka_id                    | Number  | -        |              | -        | 単価ID                                                                                                                                                        |
| 40  | →yubin_kubun                 | String  | -        |              | -        | 郵送区分                                                                                                                                                      |
| 41  | →shiharai_hoho               | Number  | -        |              | -        | 支払方法                                                                                                                                                      |
| 42  | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | 購読料支払サイクル（月数）                                                                                                                                    |
| 43  | →bank_branch_code            | String  | -        |              | -        | 引落口座支店コード                                                                                                                                            |
| 44  | →bank_branch_name            | String  | -        |              | -        | 引落口座支店名                                                                                                                                                |
| 45  | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | 引落口座貯金種目                                                                                                                                              |
| 46  | →hikiotoshi_koza_no          | String  | -        |              |          | 引落口座番号（空文字許容）                                                                                                                                    |
| 47  | →hikiotoshi_koza_meigi       | String  | -        |              |          | 引落口座名義（空文字許容）                                                                                                                                    |
| 48  | →dokusyaso_bunrui            | String  | -        |              |          | 購読者層分類（空文字許容）                                                                                                                                    |
| 49  | →nogyosya_bunrui             | String  | -        |              |          | 農業者分類（空文字許容）                                                                                                                                      |
| 50  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | 初回購読開始日                                                                                                                                                |
| 51  | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                                                                                    |
| 52  | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | 購読中止日                                                                                                                                                    |
| 53  | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | 読者情報変更適用日                                                                                                                                            |
| 54  | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | 請求開始月（空文字許容）                                                                                                                                      |
| 55  | →biko                        | String  | -        |              |          | 備考（空文字許容）                                                                                                                                            |
| 56  | →rireki_no                   | Number  | -        |              | -        | 履歴No                                                                                                                                                        |
| 57  | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子申込承認ステータス                                                                                                                                        |
| 58  | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                                                                                                                                      |
| 59  | →updated_at                  | String  | -        | ISO8601      | -        | 更新日時                                                                                                                                                      |

## リクエスト例

```json
POST /api/v1/dokusya
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 1,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-1",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_branch_code": "001",
  "bank_branch_name": "本店",
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "農業者",
  "nogyosya_bunrui": "水稲,野菜",
  "dokusya_kaishi_date": "2026-04-01",
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-05-07T10:00:00+09:00",
    "updated_at": "2026-05-07T10:00:00+09:00"
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "shimei_sei", "message": "必須項目です。" },
    { "field": "yubin_no", "message": "郵便番号は7桁で入力してください。" }
  ]
}
```

### 400 Bad Request（メールアドレス重複）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
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

> ※ 4.4 データ登録 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - shimei_sei / shimei_mei：必須、最大50文字
  - shimei_kana_sei / shimei_kana_mei：必須、最大100文字、ひらがな/カタカナ形式
  - dokusya_busu：必須、半角数字。解約時は0
  - yubin_no：必須、半角数字7桁
  - todofuken_code / shikuchoson / chome_banchi：必須
  - renrakusaki_1：必須、半角数字
  - email：電子版/併読の場合は必須、形式チェック
  - haitatsu_same_flg=falseの場合：haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_shimei_*, haitatsu_shimei_kana_* が必須
  - hanbaiten_id / tanka_id：必須
  - shiharai_hoho：必須。1（口座引落）の場合：bank_branch_code, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi が必須
  - dokusya_kaishi_date：必須、YYYY-MM-DD
  - seikyu_kaishi_month：電子版/併読の場合、YYYYMM形式
  - biko：500文字以内
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.create`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: `ja_id = user.ja_id`（サーバ側で自動設定。リクエストボディの ja_id は信頼しない）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 重複チェック（メールアドレス）

- メールアドレスが入力されている場合、以下の条件で重複を確認する。

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- 重複がある場合：HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 データ登録

- t_dokusya にレコードを INSERT する。
- t_dokusya_rireki に履歴レコードを INSERT する（rireki_no=1, saishin_data_flg=true）。
- フラグ設定ルール：
  - saishin_data_flg = true
  - shinki_flg = (tetsuzuki_shurui=1) ? true : false
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? true : false
  - zougen_hokoku_flg = true（新規登録は増減対象）
- 解約時は dokusya_busu=0 を強制する。

```sql
INSERT INTO t_dokusya (
  ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, rireki_no,
  denshi_shonin_status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  NULL, :seikyu_kaishi_month, :biko, 1,
  NULL,
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, henko_riyu,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status, hanbaiten_tekiyo_date,
  created_at, created_by
) VALUES (
  :dokusya_id, 1, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  NULL, :seikyu_kaishi_month, :biko, '',
  TRUE, TRUE, :shinki_flg, :kaiyaku_flg,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NOW(), :user_account_id
)
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
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 1,
        :dokusya_id, 't_dokusya',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：INSERT のため空文字列を設定する。
- `after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

### 4.6 レスポンス生成

- 登録されたデータを data オブジェクトとして返却する。HTTP 201。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 2,
        NULL, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Dokusya                                                                                                                                                                                                                                                                    |
| 概要                   | 指定した購読者を更新する（履歴追記方式：旧履歴の最新フラグfalse化 + 新履歴の追記）                                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                                                                                      |
| メソッド               | PUT                                                                                                                                                                                                                                                                               |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                              |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に購読者を更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 400:このメールアドレスは既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 更新対象の dokusya_id（パスパラメータ） |

※ リクエストボディはACSMS-API-011-002と同一構造。dokusya_id は変更不可（URLから取得）。

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造。

## リクエスト例

```json
PUT /api/v1/dokusya/100
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 2,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-2",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_branch_code": "001",
  "bank_branch_name": "本店",
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "農業者",
  "nogyosya_bunrui": "水稲,野菜",
  "dokusya_kaishi_date": "2026-04-01",
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 2,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-2",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 2,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-05-07T14:30:00+09:00"
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "shimei_sei", "message": "必須項目です。" }]
}
```

### 400 Bad Request（メールアドレス重複）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
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

> ※ 4.4 データ更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- リクエストボディ：ACSMS-API-011-002 と同様
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ更新可能
  - JA_HONTEN（JA本店）：自JAのみ更新可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ更新可能（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）
- ※ 電子版クレカ決済者・併読者は編集不可（業務ルール）。

### 4.3 対象レコードの存在確認 + メール重複チェック

- 対象レコードを取得（更新前データ取得）。

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- メールアドレスが変更されている場合、重複を確認する。

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND dokusya_id <> :dokusya_id
  AND deleted_at IS NULL
```

- 重複がある場合：HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 データ更新（履歴追記方式）

機能定義 15.3 に基づく3ステップ処理：

#### ステップ1：旧レコードの最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコードの追加 + t_dokusya 本体の更新

- フラグ設定ルール（機能定義 14.2）：
  - saishin_data_flg = TRUE
  - shinki_flg = (tetsuzuki_shurui=1) ? TRUE : FALSE（再読時もTRUE）
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? TRUE : FALSE
  - zougen_hokoku_flg = (購読部数/販売店/住所変更時) ? TRUE : FALSE
- zenkai_* 列：更新前の対応する値を格納する（増減比較用）。

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, henko_riyu,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status, hanbaiten_tekiyo_date,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :shoki_dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  :joho_henko_tekiyo_date, :seikyu_kaishi_month, :biko, :henko_riyu,
  TRUE, :zougen_hokoku_flg, :shinki_flg, :kaiyaku_flg,
  :zenkai_hanbaiten_id, :zenkai_dokusya_busu, :zenkai_yubin_no,
  :zenkai_todofuken_code, :zenkai_shikuchoson, :zenkai_chome_banchi,
  :zenkai_tatemono_mei, :denshi_shonin_status, NULL,
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET kanri_shiten_id = :kanri_shiten_id,
    shiten_id = :shiten_id,
    kumiaiin_code = :kumiaiin_code,
    dokusya_shubetsu = :dokusya_shubetsu,
    tetsuzuki_shurui = :tetsuzuki_shurui,
    denshi_dokusya_shubetsu = :denshi_dokusya_shubetsu,
    shimei_sei = :shimei_sei,
    shimei_mei = :shimei_mei,
    shimei_kana_sei = :shimei_kana_sei,
    shimei_kana_mei = :shimei_kana_mei,
    dokusya_busu = :dokusya_busu,
    yubin_no = :yubin_no,
    todofuken_code = :todofuken_code,
    shikuchoson = :shikuchoson,
    chome_banchi = :chome_banchi,
    tatemono_mei = :tatemono_mei,
    renrakusaki_1 = :renrakusaki_1,
    renrakusaki_2 = :renrakusaki_2,
    email = :email,
    mail_magazine_flg = :mail_magazine_flg,
    birth_year = :birth_year,
    gender = :gender,
    haitatsu_same_flg = :haitatsu_same_flg,
    haitatsu_yubin_no = :haitatsu_yubin_no,
    haitatsu_todofuken_code = :haitatsu_todofuken_code,
    haitatsu_shikuchoson = :haitatsu_shikuchoson,
    haitatsu_chome_banchi = :haitatsu_chome_banchi,
    haitatsu_tatemono_mei = :haitatsu_tatemono_mei,
    haitatsu_renrakusaki_1 = :haitatsu_renrakusaki_1,
    haitatsu_renrakusaki_2 = :haitatsu_renrakusaki_2,
    haitatsu_shimei_sei = :haitatsu_shimei_sei,
    haitatsu_shimei_mei = :haitatsu_shimei_mei,
    haitatsu_shimei_kana_sei = :haitatsu_shimei_kana_sei,
    haitatsu_shimei_kana_mei = :haitatsu_shimei_kana_mei,
    hanbaiten_id = :hanbaiten_id,
    tanka_id = :tanka_id,
    yubin_kubun = :yubin_kubun,
    shiharai_hoho = :shiharai_hoho,
    dokusyaryo_shiharai_cycle = :dokusyaryo_shiharai_cycle,
    bank_branch_code = :bank_branch_code,
    bank_branch_name = :bank_branch_name,
    hikiotoshi_yokin_shubetsu = :hikiotoshi_yokin_shubetsu,
    hikiotoshi_koza_no = :hikiotoshi_koza_no,
    hikiotoshi_koza_meigi = :hikiotoshi_koza_meigi,
    dokusyaso_bunrui = :dokusyaso_bunrui,
    nogyosya_bunrui = :nogyosya_bunrui,
    dokusya_kaishi_date = :dokusya_kaishi_date,
    dokusya_chushi_date = :dokusya_chushi_date,
    joho_henko_tekiyo_date = :joho_henko_tekiyo_date,
    seikyu_kaishi_month = :seikyu_kaishi_month,
    biko = :biko,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

- 更新前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：更新前のデータをJSON形式で格納する。
- `after_value`：更新後のデータをJSON形式で格納する。

### 4.6 レスポンス生成

- 更新されたデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-004

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Approve Denshi Dokusya                                                                                                                                                                                                                                            |
| 概要                   | 電子版申込の購読者を承認する（denshi_shonin_status 0→1）。新規履歴レコードを作成。                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}/approve                                                                                                                                                                                                                              |
| メソッド               | PUT                                                                                                                                                                                                                                                               |
| リクエストボディー     | なし                                                                                                                                                                                                                                                              |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に承認しました, 400:承認待ちの読者ではありません, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 承認対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造（denshi_shonin_status=1 で返却）。

## リクエスト例

```
PUT /api/v1/dokusya/100/approve
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 1,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "承認しました。"
}
```

## レスポンス失敗例

### 400 Bad Request（ステータス不正）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
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

> ※ 4.4 ステータス更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ承認可能
  - JA_HONTEN（JA本店）：自JAのみ承認可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ承認可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 対象レコードの存在確認 + ステータスチェック

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- denshi_shonin_status が 0 でない場合：HTTP 400 (`INVALID_STATUS`)

### 4.4 ステータス更新（履歴追記方式）

#### ステップ1：旧履歴の最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコード INSERT + t_dokusya UPDATE

- 履歴レコードは現在の購読者情報をコピーし、denshi_shonin_status=1 に設定。saishin_data_flg=TRUE。

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- 4.3 で取得した現データを全コピー
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  henko_riyu,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  1,
  TRUE, FALSE, FALSE, FALSE,
  '電子版承認',
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 1,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：承認前のデータ（denshi_shonin_status=0）をJSON形式で格納する。
- `after_value`：承認後のデータ（denshi_shonin_status=1）をJSON形式で格納する。

### 4.6 レスポンス生成

- 承認後のデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-005

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Reject Denshi Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 電子版申込の購読者を否認する（denshi_shonin_status 0→2）。新規履歴レコードを作成。                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}/reject                                                                                                                                                                                                                               |
| メソッド               | PUT                                                                                                                                                                                                                                                               |
| リクエストボディー     | なし                                                                                                                                                                                                                                                              |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に否認しました, 400:承認待ちの読者ではありません, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 否認対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造（denshi_shonin_status=2 で返却）。

## リクエスト例

```
PUT /api/v1/dokusya/100/reject
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 2,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "否認しました。"
}
```

## レスポンス失敗例

### 400 Bad Request（ステータス不正）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
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

> ※ 4.4 ステータス更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ否認可能
  - JA_HONTEN（JA本店）：自JAのみ否認可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ否認可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 対象レコードの存在確認 + ステータスチェック

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- denshi_shonin_status が 0 でない場合：HTTP 400 (`INVALID_STATUS`)

### 4.4 ステータス更新（履歴追記方式）

#### ステップ1：旧履歴の最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコード INSERT + t_dokusya UPDATE

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- 4.3 で取得した現データを全コピー
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  henko_riyu,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  2,
  TRUE, FALSE, FALSE, FALSE,
  '電子版否認',
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 2,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：否認前のデータ（denshi_shonin_status=0）をJSON形式で格納する。
- `after_value`：否認後のデータ（denshi_shonin_status=2）をJSON形式で格納する。

### 4.6 レスポンス生成

- 否認後のデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-006

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Dokusya History                                                                                                                                                                                        |
| 概要                   | 指定した購読者の変更履歴一覧を取得する（履歴表示モーダル用）                                                                                                                                               |
| URI                    | /api/v1/dokusya/{dokusya_id}/history                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に履歴を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました       |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 取得対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                          |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------- |
| 1   | data                    | Array   | 〇       |              | -        | 履歴一覧（rireki_no DESC）                                    |
| 2   | →dokusya_rireki_id      | Number  | -        |              | -        | 購読者履歴ID                                                  |
| 3   | →dokusya_id             | Number  | -        |              | -        | 購読者ID                                                      |
| 4   | →rireki_no              | Number  | -        |              | -        | 履歴No                                                        |
| 5   | →tetsuzuki_shurui       | Number  | -        |              | -        | 手続種類（0:解約, 1:新規）                                    |
| 6   | →tetsuzuki_shurui_label | String  | -        |              | -        | 手続種類ラベル                                                |
| 7   | →henko_riyu             | String  | -        |              |          | 変更理由（空文字許容）                                        |
| 8   | →saishin_data_flg       | Boolean | -        |              | -        | 最新データフラグ                                              |
| 9   | →shinki_flg             | Boolean | -        |              | -        | 新規フラグ                                                    |
| 10  | →kaiyaku_flg            | Boolean | -        |              | -        | 解約フラグ                                                    |
| 11  | →zougen_hokoku_flg      | Boolean | -        |              | -        | 増減報告フラグ                                                |
| 12  | →denshi_shonin_status   | Number  | -        |              | 〇       | 電子申込承認ステータス                                        |
| 13  | →created_at             | String  | -        | ISO8601      | -        | 作成日時（履歴登録日時）                                      |
| 14  | →created_by             | String  | -        |              | -        | 作成者（履歴登録者）                                          |

## リクエスト例

```
GET /api/v1/dokusya/100/history
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_rireki_id": 200,
      "dokusya_id": 100,
      "rireki_no": 2,
      "tetsuzuki_shurui": 1,
      "tetsuzuki_shurui_label": "新規",
      "henko_riyu": "住所変更",
      "saishin_data_flg": true,
      "shinki_flg": false,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-05-07T14:30:00+09:00",
      "created_by": "user01"
    },
    {
      "dokusya_rireki_id": 100,
      "dokusya_id": 100,
      "rireki_no": 1,
      "tetsuzuki_shurui": 1,
      "tetsuzuki_shurui_label": "新規",
      "henko_riyu": "",
      "saishin_data_flg": false,
      "shinki_flg": true,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-04-01T10:00:00+09:00",
      "created_by": "user01"
    }
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

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ参照可能
  - JA_HONTEN（JA本店）：自JAのみ参照可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ参照可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 購読者の存在確認

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.4 履歴データ取得

```sql
SELECT dokusya_rireki_id, dokusya_id, rireki_no,
       tetsuzuki_shurui, henko_riyu,
       saishin_data_flg, shinki_flg, kaiyaku_flg, zougen_hokoku_flg,
       denshi_shonin_status,
       created_at, created_by
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
ORDER BY rireki_no DESC
```

### 4.5 レスポンス生成

- tetsuzuki_shurui 値をラベル（m_code.code_category='TETSUZUKI_SHURUI'）にマッピング。
- data 配列を含むJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
