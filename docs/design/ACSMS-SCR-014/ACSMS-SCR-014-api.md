---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-014
screen_name: 購読者明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-22
created_date: 2026/05/22
created_by: Nguyen Duyen Manh
updated_date: 2026/05/22
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者            | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ----------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/22 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者明細検索画面（ACSMS-SCR-014）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                                                                            |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024                            |
| 2   | ACSMS-API-COMMON-006 | Get Shiten Dropdown (`GET /api/v1/shiten/dropdown`) — 定義元: ACSMS-SCR-015                                        |
| 3   | ACSMS-API-COMMON-007 | Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 定義元: ACSMS-SCR-015                                  |

※ 本画面の検索条件プルダウンは上記の共用APIを使用する（DataScopeは呼び出しアカウントに基づき自動適用）。
※ 「購読者情報登録」ボタンは ACSMS-SCR-005（購読者情報登録画面）へ画面遷移する（本画面ではAPIなし）。

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
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため削除できません。                               | HTTP 409 |
| 10  | 画面固有     | DOKUSYA_READ_ONLY     | この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用） | HTTP 403 |
| 11  | 画面固有     | EXPORT_LIMIT_EXCEEDED | 出力データ件数が30000件を超えています。                                | HTTP 409 |
| 12  | 画面固有     | EXPORT_NO_DATA        | 出力データがありません。                                               | HTTP 404 |

---

# API ACSMS-API-014-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Search Dokusya List                                                                                                                                                                                                                   |
| 概要                   | 購読者の明細検索を行う（検索条件・DataScope適用、ページネーション対応）                                                                                                                                                                |
| URI                    | /api/v1/dokusya                                                                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                                                   |
| リクエストボディー     | なし                                                                                                                                                                                                                                  |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に購読者一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID            | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | ------------------------- | ------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -        | -    |        |        | 管理支店ID（プルダウン）                                                                            |
| 2   | shiten_id                 | Number  | -        | -    |        |        | 支店ID（プルダウン、kanri_shiten_id 配下）                                                          |
| 3   | kumiaiin_code             | String  | -        | -    |        | 20     | 組合員コード（部分一致）                                                                            |
| 4   | bank_branch_code          | String  | -        | -    |        | 3      | 口座支店コード（部分一致）                                                                          |
| 5   | bank_branch_name          | String  | -        | -    |        | 100    | 口座支店名（部分一致）                                                                              |
| 6   | full_name                 | String  | -        | -    |        | 100    | 氏名（shimei_sei + shimei_mei の組み合わせ、部分一致）                                              |
| 7   | full_name_kana            | String  | -        | -    |        | 100    | かな氏名（shimei_kana_sei + shimei_kana_mei の組み合わせ、部分一致）                                |
| 8   | renrakusaki_1             | String  | -        | -    |        | 15     | 連絡先１（部分一致）                                                                                |
| 9   | haitatsu                  | String  | -        | -    |        | 200    | 配達先住所（todofuken + shikuchoson + chome_banchi + tatemono_mei の組み合わせ、部分一致）          |
| 10  | hanbaiten_id              | Number  | -        | -    |        |        | 配達販売店ID（プルダウン）                                                                          |
| 11  | email                     | String  | -        | -    |        | 100    | メールアドレス（部分一致、メール形式チェック）                                                      |
| 12  | seikyu_kaishi_month       | String  | -        | -    |        | 6      | 請求開始月（YYYYMM、部分一致）                                                                      |
| 13  | shoki_dokusya_kaishi_date | String  | -        | -    |        |        | 購読開始日（YYYY/MM/DD、相関チェック：開始 ≦ 終了）                                                 |
| 14  | dokusya_chushi_date       | String  | -        | -    |        |        | 購読中止日（YYYY/MM/DD、相関チェック：開始 ≦ 終了）                                                 |
| 15  | dokusya_shubetsu          | Number  | -        | -    |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）                 |
| 16  | joho_henko_tekiyo_date    | String  | -        | -    |        |        | 適用日（YYYY/MM/DD、空欄=最新データフラグ=1、入力時=変更適用日 ≦ 指定日のものを抽出）                |
| 17  | shiharai_hoho             | Number  | -        | -    |        |        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他） |
| 18  | tetsuzuki_shurui          | Number  | -        | -    |        |        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                            |
| 19  | denshi_shonin_status      | Number  | -        | -    |        |        | 電子版承認ステータス（NULL=Web申込以外, 0:未承認, 1:承認済み, 2:否認）                              |
| 20  | page                      | Number  | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                         |
| 21  | per_page                  | Number  | -        | -    |        |        | 1ページの件数（デフォルト: 20、最大: 100）                                                          |
| 22  | sort_by                   | String  | -        | -    |        |        | ソートカラム（kanri_shiten_id, shiten_id, kumiaiin_code, hanbaiten_id, shoki_dokusya_kaishi_date, dokusya_chushi_date）。デフォルト: updated_at |
| 23  | sort_order                | String  | -        | -    |        |        | ソート順（asc / desc、デフォルト: desc）                                                            |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                       |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | -------------------------------------------------------------------------- |
| 1   | data                         | Array   | ○        |              | -        | 購読者一覧                                                                 |
| 2   | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                   |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                      |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                 |
| 5   | →kanri_shiten_name           | String  | -        |              | 〇       | 管理支店名                                                                 |
| 6   | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                     |
| 7   | →shiten_name                 | String  | -        |              | 〇       | 支店名                                                                     |
| 8   | →kumiaiin_code               | String  | -        |              | -        | 組合員コード（空文字許容）                                                 |
| 9   | →full_name                   | String  | -        |              | -        | 氏名（shimei_sei + " " + shimei_mei）                                      |
| 10  | →full_name_kana              | String  | -        |              | -        | かな氏名（shimei_kana_sei + " " + shimei_kana_mei）                        |
| 11  | →renrakusaki_1               | String  | -        |              | -        | 連絡先１（空文字許容）                                                     |
| 12  | →renrakusaki_2               | String  | -        |              | -        | 連絡先２（空文字許容）                                                     |
| 13  | →haitatsu_yubin_no           | String  | -        |              | -        | 配達先郵便番号（空文字許容）                                               |
| 14  | →haitatsu                    | String  | -        |              | -        | 配達先住所（todofuken_name + shikuchoson + chome_banchi + tatemono_mei）   |
| 15  | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                                                   |
| 16  | →hanbaiten_name              | String  | -        |              | -        | 販売店名                                                                   |
| 17  | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読） |
| 18  | →shiharai_hoho               | Number  | -        |              | -        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照                       |
| 19  | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子版承認ステータス（NULL=Web申込以外, 0:未承認, 1:承認済み, 2:否認）     |
| 20  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY/MM/DD   | -        | 初回購読開始日                                                             |
| 21  | →dokusya_chushi_date         | String  | -        | YYYY/MM/DD   | 〇       | 購読中止日                                                                 |
| 22  | →is_read_only                | Boolean | -        |              | -        | 編集・削除不可フラグ（true=電子版クレジットカード決済者または併読者）        |
| 23  | meta                         | Object  | -        |              | -        | ページネーション情報                                                       |
| 24  | →total                       | Number  | -        |              | -        | 総件数                                                                     |
| 25  | →page                        | Number  | -        |              | -        | 現在ページ番号                                                             |
| 26  | →per_page                    | Number  | -        |              | -        | 1ページの件数                                                              |
| 27  | →total_pages                 | Number  | -        |              | -        | 総ページ数                                                                 |

## リクエスト例

```
GET /api/v1/dokusya?kanri_shiten_id=10&shiten_id=21&dokusya_shubetsu=1&page=1&per_page=20&sort_by=updated_at&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_id": 1001,
      "ja_id": 1,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "中央管理支店",
      "shiten_id": 21,
      "shiten_name": "渋谷支店",
      "kumiaiin_code": "K000001",
      "full_name": "山田 太郎",
      "full_name_kana": "ヤマダ タロウ",
      "renrakusaki_1": "03-1234-5678",
      "renrakusaki_2": "",
      "haitatsu_yubin_no": "1500001",
      "haitatsu": "東京都渋谷区神宮前1-1-1 渋谷マンション101",
      "hanbaiten_id": 501,
      "hanbaiten_name": "渋谷販売店",
      "dokusya_shubetsu": 1,
      "shiharai_hoho": 1,
      "denshi_shonin_status": null,
      "shoki_dokusya_kaishi_date": "2024/04/01",
      "dokusya_chushi_date": null,
      "is_read_only": false
    },
    {
      "dokusya_id": 1002,
      "ja_id": 1,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "中央管理支店",
      "shiten_id": 21,
      "shiten_name": "渋谷支店",
      "kumiaiin_code": "K000002",
      "full_name": "佐藤 花子",
      "full_name_kana": "サトウ ハナコ",
      "renrakusaki_1": "03-9876-5432",
      "renrakusaki_2": "",
      "haitatsu_yubin_no": "1500002",
      "haitatsu": "東京都渋谷区神宮前2-2-2",
      "hanbaiten_id": 502,
      "hanbaiten_name": "原宿販売店",
      "dokusya_shubetsu": 2,
      "shiharai_hoho": 6,
      "denshi_shonin_status": 1,
      "shoki_dokusya_kaishi_date": "2025/01/15",
      "dokusya_chushi_date": null,
      "is_read_only": true
    }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "per_page": 20,
    "total_pages": 13
  }
}
```

## レスポンス失敗例

### 400 Validation Error（メール形式エラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "email", "message": "正しいメール形式を入力してください。" }
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
  - kanri_shiten_id / shiten_id / hanbaiten_id：数値型チェック
  - kumiaiin_code：最大20文字
  - bank_branch_code：最大3文字
  - bank_branch_name：最大100文字
  - full_name / full_name_kana / haitatsu：最大100文字（haitatsu は最大200文字）
  - renrakusaki_1：最大15文字
  - email：最大100文字、メール形式チェック（不正の場合、`VALIDATION_ERROR` + `errors[]` に `正しいメール形式を入力してください。` を含める）
  - seikyu_kaishi_month：最大6文字
  - shoki_dokusya_kaishi_date / dokusya_chushi_date / joho_henko_tekiyo_date：有効な日付形式（YYYY/MM/DD）
  - dokusya_shubetsu：1〜3 または未指定
  - shiharai_hoho：1〜6, 9 または未指定
  - tetsuzuki_shurui：0 または 1 または未指定
  - denshi_shonin_status：0〜2 または未指定
  - page：1以上
  - per_page：1〜100
  - sort_by：許可カラム一覧に含まれるか確認（kanri_shiten_id, shiten_id, kumiaiin_code, hanbaiten_id, shoki_dokusya_kaishi_date, dokusya_chushi_date, updated_at）
  - sort_order：`asc` または `desc`
- デフォルト値を設定する（page=1, per_page=20, sort_by=updated_at, sort_order=desc）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：自中央会管轄JAの購読者のみ参照可能（`d.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_id = :user_chuokai_id)`）
  - `JA_HONTEN`：自JAの購読者のみ参照可能（`d.ja_id = :user_ja_id`）
  - `JA_KANRI_SHITEN`：自管理支店の購読者のみ参照可能（`d.ja_id = :user_ja_id AND d.kanri_shiten_id = :user_kanri_shiten_id`）
- DataScope違反（他JA・他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id, chuokai_id）を取得する。
- DataScope を role_code により適用する（4.2 参照）。
- 検索条件を追加する：
  - kanri_shiten_id 指定時：`d.kanri_shiten_id = :kanri_shiten_id`
  - shiten_id 指定時：`d.shiten_id = :shiten_id`
  - kumiaiin_code 指定時：`d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'`
  - bank_branch_code / bank_branch_name 指定時：それぞれ部分一致（ILIKE）
  - full_name 指定時：`(d.shimei_sei || ' ' || d.shimei_mei) ILIKE '%' || :full_name || '%'`
  - full_name_kana 指定時：`(d.shimei_kana_sei || ' ' || d.shimei_kana_mei) ILIKE '%' || :full_name_kana || '%'`
  - renrakusaki_1 指定時：部分一致
  - haitatsu 指定時：配達先住所の連結文字列に部分一致
  - hanbaiten_id 指定時：`d.hanbaiten_id = :hanbaiten_id`
  - email 指定時：部分一致
  - seikyu_kaishi_month 指定時：部分一致
  - shoki_dokusya_kaishi_date 指定時：`d.shoki_dokusya_kaishi_date >= :shoki_dokusya_kaishi_date`（範囲指定の場合は別途）
  - dokusya_chushi_date 指定時：`d.dokusya_chushi_date <= :dokusya_chushi_date`
  - dokusya_shubetsu / shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status 指定時：それぞれ等価条件
- 適用日（joho_henko_tekiyo_date）の処理：
  - 空欄の場合：購読者履歴の最新データフラグ（saishin_data_flg=TRUE）のレコードを抽出
  - 入力されている場合：購読者履歴の変更適用日（joho_henko_tekiyo_date）<= 指定日のうち最新のレコードを抽出

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_dokusya d
LEFT JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s ON s.shiten_id = d.shiten_id AND s.deleted_at IS NULL
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
WHERE d.deleted_at IS NULL
  /* DataScope: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN */
  AND d.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
  /* 検索条件 */
  AND (:kanri_shiten_id IS NULL OR d.kanri_shiten_id = :kanri_shiten_id)
  AND (:shiten_id IS NULL OR d.shiten_id = :shiten_id)
  AND (:kumiaiin_code IS NULL OR d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%')
  AND (:full_name IS NULL OR (d.shimei_sei || ' ' || d.shimei_mei) ILIKE '%' || :full_name || '%')
  AND (:dokusya_shubetsu IS NULL OR d.dokusya_shubetsu = :dokusya_shubetsu)
  /* ... 他の検索条件は省略 */
```

### 4.5 データ取得

```sql
SELECT d.dokusya_id, d.ja_id,
       d.kanri_shiten_id, ks.kanri_shiten_name,
       d.shiten_id, s.shiten_name,
       d.kumiaiin_code,
       (d.shimei_sei || ' ' || d.shimei_mei) AS full_name,
       (d.shimei_kana_sei || ' ' || d.shimei_kana_mei) AS full_name_kana,
       d.renrakusaki_1, d.renrakusaki_2,
       d.haitatsu_yubin_no,
       (COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) AS haitatsu,
       d.hanbaiten_id, h.hanbaiten_name,
       d.dokusya_shubetsu, d.shiharai_hoho, d.denshi_shonin_status,
       d.shoki_dokusya_kaishi_date, d.dokusya_chushi_date,
       /* is_read_only: 電子版クレジットカード決済者（dokusya_shubetsu=2 AND shiharai_hoho=6）または併読者（dokusya_shubetsu=3） */
       (
         (d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6)
         OR d.dokusya_shubetsu = 3
       ) AS is_read_only
FROM t_dokusya d
LEFT JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s ON s.shiten_id = d.shiten_id AND s.deleted_at IS NULL
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_todofuken t ON t.todofuken_code = d.haitatsu_todofuken_code
WHERE d.deleted_at IS NULL
  /* DataScope + 検索条件 は 4.4 と同じ */
ORDER BY :sort_by :sort_order
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- 適用日（joho_henko_tekiyo_date）が入力されている場合は、`t_dokusya_rireki` から該当時点の最新レコードを取得する（履歴テーブルへの JOIN または CTE で実装）。

### 4.6 レスポンス生成

- 取得結果を data 配列として返却する。
- `meta` オブジェクトにページネーション情報（total / page / per_page / total_pages）を含める。
- `is_read_only` フラグは BE 側で算出し、FE 側で「編集」「削除」ボタンの活性制御に使用する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-014-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 指定した購読者を論理削除する                                                                                                                                                                                                                               |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                                                               |
| メソッド               | DELETE                                                                                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:購読者を削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 403:この購読者は編集・削除できません, 404:指定された購読者が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 削除対象のdokusya_id（パスパラメータ）     |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------------- |
| 1   | message | String | -        |              | -        | 削除完了メッセージ   |

## リクエスト例

```
DELETE /api/v1/dokusya/1001
```

## レスポンス成功例

```json
{
  "message": "購読者を削除しました。"
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

### 403 Dokusya Read Only

```json
{
  "error_code": "DOKUSYA_READ_ONLY",
  "message": "この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 409 Conflict（関連データあり）

```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため削除できません。"
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

> ※ 4.4 論理削除の実行 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - dokusya_id：数値型チェック、必須チェック
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.delete`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：自中央会管轄JAの購読者のみ削除可能
  - `JA_HONTEN`：自JAの購読者のみ削除可能
  - `JA_KANRI_SHITEN`：自管理支店の購読者のみ削除可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽のため404を返却）

### 4.3 対象レコードの存在確認 + 読み取り専用チェック + 関連データ確認

- 対象レコードの存在確認とロール別ルール（電子版クレカ決済者・併読者は削除不可）を確認する。

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id, shiten_id,
       kumiaiin_code, shimei_sei, shimei_mei,
       dokusya_shubetsu, shiharai_hoho,
       hanbaiten_id, tanka_id,
       created_at, updated_at
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- 読み取り専用判定（`(dokusya_shubetsu = 2 AND shiharai_hoho = 6) OR dokusya_shubetsu = 3`）が真の場合：HTTP 403 (`DOKUSYA_READ_ONLY`)
- 関連データの存在確認（将来の拡張に備えた整合性チェック）：関連テーブルに購読者IDが紐づくレコードが存在する場合、削除を拒否する。
  - 関連データが存在する場合：HTTP 409 (`CONFLICT`)

### 4.4 論理削除の実行

```sql
UPDATE t_dokusya
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL
```

### 4.5 操作ログ記録

- 削除前データ（4.3 のSELECT結果）を `before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'DELETE', 1,
        :dokusya_id, 't_dokusya', :before_value_json, '',
        :ip_address, :user_agent)
```

**before_value 例:**

```
`before_value`：削除前のデータをJSON形式で格納する。
`after_value`：DELETE のため空文字列を設定する。

{
  "dokusya_id": 1001,
  "ja_id": 1,
  "kanri_shiten_id": 10,
  "shiten_id": 21,
  "kumiaiin_code": "K000001",
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "dokusya_shubetsu": 1,
  "shiharai_hoho": 1,
  "hanbaiten_id": 501,
  "tanka_id": 1
}
```

### 4.6 レスポンス生成

- 削除完了メッセージを返却する。HTTP 200。

```json
{ "message": "購読者を削除しました。" }
```

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'DELETE', 2,
        :dokusya_id, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-014-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Dokusya Excel                                                                                                                                                                                                                                       |
| 概要                   | 現在の検索条件で購読者一覧をExcel形式で出力する（最大30,000件、超過時は409エラー）                                                                                                                                                                         |
| URI                    | /api/v1/dokusya/export                                                                                                                                                                                                                                     |
| メソッド               | GET                                                                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | クエリパラメータ（ACSMS-API-014-001 と同じ検索条件、page / per_page / sort_by / sort_order は無視）                                                                                                                                                        |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常にExcelをダウンロードしました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:出力データがありません, 409:出力データ件数が30000件を超えています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                       |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------- |
| 1   | （ACSMS-API-014-001 と同じ検索条件パラメータ。page / per_page / sort_by / sort_order を除く） | | | | | | |

## レスポンスデータ

Excelファイル（`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）

### レスポンスヘッダ

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="dokusya_export_YYYYMMDD_HHmmss.xlsx"
```

### Excelフォーマット

| 列順 | カラム名             | 説明                       |
| ---- | -------------------- | -------------------------- |
| 1    | 購読者ID             | dokusya_id                 |
| 2    | 管理支店             | kanri_shiten_name          |
| 3    | 支店                 | shiten_name                |
| 4    | 組合員コード         | kumiaiin_code              |
| 5    | 氏名                 | full_name                  |
| 6    | かな氏名             | full_name_kana             |
| 7    | 連絡先１             | renrakusaki_1              |
| 8    | 連絡先２             | renrakusaki_2              |
| 9    | 配達先郵便番号       | haitatsu_yubin_no          |
| 10   | 配達先住所           | haitatsu                   |
| 11   | 販売店コード         | hanbaiten_id               |
| 12   | 販売店名             | hanbaiten_name             |
| 13   | 購読種別             | dokusya_shubetsu (ラベル)  |
| 14   | 支払方法             | shiharai_hoho (ラベル)     |
| 15   | 初回購読開始日       | shoki_dokusya_kaishi_date  |
| 16   | 購読中止日           | dokusya_chushi_date        |

## リクエスト例

```
GET /api/v1/dokusya/export?kanri_shiten_id=10&dokusya_shubetsu=1
```

## レスポンス成功例

Excelファイル（バイナリ）を返却する。HTTP 200。

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

### 404 Export No Data

```json
{
  "error_code": "EXPORT_NO_DATA",
  "message": "出力データがありません。"
}
```

### 409 Export Limit Exceeded

```json
{
  "error_code": "EXPORT_LIMIT_EXCEEDED",
  "message": "出力データ件数が30000件を超えています。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Excel出力に失敗しました。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- クエリパラメータの検証：ACSMS-API-014-001 と同じ検索条件（page / per_page / sort_by / sort_order は無視）。
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: ACSMS-API-014-001 と同じ（CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN 別の範囲制限）
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ件数チェック（30,000件上限）

- 検索条件で対象件数を先にカウントする（DataScope適用）。

```sql
SELECT COUNT(*)
FROM t_dokusya d
LEFT JOIN m_account a ON a.account_id = d.created_by AND a.deleted_at IS NULL
WHERE d.deleted_at IS NULL
  /* DataScope: 4.2 と同じ */
  AND d.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
  /* 検索条件: ACSMS-API-014-001 4.4 と同じ */
```

- 件数が 0 の場合：HTTP 404 (`EXPORT_NO_DATA`)
- 件数が 30,000 を超える場合：HTTP 409 (`EXPORT_LIMIT_EXCEEDED`)

### 4.4 データ取得

- ACSMS-API-014-001 4.5 と同じ SELECT 文を使用する（pagination なし、LIMIT 30000）。

```sql
SELECT d.dokusya_id, d.ja_id,
       d.kanri_shiten_id, ks.kanri_shiten_name,
       d.shiten_id, s.shiten_name,
       d.kumiaiin_code,
       (d.shimei_sei || ' ' || d.shimei_mei) AS full_name,
       /* ... ACSMS-API-014-001 4.5 と同じ */
FROM t_dokusya d
/* ... 同じ JOIN / WHERE / ORDER BY */
LIMIT 30000
```

### 4.5 Excel生成

- ファイル名：`dokusya_export_YYYYMMDD_HHmmss.xlsx`（現在日時、JST）
- 文字コード：UTF-8
- ヘッダー行：`購読者ID, 管理支店, 支店, 組合員コード, 氏名, かな氏名, 連絡先１, 連絡先２, 配達先郵便番号, 配達先住所, 販売店コード, 販売店名, 購読種別, 支払方法, 初回購読開始日, 購読中止日`
- dokusya_shubetsu / shiharai_hoho をラベルにマッピング（`m_code` から取得）
- 日付を `YYYY/MM/DD` 形式でフォーマットする

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'EXPORT_EXCEL', 1,
        NULL, 't_dokusya', '', :after_value_json,
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：エクスポート条件と件数をJSON形式で格納する。

{
  "kanri_shiten_id": 10,
  "shiten_id": null,
  "dokusya_shubetsu": 1,
  "record_count": 250
}
```

### 4.7 レスポンス生成

- Excel ファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="dokusya_export_YYYYMMDD_HHmmss.xlsx"`

### 4.8 例外処理

- DB接続エラー・Excel生成エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`、メッセージ `Excel出力に失敗しました。`）
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'EXPORT_EXCEL', 2,
        NULL, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```
