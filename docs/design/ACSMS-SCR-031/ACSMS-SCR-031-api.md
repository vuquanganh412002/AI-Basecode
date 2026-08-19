---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-031
screen_name: お知らせ一覧画面
format_code: 18-BM/PM/VTI
format_version: "1.5"
issue_date: 2026-04-17
created_date: 2026/04/17
created_by: Dao Van Thang
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/17 | 1.0  | Dao Van Thang | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/28 | 1.1  | Tran Duc Tuyen | エラーメッセージ更新：`DEADLINE_NOTICE_DUPLICATE` を「公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。」（公開場所＋種別を明示し、衝突原因をユーザーに伝える）に変更 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/05/28 | 1.2  | Tran Duc Tuyen | PUBLISH_LOCATION に code=3「メニュー画面（締め切り時間）」を追加。oshirase_type=4 ⇔ publish_location=3 の 1:1 ペアリングを必須化。`publish_location` の `@IsIn` を `[1, 2, 3]` に拡張、pairing 違反は `VALIDATION_ERROR + errors[publish_location|oshirase_type]` で返却。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/08/16 | 1.3  | Tran Duc Tuyen | 実装との突合により以下を反映：①一覧/詳細レスポンスに `ja_name` を追加し、一覧レスポンスに漏れていた `target_kanri_kubun` を追記。②全エラーメッセージJSON例で欠落していた文末の句点「。」を補完。 | - | - |
| 5   | 2026/08/17 | 1.4  | Tran Duc Tuyen | No.4（1.3）が未完了/誤りのまま残していた項目を実装との再突合で修正：①登録・更新レスポンスにも `ja_name`（常に`null`。m_ja結合を行うのは一覧APIのみ）を追加（1.3では一覧・詳細のみ反映され登録・更新に漏れていた）。②詳細APIの4.4に残っていた「値をラベルにマッピング」という誤記（実装は`*_label`を返さないno-labels-policy）を、一覧API4.6と同じ表記に修正。③登録・更新4.1の `publish_location` 許容値が「1 または 2」のまま未修正だった箇所を「1、2 または 3」に訂正し、締め切り時間ペアリング検証・重複チェック・期間相関チェック・過去日チェックを登録4.3／更新4.4の独立ステップとして明記（以降のセクション番号を採番し直し）。④更新の `publish_end_date` に残っていた実装に存在しない「未来日または未設定の場合のみ変更可能」という誤記（パラメータ表・4.1双方）を削除。⑤削除APIの概要表・レスポンス失敗例が1.3で未反映だった締め切り時間（type=4）削除不可時の `400 BAD_REQUEST` を実際に追加し、あわせて4.2に欠落していた `oshirase.delete` 権限チェック明記と欠番だった4.3見出しを補完。⑥エラー一覧 No.10 の エラーコード欄を実装の `error_code`（`BAD_REQUEST`。共通No.1と同一）に合わせて訂正し、区別用の説明を備考欄へ移動（ACSMS-SCR-009 api.mdと同じ表記規約）。⑦共用API ACSMS-API-COMMON-003（JAプルダウン）が1.3で「更新済み」と記載されながら本文が旧仕様（`todofuken_code`/`role_id`のみ、ページングなし）のまま残っていたため、`GET /api/v1/ja/dropdown`（ja.controller.ts / ja.service.ts dropdown()）の現行実装に合わせてパラメータ表・レスポンス表・JSON例・処理手順を全面書き直し（`q`/`page`/`per_page`/`include_id`/`match_field`/`todofuken_code`/`role_id`/`scope` とページング `meta`{total,page,per_page,has_more}、DataScope適用）。 | - | - |
| 6   | 2026/08/17 | 1.5  | Tran Duc Tuyen | No.5（1.4）でも未反映のまま残っていた項目をコード・単体テスト（`oshirase.controller.spec.ts`/`oshirase.service.spec.ts`/`ja.controller.spec.ts`）との再突合で修正：①登録・更新のレスポンスに欠落していた `message`（`"登録しました。"` / `"更新しました。"`）フィールドをレスポンスデータ表・JSON成功例に追加（`OshiraseMutationResponseDto` は `data` と `message` を返す。controller spec 452行目「should return 201 with created body + message」/526行目「should return 200 with updated body + message」で確認）。②登録4.1のリクエストボディ検証リストに漏れていた `target_kanri_kubun` を追記。③更新4.1のリクエストボディ検証リストに漏れていた `oshirase_type` を追記（両者とも他方には存在していたが自身には抜けていた）。④更新は登録と同じ `DEADLINE_NOTICE_DUPLICATE` 判定（oshirase.service.ts update() 495-504行目、自レコード除外）を通るにもかかわらず概要表・レスポンス失敗例に反映されていなかったため、「400:同種別レコード重複」と `DEADLINE_NOTICE_DUPLICATE` の失敗例JSONを登録APIと同様に追加。⑤一覧APIおよび共用API ACSMS-API-COMMON-003（JAプルダウン）の4.1「不正なパラメータ」を誤って `BAD_REQUEST` としていたのを `VALIDATION_ERROR` + errors配列に訂正（両者ともクエリDTOは class-validator + グローバル `ValidationPipe` 経由で検証され `VALIDATION_ERROR` を返す。パスパラメータ `oshirase_id`（`ParseIntPipe`）のみ `BAD_REQUEST` のままで正しい。`oshirase.controller.spec.ts` 390行目「should return 400 VALIDATION_ERROR when per_page exceeds 100」、`ja.controller.spec.ts` 662/676行目で確認）。あわせて両APIの概要表・レスポンス失敗例に400 Validation Errorの記載を追加。⑥更新のリクエストパラメータ表 `target_kanri_kubun` の説明を登録側と揃え「（未入力=全選択）」を補記。 | - | - |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「お知らせ一覧画面（ACSMS-SCR-031）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                |
| --- | -------------------- | ----------------------------------------------------- |
| 1   | ACSMS-API-COMMON-003 | Get JA Dropdown (`GET /api/v1/ja/dropdown`) — 定義元: ACSMS-SCR-024 |

※ 本画面のJAプルダウンは共用API ACSMS-API-COMMON-003 を使用する。

## エラー一覧

| #   | エラータイプ | エラーコード            | エラーメッセージ                                                       | 備考     |
| --- | ------------ | ----------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST             | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED            | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN               | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | VALIDATION_ERROR        | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 5   | 共通         | TOO_MANY_REQUESTS       | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 6   | 共通         | INTERNAL_SERVER_ERROR   | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 7   | 画面固有     | NOT_FOUND      | 指定されたお知らせが見つかりません。                                   | HTTP 404 |
| 8   | 画面固有     | CONFLICT        | 関連データが存在するため削除できません。                               | HTTP 409 |
| 9   | 画面固有     | DEADLINE_NOTICE_DUPLICATE | 公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。                                                     | HTTP 400 |
| 10  | 画面固有     | BAD_REQUEST    | 締め切り時間のお知らせは削除できません。                               | HTTP 400（締め切り時間＝oshirase_type=4 のレコードを削除しようとした場合。oshirase.service.ts remove()） |

---

# API ACSMS-API-031-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Get Oshirase List                                                                                                                                                                                            |
| 概要                   | お知らせ一覧を取得する（ページネーション対応）                                                                                                                                                               |
| URI                    | /api/v1/oshirase                                                                                                                                                                                             |
| メソッド               | GET                                                                                                                                                                                                          |
| リクエストボディー     | なし                                                                                                                                                                                                         |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常にお知らせ一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                         |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------ |
| 1   | page           | Number  | -        | -    |        |        | ページ番号（デフォルト: 1）                                  |
| 2   | per_page       | Number  | -        | -    |        |        | 1ページの件数（デフォルト: 20、最大: 100）                   |
| 3   | sort_by        | String  | -        | -    |        |        | ソートカラム（デフォルト: created_at）                       |
| 4   | sort_order     | String  | -        | -    |        |        | ソート順（asc / desc、デフォルト: desc）                     |

## レスポンスデータ

| #   | 項目ID                      | タイプ  | 繰り返し | フォーマット        | Nullable | 説明                                                     |
| --- | --------------------------- | ------- | -------- | ------------------- | -------- | -------------------------------------------------------- |
| 1   | data                        | Array   | 〇       |                     | -        | お知らせ一覧                                             |
| 2   | →oshirase_id                | Number  | -        |                     | -        | お知らせID                                               |
| 3   | →ja_id                      | Number  | -        |                     | 〇       | JA ID（NULL = 全JA向け）                                 |
| 3.1 | →ja_name                    | String  | -        |                     | 〇       | JA名称。当ページ内の distinct ja_id をキーに m_ja からバッチ解決（N+1回避のためバッチSELECT）。ja_id が NULL、または参照先JAが物理削除済みの場合は NULL（FEは「全JA向け」と表示） |
| 4   | →oshirase_type              | Number  | -        |                     | -        | お知らせ種別 ※m_code.code_category='OSHIRASE_TYPE'を参照（1:システム, 2:重要, 3:一般, 4:締め切り時間）。FE は useCodesStore().label(...) でラベル解決 |
| 5   | →publish_location           | Number  | -        |                     | -        | 公開場所 ※m_code.code_category='PUBLISH_LOCATION'を参照（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）。3 は oshirase_type=4 専用）               |
| 6   | →status                     | Number  | -        |                     | -        | 状態 ※m_code.code_category='OSHIRASE_STATUS'を参照（1:下書き, 2:公開, 3:非公開）                       |
| 10  | →title                      | String  | -        |                     | -        | お知らせタイトル                                         |
| 11  | →publish_start_date         | String  | -        | YYYY/MM/DD HH:mm    | -        | 表示開始日時                                             |
| 12  | →publish_end_date           | String  | -        | YYYY/MM/DD HH:mm    | 〇       | 表示終了日時（NULL = 無期限）                            |
| 12.1 | →target_kanri_kubun        | String  | -        |                     | -        | 対象管理者区分（カンマ区切りの role_id、空文字 = 全区分対象）              |
| 13  | →created_at                 | String  | -        | ISO8601             | -        | 作成日時                                                 |
| 14  | →updated_at                 | String  | -        | ISO8601             | -        | 更新日時                                                 |
| 15  | meta                        | Object  | -        |                     | -        | ページネーション情報                                     |
| 16  | →total                      | Number  | -        |                     | -        | 総件数                                                   |
| 17  | →page                       | Number  | -        |                     | -        | 現在ページ番号                                           |
| 18  | →per_page                   | Number  | -        |                     | -        | 1ページの件数                                            |
| 19  | →total_pages                | Number  | -        |                     | -        | 総ページ数                                               |

## リクエスト例

```
GET /api/v1/oshirase?page=1&per_page=20&sort_by=created_at&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "oshirase_id": 1,
      "ja_id": null,
      "ja_name": null,
      "oshirase_type": 1,
      "publish_location": 2,
      "status": 2,
      "title": "システムメンテナンスのお知らせ",
      "publish_start_date": "2026/04/01 09:00",
      "publish_end_date": "2026/04/30 23:59",
      "target_kanri_kubun": "",
      "created_at": "2026-03-25T10:00:00Z",
      "updated_at": "2026-03-25T10:00:00Z"
    },
    {
      "oshirase_id": 2,
      "ja_id": 1,
      "ja_name": "JA東京",
      "oshirase_type": 3,
      "publish_location": 1,
      "status": 1,
      "title": "新機能リリースのお知らせ",
      "publish_start_date": "2026/04/15 00:00",
      "publish_end_date": null,
      "target_kanri_kubun": "1,2,3",
      "created_at": "2026-04-10T08:30:00Z",
      "updated_at": "2026-04-10T08:30:00Z"
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

### 400 Validation Error

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "per_page", "message": "per_pageは1〜100の範囲で指定してください。" }
  ]
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
  - page：数値型チェック、1以上
  - per_page：数値型チェック、1〜100
  - sort_by：許可カラム一覧に含まれるか確認（oshirase_id, title, status, publish_location, publish_start_date, created_at）
  - sort_order：`asc` または `desc`
- デフォルト値を設定する（page=1, per_page=20, sort_order=desc）。
  **sort_by を省略した場合の既定並び順は `COALESCE(updated_at, created_at)` の降順**（作成・更新どちらでも最近触れたお知らせが上位に来る）。
- 不正なパラメータの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列（クエリDTOは class-validator + グローバル `ValidationPipe` で検証されるため、パスパラメータ `oshirase_id`（`ParseIntPipe`）と異なり `BAD_REQUEST` でなく `VALIDATION_ERROR` を返す。`oshirase.controller.spec.ts`「should return 400 VALIDATION_ERROR when per_page exceeds 100」で確認）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`oshirase.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得条件の設定

- DataScope：本画面はNICHINO_ADMINのみ使用するため、JA絞込みは不要。

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_oshirase
WHERE deleted_at IS NULL
```

### 4.5 データ取得

- 締め切り時間（oshirase_type=4）は要求された並び順に関わらず常に先頭に固定する（`(oshirase_type = 4) DESC` を第1ソートキーにする）。
- 第2ソートキーは sort_by 指定時はそのカラム、未指定時は `COALESCE(updated_at, created_at)`。

```sql
SELECT oshirase_id, ja_id, oshirase_type, publish_location, status,
       title, publish_start_date, publish_end_date, target_kanri_kubun,
       created_at, updated_at
FROM t_oshirase
WHERE deleted_at IS NULL
ORDER BY (oshirase_type = 4) DESC,           -- 締め切り時間を先頭に固定
         COALESCE(updated_at, created_at) DESC -- 既定（sort_by 指定時はそのカラム :sort_order）
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- [ja-name-batch] `ja_name` は上記1本のSQLには含まれない。取得した行から distinct な `ja_id` を集め、追加で1回だけバッチSELECTして `ja_id → ja_name` の Map を作り、レスポンス生成時に付加する（行毎ルックアップによるN+1を回避）。

```sql
SELECT ja_id, ja_name
FROM m_ja
WHERE ja_id IN (:...distinctJaIds)
  AND deleted_at IS NULL
```

### 4.6 レスポンス生成

- [no-labels-policy] oshirase_type（1:システム, 2:重要, 3:一般, 4:締め切り時間） / publish_location（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）） / status（1:下書き, 2:公開, 3:非公開）は**コード値のまま**返却する。BEはラベル文字列へ変換しない（`*_label` フィールドは含まれない）。FEが `useCodesStore().label('OSHIRASE_TYPE'|'PUBLISH_LOCATION'|'OSHIRASE_STATUS', value)` でラベルを解決する。
- publish_start_date / publish_end_date を `YYYY/MM/DD HH:mm` 形式でフォーマットする。
- data 配列と meta オブジェクトを含むJSONを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-031-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Oshirase Detail                                                                                                                                                                                                                |
| 概要                   | 指定したお知らせの詳細を取得する（編集モード用）                                                                                                                                                                                   |
| URI                    | /api/v1/oshirase/{oshirase_id}                                                                                                                                                                                                     |
| メソッド               | GET                                                                                                                                                                                                                                |
| リクエストボディー     | なし                                                                                                                                                                                                                               |
| リクエストパラメーター | oshirase_id（パスパラメータ）                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                             |
| HTTPレスポンスコード   | 200:正常にお知らせ詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたお知らせが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                        |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------- |
| 1   | oshirase_id    | Number | -        | 〇   |        |        | 取得対象のoshirase_id（パスパラメータ）     |

## レスポンスデータ

| #   | 項目ID                  | タイプ | 繰り返し | フォーマット        | Nullable | 説明                                                       |
| --- | ----------------------- | ------ | -------- | ------------------- | -------- | ---------------------------------------------------------- |
| 1   | data                    | Object | -        |                     | -        |                                                            |
| 2   | →oshirase_id            | Number | -        |                     | -        | お知らせID                                                 |
| 3   | →ja_id                  | Number | -        |                     | 〇       | JA ID（NULL = 全JA向け）                                   |
| 3.1 | →ja_name                | String | -        |                     | 〇       | JA名称。**本APIはm_ja結合を行わないため常にNULL**（ja_nameの実値解決は一覧API ACSMS-API-031-001のみ。実装がそのまま維持されている場合の既知の制約） |
| 4   | →oshirase_type          | Number | -        |                     | -        | お知らせ種別 ※m_code.code_category='OSHIRASE_TYPE'を参照 |
| 5   | →publish_location       | Number | -        |                     | -        | 公開場所 ※m_code.code_category='PUBLISH_LOCATION'を参照（3 は oshirase_type=4 専用） |
| 6   | →status                 | Number | -        |                     | -        | 状態 ※m_code.code_category='OSHIRASE_STATUS'を参照       |
| 7   | →title                  | String | -        |                     | -        | お知らせタイトル                                           |
| 8   | →content                | String | -        |                     | -        | 内容                                                       |
| 12  | →publish_start_date     | String | -        | YYYY/MM/DD HH:mm    | -        | 表示開始日時                                               |
| 13  | →publish_end_date       | String | -        | YYYY/MM/DD HH:mm    | 〇       | 表示終了日時（NULL = 無期限）                              |
| 14  | →target_kanri_kubun     | String | -        |                     | -        | 対象管理者区分（カンマ区切り、空文字=全区分）              |
| 15  | →created_at             | String | -        | ISO8601             | -        | 作成日時                                                   |
| 16  | →updated_at             | String | -        | ISO8601             | -        | 更新日時                                                   |

## リクエスト例

```
GET /api/v1/oshirase/1
```

## レスポンス成功例

```json
{
  "data": {
    "oshirase_id": 1,
    "ja_id": null,
    "ja_name": null,
    "oshirase_type": 1,
    "publish_location": 2,
    "status": 2,
    "title": "システムメンテナンスのお知らせ",
    "content": "4月1日（月）02:00〜06:00にシステムメンテナンスを実施いたします。",
    "publish_start_date": "2026/04/01 09:00",
    "publish_end_date": "2026/04/30 23:59",
    "target_kanri_kubun": "1,2,3",
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": "2026-03-25T10:00:00Z"
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
  "message": "指定されたお知らせが見つかりません。"
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
  - oshirase_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`oshirase.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得

```sql
SELECT oshirase_id, ja_id, oshirase_type, publish_location, status,
       title, content, publish_start_date, publish_end_date,
       target_kanri_kubun, created_at, updated_at
FROM t_oshirase
WHERE oshirase_id = :oshirase_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.4 レスポンス生成

- [no-labels-policy] oshirase_type（1:システム, 2:重要, 3:一般, 4:締め切り時間） / publish_location（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）） / status（1:下書き, 2:公開, 3:非公開）は**コード値のまま**返却する。BEはラベル文字列へ変換しない（`*_label` フィールドは含まれない）。FEが `useCodesStore().label('OSHIRASE_TYPE'|'PUBLISH_LOCATION'|'OSHIRASE_STATUS', value)` でラベルを解決する。
- publish_start_date / publish_end_date を `YYYY/MM/DD HH:mm` 形式でフォーマットする。
- ja_name は常に `null`（本APIはm_ja結合を行わないため。§レスポンスデータ 3.1 参照）。
- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-031-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Oshirase                                                                                                                                                                                                                                    |
| 概要                   | 新しいお知らせを登録する                                                                                                                                                                                                                           |
| URI                    | /api/v1/oshirase                                                                                                                                                                                                                                   |
| メソッド               | POST                                                                                                                                                                                                                                               |
| リクエストボディー     | JSON                                                                                                                                                                                                                                               |
| リクエストパラメーター | なし                                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                             |
| HTTPレスポンスコード   | 201:登録しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:同種別レコード重複, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID      | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                       |
| --- | ------------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------- |
| 1   | title               | String  | -        | 〇   | 1      | 200    | お知らせタイトル                                           |
| 2   | publish_location    | Number  | -        | 〇   |        |        | 公開場所（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）。3 は oshirase_type=4 専用）                 |
| 3   | status              | Number  | -        | 〇   |        |        | 状態（1:下書き, 2:公開, 3:非公開）                         |
| 4   | publish_start_date  | String  | -        | 〇   |        |        | 表示開始日時（YYYY/MM/DD HH:mm、過去日不可）               |
| 5   | publish_end_date    | String  | -        | -    |        |        | 表示終了日時（YYYY/MM/DD HH:mm、NULL=無期限）              |
| 6   | ja_id               | Number  | -        | -    |        |        | JA ID（NULL=全JA向け）                                     |
| 7   | oshirase_type       | Number  | -        | 〇   |        |        | お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間） |
| 8   | target_kanri_kubun  | String  | -        | -    |        | 20     | 対象管理者区分（カンマ区切り、未入力=全選択）              |
| 9   | content             | String  | -        | 〇   | 1      | 2000   | 内容                                                       |

## レスポンスデータ

| #   | 項目ID                  | タイプ | 繰り返し | フォーマット        | Nullable | 説明                                                       |
| --- | ----------------------- | ------ | -------- | ------------------- | -------- | ---------------------------------------------------------- |
| 1   | data                    | Object | -        |                     | -        | 登録されたお知らせデータ                                   |
| 2   | →oshirase_id            | Number | -        |                     | -        | お知らせID                                                 |
| 3   | →ja_id                  | Number | -        |                     | 〇       | JA ID（NULL = 全JA向け）                                   |
| 3.1 | →ja_name                | String | -        |                     | 〇       | JA名称。**本APIはm_ja結合を行わないため常にNULL**（ja_nameの実値解決は一覧API ACSMS-API-031-001のみ） |
| 4   | →oshirase_type          | Number | -        |                     | -        | お知らせ種別 ※m_code.code_category='OSHIRASE_TYPE'を参照 |
| 5   | →publish_location       | Number | -        |                     | -        | 公開場所 ※m_code.code_category='PUBLISH_LOCATION'を参照（3 は oshirase_type=4 専用） |
| 6   | →status                 | Number | -        |                     | -        | 状態 ※m_code.code_category='OSHIRASE_STATUS'を参照       |
| 7   | →title                  | String | -        |                     | -        | お知らせタイトル                                           |
| 8   | →content                | String | -        |                     | -        | 内容                                                       |
| 12  | →publish_start_date     | String | -        | YYYY/MM/DD HH:mm    | -        | 表示開始日時                                               |
| 13  | →publish_end_date       | String | -        | YYYY/MM/DD HH:mm    | 〇       | 表示終了日時（NULL = 無期限）                              |
| 14  | →target_kanri_kubun     | String | -        |                     | -        | 対象管理者区分（カンマ区切り）                             |
| 15  | →created_at             | String | -        | ISO8601             | -        | 作成日時                                                   |
| 16  | →updated_at             | String | -        | ISO8601             | -        | 更新日時                                                   |
| 17  | message                 | String | -        |                     | -        | 処理結果メッセージ（`登録しました。`）                     |

## リクエスト例

```json
POST /api/v1/oshirase
Content-Type: application/json

{
  "title": "システムメンテナンスのお知らせ",
  "publish_location": 2,
  "status": 2,
  "publish_start_date": "2026/04/20 09:00",
  "publish_end_date": "2026/04/30 23:59",
  "ja_id": null,
  "oshirase_type": 1,
  "target_kanri_kubun": "1,2,3",
  "content": "4月20日よりシステムメンテナンスを実施します。"
}
```

## レスポンス成功例

```json
{
  "data": {
    "oshirase_id": 10,
    "ja_id": null,
    "ja_name": null,
    "oshirase_type": 1,
    "publish_location": 2,
    "status": 2,
    "title": "システムメンテナンスのお知らせ",
    "content": "4月20日よりシステムメンテナンスを実施します。",
    "publish_start_date": "2026/04/20 09:00",
    "publish_end_date": "2026/04/30 23:59",
    "target_kanri_kubun": "1,2,3",
    "created_at": "2026-04-17T10:00:00Z",
    "updated_at": "2026-04-17T10:00:00Z"
  },
  "message": "登録しました。"
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

### 400 Bad Request（締め切り時間重複）

```json
{
  "error_code": "DEADLINE_NOTICE_DUPLICATE",
  "message": "公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。"
}
```

### 400 Validation Error

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "title", "message": "お知らせタイトルは必須です。" },
    { "field": "publish_end_date", "message": "終了日は開始日より後にしてください。" }
  ]
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - title：必須、最大200文字
  - publish_location：必須、1、2 または 3（3 は oshirase_type=4 専用。ペアリングの相関検証は 4.3 で実施）
  - status：必須、1、2 または 3
  - publish_start_date：必須、有効な日時形式（YYYY/MM/DD HH:mm）（過去日不可の検証は 4.3 で実施）
  - publish_end_date：任意、有効な日時形式（YYYY/MM/DD HH:mm）（publish_start_date 以降であることの相関検証は 4.3 で実施）
  - ja_id：任意、数値型チェック
  - oshirase_type：必須、1、2、3 または 4
  - target_kanri_kubun：任意、最大20文字
  - content：必須、最大2000文字
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`oshirase.create` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 業務ルール検証（ペアリング・重複・期間相関・過去日）

- **ペアリング検証**：oshirase_type=4（締め切り時間）⇔ publish_location=3（メニュー画面（締め切り時間））の1:1対応を検査する。
  - oshirase_type=4 かつ publish_location≠3：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_location', message: '締め切り時間のお知らせは「メニュー画面（締め切り時間）」のみ選択できます。' }]`
  - oshirase_type≠4 かつ publish_location=3：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'oshirase_type', message: '「メニュー画面（締め切り時間）」は締め切り時間のお知らせ専用です。' }]`
- **重複チェック**：oshirase_type = 4（締め切り時間）の場合、`publish_location` に関わらず既存レコードの存在を確認する（システム全体で1件のみ許容）。

```sql
SELECT COUNT(*)
FROM t_oshirase
WHERE oshirase_type = 4
  AND deleted_at IS NULL
```

  - 既存レコードが存在する場合：HTTP 400 (`DEADLINE_NOTICE_DUPLICATE`)
- **期間相関チェック**：publish_end_date が指定されている場合、publish_start_date 以降であること（等時刻は許可、NULL=無期限は対象外）。
  - 違反時：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_end_date', message: '終了日は開始日より後にしてください。' }]`
- **過去日チェック**：publish_start_date が現在時刻（分精度）より前でないこと。
  - 違反時：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_start_date', message: '過去日は選択できません。' }]`

### 4.4 データ登録

- target_kanri_kubun が未入力の場合、空文字列を設定する（全区分対象）。

```sql
INSERT INTO t_oshirase (ja_id, oshirase_type, publish_location, status,
                        title, content, publish_start_date, publish_end_date,
                        target_kanri_kubun,
                        created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :oshirase_type, :publish_location, :status,
        :title, :content, :publish_start_date, :publish_end_date,
        :target_kanri_kubun,
        NOW(), :user_account_id, NOW(), :user_account_id)
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
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'CREATE', 1,
        :oshirase_id, 't_oshirase',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：INSERT のため空文字列を設定する。
`after_value`：登録されたデータをJSON形式で格納する。

{
  "oshirase_id": 10,
  "ja_id": null,
  "oshirase_type": 1,
  "publish_location": 2,
  "status": 2,
  "title": "システムメンテナンスのお知らせ",
  "publish_start_date": "2026-04-20T09:00:00Z",
  "publish_end_date": "2026-04-30T23:59:00Z",
  "target_kanri_kubun": "1,2,3"
}
```

### 4.6 レスポンス生成

- 登録されたデータを data オブジェクトとして返却する。HTTP 201。

### 4.7 例外処理

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
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'CREATE', 2,
        NULL, 't_oshirase',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-031-004

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Oshirase                                                                                                                                                                                                                                         |
| 概要                   | 指定したお知らせを更新する                                                                                                                                                                                                                              |
| URI                    | /api/v1/oshirase/{oshirase_id}                                                                                                                                                                                                                          |
| メソッド               | PATCH                                                                                                                                                                                                                                                   |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                    |
| リクエストパラメーター | oshirase_id（パスパラメータ）                                                                                                                                                                                                                           |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                  |
| HTTPレスポンスコード   | 200:更新しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたお知らせが見つかりません, 400:同種別レコード重複, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID      | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                   |
| --- | ------------------- | ------- | -------- | ---- | ------ | ------ | -------------------------------------------------------------------------------------- |
| 1   | oshirase_id         | Number  | -        | 〇   |        |        | 更新対象のoshirase_id（パスパラメータ）                                                |
| 2   | title               | String  | -        | 〇   | 1      | 200    | お知らせタイトル                                                                       |
| 3   | publish_location    | Number  | -        | 〇   |        |        | 公開場所（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）。3 は oshirase_type=4 専用）                                             |
| 4   | status              | Number  | -        | 〇   |        |        | 状態（1:下書き, 2:公開, 3:非公開）                                                     |
| 5   | publish_start_date  | String  | -        | 〇   |        |        | 表示開始日時（YYYY/MM/DD HH:mm）。開始日が未来日の場合のみ変更可能。過去日は変更不可。 |
| 6   | publish_end_date    | String  | -        | -    |        |        | 表示終了日時（YYYY/MM/DD HH:mm、NULL=無期限）。publish_start_date 以降であること。      |
| 7   | ja_id               | Number  | -        | -    |        |        | JA ID（NULL=全JA向け）                                                                 |
| 8   | oshirase_type       | Number  | -        | 〇   |        |        | お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間）                             |
| 9   | target_kanri_kubun  | String  | -        | -    |        | 20     | 対象管理者区分（カンマ区切り、未入力=全選択）                                          |
| 10  | content             | String  | -        | 〇   | 1      | 2000   | 内容                                                                                   |

## レスポンスデータ

| #   | 項目ID                  | タイプ | 繰り返し | フォーマット        | Nullable | 説明                                                       |
| --- | ----------------------- | ------ | -------- | ------------------- | -------- | ---------------------------------------------------------- |
| 1   | data                    | Object | -        |                     | -        | 更新されたお知らせデータ                                   |
| 2   | →oshirase_id            | Number | -        |                     | -        | お知らせID                                                 |
| 3   | →ja_id                  | Number | -        |                     | 〇       | JA ID（NULL = 全JA向け）                                   |
| 3.1 | →ja_name                | String | -        |                     | 〇       | JA名称。**本APIはm_ja結合を行わないため常にNULL**（ja_nameの実値解決は一覧API ACSMS-API-031-001のみ） |
| 4   | →oshirase_type          | Number | -        |                     | -        | お知らせ種別 ※m_code.code_category='OSHIRASE_TYPE'を参照 |
| 5   | →publish_location       | Number | -        |                     | -        | 公開場所 ※m_code.code_category='PUBLISH_LOCATION'を参照（3 は oshirase_type=4 専用） |
| 6   | →status                 | Number | -        |                     | -        | 状態 ※m_code.code_category='OSHIRASE_STATUS'を参照       |
| 7   | →title                  | String | -        |                     | -        | お知らせタイトル                                           |
| 8   | →content                | String | -        |                     | -        | 内容                                                       |
| 12  | →publish_start_date     | String | -        | YYYY/MM/DD HH:mm    | -        | 表示開始日時                                               |
| 13  | →publish_end_date       | String | -        | YYYY/MM/DD HH:mm    | 〇       | 表示終了日時（NULL = 無期限）                              |
| 14  | →target_kanri_kubun     | String | -        |                     | -        | 対象管理者区分（カンマ区切り）                             |
| 15  | →created_at             | String | -        | ISO8601             | -        | 作成日時                                                   |
| 16  | →updated_at             | String | -        | ISO8601             | -        | 更新日時                                                   |
| 17  | message                 | String | -        |                     | -        | 処理結果メッセージ（`更新しました。`）                     |

## リクエスト例

```json
PATCH /api/v1/oshirase/1
Content-Type: application/json

{
  "title": "システムメンテナンスのお知らせ（更新）",
  "publish_location": 2,
  "status": 2,
  "publish_start_date": "2026/04/20 09:00",
  "publish_end_date": "2026/05/31 23:59",
  "ja_id": null,
  "oshirase_type": 1,
  "target_kanri_kubun": "1,2",
  "content": "4月20日〜5月31日にシステムメンテナンスを実施します。"
}
```

## レスポンス成功例

```json
{
  "data": {
    "oshirase_id": 1,
    "ja_id": null,
    "ja_name": null,
    "oshirase_type": 1,
    "publish_location": 2,
    "status": 2,
    "title": "システムメンテナンスのお知らせ（更新）",
    "content": "4月20日〜5月31日にシステムメンテナンスを実施します。",
    "publish_start_date": "2026/04/20 09:00",
    "publish_end_date": "2026/05/31 23:59",
    "target_kanri_kubun": "1,2",
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": "2026-04-17T14:30:00Z"
  },
  "message": "更新しました。"
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
  "message": "指定されたお知らせが見つかりません。"
}
```

### 400 Bad Request（締め切り時間重複）

```json
{
  "error_code": "DEADLINE_NOTICE_DUPLICATE",
  "message": "公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。"
}
```

※ 編集中の自レコードは判定から除外される（`oshirase_id <> :oshirase_id`）。他の既存レコードが oshirase_type=4 を占めている場合のみ発生する（oshirase.service.ts update() 495-504行目）。

### 400 Validation Error

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "publish_end_date", "message": "終了日は開始日より後にしてください。" }
  ]
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：oshirase_id 数値型チェック、必須
- リクエストボディの検証：
  - title：必須、最大200文字
  - publish_location：必須、1、2 または 3（3 は oshirase_type=4 専用。ペアリングの相関検証は 4.4 で実施）
  - status：必須、1、2 または 3
  - publish_start_date：必須、有効な日時形式（YYYY/MM/DD HH:mm）（過去日の変更可否検証は 4.4 で実施）
  - publish_end_date：任意、有効な日時形式（YYYY/MM/DD HH:mm）（publish_start_date 以降であることの相関検証は 4.4 で実施）
  - ja_id：任意、数値型チェック
  - oshirase_type：必須、1、2、3 または 4
  - target_kanri_kubun：任意、最大20文字
  - content：必須、最大2000文字
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`oshirase.update` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認

```sql
SELECT oshirase_id, ja_id, oshirase_type, publish_location, status,
       title, content, publish_start_date, publish_end_date,
       target_kanri_kubun, created_at, updated_at
FROM t_oshirase
WHERE oshirase_id = :oshirase_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.4 業務ルール検証（ペアリング・重複・期間相関・過去日）

- **ペアリング検証**：oshirase_type=4（締め切り時間）⇔ publish_location=3（メニュー画面（締め切り時間））の1:1対応を検査する（create と同一ルール）。
  - oshirase_type=4 かつ publish_location≠3：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_location', message: '締め切り時間のお知らせは「メニュー画面（締め切り時間）」のみ選択できます。' }]`
  - oshirase_type≠4 かつ publish_location=3：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'oshirase_type', message: '「メニュー画面（締め切り時間）」は締め切り時間のお知らせ専用です。' }]`
- **重複チェック**：oshirase_type = 4（締め切り時間）の場合、編集中の自レコードを除外した上で既存レコードの存在を確認する（システム全体で1件のみ許容。自身の保存で誤検知しないよう `oshirase_id <> :oshirase_id` を付加）。

```sql
SELECT COUNT(*)
FROM t_oshirase
WHERE oshirase_type = 4
  AND deleted_at IS NULL
  AND oshirase_id <> :oshirase_id
```

  - 既存レコードが存在する場合：HTTP 400 (`DEADLINE_NOTICE_DUPLICATE`)
- **期間相関チェック**：publish_end_date が指定されている場合、publish_start_date 以降であること（等時刻は許可、NULL=無期限は対象外）。
  - 違反時：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_end_date', message: '終了日は開始日より後にしてください。' }]`
- **過去日チェック**（分精度）：publish_start_date の値を「分」精度で 4.3 取得済みの現在値と比較し、変更されている場合のみ検査する（値が変更されていなければ、既存が過去日でもそのまま保存を許可する — read-only 維持）。
  - 保存済み開始日時が既に過去日（かつ値が変更されている）、または新しい値が現在時刻（分精度）より前：HTTP 400 (`VALIDATION_ERROR`) + `errors[{ field: 'publish_start_date', message: '過去日は選択できません。' }]`

### 4.5 データ更新

```sql
UPDATE t_oshirase
SET ja_id = :ja_id,
    oshirase_type = :oshirase_type,
    publish_location = :publish_location,
    status = :status,
    title = :title,
    content = :content,
    publish_start_date = :publish_start_date,
    publish_end_date = :publish_end_date,
    target_kanri_kubun = :target_kanri_kubun,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE oshirase_id = :oshirase_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.6 操作ログ記録

- 更新前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'UPDATE', 1,
        :oshirase_id, 't_oshirase',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```
`before_value`：更新前のデータをJSON形式で格納する。

{
  "oshirase_id": 1,
  "ja_id": null,
  "oshirase_type": 1,
  "publish_location": 2,
  "status": 2,
  "title": "システムメンテナンスのお知らせ",
  "publish_start_date": "2026-04-20T09:00:00Z",
  "publish_end_date": "2026-04-30T23:59:00Z",
  "target_kanri_kubun": "1,2,3"
}
```

**after_value 例:**

```
`after_value`：更新後のデータをJSON形式で格納する。

{
  "oshirase_id": 1,
  "ja_id": null,
  "oshirase_type": 1,
  "publish_location": 2,
  "status": 2,
  "title": "システムメンテナンスのお知らせ（更新）",
  "publish_start_date": "2026-04-20T09:00:00Z",
  "publish_end_date": "2026-05-31T23:59:00Z",
  "target_kanri_kubun": "1,2"
}
```

### 4.7 レスポンス生成

- 更新されたデータを data オブジェクトとして返却する。HTTP 200。

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
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'UPDATE', 2,
        :oshirase_id, 't_oshirase',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-031-005

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Oshirase                                                                                                                                                                                                                     |
| 概要                   | 指定したお知らせを論理削除する                                                                                                                                                                                                      |
| URI                    | /api/v1/oshirase/{oshirase_id}                                                                                                                                                                                                      |
| メソッド               | DELETE                                                                                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                                                                                                |
| リクエストパラメーター | oshirase_id（パスパラメータ）                                                                                                                                                                                                       |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                              |
| HTTPレスポンスコード   | 200:削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたお知らせが見つかりません, 400:締め切り時間のお知らせは削除できません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                        |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------- |
| 1   | oshirase_id    | Number | -        | 〇   |        |        | 削除対象のoshirase_id（パスパラメータ）     |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明             |
| --- | ------- | ------ | -------- | ------------ | -------- | ---------------- |
| 1   | message | String | -        |              | -        | 削除完了メッセージ |

## リクエスト例

```
DELETE /api/v1/oshirase/1
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
  "message": "指定されたお知らせが見つかりません。"
}
```

### 400 Bad Request（締め切り時間削除不可）

```json
{
  "error_code": "BAD_REQUEST",
  "message": "締め切り時間のお知らせは削除できません。"
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - oshirase_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`oshirase.delete` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認・削除可否チェック

- 対象レコードの存在確認。

```sql
SELECT oshirase_id, ja_id, oshirase_type, publish_location, status,
       title, content, publish_start_date, publish_end_date,
       target_kanri_kubun, created_at, updated_at
FROM t_oshirase
WHERE oshirase_id = :oshirase_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

- 締め切り時間（`oshirase_type = 4`）レコードは削除不可（顧客確認 2026-05、1件のみ運用される締め切り時間データの取り違え／消失防止）。
  - 対象が `oshirase_type = 4` の場合：HTTP 400 (`BAD_REQUEST`)、メッセージ `締め切り時間のお知らせは削除できません。`

- 関連データの存在確認（将来の拡張に備えた整合性チェック）：関連テーブルにお知らせIDが紐づくレコードが存在する場合、削除を拒否する。現行DBスキーマでは参照テーブルなし。
  - 関連データが存在する場合：HTTP 409 (`CONFLICT`)

### 4.4 論理削除の実行

```sql
UPDATE t_oshirase
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE oshirase_id = :oshirase_id
  AND deleted_at IS NULL
```

### 4.5 操作ログ記録

- 削除前データ（4.3 のSELECT結果）を `before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'DELETE', 1,
        :oshirase_id, 't_oshirase',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```
`before_value`：削除前のデータをJSON形式で格納する。
`after_value`：DELETE のため空文字列を設定する。

{
  "oshirase_id": 1,
  "ja_id": null,
  "oshirase_type": 1,
  "publish_location": 2,
  "status": 2,
  "title": "システムメンテナンスのお知らせ",
  "publish_start_date": "2026-04-20T09:00:00Z",
  "publish_end_date": "2026-04-30T23:59:00Z",
  "target_kanri_kubun": "1,2,3"
}
```

### 4.6 レスポンス生成

- 削除完了メッセージを返却する。HTTP 200。

```json
{ "message": "削除しました。" }
```

### 4.7 例外処理

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
        'お知らせ一覧画面 (ACSMS-SCR-031)', 'DELETE', 2,
        :oshirase_id, 't_oshirase',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-COMMON-003

※ 共用API。定義元：ACSMS-SCR-024。本画面ではJAプルダウン（お知らせ編集フォームの jaId フィールド）で使用する。

## 概要

| 項目                   | 内容                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get JA Dropdown                                                                                                                                                  |
| 概要                   | JAプルダウン検索用リストをページング付きで取得する（キーワード検索・都道府県/管理者区分カスケード絞込み対応。共用API）                                          |
| URI                    | /api/v1/ja/dropdown                                                                                                                                              |
| メソッド               | GET                                                                                                                                                              |
| リクエストボディー     | なし                                                                                                                                                             |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                           |
| HTTPレスポンスコード   | 200:正常にJA一覧を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:入力値が不正です, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                         |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------------------- |
| 1   | q              | String | -        | -    |        | 100    | 検索キーワード（部分一致）。既定は ja_code OR ja_name（`match_field=name` 指定時は ja_name のみ） |
| 2   | page           | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                     |
| 3   | per_page       | Number | -        | -    |        | 100    | 1ページの件数（デフォルト: 50、最大: 100）                                                      |
| 4   | include_id     | Number | -        | -    |        |        | 編集フォーム用。指定した ja_id がページ1のヒット範囲に含まれない場合、レスポンス先頭に追加して返す |
| 5   | match_field    | String | -        | -    |        |        | 検索対象フィールド（"both"=ja_code OR ja_name［既定］／ "name"=ja_nameのみ）                     |
| 6   | todofuken_code | String | -        | -    |        | 2      | 都道府県コード（カスケード絞込み。完全一致）                                                     |
| 7   | role_id        | Number | -        | -    |        |        | 管理者区分（カスケード絞込み。3:中央会→chuokai_flg=true、4,5:JA→chuokai_flg=false）             |
| 8   | scope          | String | -        | -    |        |        | DataScope範囲（"own"［既定］／ "todofuken"）。todofuken 指定時は中央会ロールに限りセッションの都道府県に属する全JAを候補にする（ACSMS-SCR-022 ファイルダウンロード画面専用） |

※ 本画面（SCR-031）ではNICHINO_ADMINが全JAを対象にお知らせを作成するため、通常はパラメータ未指定（または `q` のみ）で呼び出して全JAを取得する。NICHINO_ADMIN/STAFF は DataScope チェックを常にバイパスするため `scope` パラメータは実質無効。

## レスポンスデータ

| #   | 項目ID          | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                     |
| --- | --------------- | ------- | -------- | ------------ | -------- | ---------------------------------------- |
| 1   | data            | Array   | 〇       |              | -        | JA一覧                                   |
| 2   | →ja_id          | Number  | -        |              | -        | JA ID                                    |
| 3   | →ja_code        | String  | -        |              | -        | JAコード                                 |
| 4   | →ja_name        | String  | -        |              | -        | JA名称                                   |
| 5   | →todofuken_code | String  | -        |              | -        | 都道府県コード                           |
| 6   | →chuokai_flg    | Boolean | -        |              | -        | 中央会フラグ                             |
| 7   | meta            | Object  | -        |              | -        | ページネーション情報                     |
| 8   | →total          | Number  | -        |              | -        | 総件数                                   |
| 9   | →page           | Number  | -        |              | -        | 現在ページ番号                           |
| 10  | →per_page       | Number  | -        |              | -        | 1ページの件数                            |
| 11  | →has_more       | Boolean | -        |              | -        | 次ページの有無（`page * per_page < total`） |

## リクエスト例

```
GET /api/v1/ja/dropdown?q=東京&page=1&per_page=50
```

## レスポンス成功例

```json
{
  "data": [
    {
      "ja_id": 1,
      "ja_code": "1300001",
      "ja_name": "東京都中央会",
      "todofuken_code": "13",
      "chuokai_flg": true
    },
    {
      "ja_id": 2,
      "ja_code": "1300002",
      "ja_name": "JA東京",
      "todofuken_code": "13",
      "chuokai_flg": false
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "per_page": 50,
    "has_more": false
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

### 400 Validation Error

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "per_page", "message": "per_pageは100以下で指定してください。" }
  ]
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
  - q：文字列、最大100文字（空文字は未指定として扱う）
  - page：数値型チェック、1以上（デフォルト1）
  - per_page：数値型チェック、1〜100（デフォルト50）
  - include_id：数値型チェック、1以上
  - match_field："both" または "name"（デフォルト "both"）
  - todofuken_code：文字列、最大2文字
  - role_id：数値型チェック、1以上
  - scope："own" または "todofuken"（デフォルト "own"）
- 不正なパラメータが存在する場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列（クエリDTOは class-validator + グローバル `ValidationPipe` で検証されるため `BAD_REQUEST` でなく `VALIDATION_ERROR` を返す。`ja.controller.spec.ts`「should reject per_page > 100 with HTTP 400 VALIDATION_ERROR」/「should reject q > 100 chars with HTTP 400 VALIDATION_ERROR」で確認）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：本エンドポイントは `@Permissions(...)` を持たず、認証済みユーザーであれば誰でもアクセス可能（複数画面・複数ロールが共有するフォーム用ドロップダウンのため、単一のCRUD権限では塞がない設計）。
  - ※ 呼び出し元画面の権限に依存する。SCR-031では `oshirase.create` / `oshirase.update` 保持者が呼び出す。
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 データ取得条件の設定（DataScope・検索・カスケード絞込み）

- **DataScope**：`scope=todofuken` かつ呼び出しユーザーが中央会（CHUOKAI）かつセッションに `todofuken_code` が設定されている場合のみ、通常の自JA限定を「セッションの都道府県に属する全JA」に拡大する（ACSMS-SCR-022 専用）。それ以外は通常の `applyJaScope`（JAロールは自JAのみ、NICHINO_ADMIN/NICHINO_STAFF は全JAが対象でスコープ判定自体をバイパス）を適用する。SCR-031 は NICHINO_ADMIN 専用画面のため、この呼び出しでは常に全JAが対象になる。
- **検索フィルタ**：`q` が指定された場合、`match_field='name'` なら `ja_name ILIKE` のみ、それ以外は `ja_code ILIKE OR ja_name ILIKE` で部分一致絞り込みする。`todofuken_code` が指定された場合、完全一致で絞り込む。
- **カスケード絞込み**：`role_id` が指定された場合、対応する `role_code` を解決し、中央会（CHUOKAI）なら `chuokai_flg = true`、JA本店/JA管理支店（JA_HONTEN / JA_KANRI_SHITEN）なら `chuokai_flg = false` で絞り込む。それ以外の role_code、または `role_id` 未指定の場合は絞り込みなし。

### 4.4 データ取得

```sql
SELECT ja_id, ja_code, ja_name, todofuken_code, chuokai_flg
FROM m_ja
WHERE deleted_at IS NULL
  -- + 4.3 の DataScope 条件 / q 検索条件 / todofuken_code 条件 / role_id カスケード条件
ORDER BY ja_code ASC
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- `include_id` が指定され、かつ対象行が上記ページ1の取得結果に含まれない場合、DataScope 内であれば当該行を単独取得しレスポンス先頭に追加する（編集フォームで選択済みの値をラベル解決するため、2回目のGETを不要にする）。

### 4.5 レスポンス生成

- 取得結果を data 配列として返却する。`{ total, page, per_page, has_more }` を meta オブジェクトとして返却する（`has_more = page * per_page < total`）。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
