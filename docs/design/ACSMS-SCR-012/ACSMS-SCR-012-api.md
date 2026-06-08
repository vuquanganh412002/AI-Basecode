---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-012
screen_name: パスワードの再設定・パスワードの変更
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-09
created_date: 2026/04/16
created_by: Nguyen Truong An
updated_date: 2026/04/16
updated_by: Nguyen Truong An
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者     | 変更内容               | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------- | ---------------------- | -------------- | -------------- |
| 1   | 2026/04/16 | 1.0  | Nguyen Truong An | 初版作成               | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「パスワードの再設定・パスワードの変更画面（ACSMS-SCR-012）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-001 | ログイン画面 API設計書            |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 3   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 4   | 画面固有     | NOT_FOUND     | 指定されたメールアドレスのアカウントが見つかりません。                 | HTTP 404 |
| 5   | 画面固有     | INVALID_RESET_TOKEN   | 無効なリンクです。                                                     | HTTP 400 |
| 6   | 画面固有     | EXPIRED_RESET_TOKEN   | リンクの有効期限が切れています。再度パスワード再設定をお試しください。 | HTTP 400 |
| 7   | 画面固有     | PASSWORD_RESET_RATE_LIMIT | 再送信は5分後に可能です。時間をおいてから再度お試しください。 | HTTP 429 |

---

# API ACSMS-API-012-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Forgot Password (Request Reset Email)                                                                                                                                                                 |
| 概要                   | メールアドレスを入力してパスワード再設定用メールを送信する                                                                                                                                               |
| URI                    | /api/v1/auth/forgot-password                                                                                                                                                                           |
| メソッド               | POST                                                                                                                                                                                                   |
| リクエストボディー     | JSON                                                                                                                                                                                                   |
| リクエストパラメーター | なし                                                                                                                                                                                                   |
| ヘッダ                 | Content-Type: application/json                                                                                                                                                                        |
| HTTPレスポンスコード   | 200:パスワード再設定メールを送信しました, 400:リクエストパラメータが不正です／入力値が不正です, 500:システムエラーが発生しました                                                                   |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                     |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------ |
| 1   | email          | String | -        | 〇   | 1      | 100    | メールアドレス           |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                 |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------------------------------------------------------------- |
| 1   | message | String | -        |              | -        | パスワード再設定用のメールを送信しました。メールを確認してください。 |

## リクエスト例

```json
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## レスポンス成功例

```json
{
  "message": "パスワード再設定用のメールを送信しました。メールを確認してください。"
}
```

## レスポンス失敗例

### 400 Bad Request - Invalid Email Format

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください。"
    }
  ]
}
```

### 200 OK - Email Not Found (Always return 200 to prevent account enumeration)

Note: For security, account enumeration prevention is implemented. Both valid and invalid emails receive the same success response.

```json
{
  "message": "パスワード再設定用のメールを送信しました。メールを確認してください。"
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

- email フィールドの検証：
  - 必須チェック
  - メールアドレス形式チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証チェック不要

### 4.3 メールアドレスの存在確認
- 以下の条件でアカウントを検索する：

```sql
SELECT account_id, account_name
FROM m_account
WHERE email = :email
  AND deleted_at IS NULL
LIMIT 1
```

- レコードが存在しない場合：
  - セキュリティ上の理由で、存在しないメールアドレスでも成功（HTTP 200）レスポンスを返す（アカウント列挙防止）
  - クールダウンチェック（4.3a）も行わない

### 4.3a クールダウンチェック（既存アカウントのみ）

- 直近5分以内に同一アカウントで発行された `t_mfa_otp` 行（`otp_type = 2`）の件数をカウント：

```sql
SELECT COUNT(*) FROM t_mfa_otp
WHERE account_id = :account_id
  AND otp_type = 2
  AND created_at > NOW() - INTERVAL '5 minutes'
```

- カウントが 1 以上の場合：HTTP 429 (`PASSWORD_RESET_RATE_LIMIT`)
  - メッセージ：「再送信は5分後に可能です。時間をおいてから再度お試しください。」
- カウントは無効化済み（`used_flg = true`）の行も含める。`created_at` 単位で「5分以内の申請有無」を測ることで、無効化操作（4.5a）でクールダウンがリセットされない設計とする。
- アカウント列挙防止との trade-off: 存在するメールアドレスのみ 429 を返す（存在しないメールは常に 200）。本仕様は意図的にこの差を許容している（user 操作性 > 列挙防止の追加防御層）。

### 4.4 パスワード再設定トークンの生成

- ランダムUUID（トークン）を生成する：
  - `reset_token = UUID()`
- トークンをbcryptでハッシュ化する：
  - `reset_token_hash = bcrypt.hash(reset_token, 10)`
- 有効期限を1時間後に設定する：
  - `expired_at = NOW() + INTERVAL '1 hour'`

### 4.5 トークンをデータベースに保存

> 4.5a + 4.5b は単一トランザクション内で実行する。

#### 4.5a 既存の未使用トークンを無効化

- 同一アカウントの未使用パスワード再設定トークンを全て無効化する（再申請時に古いリンクを失効させる）：

```sql
UPDATE t_mfa_otp
SET used_flg = true,
    updated_at = NOW()
WHERE account_id = :account_id
  AND otp_type = 2
  AND used_flg = false
```

#### 4.5b 新規トークンを保存

```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at, verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :reset_token_hash, 2, :expired_at, 0, 0, false, NOW())
```

### 4.6 メールを送信

- メールテンプレート
- メール件名：`【agrinews】パスワードリセット`
- 送信内容：
  - パスワード再設定リンク（トークン付き）： `https://{FRONTEND_URL}/reset-password?token={reset_token}`
  - 有効期限：1時間
- メール送信に失敗した場合：
  - HTTP 500 を返す（トークンは削除）

### 4.7 レスポンス生成

- メールアドレスの存在有無に関わらず、常に成功メッセージ（HTTP 200）を返す（アカウント列挙防止）

### 4.8 例外処理

- DB接続エラー、メール送信エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-012-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Verify Reset Token                                                                                                                                                                                     |
| 概要                   | パスワード再設定リンク内のトークンの有効性を検証する（ページ読込時）                                                                                                                                     |
| URI                    | /api/v1/auth/reset-password/verify                                                                                                                                                                     |
| メソッド               | POST                                                                                                                                                                                                   |
| リクエストボディー     | JSON                                                                                                                                                                                                   |
| リクエストパラメーター | なし                                                                                                                                                                                                   |
| ヘッダ                 | Content-Type: application/json                                                                                                                                                                        |
| HTTPレスポンスコード   | 200:トークンが有効です, 400:トークンが無効または期限切れです, 500:システムエラーが発生しました                                                                                                      |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                          |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------- |
| 1   | token          | String | -        | 〇   | 36     | 36     | パスワード再設定トークン（UUID） |

## レスポンスデータ

| #   | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明           |
| --- | ------ | ------ | -------- | ------------ | -------- | -------------- |
| 1   | valid  | String | -        |              | -        | トークン有効性 |

## リクエスト例

```json
POST /api/v1/auth/reset-password/verify
Content-Type: application/json

{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

## レスポンス成功例

```json
{
  "data": {
    "valid": true
  }
}
```

## レスポンス失敗例

### 400 Bad Request - Invalid Token

```json
{
  "error_code": "INVALID_RESET_TOKEN",
  "message": "無効なリンクです。"
}
```

### 400 Bad Request - Expired Token

```json
{
  "error_code": "EXPIRED_RESET_TOKEN",
  "message": "リンクの有効期限が切れています。再度パスワード再設定をお試しください。"
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

- クエリパラメータ `token` の検証：
  - 必須チェック（URLに `?token=xxx` が含まれているか確認）
  - UUID形式チェック（36文字のUUID形式であること）
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する（`BAD_REQUEST`）

### 4.2 認証・認可チェック

- 認証チェック不要

### 4.3 トークンの検証
- 以下の条件でトークンを検索する：

```sql
SELECT otp_id, account_id, expired_at, used_flg
FROM t_mfa_otp
WHERE otp_type = 2
```

- トークンが見つからない場合：
  - HTTP 400 (`INVALID_RESET_TOKEN`) を返す

### 4.4 トークン有効期限の確認

- `expired_at > NOW()` を確認する
- 期限切れの場合：
  - HTTP 400 (`EXPIRED_RESET_TOKEN`) を返す

### 4.5 トークン使用済みフラグの確認

- `used_flg = false` を確認する
- 使用済みの場合：
  - HTTP 400 (`INVALID_RESET_TOKEN`) を返す

### 4.6 レスポンス生成

- トークンが有効な場合：
  - HTTP 200 を返す
  - `{ "data": { "valid": true } }`

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-012-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Reset Password                                                                                                                                                                                         |
| 概要                   | トークンを検証してパスワードを更新する                                                                                                                                                                 |
| URI                    | /api/v1/auth/reset-password                                                                                                                                                                            |
| メソッド               | POST                                                                                                                                                                                                   |
| リクエストボディー     | JSON                                                                                                                                                                                                   |
| リクエストパラメーター | なし                                                                                                                                                                                                   |
| ヘッダ                 | Content-Type: application/json                                                                                                                                                                        |
| HTTPレスポンスコード   | 200:パスワードを更新しました, 400:トークンが無効または入力値が不正です, 500:システムエラーが発生しました                                                                         |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                             |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------- |
| 1   | token            | String | -        | 〇   | 36     | 36     | パスワード再設定トークン（UUID）  |
| 2   | new_password     | String | -        | 〇   | 8      | 32     | 新しいパスワード                 |
| 3   | confirm_password | String | -        | 〇   | 8      | 32     | 確認用パスワード                 |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明           |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------- |
| 1   | message | String | -        |              | -        | 更新成功メッセージ |

## リクエスト例

```json
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "new_password": "NewPass123!@",
  "confirm_password": "NewPass123!@"
}
```

## レスポンス成功例

```json
{
  "message": "パスワードを更新しました。ログイン画面に移動します。"
}
```

## レスポンス失敗例

### 400 Bad Request - Validation Error

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    {
      "field": "new_password",
      "message": "パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。"
    },
    {
      "field": "confirm_password",
      "message": "新しいパスワードと一致していません。"
    }
  ]
}
```

### 400 Bad Request - Invalid Token

```json
{
  "error_code": "INVALID_RESET_TOKEN",
  "message": "無効なリンクです。"
}
```

### 400 Bad Request - Expired Token

```json
{
  "error_code": "EXPIRED_RESET_TOKEN",
  "message": "リンクの有効期限が切れています。再度パスワード再設定をお試しください。"
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

- token フィールドの検証：
  - 必須チェック
- new_password フィールドの検証：
  - 必須チェック
  - 長さチェック（8〜32文字）
  - パスワード形式チェック（英字・数字・記号のうち2種類以上を含む）
  - ログインIDと同一でないこと
- confirm_password フィールドの検証：
  - new_password と一致すること
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。
### 4.2 認証・認可チェック

- このエンドポイントは認証不要（ログイン前のユーザーが利用）
- 認証チェック不要

### 4.3 トークンの検証

- 以下の条件でトークンを検索する：

```sql
SELECT otp_id, account_id, expired_at, used_flg, otp_code_hash
FROM t_mfa_otp
WHERE otp_type = 2
```

- トークンが見つからない、または期限切れの場合：
  - HTTP 400 (`INVALID_RESET_TOKEN` または `EXPIRED_RESET_TOKEN`) を返す

### 4.4 アカウント情報の取得

- 以下の条件でアカウントを取得する：

```sql
SELECT account_id, login_id, email, password_hash
FROM m_account
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

- アカウントが見つからない場合：
  - HTTP 400 (`INVALID_RESET_TOKEN`) を返す

### 4.5 パスワード形式の詳細チェック

- 新しいパスワードが以下の条件を満たすことを確認する：
  - 8〜32文字
  - 英字、数字、記号のうち2種類以上を含む
  - ログインID（login_id）と同一ではない
- チェック失敗の場合：
  - HTTP 400 Bad Request を返す

### 4.6 パスワードの更新

- 新しいパスワードをbcryptでハッシュ化する：
- 以下の条件でパスワードを更新する：

```sql
UPDATE m_account
SET password_hash = :new_password_hash,
    password_updated_at = NOW(),
    updated_at = NOW(),
    updated_by = 'SYSTEM'
WHERE account_id = :account_id
```

### 4.7 トークンの無効化

- 以下の条件でトークンを無効化する：

```sql
UPDATE t_mfa_otp
SET used_flg = true,
    updated_at = NOW()
WHERE otp_id = :otp_id
```

### 4.8 既存セッションの無効化（オプション）

- 同一アカウントのRedis上の既存セッションをすべて削除する：
  - Redisのセッション索引（例: `account_sessions:{account_id}` Setキー）から対象account_idに紐付くすべての`session_id`を取得する。
  - 取得した各セッションキー `session:{session_id}` を `DEL` で削除する。
  - 索引キーも `DEL account_sessions:{account_id}` で削除する。
- これにより、旧パスワードで取得したセッションを使ったアクセスは即時に無効化される。

### 4.9 操作ログ記録（オプション）

- パスワード更新イベントをログに記録する：

```sql
INSERT INTO t_log (log_type, log_datetime, account_id,
                   gamen_name, operation, result_status,
                   target_table, after_value,
                   user_agent)
VALUES (1, NOW(), :account_id,
        'パスワード再設定画面 (ACSMS-SCR-012)', 'PASSWORD_RESET', 1,
        'm_account', '{"event": "password_reset"}',
        :user_agent)
```

### 4.10 レスポンス生成

- HTTP 200 で成功メッセージを返す

### 4.11 例外処理

- トークン期限切れ中に更新を試みた場合：HTTP 400 (`EXPIRED_RESET_TOKEN`)
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

## 認証・認可設定

### ACSMS-API-012-001（Forgot Password）

- **認証要件**: 不要（ログイン前ユーザーが利用）
- **権限要件**: なし
- **クールダウン**: メールアドレスあたり 5 分に 1 回まで（連投ガード）

### ACSMS-API-012-002（Verify Token）

- **認証要件**: 不要（ログイン前ユーザーが利用）
- **権限要件**: なし
- **レート制限**: 制限なし（トークン検証のみ）

### ACSMS-API-012-003（Reset Password）

- **認証要件**: 不要（ログイン前ユーザーが利用）
- **権限要件**: なし
- **レート制限**: 5リクエスト/分 per トークン（ブルートフォース対策）

---

## パスワード形式要件

パスワードは以下の条件を満たす必要があります：

| 項目 | 要件 |
| --- | --- |
| 長さ | 8～32文字 |
| 文字種 | 英字（大小）、数字、記号のうち2種類以上を含む |
| ログインIDとの重複 | ログインIDと同一でないこと |
| 前のパスワードとの重複 | 前回のパスワードと異なること（オプション） |

記号の例：`!@#$%^&*()_+-=[]{}|;:,.<>?`

---

## セキュリティに関する注意

1. **アカウント列挙防止**: Forgot Password API は、メールアドレスが存在しない場合でも成功レスポンス（HTTP 200）を返す
2. **トークン保管**: リセットトークンは bcrypt でハッシュ化して保存し、平文では保存しない
3. **トークン有効期限**: 1時間（セキュリティと利便性のバランス）
4. **単一使用**: リセットトークンは一度使用されたら無効化される
5. **セッション無効化**: パスワード更新後、Redis上の既存セッションはすべて削除される
6. **レート制限**: ブルートフォース対策として実装
7. **HTTPS必須**: すべてのエンドポイントで HTTPS を使用
