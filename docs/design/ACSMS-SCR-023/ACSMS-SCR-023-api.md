---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-023
screen_name: ファイルアップロード画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-15
created_date: 2026/05/15
created_by: Tran Duc Tuyen
updated_date: 2026/05/15
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「ファイルアップロード画面（ACSMS-SCR-023）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                                                 |
| --- | -------------------- | -------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-001 | Get Prefecture List（`GET /api/v1/todofuken`） — 定義元: ACSMS-SCR-009                |
| 2   | ACSMS-API-COMMON-003 | Get JA Dropdown（`GET /api/v1/ja/dropdown`） — 定義元: ACSMS-SCR-024（カスケード絞込み: `todofuken_code` パラメータ使用） |

※ 本画面の都道府県コード→都道府県名 自動表示および JAコードドロップダウン（都道府県カスケード絞込み）は上記の共用APIを使用する。本画面では新規APIを定義しない。

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
| 9   | 画面固有     | FILE_SIZE_EXCEEDED    | ファイルサイズが30MBを超えています。                                   | HTTP 400 |
| 10  | 画面固有     | FILE_FORMAT_ERROR     | 許可されていないファイル形式です。                                     | HTTP 400 |
| 11  | 画面固有     | TARGET_JA_REQUIRED    | 対象JAを1つ以上選択してください。                                      | HTTP 400 |

---

# API ACSMS-API-023-001

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Uploaded File List                                                                                                                                                                     |
| 概要                   | アップロードされたファイル履歴を取得する（画面下部「アップロードされたファイルリスト」テーブル用）。                                                                                       |
| URI                    | /api/v1/file-upload                                                                                                                                                                        |
| メソッド               | GET                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                           |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                     |
| HTTPレスポンスコード   | 200:正常にファイル一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------ |
| 1   | ja_id          | Number | -        | -    |        |        | JAで絞り込み（NICHINO_ADMIN/STAFF のみ指定可。指定なしの場合は全JA）                       |
| 2   | status         | Number | -        | -    |        |        | 処理ステータスで絞り込み ※m_code.code_category='FILE_UPLOAD_STATUS'を参照（1:処理中, 2:完了, 3:エラー） |
| 3   | page           | Number | -        | -    |        |        | ページ番号（1以上、デフォルト=1）                                                          |
| 4   | per_page       | Number | -        | -    |        |        | 1ページの件数（1〜100、デフォルト=20）                                                     |
| 5   | sort_by        | String | -        | -    |        | 50     | ソート対象カラム（許可値: `upload_datetime`, `file_name`, `file_size`）。デフォルト=`upload_datetime` |
| 6   | sort_order     | String | -        | -    |        |        | ソート順（`asc` または `desc`）。デフォルト=`desc`                                          |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                       |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | data                    | Array   | -        |              | -        | ファイル一覧                                                                               |
| 2   | →file_upload_id         | Number  | -        |              | -        | ファイルアップロードID                                                                     |
| 3   | →ja_id                  | Number  | -        |              | 〇       | JA ID（全JA向けアップロードの場合は null）                                                 |
| 4   | →ja_code                | String  | -        |              | 〇       | JAコード（JOIN by ja_id; ja_id=null の場合は null）                                        |
| 5   | →ja_name                | String  | -        |              | 〇       | JA名（JOIN by ja_id; ja_id=null の場合は null）                                            |
| 6   | →file_name              | String  | -        |              | -        | ファイル名                                                                                 |
| 7   | →file_size              | Number  | -        |              | 〇       | ファイルサイズ（バイト）                                                                   |
| 8   | →status                 | Number  | -        |              | -        | 処理ステータス ※m_code.code_category='FILE_UPLOAD_STATUS'を参照（1:処理中, 2:完了, 3:エラー） |
| 9   | →notification_status    | Number  | -        |              | -        | 通知ステータス（画面表示: 「通知ステータス」列） ※m_code.code_category='NOTIFICATION_STATUS'を参照（1:未送信, 2:送信中, 3:完了, 4:一部失敗） |
| 10  | →notified_at            | String  | -        | ISO8601      | 〇       | 通知メール送信完了日時。worker が notification_status を 3:完了 または 4:一部失敗 へ更新する際に記録する。未送信/送信中の行では null |
| 11  | →record_count           | Number  | -        |              | 〇       | レコード件数                                                                               |
| 12  | →success_count          | Number  | -        |              | 〇       | 成功件数                                                                                   |
| 13  | →error_count            | Number  | -        |              | 〇       | エラー件数                                                                                 |
| 14  | →upload_datetime        | String  | -        | ISO8601      | -        | アップロード日時                                                                           |
| 15  | →scheduled_delete_date  | String  | -        | ISO8601      | 〇       | 削除予定日（画面表示: 「判権日」列。null の場合は画面で `-` 表示）                          |
| 16  | →error_file_path        | String  | -        |              | -        | エラーファイルパス（NOT NULL、空欄は `""`）                                                |
| 17  | meta                    | Object  | -        |              | -        | ページング情報                                                                             |
| 18  | →total                  | Number  | -        |              | -        | 総件数                                                                                     |
| 19  | →page                   | Number  | -        |              | -        | 現在のページ番号                                                                           |
| 20  | →per_page               | Number  | -        |              | -        | 1ページの件数                                                                              |
| 21  | →total_pages            | Number  | -        |              | -        | 総ページ数                                                                                 |

## リクエスト例

```
GET /api/v1/file-upload?page=1&per_page=20&sort_by=upload_datetime&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "file_upload_id": 101,
      "ja_id": 12345,
      "ja_code": "12345",
      "ja_name": "JA農業中央",
      "file_name": "令和5年度_購読者リスト.csv",
      "file_size": 2831155,
      "status": 2,
      "notification_status": 3,
      "notified_at": "2026-04-04T10:35:12+09:00",
      "record_count": 1024,
      "success_count": 1020,
      "error_count": 4,
      "upload_datetime": "2026-04-04T10:30:00+09:00",
      "scheduled_delete_date": "2026-10-04T00:00:00+09:00",
      "error_file_path": ""
    },
    {
      "file_upload_id": 102,
      "ja_id": 67890,
      "ja_code": "67890",
      "ja_name": "JA農業",
      "file_name": "農業中央_購読者リスト.csv",
      "file_size": 2831155,
      "status": 1,
      "notification_status": 2,
      "notified_at": null,
      "record_count": null,
      "success_count": null,
      "error_count": null,
      "upload_datetime": "2026-05-10T08:15:00+09:00",
      "scheduled_delete_date": null,
      "error_file_path": ""
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
  "message": "リクエストパラメータが不正です。"
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
  - ja_id：数値型チェック（任意）
  - status：1, 2, 3 のいずれか（任意）
  - page：1以上の整数（デフォルト=1）
  - per_page：1〜100の整数（デフォルト=20）
  - sort_by：許可値リスト（`upload_datetime`, `file_name`, `file_size`）。それ以外の値は `upload_datetime` にフォールバック
  - sort_order：`asc` または `desc`（デフォルト=`desc`）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.upload`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - NICHINO_ADMIN / NICHINO_STAFF：全件参照可
  - CHUOKAI：自中央会＋管轄JAのファイルのみ
  - JA_HONTEN / JA_KANRI_SHITEN：自JAのファイルのみ（`ja_id = user.ja_id`）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する。
- 検索条件、ソート条件をクエリビルダーに設定する。
- 共通条件：`f.deleted_at IS NULL` + DataScope 条件。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_file_upload f
WHERE f.deleted_at IS NULL
  AND (:ja_id IS NULL OR f.ja_id = :ja_id)
  AND (:status IS NULL OR f.status = :status)
  AND (
    /* DataScope */
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR f.ja_id = :user_ja_id
    OR (:role_code = 'CHUOKAI' AND f.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_ja_id = :user_ja_id))
  )
```

### 4.5 データ取得

```sql
SELECT f.file_upload_id, f.ja_id, j.ja_code, j.ja_name,
       f.file_name, f.file_size, f.status, f.notification_status,
       f.record_count, f.success_count, f.error_count,
       f.upload_datetime, f.scheduled_delete_date, f.error_file_path
FROM t_file_upload f
LEFT JOIN m_ja j ON f.ja_id = j.ja_id AND j.deleted_at IS NULL
WHERE f.deleted_at IS NULL
  AND (:ja_id IS NULL OR f.ja_id = :ja_id)
  AND (:status IS NULL OR f.status = :status)
  AND (
    /* DataScope */
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR f.ja_id = :user_ja_id
    OR (:role_code = 'CHUOKAI' AND f.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_ja_id = :user_ja_id))
  )
ORDER BY f.{sort_by} {sort_order}, f.file_upload_id DESC
LIMIT :per_page OFFSET :offset
```

### 4.6 レスポンス生成

- data 配列と meta オブジェクトを含むJSONを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-023-002

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Upload Files                                                                                                                                                                               |
| 概要                   | 1つ以上のファイルを1つ以上の対象JAにアップロードする。N件のJA × M件のファイル = N×M 件の `t_file_upload` レコードを生成し、それぞれのJAフォルダ（`ja-{ja_id}/files/`）に物理ファイルを保存する。**通知メール送信は本APIでは実行せず、バックグラウンドワーカーで非同期処理する**ため、APIは HTTP 202 を即時返却する（詳細は screen-design.md §B.6.5 を参照）。 |
| URI                    | /api/v1/file-upload                                                                                                                                                                        |
| メソッド               | POST                                                                                                                                                                                       |
| リクエストボディー     | multipart/form-data                                                                                                                                                                        |
| リクエストパラメーター |                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: multipart/form-data  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                  |
| HTTPレスポンスコード   | 202:アップロードを受け付けました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ        | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                       |
| --- | -------------- | ------------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------ |
| 1   | ja_ids         | Number[]      | 〇       | 〇   | 1      |        | 対象JAのID配列（multipart の繰り返しフィールド `ja_ids[]=12345&ja_ids[]=67890` 形式）。1つ以上必須。DataScopeで権限のあるJAのみ指定可 |
| 2   | files          | File[]        | 〇       | 〇   | 1      |        | アップロード対象ファイル（multipart の繰り返しフィールド `files`）。1ファイルあたり最大30MB（screen-design 機能定義 4.2）。拡張子制限なし（screen-design 画面項目定義 No.6 / 機能定義 4.1） |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                       |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | data                    | Array   | -        |              | -        | 登録された t_file_upload レコード一覧（N×M 件）                                            |
| 2   | →file_upload_id         | Number  | -        |              | -        | ファイルアップロードID                                                                     |
| 3   | →ja_id                  | Number  | -        |              | 〇       | JA ID                                                                                      |
| 4   | →file_name              | String  | -        |              | -        | ファイル名                                                                                 |
| 5   | →file_path              | String  | -        |              | -        | サーバ側保存パス（`ja-{ja_id}/files/{uuid}-{filename}`）                                   |
| 6   | →file_size              | Number  | -        |              | 〇       | ファイルサイズ（バイト）                                                                   |
| 7   | →status                 | Number  | -        |              | -        | 処理ステータス（初期値=1:処理中）                                                          |
| 8   | →notification_status    | Number  | -        |              | -        | 通知ステータス（初期値=1:未送信） ※m_code.code_category='NOTIFICATION_STATUS'を参照（1:未送信, 2:送信中, 3:完了, 4:一部失敗） |
| 9   | →upload_datetime        | String  | -        | ISO8601      | -        | アップロード日時                                                                           |
| 10  | →scheduled_delete_date  | String  | -        | ISO8601      | 〇       | 削除予定日（アップロード日から180日後を設定）                                              |
| 11  | →error_file_path        | String  | -        |              | -        | エラーファイルパス（初期値: `""`）                                                         |
| 12  | message                 | String  | -        |              | -        | `アップロードを受け付けました。通知メールはバックグラウンドで送信されます。`               |

## リクエスト例

```
POST /api/v1/file-upload
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="ja_ids[]"

12345
------Boundary
Content-Disposition: form-data; name="ja_ids[]"

67890
------Boundary
Content-Disposition: form-data; name="files"; filename="令和5年度_購読者リスト.csv"
Content-Type: text/csv

<file binary>
------Boundary--
```

## レスポンス成功例

```json
{
  "data": [
    {
      "file_upload_id": 201,
      "ja_id": 12345,
      "file_name": "令和5年度_購読者リスト.csv",
      "file_path": "ja-12345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
      "file_size": 2831155,
      "status": 1,
      "notification_status": 1,
      "upload_datetime": "2026-05-15T10:30:00+09:00",
      "scheduled_delete_date": "2026-11-11T00:00:00+09:00",
      "error_file_path": ""
    },
    {
      "file_upload_id": 202,
      "ja_id": 67890,
      "file_name": "令和5年度_購読者リスト.csv",
      "file_path": "ja-67890/files/e5f6g7h8-令和5年度_購読者リスト.csv",
      "file_size": 2831155,
      "status": 1,
      "notification_status": 1,
      "upload_datetime": "2026-05-15T10:30:00+09:00",
      "scheduled_delete_date": "2026-11-11T00:00:00+09:00",
      "error_file_path": ""
    }
  ],
  "message": "アップロードを受け付けました。通知メールはバックグラウンドで送信されます。"
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "ja_ids", "message": "対象JAを1つ以上選択してください。" }
  ]
}
```

### 400 Bad Request（対象JA未指定）

```json
{
  "error_code": "TARGET_JA_REQUIRED",
  "message": "対象JAを1つ以上選択してください。"
}
```

### 400 Bad Request（ファイルサイズ超過）

```json
{
  "error_code": "FILE_SIZE_EXCEEDED",
  "message": "ファイルサイズが上限（10MB）を超えています。"
}
```

### 400 Bad Request（ファイル形式不正）

```json
{
  "error_code": "FILE_FORMAT_ERROR",
  "message": "許可されていないファイル形式です。"
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

### 403 Forbidden（指定JAへのアクセス権限なし）

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
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

> ※ 4.5 データ登録 と 4.6 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。物理ファイルのアップロードは
> トランザクション失敗時に補償処理（削除）を行う。
> ※ 4.7 通知ジョブのキュー投入 は上記トランザクションの **commit 成功後** に実行する
> （commit 前に enqueue するとロールバック時にゴーストジョブが残るため）。enqueue 自体の
> 失敗はAPI成否には影響させず、エラーログのみ記録する。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- multipart リクエスト解析：
  - ja_ids：必須、1要素以上の整数配列
  - files：必須、1ファイル以上
- 各ファイル：
  - サイズ ≤ 30MB（30 * 1024 * 1024 バイト、screen-design 機能定義 4.2）。超過時：HTTP 400 (`FILE_SIZE_EXCEEDED`)
  - **拡張子チェック**（顧客レビュー 2026-05 で確定 — screen-design 画面項目定義 No.6 / 機能定義 4.1）：以下 12 拡張子のみ許可。他は HTTP 400 (`FILE_FORMAT_ERROR`)。比較は小文字化したサフィックスで一致判定（`IMG.JPG` も許可）。
    - Excel: `.xlsx`, `.xls`
    - PDF: `.pdf`
    - 画像: `.jpg`, `.jpeg`, `.png`
    - Word: `.doc`, `.docx`
    - PowerPoint: `.pptx`, `.ppt`
    - CSV: `.csv`
    - テキスト: `.txt`
    - 圧縮: `.zip`
  - プレビュー対応（GET /:id/preview）は別仕様で PDF と画像（.jpg/.jpeg/.png）のみインライン表示。その他形式はダウンロード後の確認となる。
- ja_ids が空配列の場合：HTTP 400 (`TARGET_JA_REQUIRED`)
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.upload`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - NICHINO_ADMIN / NICHINO_STAFF：任意のJAにアップロード可
  - CHUOKAI：自中央会＋管轄JAのみ
  - JA_HONTEN / JA_KANRI_SHITEN：自JAのみ（`ja_id = user.ja_id`）
- 指定された `ja_ids` のいずれかがスコープ外の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 対象JAの存在確認

```sql
SELECT ja_id FROM m_ja
WHERE ja_id = ANY(:ja_ids)
  AND deleted_at IS NULL
```

- ja_ids の要素数と SELECT 結果件数が一致しない場合：HTTP 400 (`BAD_REQUEST`)
- 各 ja_id について DataScope 条件を満たすか検証する。違反時：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 物理ファイル保存

- 各 ja_id × file の組み合わせで、保存パスを生成する：
  - パス形式: `ja-{ja_id}/files/{uuid}-{original_filename}`
  - 例: `ja-12345/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890-令和5年度_購読者リスト.csv`
- S3（または S3 互換ストレージ）に物理ファイルをアップロードする。
- アップロード失敗時：HTTP 500 (`INTERNAL_SERVER_ERROR`) + 既に保存済みのファイルを補償削除する。

### 4.5 データ登録

- 各 (ja_id, file) の組み合わせについて、以下のSQLを実行する。

```sql
INSERT INTO t_file_upload (ja_id, upload_datetime, scheduled_delete_date,
                           file_name, file_path, file_size,
                           record_count, success_count, error_count,
                           status, notification_status, error_file_path,
                           created_at, created_by)
VALUES (:ja_id, NOW(), NOW() + INTERVAL '180 days',
        :file_name, :file_path, :file_size,
        NULL, NULL, NULL,
        1, 1, '',
        NOW(), :user_account_id)
RETURNING *
```

- `status = 1`（処理中）／`notification_status = 1`（未送信）で初期化する。`notification_status` はバックグラウンドワーカーが順次 2:送信中 → 3:完了 または 4:一部失敗 に更新する。

### 4.6 操作ログ記録

- 各 t_file_upload INSERT について、以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'CREATE', 1,
        :file_upload_id, 't_file_upload',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
{
  "file_upload_id": 201,
  "ja_id": 12345,
  "file_name": "令和5年度_購読者リスト.csv",
  "file_path": "ja-12345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
  "file_size": 2831155,
  "status": 1,
  "notification_status": 1,
  "upload_datetime": "2026-05-15T10:30:00+09:00",
  "scheduled_delete_date": "2026-11-11T00:00:00+09:00",
  "error_file_path": ""
}
```

※ `log_type=4`（ファイル操作）を使用する（`m_code.code_category='LOG_TYPE'`、code_value=4 は「ファイル操作」）。

### 4.7 通知ジョブのキュー投入

- 登録した `t_file_upload` レコードを対象として、通知ジョブをキュー（Redis/BullMQ）に投入する。
- ジョブペイロード例:

```json
{
  "job_name": "file_upload_notification",
  "file_upload_ids": [201, 202, ...],
  "ja_ids": [12345, 67890],
  "uploaded_by": 1,
  "enqueued_at": "2026-05-15T10:30:00+09:00"
}
```

- キュー投入は **同一トランザクション外** で実行する（DB commit 成功後に enqueue する）。enqueue 自体が失敗した場合：HTTP 500 を返さず、`notification_status = 1:未送信` のまま放置し、エラーログ（`log_type=3`）に記録する。運用担当者がログを見て手動で再投入する。
- ワーカー側の動作は本APIの責務外。`screen-design.md §B.6.5` を参照。要点：
  - キュー投入は **1 ファイル × 1 JA = 1 ジョブ** で分割する（リトライ局所化 — SES throttle が他 JA に波及しないため）
  - キューからジョブ取得 → `notification_status` を `2:送信中` に更新
  - 対象JAごとに `m_account.email` / `sub_email_1/2/3` へメール送信（同一アドレスは重複排除）
  - 全件成功なら `notification_status = 3:完了` + `notified_at` 記録
  - 一部失敗なら `notification_status = 4:一部失敗` + `notified_at` 記録。失敗アドレス詳細はエラーログ（`t_log.log_type=3`）に出力する（`failed_ja_ids` 専用列は持たない — 1 行 = 1 JA という N×M 設計に整合）

### 4.8 レスポンス生成

- 登録されたデータ配列と message を含むJSONを返却する。**HTTP 202 Accepted**（通知メール送信完了を待たないため、200/201 ではなく 202 を使用する）。

### 4.9 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- ストレージ書き込み失敗の場合：既に保存済みのファイルを補償削除した上で HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`）。トランザクション外で記録すること。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'CREATE', 2,
        NULL, 't_file_upload',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-023-003

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Download Uploaded File                                                                                                                                                                     |
| 概要                   | 指定したアップロード済みファイルをダウンロードする（画面下部「アップロードされたファイルリスト」の操作列ダウンロードボタン）。                                                            |
| URI                    | /api/v1/file-upload/{file_upload_id}/download                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                                                                           |
| ヘッダ                 | ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                       |
| HTTPレスポンスコード   | 200:正常にファイルを取得しました（バイナリレスポンス）, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                              |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------- |
| 1   | file_upload_id | Number | -        | 〇   |        |        | 取得対象の file_upload_id（パスパラメータ）       |

## レスポンスデータ

成功時はファイルのバイナリストリームを返却する。

| #   | 項目                   | 内容                                                                                  |
| --- | ---------------------- | ------------------------------------------------------------------------------------- |
| 1   | Content-Type           | ファイルの MIME 種別（例: `text/csv`, `application/pdf`）                              |
| 2   | Content-Disposition    | `attachment; filename="{file_name}"`                                                  |
| 3   | Content-Length         | ファイルサイズ（バイト）                                                              |
| 4   | Body                   | ファイルのバイナリストリーム                                                          |

## リクエスト例

```
GET /api/v1/file-upload/201/download
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="令和5年度_購読者リスト.csv"
Content-Length: 2831155

<file binary>
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
  "message": "指定されたファイルが見つかりません。"
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
  - file_upload_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - NICHINO_ADMIN / NICHINO_STAFF：全件参照可
  - CHUOKAI：自中央会＋管轄JAのファイルのみ
  - JA_HONTEN / JA_KANRI_SHITEN：自JAのファイルのみ
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

```sql
SELECT f.file_upload_id, f.ja_id, f.file_name, f.file_path, f.file_size
FROM t_file_upload f
WHERE f.file_upload_id = :file_upload_id
  AND f.deleted_at IS NULL
  AND (
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR f.ja_id = :user_ja_id
    OR (:role_code = 'CHUOKAI' AND f.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_ja_id = :user_ja_id))
  )
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に合致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 物理ファイルの取得

- S3（または S3 互換ストレージ）から `file_path` のオブジェクトを取得する。
- 物理ファイルが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.5 ダウンロード履歴の記録

- 以下のSQLを実行してダウンロード履歴を記録する。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                             file_name, file_path, file_size,
                             record_count, target_month,
                             created_at, created_by)
VALUES (:ja_id, NOW(), 2,
        :file_name, :file_path, :file_size,
        0, '',
        NOW(), :user_account_id)
```

※ `download_type=2`（その他）を使用する（`m_code.code_category='DOWNLOAD_TYPE'`、code_value=2 は「その他」）。

### 4.6 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'DOWNLOAD', 1,
        :file_upload_id, 't_file_upload',
        '', '',
        '', '',
        :ip_address, :user_agent)
```

### 4.7 レスポンス生成

- Content-Type、Content-Disposition、Content-Length ヘッダを設定し、バイナリストリームを返却する。HTTP 200。

### 4.8 例外処理

- DB接続エラー、ストレージ取得失敗等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`）。トランザクション外で記録すること。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'DOWNLOAD', 2,
        :file_upload_id, 't_file_upload',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-023-004

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Delete Uploaded File                                                                                                                                                                       |
| 概要                   | 指定したアップロード済みファイルを論理削除する（`deleted_at` を設定）。物理ファイルはストレージから即時削除する。                                                                          |
| URI                    | /api/v1/file-upload/{file_upload_id}                                                                                                                                                       |
| メソッド               | DELETE                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                                                                           |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                     |
| HTTPレスポンスコード   | 200:削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                          |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------- |
| 1   | file_upload_id | Number | -        | 〇   |        |        | 削除対象の file_upload_id（パスパラメータ）   |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------- |
| 1   | message | String | -        |              | -        | `削除しました。`    |

## リクエスト例

```
DELETE /api/v1/file-upload/201
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
  "message": "指定されたファイルが見つかりません。"
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

> ※ 4.4 論理削除 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。物理ファイルの削除は
> トランザクションコミット後に実行する（先に物理削除すると、DB側ロールバック時に
> ファイル復元できないため）。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - file_upload_id：数値型チェック、必須チェック
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.upload`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - NICHINO_ADMIN / NICHINO_STAFF：全件削除可
  - CHUOKAI：自中央会＋管轄JAのファイルのみ
  - JA_HONTEN / JA_KANRI_SHITEN：自JAのファイルのみ
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 対象レコードの存在確認

```sql
SELECT f.file_upload_id, f.ja_id, f.file_name, f.file_path, f.file_size, f.status,
       f.record_count, f.success_count, f.error_count,
       f.upload_datetime, f.scheduled_delete_date, f.error_file_path
FROM t_file_upload f
WHERE f.file_upload_id = :file_upload_id
  AND f.deleted_at IS NULL
  AND (
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR f.ja_id = :user_ja_id
    OR (:role_code = 'CHUOKAI' AND f.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_ja_id = :user_ja_id))
  )
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に合致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
- 取得結果は `before_value` として操作ログに格納する。

### 4.4 論理削除の実行

```sql
UPDATE t_file_upload
SET deleted_at = NOW()
WHERE file_upload_id = :file_upload_id
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
VALUES (4, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'DELETE', 1,
        :file_upload_id, 't_file_upload',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
{
  "file_upload_id": 201,
  "ja_id": 12345,
  "file_name": "令和5年度_購読者リスト.csv",
  "file_path": "ja-12345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
  "file_size": 2831155,
  "status": 2,
  "upload_datetime": "2026-04-04T10:30:00+09:00",
  "scheduled_delete_date": "2026-10-04T00:00:00+09:00",
  "error_file_path": ""
}
```

### 4.6 物理ファイル削除（トランザクションコミット後）

- DB トランザクションをコミットした後、S3 から `file_path` のオブジェクトを削除する。
- 物理ファイル削除失敗時もDBコミット済みのため成功レスポンスを返す（孤児ファイルは後続のクリーンアップジョブで回収）。

### 4.7 レスポンス生成

- `{ "message": "削除しました。" }` を返却する。HTTP 200。

### 4.8 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`）。トランザクション外で記録すること。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'ファイルアップロード画面 (ACSMS-SCR-023)', 'DELETE', 2,
        :file_upload_id, 't_file_upload',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
