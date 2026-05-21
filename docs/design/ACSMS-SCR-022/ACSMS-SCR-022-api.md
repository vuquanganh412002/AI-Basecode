---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-022
screen_name: ファイルダウンロード画面
format_code: 18-BM/PM/VTI
format_version: "1.1"
issue_date: 2026-05-08
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/05/08
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容                                                                                                                                       | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1   | 2026/05/07 | 1.0  | Tran Duc Tuyen | 初版作成                                                                                                                                       | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/08 | 1.1  | Tran Duc Tuyen | データソースを `t_file_upload` に変更（ファイルはアップロード時に S3 + DB に登録、本画面では検索 / プレビュー / ダウンロードのみ）。都道府県プルダウンは既存の共用 API `ACSMS-API-COMMON-001`（`GET /api/v1/todofuken`、定義元: SCR-009）を使用し、全 47 都道府県を返却する。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「ファイルダウンロード画面（ACSMS-SCR-022）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード             | 資料名                                                                                |
| --- | ---------------------- | ------------------------------------------------------------------------------------- |
| 1   | ACSMS-SCR-022          | ファイルダウンロード画面 設計書                                                       |
| 2   | ACSMS-API-COMMON-001   | Get Prefecture List（`GET /api/v1/todofuken`）— 都道府県プルダウン用。定義元: SCR-009 |

※ 本画面はアップロード済みファイル（`t_file_upload` テーブル + S3）の参照／プレビュー／ダウンロードのみを提供する。新規アップロードは別画面（SCR-021 等）で実施される。
※ 都道府県プルダウンは `ACSMS-API-COMMON-001` を使用し、全 47 都道府県を返却する（役割別の絞り込みは行わない）。FE 側で `todofuken_code` を選択して検索条件に渡す運用とする。

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
| 8   | 画面固有     | NOT_FOUND             | 指定されたファイルが見つかりません。                                   | HTTP 404 |

---

# API ACSMS-API-022-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get File List                                                                                                                                                                                                   |
| 概要                   | アップロード済みファイル一覧を取得する（検索 + ページネーション対応）。データソースは `t_file_upload` テーブル。ログインユーザーの DataScope に従い参照可能なファイルのみ返却する。                              |
| URI                    | /api/v1/file-upload                                                                                                                                                                                           |
| メソッド               | GET                                                                                                                                                                                                             |
| リクエストボディー     | なし                                                                                                                                                                                                            |
| リクエストパラメーター | クエリパラメーター（後述）                                                                                                                                                                                       |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                            |
| HTTPレスポンスコード   | 200:正常にファイル一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                  |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | --------------- | ------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | file_name       | String  |      | 1      | 255    | ファイル名（部分一致／LIKE 検索）                                                                   |
| 2   | todofuken_code  | String  |      | 2      | 2      | 都道府県コード（半角数字 2 桁、例: "13"）                                                           |
| 3   | page            | Integer |      | -      | -      | ページ番号（1-indexed、デフォルト 1、最小 1）                                                       |
| 4   | per_page        | Integer |      | -      | -      | 1ページあたりの件数（デフォルト 20、最小 1、最大 100）                                              |
| 5   | sort_by         | String  |      | -      | -      | ソート対象カラム（許容: `upload_datetime`, `file_name`, `created_by`／デフォルト `upload_datetime`） |
| 6   | sort_order      | String  |      | -      | -      | ソート順（`asc`/`desc`／デフォルト `desc`）                                                         |

## レスポンスデータ

| #   | 項目ID                | タイプ        | フォーマット         | Nullable | 説明                                                                                              |
| --- | --------------------- | ------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                  | Array<Object> | -                    |          | ファイル一覧の配列（0 件時は空配列）                                                              |
| 2   | →file_upload_id       | Integer       | -                    |          | ファイルアップロード ID（PK）                                                                     |
| 3   | →ja_id                | Integer       | -                    | 〇       | JA ID（FK: m_ja.ja_id）。NULL の場合は全 JA 向けファイル                                          |
| 4   | →upload_datetime      | String        | YYYY/MM/DD HH:mm:ss  |          | アップロード日時（ISO 8601 形式、例: `2026-05-07T10:30:00+09:00`）                                |
| 5   | →file_name            | String        | -                    |          | ファイル名                                                                                        |
| 6   | →file_size            | Integer       | -                    | 〇       | ファイルサイズ（バイト）                                                                          |
| 7   | →record_count         | Integer       | -                    | 〇       | レコード件数                                                                                      |
| 8   | →status               | Integer       | -                    |          | 処理ステータス（1:処理中, 2:完了, 3:エラー）                                                      |
| 9   | →created_by           | String        | -                    |          | 作成者ログイン ID（m_account.login_id）                                                           |
| 10  | →created_by_name      | String        | -                    |          | 作成者氏名（m_account.account_name から JOIN）                                                    |
| 11  | →created_at           | String        | YYYY/MM/DD HH:mm:ss  |          | 作成日時（ISO 8601 形式）                                                                         |
| 12  | meta                  | Object        | -                    |          | ページネーション情報                                                                              |
| 13  | →total                | Integer       | -                    |          | 検索結果の総件数                                                                                  |
| 14  | →page                 | Integer       | -                    |          | 現在のページ番号                                                                                  |
| 15  | →per_page             | Integer       | -                    |          | 1ページあたりの件数                                                                               |
| 16  | →total_pages          | Integer       | -                    |          | 総ページ数                                                                                        |

## リクエスト例

```
GET /api/v1/file-upload?file_name=zougen&todofuken_code=13&page=1&per_page=20&sort_by=upload_datetime&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "file_upload_id": 101,
      "ja_id": 1,
      "upload_datetime": "2026-05-07T10:30:00+09:00",
      "file_name": "zougen_tsuchi_202604.pdf",
      "file_size": 524288,
      "record_count": 250,
      "status": 2,
      "created_by": "nichino_admin01",
      "created_by_name": "日農 管理者",
      "created_at": "2026-05-07T10:30:00+09:00"
    },
    {
      "file_upload_id": 102,
      "ja_id": null,
      "upload_datetime": "2026-05-06T15:00:00+09:00",
      "file_name": "kouza_furikae_20260506.csv",
      "file_size": 102400,
      "record_count": 80,
      "status": 2,
      "created_by": "nichino_staff02",
      "created_by_name": "日農 担当者",
      "created_at": "2026-05-06T15:00:00+09:00"
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
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
    { "field": "todofuken_code", "message": "都道府県コードは半角数字2桁で入力してください。" },
    { "field": "per_page", "message": "1ページあたりの件数は1〜100の範囲で指定してください。" }
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

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- `file_name`: 任意。最大 255 文字。前後空白は自動 trim。
- `todofuken_code`: 任意。半角数字 2 桁（`^\d{2}$`）。
- `page`: 任意（デフォルト 1）。整数、最小 1。
- `per_page`: 任意（デフォルト 20）。整数、1〜100。
- `sort_by`: 任意（デフォルト `upload_datetime`）。許容値: `upload_datetime`, `file_name`, `created_by`。それ以外は HTTP 400 (`VALIDATION_ERROR`)。
- `sort_order`: 任意（デフォルト `desc`）。許容値: `asc`, `desc`。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（全 5 ロール）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`t_file_upload.ja_id` ベース）:
  - `NICHINO_ADMIN` / `NICHINO_STAFF`: 全件参照可能（フィルタなし）
  - `CHUOKAI`: 自中央会 + 管轄 JA のファイル + 全 JA 向けファイル（`fu.ja_id IN (:managed_ja_ids) OR fu.ja_id IS NULL`）
  - `JA_HONTEN`: 自 JA のファイル + 全 JA 向けファイル（`fu.ja_id = :user_ja_id OR fu.ja_id IS NULL`）
  - `JA_KANRI_SHITEN`: 自 JA のファイル + 全 JA 向けファイル（`fu.ja_id = :user_ja_id OR fu.ja_id IS NULL`）※管理支店単位の絞り込みは行わない

### 4.3 データ取得条件の設定

- 検索条件 WHERE 句:
  - `t_file_upload.deleted_at IS NULL`（論理削除済は除外）
  - `file_name ILIKE '%' || :file_name || '%'`（指定時のみ）
  - 都道府県コード絞り込みは **ファイル所属 JA の都道府県** で適用する：`t_file_upload.ja_id` → `m_ja.ja_id` → `m_ja.todofuken_code` の JOIN チェーンを使う。作成者の `m_account.todofuken_code` ではない（管理者作成ファイルは作成者の都道府県が NULL のため除外されてしまう）。
  - `:todofuken_code` 指定時、`ja_id IS NULL`（全 JA 向け）ファイルは結果に含めない（LEFT JOIN により `j.todofuken_code IS NULL` となり、`NULL = :code` は FALSE）。全 JA 向けファイルは都道府県絞り込みなしのデフォルト一覧でのみ表示される。
- DataScope WHERE 句（4.2 のロール別ルールを適用）

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
  FROM t_file_upload fu
  LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
 WHERE fu.deleted_at IS NULL
   AND (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fu.ja_id IS NULL
     OR fu.ja_id IN (:managed_ja_ids)
   )
```

### 4.5 データ取得

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.upload_datetime,
    fu.file_name,
    fu.file_size,
    fu.record_count,
    fu.status,
    fu.created_by,
    a.account_name AS created_by_name,
    fu.created_at
  FROM t_file_upload fu
  LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
 WHERE fu.deleted_at IS NULL
   AND (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fu.ja_id IS NULL
     OR fu.ja_id IN (:managed_ja_ids)
   )
 ORDER BY :sort_by :sort_order
 LIMIT :per_page OFFSET (:page - 1) * :per_page
```

### 4.6 レスポンス生成

- 上記 SELECT 結果を `data` 配列にマッピング。
- `meta` には 4.4 の総件数と、`page` / `per_page` / `total_pages = CEIL(total / per_page)` を設定。
- 検索結果 0 件の場合、`data: []` + `meta.total: 0` を返却する（HTTP 200）。

### 4.7 例外処理

- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors 配列
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- DataScope 違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-022-002

## 概要

| 項目                   | 内容                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get File Preview                                                                                                                                                |
| 概要                   | 指定したファイルのプレビュー用署名付き URL（S3 short-lived presigned URL）+ メタ情報を取得する。FE 側でモーダルにて表示する。データソースは `t_file_upload`。      |
| URI                    | /api/v1/file-upload/{file_upload_id}/preview                                                                                                                  |
| メソッド               | GET                                                                                                                                                             |
| リクエストボディー     | なし                                                                                                                                                            |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                                                |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                            |
| HTTPレスポンスコード   | 200:正常にプレビュー情報を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                          |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_upload_id  | Integer | ○    | -      | -      | ファイルアップロード ID（パスパラメータ、最小 1）              |

## レスポンスデータ

| #   | 項目ID            | タイプ | フォーマット         | Nullable | 説明                                                                  |
| --- | ----------------- | ------ | -------------------- | -------- | --------------------------------------------------------------------- |
| 1   | data              | Object | -                    |          | プレビュー情報                                                        |
| 2   | →file_upload_id   | Integer | -                   |          | ファイルアップロード ID                                               |
| 3   | →file_name        | String  | -                   |          | ファイル名（オリジナル名）                                            |
| 4   | →file_size        | Integer | -                   | 〇       | ファイルサイズ（バイト）                                              |
| 5   | →content_type     | String  | -                   |          | コンテンツ MIME タイプ（例: `application/pdf`, `text/csv`）           |
| 6   | →preview_url      | String  | -                   |          | プレビュー用署名付き URL（S3 presigned URL、有効期限 1 時間）         |
| 7   | →expires_at       | String  | YYYY/MM/DD HH:mm:ss |          | 署名付き URL の有効期限（ISO 8601 形式）                              |

## リクエスト例

```
GET /api/v1/file-upload/101/preview
```

## レスポンス成功例

```json
{
  "data": {
    "file_upload_id": 101,
    "file_name": "zougen_tsuchi_202604.pdf",
    "file_size": 524288,
    "content_type": "application/pdf",
    "preview_url": "https://s3.ap-northeast-1.amazonaws.com/agrinews-prod-files/ja-1/zougen_tsuchi_202604.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&...",
    "expires_at": "2026-05-07T11:30:00+09:00"
  }
}
```

## レスポンス失敗例

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

### HTTP 404 — NOT_FOUND

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定されたファイルが見つかりません。"
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

- `file_upload_id`: 必須、整数、最小 1。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（全 5 ロール）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: API-022-001 と同一（`ja_id IS NULL` の全 JA 向けファイルは全ロール参照可）。レコードの `ja_id` がユーザのスコープ外の場合は HTTP 404 (`NOT_FOUND`) を返却（存在隠蔽 — security.md `assertJaScope` 規則）。

### 4.3 データ取得

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.file_name,
    fu.file_path,
    fu.file_size
  FROM t_file_upload fu
 WHERE fu.file_upload_id = :file_upload_id
   AND fu.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に違反する場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 レスポンス生成

- ファイル拡張子から `content_type` を判定（`.pdf` → `application/pdf`, `.csv` → `text/csv`, `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）。
- AWS S3 SDK で `file_path` に対する presigned URL を発行（有効期限 3600 秒 / 1 時間）。
- レスポンスに `preview_url` + `expires_at` を含めて返却。

### 4.5 例外処理

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- レコードが存在しない、または DataScope 違反の場合：HTTP 404 (`NOT_FOUND`)
- S3 / DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-022-003

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Download File                                                                                                                                                                              |
| 概要                   | 指定したファイルをバイナリストリームで返却する。レスポンスヘッダ `Content-Disposition: attachment; filename="..."` によりブラウザで保存ダイアログを表示。同時にダウンロード履歴 (`t_file_download`) と操作ログ (`t_log`, log_type=4) を 1 件ずつ記録する。データソースは `t_file_upload`。 |
| URI                    | /api/v1/file-upload/{file_upload_id}/download                                                                                                                                            |
| メソッド               | GET                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                                                                           |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                       |
| HTTPレスポンスコード   | 200:正常にファイルをダウンロードしました（バイナリ応答）, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                          |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_upload_id  | Integer | ○    | -      | -      | ファイルアップロード ID（パスパラメータ、最小 1）              |

## レスポンスデータ

正常時はバイナリストリームを返却する。JSON ボディは存在しない。レスポンスヘッダで以下を返却する。

| ヘッダ                | 説明                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| Content-Type          | ファイルの MIME タイプ（例: `application/pdf`, `text/csv`, `application/octet-stream`） |
| Content-Disposition   | `attachment; filename="<file_name>"; filename*=UTF-8''<URL-encoded file_name>`        |
| Content-Length        | ファイルサイズ（バイト）                                                              |
| Cache-Control         | `no-store`                                                                            |

## リクエスト例

```
GET /api/v1/file-upload/101/download
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_tsuchi_202604.pdf"; filename*=UTF-8''zougen_tsuchi_202604.pdf
Content-Length: 524288
Cache-Control: no-store

<binary PDF stream>
```

## レスポンス失敗例

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

### HTTP 404 — NOT_FOUND

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定されたファイルが見つかりません。"
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

※ 4.4 ファイル取得 / 4.5 ダウンロード履歴記録 / 4.6 操作ログ記録 は単一トランザクション内で実行する。
  いずれかが失敗した場合は全てロールバックすること。
  例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- `file_upload_id`: 必須、整数、最小 1。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（全 5 ロール）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: API-022-001 と同一。スコープ外の場合は HTTP 404 (`NOT_FOUND`) を返却（存在隠蔽）。

### 4.3 データ取得

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.file_name,
    fu.file_path,
    fu.file_size,
    fu.record_count
  FROM t_file_upload fu
 WHERE fu.file_upload_id = :file_upload_id
   AND fu.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に違反する場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 ファイル取得

- AWS S3 SDK で `file_path` のオブジェクトを取得し、レスポンスストリームへパイプ。
- レスポンスヘッダ:
  - `Content-Type`: ファイル拡張子から判定（API-022-002 と同じロジック）
  - `Content-Disposition`: `attachment; filename="<file_name>"; filename*=UTF-8''<URL-encoded file_name>`
  - `Content-Length`: `fu.file_size`
  - `Cache-Control`: `no-store`

### 4.5 ダウンロード履歴の記録（`t_file_download`）

- ボタン押下のたびに `t_file_download` テーブルに 1 レコードを INSERT する（ダウンロード履歴）。

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
    :user_ja_id,            -- ダウンロード実行者の所属 JA。NICHINO_* は NULL を許容
    NOW(),                  -- ダウンロード実行日時
    :download_type,         -- ファイル拡張子／命名規則から判定（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）
    :file_name,             -- 元ファイル名（`fu.file_name`）
    :file_path,             -- S3 パス（`fu.file_path`）
    :file_size,             -- ファイルサイズ（`fu.file_size`）
    :record_count,          -- レコード件数（`fu.record_count`、NULL の場合は 0）
    :target_month,          -- 対象年月（YYYYMM、ファイル名から導出。判定不可は空文字）
    NOW(),
    :user_login_id          -- ダウンロード実行者のログイン ID（`m_account.login_id`）
)
RETURNING file_download_id
```

- `download_type` は以下の優先順で判定する：
  - ファイル名に `kouza_furikae` を含む → 1（口座振替）
  - ファイル名に `zougen_renraku` を含む → 3（増減連絡票）
  - ファイル名に `zougen_tsuchi` を含む → 4（増減通知書）
  - ファイル名に `meibo` または `dokusya_meibo` を含む → 5（購読者名簿）
  - 上記いずれにも該当しない → 2（その他）
- `t_file_download` の `ja_id` はダウンロード実行者の JA。NICHINO_ADMIN / NICHINO_STAFF が全 JA 向けファイル（`fu.ja_id IS NULL`）をダウンロードする場合は `t_file_download.ja_id = NULL` を許容する。
- 同一ファイルを複数回ダウンロードすると、その都度 `t_file_download` に行が増える（履歴として全件保持）。

### 4.6 操作ログ記録（`t_log`）

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :user_ja_id,
        'ファイルダウンロード画面', 'DOWNLOAD', 1,
        :file_upload_id, 't_file_upload',
        '',
        :downloaded_file_metadata_json,
        :ip_address, :user_agent)
```

- `log_type = 4`（ファイル操作）。
- `operation = 'DOWNLOAD'`（ダウンロード操作）。
- `before_value`: 空文字（取得時の状態変化はないため）。
- `after_value`: ダウンロードしたファイルのメタ情報 JSON（`file_upload_id`, `file_download_id`（4.5 の RETURNING 値）, `file_name`, `file_size`, `ja_id`）。

### 4.7 レスポンス生成

- バイナリストリームをクライアントへ送信。
- 上記ヘッダを設定。
- ステータス 200。

### 4.8 例外処理

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- レコードが存在しない、または DataScope 違反の場合：HTTP 404 (`NOT_FOUND`)
- S3 / DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)
- トランザクションロールバック方針:
  - `t_file_download` INSERT または `t_log` INSERT のいずれかが失敗した場合、トランザクション全体をロールバックし、ダウンロード自体も失敗扱い（HTTP 500）とする。
  - ※ S3 ストリームは BE 側で先頭バイトを送出する前にトランザクションをコミットする運用（コミット失敗時はクライアントに 500 を返却し、HTTP ボディ送出を中止する）。
- エラーログ記録（トランザクション外で別途記録）:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :user_ja_id,
        'ファイルダウンロード画面', 'DOWNLOAD', 2,
        :file_upload_id, 't_file_upload',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

