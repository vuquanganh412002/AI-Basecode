---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-002
screen_name: 単価マスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-06
created_date: 2026/04/06
created_by: Tran Duc Tuyen
updated_date: 2026/04/01
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
|---|---|---|---|---|---|---|
| 1 | {issue_date} | 1.0 | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「{screen_name}（{screen_id}）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No | 資料コード | 資料名 |
|---|---|---|

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
| 8   | 画面固有     | NOT_FOUND             | 指定された単価が見つかりません。                                       | HTTP 404 |
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため処理を実行できません。                         | HTTP 409 |

---

# API ACSMS-API-{screen_number}-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get list Unit Price |
| 概要 | 単価の一覧を取得する |
| URI | /api/v1/tanka |
| メソッド | GET |
| リクエストボディー | JSON |
| リクエストパラメーター | ?tanka_type={tanka_type}&tanka_name={tanka_name}&tekiyo_start_date={tekiyo_start_date}&tekiyo_end_date={tekiyo_end_date}&active_flg={active_flg}&campaign_flg={campaign_flg}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order} |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:正常に単価一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | tanka_type | Number | - | - | | | 単価種別（完全一致）。1=新聞購読料, 2=配達手数料 |
| 2 | tanka_name | String | - | - | | 100 | 単価名（部分一致） |
| 3 | tekiyo_start_date | String | - | - | | 10 | 適用開始日フィルタ（YYYY-MM-DD）。`tekiyo_start_date >= 指定値` の条件で絞り込む |
| 4 | tekiyo_end_date | String | - | - | | 10 | 適用終了日フィルタ（YYYY-MM-DD）。`tekiyo_end_date <= 指定値` の条件で絞り込む。NULL（無期限）は対象外 |
| 5 | active_flg | Boolean | - | - | | | 状態フィルタ（true: 有効中のみ、false: 停止中のみ、省略: 両方） |
| 6 | campaign_flg | Boolean | - | - | | | キャンペーンフィルタ（true: 有効のみ、false: 無効のみ、省略: 両方） |
| 7 | page | Number | - | - | | | ページ番号（デフォルト: 1、1以上） |
| 8 | per_page | Number | - | - | | | 1ページの件数（デフォルト: 20、最大: 100） |
| 9 | sort_by | String | - | - | | | ソート項目（許可値: tanka_code, tanka_name, kingaku_zeikomi, kingaku_zeinuki, tax_rate, tekiyo_start_date, tekiyo_end_date, updated_at。デフォルト: updated_at） |
| 10 | sort_order | String | - | - | | | ソート方向（asc / desc。デフォルト: desc） |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Array | 〇 | | - | |
| 2 | →tanka_id | Number | - | | - | |
| 3 | →tanka_type | Number | - | | - | 1: 新聞購読料, 2: 配達手数料（ラベルはFE側で `useCodesStore().label('TANKA_TYPE', value)` から取得） |
| 4 | →tanka_code | String | - | | - | |
| 5 | →tanka_name | String | - | | - | |
| 6 | →tekiyo_start_date | String | - | YYYY-MM-DD | - | 適用開始日 |
| 7 | →tekiyo_end_date | String | - | YYYY-MM-DD | 〇 | 適用終了日（NULL=無期限） |
| 8 | →kingaku_zeikomi | Number | - | | - | 税込金額（円） |
| 9 | →kingaku_zeinuki | Number | - | | - | 税抜金額（円） |
| 10 | →tax_rate | Number | - | ##.## | - | 税率（%） |
| 11 | →active_flg | Boolean | - | | - | 運用上の有効フラグ |
| 12 | →campaign_flg | Boolean | - | | - | キャンペーンフラグ（TRUE: 有効, FALSE: 無効） |
| 13 | meta | Object | - | | - | |
| 14 | →total | Number | - | | - | 総件数 |
| 15 | →page | Number | - | | - | 現在のページ番号 |
| 16 | →per_page | Number | - | | - | 1ページの件数 |
| 17 | →total_pages | Number | - | | - | 総ページ数 |

## リクエスト例

```
GET /api/v1/tanka?tanka_type=1&tanka_name=基本&tekiyo_start_date=2026-04-01&tekiyo_end_date=2027-03-31&page=1&per_page=20&sort_by=tanka_code&sort_order=asc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "tanka_id": 1,
      "tanka_type": 1,
      "tanka_code": "T001",
      "tanka_name": "基本購読料（月額）",
      "tekiyo_start_date": "2026-01-01",
      "tekiyo_end_date": null,
      "kingaku_zeikomi": 4900,
      "kingaku_zeinuki": 4455,
      "tax_rate": 10.00,
      "active_flg": true,
      "campaign_flg": false
    }
  ],
  "meta": {
    "total": 1,
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
  - 型チェック（string / number / enum）
  - 最大・最小値チェック
  - 必須項目チェック（該当する場合）
- デフォルト値の適用：
  - page：未指定の場合、1
  - per_page：未指定の場合、20
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック
- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：tanka.view を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden

### 4.3 データ取得条件の設定
- ログインユーザーのスコープを取得する（例：ja_id）。
- 基本条件：
  - スコープ制御（ja_id = user.ja_id）
  - 論理削除除外（deleted_at IS NULL）
  - ※ 顧客要件（2026-06）：既定の有効期間条件
    （tekiyo_end_date IS NULL OR tekiyo_end_date >= CURRENT_DATE）は**廃止**。
    適用終了日が過去の（期限切れ）単価も既定で全件表示する。期間での絞り込みは
    tekiyo_start_date / tekiyo_end_date の明示パラメータでのみ行う。
- 検索条件：
  - tanka_type：完全一致（=）
  - tanka_name：部分一致（ILIKE '%value%'）
  - tekiyo_start_date：`tekiyo_start_date >= :tekiyo_start_date`（指定日以降に開始するレコード）。省略時は条件適用なし
  - tekiyo_end_date：`tekiyo_end_date IS NOT NULL AND tekiyo_end_date <= :tekiyo_end_date`（指定日以前に終了するレコード）。NULL（無期限）は対象外。省略時は条件適用なし
  - active_flg：完全一致（指定された場合のみ）。省略時は両方（有効中・停止中）を返却
  - campaign_flg：完全一致（指定された場合のみ）。省略時は両方（有効・無効）を返却
  - sort_by / sort_order：ソート適用

### 4.4 データ件数の取得
- 条件に一致する総件数を取得する。
- meta.total に使用する

### 4.5 ソート・ページング
- sort_by / sort_order でソート適用。
- OFFSET = (page - 1) * per_page, LIMIT = per_page

### 4.6 データ取得
- 以下のSQLを実行してデータを取得する。
```sql
SELECT tanka_id, tanka_type, tanka_code, tanka_name,
       tekiyo_start_date, tekiyo_end_date,
       kingaku_zeikomi, kingaku_zeinuki, tax_rate, active_flg, campaign_flg
FROM m_tanka
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  -- 顧客要件(2026-06): 既定の有効期間条件は廃止（期限切れも全件表示）
  AND (:tanka_type IS NULL OR tanka_type = :tanka_type)
  AND (:tanka_name IS NULL OR tanka_name ILIKE '%' || :tanka_name || '%')
  AND (:tekiyo_start_date IS NULL OR tekiyo_start_date >= :tekiyo_start_date)
  AND (:tekiyo_end_date IS NULL OR (tekiyo_end_date IS NOT NULL AND tekiyo_end_date <= :tekiyo_end_date))
  AND (:active_flg IS NULL OR active_flg = :active_flg)
  AND (:campaign_flg IS NULL OR campaign_flg = :campaign_flg)
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```
- tanka_type はコード値（1 または 2）のみを返却する。ラベル変換は行わない（`_label` フィールドは付与しない — FE 側で `useCodesStore().label('TANKA_TYPE', value)` により解決する。.claude/rules/nestjs.md §m_code 参照）。

### 4.7 レスポンス生成
- data 配列と meta オブジェクトを含むJSONを返却する。

### 4.8 例外処理
- DB接続エラー等の場合：HTTP 500 Internal Server Error を返却する。

---

# API ACSMS-API-{screen_number}-002

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Delete Unit Price |
| 概要 | 指定した単価を削除する |
| URI | /api/v1/tanka/{tanka_id} |
| メソッド | DELETE |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json\n※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:削除しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された単価が見つかりません, 409:関連データが存在するため処理を実行できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | tanka_id | Number | - | 〇 | | | 削除対象の tanka_id（パスパラメータ） |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

```
DELETE /api/v1/tanka/5
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

### 404 Not Found
```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された単価が見つかりません"
}
```

### 409 Conflict
```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため処理を実行できません"
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
  - tanka_id：数値型チェック
  - tanka_id：必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック
- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized
- 権限チェック：tanka.delete を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限がない場合：HTTP 403 Forbidden

- ログインユーザーのスコープを取得する（例：ja_id）。
- 対象レコードの検索：
  - tanka_id = :tanka_id かつ ja_id = :ja_id
  - 論理削除除外（deleted_at IS NULL）
- 対象レコードが存在しない場合：
  - HTTP 404 Not Found を返却する。

### 4.4 関連データの存在チェック
- 以下のテーブルに関連レコードが存在するか確認する。
```sql
-- 販売店の配達手数料単価参照チェック
SELECT COUNT(*) FROM m_hanbaiten
WHERE haitatsuryo_tanka_id = :tanka_id AND deleted_at IS NULL;

-- 購読者の単価参照チェック
SELECT COUNT(*) FROM t_dokusya
WHERE tanka_id = :tanka_id AND deleted_at IS NULL;
```
- いずれかに関連レコードが存在する場合：
  - HTTP 409 Conflict を返却する。

### 4.5 論理削除の実行
- 削除前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。
- 以下のSQLを実行して論理削除を行う。
```sql
UPDATE m_tanka
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE tanka_id = :tanka_id
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
        '単価マスタ明細検索画面 (ACSMS-SCR-002)', 'DELETE', 1,
        :tanka_id, 'm_tanka',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**
```json
`before_value`：削除前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。
`after_value`：DELETE のため空文字列を設定する。

{
  "tanka_id": 5,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T005",
  "tanka_name": "削除対象単価",
  "kingaku_zeikomi": 3000,
  "kingaku_zeinuki": 2727,
  "tax_rate": 10.00,
  "tekiyo_start_date": "2026-01-01",
  "tekiyo_end_date": null
}
```

### 4.7 レスポンス生成
- 成功メッセージを返却する。

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
        '単価マスタ明細検索画面 (ACSMS-SCR-002)', 'DELETE', 2,
        :tanka_id, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
