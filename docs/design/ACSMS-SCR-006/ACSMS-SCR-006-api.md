---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-006
screen_name: 支店マスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Dao Van Thang
updated_date: 2026/04/14
updated_by: Dao Van Thang
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/21 | 1.1  | Dao Van Thang | 画面設計書 v1.3 対応：検索条件4項目を追加（shiten_code, kanri_shiten_id, jastem_toriatsukai_tenpo_code, kinyu_shiten_flg）。リクエストパラメータ表＋§4.3 / §4.4 / §4.5 SQLを更新 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/08/20 | 1.2  | Tran Duc Tuyen | 不具合修正2026-08：§4.4 関連データチェックに `m_account`（所属支店、shiten_id 参照）と `t_dokusya_rireki`（購読者履歴、shiten_id 参照）を追加。特に `m_account.shiten_id` は実DBの外部キー制約(`fk_m_account_shiten`)が `ON DELETE RESTRICT` を明示宣言しているにもかかわらず、削除ガードの対象から漏れていた。 | | |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「支店マスタ明細検索画面（ACSMS-SCR-006）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-007 | 支店マスタ登録画面 API設計書     |

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
| 8   | 画面固有     | NOT_FOUND      | 指定された支店が見つかりません。                                       | HTTP 404 |
| 9   | 画面固有     | CONFLICT      | 関連データが存在するため削除できません。                               | HTTP 409 |

---

# API ACSMS-API-006-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Shiten List                                                                                                                                                                                        |
| 概要                   | 支店の一覧を取得する（検索・ページネーション・ソート対応）                                                                                                                                             |
| URI                    | /api/v1/shiten                                                                                                                                                                                         |
| メソッド               | GET                                                                                                                                                                                                    |
| リクエストボディー     | なし                                                                                                                                                                                                   |
| リクエストパラメーター | クエリパラメータ（shiten_code, shiten_name, kanri_shiten_id, jastem_toriatsukai_tenpo_code, kinyu_shiten_flg, page, per_page, sort_by, sort_order）                                                                                                   |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                 |
| HTTPレスポンスコード   | 200:正常に支店一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID                  | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                              |
| --- | ------------------------------- | ------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | shiten_code                     | String  | -        | -    |        | 3      | 支店コード（部分一致検索）                                                                                         |
| 2   | shiten_name                     | String  | -        | -    |        | 100    | 支店名（部分一致検索）                                                                                             |
| 3   | kanri_shiten_id                 | Number  | -        | -    |        |        | 管理支店ID（完全一致検索）。プルダウンは ACSMS-API-COMMON-004 を参照                                              |
| 4   | jastem_toriatsukai_tenpo_code   | String  | -        | -    |        | 3      | JASTEM_データ送信取扱店舗コード（部分一致検索）                                                                    |
| 5   | kinyu_shiten_flg                | Boolean | -        | -    |        |        | 金融機関支店フラグ（true=金融機関支店, false=金融機関支店以外, 未指定=全選択 — 絞り込みなし）                       |
| 6   | page                            | Number  | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                                        |
| 7   | per_page                        | Number  | -        | -    |        |        | 1ページの件数（デフォルト: 20、最大: 100）                                                                         |
| 8   | sort_by                         | String  | -        | -    |        |        | ソート項目（shiten_code, shiten_name, kanri_shiten_name, updated_at。デフォルト: updated_at）                       |
| 9   | sort_order                      | String  | -        | -    |        |        | ソート方向（asc / desc。デフォルト: desc）                                                                         |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                     |
| --- | ------------------- | ------- | -------- | ------------ | -------- | ---------------------------------------- |
| 1   | data                | Array   | 〇       |              | -        | 支店一覧                                 |
| 2   | →shiten_id          | Number  | -        |              | -        | 支店ID                                   |
| 3   | →ja_id              | Number  | -        |              | -        | JA ID                                    |
| 4   | →shiten_code        | String  | -        |              | -        | 支店コード                               |
| 5   | →shiten_name        | String  | -        |              | -        | 支店名称                                 |
| 6   | →shiten_name_kana   | String  | -        |              | -        | 支店名称（カナ）                         |
| 7   | →kinyu_shiten_flg   | Boolean | -        |              | -        | 金融機関支店フラグ                       |
| 8   | →kanri_shiten_id    | Number  | -        |              | -        | 管理支店ID                               |
| 9   | →kanri_shiten_name  | String  | -        |              | -        | 管理支店名（m_kanri_shitenからJOIN）     |
| 10  | →jastem_toriatsukai_tenpo_code | String | - |          | -        | JASTEM_データ送信取扱店舗コード ※空文字許容 |
| 11  | →jastem_tenpo_name  | String  | -        |              | -        | JASTEM_店舗名 ※空文字許容                |
| 12  | →jastem_tyokin_shubetsu | String | -      |              | -        | JASTEM_貯金種別 ※空文字許容              |
| 13  | →jastem_koza_no     | String  | -        |              | -        | JASTEM_口座番号 ※空文字許容              |
| 14  | →biko               | String  | -        |              | -        | 備考※空文字許容                          |
| 15  | →created_at         | String  | -        | ISO8601      | -        | 作成日時                                 |
| 16  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時                                 |
| 17  | meta                | Object  | -        |              | -        | ページネーション情報                     |
| 18  | →total              | Number  | -        |              | -        | 総件数                                   |
| 19  | →page               | Number  | -        |              | -        | 現在のページ番号                         |
| 20  | →per_page           | Number  | -        |              | -        | 1ページの件数                            |
| 21  | →total_pages        | Number  | -        |              | -        | 総ページ数                               |

## リクエスト例

```
GET /api/v1/shiten?shiten_code=S0&shiten_name=本店&kanri_shiten_id=1&jastem_toriatsukai_tenpo_code=001&kinyu_shiten_flg=true&page=1&per_page=20&sort_by=updated_at&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "shiten_id": 1,
      "ja_id": 1,
      "shiten_code": "S01",
      "shiten_name": "本店営業部",
      "shiten_name_kana": "ホンテンエイギョウブ",
      "kinyu_shiten_flg": false,
      "kanri_shiten_id": 1,
      "kanri_shiten_name": "東京中央管理支店",
      "jastem_toriatsukai_tenpo_code": "001",
      "jastem_tenpo_name": "本店営業部",
      "jastem_tyokin_shubetsu": "1",
      "jastem_koza_no": "1234567",
      "biko": "本店",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "shiten_id": 2,
      "ja_id": 1,
      "shiten_code": "S02",
      "shiten_name": "東本店支店",
      "shiten_name_kana": "ヒガシホンテンシテン",
      "kinyu_shiten_flg": true,
      "kanri_shiten_id": 1,
      "kanri_shiten_name": "東京中央管理支店",
      "jastem_toriatsukai_tenpo_code": "",
      "jastem_tenpo_name": "",
      "jastem_tyokin_shubetsu": "",
      "jastem_koza_no": "",
      "biko": "",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": null
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

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
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
  - shiten_code：文字列型チェック、最大3桁
  - shiten_name：文字列型チェック、最大100桁
  - kanri_shiten_id：整数型チェック
  - jastem_toriatsukai_tenpo_code：文字列型チェック、最大3桁
  - kinyu_shiten_flg：Boolean型チェック（クエリ文字列 'true' / 'false' をBooleanに変換、空文字は未指定として扱う）
  - page：数値型チェック、≧ 1
  - per_page：数値型チェック、1〜100
  - sort_by：許可値チェック（shiten_code, shiten_name, kanri_shiten_name, updated_at）
  - sort_order：許可値チェック（asc, desc）
- デフォルト値の適用：
  - page：未指定の場合、1
  - per_page：未指定の場合、20
  - sort_by：未指定の場合、updated_at
  - sort_order：未指定の場合、desc
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request (`BAD_REQUEST`) を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`shiten.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者・顧客CR 2026-08-24）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（ja_id）。
- 基本条件：
  - スコープ制御（ja_id = user.ja_id）
  - 論理削除除外（deleted_at IS NULL）
- 検索条件：
  - shiten_code：部分一致（ILIKE '%value%'）
  - shiten_name：部分一致（ILIKE '%value%'）
  - kanri_shiten_id：完全一致（= :value）
  - jastem_toriatsukai_tenpo_code：部分一致（ILIKE '%value%'）
  - kinyu_shiten_flg：完全一致（= :value）。**未指定（全選択）の場合は絞り込みを適用しない**。
  - sort_by / sort_order：ソート適用

### 4.4 データ件数の取得

- 条件に一致する総件数を取得する。
- meta.total に使用する。

```sql
SELECT COUNT(*) AS total
FROM m_shiten
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (:shiten_code IS NULL OR shiten_code ILIKE '%' || :shiten_code || '%')
  AND (:shiten_name IS NULL OR shiten_name ILIKE '%' || :shiten_name || '%')
  AND (:kanri_shiten_id IS NULL OR kanri_shiten_id = :kanri_shiten_id)
  AND (:jastem_toriatsukai_tenpo_code IS NULL
       OR jastem_toriatsukai_tenpo_code ILIKE '%' || :jastem_toriatsukai_tenpo_code || '%')
  AND (:kinyu_shiten_flg IS NULL OR kinyu_shiten_flg = :kinyu_shiten_flg)
```

### 4.5 データ取得

- 以下のSQLを実行してデータを取得する。

```sql
SELECT s.shiten_id, s.ja_id, s.shiten_code, s.shiten_name, s.shiten_name_kana,
       s.kinyu_shiten_flg, s.kanri_shiten_id, ks.kanri_shiten_name,
       s.jastem_toriatsukai_tenpo_code, s.jastem_tenpo_name,
       s.jastem_tyokin_shubetsu, s.jastem_koza_no,
       s.biko, s.created_at, s.updated_at
FROM m_shiten s
LEFT JOIN m_kanri_shiten ks
  ON ks.kanri_shiten_id = s.kanri_shiten_id
  AND ks.deleted_at IS NULL
WHERE s.ja_id = :ja_id
  AND s.deleted_at IS NULL
  AND (:shiten_code IS NULL OR s.shiten_code ILIKE '%' || :shiten_code || '%')
  AND (:shiten_name IS NULL OR s.shiten_name ILIKE '%' || :shiten_name || '%')
  AND (:kanri_shiten_id IS NULL OR s.kanri_shiten_id = :kanri_shiten_id)
  AND (:jastem_toriatsukai_tenpo_code IS NULL
       OR s.jastem_toriatsukai_tenpo_code ILIKE '%' || :jastem_toriatsukai_tenpo_code || '%')
  AND (:kinyu_shiten_flg IS NULL OR s.kinyu_shiten_flg = :kinyu_shiten_flg)
ORDER BY {sort_target} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

`{sort_target}` は `sort_by` のマッピング結果（TypeORM の relation
プロパティ名で参照）:
| sort_by             | ORDER BY 対象          |
| ------------------- | ---------------------- |
| shiten_code         | `m.shiten_code`        |
| shiten_name         | `m.shiten_name`        |
| kanri_shiten_name   | `ks.kanriShitenName`   |
| updated_at          | `m.updated_at`         |

> 実装メモ: BE は QueryBuilder の主クエリ後に `m_kanri_shiten` をバッチ取得し
> （`In([...kanriShitenIds])`）、メモリ上で `kanri_shiten_name` をマージする
> 方式を採用。1ページ分の親IDだけで往復1回なので、JOINと等価でI/Oは同等。
> ただし `sort_by=kanri_shiten_name` の場合は ORDER BY が結合列を必要とする
> ため、QueryBuilder 側に LEFT JOIN を追加し、`ks.kanri_shiten_name` を
> 並び替え対象とする（バッチ取得は引き続き行う）。

### 4.6 レスポンス生成

- data 配列と meta オブジェクトを含むJSONを返却する。
- meta の計算：
  - total：4.4 で取得した総件数
  - page：リクエストの page 値
  - per_page：リクエストの per_page 値
  - total_pages：CEIL(total / per_page)

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-006-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Shiten                                                                                                                                                                                                                                                          |
| 概要                   | 指定した支店を論理削除する                                                                                                                                                                                                                                             |
| URI                    | /api/v1/shiten/{shiten_id}                                                                                                                                                                                                                                             |
| メソッド               | DELETE                                                                                                                                                                                                                                                                 |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                   |
| リクエストパラメーター | shiten_id（パスパラメータ）                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                 |
| HTTPレスポンスコード   | 200:削除しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません／このデータへのアクセス権限がありません, 404:指定された支店が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id      | Number | -        | 〇   |        |        | 削除対象の shiten_id（パスパラメータ）  |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | 処理結果メッセージ |

## リクエスト例

```
DELETE /api/v1/shiten/5
```

## レスポンス成功例

```json
{
  "message": "削除しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
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
  "message": "指定された支店が見つかりません"
}
```

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため削除できません"
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - shiten_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request (`BAD_REQUEST`) を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 権限チェック：`shiten.delete` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者・顧客CR 2026-08-24）, CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)
### 4.3 データ取得条件の設定

- 対象レコードの検索：
  - shiten_id = {id}
  - 論理削除除外（deleted_at IS NULL）
- 対象レコードが存在しない場合：
  - HTTP 404 Not Found を返却する。
- DataScope チェック（2段階）：
  1. 別 JA の支店（ja_id ≠ user.ja_id）の場合：存在を秘匿するため HTTP 404 Not Found (`NOT_FOUND`) を返却する（NICHINO_ADMIN／NICHINO_STAFF はスコープ判定を bypass）。
  2. 同一 JA 内であっても、JA_KANRI_SHITEN が自身の管理支店（kanri_shiten_id）配下でない支店を削除しようとした場合：一覧では閲覧可能な行のため秘匿せず、HTTP 403 Forbidden (`DATA_SCOPE_VIOLATION`) を返却する。CHUOKAI／JA_HONTEN は ja_id 判定のみのため同一 JA 内であれば通過する。


### 4.4 関連データの存在チェック

- 以下のテーブルに関連レコードが存在するか確認する。

```sql
-- 購読者の支店参照チェック
SELECT COUNT(*) FROM t_dokusya
WHERE shiten_id = :shiten_id AND deleted_at IS NULL;

-- アカウント（所属支店）の参照チェック（不具合修正2026-08 — 実DBの
-- m_account.shiten_id は ON DELETE RESTRICT を明示宣言しているが、
-- 従来このアプリ層ガードには含まれていなかった）
SELECT COUNT(*) FROM m_account
WHERE shiten_id = :shiten_id AND deleted_at IS NULL;

-- 購読者履歴の参照チェック（不具合修正2026-08 — t_dokusya_rireki は
-- append-only の履歴テーブルで deleted_at 列を持たないため付けない）
SELECT COUNT(*) FROM t_dokusya_rireki
WHERE shiten_id = :shiten_id;
```

- いずれかに関連レコードが存在する場合：
  - HTTP 409 Conflict (`CONFLICT`) を返却する。

### 4.5 論理削除の実行

- 削除前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。
- 以下のSQLを実行して論理削除を行う。

```sql
UPDATE m_shiten
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE shiten_id = :shiten_id
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
        '支店マスタ明細検索画面 (ACSMS-SCR-006)', 'DELETE', 1,
        :shiten_id, 'm_shiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "shiten_id": 5,
  "ja_id": 1,
  "shiten_code": "S05",
  "shiten_name": "削除対象支店",
  "shiten_name_kana": "サクジョタイショウシテン",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1,
  "biko": "テスト用支店"
}
```

### 4.7 レスポンス生成

- 成功メッセージを返却する。HTTP 200。

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
        '支店マスタ明細検索画面 (ACSMS-SCR-006)', 'DELETE', 2,
        :shiten_id, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
