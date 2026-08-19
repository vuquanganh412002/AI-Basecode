---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-025
screen_name: アカウントマスタ登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Nguyen Duyen Manh
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/14 | 1.1  | Tran Duc Tuyen | 所属支店(shiten_id)追加。登録/更新リクエストに shiten_id（role_id=5のみ有効・任意）、詳細/登録/更新レスポンスに shiten_id / shiten_name を追加（顧客要件2026-07） | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/08/06 | 1.2  | Tran Duc Tuyen | 実装との差分補完：§4.5.1 を新設し、セキュリティ上重要な更新でのセッション全破棄（2026-07 のセキュリティレビュー対応）を記載。セッションのペイロード（permissions / role_code / ja_id 等）はログイン時に固定され SessionAuthGuard は DB を再検証しないため、破棄しないと降格・ロック・所属変更が既発行の cookie 保持者に反映されない（de-provisioning bypass）。破棄対象＝パスワード変更 / ロック(true) / ロール変更 / 所属スコープ変更。ロック解除(false)・氏名/メール/備考のみの変更では破棄しない（解除操作で管理者自身のセッションを切らないため）。コミット後のベストエフォートで、Redis 障害時も応答は成功のまま警告ログのみ | | |
| 4   | 2026/08/17 | 1.3  | Tran Duc Tuyen | 実装コードとの再監査による差分修正：①エラー一覧の CONFLICT メッセージを実装（`ErrorMessage.CONFLICT`）に合わせ「関連データが存在するため処理を実行できません。」へ修正（ACSMS-SCR-024 api.md と同一文言に統一）。②各エラーレスポンス例の欠落していた末尾「。」を補完し、バリデーションエラー例「アカウント名称は必須です」を実際の DTO メッセージ「アカウント名は必須です。」へ修正。③更新APIの after_value 監査ログ例に欠落していた `account_lock_flg` を追加（前回セッションが中断し before_value のみ修正済みだった箇所を完了）。④§4.5.1 のセッション破棄対象表に `todofuken_code` を追加（2026-08-12 のバックエンドコードレビュー finding #8 対応 commit `0131b798` で isSecuritySensitiveUpdate() に追加されたが本書に未反映だった）。⑤登録APIレスポンス例の `updated_at` を実装（`updated_at` は NOT NULL DEFAULT NOW() で登録時に created_at と同時刻が設定される）に合わせ null から実際のタイムスタンプへ修正 | | |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「アカウントマスタ登録画面（ACSMS-SCR-025）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                               |
| --- | ------------- | ------------------------------------ |
| 1   | ACSMS-SCR-024 | アカウントマスタ明細検索画面 API設計書 |
| 2   | ACSMS-SCR-009 | 管理支店マスタ登録画面 API設計書       |

※ 本画面のカスケードプルダウンは以下の共用APIを使用する。
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — 定義元: ACSMS-SCR-009
- ACSMS-API-COMMON-002: Get Roles Dropdown (`GET /api/v1/roles/dropdown`) — 定義元: ACSMS-SCR-024
- ACSMS-API-COMMON-003: Get JA Dropdown (`GET /api/v1/ja/dropdown`) — 定義元: ACSMS-SCR-024
- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024

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
| 8   | 画面固有     | NOT_FOUND     | 指定されたアカウントが見つかりません。                                 | HTTP 404 |
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため処理を実行できません。                | HTTP 409 |
| 10  | 画面固有     | DUPLICATE_CODE        | ログインID「{login_id}」はすでに登録されています。            | HTTP 400（ACSMS-API-025-002 のみ。account.service.ts createAccount） |

---

# API ACSMS-API-025-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Account Detail                                                                                                                                                                                       |
| 概要                   | 指定したアカウントの詳細を取得する（編集モード用）                                                                                                                                                       |
| URI                    | /api/v1/accounts/{account_id}                                                                                                                                                                            |
| メソッド               | GET                                                                                                                                                                                                      |
| リクエストボディー     | なし                                                                                                                                                                                                     |
| リクエストパラメーター | account_id（パスパラメータ）                                                                                                                                                                             |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                   |
| HTTPレスポンスコード   | 200:正常にアカウント詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたアカウントが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                      |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------- |
| 1   | account_id     | Number | -        | 〇   |        |        | 取得対象の account_id（パスパラメータ）   |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------------------- | ------- | -------- | ------------ | -------- | ------------------------ |
| 1   | data                | Object  | -        |              | -        | アカウント詳細データ     |
| 2   | →account_id         | Number  | -        |              | -        | アカウントID             |
| 3   | →login_id           | String  | -        |              | -        | ログインID               |
| 4   | →account_name       | String  | -        |              | -        | アカウント名             |
| 5   | →role_id            | Number  | -        |              | -        | 管理者区分ID             |
| 6   | →role_name          | String  | -        |              | -        | 管理者区分名称           |
| 7   | →todofuken_code     | String  | -        |              | 〇       | 都道府県コード           |
| 8   | →todofuken_name     | String  | -        |              | 〇       | 都道府県名               |
| 9   | →ja_id              | Number  | -        |              | 〇       | JA ID                    |
| 10  | →ja_name            | String  | -        |              | 〇       | JA名称                   |
| 11  | →kanri_shiten_id    | Number  | -        |              | 〇       | 管理支店ID               |
| 12  | →kanri_shiten_name  | String  | -        |              | 〇       | 管理支店名称             |
| 12.1 | →shiten_id          | Number  | -        |              | 〇       | 所属支店ID（顧客要件2026-07） |
| 12.2 | →shiten_name        | String  | -        |              | 〇       | 所属支店名称             |
| 13  | →email              | String  | -        |              | -        | メールアドレス（NOT NULL、空文字許容）        |
| 14  | →sub_email_1        | String  | -        |              | -        | サブメールアドレス1（NOT NULL、空文字許容）   |
| 15  | →sub_email_2        | String  | -        |              | -        | サブメールアドレス2（NOT NULL、空文字許容）   |
| 16  | →sub_email_3        | String  | -        |              | -        | サブメールアドレス3（NOT NULL、空文字許容）   |
| 17  | →paper_flg          | Boolean | -        |              | -        | 紙版取扱フラグ           |
| 18  | →denshi_flg         | Boolean | -        |              | -        | 電子版取扱フラグ         |
| 18.1 | →account_lock_flg  | Boolean | -        |              | -        | アカウントロックフラグ（ログイン失敗回数が閾値到達でtrue。管理者が解除可能） |
| 19  | →biko               | String  | -        |              | -        | 備考                     |
| 20  | →created_at         | String  | -        | ISO8601      | -        | 作成日時                 |
| 21  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時                 |

## リクエスト例

```
GET /api/v1/accounts/1
```

## レスポンス成功例

```json
{
  "data": {
    "account_id": 1,
    "login_id": "admin001",
    "account_name": "管理者 太郎",
    "role_id": 1,
    "role_name": "日農（管理者）",
    "todofuken_code": null,
    "todofuken_name": null,
    "ja_id": null,
    "ja_name": null,
    "kanri_shiten_id": null,
    "kanri_shiten_name": null,
    "shiten_id": null,
    "shiten_name": null,
    "email": "admin@agrinews.jp",
    "sub_email_1": "admin.sub1@agrinews.jp",
    "sub_email_2": "",
    "sub_email_3": "",
    "paper_flg": true,
    "denshi_flg": false,
    "account_lock_flg": false,
    "biko": "",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
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
  "message": "指定されたアカウントが見つかりません。"
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
  - account_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 Bad Request を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`account.view` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 データ取得

- NICHINO_ADMINは全アカウントを参照可能（DataScope制限なし。取得後に`assertBranchScope`による防御的チェックも行うが、NICHINO_ADMIN／NICHINO_STAFFはバイパスされるため実質no-op。現状account.viewはNICHINO_ADMINしか保有していないためこのチェックは効かないが、将来他ロールに権限が付与された際のクロステナント漏洩を防ぐ）。
- 以下の条件でデータを取得する。

```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, r.role_name,
       a.todofuken_code, t.todofuken_name,
       a.ja_id, j.ja_name,
       a.kanri_shiten_id, ks.kanri_shiten_name,
       a.shiten_id, s.shiten_name,
       a.email, a.sub_email_1, a.sub_email_2, a.sub_email_3,
       a.paper_flg, a.denshi_flg, a.account_lock_flg, a.biko,
       a.created_at, a.updated_at
FROM m_account a
  LEFT JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
  LEFT JOIN m_todofuken t ON a.todofuken_code = t.todofuken_code
  LEFT JOIN m_ja j ON a.ja_id = j.ja_id AND j.deleted_at IS NULL
  LEFT JOIN m_kanri_shiten ks ON a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL
  LEFT JOIN m_shiten s ON a.shiten_id = s.shiten_id AND s.deleted_at IS NULL
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- レコードは存在するがDataScope範囲外の場合も、存在有無を隠すためHTTP 404 (`NOT_FOUND`)として扱う（防御的チェック。現状account.viewを保有するのはNICHINO_ADMINのみのため発生しない）。

### 4.4 レスポンス生成

- data オブジェクトを含むJSONを返却する。HTTP 200。
- パスワード情報はレスポンスに含めない（セキュリティ上の理由）。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-025-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Account                                                                                                                                                                                                                                                      |
| 概要                   | 新しいアカウントを登録する                                                                                                                                                                                                                                          |
| URI                    | /api/v1/accounts                                                                                                                                                                                                                                                    |
| メソッド               | POST                                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                                     |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                              |
| HTTPレスポンスコード   | 201:登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                          |
| --- | ---------------- | ------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------- |
| 1   | login_id         | String  | -        | 〇   | 1      | 20     | ログインID（半角英数字とアンダースコアのみ）。`SYSTEM` 単体および `SYSTEM_` で始まる文字列は予約済みで使用不可（大文字小文字を区別しない）。バッチの実行者名と衝突すると `t_dokusya_rireki.created_by` による電子版同期由来の判別が壊れるため。DTO と DB の CHECK 制約 `ck_m_account_login_id_not_reserved` の両方で拒否する |
| 2   | password         | String  | -        | 〇   | 8      | 32     | パスワード（半角英字・数字・記号の3種のうち2種以上を含む）                                     |
| 3   | role_id          | Number  | -        | 〇   |        |        | 管理者区分（1〜5）                                                                            |
| 4   | todofuken_code   | String  | -        | △    | 2      | 2      | 都道府県コード（01〜47）。画面上はrole_id=3,4,5で入力必須（FE側バリデーションのみ）だが、BE DTO（create-account.dto.ts）は型・桁数のみ検証し必須チェックは行わない |
| 5   | ja_id            | Number  | -        | △    |        |        | JA ID。画面上はrole_id=3,4,5で入力必須（FE側バリデーションのみ）だが、BE DTOでは必須チェックを行わない |
| 6   | kanri_shiten_id  | Number  | -        | △    |        |        | 管理支店ID。画面上はrole_id=5で入力必須（FE側バリデーションのみ）だが、BE DTOでは必須チェックを行わない。role_id=1,2以外で指定時は、実効JA（ja_id指定値、無指定時はセッションのja_id）に属することをBEが検証し、別JAならHTTP 403（DATA_SCOPE_VIOLATION） |
| 6.1 | shiten_id        | Number  | -        | -    |        |        | 所属支店ID。role_id=5（JA_KANRI_SHITEN）のみ有効・任意。設定時は当該支店の購読者のみ操作可＋帳票5画面利用不可（顧客要件2026-07）。role_id≠5では常に破棄されNULL保存。role_id=5かつ指定時は支店の存在および指定kanri_shiten_id／JAへの帰属をBEが検証（不一致時はHTTP 400 VALIDATION_ERROR: shiten_id） |
| 7   | account_name     | String  | -        | 〇   | 1      | 50     | アカウント名称                                                                                |
| 8   | email            | String  | -        | 〇   |        | 100    | メールアドレス（メール形式、必須。顧客要件2026-05 QAレビューにより必須化）                     |
| 9   | sub_email_1      | String  | -        | -    |        | 100    | サブメールアドレス1（メール形式）。空欄可                                                     |
| 10  | sub_email_2      | String  | -        | -    |        | 100    | サブメールアドレス2（メール形式）。空欄可                                                     |
| 11  | sub_email_3      | String  | -        | -    |        | 100    | サブメールアドレス3（メール形式）。空欄可                                                     |
| 12  | paper_flg        | Boolean | -        | -    |        |        | 紙版取扱フラグ。デフォルト: false                                                             |
| 13  | denshi_flg       | Boolean | -        | -    |        |        | 電子版取扱フラグ。デフォルト: false                                                           |
| 14  | biko             | String  | -        | -    |        |        | 備考。空欄可                                                                                  |

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------------------- | ------- | -------- | ------------ | -------- | ------------------------ |
| 1   | data                | Object  | -        |              | -        | 登録されたアカウントデータ |
| 2   | →account_id         | Number  | -        |              | -        | アカウントID             |
| 3   | →login_id           | String  | -        |              | -        | ログインID               |
| 4   | →account_name       | String  | -        |              | -        | アカウント名             |
| 5   | →role_id            | Number  | -        |              | -        | 管理者区分ID             |
| 6   | →role_name          | String  | -        |              | -        | 管理者区分名称           |
| 7   | →todofuken_code     | String  | -        |              | 〇       | 都道府県コード           |
| 8   | →todofuken_name     | String  | -        |              | 〇       | 都道府県名               |
| 9   | →ja_id              | Number  | -        |              | 〇       | JA ID                    |
| 10  | →ja_name            | String  | -        |              | 〇       | JA名称                   |
| 11  | →kanri_shiten_id    | Number  | -        |              | 〇       | 管理支店ID               |
| 12  | →kanri_shiten_name  | String  | -        |              | 〇       | 管理支店名称             |
| 12.1 | →shiten_id          | Number  | -        |              | 〇       | 所属支店ID（顧客要件2026-07） |
| 12.2 | →shiten_name        | String  | -        |              | 〇       | 所属支店名称             |
| 13  | →email              | String  | -        |              | -        | メールアドレス（NOT NULL、空文字許容）        |
| 14  | →sub_email_1        | String  | -        |              | -        | サブメールアドレス1（NOT NULL、空文字許容）   |
| 15  | →sub_email_2        | String  | -        |              | -        | サブメールアドレス2（NOT NULL、空文字許容）   |
| 16  | →sub_email_3        | String  | -        |              | -        | サブメールアドレス3（NOT NULL、空文字許容）   |
| 17  | →paper_flg          | Boolean | -        |              | -        | 紙版取扱フラグ           |
| 18  | →denshi_flg         | Boolean | -        |              | -        | 電子版取扱フラグ         |
| 18.1 | →account_lock_flg  | Boolean | -        |              | -        | アカウントロックフラグ（登録直後は常にfalse） |
| 19  | →biko               | String  | -        |              | -        | 備考                     |
| 20  | →created_at         | String  | -        | ISO8601      | -        | 作成日時                 |
| 21  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時                 |
| 22  | message             | String  | -        |              | -        | 処理結果メッセージ（`登録しました。`） |

## リクエスト例

```json
POST /api/v1/accounts
Content-Type: application/json

{
  "login_id": "ja_honten001",
  "password": "Password123!",
  "role_id": 4,
  "todofuken_code": "13",
  "ja_id": 10,
  "kanri_shiten_id": null,
  "shiten_id": null,
  "account_name": "JA本店 花子",
  "email": "honten001@example.com",
  "sub_email_1": "honten001.sub1@example.com",
  "sub_email_2": "",
  "sub_email_3": "",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "account_id": 15,
    "login_id": "ja_honten001",
    "account_name": "JA本店 花子",
    "role_id": 4,
    "role_name": "JA本店",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "ja_id": 10,
    "ja_name": "JA東京中央",
    "kanri_shiten_id": null,
    "kanri_shiten_name": null,
    "shiten_id": null,
    "shiten_name": null,
    "email": "honten001@example.com",
    "sub_email_1": "honten001.sub1@example.com",
    "sub_email_2": "",
    "sub_email_3": "",
    "paper_flg": true,
    "denshi_flg": true,
    "account_lock_flg": false,
    "biko": "",
    "created_at": "2026-04-14T10:00:00Z",
    "updated_at": "2026-04-14T10:00:00Z"
  },
  "message": "登録しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "login_id", "message": "ログインIDは必須です。" },
    { "field": "password", "message": "パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。" }
  ]
}
```

### 400 Bad Request（ログインID重複）

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "ログインID「ja_honten001」はすでに登録されています。"
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

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証（DTO: `create-account.dto.ts`）：
  - login_id：必須、最大20桁、半角英数字とアンダースコアのみ（正規表現: `^\w+$`）。`SYSTEM`単体および`SYSTEM_`で始まる文字列は予約済みで拒否（`IsNotReservedLoginId`、大文字小文字区別なし）
  - password：必須、8〜32文字、半角英字・数字・記号の3種のうち2種以上を含む（`IsStrongPassword`）
  - role_id：必須、1〜5の整数。加えて非削除の`m_roles`に実在することをDBで検証し、存在しない場合は`VALIDATION_ERROR`（field: role_id、「指定されたロールが見つかりません。」）
  - todofuken_code：任意、指定時は2桁の文字列。role_id=3,4,5での入力必須制御は画面側のみ実装されており、BE DTOレベルの必須チェックは無い
  - ja_id：任意、数値型。同上（BEでの必須チェックは無い）
  - kanri_shiten_id：任意、数値型。同上（BEでの必須チェックは無い）。role_id=1,2以外で指定された場合は実効JA（`ja_id ?? セッションのja_id`）に属することを検証し、別JAならHTTP 403（`DATA_SCOPE_VIOLATION`）
  - shiten_id：任意、数値型。role_id=5（JA_KANRI_SHITEN）以外では常に破棄されNULL保存。role_id=5かつ指定時は支店の存在、および指定kanri_shiten_id／JAへの帰属を検証（不一致時はHTTP 400 `VALIDATION_ERROR`: shiten_id）
  - account_name：必須、最大50桁
  - email：必須、最大100桁、メール形式（顧客要件2026-05 QAレビューにより必須化。空欄不可）
  - sub_email_1 / sub_email_2 / sub_email_3：空欄可、最大100桁、メール形式
  - paper_flg：ブーリアン型（デフォルト: false）
  - denshi_flg：ブーリアン型（デフォルト: false）
  - biko：文字列型（空欄可）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`account.create` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 重複チェック

- login_id の重複を確認する（論理削除済み行も対象。login_id は削除後も再利用不可で、DBのUNIQUEインデックスも`deleted_at`で絞らない）。

```sql
SELECT COUNT(*) FROM m_account
WHERE login_id = :login_id
```

- 重複が見つかった場合：HTTP 400 (`DUPLICATE_CODE`)。メッセージ例：`ログインID「ja_honten001」はすでに登録されています。`
- 本チェック通過後に同時リクエストがDBのUNIQUE制約（`UQ_m_account_login_id`）に抵触した場合も、同じHTTP 400 (`DUPLICATE_CODE`)へ変換して返却する（競合時のセーフティネット）。

### 4.4 データ登録

- role_id から role_code を`m_roles`参照で解決する（存在しない場合はここで`VALIDATION_ERROR`）。
- role_id=1,2（NICHINO_ADMIN／NICHINO_STAFF）の場合、todofuken_code, ja_id, kanri_shiten_id は NULL を設定する。
- role_id=5（JA_KANRI_SHITEN）以外の場合、shiten_id は常に NULL を設定する（リクエストに値があっても破棄）。
- kanri_shiten_id が指定されている場合（role_id=1,2以外）、実効JA（ja_id指定値、無指定時はセッションのja_id）に属することを検証する（Layer 4 FKガード）。存在しない場合はHTTP 400、別JAに属する場合はHTTP 403（`DATA_SCOPE_VIOLATION`）。
- role_id=5かつshiten_idが指定されている場合、支店の存在および指定kanri_shiten_id／JAへの帰属を検証する（不一致時はHTTP 400 `VALIDATION_ERROR`: shiten_id）。
- パスワードをbcrypt（ソルトラウンド: 10）でハッシュ化する。
- 初期値を設定する：login_failure_count=0, account_lock_flg=false, mfa_enable_flg=false
- 以下のSQLを実行して登録する。

```sql
INSERT INTO m_account (login_id, password_hash, account_name,
                       role_id, todofuken_code, ja_id, kanri_shiten_id, shiten_id,
                       email, sub_email_1, sub_email_2, sub_email_3,
                       paper_flg, denshi_flg,
                       login_failure_count, account_lock_flg, mfa_enable_flg,
                       biko, created_at, created_by, updated_at, updated_by)
VALUES (:login_id, :password_hash, :account_name,
        :role_id, :todofuken_code, :ja_id, :kanri_shiten_id, :shiten_id,
        :email, :sub_email_1, :sub_email_2, :sub_email_3,
        :paper_flg, :denshi_flg,
        0, false, false,
        :biko, NOW(), :user_account_id, NOW(), :user_account_id)
RETURNING *
```

### 4.5 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'アカウントマスタ登録画面 (ACSMS-SCR-025)', 'CREATE', 1,
        :new_account_id, 'm_account',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```json
`before_value`：INSERT のため空文字列を設定する。
`after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "account_id": 15,
  "login_id": "ja_honten001",
  "account_name": "JA本店 花子",
  "role_id": 4,
  "todofuken_code": "13",
  "ja_id": 10,
  "kanri_shiten_id": null,
  "shiten_id": null,
  "email": "honten001@example.com",
  "sub_email_1": "honten001.sub1@example.com",
  "sub_email_2": "",
  "sub_email_3": "",
  "paper_flg": true,
  "denshi_flg": true,
  "account_lock_flg": false,
  "biko": ""
}
```

### 4.6 レスポンス生成

- 登録されたデータをdata オブジェクトとして返却する。HTTP 201。message フィールドに `登録しました。` を含める。
- パスワード情報はレスポンスに含めない。
- role_name, todofuken_name, ja_name, kanri_shiten_name, shiten_name はJOIN結果またはマスタから取得して付与する。
- account_lock_flg（登録直後は常にfalse）も返却する。

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
        'アカウントマスタ登録画面 (ACSMS-SCR-025)', 'CREATE', 2,
        NULL, 'm_account',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-025-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Account                                                                                                                                                                                                                                             |
| 概要                   | 指定したアカウントを更新する                                                                                                                                                                                                                               |
| URI                    | /api/v1/accounts/{account_id}                                                                                                                                                                                                                              |
| メソッド               | PUT                                                                                                                                                                                                                                                        |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                       |
| リクエストパラメーター | account_id（パスパラメータ）                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定されたアカウントが見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                          |
| --- | ---------------- | ------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------- |
| 1   | account_id       | Number  | -        | 〇   |        |        | 更新対象の account_id（パスパラメータ）                                                       |
| 2   | password         | String  | -        | -    | 8      | 32     | パスワード（変更時のみ入力。空欄の場合は変更しない）                                          |
| 3   | role_id          | Number  | -        | 〇   |        |        | 管理者区分（1〜5）                                                                            |
| 4   | todofuken_code   | String  | -        | △    | 2      | 2      | 都道府県コード（01〜47）。画面上はrole_id=3,4,5で入力必須（FE側バリデーションのみ）だが、BE DTO（update-account.dto.ts）は型・桁数のみ検証し必須チェックは行わない |
| 5   | ja_id            | Number  | -        | △    |        |        | JA ID。画面上はrole_id=3,4,5で入力必須（FE側バリデーションのみ）だが、BE DTOでは必須チェックを行わない |
| 6   | kanri_shiten_id  | Number  | -        | △    |        |        | 管理支店ID。画面上はrole_id=5で入力必須（FE側バリデーションのみ）だが、BE DTOでは必須チェックを行わない。role_id=1,2以外で指定時は、更新対象アカウントの既存JA（before.ja_id）に属することをBEが検証し、別JAならHTTP 403（DATA_SCOPE_VIOLATION） |
| 6.1 | shiten_id        | Number  | -        | -    |        |        | 所属支店ID。role_id=5（JA_KANRI_SHITEN）のみ有効・任意。設定時は当該支店の購読者のみ操作可＋帳票5画面利用不可（顧客要件2026-07）。role_id≠5では常に破棄されNULL保存。role_id=5かつ指定時は支店の存在および実効管理支店（kanri_shiten_id指定値、無指定時はbefore.kanri_shiten_id）／JAへの帰属をBEが検証（不一致時はHTTP 400 VALIDATION_ERROR: shiten_id） |
| 7   | account_name     | String  | -        | 〇   | 1      | 50     | アカウント名称                                                                                |
| 8   | email            | String  | -        | 〇   |        | 100    | メールアドレス（メール形式、必須。顧客要件2026-05 QAレビューにより必須化）                     |
| 9   | sub_email_1      | String  | -        | -    |        | 100    | サブメールアドレス1（メール形式）。空欄可                                                     |
| 10  | sub_email_2      | String  | -        | -    |        | 100    | サブメールアドレス2（メール形式）。空欄可                                                     |
| 11  | sub_email_3      | String  | -        | -    |        | 100    | サブメールアドレス3（メール形式）。空欄可                                                     |
| 12  | paper_flg        | Boolean | -        | -    |        |        | 紙版取扱フラグ                                                                                |
| 13  | denshi_flg       | Boolean | -        | -    |        |        | 電子版取扱フラグ                                                                              |
| 13.1 | account_lock_flg | Boolean | -        | -    |        |        | アカウントロックフラグ（管理者による手動ロック／解除）。falseを送るとlogin_failure_countも0に、account_lock_atもNULLにリセットされる（未指定時は変更しない） |
| 14  | biko             | String  | -        | -    |        |        | 備考。空欄可                                                                                  |

※ login_id は更新不可（画面側でdisabled）。リクエストに含めない（含めた場合、グローバルValidationPipeの`forbidNonWhitelisted`によりHTTP 400 `VALIDATION_ERROR`で拒否される）。

## レスポンスデータ

| #   | 項目ID              | タイプ  | 繰り返し | フォーマット | Nullable | 説明                     |
| --- | ------------------- | ------- | -------- | ------------ | -------- | ------------------------ |
| 1   | data                | Object  | -        |              | -        | 更新されたアカウントデータ |
| 2   | →account_id         | Number  | -        |              | -        | アカウントID             |
| 3   | →login_id           | String  | -        |              | -        | ログインID               |
| 4   | →account_name       | String  | -        |              | -        | アカウント名             |
| 5   | →role_id            | Number  | -        |              | -        | 管理者区分ID             |
| 6   | →role_name          | String  | -        |              | -        | 管理者区分名称           |
| 7   | →todofuken_code     | String  | -        |              | 〇       | 都道府県コード           |
| 8   | →todofuken_name     | String  | -        |              | 〇       | 都道府県名               |
| 9   | →ja_id              | Number  | -        |              | 〇       | JA ID                    |
| 10  | →ja_name            | String  | -        |              | 〇       | JA名称                   |
| 11  | →kanri_shiten_id    | Number  | -        |              | 〇       | 管理支店ID               |
| 12  | →kanri_shiten_name  | String  | -        |              | 〇       | 管理支店名称             |
| 12.1 | →shiten_id          | Number  | -        |              | 〇       | 所属支店ID（顧客要件2026-07） |
| 12.2 | →shiten_name        | String  | -        |              | 〇       | 所属支店名称             |
| 13  | →email              | String  | -        |              | -        | メールアドレス（NOT NULL、空文字許容）        |
| 14  | →sub_email_1        | String  | -        |              | -        | サブメールアドレス1（NOT NULL、空文字許容）   |
| 15  | →sub_email_2        | String  | -        |              | -        | サブメールアドレス2（NOT NULL、空文字許容）   |
| 16  | →sub_email_3        | String  | -        |              | -        | サブメールアドレス3（NOT NULL、空文字許容）   |
| 17  | →paper_flg          | Boolean | -        |              | -        | 紙版取扱フラグ           |
| 18  | →denshi_flg         | Boolean | -        |              | -        | 電子版取扱フラグ         |
| 18.1 | →account_lock_flg  | Boolean | -        |              | -        | アカウントロックフラグ（最新値） |
| 19  | →biko               | String  | -        |              | -        | 備考                     |
| 20  | →created_at         | String  | -        | ISO8601      | -        | 作成日時                 |
| 21  | →updated_at         | String  | -        | ISO8601      | 〇       | 更新日時                 |
| 22  | message             | String  | -        |              | -        | 処理結果メッセージ（`更新しました。`） |

## リクエスト例

```json
PUT /api/v1/accounts/2
Content-Type: application/json

{
  "password": "",
  "role_id": 4,
  "todofuken_code": "13",
  "ja_id": 10,
  "kanri_shiten_id": null,
  "shiten_id": null,
  "account_name": "JA本店 花子（更新）",
  "email": "honten001_new@example.com",
  "sub_email_1": "honten001.sub1_new@example.com",
  "sub_email_2": "manager@example.com",
  "sub_email_3": "",
  "paper_flg": true,
  "denshi_flg": true,
  "biko": "備考を追加しました"
}
```

## レスポンス成功例

```json
{
  "data": {
    "account_id": 2,
    "login_id": "ja_honten001",
    "account_name": "JA本店 花子（更新）",
    "role_id": 4,
    "role_name": "JA本店",
    "todofuken_code": "13",
    "todofuken_name": "東京都",
    "ja_id": 10,
    "ja_name": "JA東京中央",
    "kanri_shiten_id": null,
    "kanri_shiten_name": null,
    "shiten_id": null,
    "shiten_name": null,
    "email": "honten001_new@example.com",
    "sub_email_1": "honten001.sub1_new@example.com",
    "sub_email_2": "manager@example.com",
    "sub_email_3": "",
    "paper_flg": true,
    "denshi_flg": true,
    "account_lock_flg": false,
    "biko": "備考を追加しました",
    "created_at": "2026-02-01T09:00:00Z",
    "updated_at": "2026-04-14T14:30:00Z"
  },
  "message": "更新しました。"
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "account_name", "message": "アカウント名は必須です。" }
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定されたアカウントが見つかりません。"
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

- パスパラメータ：account_id 数値型チェック、必須
- リクエストボディ（DTO: `update-account.dto.ts`）：
  - login_id：DTOに未宣言。含めて送信するとグローバルValidationPipeの`forbidNonWhitelisted`によりHTTP 400（`VALIDATION_ERROR`）で拒否される（更新不可、画面側でdisabled）
  - password：空欄可（変更時のみ入力）。入力時は8〜32文字、半角英字・数字・記号の3種のうち2種以上を含む
  - role_id：必須、1〜5の整数。加えて非削除の`m_roles`に実在することをDBで検証し、存在しない場合は`VALIDATION_ERROR`（field: role_id、「指定されたロールが見つかりません。」）
  - todofuken_code：任意、指定時は2桁の文字列。role_id=3,4,5での入力必須制御は画面側のみ実装されており、BE DTOレベルの必須チェックは無い
  - ja_id：任意、数値型。同上（BEでの必須チェックは無い）
  - kanri_shiten_id：任意、数値型。同上（BEでの必須チェックは無い）。role_id=1,2以外で指定された場合は更新対象アカウントの既存JA（before.ja_id）に属することを検証し、別JAならHTTP 403（`DATA_SCOPE_VIOLATION`）
  - shiten_id：任意、数値型。role_id=5（JA_KANRI_SHITEN）以外では常に破棄されNULL保存。role_id=5かつ指定時は支店の存在、および実効管理支店（kanri_shiten_id指定値、無指定時はbefore.kanri_shiten_id）／JAへの帰属を検証（不一致時はHTTP 400 `VALIDATION_ERROR`: shiten_id）
  - account_name：必須、最大50桁
  - email：必須、最大100桁、メール形式（顧客要件2026-05 QAレビューにより必須化。空欄不可）
  - sub_email_1 / sub_email_2 / sub_email_3：空欄可、最大100桁、メール形式
  - paper_flg：ブーリアン型
  - denshi_flg：ブーリアン型
  - account_lock_flg：任意、ブーリアン型。未指定時は現在値を変更しない。falseを送るとlogin_failure_count/account_lock_atもリセットされる
  - biko：文字列型（空欄可）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`account.update` を保持しているか確認する。
  - 対象ロール：NICHINO_ADMIN（日農管理者）のみ
- 権限がない場合：HTTP 403 (`FORBIDDEN`)

### 4.3 対象レコードの存在確認

- NICHINO_ADMINは全アカウントを更新可能（DataScope制限なし。取得後に`assertBranchScope`による防御的チェックも行うが、NICHINO_ADMIN／NICHINO_STAFFはバイパスされるため実質no-op。現状account.updateはNICHINO_ADMINしか保有していないためこのチェックは効かないが、将来他ロールに権限が付与された際のクロステナント漏洩を防ぐ）。

```sql
SELECT * FROM m_account
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- レコードは存在するがDataScope範囲外の場合も、存在有無を隠すためHTTP 404 (`NOT_FOUND`)として扱う（現状発生しない防御的チェック）。

### 4.4 データ更新

- role_id から role_code を`m_roles`参照で解決する（存在しない場合はここで`VALIDATION_ERROR`）。
- kanri_shiten_id が指定されている場合（role_id=1,2以外）、更新対象アカウントの既存JA（before.ja_id）に属することを検証する（Layer 4 FKガード）。存在しない場合はHTTP 400、別JAに属する場合はHTTP 403（`DATA_SCOPE_VIOLATION`）。
- role_id=5（JA_KANRI_SHITEN）かつshiten_idが指定されている場合、支店の存在および実効管理支店（kanri_shiten_id指定値、無指定時はbefore.kanri_shiten_id）／JAへの帰属を検証する（不一致時はHTTP 400 `VALIDATION_ERROR`: shiten_id）。
- password が空欄でない場合のみ、bcrypt（ソルトラウンド: 10）でハッシュ化し、password_hash と password_updated_at を更新する。
- role_id=1,2（NICHINO_ADMIN／NICHINO_STAFF）の場合、todofuken_code, ja_id, kanri_shiten_id は NULL を設定する。
- role_id=5以外の場合、shiten_id は常に NULL を設定する。
- account_lock_flg がリクエストに含まれる場合のみ更新する。false（解除）を送った場合は同時に login_failure_count=0, account_lock_at=NULL にリセットする（残すと次回ログイン失敗時に閾値到達で再ロックされる、またはロック開始時刻が「まだロック中」のまま誤って残る）。

```sql
UPDATE m_account
SET password_hash = CASE WHEN :password_provided THEN :password_hash ELSE password_hash END,
    password_updated_at = CASE WHEN :password_provided THEN NOW() ELSE password_updated_at END,
    role_id = :role_id,
    todofuken_code = :todofuken_code,
    ja_id = :ja_id,
    kanri_shiten_id = :kanri_shiten_id,
    shiten_id = :shiten_id,
    account_name = :account_name,
    email = :email,
    sub_email_1 = :sub_email_1,
    sub_email_2 = :sub_email_2,
    sub_email_3 = :sub_email_3,
    paper_flg = :paper_flg,
    denshi_flg = :denshi_flg,
    account_lock_flg = CASE WHEN :account_lock_flg_provided THEN :account_lock_flg ELSE account_lock_flg END,
    login_failure_count = CASE WHEN :account_lock_flg_provided AND :account_lock_flg = false THEN 0 ELSE login_failure_count END,
    account_lock_at = CASE WHEN :account_lock_flg_provided AND :account_lock_flg = false THEN NULL ELSE account_lock_at END,
    biko = :biko,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE account_id = :account_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

- 更新前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。
- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'アカウントマスタ登録画面 (ACSMS-SCR-025)', 'UPDATE', 1,
        :target_account_id, 'm_account',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**before_value 例:**

```json
`before_value`：更新前のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "account_id": 2,
  "login_id": "ja_honten001",
  "account_name": "JA本店 花子",
  "role_id": 4,
  "todofuken_code": "13",
  "ja_id": 10,
  "kanri_shiten_id": null,
  "shiten_id": null,
  "email": "honten001@example.com",
  "sub_email_1": "honten001.sub1@example.com",
  "sub_email_2": "",
  "sub_email_3": "",
  "paper_flg": true,
  "denshi_flg": false,
  "account_lock_flg": false,
  "biko": ""
}
```

**after_value 例:**

```json
`after_value`：更新後のデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

{
  "account_id": 2,
  "login_id": "ja_honten001",
  "account_name": "JA本店 花子（更新）",
  "role_id": 4,
  "todofuken_code": "13",
  "ja_id": 10,
  "kanri_shiten_id": null,
  "shiten_id": null,
  "email": "honten001_new@example.com",
  "sub_email_1": "honten001.sub1_new@example.com",
  "sub_email_2": "manager@example.com",
  "sub_email_3": "",
  "paper_flg": true,
  "denshi_flg": true,
  "account_lock_flg": false,
  "biko": "備考を追加しました"
}
```

### 4.5.1 セキュリティ上重要な変更時のセッション破棄（2026-07）

セッションのペイロード（`permissions` / `role_code` / `ja_id` / `kanri_shiten_id` 等）は**ログイン時に固定**され、`SessionAuthGuard` は Redis のセッションを引くだけで DB を再検証しない。したがって破棄しない限り、降格・ロック・所属変更が**既に発行済みの cookie 保持者へ反映されない**（de-provisioning bypass）。

以下のいずれかに該当する更新を行った場合、**コミット後に**対象アカウントの有効セッションを全破棄する。

| 変更内容 | 破棄する |
| --- | --- |
| パスワード変更（管理者による強制リセット） | 〇 |
| アカウントロック（`account_lock_flg` を **true** へ） | 〇 |
| ロール（`role_id`）の変更 | 〇 |
| 所属スコープ（`ja_id` / `kanri_shiten_id` / `shiten_id` / `todofuken_code`）の変更 | 〇 |
| **ロック解除**（`account_lock_flg` を false へ） | ×（解除操作で管理者自身のセッションを切ってはならない） |
| 氏名・メールアドレス・備考のみの変更 | × |

- `todofuken_code` は CHUOKAI の DataScope を「自JAのみ」から「同一都道府県の全JA」へ広げる特殊フィールドであり、`ja_id` / `kanri_shiten_id` / `shiten_id` と同格の「セッションに固定されたスコープ」として扱う（バックエンドコードレビュー finding #8 対応、2026-08-12）。
- 所属スコープの判定では `undefined`（この更新に含まれない）と `null`（スコープなし）を正規化し、**実際に値が遷移した場合のみ**変更とみなす（`todofuken_code` は文字列のため同様の正規化を文字列比較で行う）。
- 破棄は**コミット後のベストエフォート**。Redis 障害が発生しても業務書き込みは成立済みのため応答は成功のままとし、警告ログのみ出力する（セッションは 24h の TTL 内に失効し、変更自体は永続化済み）。
- 同じ破棄はアカウント削除（`DELETE /api/v1/accounts/{account_id}`。API定義は ACSMS-SCR-024 側）でも行う。削除は無条件に破棄する。

### 4.6 レスポンス生成

- 更新されたデータをdata オブジェクトとして返却する。HTTP 200。
- パスワード情報はレスポンスに含めない。

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
        'アカウントマスタ登録画面 (ACSMS-SCR-025)', 'UPDATE', 2,
        :target_account_id, 'm_account',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

