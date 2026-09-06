---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-018
screen_name: 販売店明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-16
created_date: 2026/04/16
created_by: Dao Van Thang
updated_date: 2026/08/24
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/16 | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/18 | 1.2  | Dao Van Thang | 画面設計書 v1.2 対応：検索条件「廃店フラグ」追加（デフォルトは廃店=false のレコードのみ表示）、一覧レスポンスに「都道府県」（m_todofuken JOIN による todofuken_name）追加、列ラベルを「手数料区分」→「振込手数料負担区分」、「支払区分」→「配達手数料支払サイクル」に変更 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/07/17 | 1.3  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：失効単価参照フィルタ `inactive_tanka_flg`（真偽・失効のみ）を **有効単価フラグ `active_tanka_flg`（トライステート：true=有効単価参照のみ / false=失効単価参照のみ / 省略=両方）** へ変更。UI を単価一覧(SCR-006)と同一のラジオ（有効/無効）に統一。SCR-021 の失効単価エラーからの導線(`?inactive_tanka=1`)は「無効(false)」で初期選択。非相関サブクエリの active_flg はパラメータバインド。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/08/24 | 1.4  | Tran Duc Tuyen | 顧客CR：`haiten_flg` の検索仕様を 2026-05-26 の完全一致方式（`true`=廃店のみ表示）から「含む」方式（`true`=廃店も含めて全件表示）へ再変更。チェックボックスラベルも「廃店フラグ」→「廃店を含む」に戻す。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/08/24 | 1.5  | Tran Duc Tuyen | 顧客CR：`GET /api/v1/hanbaiten/export`（ACSMS-API-018-003）を新規追加。検索条件で絞り込んだ販売店一覧をExcel出力する（最大5,000件、0件→404 `EXPORT_NO_DATA`、超過→409 `EXPORT_LIMIT_EXCEEDED`）。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「販売店明細検索画面（ACSMS-SCR-018）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード             | 資料名                                       |
| --- | ---------------------- | -------------------------------------------- |
| 1   | ACSMS-SCR-017          | 販売店情報登録画面 API設計書                 |
| 2   | ACSMS-API-COMMON-001   | Get Prefecture List（都道府県プルダウン取得） |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400|
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 8   | 画面固有     | NOT_FOUND   | 指定された販売店が見つかりません。                                     | HTTP 404 |
| 9   | 画面固有     | CONFLICT      | この販売店は関連オブジェクトに紐づいているため削除できません。         | HTTP 409（ACSMS-MSG-018-004 を画面側へ表示） |

---

# API ACSMS-API-018-001

## 概要

| 項目                   | 内容                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Hanbaiten List                                                                                                                                                                             |
| 概要                   | 販売店マスタの一覧を検索条件・ページネーション・ソートで取得する                                                                                                                               |
| URI                    | /api/v1/hanbaiten                                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                            |
| リクエストボディー     | なし                                                                                                                                                                                           |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                         |
| HTTPレスポンスコード   | 200:正常に販売店一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                               |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                            |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------- |
| 1   | hanbaiten_code | String  | -        | -    |        | 10     | 販売店コード（部分一致検索）                                                                     |
| 2   | hanbaiten_name | String  | -        | -    |        | 100    | 販売店名（部分一致検索）                                                                         |
| 3   | tel            | String  | -        | -    |        | 15     | 電話番号（部分一致検索）                                                                         |
| 4   | fax            | String  | -        | -    |        | 15     | FAX番号（部分一致検索）                                                                          |
| 5   | address        | String  | -        | -    |        | 200    | 住所（部分一致検索）                                                                             |
| 6   | shocho_name    | String  | -        | -    |        | 50     | 所長名（部分一致検索）                                                                           |
| 6.5 | ja_id          | Number  | -        | -    |        |        | JA絞り込み（NICHINO_STAFF 代行入力 専用）。セッションが JA スコープ役（CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN）の場合は無視され session.ja_id が優先される。1以上の整数。 |
| 7   | haiten_flg     | Boolean | -        | -    |        |        | 廃店を含む（`true`=廃店も含めて全件表示、`false`=営業中のレコードのみ表示）。**省略時は false（営業中のみ表示、廃店フラグが立っているレコードは一覧に表示しない）**。`true`は「廃店のみに絞り込む」ではなく「廃店も含む」（顧客CR 2026-08-24：2026-05-26の完全一致仕様＋ラベル「廃店フラグ」を撤回し、ラベル「廃店を含む」＋含む方式に戻す）。画面設計書 v1.2 §1.1 / §2.1 参照 |
| 7.5 | active_tanka_flg | Boolean | -    | -    |        |        | 有効単価フラグ（SCR-021 error gate 連携・顧客要件2026-07 改訂）。単価一覧(SCR-006)と同一のトライステート: `true`=有効単価(active_flg=TRUE)を参照する販売店のみ、`false`=失効単価(active_flg=FALSE)を参照する販売店のみ、省略=両方。参照する配達手数料単価は m_hanbaiten.haitatsuryo_tanka_id → m_tanka.tanka_type=2。配達手数料出力(SCR-021)の失効単価エラーからは `false`(無効)で初期選択される |
| 8   | page           | Number  | -        | -    |        |        | ページ番号（1始まり）。デフォルト: 1                                                              |
| 9   | per_page       | Number  | -        | -    |        |        | 1ページあたりの件数（1〜100）。デフォルト: 20                                                     |
| 10  | sort_by        | String  | -        | -    |        |        | ソート対象カラム（hanbaiten_code, hanbaiten_name, updated_at）。デフォルト: updated_at（最終更新が新しい順）。updated_at は画面のソートヘッダではなく既定の並び順（新規作成・取込・更新直後の行を先頭に表示） |
| 11  | sort_order     | String  | -        | -    |        |        | ソート順（asc, desc）。デフォルト: desc（最終更新が新しい順）                                     |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | --------------------------------------------- |
| 1   | data                         | Array   | 〇       |              | -        | 販売店データの配列                             |
| 2   | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                       |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                          |
| 3.1 | →ja_code                     | String  | -        |              | -        | JAコード（m_ja からの一括ルックアップ。存在しない場合は空文字列） |
| 3.2 | →ja_name                     | String  | -        |              | -        | JA名（m_ja からの一括ルックアップ。存在しない場合は空文字列）    |
| 4   | →hanbaiten_code              | String  | -        |              | -        | 販売店コード                                   |
| 5   | →hanbaiten_name              | String  | -        |              | -        | 販売店名                                       |
| 6   | →todofuken_code              | String  | -        |              | -        | 都道府県コード（m_hanbaiten.todofuken_code、2桁） |
| 7   | →todofuken_name              | String  | -        |              | -        | 都道府県名（m_todofuken JOIN による表示用。一覧では本項目を「都道府県」列に表示する） |
| 8   | →yubin_no                    | String  | -        |              | -        | 郵便番号                                       |
| 9   | →address                     | String  | -        |              | -        | 住所                                           |
| 10  | →tel                         | String  | -        |              | -        | 電話番号                                       |
| 11  | →fax                         | String  | -        |              | -        | FAX番号                                        |
| 12  | →shocho_name                 | String  | -        |              | -        | 所長名                                         |
| 13  | →itaku_kubun                 | Number  | -        |              | 〇       | 委託区分（※m_code.code_category='ITAKU_KUBUN'を参照、1:振込, 2:日農委託, 9:その他） |
| 14  | →haitatsuryo_shiharai_cycle  | Number  | -        |              | 〇       | 配達手数料支払サイクル（月数）。一覧では「配達手数料支払サイクル」列に表示する |
| 15  | →furikomi_tesuryo_futan_kubun               | Number  | -        |              | 〇       | 振込手数料負担区分（※m_code.code_category='TESURYO_KUBUN'を参照、1:JA, 2:販売店）。一覧では「振込手数料負担区分」列に表示する |
| 16  | →furikomi_tesuryo              | Number  | -        |              | 〇       | 振込手数料                                      |
| 17  | →haiten_flg                  | Boolean | -        |              | -        | 廃店フラグ（true:廃店, false:営業中）          |
| 18  | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                        |
| 19  | →updated_at                  | String  | -        | ISO8601      | 〇       | 更新日時                                        |
| 20  | meta                         | Object  | -        |              | -        | ページネーション情報                             |
| 21  | →total                       | Number  | -        |              | -        | 総件数                                          |
| 22  | →page                        | Number  | -        |              | -        | 現在のページ番号                                 |
| 23  | →per_page                    | Number  | -        |              | -        | 1ページあたりの件数                              |
| 24  | →total_pages                 | Number  | -        |              | -        | 総ページ数                                      |

## リクエスト例

```
GET /api/v1/hanbaiten?hanbaiten_name=山田&tel=03&haiten_flg=false&page=1&per_page=20&sort_by=hanbaiten_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "hanbaiten_id": 1,
      "ja_id": 1,
      "ja_code": "JA01001",
      "ja_name": "JA東京",
      "hanbaiten_code": "H001",
      "hanbaiten_name": "山田新聞販売店",
      "todofuken_code": "13",
      "todofuken_name": "東京都",
      "yubin_no": "1000001",
      "address": "東京都千代田区千代田1-1",
      "tel": "0312345678",
      "fax": "0312345679",
      "shocho_name": "山田太郎",
      "itaku_kubun": 1,
      "haitatsuryo_shiharai_cycle": 1,
      "furikomi_tesuryo_futan_kubun": 1,
      "furikomi_tesuryo": 500,
      "haiten_flg": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "hanbaiten_id": 2,
      "ja_id": 1,
      "ja_code": "JA01001",
      "ja_name": "JA東京",
      "hanbaiten_code": "H002",
      "hanbaiten_name": "山田書店",
      "todofuken_code": "14",
      "todofuken_name": "神奈川県",
      "yubin_no": "1500001",
      "address": "神奈川県横浜市西区1-2-3",
      "tel": "0398765432",
      "fax": "0398765433",
      "shocho_name": "山田花子",
      "itaku_kubun": 2,
      "haitatsuryo_shiharai_cycle": 3,
      "furikomi_tesuryo_futan_kubun": 2,
      "furikomi_tesuryo": 300,
      "haiten_flg": false,
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": null
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
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
  - hanbaiten_code：最大10桁
  - hanbaiten_name：最大100桁
  - tel：最大15桁
  - fax：最大15桁
  - address：最大200桁
  - shocho_name：最大50桁
  - ja_id：1以上の整数（NICHINO_STAFF 代行入力 専用の絞り込み。JAスコープ役では無視される）
  - haiten_flg：Boolean型チェック。省略時は false（営業中のレコードのみ表示。廃店フラグが立っているレコードは一覧に表示しない）。`true`指定時は廃店も含めて全件表示（画面設計書 v1.2 §1.1 / §2.1、顧客CR 2026-08-24 参照）
  - active_tanka_flg：Boolean型チェック。省略時は絞り込まない（両方表示）
  - page：正の整数。デフォルト: 1
  - per_page：1〜100の整数。デフォルト: 20
  - sort_by：許可カラム（hanbaiten_code, hanbaiten_name, updated_at）のみ。画面のソートヘッダは hanbaiten_code / hanbaiten_name（画面設計書 v1.2 §8.1）、updated_at は既定の並び順専用。デフォルト: updated_at（最終更新が新しい順）。updated_at は新規作成・更新・取込のいずれの書き込みでも更新されるため、直近に操作した行が先頭に並ぶ。並び順には常に二次キー hanbaiten_id DESC を付与し、同一 updated_at（取込バッチ等）でも安定した順序となる
  - sort_order：asc または desc のみ。デフォルト: desc（最終更新が新しい順）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.view` または `hanbaiten.daiko_input` のいずれかを保持しているか確認する（OR条件）。
  - 対象ロール：NICHINO_STAFF（日農担当者）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（role_code, ja_id）。
- DataScope条件を構築する：
  - NICHINO_STAFF：ja_id フィルタなし（全JAの販売店にアクセス可能。販売店代行入力時はクエリパラメータ `ja_id` を指定して対象 JA を1つに絞り込める）
  - CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN：`ja_id = :ja_id`（自JAのみ。クエリパラメータ `ja_id` が指定されても無視される）
- 基本条件：
  - `deleted_at IS NULL`（論理削除除外：必須条件）
  - **`haiten_flg=true` が明示指定された場合はフィルタなし（営業中＋廃店の全件表示）、それ以外（省略時含む）は `haiten_flg = false`（営業中のレコードのみ表示、画面設計書 v1.2 §1.1 / §2.1、顧客CR 2026-08-24 参照）**
- 検索条件（指定時のみ追加）：
  - ja_id 指定時（NICHINO_STAFF 代行入力専用。JAスコープ役では無視される）：`ja_id = :ja_id`
  - hanbaiten_code 指定時：`hanbaiten_code ILIKE '%' || :hanbaiten_code || '%'`
  - hanbaiten_name 指定時：`hanbaiten_name ILIKE '%' || :hanbaiten_name || '%'`
  - tel 指定時：`tel ILIKE '%' || :tel || '%'`
  - fax 指定時：`fax ILIKE '%' || :fax || '%'`
  - address 指定時：`address ILIKE '%' || :address || '%'`
  - shocho_name 指定時：`shocho_name ILIKE '%' || :shocho_name || '%'`
  - active_tanka_flg 指定時：`true`=参照する配達手数料単価が有効(active_flg=TRUE)の販売店のみ、`false`=失効(active_flg=FALSE)の販売店のみ抽出（省略時は絞り込まない）。非相関サブクエリ IN で判定する（getManyAndCount のページング経路を壊さず、pg-mem でも動作）。active_flg はパラメータ（`:activeTankaFlg`）でバインドする。`haitatsuryo_tanka_id` が NULL の販売店は `NULL IN (...)` が真にならず除外される。
    ```sql
    AND m.haitatsuryo_tanka_id IN (
      SELECT mti.tanka_id FROM m_tanka mti
       WHERE mti.tanka_type = 2
         AND mti.deleted_at IS NULL
         AND mti.active_flg = FALSE
    )
    ```
- 都道府県表示：`m_todofuken` を `LEFT JOIN`（`m_hanbaiten.todofuken_code = m_todofuken.todofuken_code`）し、`todofuken_name` を取得する。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM m_hanbaiten h
WHERE h.deleted_at IS NULL
  AND (:haiten_flg = TRUE OR h.haiten_flg = FALSE)
  AND (:role_code = 'NICHINO_STAFF' OR h.ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR h.hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR h.hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR h.tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR h.fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR h.address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR h.shocho_name ILIKE '%' || :shocho_name || '%')
  AND (:active_tanka_flg IS NULL OR h.haitatsuryo_tanka_id IN (
        SELECT mti.tanka_id FROM m_tanka mti
         WHERE mti.tanka_type = 2
           AND mti.deleted_at IS NULL
           AND mti.active_flg = :active_tanka_flg
      ))
```

> `:haiten_flg` は、クエリパラメータ `haiten_flg=true` が指定された場合に `true`、それ以外（省略時含む）は `false` を設定する。`true` のときはフィルタ自体を効かせず（`h.haiten_flg = FALSE` の条件を外す）廃店も含めて全件表示、`false`（省略時含む）のときのみ営業中に絞り込む「含める／除外する」方式（顧客CR 2026-08-24）。
> `:active_tanka_flg` はクエリパラメータ `active_tanka_flg` をそのままバインドする。省略時は `NULL`（絞り込まない）。

### 4.5 データ取得

```sql
SELECT h.hanbaiten_id, h.ja_id, h.hanbaiten_code, h.hanbaiten_name,
       h.todofuken_code, t.todofuken_name,
       h.yubin_no, h.address, h.tel, h.fax, h.shocho_name,
       h.itaku_kubun, h.haitatsuryo_shiharai_cycle,
       h.furikomi_tesuryo_futan_kubun, h.furikomi_tesuryo, h.haiten_flg,
       h.created_at, h.updated_at
FROM m_hanbaiten h
LEFT JOIN m_todofuken t ON h.todofuken_code = t.todofuken_code
WHERE h.deleted_at IS NULL
  AND (:haiten_flg = TRUE OR h.haiten_flg = FALSE)
  AND (:role_code = 'NICHINO_STAFF' OR h.ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR h.hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR h.hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR h.tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR h.fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR h.address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR h.shocho_name ILIKE '%' || :shocho_name || '%')
  AND (:active_tanka_flg IS NULL OR h.haitatsuryo_tanka_id IN (
        SELECT mti.tanka_id FROM m_tanka mti
         WHERE mti.tanka_type = 2
           AND mti.deleted_at IS NULL
           AND mti.active_flg = :active_tanka_flg
      ))
ORDER BY :sort_by :sort_order, h.hanbaiten_id DESC
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- 列ラベルとデータの対応（画面設計書 v1.2 §6 検索結果テーブル）：
  - 「都道府県」列 → `todofuken_name`（m_todofuken JOIN）
  - 「委託区分」列 → `itaku_kubun`（FE は `useCodesStore().label('ITAKU_KUBUN', value)` でラベル解決）
  - 「配達手数料支払サイクル」列（旧「支払区分」）→ `haitatsuryo_shiharai_cycle`
  - 「振込手数料負担区分」列（旧「手数料区分」）→ `furikomi_tesuryo_futan_kubun`（FE は `useCodesStore().label('TESURYO_KUBUN', value)` でラベル解決）
- data 配列と meta オブジェクトを含むJSONを返却する。
- total_pages = CEIL(total / per_page)
- 検索結果が0件の場合も空配列 `[]` を返却する（HTTP 200）。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-018-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Hanbaiten                                                                                                                                                                                                                                                                          |
| 概要                   | 指定した販売店を論理削除する（関連データが存在する場合は削除不可）                                                                                                                                                                                                                        |
| URI                    | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                                                                                                          |
| メソッド               | DELETE                                                                                                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                                      |
| リクエストパラメーター | hanbaiten_id（パスパラメータ）                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                    |
| HTTPレスポンスコード   | 200:正常に販売店を削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された販売店が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                      |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------- |
| 1   | hanbaiten_id   | Number | -        | 〇   |        |        | 削除対象の hanbaiten_id（パスパラメータ）  |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | 削除成功メッセージ |

## リクエスト例

```
DELETE /api/v1/hanbaiten/1
```

## レスポンス成功例

```json
{
  "message": "削除しました。"
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

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "この販売店は関連オブジェクトに紐づいているため削除できません。"
}
```

> ※ 画面側では ACSMS-MSG-018-004（「この販売店は関連オブジェクトに紐づいているため削除できません。」）として表示する（画面設計書 v1.2 §7.2）。

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - hanbaiten_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 権限チェック：`hanbaiten.delete` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_STAFF（日農担当者）は `hanbaiten.delete` 権限を保持しないため削除不可

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（ja_id）。
- 対象レコードの存在確認とスコープチェックを行う。

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       hanbaiten_name_kana, torihikisaki_no, todofuken_code,
       yubin_no, address, tel, fax, shocho_name,
       itaku_kubun, haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
       furikomi_tesuryo_futan_kubun, furikomi_tesuryo,
       bank_code, bank_name, bank_branch_code, bank_branch_name,
       yokin_shubetsu, koza_no, koza_meigi, haiten_flg, biko,
       created_at, updated_at
FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id が一致しない場合：HTTP 404 (`NOT_FOUND`)（DataScope 違反を秘匿するため、存在しないものとして扱う）

### 4.4 関連データの存在チェック

- 以下のテーブルで対象販売店が参照されているか確認する。

**購読者テーブル:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya
WHERE hanbaiten_id = :hanbaiten_id
  AND deleted_at IS NULL
```

**購読者履歴テーブル:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya_rireki
WHERE hanbaiten_id = :hanbaiten_id
```

- いずれかのテーブルで関連データが存在する場合（cnt > 0）：HTTP 409 (`CONFLICT`)
  - エラーメッセージ：「この販売店は関連オブジェクトに紐づいているため削除できません。」（ACSMS-MSG-018-004、画面設計書 v1.2 §7.2）

### 4.5 論理削除の実行

```sql
UPDATE m_hanbaiten
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '販売店明細検索画面 (ACSMS-SCR-018)', 'DELETE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "山田新聞販売店",
  "todofuken_code": "13",
  "yubin_no": "1000001",
  "address": "東京都千代田区千代田1-1",
  "tel": "0312345678",
  "fax": "0312345679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_shiharai_cycle": 1,
  "furikomi_tesuryo_futan_kubun": 1,
  "furikomi_tesuryo": 500,
  "haiten_flg": false
}
```

### 4.7 レスポンス生成

- 削除成功メッセージを返却する。HTTP 200。

### 4.8 例外処理

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
        '販売店明細検索画面 (ACSMS-SCR-018)', 'DELETE', 2,
        :hanbaiten_id, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-018-003

顧客CR 2026-08-24 で追加。

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Hanbaiten Excel                                                                                                                                                                                                                                     |
| 概要                   | 現在の検索条件で販売店一覧をExcel形式で出力する（最大5,000件、超過時は409エラー）                                                                                                                                                                          |
| URI                    | /api/v1/hanbaiten/export                                                                                                                                                                                                                                   |
| メソッド               | GET                                                                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | クエリパラメータ（ACSMS-API-018-001 と同じ検索条件、page / per_page / sort_by / sort_order は無視）                                                                                                                                                        |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常にExcelをダウンロードしました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:出力データがありません, 409:出力データ件数が5000件を超えています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                       |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------- |
| 1   | （ACSMS-API-018-001 と同じ検索条件パラメータ。page / per_page / sort_by / sort_order を除く） | | | | | | |

## レスポンスデータ

Excelファイル（`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）

### レスポンスヘッダ

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename*=UTF-8''<URLエンコードした 販売店一覧出力_YYYYMMDD_HHmmss.xlsx>
```

### Excelフォーマット

> 検索結果テーブルと同じ列構成（14列）。JA はコード/名称の2列に分ける。委託区分 / 振込手数料負担区分 は m_code（`ITAKU_KUBUN` / `TESURYO_KUBUN`）のラベルを出力する（`CodeService.getLabel` で解決）。廃店フラグは検索結果テーブルと同じ表示（`true`→「廃店」、`false`→空欄）。

| 列順 | カラム名               | 説明                                                  |
| ---- | ---------------------- | ----------------------------------------------------- |
| 1    | 販売店コード           | hanbaiten_code                                        |
| 2    | 販売店名               | hanbaiten_name                                        |
| 3    | JAコード               | ja_code（m_ja JOIN）                                  |
| 4    | JA名                   | ja_name（m_ja JOIN）                                  |
| 5    | 都道府県               | todofuken_name（m_todofuken JOIN）                    |
| 6    | 郵便番号               | yubin_no                                              |
| 7    | 住所                   | address                                                |
| 8    | 電話番号               | tel                                                    |
| 9    | FAX                    | fax                                                    |
| 10   | 所長名                 | shocho_name                                           |
| 11   | 委託区分               | itaku_kubun（m_code ラベル）                          |
| 12   | 配達手数料支払サイクル | haitatsuryo_shiharai_cycle（「Nヵ月」形式）           |
| 13   | 振込手数料負担区分     | furikomi_tesuryo_futan_kubun（m_code ラベル）         |
| 14   | 廃店フラグ             | haiten_flg（`true`→「廃店」、`false`→空欄）           |

## リクエスト例

```
GET /api/v1/hanbaiten/export?hanbaiten_name=山田&haiten_flg=true
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
  "message": "出力データ件数が5000件を超えています。"
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

- クエリパラメータの検証：ACSMS-API-018-001 と同じ検索条件（page / per_page / sort_by / sort_order は無視）。
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `hanbaiten.view` または `hanbaiten.daiko_input`（ACSMS-API-018-001 と同じ OR 条件）
- 該当権限保持ロール: NICHINO_STAFF（代行入力） / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: ACSMS-API-018-001 と同じ（restricted role は自 ja_id、NICHINO_* は無制限）

### 4.3 データ件数チェック（5,000件上限）

- 検索条件で対象件数を先にカウントする（DataScope + haiten_flg + 各フィルタ適用、ACSMS-API-018-001 §4.3 と同じ条件）。
- 件数が 0 の場合：HTTP 404 (`EXPORT_NO_DATA`)
- 件数が 5,000 を超える場合：HTTP 409 (`EXPORT_LIMIT_EXCEEDED`)

### 4.4 データ取得

- ACSMS-API-018-001 §4.3 と同じ SELECT 条件を使用する（pagination なし、hanbaiten_id ASC で決定的な順序、LIMIT 5000）。
- todofuken_name / ja_code / ja_name は本体クエリ後にバッチ解決する（ACSMS-API-018-001 と同じ方式）。

### 4.5 Excel生成

- ファイル名：`販売店一覧出力_YYYYMMDD_HHmmss.xlsx`（現在日時、JST）
- 文字コード：UTF-8
- ヘッダー行（検索結果テーブルと一致、14列）：`販売店コード, 販売店名, JAコード, JA名, 都道府県, 郵便番号, 住所, 電話番号, FAX, 所長名, 委託区分, 配達手数料支払サイクル, 振込手数料負担区分, 廃店フラグ`
- 委託区分 / 振込手数料負担区分 は m_code ラベルを `CodeService.getLabel` で解決して出力する

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '販売店明細検索画面 (ACSMS-SCR-018)', 'EXPORT_EXCEL', 1,
        NULL, 'm_hanbaiten', '', :after_value_json,
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：エクスポート条件と件数をJSON形式で格納する。

{
  "ja_id": null,
  "haiten_flg": true,
  "record_count": 42
}
```

### 4.7 レスポンス生成

- Excel ファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename*=UTF-8''<URLエンコードした 販売店一覧出力_YYYYMMDD_HHmmss.xlsx>`

### 4.8 例外処理

- DB接続エラー・Excel生成エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。
