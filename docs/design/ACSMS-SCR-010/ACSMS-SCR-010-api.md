---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-010
screen_name: メニュー画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-17
created_date: 2026/04/17
created_by: Nguyen Duyen Manh
updated_date: 2026/04/17
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/17 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「メニュー画面（ACSMS-SCR-010）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                       |
| --- | ------------- | ---------------------------- |
| 1   | ACSMS-SCR-031 | お知らせ一覧画面 API設計書   |
| 2   | ACSMS-SCR-020 | 購読者明細検索画面 API設計書 |

※ 本画面で使用するアカウント情報・権限一覧は、ログイン時のレスポンスで取得した情報をフロントエンドでセッションストアに保持して利用する。本画面では改めて取得しない。
※ メニュー項目一覧は動的に取得せず、フロントエンドで定義済みのメニュー定義とログイン時取得した `permissions` 配列を照合して表示するメニューを決定する。

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 5   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 6   | 画面固有     | DENSHI_NOT_ENABLED    | このアカウントでは電子版機能が有効化されていません。                   | HTTP 403 |

---

# API ACSMS-API-010-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Menu Oshirase List                                                                                                                                                                                       |
| 概要                   | メニュー画面向けのお知らせ一覧を取得する（公開中・メニュー画面向け・表示期間中のもののみ）                                                                                                                   |
| URI                    | /api/v1/oshirase/menu                                                                                                                                                                                        |
| メソッド               | GET                                                                                                                                                                                                          |
| リクエストボディー     | なし                                                                                                                                                                                                         |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常にお知らせ一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 500:システムエラーが発生しました                                                                                 |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                         |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------ |
| 1   | limit          | Number | -        | -    |        |        | お知らせ一覧の最大取得件数（デフォルト: 20、最大: 100）      |

## レスポンスデータ

画面上で2つの異なる位置に表示されるため、レスポンスを2つに分割して返却する。
- `oshirase_list`：通常のお知らせ一覧（`oshirase_type != 4` のもの）
- `deadline_notice`：締め切り時間のお知らせ（`oshirase_type = 4` かつ `publish_location = 2`、条件に該当するレコードが存在しない場合は `null`）

| #   | 項目ID                              | タイプ  | 繰り返し | フォーマット     | Nullable | 説明                                                       |
| --- | ----------------------------------- | ------- | -------- | ---------------- | -------- | ---------------------------------------------------------- |
| 1   | data                                | Object  | -        |                  | -        | メニュー画面お知らせデータ                                 |
| 2   | →oshirase_list                      | Array   | 〇       |                  | -        | 通常お知らせ一覧（oshirase_type != 4）                     |
| 3   | →→oshirase_id                       | Number  | -        |                  | -        | お知らせID                                                 |
| 4   | →→title                             | String  | -        |                  | -        | お知らせタイトル                                           |
| 5   | →→content                           | String  | -        |                  | -        | 内容                                                       |
| 6   | →→oshirase_type                     | Number  | -        |                  | -        | お知らせ種別（1:システム, 2:重要, 3:一般）                 |
| 7   | →→oshirase_type_label               | String  | -        |                  | -        | お知らせ種別ラベル                                         |
| 8   | →→publish_start_date                | String  | -        | YYYY/MM/DD HH:mm | -        | 公開開始日時                                               |
| 9   | →→publish_end_date                  | String  | -        | YYYY/MM/DD HH:mm | 〇       | 公開終了日時（NULL = 無期限）                              |
| 10  | →→is_new                            | Boolean | -        |                  | -        | NEWフラグ（公開開始日から7日以内の場合 true）              |
| 11  | →→ja_id                             | Number  | -        |                  | 〇       | JA ID（NULL=全JA向け）                                     |
| 12  | →deadline_notice                    | Object  | -        |                  | 〇       | 締め切り時間お知らせ（該当なしの場合 null）                |
| 13  | →→oshirase_id                       | Number  | -        |                  | -        | お知らせID                                                 |
| 14  | →→title                             | String  | -        |                  | -        | お知らせタイトル                                           |
| 15  | →→content                           | String  | -        |                  | -        | 内容                                                       |
| 16  | →→oshirase_type                     | Number  | -        |                  | -        | お知らせ種別（4:締め切り時間 固定）                        |
| 17  | →→oshirase_type_label               | String  | -        |                  | -        | お知らせ種別ラベル（締め切り時間）                         |
| 18  | →→publish_start_date                | String  | -        | YYYY/MM/DD HH:mm | -        | 公開開始日時                                               |
| 19  | →→publish_end_date                  | String  | -        | YYYY/MM/DD HH:mm | 〇       | 公開終了日時（NULL = 無期限）                              |
| 20  | →→is_new                            | Boolean | -        |                  | -        | NEWフラグ（公開開始日から7日以内の場合 true）              |

## リクエスト例

```
GET /api/v1/oshirase/menu?limit=20
```

## レスポンス成功例

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "システムメンテナンスのお知らせ",
        "content": "4月20日（月）02:00〜06:00にシステムメンテナンスを実施いたします。",
        "oshirase_type": 1,
        "oshirase_type_label": "システム",
        "publish_start_date": "2026/04/10 10:00",
        "publish_end_date": "2026/04/20 06:00",
        "is_new": true,
        "ja_id": null
      },
      {
        "oshirase_id": 1,
        "title": "新機能リリースのお知らせ",
        "content": "新機能がリリースされました。",
        "oshirase_type": 3,
        "oshirase_type_label": "一般",
        "publish_start_date": "2026/04/01 09:00",
        "publish_end_date": null,
        "is_new": false,
        "ja_id": 100
      }
    ],
    "deadline_notice": {
      "oshirase_id": 5,
      "title": "【重要】締め切り時間の変更について",
      "content": "2026年4月より締め切り時間を17:00に変更いたします。",
      "oshirase_type": 4,
      "oshirase_type_label": "締め切り時間",
      "publish_start_date": "2026/04/15 09:00",
      "publish_end_date": null,
      "is_new": true
    }
  }
}
```

### レスポンス成功例（締め切り時間なし）

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "システムメンテナンスのお知らせ",
        "content": "4月20日（月）02:00〜06:00にシステムメンテナンスを実施いたします。",
        "oshirase_type": 1,
        "oshirase_type_label": "システム",
        "publish_start_date": "2026/04/10 10:00",
        "publish_end_date": "2026/04/20 06:00",
        "is_new": true,
        "ja_id": null
      }
    ],
    "deadline_notice": null
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
  - limit：数値型チェック、1〜100
- デフォルト値を設定する（limit=20）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 本APIは認証済みユーザーであれば誰でもアクセス可能（特定の permission は不要）。

### 4.3 データ取得条件の設定

- ログインユーザーの ja_id を取得する（日農アカウントは NULL）。
- 共通条件：
  - `publish_location = 2`（メニュー画面向け）
  - `status = 2`（公開中）
  - `deleted_at IS NULL`
  - `publish_start_date <= NOW()`（公開開始済み）
  - `publish_end_date IS NULL OR publish_end_date >= NOW()`（未終了）
  - `ja_id IS NULL OR ja_id = :user_ja_id`（全JA向け、またはユーザーのJA向け）
- oshirase_list 追加条件：`oshirase_type != 4`（締め切り時間を除外）
- deadline_notice 追加条件：`oshirase_type = 4`（締め切り時間のみ、1件のみ取得）

### 4.4 通常お知らせ一覧の取得（oshirase_list）

```sql
SELECT oshirase_id, ja_id, oshirase_type,
       title, content, publish_start_date, publish_end_date,
       created_at
FROM t_oshirase
WHERE publish_location = 2
  AND status = 2
  AND oshirase_type != 4
  AND deleted_at IS NULL
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
  AND (ja_id IS NULL OR ja_id = :user_ja_id)
ORDER BY publish_start_date DESC
LIMIT :limit
```

### 4.5 締め切り時間の取得（deadline_notice）

- `publish_location = 2` かつ `oshirase_type = 4` のお知らせは業務ルールで最大1件のみ登録される（ACSMS-SCR-031 の登録チェック参照）。

```sql
SELECT oshirase_id, oshirase_type,
       title, content, publish_start_date, publish_end_date,
       created_at
FROM t_oshirase
WHERE publish_location = 2
  AND oshirase_type = 4
  AND status = 2
  AND deleted_at IS NULL
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
ORDER BY publish_start_date DESC
LIMIT 1
```

- 該当レコードが存在しない場合は `deadline_notice` に `null` を設定する。

### 4.6 レスポンス生成

- oshirase_type 値をラベルにマッピング（1→システム, 2→重要, 3→一般, 4→締め切り時間）
- publish_start_date / publish_end_date を `YYYY/MM/DD HH:mm` 形式でフォーマットする。
- is_new フラグ：`publish_start_date` が現在日時から7日以内であれば true、それ以外は false
- `data.oshirase_list`（配列）と `data.deadline_notice`（オブジェクト または null）を含む JSON を返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-010-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Pending Approval Count                                                                                                                                                                                                                                |
| 概要                   | 電子版読者の承認待ち件数を取得する（電子版取扱アカウントのみ）                                                                                                                                                                                            |
| URI                    | /api/v1/dokusya/pending-approval/count                                                                                                                                                                                                                    |
| メソッド               | GET                                                                                                                                                                                                                                                       |
| リクエストボディー     | なし                                                                                                                                                                                                                                                      |
| リクエストパラメーター | なし                                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                    |
| HTTPレスポンスコード   | 200:正常に承認待ち件数を取得しました, 401:セッションが切れました。再度ログインしてください, 403:電子版機能が有効化されていません / この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data    | Object | -        |              | -        | 承認待ち件数情報         |
| 2   | →count  | Number | -        |              | -        | 承認待ち件数             |
| 3   | →ja_id  | Number | -        |              | 〇       | 対象JA ID（スコープ用）  |

## リクエスト例

```
GET /api/v1/dokusya/pending-approval/count
```

## レスポンス成功例

```json
{
  "data": {
    "count": 5,
    "ja_id": 100
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

### 403 Forbidden（電子版機能が無効）

```json
{
  "error_code": "DENSHI_NOT_ENABLED",
  "message": "このアカウントでは電子版機能が有効化されていません"
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

- リクエストパラメータなし。

### 4.2 認証・認可チェック

- 認証情報を検証する（JWT / Cookie）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`dokusya.view` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- 電子版取扱フラグ確認：`m_account.denshi_flg = true` であること。
- `denshi_flg = false` の場合：HTTP 403 (`DENSHI_NOT_ENABLED`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する（ja_id, kanri_shiten_id, role_code）。
- DataScope：
  - `CHUOKAI` / `JA_HONTEN`：`ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`：`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`
- 絞り込み条件：
  - `denshi_shonin_status = 1`（未承認/承認待ち）
  - `deleted_at IS NULL`（削除されていない）

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS count
FROM t_dokusya
WHERE denshi_shonin_status = 1
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
  /* JA_KANRI_SHITEN の場合は以下を追加 */
  AND kanri_shiten_id = :user_kanri_shiten_id
```

### 4.5 レスポンス生成

- 件数を含む data オブジェクトを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
