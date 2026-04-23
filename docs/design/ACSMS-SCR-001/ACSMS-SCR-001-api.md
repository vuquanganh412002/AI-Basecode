---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-001
screen_name: ログイン画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-13
created_date: 2026/04/13
created_by: Nguyen Truong An
updated_date: 2026/04/13
updated_by: Nguyen Truong An
---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
|---|---|---|---|---|---|---|
| 1 | 2026/04/13 | 1.0 | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「ログイン画面（ACSMS-SCR-001）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No | 資料コード | 資料名 |
|---|---|---|
| 1 | ACSMS-SCR-002 | メニュー画面 API設計書 |

## エラー一覧

| # | エラータイプ | エラーコード | エラーメッセージ | 備考 |
|---|---|---|---|---|
| 1 | 共通 | BAD_REQUEST | リクエストパラメータが不正です。 | HTTP 400 |
| 2 | 共通 | UNAUTHORIZED | セッションが切れました。再度ログインしてください。 | HTTP 401 |
| 3 | 共通 | FORBIDDEN | この画面へのアクセス権限がありません。 | HTTP 403 |
| 4 | 共通 | DATA_SCOPE_VIOLATION | このデータへのアクセス権限がありません。 | HTTP 403 |
| 5 | 共通 | TOO_MANY_REQUESTS | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 6 | 共通 | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。 | HTTP 500 |
| 7 | 画面固有 | INVALID_CREDENTIALS | ユーザーIDまたはパスワードが正しくありません。 | HTTP 401 |
| 8 | 画面固有 | ACCOUNT_LOCKED | アカウントがロックされています。 | HTTP 403 |
| 9 | 画面固有 | INVALID_OTP | 認証コードが正しくありません。 | HTTP 401 |
| 10 | 画面固有 | OTP_EXPIRED | 認証コードの有効期限が切れました。再度ログインしてください。 | HTTP 401 |
| 11 | 画面固有 | OTP_MAX_ATTEMPTS | 認証コードの入力回数が上限に達しました。再度ログインしてください。 | HTTP 401 |
| 12 | 画面固有 | OTP_RESEND_LIMIT | コードの再送回数が上限に達しました。再度ログインしてください。 | HTTP 429 |
| 13 | 画面固有 | OTP_RESEND_COOLDOWN | 再送間隔が60秒未満です。しばらくしてから再度お試しください。 | HTTP 429 |
| 14 | 画面固有 | INVALID_MFA_TOKEN | MFAトークンが無効です。再度ログインしてください。 | HTTP 401 |

---

# API ACSMS-API-001-001

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Login |
| 概要 | ユーザーIDとパスワードで認証を行う。MFA有効の場合はOTPをメール送信する |
| URI | /api/v1/auth/login |
| メソッド | POST |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json |
| HTTPレスポンスコード | 200:認証成功（MFA不要時はトークン返却、MFA必要時はmfa_required返却）, 400:リクエストパラメータが不正です, 401:認証失敗, 403:アカウントロック, 429:レート制限, 500:システムエラーが発生しました|

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | login_id | String | - | 〇 | 1 | 20 | ユーザーID。半角文字（英字、数字、記号）のみ |
| 2 | password | String | - | 〇 | 8 | 32 | パスワード。半角文字のみ。英字・数字・記号のうち2種類以上 |

## レスポンスデータ

### MFA不要の場合

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_required | Boolean | - | | - | MFA必要フラグ（false） |
| 3 | →access_token | String | - | | - | アクセストークン（JWT RS256、24時間有効） |
| 4 | →user | Object | - | | - | ユーザー情報 |
| 5 | →→account_id | Number | - | | - | アカウントID |
| 6 | →→login_id | String | - | | - | ログインID |
| 7 | →→account_name | String | - | | - | アカウント名 |
| 8 | →→role_id | Number | - | | - | ロールID |
| 9 | →→role_code | String | - | | - | ロールコード |
| 10 | →→role_name | String | - | | - | ロール名 |
| 11 | →→ja_id | Number | - | | 〇 | JA ID（外部キー）日農はNULL、中央会・JA本店・JA管理支店は必須 |
| 12 | →→kanri_shiten_id | Number | - | | 〇 | 管理支店ID（JA管理支店のみ） |
| 13 | →→todofuken_code | String | - | | 〇 | 都道府県コードは中央会・JA本店・JA管理支店で必須項目とする。|
| 14 | →→paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 15 | →→denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 16 | →→email | String | - | | - | メールアドレス |
| 17 | →→permissions | Array | 〇 | | - | 権限コード一覧（m_permissionsのpermission_code） |

### MFA必要の場合

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_required | Boolean | - | | - | MFA必要フラグ（true） |
| 3 | →mfa_token | String | - | UUID | - | MFA認証用一時トークン |
| 5 | →expires_in | Number | - | | - | OTP有効期限（秒）。300（5分） |

## リクエスト例

```json
POST /api/v1/auth/login

{
  "login_id": "admin01",
  "password": "P@ssw0rd123"
}
```

## レスポンス成功例

### MFA不要の場合

```json
{
  "data": {
    "mfa_required": false,
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "account_id": 1,
      "login_id": "admin01",
      "account_name": "管理者太郎",
      "role_id": 1,
      "role_code": "NICHINO_ADMIN",
      "role_name": "日農（管理者）",
      "ja_id": null,
      "kanri_shiten_id": null,
      "todofuken_code": null,
      "paper_flg": false,
      "denshi_flg": false,
      "email": "admin@nichino.co.jp",
      "permissions": [
        "dokusya.create", "dokusya.view", "dokusya.update", "dokusya.delete",
        "dokusya.import", "dokusya.replace_hanbaiten",
        "hanbaiten.create", "hanbaiten.view", "hanbaiten.update", "hanbaiten.delete",
        "hanbaiten.import",
        "tanka.create", "tanka.view", "tanka.update", "tanka.delete",
        "account.create", "account.view", "account.update", "account.delete",
        "oshirase.create", "oshirase.view", "oshirase.update", "oshirase.delete",
        "log.view"
      ]
    }
  }
}
```

※ レスポンスヘッダにリフレッシュトークンをHTTP-only Cookie（Secure + SameSite=Strict、7日間有効）として設定する。

### MFA必要の場合

```json
{
  "data": {
    "mfa_required": true,
    "mfa_token": "550e8400-e29b-41d4-a716-446655440000",
    "expires_in": 300
  }
}
```

## レスポンス失敗例

### 401 Unauthorized — Invalid Credentials

```json
{
  "error_code": "INVALID_CREDENTIALS",
  "message": "ユーザーIDまたはパスワードが正しくありません"
}
```

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
}
```

### 401 Unauthorized — Invalid Credentials

```json
{
  "error_code": "INVALID_CREDENTIALS",
  "message": "ユーザーIDまたはパスワードが正しくありません"
}
```

### 403 Forbidden — Account Locked

```json
{
  "error_code": "ACCOUNT_LOCKED",
  "message": "アカウントがロックされています"
}
```

### 429 Too Many Requests

```json
{
  "error_code": "TOO_MANY_REQUESTS",
  "message": "リクエスト回数が上限を超えました。しばらくしてから再度お試しください"
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
- リクエストボディの検証：
  - login_id：必須、最大20文字、半角文字のみ
  - password：必須、8〜32文字、半角文字のみ
- バリデーションエラーの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 アカウント認証
- 以下の条件でアカウントを取得する。
```sql
SELECT a.account_id, a.login_id, a.password_hash, a.account_name,
       a.role_id, a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email, a.mfa_enable_flg,
       a.login_failure_count, a.account_lock_flg,
       r.role_code, r.role_name
FROM m_account a
INNER JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
WHERE a.login_id = :login_id
  AND a.deleted_at IS NULL
```
- アカウントの権限コード一覧を取得する。
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```
- レコードが存在しない場合：HTTP 401 (`INVALID_CREDENTIALS`)
  - ※セキュリティ上、アカウント不存在と認証失敗を区別しない
- アカウントロックフラグが true の場合：HTTP 401 (`INVALID_CREDENTIALS`)
  - ※セキュリティ上、ロック中でも統一メッセージを返却する
- パスワード照合：`bcrypt.compare(入力パスワード, password_hash)`
- パスワード不一致の場合：
  - ログイン失敗回数をインクリメントする。
```sql
UPDATE m_account
SET login_failure_count = login_failure_count + 1,
    updated_at = NOW()
WHERE account_id = :account_id
  AND deleted_at IS NULL
```
  - HTTP 401 (`INVALID_CREDENTIALS`)

### 4.3 ログイン成功処理
- ログイン失敗回数をリセットし、最終ログイン日時を更新する。
```sql
UPDATE m_account
SET login_failure_count = 0,
    last_login_at = NOW(),
    updated_at = NOW()
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.4 MFA判定・OTP送信
- `mfa_enable_flg = false` の場合：
  - アクセストークン（JWT RS256、24時間有効）を生成する。
  - リフレッシュトークン（7日間有効）をHTTP-only Cookie（Secure + SameSite=Strict）で設定する。
  - ユーザー情報とアクセストークンを返却する。
- `mfa_enable_flg = true` の場合：
  - 既存の未使用OTPを無効化する。
```sql
UPDATE t_mfa_otp
SET used_flg = true
WHERE account_id = :account_id
  AND used_flg = false
  AND otp_type = 1
```
  - 6桁のランダムOTPコードを生成する。
  - OTPコードをbcryptでハッシュ化して保存する。
```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at,
                       verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :otp_code_hash, 1, NOW() + INTERVAL '5 minutes',
        0, 0, false, NOW())
RETURNING otp_id
```
  - OTPコードをメール送信する（件名：【agrinews】ログイン認証コード）。
  - MFA一時トークン（UUID）を生成し、otp_idと紐付けてサーバー側で管理する。
  - `mfa_required: true`、`mfa_token`、`expires_in: 300` を返却する。

### 4.5 ログインログ記録
- ログイン試行（成功・失敗とも）を記録する。
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        1, :failure_reason,
        :ip_address, :user_agent)
```
- login_result: 1（成功）、2（失敗）
- failure_reason: 失敗理由（認証失敗、アカウントロック等）。成功時は空文字。
- account_id: アカウントが特定できない場合はNULL。

### 4.6 レスポンス生成
- MFA不要の場合：アクセストークン + ユーザー情報を `data` オブジェクトとして返却する。HTTP 200。
- MFA必要の場合：`mfa_required: true` + `mfa_token` + `expires_in` を返却する。HTTP 200。

### 4.7 例外処理
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時もログインログを記録する。
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        2, :error_message,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-001-002

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Verify MFA OTP |
| 概要 | MFA認証コード（OTP）を検証し、認証を完了する |
| URI | /api/v1/auth/mfa/verify |
| メソッド | POST |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json |
| HTTPレスポンスコード | 200:認証成功, 400:リクエストパラメータが不正です, 401:認証コード不正・期限切れ・上限超過, 500:システムエラーが発生しました|

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | mfa_token | String | - | 〇 | | | MFA認証用一時トークン（ログインAPI返却値） |
| 2 | otp_code | String | - | 〇 | 6 | 6 | 6桁の認証コード。数字（0-9）のみ |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →access_token | String | - | | - | アクセストークン（JWT RS256、24時間有効） |
| 3 | →user | Object | - | | - | ユーザー情報 |
| 4 | →→account_id | Number | - | | - | アカウントID |
| 5 | →→login_id | String | - | | - | ログインID |
| 6 | →→account_name | String | - | | - | アカウント名 |
| 7 | →→role_id | Number | - | | - | ロールID |
| 8 | →→role_code | String | - | | - | ロールコード |
| 9 | →→role_name | String | - | | - | ロール名 |
| 10 | →→ja_id | Number | - | | 〇 | JA ID（外部キー）日農はNULL、中央会・JA本店・JA管理支店は必須 |
| 11 | →→kanri_shiten_id | Number | - | | 〇 | 管理支店ID（JA管理支店のみ） |
| 12 | →→todofuken_code | String | - | | 〇 | 都道府県コードは中央会・JA本店・JA管理支店で必須項目とする |
| 13 | →→paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 14 | →→denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 15 | →→email | String | - | | - | メールアドレス |
| 16 | →→permissions | Array | 〇 | | - | 権限コード一覧（m_permissionsのpermission_code） |

## リクエスト例

```json
POST /api/v1/auth/mfa/verify

{
  "mfa_token": "550e8400-e29b-41d4-a716-446655440000",
  "otp_code": "123456"
}
```

## レスポンス成功例

```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "account_id": 3,
      "login_id": "chuokai01",
      "account_name": "中央会太郎",
      "role_id": 3,
      "role_code": "CHUOKAI",
      "role_name": "中央会",
      "ja_id": 1,
      "kanri_shiten_id": null,
      "todofuken_code": "13",
      "paper_flg": true,
      "denshi_flg": true,
      "email": "c***i@ja-example.or.jp",
      "permissions": [
        "dokusya.view", "dokusya.update",
        "hanbaiten.view",
        "tanka.view"
      ]
    }
  }
}
```

※ レスポンスヘッダにリフレッシュトークンをHTTP-only Cookie（Secure + SameSite=Strict、7日間有効）として設定する。

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
}
```
### 401 Unauthorized — Invalid OTP

```json
{
  "error_code": "INVALID_OTP",
  "message": "認証コードが正しくありません"
}
```

### 401 Unauthorized — OTP Expired

```json
{
  "error_code": "OTP_EXPIRED",
  "message": "認証コードの有効期限が切れました。再度ログインしてください"
}
```

### 401 Unauthorized — OTP Max Attempts

```json
{
  "error_code": "OTP_MAX_ATTEMPTS",
  "message": "認証コードの入力回数が上限に達しました。再度ログインしてください"
}
```

### 401 Unauthorized — Invalid MFA Token

```json
{
  "error_code": "INVALID_MFA_TOKEN",
  "message": "MFAトークンが無効です。再度ログインしてください"
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
- リクエストボディの検証：
  - mfa_token：必須
  - otp_code：必須、6桁、数字（0-9）のみ
- バリデーションエラーの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 MFAトークン検証
- mfa_tokenからOTPレコードを特定する（サーバー側で管理されたmfa_token → otp_idのマッピング）。
- MFAトークンが無効または存在しない場合：HTTP 401 (`INVALID_MFA_TOKEN`)
- 対応するOTPレコードを取得する。
```sql
SELECT o.otp_id, o.account_id, o.otp_code_hash, o.expired_at,
       o.verify_attempt_count, o.resend_count, o.used_flg
FROM t_mfa_otp o
WHERE o.otp_id = :otp_id
  AND o.used_flg = false
  AND o.otp_type = 1
```
- レコードが存在しない場合：HTTP 401 (`INVALID_MFA_TOKEN`)

### 4.3 OTP検証
- OTPの有効期限チェック：`expired_at < NOW()` の場合：
  - OTPを無効化する。
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 401 (`OTP_EXPIRED`)
- OTPの試行回数チェック：`verify_attempt_count >= 5` の場合：
  - OTPを無効化する。
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 401 (`OTP_MAX_ATTEMPTS`)
- OTPコード照合：`bcrypt.compare(入力otp_code, otp_code_hash)`
- OTPコード不一致の場合：
  - 試行回数をインクリメントする。
```sql
UPDATE t_mfa_otp
SET verify_attempt_count = verify_attempt_count + 1
WHERE otp_id = :otp_id
```
  - インクリメント後に `verify_attempt_count >= 5` の場合：
    - OTPを無効化し、HTTP 401 (`OTP_MAX_ATTEMPTS`)
  - それ以外：HTTP 401 (`INVALID_OTP`)

### 4.4 認証完了処理
- OTPを使用済みにする。
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
- アカウント情報を取得する。
```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email,
       r.role_code, r.role_name
FROM m_account a
INNER JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
```
- アカウントの権限コード一覧を取得する。
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```
- アクセストークン（JWT RS256、24時間有効）を生成する。
- リフレッシュトークン（7日間有効）をHTTP-only Cookie（Secure + SameSite=Strict）で設定する。

### 4.5 ログインログ記録
- MFA認証成功をログインログに記録する。
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        1, '',
        :ip_address, :user_agent)
```

### 4.6 レスポンス生成
- アクセストークン + ユーザー情報を `data` オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時もログインログを記録する。
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        2, :error_message,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-001-003

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Resend MFA OTP |
| 概要 | MFA認証コード（OTP）を再送する |
| URI | /api/v1/auth/mfa/resend |
| メソッド | POST |
| リクエストボディー | JSON |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json |
| HTTPレスポンスコード | 200:再送成功, 400:リクエストパラメータが不正です, 401:MFAトークン無効, 429:再送上限・クールダウン, 500:システムエラーが発生しました|

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | mfa_token | String | - | 〇 | | | MFA認証用一時トークン（ログインAPI返却値） |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_token | String | - | UUID | - | 新しいMFA認証用一時トークン |
| 4 | →expires_in | Number | - | | - | 新OTP有効期限（秒）。300（5分） |
| 5 | →resend_count | Number | - | | - | 再送回数（初回送信含む） |
| 6 | →max_resend | Number | - | | - | 最大再送回数。3 |

## リクエスト例

```json
POST /api/v1/auth/mfa/resend

{
  "mfa_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

## レスポンス成功例

```json
{
  "data": {
    "mfa_token": "660e8400-e29b-41d4-a716-446655440001",
    "expires_in": 300,
    "resend_count": 2,
    "max_resend": 3
  }
}
```

## レスポンス失敗例

### 401 Unauthorized — Invalid MFA Token

```json
{
  "error_code": "INVALID_MFA_TOKEN",
  "message": "MFAトークンが無効です。再度ログインしてください"
}
```

### 429 Too Many Requests — Resend Limit

```json
{
  "error_code": "OTP_RESEND_LIMIT",
  "message": "コードの再送回数が上限に達しました。再度ログインしてください"
}
```

### 429 Too Many Requests — Cooldown

```json
{
  "error_code": "OTP_RESEND_COOLDOWN",
  "message": "再送間隔が60秒未満です。しばらくしてから再度お試しください"
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
- リクエストボディの検証：
- mfa_token：必須
- バリデーションエラーの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 MFAトークン検証
- mfa_tokenからOTPレコードを特定する。
- MFAトークンが無効または存在しない場合：HTTP 401 (`INVALID_MFA_TOKEN`)
- 対応するOTPレコードを取得する。
```sql
SELECT o.otp_id, o.account_id, o.resend_count, o.used_flg, o.created_at
FROM t_mfa_otp o
WHERE o.otp_id = :otp_id
  AND o.used_flg = false
  AND o.otp_type = 1
```
- レコードが存在しない場合：HTTP 401 (`INVALID_MFA_TOKEN`)

### 4.3 再送制限チェック
- 再送回数チェック：`resend_count >= 3` の場合：
  - OTPを無効化する。
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 429 (`OTP_RESEND_LIMIT`)
- クールダウンチェック：前回送信から60秒未経過の場合：
  - HTTP 429 (`OTP_RESEND_COOLDOWN`)

### 4.4 新OTP発行
- 旧OTPを無効化する。
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
- 新しい6桁のランダムOTPコードを生成する。
- OTPコードをbcryptでハッシュ化して保存する。resend_countは旧OTPの値 + 1 を引き継ぐ。
```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at,
                       verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :otp_code_hash, 1, NOW() + INTERVAL '5 minutes',
        0, :new_resend_count, false, NOW())
RETURNING otp_id
```
- 新しいMFA一時トークン（UUID）を生成し、新otp_idと紐付けてサーバー側で管理する。

### 4.5 メール送信
- 新しいOTPコードをメール送信する（件名：【agrinews】ログイン認証コード）。
- アカウントのメールアドレスを取得する。
```sql
SELECT email FROM m_account
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.6 レスポンス生成
- 新しい `mfa_token`、`expires_in: 300`、`resend_count`、`max_resend: 3` を返却する。HTTP 200。

### 4.7 例外処理
- DB接続エラー・メール送信エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-004

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Refresh Token |
| 概要 | リフレッシュトークン（HTTP-only Cookie）を使用してアクセストークンを再発行する |
| URI | /api/v1/auth/refresh |
| メソッド | POST |
| リクエストボディー | なし |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json<br>※ リフレッシュトークンはHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:トークン再発行成功, 401:リフレッシュトークン無効・期限切れ, 500:システムエラーが発生しました |

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| - | （なし） | - | - | - | - | - | リフレッシュトークンはHTTP-only Cookieで送信される |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →access_token | String | - | | - | 新しいアクセストークン（JWT RS256、24時間有効） |
| 3 | →user | Object | - | | - | ユーザー情報 |
| 4 | →→account_id | Number | - | | - | アカウントID |
| 5 | →→login_id | String | - | | - | ログインID |
| 6 | →→account_name | String | - | | - | アカウント名 |
| 7 | →→role_id | Number | - | | - | ロールID |
| 8 | →→role_code | String | - | | - | ロールコード |
| 9 | →→role_name | String | - | | - | ロール名 |
| 10 | →→ja_id | Number | - | | 〇 | JA ID（日農はNULL） |
| 11 | →→kanri_shiten_id | Number | - | | 〇 | 管理支店ID（JA管理支店のみ） |
| 12 | →→todofuken_code | String | - | | 〇 | 都道府県コード |
| 13 | →→paper_flg | Boolean | - | | - | 紙版取扱フラグ |
| 14 | →→denshi_flg | Boolean | - | | - | 電子版取扱フラグ |
| 15 | →→email | String | - | | - | メールアドレス |
| 16 | →→permissions | Array | 〇 | | - | 権限コード一覧（m_permissionsのpermission_code） |

## リクエスト例

```
POST /api/v1/auth/refresh
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs...
```

## レスポンス成功例

```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "account_id": 1,
      "login_id": "admin01",
      "account_name": "管理者太郎",
      "role_id": 1,
      "role_code": "NICHINO_ADMIN",
      "role_name": "日農（管理者）",
      "ja_id": null,
      "kanri_shiten_id": null,
      "todofuken_code": null,
      "paper_flg": false,
      "denshi_flg": false,
      "email": "admin@nichino.co.jp",
      "permissions": [
        "dokusya.create", "dokusya.view", "dokusya.update", "dokusya.delete",
        "dokusya.import", "dokusya.replace_hanbaiten",
        "hanbaiten.create", "hanbaiten.view", "hanbaiten.update", "hanbaiten.delete",
        "hanbaiten.import",
        "tanka.create", "tanka.view", "tanka.update", "tanka.delete",
        "account.create", "account.view", "account.update", "account.delete",
        "oshirase.create", "oshirase.view", "oshirase.update", "oshirase.delete",
        "log.view"
      ]
    }
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
- HTTP-only CookieからリフレッシュトークンをJWT RS256で検証する。
- トークンが存在しない、または署名検証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- トークンが期限切れの場合：HTTP 401 (`UNAUTHORIZED`)

### 4.2 アカウント確認
- リフレッシュトークンからaccount_idを取得する。
- アカウントの存在と有効性を確認する。
```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email,
       r.role_code, r.role_name
FROM m_account a
INNER JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
  AND a.account_lock_flg = false
```
- レコードが存在しない、またはアカウントがロックされている場合：HTTP 401 (`UNAUTHORIZED`)
- アカウントの権限コード一覧を取得する。
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```

### 4.3 トークン再発行
- 新しいアクセストークン（JWT RS256、24時間有効）を生成する。
- 新しいリフレッシュトークン（7日間有効）をHTTP-only Cookie（Secure + SameSite=Strict）で設定する（トークンローテーション）。

### 4.4 レスポンス生成
- 新しいアクセストークン + ユーザー情報を `data` オブジェクトとして返却する。HTTP 200。

### 4.5 例外処理
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-005

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Logout |
| 概要 | ログアウト処理を行い、リフレッシュトークンCookieを削除する |
| URI | /api/v1/auth/logout |
| メソッド | POST |
| リクエストボディー | なし |
| リクエストパラメーター | |
| ヘッダ | Content-Type: application/json<br>※ 認証情報はHTTP-only Cookieにより自動的に送信される |
| HTTPレスポンスコード | 200:ログアウト成功, 500:システムエラーが発生しました|

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| - | （なし） | - | - | - | - | - | リフレッシュトークンはHTTP-only Cookieで送信される |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | message | String | - | | - | 処理結果メッセージ |

## リクエスト例

```
POST /api/v1/auth/logout
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs...
```

## レスポンス成功例

```json
{
  "message": "正常にログアウトしました"
}
```

## レスポンス失敗例

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リフレッシュトークンCookie削除
- レスポンスヘッダでリフレッシュトークンCookieを削除する（Max-Age=0）。
- ※ 認証情報が無い場合やトークンが無効な場合でも、正常にログアウトを完了する（エラーにしない）。

### 4.2 レスポンス生成
- `message: "正常にログアウトしました"` を返却する。HTTP 200。

### 4.3 例外処理
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-006

## 概要

| 項目 | 内容 |
|---|---|
| API名 | Get Public Oshirase List |
| 概要 | ログイン画面に表示する公開お知らせ一覧を取得する（認証不要） |
| URI | /api/v1/oshirase/public |
| メソッド | GET |
| リクエストボディー | なし |
| リクエストパラメーター | クエリパラメータ |
| ヘッダ | Content-Type: application/json |
| HTTPレスポンスコード | 200:正常にお知らせ一覧を取得しました, 500:システムエラーが発生しました|

## リクエストパラメータ

| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |
|---|---|---|---|---|---|---|---|
| 1 | publish_location | Number | - | - | | | 公開場所（1:ログイン画面, 2:メニュー画面）。デフォルト: 1 |
| 2 | limit | Number | - | - | | | 取得件数上限。デフォルト: 10、最大: 10 |

## レスポンスデータ

| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |
|---|---|---|---|---|---|---|
| 1 | data | Array | 〇 | | - | お知らせ一覧 |
| 2 | →oshirase_id | Number | - | | - | お知らせID |
| 3 | →oshirase_type | Number | - | | - | お知らせ種別（1:システム, 2:重要, 3:一般） |
| 4 | →oshirase_type_label | String | - | | - | お知らせ種別ラベル |
| 5 | →title | String | - | | - | タイトル |
| 6 | →publish_start_date | String | - | YYYY-MM-DD | - | 公開開始日 |

## リクエスト例

```
GET /api/v1/oshirase/public?publish_location=1&limit=10
```

## レスポンス成功例

```json
{
  "data": [
    {
      "oshirase_id": 1,
      "oshirase_type": 1,
      "oshirase_type_label": "システム",
      "title": "システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）",
      "publish_start_date": "2026-04-10"
    },
    {
      "oshirase_id": 2,
      "oshirase_type": 3,
      "oshirase_type_label": "一般",
      "title": "新機能「購読者一括取込」リリースのお知らせ",
      "publish_start_date": "2026-04-05"
    }
  ]
}
```

### お知らせなしの場合

```json
{
  "data": []
}
```

## レスポンス失敗例

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
  - publish_location：1（1:ログイン画面, 2:メニュー画面）
  - limit：数値型、1〜10。デフォルト: 10
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証チェック
- 本APIは認証不要（公開API）。

### 4.3 データ取得条件の設定
- 以下の条件でお知らせを取得する：
  - publish_location：1（1:ログイン画面, 2:メニュー画面）
  - 状態 = 2（公開）
  - 公開開始日 <= 現在日時
  - 公開終了日が NULL または 公開終了日 >= 現在日時
  - JA向け個別配信でないこと（ja_id IS NULL = 全体向け）

### 4.4 データ取得
```sql
SELECT oshirase_id, oshirase_type, title, publish_start_date
FROM t_oshirase
WHERE publish_location = :publish_location
  AND status = 2
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
  AND ja_id IS NULL
  AND deleted_at IS NULL
ORDER BY publish_start_date DESC
LIMIT :limit
```

### 4.5 レスポンス生成
- publish_start_date を YYYY-MM-DD 形式にフォーマットする。
- `data` 配列として返却する。HTTP 200。
- お知らせが0件の場合は空配列を返却する。

### 4.6 例外処理
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
