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
| 3   | 2026/07/02 | 1.2  | Tran Duc Tuyen | データソースを t_file_download に変更（各帳票出力画面が生成したファイルを参照）。ダウンロード種別(download_type)・日農ダウンロード許可フラグ(nichino_download_allowed_flg)・作成者(created_by/created_by_name)を追加。ダウンロード実行時は t_file_download へINSERTせず t_log(log_type=4/DOWNLOAD)のみ記録。複数ファイル一括ダウンロード(ZIP)API ACSMS-API-022-004 を追加。 | Tran Duc Tuyen | Tran Duc Tuyen |
| 4   | 2026/08/06 | 1.3  | Tran Duc Tuyen | 実装との差分是正（2026-07 の 2 件が本書へ未反映だった）：①日農DL許可チェック（`nichino_download_allowed_flg = false` → 403）の対象ロールに **CHUOKAI** を追加（従来は NICHINO_ADMIN / NICHINO_STAFF のみ）。②**自分が出力したファイルは本フラグを見ない**例外を追加（#52132）。本フラグは他組織へ見せてよいかを JA 側が決めるもので出力者本人を締め出す意図は無く、既定 FALSE のため例外が無いと自分の帳票をDLできなかった。突合は `t_file_download.created_by`（trim 済み文字列。空文字は本人扱いしない）。DL制限3ロール共通。③CHUOKAI の DataScope を「自JAのみ」→ **同一都道府県の全JA**（`fd.ja_id IS NULL OR j.todofuken_code = :user_todofuken_code`）へ拡大（#52132）。拡大先の県はセッションの `todofuken_code` で決まり他県は参照不可。セッションに当該項目が無い場合は自JAのみへフォールバック。一覧・個別DL・プレビュー・ZIP で同じ ja_id 集合を用い「一覧に出た行は個別DLでも通る」を不変条件とする | | |

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

※ 本画面は各帳票出力画面が生成し `t_file_download` テーブル（+ S3）に登録したファイルの参照／プレビュー／ダウンロード（単体・一括 ZIP）のみを提供する。`t_file_download` のレコードは各帳票出力画面（SCR-020 口座振替 / SCR-021 配達手数料 / SCR-026 購読者名簿 / SCR-028 増減連絡票 / SCR-029 増減通知）が共通の FileArchiveService を介して登録する。本画面自身は行を INSERT しない。
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
| 9   | 画面固有     | FORBIDDEN             | このファイルは日農のダウンロードが許可されていません。                 | HTTP 403 |

---

# API ACSMS-API-022-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get File List                                                                                                                                                                                                   |
| 概要                   | 各帳票出力画面が生成し `t_file_download` に登録したファイルの一覧を取得する（検索 + ページネーション対応）。データソースは `t_file_download` テーブル。ログインユーザーの DataScope に従い参照可能なファイルのみ返却する。 |
| URI                    | /api/v1/file-download                                                                                                                                                                                         |
| メソッド               | GET                                                                                                                                                                                                             |
| リクエストボディー     | なし                                                                                                                                                                                                            |
| リクエストパラメーター | クエリパラメーター（後述）                                                                                                                                                                                       |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                            |
| HTTPレスポンスコード   | 200:正常にファイル一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                  |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                                                                                                              |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | file_name       | String  |      | 1      | 255    | ファイル名（部分一致／LIKE 検索）                                                                                                                 |
| 2   | todofuken_code  | String  |      | 2      | 2      | 都道府県コード（半角数字 2 桁、例: "13"）。ファイル所属 JA（`t_file_download.ja_id` → `m_ja.todofuken_code`）で絞り込む                            |
| 3   | ja_id           | Integer |      | -      | -      | JA ID（最小 1）。NICHINO_ADMIN / NICHINO_STAFF のみ指定可。指定なしは全 JA が対象                                                                 |
| 4   | download_type   | Integer |      | -      | -      | ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿／m_code DOWNLOAD_TYPE）。1〜5 以外は HTTP 400                     |
| 5   | page            | Integer |      | -      | -      | ページ番号（1-indexed、デフォルト 1、最小 1）                                                                                                     |
| 6   | per_page        | Integer |      | -      | -      | 1ページあたりの件数（デフォルト 20、最小 1、最大 100）                                                                                            |
| 7   | sort_by         | String  |      | -      | -      | ソート対象カラム（許容: `download_datetime`, `file_name`, `file_size`, `created_by`, `created_by_name`／デフォルト `download_datetime`）           |
| 8   | sort_order      | String  |      | -      | -      | ソート順（`asc`/`desc`／デフォルト `desc`）                                                                                                       |

## レスポンスデータ

| #   | 項目ID                        | タイプ        | フォーマット         | Nullable | 説明                                                                                              |
| --- | ----------------------------- | ------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                          | Array<Object> | -                    |          | ファイル一覧の配列（0 件時は空配列）                                                              |
| 2   | →file_download_id             | Integer       | -                    |          | ファイルダウンロード ID（PK）                                                                     |
| 3   | →ja_id                        | Integer       | -                    | 〇       | JA ID（FK: m_ja.ja_id）。NULL の場合は全 JA 向けファイル                                          |
| 4   | →ja_code                      | String        | -                    | 〇       | JA コード（`m_ja.ja_id` で JOIN、`ja_id` が NULL の場合は null）                                  |
| 5   | →ja_name                      | String        | -                    | 〇       | JA 名（`m_ja.ja_id` で JOIN、`ja_id` が NULL の場合は null）                                      |
| 6   | →download_datetime            | String        | YYYY/MM/DD HH:mm:ss  |          | ダウンロード（生成）日時（ISO 8601 形式、例: `2026-05-07T10:30:00+09:00`）                        |
| 7   | →download_type                | Integer       | -                    |          | ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）                |
| 8   | →file_name                    | String        | -                    |          | ファイル名                                                                                        |
| 9   | →file_size                    | Integer       | -                    |          | ファイルサイズ（バイト）                                                                          |
| 10  | →record_count                 | Integer       | -                    |          | レコード件数                                                                                      |
| 11  | →target_month                 | String        | YYYYMM               | 〇       | 対象年月（DB カラムは NOT NULL DEFAULT '' のため未設定時は空文字。レスポンス型は nullable string）|
| 12  | →scheduled_delete_date        | String        | YYYY/MM/DD HH:mm:ss  | 〇       | 削除予定日（ISO 8601 形式。NULL は期限なし）                                                      |
| 13  | →nichino_download_allowed_flg | Boolean       | -                    |          | 日農ダウンロード許可フラグ（TRUE:許可する / FALSE:許可しない）                                    |
| 14  | →deleted_at                   | String        | YYYY/MM/DD HH:mm:ss  | 〇       | 論理削除日時（ISO 8601 形式。未削除は null）                                                      |
| 15  | →created_by                   | String        | -                    |          | 作成者アカウント ID（m_account.account_id）                                                       |
| 16  | →created_by_name              | String        | -                    | 〇       | 作成者氏名（m_account から JOIN）                                                                 |
| 17  | →created_at                   | String        | YYYY/MM/DD HH:mm:ss  | 〇       | 作成日時（ISO 8601 形式）                                                                         |
| 18  | meta                          | Object        | -                    |          | ページネーション情報                                                                              |
| 19  | →total                        | Integer       | -                    |          | 検索結果の総件数                                                                                  |
| 20  | →page                         | Integer       | -                    |          | 現在のページ番号                                                                                  |
| 21  | →per_page                     | Integer       | -                    |          | 1ページあたりの件数                                                                               |
| 22  | →total_pages                  | Integer       | -                    |          | 総ページ数                                                                                        |

## リクエスト例

```
GET /api/v1/file-download?file_name=zougen&todofuken_code=13&download_type=4&page=1&per_page=20&sort_by=download_datetime&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "file_download_id": 101,
      "ja_id": 1,
      "ja_code": "1301002001",
      "ja_name": "JA東京中央",
      "download_datetime": "2026-05-07T10:30:00+09:00",
      "download_type": 4,
      "file_name": "zougen_tsuchi_202604.pdf",
      "file_size": 524288,
      "record_count": 250,
      "target_month": "202604",
      "scheduled_delete_date": "2026-11-07T10:30:00+09:00",
      "nichino_download_allowed_flg": true,
      "deleted_at": null,
      "created_by": "1",
      "created_by_name": "日農 管理者",
      "created_at": "2026-05-07T10:30:00+09:00"
    },
    {
      "file_download_id": 102,
      "ja_id": null,
      "ja_code": null,
      "ja_name": null,
      "download_datetime": "2026-05-06T15:00:00+09:00",
      "download_type": 1,
      "file_name": "kouza_furikae_20260506.csv",
      "file_size": 102400,
      "record_count": 80,
      "target_month": "",
      "scheduled_delete_date": null,
      "nichino_download_allowed_flg": false,
      "deleted_at": null,
      "created_by": "2",
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
    { "field": "download_type", "message": "ダウンロード種別は1〜5で指定してください。" },
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

- `file_name`: 任意。最大 255 文字（`ファイル名は最大255文字で指定してください。`）。前後空白は自動 trim。
- `todofuken_code`: 任意。半角数字 2 桁（`^\d{2}$`）。
- `ja_id`: 任意。整数、最小 1。NICHINO_ADMIN / NICHINO_STAFF のみ指定可。指定なしは全 JA が対象。
- `download_type`: 任意。整数、1〜5 のいずれか（`ダウンロード種別は1〜5で指定してください。`）。
- `page`: 任意（デフォルト 1）。整数、最小 1。
- `per_page`: 任意（デフォルト 20）。整数、1〜100。
- `sort_by`: 任意（デフォルト `download_datetime`）。許容値: `download_datetime`, `file_name`, `file_size`, `created_by`, `created_by_name`。それ以外は HTTP 400 (`VALIDATION_ERROR`)。
- `sort_order`: 任意（デフォルト `desc`）。許容値: `asc`, `desc`。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（全 5 ロール）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`t_file_download.ja_id` ベース）:
  - `NICHINO_ADMIN` / `NICHINO_STAFF`: 全件参照可能（フィルタなし）
  - `CHUOKAI`: **同一都道府県の全 JA** のファイル + 全 JA 向けファイル（`fd.ja_id IS NULL OR j.todofuken_code = :user_todofuken_code`。`m_ja` は既に LEFT JOIN 済みのため追加 JOIN は不要）。判定は `role_code = CHUOKAI` で限定する — `todofuken_code` の有無だけで分岐すると JA_HONTEN / JA_KANRI_SHITEN も県内全 JA へ広がってしまうため（顧客要件 2026-07 / #52132。従来は自 JA のみ）
    - 拡大先の県は**クライアント指定ではなくセッションの `todofuken_code`** から決まるため、他県を参照することはできない
    - セッションに `todofuken_code` が無い場合（本機能のデプロイ前に発行された Redis 上の既存セッション等）は**従来どおり自 JA のみ**へフォールバックする
    - 一覧に出た行は個別ダウンロード／プレビュー／ZIP でも通ることを不変条件とする（同じ ja_id 集合で判定する）
    - ただし DL 可否は別判定。同県他 JA のファイルは「一覧には見えるが `nichino_download_allowed_flg = false` なら 403」となる
  - `JA_HONTEN`: 自 JA のファイル + 全 JA 向けファイル（`fd.ja_id = :user_ja_id OR fd.ja_id IS NULL`）
  - `JA_KANRI_SHITEN`: 自 JA のファイル + 全 JA 向けファイル（`fd.ja_id = :user_ja_id OR fd.ja_id IS NULL`）※管理支店単位の絞り込みは行わない

### 4.3 データ取得条件の設定

- 検索条件 WHERE 句:
  - `t_file_download.deleted_at IS NULL`（論理削除済は除外）
  - `file_name ILIKE '%' || :file_name || '%'`（指定時のみ）
  - 都道府県コード絞り込みは **ファイル所属 JA の都道府県** で適用する：`t_file_download.ja_id` → `m_ja.ja_id` → `m_ja.todofuken_code` の JOIN チェーンを使う。作成者の `m_account.todofuken_code` ではない（管理者作成ファイルは作成者の都道府県が NULL のため除外されてしまう）。
  - `:todofuken_code` 指定時、`ja_id IS NULL`（全 JA 向け）ファイルは結果に含めない（LEFT JOIN により `j.todofuken_code IS NULL` となり、`NULL = :code` は FALSE）。全 JA 向けファイルは都道府県絞り込みなしのデフォルト一覧でのみ表示される。
  - `download_type` 指定時：`fd.download_type = :download_type`（指定時のみ）
  - `ja_id` 指定時（NICHINO_* のみ）：`fd.ja_id = :ja_id`
- DataScope WHERE 句（4.2 のロール別ルールを適用）

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
  FROM t_file_download fd
  LEFT JOIN m_ja j      ON j.ja_id      = fd.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.account_id = fd.created_by AND a.deleted_at IS NULL
 WHERE fd.deleted_at IS NULL
   AND (:file_name IS NULL OR fd.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (:download_type IS NULL OR fd.download_type = :download_type)
   AND (:ja_id IS NULL OR fd.ja_id = :ja_id)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fd.ja_id IS NULL
     OR fd.ja_id IN (:managed_ja_ids)
   )
```

### 4.5 データ取得

```sql
SELECT
    fd.file_download_id,
    fd.ja_id,
    j.ja_code            AS ja_code,
    j.ja_name            AS ja_name,
    fd.download_datetime,
    fd.download_type,
    fd.file_name,
    fd.file_size,
    fd.record_count,
    fd.target_month,
    fd.scheduled_delete_date,
    fd.nichino_download_allowed_flg,
    fd.deleted_at,
    fd.created_by,
    a.account_name       AS created_by_name,
    fd.created_at
  FROM t_file_download fd
  LEFT JOIN m_ja j      ON j.ja_id      = fd.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.account_id = fd.created_by AND a.deleted_at IS NULL
 WHERE fd.deleted_at IS NULL
   AND (:file_name IS NULL OR fd.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (:download_type IS NULL OR fd.download_type = :download_type)
   AND (:ja_id IS NULL OR fd.ja_id = :ja_id)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fd.ja_id IS NULL
     OR fd.ja_id IN (:managed_ja_ids)
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
| 概要                   | 指定したファイルのプレビュー用署名付き URL（S3 short-lived presigned URL）+ メタ情報を取得する。FE 側でモーダルにて表示する。データソースは `t_file_download`。DataScope チェックに加え、日農（NICHINO_ADMIN / NICHINO_STAFF）が `nichino_download_allowed_flg=false` のファイルをプレビューしようとした場合は HTTP 403 を返却する。 |
| URI                    | /api/v1/file-download/{file_download_id}/preview                                                                                                              |
| メソッド               | GET                                                                                                                                                             |
| リクエストボディー     | なし                                                                                                                                                            |
| リクエストパラメーター | file_download_id（パスパラメータ）                                                                                                                             |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                            |
| HTTPレスポンスコード   | 200:正常にプレビュー情報を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                          |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_download_id | Integer | ○    | -      | -      | ファイルダウンロード ID（パスパラメータ、最小 1）              |

## レスポンスデータ

| #   | 項目ID            | タイプ | フォーマット         | Nullable | 説明                                                                  |
| --- | ----------------- | ------ | -------------------- | -------- | --------------------------------------------------------------------- |
| 1   | data              | Object | -                    |          | プレビュー情報                                                        |
| 2   | →file_download_id | Integer | -                   |          | ファイルダウンロード ID                                               |
| 3   | →file_name        | String  | -                   |          | ファイル名（オリジナル名）                                            |
| 4   | →file_size        | Integer | -                   | 〇       | ファイルサイズ（バイト）                                              |
| 5   | →content_type     | String  | -                   |          | コンテンツ MIME タイプ（例: `application/pdf`, `text/csv`）           |
| 6   | →preview_url      | String  | -                   |          | プレビュー用署名付き URL（S3 presigned URL、有効期限 1 時間）         |
| 7   | →expires_at       | String  | YYYY/MM/DD HH:mm:ss |          | 署名付き URL の有効期限（ISO 8601 形式）                              |

## リクエスト例

```
GET /api/v1/file-download/101/preview
```

## レスポンス成功例

```json
{
  "data": {
    "file_download_id": 101,
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

- `file_download_id`: 必須、整数、最小 1。

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
    fd.file_download_id,
    fd.ja_id,
    fd.file_name,
    fd.file_path,
    fd.file_size,
    fd.nichino_download_allowed_flg
  FROM t_file_download fd
 WHERE fd.file_download_id = :file_download_id
   AND fd.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に違反する場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 日農ダウンロード許可チェック

- ログインユーザが**DL制限ロール**（NICHINO_ADMIN / NICHINO_STAFF / **CHUOKAI**）で、かつ対象レコードの `nichino_download_allowed_flg = false` の場合、HTTP 403 (`FORBIDDEN`) を返却する（メッセージ: `このファイルは日農のダウンロードが許可されていません。`）。中央会が対象に加わったのは顧客要件 2026-07 による。
- **例外：自分が出力したファイルは本フラグを見ない**（顧客要件 2026-07 / #52132）。本フラグは「他組織（日農・中央会）へ自組織のファイルを見せてよいか」を JA 側が決めるものであり、出力した本人まで締め出す意図は無い。既定値が FALSE のため、この例外が無いと中央会が自分で出力した帳票をその場でダウンロードできなかった。
  - 本人判定は `t_file_download.created_by`（`m_account.account_id` を varchar で保持。一覧 SQL の `m_account.account_id::text = fd.created_by` と同じ前提）で行い、両辺を trim 済み文字列に揃えて突合する。
  - `created_by` が空文字の行は**本人扱いしない**（安全側に倒す）。
  - 例外は DL制限3ロール共通。日農にも同じ穴があるため中央会だけの特例にはしない。
- 行は一覧に表示されるため、存在を隠す 404 ではなく 403 を返す（`assertNichinoDownloadAllowed` 規則）。JA_HONTEN / JA_KANRI_SHITEN は本フラグの影響を受けない。

### 4.5 レスポンス生成

- ファイル拡張子から `content_type` を判定（`.pdf` → `application/pdf`, `.csv` → `text/csv`, `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）。
- AWS S3 SDK で `file_path` に対する presigned URL を発行（有効期限 3600 秒 / 1 時間）。
- レスポンスに `preview_url` + `expires_at` を含めて返却。

### 4.6 例外処理

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- 日農が `nichino_download_allowed_flg=false` のファイルをプレビューしようとした場合：HTTP 403 (`FORBIDDEN`)
- レコードが存在しない、または DataScope 違反の場合：HTTP 404 (`NOT_FOUND`)
- S3 / DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-022-003

## 概要

| 項目                   | 内容                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Download File                                                                                                                                                                              |
| 概要                   | 指定したファイルをバイナリストリームで返却する。レスポンスヘッダ `Content-Disposition: attachment; filename="..."` によりブラウザで保存ダイアログを表示。データソースは `t_file_download`。**`t_file_download` への新規 INSERT は行わず**、操作ログ (`t_log`, log_type=4 / operation=DOWNLOAD) を 1 件のみ記録する（`t_file_download` の行は各帳票出力画面が生成する）。DataScope チェックに加え、日農が `nichino_download_allowed_flg=false` のファイルをダウンロードしようとした場合は HTTP 403 を返却する。 |
| URI                    | /api/v1/file-download/{file_download_id}/download                                                                                                                                        |
| メソッド               | GET                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | file_download_id（パスパラメータ）                                                                                                                                                         |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                       |
| HTTPレスポンスコード   | 200:正常にファイルをダウンロードしました（バイナリ応答）, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ  | 必須 | 最小長 | 最大長 | 説明                                                          |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_download_id | Integer | ○    | -      | -      | ファイルダウンロード ID（パスパラメータ、最小 1）              |

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
GET /api/v1/file-download/101/download
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

※ 本 API はファイルを返却するのみで `t_file_download` への新規 INSERT は行わない。
  ストレージ取得（S3）はトランザクション外で先に完了させ、成功後に操作ログ（`t_log`,
  log_type=4）を 1 件記録する。取得・ログのいずれかで失敗した場合はエラーログ
  （log_type=3）をトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- `file_download_id`: 必須、整数、最小 1。

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
    fd.file_download_id,
    fd.ja_id,
    fd.file_name,
    fd.file_path,
    fd.file_size,
    fd.record_count,
    fd.nichino_download_allowed_flg
  FROM t_file_download fd
 WHERE fd.file_download_id = :file_download_id
   AND fd.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope に違反する場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 日農ダウンロード許可チェック

- ログインユーザが**DL制限ロール**（NICHINO_ADMIN / NICHINO_STAFF / **CHUOKAI**）で、かつ対象レコードの `nichino_download_allowed_flg = false` の場合、HTTP 403 (`FORBIDDEN`) を返却する（メッセージ: `このファイルは日農のダウンロードが許可されていません。`）。中央会が対象に加わったのは顧客要件 2026-07 による。
- **例外：自分が出力したファイルは本フラグを見ない**（顧客要件 2026-07 / #52132）。本フラグは「他組織（日農・中央会）へ自組織のファイルを見せてよいか」を JA 側が決めるものであり、出力した本人まで締め出す意図は無い。既定値が FALSE のため、この例外が無いと中央会が自分で出力した帳票をその場でダウンロードできなかった。
  - 本人判定は `t_file_download.created_by`（`m_account.account_id` を varchar で保持。一覧 SQL の `m_account.account_id::text = fd.created_by` と同じ前提）で行い、両辺を trim 済み文字列に揃えて突合する。
  - `created_by` が空文字の行は**本人扱いしない**（安全側に倒す）。
  - 例外は DL制限3ロール共通。日農にも同じ穴があるため中央会だけの特例にはしない。
- 行は一覧に表示されるため、存在を隠す 404 ではなく 403 を返す（`assertNichinoDownloadAllowed` 規則）。JA_HONTEN / JA_KANRI_SHITEN は本フラグの影響を受けない。

### 4.5 ファイル取得

- AWS S3 SDK で `file_path` のオブジェクトを取得し、レスポンスストリームへパイプ。
- ストレージ取得はトランザクション外で先に行う（失敗時に `t_log` を残さないため）。
- レスポンスヘッダ:
  - `Content-Type`: ファイル拡張子から判定（API-022-002 と同じロジック）
  - `Content-Disposition`: `attachment; filename="<file_name>"; filename*=UTF-8''<URL-encoded file_name>`
  - `Content-Length`: `fd.file_size`
  - `Cache-Control`: `no-store`

### 4.6 操作ログ記録（`t_log`）

- ダウンロード実行の証跡は `t_log`（log_type=4 / operation=DOWNLOAD）のみ。`t_file_download`
  への INSERT は行わない（`t_file_download` の行は各帳票出力画面が生成する）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :user_ja_id,
        'ファイルダウンロード画面', 'DOWNLOAD', 1,
        :file_download_id, 't_file_download',
        '',
        :downloaded_file_metadata_json,
        :ip_address, :user_agent)
```

- `log_type = 4`（ファイル操作）。
- `operation = 'DOWNLOAD'`（ダウンロード操作）。
- `before_value`: 空文字（取得時の状態変化はないため）。
- `after_value`: ダウンロードしたファイルのメタ情報 JSON（`file_download_id`, `file_name`, `file_size`, `ja_id`）。

### 4.7 レスポンス生成

- バイナリストリームをクライアントへ送信。
- 上記ヘッダを設定。
- ステータス 200。

### 4.8 例外処理

- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- 日農が `nichino_download_allowed_flg=false` のファイルをダウンロードしようとした場合：HTTP 403 (`FORBIDDEN`)
- レコードが存在しない、または DataScope 違反の場合：HTTP 404 (`NOT_FOUND`)
- S3 / DB 接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- レート制限超過の場合：HTTP 429 (`TOO_MANY_REQUESTS`)
- エラーログ記録（トランザクション外で別途記録）:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :user_ja_id,
        'ファイルダウンロード画面', 'DOWNLOAD', 2,
        :file_download_id, 't_file_download',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-022-004

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Download Files (ZIP)                                                                                                                                                                                                                                    |
| 概要                   | 一覧で複数選択したファイルを 1 つの ZIP アーカイブにまとめてストリーム返却する。各ファイルは API-022-003 と同じ DataScope / 日農ダウンロード許可チェックを通過する必要がある。`t_file_download` への新規 INSERT は行わず、操作ログ (`t_log`, log_type=4 / operation=DOWNLOAD) を **1 件のみ**（バッチ単位で）記録する。データソースは `t_file_download`。 |
| URI                    | /api/v1/file-download/download-zip                                                                                                                                                                                                                     |
| メソッド               | POST                                                                                                                                                                                                                                                    |
| リクエストボディー     | `{ "file_download_ids": number[] }`（1〜50 件・重複不可）                                                                                                                                                                                              |
| リクエストパラメーター | なし（パスパラメータなし）                                                                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                   |
| HTTPレスポンスコード   | 200:正常にファイルをダウンロードしました（ZIP バイナリ応答）, 400:リクエストが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID     | タイプ    | 必須 | 最小長 | 最大長 | 説明                                                                    |
| --- | ------------------ | --------- | ---- | ------ | ------ | ----------------------------------------------------------------------- |
| 1   | file_download_ids  | Integer[] | ○    | 1 件   | 50 件  | 一括ダウンロード対象の `file_download_id` 配列（1〜50 件・重複不可）     |

## リクエスト例

```json
POST /api/v1/file-download/download-zip
{
  "file_download_ids": [101, 102, 103]
}
```

## レスポンスデータ

正常時は ZIP バイナリストリームを返却する。JSON ボディは存在しない。レスポンスヘッダで以下を返却する。

| ヘッダ                | 説明                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| Content-Type          | `application/zip`                                                         |
| Content-Disposition   | `attachment; filename="files_<yyyyMMdd_HHmmss>.zip"`                      |
| Cache-Control         | `no-store`                                                               |

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="files_20260702_101530.zip"
Cache-Control: no-store

<binary ZIP stream>
```

## レスポンス失敗例

### HTTP 400 — VALIDATION_ERROR

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が正しくありません。",
  "errors": [
    { "field": "file_download_ids", "message": "ファイルを選択してください。" }
  ]
}
```

- 0 件（空配列）: `ファイルを選択してください。`
- 51 件以上: `一括ダウンロードは最大50件までです。`
- ID 重複: `ファイルIDが重複しています。`
- 非整数: `ファイルIDは整数で指定してください。`

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
  "message": "このファイルは日農のダウンロードが許可されていません。"
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

- `file_download_ids`: 必須、配列、1〜50 件、要素は整数、重複不可。
  - 空配列: `ファイルを選択してください。`
  - 51 件以上: `一括ダウンロードは最大50件までです。`
  - 重複: `ファイルIDが重複しています。`
  - 非整数: `ファイルIDは整数で指定してください。`

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。未認証: HTTP 401。
- 必要権限: `file.download`。権限不足: HTTP 403。

### 4.3 データ取得・各ファイルのチェック

- `file_download_ids` の各 ID について `t_file_download`（`deleted_at IS NULL`）を取得する。
- 各行に対し以下を実施する:
  - DataScope チェック（API-022-001 と同一）。スコープ外は HTTP 404（存在隠蔽）。
  - 日農ダウンロード許可チェック（API-022-003 4.4 と同一）。日農かつ `nichino_download_allowed_flg=false` は HTTP 403。

### 4.4 ZIP 生成・返却

- 各ファイルを S3 から取得し、1 つの ZIP アーカイブに追加してストリーム返却する。
- レスポンスヘッダ: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="files_<yyyyMMdd_HHmmss>.zip"`, `Cache-Control: no-store`。

### 4.5 操作ログ記録（`t_log`）

- バッチ全体で `t_log`（log_type=4 / operation=DOWNLOAD）を **1 件のみ** 記録する。`t_file_download` への INSERT は行わない。
- `after_value`: 一括ダウンロードしたファイルのメタ情報 JSON（対象 `file_download_id` 配列・件数）。

### 4.6 例外処理

- 認証失敗: HTTP 401 (`UNAUTHORIZED`)
- 権限がない: HTTP 403 (`FORBIDDEN`)
- 日農が `nichino_download_allowed_flg=false` のファイルを含めて要求した場合: HTTP 403 (`FORBIDDEN`)
- いずれかのファイルが存在しない、または DataScope 違反: HTTP 404 (`NOT_FOUND`)
- バリデーションエラー: HTTP 400 (`VALIDATION_ERROR`)
- S3 / DB 接続エラー等: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラーログ（log_type=3）はトランザクション外で別途記録する。

