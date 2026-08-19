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
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/02 | 1.1  | Tran Duc Tuyen | ファイルのダウンロード・プレビュー機能を本画面から削除し、ファイルダウンロード画面（SCR-022）へ移行。本画面は一覧／アップロード／削除専用とする（通知メールはバックグラウンドワーカーで非同期送信）。ダウンロードAPI（旧 ACSMS-API-023-003）を削除し、削除APIを ACSMS-API-023-003 に採番変更。 | Tran Duc Tuyen | Tran Duc Tuyen |
| 3   | 2026/08/06 | 1.2  | Tran Duc Tuyen | 実装との差分是正：v1.1（2026/07/02）で本画面から削除したプレビュー・ダウンロードが、顧客要件により 2026/07/27 に**再追加**されていたが本書へ未反映だった。ACSMS-API-023-004（プレビュー用署名付きURL取得 GET `/{id}/preview`）・005（単体ダウンロード GET `/{id}/download`）・006（複数ファイルZIP一括ダウンロード POST `/download-zip`）の3節を新規追記。いずれも権限は `file.download`、DataScope 範囲外・論理削除済みは 404 でマスク、操作ログに `DOWNLOAD` 証跡を記録（ZIPは全体で1件）。ZIPは `file_upload_ids` が1〜50件・重複不可・整数のみでレート制限20回/分 | | |
| 4   | 2026/08/12 | 1.3  | Tran Duc Tuyen | 記載漏れの是正：§エラー一覧（row 9 FILE_SIZE_EXCEEDED）以外の箇所で唯一残っていた古い例示レスポンス（400 Bad Request）のメッセージが「ファイルサイズが上限（10MB）を超えています。」のまま stale だった。上限は screen-design.md 機能定義 4.2 / ACSMS-MSG-023-002 のとおり実装当初から30MBであり、実際のエラーメッセージ「ファイルサイズが30MBを超えています。」に合わせて修正 | | |
| 5   | 2026/08/16 | 1.4  | Tran Duc Tuyen | 実装コードとの突合による是正（複数件）：①ACSMS-API-023-001（一覧）の必要権限を `file.upload` から実際の `@Permissions('file.download')` に修正、リクエストパラメータに未記載だった `file_name`/`todofuken_code` を追記、レスポンスに未記載だった `created_by`/`created_by_name` を追記、CHUOKAI 向けに記載していた `m_ja.chuokai_ja_id` 参照の管轄JA拡張（実在しない列）を削除し実装どおり「自JA＋ja_id IS NULL」のみへ修正、DataScope違反時403の誤記を「結果から除外（例外なし）」へ修正。②ACSMS-API-023-002（アップロード）・023-003（削除）で `file.upload` 保持ロールを実装（2026-06-18 対応 `ファイルアップロード画面を日農(管理者・担当者)のみに制限` commit `b3e8a8c6` 等、`docs/database/seeder.md §3`）に合わせ NICHINO_ADMIN/NICHINO_STAFF のみへ修正（CHUOKAI/JA_HONTEN/JA_KANRI_SHITENは付与されていない）。③023-002 にレート制限（20回/分・WAF bypassパスのため）の記載漏れを追記、§4.3「対象JAの存在確認」が実装に存在しない架空のSQL/400チェックだったため実装どおり（ja_code解決のみ・存在チェックなし）に修正、マジックバイト検証（file-signature.ts）の記載漏れを追記、after_value例に `file_download_id` の記載漏れを追記。④023-003 の DataScope 違反時レスポンスを実装どおり 403→404（NOT_FOUND、存在秘匿のマスク方式）に修正 | | |
| 6   | 2026/08/17 | 1.5  | Tran Duc Tuyen | 前回（v1.4/row5）の是正が変更履歴の記載のみで本文へ未反映だった箇所を実装コードと再突合して完了：①023-002・023-003 の「該当権限保持ロール」本文が旧記載（5ロール）のまま残っていたため NICHINO_ADMIN/NICHINO_STAFF のみへ修正。②023-002 §4.3「対象JAの存在確認」が架空の 400 チェック（存在しない件数照合）のまま残っていたため、実装 `fetchJaCodes()` どおり「`ja_id→ja_code` 解決のみ・存在確認なし・存在しない ja_id でもエラーにならない」へ修正。③023-002 §4.1 にマジックバイト検証（`file-signature.ts`・拡張子ごとの先頭シグネチャ照合）の記載を追加。④023-002 §4.6 after_value 例に `file_download_id` が未追記のままだったため追加。⑤023-002 概要表・§4.2 にレート制限（20回/分、`@Throttle(UPLOAD_DOWNLOAD_THROTTLE)`）の記載漏れを追記（HTTPレスポンスコードへ429追加）。⑥023-003 §4.2「DataScope違反の場合：HTTP 403」が旧記載のまま残っていたため実装 `assertScope()` どおり HTTP 404（NOT_FOUND、存在秘匿）へ修正、§4.3 の存在しない `chuokai_ja_id` 列を参照するSQL（他画面と同型の記載漏れ）を実装（ORM `findOne` → 別途 `assertScope` 判定、管轄JA拡張なし）どおりに修正。⑦023-001 のレスポンスデータに未記載だった `created_at`（`t_file_upload.created_at`、SELECT 済み・DTO `FileUploadListItemDto.created_at` 存在）を追記。⑧023-002 リクエストパラメータ `files` 行の「拡張子制限なし」という記載が §4.1 の12拡張子ホワイトリストと矛盾していたため削除・整合。同フィールドは実装上 `ArrayMinSize` 相当の最小件数チェックが無く、空配列でも 202 (`data: []`) が返る点、および `FilesInterceptor('files', 20, …)` による最大20ファイル制限を追記。⑨023-002 §4.4 にファイル名サニタイズ（`/` `\` → `_`、パストラバーサル対策）の記載漏れを追記。⑩023-003・004・005 の概要表 HTTPレスポンスコードに、`ParseIntPipe` 変換失敗時の 400 (`BAD_REQUEST`) が漏れていたため追記（各§4.1本文には元々記載あり）。⑪023-004 のプレビュー署名付きURL有効期限を「有効期限あり」から実装値「1時間（3600秒）」へ具体化。⑫023-006 のバリデーションエラー例メッセージ「入力値が不正です」（末尾「。」・後続文なし）を、実際に `main.ts` の `ValidationPipe.exceptionFactory` が返す固定文言「入力値が不正です。詳細はerrorsフィールドを確認してください。」に修正（§エラー一覧 row 5 と不整合だった） | | |
| 7   | 2026/08/17 | 1.6  | Tran Duc Tuyen | 前回（v1.5）で未着手だった残り箇所の実装再突合：①023-002 §4.7 の通知ジョブペイロード例が実装と不一致だったため修正。実装（`notification-queue.service.ts` `enqueue()`）は `t_file_upload` **1 行 = 1 ジョブ**で `{file_upload_id, ja_id, uploaded_by}`（単一値）を BullMQ キュー `file-upload-notification` へ `send-notification` という job name で投入する。旧記載は `file_upload_ids`/`ja_ids` を配列で束ねた 1 ジョブ・存在しない `job_name`/`enqueued_at` フィールドという実装に無い形だった。あわせて worker（`file-upload-notification.worker.ts`）の**全件失敗**時の挙動（`notification_status` を更新せず `2:送信中` のまま BullMQ にリトライさせる）と、`3:完了` 行への再入を短絡する冪等性の記載漏れを追記。②023-001 の 400 エラー例が `error_code: BAD_REQUEST` だったが、クエリ DTO（`SearchFileUploadDto`）の検証失敗は実際にはグローバル `ValidationPipe.exceptionFactory` により `VALIDATION_ERROR`（+ `errors[]`）で返る（同一の一覧エンドポイントを参照する ACSMS-SCR-022 api.md 側は既に `VALIDATION_ERROR` で記載済みだった）。概要表・§4.1・レスポンス失敗例を修正。あわせて §4.1 の「`sort_by` の許可値以外は `upload_datetime` にフォールバック」という誤記を削除（実装は `@IsIn` で reject するため DTO 検証を通過した時点で許可値以外は存在せず、service 側の `?? 'fu.upload_datetime'` は到達しない防御的フォールバック）。③023-002 の `ja_ids` 空／欠落時、DTO の `@ArrayMinSize(1)` がグローバル `ValidationPipe` の段階で先に reject するため、実際の HTTP 応答は基本的に `VALIDATION_ERROR` になり、service 側の `TARGET_JA_REQUIRED`（`validateUploadInputs()`）は DTO 検証を回避しない限り到達しない防御的分岐である旨を明記（`file-upload.controller.spec.ts` も両コードを許容する緩いアサートで、この不確実性を裏付けている）。④023-005・023-006 のダウンロードレスポンスヘッダが `Content-Type` / `Content-Disposition: attachment` のみの記載だったが、共通ユーティリティ `sendBinaryAttachment`（`@/common/utils/file-delivery`）は実際には `Content-Disposition` に `filename`（ASCIIフォールバック）と `filename*=UTF-8''...`（RFC 5987）の二重指定、`Content-Length`、`Cache-Control: no-store` を設定する。同一ユーティリティを使う ACSMS-SCR-022 api.md（v1.4）は既にこの詳細を記載済みだったため、それに合わせて追記。023-006 にはさらに ZIP ファイル名規約 `一括ダウンロード_<yyyyMMddHHmmss>.zip`（`compactTimestampJst()`、区切りなし日時14桁）を追記。⑤023-002 の `scheduled_delete_date` に関する「00:00 JST として保存する」という記載を削除。`t_file_upload.scheduled_delete_date` は `date` 型（時刻・TZ情報を持たない暦日）であり、`FileUpload` エンティティのコメントにも旧 `timestamptz` 実装で JST 深夜に off-by-one が起きたためあえて `date` 型にした経緯が明記されている。「00:00 JST」という時刻表現はこの実装と矛盾するため、単純な暦日保存として書き直した（リクエストパラメータ表・§4.5 の2箇所） | | |

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

※ アップロード済みファイルのダウンロード・プレビューは「ファイルダウンロード画面（ACSMS-SCR-022）」で提供する（本画面では提供しない）。

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
| HTTPレスポンスコード   | 200:正常にファイル一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------ |
| 1   | file_name      | String | -        | -    |        | 255    | ファイル名で部分一致検索（ILIKE `%value%`）                                                |
| 2   | todofuken_code | String | -        | -    | 2      | 2      | 都道府県コード（半角数字2桁）。`m_ja.todofuken_code` にJOINして絞り込み                    |
| 3   | ja_id          | Number | -        | -    |        |        | JAで絞り込み（NICHINO_ADMIN/STAFF のみ指定可。指定なしの場合は全JA）                       |
| 4   | status         | Number | -        | -    |        |        | 処理ステータスで絞り込み ※m_code.code_category='FILE_UPLOAD_STATUS'を参照（1:処理中, 2:完了, 3:エラー） |
| 5   | page           | Number | -        | -    |        |        | ページ番号（1以上、デフォルト=1）                                                          |
| 6   | per_page       | Number | -        | -    |        |        | 1ページの件数（1〜100、デフォルト=20）                                                     |
| 7   | sort_by        | String | -        | -    |        | 50     | ソート対象カラム（許可値: `upload_datetime`, `file_name`, `created_by`, `created_by_name`, `file_size`）。`created_by_name` は m_account.account_name でソート。デフォルト=`upload_datetime` |
| 8   | sort_order     | String | -        | -    |        |        | ソート順（`asc` または `desc`）。デフォルト=`desc`                                          |

※ `file_name` / `todofuken_code` はファイルダウンロード画面（ACSMS-SCR-022）と共有する `SearchFileUploadDto` のフィールドであり、本APIでも有効なクエリパラメータとして受理される（`apps/backend/src/modules/file-upload/dto/search-file-upload.dto.ts`）。

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
| 15  | →scheduled_delete_date  | String  | -        | YYYY-MM-DD   | 〇       | 削除予定日（カレンダー日付。null の場合は画面で `-` 表示）                                  |
| 16  | →deleted_at             | String  | -        | ISO8601      | 〇       | 削除日（論理削除済み行のみ値。未削除は null → 画面で `-`。一覧は削除済み行も返す）          |
| 17  | →error_file_path        | String  | -        |              | -        | エラーファイルパス（NOT NULL、空欄は `""`）                                                |
| 18  | →created_by             | String  | -        |              | -        | 作成者アカウントID（ログイン ID ではなく `t_file_upload.created_by`＝`account_id` の文字列）|
| 19  | →created_by_name        | String  | -        |              | -        | 作成者氏名（JOIN by created_by → m_account.account_name。該当アカウントが存在しない場合は空文字） |
| 20  | →created_at             | String  | -        | ISO8601      | -        | 作成日時（`t_file_upload.created_at`。NOT NULL）                                           |
| 21  | meta                    | Object  | -        |              | -        | ページング情報                                                                             |
| 22  | →total                  | Number  | -        |              | -        | 総件数                                                                                     |
| 23  | →page                   | Number  | -        |              | -        | 現在のページ番号                                                                           |
| 24  | →per_page               | Number  | -        |              | -        | 1ページの件数                                                                              |
| 25  | →total_pages            | Number  | -        |              | -        | 総ページ数                                                                                 |

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
      "scheduled_delete_date": "2026-10-04",
      "deleted_at": null,
      "error_file_path": "",
      "created_by": "1",
      "created_by_name": "日農管理者",
      "created_at": "2026-04-04T10:30:00+09:00"
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
      "deleted_at": null,
      "error_file_path": "",
      "created_by": "1",
      "created_by_name": "日農管理者",
      "created_at": "2026-05-10T08:15:00+09:00"
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

### HTTP 400 — VALIDATION_ERROR

クエリパラメータ（`SearchFileUploadDto`）のいずれかが制約に違反した場合、グローバル `ValidationPipe`（`main.ts`）が `VALIDATION_ERROR` を返す（`BAD_REQUEST` ではない）。`ja_id`／`status`／`sort_by` はいずれも許可値の範囲外だと**フォールバックせず**この形で reject される。

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "sort_by", "message": "ソート対象カラムが不正です。" }
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

- クエリパラメータの検証（`SearchFileUploadDto`、グローバル `ValidationPipe` 経由）：
  - file_name：文字列（任意、最大255文字）
  - todofuken_code：半角数字2桁（任意）
  - ja_id：数値型チェック（任意）
  - status：1, 2, 3 のいずれか（任意）
  - page：1以上の整数（デフォルト=1）
  - per_page：1〜100の整数（デフォルト=20）
  - sort_by：許可値リスト（`upload_datetime`, `file_name`, `created_by`, `created_by_name`, `file_size`）に `@IsIn` で拘束。`created_by_name` は `m_account.account_name` 列にマッピングしてソートする。**許可値以外は HTTP 400 (`VALIDATION_ERROR`) で reject する（フォールバックしない）**。service 側の `SORT_COLUMN_MAP[sort_by] ?? 'fu.upload_datetime'` は DTO 検証を通過した後にしか到達しない防御的フォールバックであり、実際にユーザー入力の不正値が upload_datetime へ読み替えられることはない
  - sort_order：`asc` または `desc`（デフォルト=`desc`）
- 不正なパラメータの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.download`（本エンドポイントはファイルダウンロード画面 ACSMS-SCR-022 の一覧取得 `ACSMS-API-022-001` と共通実装。コントローラは `@Get()` に `@Permissions('file.download')` を付与しており `file.upload` ではない）
- 該当権限保持ロール: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（`docs/database/seeder.md §3` permission_id=37 は全5ロールに付与済み）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（SQLのWHERE句に組み込んで絞り込む。範囲外の行は結果から除外されるだけで、例外は発生しない）:
  - NICHINO_ADMIN / NICHINO_STAFF：全件参照可（フィルタなし）
  - CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN：`ja_id = user.ja_id` の行、または `ja_id IS NULL`（全JA向けアップロード）の行のみ参照可。3ロールとも同一ロジックであり、CHUOKAIに対する管轄JA拡張は行わない（`m_ja` に管轄JAを表す列は存在せず、`chuokai_flg` のみ）。

### 4.3 データ取得条件の設定

- ログインユーザーのスコープを取得する。
- 検索条件（file_name の部分一致、todofuken_code、ja_id、status のうち指定されたもの）とソート条件を動的にWHERE句へ組み立てる。
- 共通条件：DataScope 条件のみ。**一覧は論理削除済みの行も返す**（画面項目定義 No.17/18: 削除日カラムに `deleted_at` を表示し、削除済み行は削除ボタンを無効化するため）。したがって `f.deleted_at IS NULL` は付与しない（削除処理は引き続き削除済み行を除外する）。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM t_file_upload fu
LEFT JOIN m_ja j      ON j.ja_id = fu.ja_id AND j.deleted_at IS NULL
LEFT JOIN m_account a ON a.account_id::text = fu.created_by AND a.deleted_at IS NULL
WHERE (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
  AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
  AND (:ja_id IS NULL OR fu.ja_id = :ja_id)
  AND (:status IS NULL OR fu.status = :status)
  AND (
    /* DataScope */
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR fu.ja_id IS NULL
    OR fu.ja_id = :user_ja_id
  )
```

### 4.5 データ取得

```sql
SELECT fu.file_upload_id, fu.ja_id, j.ja_code, j.ja_name,
       fu.upload_datetime, fu.file_name, fu.file_size,
       fu.record_count, fu.success_count, fu.error_count,
       fu.status, fu.notification_status, fu.notified_at,
       fu.scheduled_delete_date, fu.deleted_at, fu.error_file_path,
       fu.created_by, a.account_name AS created_by_name, fu.created_at
FROM t_file_upload fu
LEFT JOIN m_ja j      ON j.ja_id = fu.ja_id AND j.deleted_at IS NULL
LEFT JOIN m_account a ON a.account_id::text = fu.created_by AND a.deleted_at IS NULL
WHERE (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
  AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
  AND (:ja_id IS NULL OR fu.ja_id = :ja_id)
  AND (:status IS NULL OR fu.status = :status)
  AND (
    /* DataScope */
    :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
    OR fu.ja_id IS NULL
    OR fu.ja_id = :user_ja_id
  )
ORDER BY {sort_by_column} {sort_order}
LIMIT :per_page OFFSET :offset
```

※ `{sort_by_column}` は許可値ホワイトリスト経由の列名（`sort_by=created_by_name` の場合のみ `a.account_name`、それ以外は `fu.<sort_by>`）。二次ソートキー（tie-breaker）は付与しない。

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
| 概要                   | 1つ以上のファイルを1つ以上の対象JAにアップロードする。N件のJA × M件のファイル = N×M 件の `t_file_upload` レコードを生成し、それぞれのJAフォルダ（`ja-{ja_id}-{ja_code}/files/`）に物理ファイルを保存する。**通知メール送信は本APIでは実行せず、バックグラウンドワーカーで非同期処理する**ため、APIは HTTP 202 を即時返却する（詳細は screen-design.md §B.6.5 を参照）。 |
| URI                    | /api/v1/file-upload                                                                                                                                                                        |
| メソッド               | POST                                                                                                                                                                                       |
| リクエストボディー     | multipart/form-data                                                                                                                                                                        |
| リクエストパラメーター |                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: multipart/form-data  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                  |
| 必要権限               | `file.upload`                                                                                                                                                                              |
| レート制限             | 20 回 / 分（`@Throttle(UPLOAD_DOWNLOAD_THROTTLE)`。WAF body-inspection bypass パスのため app 側で厳格化）                                                                                |
| HTTPレスポンスコード   | 202:アップロードを受け付けました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 429:リクエスト回数が上限を超えました, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ        | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                       |
| --- | -------------- | ------------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------ |
| 1   | ja_ids         | Number[]      | 〇       | 〇   | 1      |        | 対象JAのID配列（multipart の繰り返しフィールド `ja_ids[]=12345&ja_ids[]=67890` 形式）。1つ以上必須。DataScopeで権限のあるJAのみ指定可 |
| 2   | files          | File[]        | 〇       | -    |        | 20     | アップロード対象ファイル（multipart の繰り返しフィールド `files`）。1ファイルあたり最大30MB（screen-design 機能定義 4.2）。拡張子は12種類のみ許可（§4.1参照）＋マジックバイト検証あり。**実装は空配列を拒否しない**（`FilesInterceptor('files', 20, …)` で最大20ファイルまで受理するが、0ファイルでもエラーにならず `data: []` で HTTP 202 が返る） |
| 3   | scheduled_delete_date | String  | -        | △※   | 10     | 10     | 削除予定日（`YYYY/MM/DD`）。画面では必須選択。`t_file_upload.scheduled_delete_date` は `date` 型（時刻・TZ を持たない暦日）で、`YYYY-MM-DD` へ変換してそのまま保存する（時刻情報は付与しない）。未指定時のみ BE が アップロード日+180日 を既定値とする（※ API直接呼び出し時は任意） |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                       |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | data                    | Array   | -        |              | -        | 登録された t_file_upload レコード一覧（N×M 件）                                            |
| 2   | →file_upload_id         | Number  | -        |              | -        | ファイルアップロードID                                                                     |
| 3   | →ja_id                  | Number  | -        |              | 〇       | JA ID                                                                                      |
| 4   | →file_name              | String  | -        |              | -        | ファイル名                                                                                 |
| 5   | →file_path              | String  | -        |              | -        | サーバ側保存パス（`ja-{ja_id}-{ja_code}/files/{uuid}-{filename}`）                                   |
| 6   | →file_size              | Number  | -        |              | 〇       | ファイルサイズ（バイト）                                                                   |
| 7   | →status                 | Number  | -        |              | -        | 処理ステータス（初期値=1:処理中）                                                          |
| 8   | →notification_status    | Number  | -        |              | -        | 通知ステータス（初期値=1:未送信） ※m_code.code_category='NOTIFICATION_STATUS'を参照（1:未送信, 2:送信中, 3:完了, 4:一部失敗） |
| 9   | →upload_datetime        | String  | -        | ISO8601      | -        | アップロード日時                                                                           |
| 10  | →scheduled_delete_date  | String  | -        | YYYY-MM-DD   | 〇       | 削除予定日（カレンダー日付。画面で選択した値。未指定時のみ アップロード日+180日 を既定値とする） |
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
      "file_path": "ja-12345-00012345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
      "file_size": 2831155,
      "status": 1,
      "notification_status": 1,
      "upload_datetime": "2026-05-15T10:30:00+09:00",
      "scheduled_delete_date": "2026-11-11",
      "error_file_path": ""
    },
    {
      "file_upload_id": 202,
      "ja_id": 67890,
      "file_name": "令和5年度_購読者リスト.csv",
      "file_path": "ja-67890-00067890/files/e5f6g7h8-令和5年度_購読者リスト.csv",
      "file_size": 2831155,
      "status": 1,
      "notification_status": 1,
      "upload_datetime": "2026-05-15T10:30:00+09:00",
      "scheduled_delete_date": "2026-11-11",
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

※ `ja_ids` が欠落・空の場合、`UploadFileUploadDto` の `@ArrayMinSize(1)`（`ja_ids[]` を空配列へ正規化する `@Transform` の後段）が `ValidationPipe` の段階で先に reject するため、実際の HTTP 応答は基本的にこの `VALIDATION_ERROR` 形になる（`errors[].message` は下記 `TARGET_JA_REQUIRED` と同一文言）。次項の `TARGET_JA_REQUIRED`（`file-upload.service.ts` の `validateUploadInputs()`）は DTO 検証を通過した後段の防御的チェックであり、DTO 検証が正しく効いている限り HTTP 経由では到達しない。単体テスト（`file-upload.controller.spec.ts`）もこの2値のいずれかを許容する形でアサートしている。

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
  "message": "ファイルサイズが30MBを超えています。"
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
  - files：`FilesInterceptor('files', 20, …)` で最大20ファイルまで受理。**実装は0ファイルを拒否しない**（後述）
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
  - **マジックバイト検証**（バックエンドコードレビュー finding #7 — `file-signature.ts`）：拡張子チェックに加え、ファイル実バイト列の先頭シグネチャが申告拡張子の期待値と一致するかを検証する。拡張子のみのチェックでは、HTML/実行ファイル等を許可拡張子（例 `.pdf`）へリネームするだけで通過できてしまうため。対象拡張子と判定方式：`.pdf`(`%PDF-`)／`.png`／`.jpg`・`.jpeg`／`.zip`・`.xlsx`・`.docx`・`.pptx`（ZIPコンテナ `PK\x03\x04`）／`.doc`・`.xls`・`.ppt`（OLE2 Compound File シグネチャ）。`.csv`／`.txt` は信頼できるマジックナンバーが存在しないため検証対象外（常に許可）。不一致の場合も拡張子違反と同じ HTTP 400 (`FILE_FORMAT_ERROR`)。
  - アップロード済みファイルのプレビュー・ダウンロードは本画面（ファイルアップロード画面）では提供しない。ファイルダウンロード画面（SCR-022）で行う。
- ja_ids が空配列の場合：`file-upload.service.ts` の `validateUploadInputs()` は HTTP 400 (`TARGET_JA_REQUIRED`) を throw するが、`UploadFileUploadDto.ja_ids` の `@ArrayMinSize(1)` が DTO 検証（`ValidationPipe`）の段階で先に reject するため、実際に HTTP 経由で観測される応答は基本的に HTTP 400 (`VALIDATION_ERROR`、`errors: [{ field: 'ja_ids', message: '対象JAを1つ以上選択してください。' }]`) になる。`TARGET_JA_REQUIRED` は DTO 検証をすり抜けた場合の防御的フォールバックで、メッセージ文言は同一
- files が空配列の場合：**実装はエラーにしない**。`data: []` のまま §4.5〜4.7 を通過し HTTP 202 を返す（jaIds×files の組み合わせが 0 件なので INSERT も enqueue も発生しない）
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `file.upload`
- 該当権限保持ロール: **NICHINO_ADMIN / NICHINO_STAFF のみ**（`docs/database/seeder.md §3` permission_id=36。2026-06-18 対応「ファイルアップロード画面を日農(管理者・担当者)のみに制限」により CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN には付与されていない）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`assertUploadScope()`、file-upload.service.ts）:
  - NICHINO_ADMIN / NICHINO_STAFF：任意のJAにアップロード可（フィルタなし）
  - それ以外のロール（現行の権限付与では本APIを呼び出せないため実質到達しない防御的分岐）：`ja_id = user.ja_id` と完全一致するJAのみ許可。CHUOKAI に対する管轄JA拡張は実装されていない
- 指定された `ja_ids` のいずれかがスコープ外の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 JAコードの解決（存在確認は行わない）

実装は `ja_ids` の存在チェックを行わない。S3 保存フォルダ名を可読化するため、`ja_id → ja_code` の解決のみを行う（`fetchJaCodes()`、file-upload.service.ts）。

```sql
SELECT ja_id, ja_code FROM m_ja
WHERE ja_id IN (:ja_ids)
  AND deleted_at IS NULL
```

- 削除済み／存在しない `ja_id` は解決結果のマップに含まれないだけで、**HTTP 400 等のエラーにはならない**。§4.4 でその `ja_id` は `ja-{ja_id}/files/...`（`ja_code` 抜き）にフォールバックする。

### 4.4 物理ファイル保存

- 各 ja_id × file の組み合わせで、保存パスを生成する：
  - パス形式: `ja-{ja_id}-{ja_code}/files/{uuid}-{original_filename}`
  - 例: `ja-12345-00012345/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890-令和5年度_購読者リスト.csv`
  - フォルダ名の `ja_id` は不変・一意のキー（先頭）、`ja_code` は可読性のための接尾辞。`ja_code` は作成後不変（update-ja は ja_code を変更不可）なので保存済み file_path がドリフトすることはない。
  - `ja_code` は `[A-Za-z0-9_-]` 以外をサニタイズ（`_` に置換）する。`m_ja` 照合で `ja_code` が取得できない場合（削除済みJA／不正な ja_id 等）は `ja-{ja_id}/files/...` にフォールバックする。
  - 元のファイル名（`original_filename`）は S3 キーに埋め込む直前に `/` `\` を `_` へ置換する（`sanitizeFileNameForKey()`）。パス区切り文字を許すと `../../ja-9-OTHERJA/files/evil.pdf` のような originalname で `ja-{id}-{code}/files/` プレフィックス外へキーが広がるパストラバーサル対策。DB保存・画面表示・`Content-Disposition` 用の表示名（`file_name`列）はサニタイズ前の元の値を保持する。
- S3（または S3 互換ストレージ）に物理ファイルをアップロードする。
- アップロード失敗時：HTTP 500 (`INTERNAL_SERVER_ERROR`) + 既に保存済みのファイルを補償削除する。

### 4.5 データ登録

- `scheduled_delete_date` は**画面で選択した削除予定日（`YYYY/MM/DD` → `YYYY-MM-DD` の暦日、時刻・TZ情報は持たない `date` 型）をそのまま保存する**。リクエストに `scheduled_delete_date` が無い場合（API直接呼び出し等）のみ、アップロード時刻（JST）から180日後の暦日（`dateOnlyIsoJst(now + 180日)`）を既定値とする。
- **過去日チェック**：`scheduled_delete_date` が本日（JST）より前の場合は HTTP 400 (`VALIDATION_ERROR`、`field: scheduled_delete_date`、message: `削除予定日は本日以降の日付を指定してください。`) を返却し、物理ファイルアップロード・DB登録は行わない。
- 各 (ja_id, file) の組み合わせについて、以下のSQLを実行する（`:scheduled_delete_date` は上記で決定した値）。

```sql
INSERT INTO t_file_upload (ja_id, upload_datetime, scheduled_delete_date,
                           file_name, file_path, file_size,
                           record_count, success_count, error_count,
                           status, notification_status, error_file_path,
                           created_at, created_by)
VALUES (:ja_id, NOW(), :scheduled_delete_date,
        :file_name, :file_path, :file_size,
        NULL, NULL, NULL,
        1, 1, '',
        NOW(), :user_account_id)
RETURNING *
```

- `status = 1`（処理中）／`notification_status = 1`（未送信）で初期化する。`notification_status` はバックグラウンドワーカーが順次 2:送信中 → 3:完了 または 4:一部失敗 に更新する。

#### 4.5.1 ダウンロード行のペア登録（顧客要件2026-08）

ファイルダウンロード画面（SCR-022）は `t_file_download` のみを一覧・取得対象とするため、
`t_file_upload` の INSERT と**同一トランザクション内**で、同じ S3 オブジェクトを指す
`t_file_download` 行も登録する。これが無いと、アップロードされたファイルを
CHUOKAI(3) / JA_HONTEN(4) / JA_KANRI_SHITEN(5) がダウンロードできない。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                             scheduled_delete_date, nichino_download_allowed_flg,
                             file_name, file_path, file_size, record_count,
                             target_month, created_at, created_by)
VALUES (:ja_id, NOW(), 2,
        :scheduled_delete_date, TRUE,
        :file_name, :file_path, :file_size, 0,
        NULL, NOW(), :user_account_id)
RETURNING *
```

| 列 | 値 | 理由 |
| --- | --- | --- |
| `ja_id` | アップロード画面のJAドロップダウンで選択したJA | SCR-022 の DataScope（JAロールは自JA行のみ）にそのまま乗せるため |
| `download_type` | `2:その他` | `m_code.DOWNLOAD_TYPE` に「アップロード」区分が無いため（帳票ではない） |
| `nichino_download_allowed_flg` | `TRUE` 固定 | 日農・中央会が自組織で上げたファイルを取り直せないと運用が回らないため。帳票出力（SCR-021/026/028/029）は画面ごとに固定／選択なので、この既定は本画面限定 |
| `scheduled_delete_date` | `t_file_upload` と同値 | 別々にすると片方だけ消え「一覧に出るのに実体が無い」行が生じる |
| `file_path` | `t_file_upload` と同一キー | 実体は同じS3オブジェクト。削除時のペア解決キーでもある（キーに UUID を含むため一意） |
| `record_count` | `0` | NOT NULL 列だが、アップロードファイルは明細を持たない |

- 生成した `file_download_id` は `t_file_upload` の操作ログ `after_value` にも含め、削除時の追跡を可能にする。

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
  "file_download_id": 301,
  "ja_id": 12345,
  "file_name": "令和5年度_購読者リスト.csv",
  "file_path": "ja-12345-00012345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
  "file_size": 2831155,
  "status": 1,
  "notification_status": 1,
  "upload_datetime": "2026-05-15T10:30:00+09:00",
  "scheduled_delete_date": "2026-11-11",
  "error_file_path": ""
}
```

`file_download_id` は §4.5.1 でペア登録した `t_file_download` 行のIDで、削除時（ACSMS-API-023-003）の追跡用に含める。

※ `log_type=4`（ファイル操作）を使用する（`m_code.code_category='LOG_TYPE'`、code_value=4 は「ファイル操作」）。

### 4.7 通知ジョブのキュー投入

- 登録した `t_file_upload` レコード **1 件につき 1 ジョブ**（= 1 ファイル × 1 JA）を、BullMQ キュー `file-upload-notification`（`QUEUE_FILE_UPLOAD_NOTIFICATION`）へ投入する。複数行をまとめて 1 ジョブにはしない（リトライ局所化 — 下記参照）。
- ジョブペイロード例（`保存行 1 件 = 1 ジョブ` のため配列ではなく単一 ID。BullMQ の job name は `send-notification`）:

```json
{
  "file_upload_id": 201,
  "ja_id": 12345,
  "uploaded_by": 1
}
```

N×M 件保存した場合はこのペイロードを持つジョブが N×M 件 enqueue される（`file_upload_id`/`ja_id` の組み合わせごとに 1 件）。

- キュー投入は **同一トランザクション外** で実行する（DB commit 成功後に enqueue する）。enqueue 自体が失敗した場合：HTTP 500 を返さず、`notification_status = 1:未送信` のまま放置し、エラーログ（`log_type=3`）に記録する。運用担当者がログを見て手動で再投入する。
- ワーカー側の動作は本APIの責務外。`screen-design.md §B.6.5` を参照。要点：
  - キュー投入は **1 ファイル × 1 JA = 1 ジョブ** で分割する（リトライ局所化 — SES throttle が他 JA に波及しないため）
  - キューからジョブ取得 → `notification_status` を `2:送信中` に更新
  - 対象JAごとに `m_account.email` / `sub_email_1/2/3` へメール送信（同一アドレスは重複排除）
  - 全件成功なら `notification_status = 3:完了` + `notified_at` 記録
  - 一部失敗なら `notification_status = 4:一部失敗` + `notified_at` 記録。失敗アドレス詳細はエラーログ（`t_log.log_type=3`）に出力する（`failed_ja_ids` 専用列は持たない — 1 行 = 1 JA という N×M 設計に整合）
  - **全件失敗**の場合は `notification_status` を更新せず `2:送信中` のまま BullMQ にジョブ全体をリトライさせる（`throw`）。連続リトライ後も全滅する場合は運用担当者がログを確認する（ステータスが `4:一部失敗` へちらつかない設計）
  - 冪等性: `notification_status = 3:完了` の行への再入（BullMQ ack 未達による再配信等）は何もせず短絡終了する（重複送信防止）

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
| API名                  | Delete Uploaded File                                                                                                                                                                       |
| 概要                   | 指定したアップロード済みファイルを論理削除する（`deleted_at` を設定）。物理ファイルはストレージから即時削除する。                                                                          |
| URI                    | /api/v1/file-upload/{file_upload_id}                                                                                                                                                       |
| メソッド               | DELETE                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                       |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                                                                           |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                     |
| HTTPレスポンスコード   | 200:削除しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラーが発生しました |

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
- 該当権限保持ロール: **NICHINO_ADMIN / NICHINO_STAFF のみ**（`docs/database/seeder.md §3` permission_id=36。CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN には付与されていない）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`assertScope()`、file-upload.service.ts。§4.3参照）:
  - `ja_id IS NULL`（全JA向けアップロード）の行：全ロール削除可
  - NICHINO_ADMIN / NICHINO_STAFF：全件削除可
  - それ以外のロール（現行の権限付与では本APIを呼び出せないため実質到達しない防御的分岐）：`ja_id = user.ja_id` と完全一致する行のみ削除可。CHUOKAI に対する管轄JA拡張は実装されていない
- DataScope違反の場合：**HTTP 404 (`NOT_FOUND`)**（存在秘匿のためのマスク方式。403 `DATA_SCOPE_VIOLATION` は返さない）

### 4.3 対象レコードの存在確認とDataScope検証

実装は「存在確認」と「DataScope検証」を1本のSQLに統合していない。まず論理未削除行を1件取得し、取得できた場合のみアプリケーション側で `assertScope()` により DataScope を判定する。

```sql
SELECT *
FROM t_file_upload
WHERE file_upload_id = :file_upload_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- 取得できた場合の DataScope 判定（`assertScope()`）：`ja_id IS NULL` または NICHINO_ADMIN/NICHINO_STAFF は常に許可。それ以外は `ja_id = user.ja_id` と完全一致しない限り、**存在を秘匿するため HTTP 404 (`NOT_FOUND`)** を返す（403 `DATA_SCOPE_VIOLATION` ではない）。CHUOKAI に対する管轄JA拡張（`m_ja.chuokai_ja_id` 等）は実装されていない。
- 取得結果は `before_value` として操作ログに格納する。

### 4.4 論理削除の実行

```sql
UPDATE t_file_upload
SET deleted_at = NOW()
WHERE file_upload_id = :file_upload_id
  AND deleted_at IS NULL
RETURNING *
```

同一トランザクション内で、§4.5.1 で登録したダウンロード行も論理削除する。
§4.6 で S3 実体を削除するため、残すと SCR-022 の一覧に表示されるのにダウンロード時に
404 となる行が生じる。突合キーは `file_path`（キーに UUID を含むため一意）。

```sql
UPDATE t_file_download
SET deleted_at = NOW()
WHERE file_path = :file_path
  AND deleted_at IS NULL
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
  "file_path": "ja-12345-00012345/files/a1b2c3d4-令和5年度_購読者リスト.csv",
  "file_size": 2831155,
  "status": 2,
  "upload_datetime": "2026-04-04T10:30:00+09:00",
  "scheduled_delete_date": "2026-10-04",
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

---

# API ACSMS-API-023-004

## 概要

| 項目                   | 内容                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Uploaded File Preview URL                                                                                                     |
| 概要                   | アップロード済みファイルのプレビュー用署名付き URL を取得する（画像 / PDF をブラウザ内で表示するため）                            |
| URI                    | /api/v1/file-upload/{file_upload_id}/preview                                                                                      |
| メソッド               | GET                                                                                                                               |
| リクエストボディー     | なし                                                                                                                              |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                  |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                            |
| 必要権限               | `file.download`                                                                                                                   |
| HTTPレスポンスコード   | 200:正常取得, 400:リクエストパラメータが不正です, 401:セッションが切れました, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラー |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 説明                                     |
| --- | -------------- | ------ | -------- | ---- | ---------------------------------------- |
| 1   | file_upload_id | Number | -        | 〇   | 対象ファイルの ID（パスパラメータ）      |

## レスポンスデータ

| #   | 項目ID        | タイプ | 繰り返し | Nullable | 説明                                             |
| --- | ------------- | ------ | -------- | -------- | ------------------------------------------------ |
| 1   | data          | Object | -        | -        | -                                                |
| 2   | →preview_url  | String | -        | -        | ストレージの署名付き URL（有効期限 1 時間＝3600秒。`PREVIEW_TTL_SECONDS`） |
| 3   | →file_name    | String | -        | -        | 元のファイル名                                   |

## レスポンス成功例

```json
{
  "data": {
    "preview_url": "https://storage.example.com/upload/xxx?X-Amz-Signature=...",
    "file_name": "増減連絡票_202608.pdf"
  }
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- `file_upload_id` を整数に変換する（`ParseIntPipe`）。変換できない場合 HTTP 400 `BAD_REQUEST`。

### 4.2 認証・認可チェック

- `SessionAuthGuard` → セッション不正なら HTTP 401 `UNAUTHORIZED`。
- `PermissionsGuard` で `file.download` を検査 → 権限が無ければ HTTP 403 `FORBIDDEN`。

### 4.3 対象ファイルの特定

- `file_upload_id` かつ `deleted_at IS NULL` で 1 件取得する。存在しない／論理削除済みの場合 HTTP 404 `NOT_FOUND`。
- DataScope を検査し、範囲外なら HTTP 404 でマスクする（存在を秘匿するため 403 ではなく 404）。

### 4.4 レスポンス生成

- ストレージに対する署名付き URL（有効期限 3600 秒＝1時間）を発行し、`preview_url` + `file_name` を返却する。HTTP 200。

---

# API ACSMS-API-023-005

## 概要

| 項目                   | 内容                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Download Uploaded File                                                                                                            |
| 概要                   | アップロード済みファイルを単体でダウンロードする（バイナリを attachment で返却）                                                  |
| URI                    | /api/v1/file-upload/{file_upload_id}/download                                                                                     |
| メソッド               | GET                                                                                                                               |
| リクエストボディー     | なし                                                                                                                              |
| リクエストパラメーター | file_upload_id（パスパラメータ）                                                                                                  |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                            |
| 必要権限               | `file.download`                                                                                                                   |
| HTTPレスポンスコード   | 200:ファイルバイナリ, 400:リクエストパラメータが不正です, 401:セッションが切れました, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 500:システムエラー |

## レスポンスデータ

正常時はバイナリストリームを返却する。JSON ボディは存在しない。共通ユーティリティ `sendBinaryAttachment`（`@/common/utils/file-delivery`、ACSMS-SCR-022 のダウンロードと共有）経由でレスポンスヘッダを設定する。

| ヘッダ               | 説明                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Content-Type          | ファイルの MIME タイプ（拡張子から `contentTypeFor` が判定。不明な拡張子は `application/octet-stream`） |
| Content-Disposition   | `attachment; filename="<ASCIIフォールバック名>"; filename*=UTF-8''<URLエンコードしたファイル名>`。日本語ファイル名は `filename*` 側に載せ、`filename` 側は非ASCII文字を `_` に置換したフォールバック |
| Content-Length        | ファイルサイズ（バイト）                                                                                |
| Cache-Control          | `no-store`                                                                                               |

## 処理手順

### 4.1〜4.3

ACSMS-API-023-004 と同一（バリデーション / 認証・認可 / 対象ファイルの特定・DataScope）。

### 4.4 ダウンロードと証跡記録

- ストレージからファイル本体を取得する。取得はトランザクション外で先に行い、失敗時に操作ログを残さない。
- `Content-Type` を拡張子から判定し（共通ユーティリティ `contentTypeFor`）、共通ユーティリティ `sendBinaryAttachment` で `Content-Disposition`（`filename`/`filename*` の二重指定）・`Content-Length`・`Cache-Control: no-store` を設定してバイナリを返却する。
- 操作ログ（`t_log`）に `operation = 'DOWNLOAD'` の証跡を記録する。

---

# API ACSMS-API-023-006

## 概要

| 項目                   | 内容                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Download Uploaded Files as ZIP                                                                                                    |
| 概要                   | 一覧で複数選択したアップロード済みファイルを 1 つの ZIP アーカイブにまとめて返却する                                              |
| URI                    | /api/v1/file-upload/download-zip                                                                                                  |
| メソッド               | POST                                                                                                                              |
| リクエストボディー     | あり（`file_upload_ids`）                                                                                                         |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                            |
| 必要権限               | `file.download`                                                                                                                   |
| レート制限             | 20 回 / 分                                                                                                                        |
| HTTPレスポンスコード   | 200:ZIPバイナリ, 400:入力値が不正です, 401:セッションが切れました, 403:この画面へのアクセス権限がありません, 404:指定されたファイルが見つかりません, 429:リクエスト回数が上限を超えました, 500:システムエラー |

## リクエストパラメータ

| #   | パラメーターID   | タイプ   | 繰り返し | 必須 | 最小 | 最大 | 説明                                                     |
| --- | ---------------- | -------- | -------- | ---- | ---- | ---- | -------------------------------------------------------- |
| 1   | file_upload_ids  | Number[] | 〇       | 〇   | 1    | 50   | 対象ファイルの ID 配列。**1〜50 件・重複不可・整数のみ** |

## リクエスト例

```
POST /api/v1/file-upload/download-zip
Content-Type: application/json

{
  "file_upload_ids": [101, 102, 103]
}
```

## レスポンスデータ

正常時は ZIP バイナリストリームを返却する。JSON ボディは存在しない。単体ダウンロード（ACSMS-API-023-005）と同じ共通ユーティリティ `sendBinaryAttachment` 経由でレスポンスヘッダを設定する。

| ヘッダ               | 説明                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Content-Type          | `application/zip`                                                                                       |
| Content-Disposition   | `attachment; filename="<ASCIIフォールバック名>"; filename*=UTF-8''<URLエンコードしたファイル名>`。ファイル名は `一括ダウンロード_<yyyyMMddHHmmss>.zip`（`compactTimestampJst()` — JST の日時14桁、区切り文字なし） |
| Content-Length        | ZIP ファイルサイズ（バイト）                                                                             |
| Cache-Control          | `no-store`                                                                                               |

## レスポンス失敗例

### 400 Validation Error（未選択 / 上限超過 / 重複）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "file_upload_ids", "message": "ファイルを選択してください。" }]
}
```

各制約に対応するメッセージ:

| 制約 | メッセージ |
| --- | --- |
| 配列でない | `ファイルIDの形式が不正です。` |
| 0 件 | `ファイルを選択してください。` |
| 51 件以上 | `一括ダウンロードは最大50件までです。` |
| 重複あり | `ファイルIDが重複しています。` |
| 整数でない | `ファイルIDは整数で指定してください。` |

## 処理手順

### 4.1 リクエストのバリデーション

- `file_upload_ids` を上表の制約で検証する。違反時 HTTP 400 `VALIDATION_ERROR`。

### 4.2 認証・認可チェック

- ACSMS-API-023-004 と同一。加えてレート制限 20 回 / 分。

### 4.3 対象ファイルの特定

- 各 ID について `deleted_at IS NULL` かつ DataScope 内であることを検査する。1 件でも該当しない場合 HTTP 404 `NOT_FOUND`（部分成功はしない）。

### 4.4 ZIP 生成と証跡記録

- 各ファイルをストレージから並列取得し（`Promise.all`）、共通ユーティリティ `buildZipArchive` で 1 つの ZIP アーカイブへまとめる。
- ZIP ファイル名は `一括ダウンロード_<yyyyMMddHHmmss>`（JST、`compactTimestampJst()` — 区切りなしの日時14桁）+ `.zip`。
- 共通ユーティリティ `sendBinaryAttachment` で `Content-Disposition`（`filename`/`filename*` 二重指定）・`Content-Length`・`Cache-Control: no-store` を設定して `attachment` で返却する。
- 操作ログ（`t_log`）は ZIP 全体で **1 件**記録する（ファイルごとには記録しない）。
- `t_file_upload` への新規 INSERT は行わない。
