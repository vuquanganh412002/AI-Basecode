---
name: gen-api-doc
description: Generate API design document (API設計書) from screen design, database schema, and requirements. Use when user asks to create or generate API documentation for a screen (ACSMS-SCR-XXX).
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate API Design Document

## Description
Generate API design document (API設計書) for a screen based on its screen design, database schema, and existing API doc template.

## Process

### 1. Read Input Files

Read ALL of the following before generating:

**Screen files** (in `docs/design/$ARGUMENTS/`) — read EVERY file that
exists; the two complement each other:
- `screen-design.md` — screen items, functions, messages, validation,
  error spec (canonical functional contract). Read whenever present.
- `index.html` — UI mockup with Japanese button/column/label text used
  by the actual screen. Read whenever present so generated `エラー一覧`
  / `処理` rows reference real labels rather than placeholders.

**Database schema:**
- `docs/database/database-design.md` — table definitions, columns, types, relations
- `docs/database/seeder.md` — seed data, permissions (model.action), roles

**Requirements:**
- `docs/requirement/account_concept.md` — permission matrix, DataScope rules
- Other requirement files as needed

**Template** (MUST follow this format exactly):
- `docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md` — reference template for structure, style, SQL format

**Common API registry:**
- `docs/design/common-api.md` — list of shared APIs used across multiple screens

**Rules:**
- `.claude/rules/nestjs.md` — API design, response format, error codes, pagination, audit log

### 2. Analyze Screen

From screen design, identify:
- What data the screen displays (→ GET APIs)
- What actions user can perform (→ POST/PUT/DELETE APIs)
- What form fields exist (→ request parameters)
- What list/table columns exist (→ response fields)
- What search/filter options exist (→ query parameters)
- What permissions are needed (from seeder.md permission matrix)
- What DataScope applies (from account_concept.md)

### 3. Generate API Document

**Output file:** `docs/design/$ARGUMENTS/$ARGUMENTS-api.md`

**Document structure** (MUST match template SCR-003):

```
---
(frontmatter: customer_name, system_name, screen_id, screen_name, etc.)
---

## 変更履歴
## システム概要 (same across all docs)
## 資料目的
## 関連資料
## エラー一覧 (canonical 5-column table: # / エラータイプ (共通|画面固有) / エラーコード / エラーメッセージ / 備考)

# API ACSMS-API-{screen_number}-001
## 概要 (table: API名, URI, メソッド, HTTPレスポンスコード)
## リクエストパラメータ (table: パラメーターID, タイプ, 必須, 最小長, 最大長, 説明)
## レスポンスデータ (table: 項目ID, タイプ, フォーマット, Nullable, 説明 — ALL fields listed)
## リクエスト例
## レスポンス成功例 (full JSON with all fields)
## レスポンス失敗例 (each error code with JSON example)
## 処理手順 (4.1~4.7 with SQL blocks)
```

### 4. Rules to Follow

**Response format:**

Single object:
```json
{ "data": { ... } }
```

List with pagination:
```json
{ "data": [...], "meta": { "total": 100, "page": 1, "per_page": 20, "total_pages": 5 } }
```

Delete:
```json
{ "message": "正常に削除しました" }
```

**レスポンスデータ table — MUST list ALL fields individually:**
- DO NOT write "同一構造" or "API-XXX-001のレスポンスと同一"
- List every field with →prefix: `→tanka_id`, `→tanka_name`, etc.
- Include タイプ, フォーマット, Nullable, 説明 for each field

**No `*_label` fields on authenticated endpoints (MANDATORY):**

For m_code-referenced columns (`tanka_type`, `zei_kubun`, `itaku_kubun`, `oshirase_type`, …), serialize ONLY the code value — NEVER add a sibling `<field>_label` field. The FE looks up the label at render time via `useCodesStore().label('CATEGORY', value)`.

```
✅ | 4 | →tanka_type | Number | - | - | 1: 購読料, 2: 配達手数料（ラベルはFE側で `useCodesStore().label('TANKA_TYPE', value)` から取得） |
❌ | 4 | →tanka_type       | Number | - | - | 1: 購読料, 2: 配達手数料 |
❌ | 5 | →tanka_type_label | String | - | - | tanka_typeのラベル          |
```

Reasons: m_code is runtime-editable (customer renames a label → FE store reloads → no BE redeploy needed); avoid stale-label drift between BE response and FE cache; smaller payload. See `.claude/rules/nestjs.md §Response serialization`.

**Exception — public (unauthenticated) endpoints**: when the consumer has no m_code cache yet (login-screen oshirase, public landing data, mobile pre-login), the BE MUST serialize the label. Pass `CodeService` (`@Global`) into the service and call `getLabel('CATEGORY', value)`. Document the field with comment `（公開エンドポイントのためサーバ側で解決）`.

**Nullable column policy (MANDATORY — consult `docs/database/database-design.md` per field):**

The `Nullable` column in the レスポンスデータ table and the value shown in the JSON example MUST follow the underlying database column nullability — never the UI's notion of "optional".

| DB column definition | `Nullable` in table | JSON example value when empty |
|---|---|---|
| `NULL許容` marked `〇` (truly nullable — dates, nullable FKs, `jastem_*`, etc.) | `〇` | `null` |
| `NULL許容` blank (NOT NULL, even if the field is UI-optional — typical for string columns like `biko`, `address`, `tel`, `fax`, `email`, `tanto_busho`) | blank (not Nullable) | `""` (empty string) |

**Serialization rule — two separate contracts, never mixed:**

1. If the DB stores `""` (NOT NULL string), the API MUST return `""`. Do not silently coerce to `null`.
2. If the DB stores `NULL` (nullable), the API MUST return `null`. Do not coerce to `""`.

**Common mistakes to prevent:**

- Treating every UI-optional input as API-nullable. A form field that the user can leave blank often maps to `NOT NULL DEFAULT ''` in Postgres — the API returns `""`, not `null`. Check the schema.
- Mixing the two conventions within the same response (the original issue this policy fixes). Every Nullable field in the example must match its declared type: either `""` or `null`, consistently.
- Marking a field `Nullable=〇` in the table but using `""` in the JSON example (or the reverse).

**Worked example — a JA detail response:**

From `m_ja` schema: `biko` is NOT NULL (empty string when absent), `jastem_koza_no` is nullable, `updated_at` is nullable.

```json
{
  "data": {
    "ja_id": 1,
    "ja_name": "JA東京中央",
    "biko": "",                   // DB NOT NULL → always string, empty when unfilled
    "jastem_koza_no": null,       // DB nullable → null when absent
    "updated_at": null            // DB nullable → null until first update
  }
}
```

レスポンスデータ table for the same fields:

```markdown
| #  | 項目ID          | タイプ | Nullable | 説明                     |
|----|-----------------|--------|----------|--------------------------|
| 25 | →biko           | String |          | 備考（空文字許容）       |
| 22 | →jastem_koza_no | String | 〇       | JASTEM 口座番号          |
| 30 | →updated_at     | String | 〇       | 更新日時                 |
```

**m_code reference policy (MANDATORY when a column stores enumerated code values):**

Columns that store code values (e.g. `tanka_type`, `gender`, `shiharai_hoho`, `zei_kubun`, `log_type`, `oshirase_type`) reference `m_code.code_category='XXX'` — NOT PostgreSQL ENUM, NOT hardcoded in application code. Seeder values live in `docs/database/seeder.md §5`.

In api.md:

- **リクエストパラメータ** / **レスポンスデータ** 説明 column MUST include `※m_code.code_category='XXX'を参照` followed by the inline value list from `seeder.md §5`.
- Type is `Integer` (or `String` when DB stores varchar — e.g. `yubin_kubun`), NOT `Enum`.
- Do NOT invent a TypeScript enum name in the api.md (like `TankaTypeEnum`). Reference by category code.

Worked example:

```markdown
| #  | パラメーターID | タイプ  | 必須 | 説明                                                              |
|----|----------------|---------|------|-------------------------------------------------------------------|
| 4  | tanka_type     | Integer | ○    | 単価種類 ※m_code.code_category='TANKA_TYPE'を参照（1:購読料, 2:配達手数料） |
| 5  | zei_kubun      | Integer | ○    | 税区分 ※m_code.code_category='ZEI_KUBUN'を参照（1:内税, 2:外税）     |
```

Same pattern applies in レスポンスデータ — the API returns the raw integer value; FE translates it via `useCodesStore.label(...)`.

**エラー一覧 — Canonical 5-column table (MANDATORY format):**

Columns MUST be exactly: `#` / `エラータイプ` / `エラーコード` / `エラーメッセージ` / `備考`.

`エラータイプ` MUST be one of `共通` or `画面固有`. **NEVER** duplicate the エラーコード value into the エラータイプ column (legacy anti-pattern from early docs — e.g. `| UNAUTHORIZED | UNAUTHORIZED |` is invalid).

### 7 canonical 共通 rows — include all that apply, in this order

For a protected endpoint (default), emit all 7 共通 rows verbatim:

```markdown
| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
```

Messages MUST match the wording above character-for-character — do not paraphrase, re-order sentences, or drop punctuation.

### Common-row omissions allowed only for public / non-auth endpoints

| Omission | Condition |
|---|---|
| Skip `UNAUTHORIZED` + `FORBIDDEN` | Endpoint is public (e.g. `/oshirase/public`, `/auth/login`, `/auth/forgot-password`) |
| Skip `DATA_SCOPE_VIOLATION` | No DataScope filtering applies (pure master data public, menu screen) |
| Skip `TOO_MANY_REQUESTS` | Endpoint not rate-limited (rare — prefer adding it) |

If you omit any 共通 row, note the reason in the PR description. `VALIDATION_ERROR` and `INTERNAL_SERVER_ERROR` are ALWAYS present.

### Screen-specific (画面固有) rows — use these standard patterns

| Scenario | エラーコード | エラーメッセージ template | 備考 |
|---|---|---|---|
| Resource lookup misses | `NOT_FOUND` | `指定された{resource}が見つかりません。` | HTTP 404 |
| Unique-constraint violation on create/update | `DUPLICATE_CODE` | `同一の{resource}コードが既に登録されています。` | HTTP 400 |
| FK blocks delete (related data exists) | `CONFLICT` | `関連データが存在するため削除できません。` | HTTP 409 |

**CRITICAL wording rules — enforced to prevent drift:**

- NOT_FOUND: `指定された{resource}が見つかりません。` — exact pattern. NEVER write `指定された{X}のアカウントが見つかりません` or similar expansions unless the screen is genuinely looking up by a non-ID field (e.g. SCR-012 forgot-password looks up by email).
- DUPLICATE_CODE: `同一の{resource}コードが既に登録されています。` — start with `同一の`, end with `が既に登録されています。`. NEVER write `この{X}は既に登録されています` (wrong).
- CONFLICT: `関連データが存在するため削除できません。` — exact string. NEVER write `このレコードは現在使用中のため、削除できません` (wrong) or any variant.
- `CONFLICT` (HTTP 409) is **only** for FK-blocked delete. For unique-constraint violations on create/update, use `DUPLICATE_CODE` (HTTP 400). Never confuse the two.

### Screen-specific custom codes

Screens with unique business errors may define extra codes. Examples already in the project:

| Screen | Code | Purpose |
|---|---|---|
| SCR-001 | INVALID_CREDENTIALS, ACCOUNT_LOCKED, INVALID_OTP, OTP_EXPIRED, OTP_MAX_ATTEMPTS, OTP_RESEND_LIMIT, OTP_RESEND_COOLDOWN, INVALID_MFA_TOKEN | Login / MFA flow |
| SCR-012 | INVALID_RESET_TOKEN, EXPIRED_RESET_TOKEN | Password reset |
| SCR-019 | IMPORT_VALIDATION_ERROR, FILE_FORMAT_ERROR, ROW_LIMIT_EXCEEDED | Excel import |
| SCR-030 | DATE_RANGE_INVALID, DATE_RANGE_TOO_LONG, EXPORT_LIMIT_EXCEEDED | Log export |
| SCR-031 | DEADLINE_NOTICE_DUPLICATE | Specific uniqueness rule |

Name new codes in UPPER_SNAKE_CASE. Do NOT create a screen-qualified NOT_FOUND variant like `TANKA_NOT_FOUND` — stay with generic `NOT_FOUND` and convey specificity through the message text.

**Pagination params:** `page`, `per_page`, `sort_by`, `sort_order` (snake_case)

**処理手順 — Standard steps per API type:**

GET (detail):
```
4.1 リクエストのバリデーション
4.2 認証・認可チェック (permission code + roles)
4.3 データ取得 (SQL with :params, deleted_at IS NULL, ja_id scope)
4.4 レスポンス生成
4.5 例外処理
```

GET (list):
```
4.1 リクエストのバリデーション (+ default values)
4.2 認証・認可チェック
4.3 データ取得条件の設定 (scope + search + sort)
4.4 データ件数の取得
4.5 データ取得 (SQL with pagination)
4.6 レスポンス生成
4.7 例外処理
```

POST (create) / PUT (update):
```
※ 4.4 データ登録/更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
  いずれかが失敗した場合は全てロールバックすること。
  例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

4.1 リクエストのバリデーション (each field)
4.2 認証・認可チェック
4.3 重複チェック (if unique constraint, SQL)
4.4 データ登録/更新 (SQL with RETURNING *)          ┐ 単一
4.5 操作ログ記録 (SQL INSERT INTO t_log — MANDATORY) ┘ トランザクション
4.6 レスポンス生成
4.7 例外処理 (+ error log SQL — トランザクション外で記録)
```

DELETE:
```
※ 4.4 論理削除 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
  いずれかが失敗した場合は全てロールバックすること。
  例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

4.1 リクエストのバリデーション
4.2 認証・認可チェック
4.3 データ取得条件の設定 (existence + scope check)
4.4 論理削除の実行 (SQL UPDATE SET deleted_at = NOW()) ┐ 単一
4.5 操作ログ記録 (SQL INSERT INTO t_log — MANDATORY)   ┘ トランザクション
4.6 レスポンス生成
4.7 例外処理 (+ error log SQL — トランザクション外で記録)
```

**`4.2 認証・認可チェック` wording (MANDATORY — unified across all api.md):**

Protected API (requires login):
```markdown
### 4.2 認証・認可チェック
- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `{model}.{action}` （例: `tanka.view`, `dokusya.create`）
- 該当権限保持ロール: {role list from seeder.md, e.g. NICHINO_ADMIN / CHUOKAI / JA_HONTEN}
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: {scope rule, e.g. `ja_id = user.ja_id` for JA_HONTEN, 全件 for NICHINO_ADMIN}
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)
```

Public API (no auth — login/forgot-password/public oshirase):
```markdown
### 4.2 認証・認可チェック
- 認証チェック不要（公開API）。
```

**CRITICAL rules:**
- NEVER write "JWT", "アクセストークン", "リフレッシュトークン", "Bearer" anywhere in generated docs — auth is pure HTTP-only Cookie session (agreed 2026-04).
- NEVER include `access_token`, `refresh_token`, or similar fields in response tables / JSON examples. Session ID lives in the HTTP-only cookie, never in the body.
- For `/auth/login` (MFA=false) and `/auth/mfa/verify` success responses, add this note below the JSON example:
  > ※ 認証情報（セッションID）はレスポンスボディではなくHTTP-only Cookieで返却する（`HttpOnly`+`Secure`+`SameSite=Strict`、24時間有効）。
- For `/auth/refresh` and `/auth/logout`, state in 概要 that the session cookie is read from the request and destroyed/extended in Redis.

**Audit log SQL format (操作ログ記録):**

Success log:
```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '{screen_name}', '{OPERATION}', 1,
        :{target_id}, '{table_name}', :before_value_json, :after_value_json,
        :ip_address, :user_agent)
```

Error log:
```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '{screen_name}', '{OPERATION}', 2,
        :{target_id}, '{table_name}', :error_message, :stack_trace,
        :ip_address, :user_agent)
```

- `operation` column MUST use bare verbs only: `'CREATE'` / `'UPDATE'` / `'DELETE'`. NEVER prefix with entity or screen name (e.g. no `'JA_CREATE'`, `'TANKA_UPDATE'`, `'DOKUSYA_DELETE'`). Screen context lives in `gamen_name`; entity context lives in `target_table`.
- CREATE: before_value = '', after_value = registered data JSON
- UPDATE: before_value = data before update JSON, after_value = data after update JSON
- DELETE: before_value = data before delete JSON, after_value = ''
- Never include password/token/PII in JSON values

**Auth section in 処理手順:**
- Follow the unified `4.2 認証・認可チェック` template above (session-based)
- State which permission is required: e.g., `tanka.view`, `tanka.create`
- State which roles have this permission (from seeder.md)
- State DataScope: e.g., `ja_id = user.ja_id`

**SQL rules in 処理手順:**
- Use parameterized queries (`:param` format)
- Always include `deleted_at IS NULL`
- Always include DataScope condition (`ja_id = :ja_id`)
- Use `RETURNING *` for INSERT/UPDATE

### 5. Common API Handling

**Read `docs/design/common-api.md` first** to check existing shared APIs.

**When a screen needs a dropdown/shared API (todofuken, roles, JA, kanri-shiten, etc.):**

1. **Check if it already exists** in `common-api.md`
   - If YES → Reference it in 関連資料 section. Do NOT create a duplicate API definition.
   - If NO → Create it as `ACSMS-API-COMMON-{next_number}` in the screen's API doc, then add a row to `common-api.md`.

**Referencing existing common APIs in 関連資料:**
```markdown
※ 本画面のカスケードプルダウンは以下の共用APIを使用する。
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — 定義元: ACSMS-SCR-009
```

**Creating a new common API:**
- Use ID format: `ACSMS-API-COMMON-{next_number}` (check `common-api.md` for the last used number)
- Auth: `認証済みユーザーであればアクセス可能。呼び出し元画面の権限に依存する。`
- After generating, append a new row to `docs/design/common-api.md`:

```markdown
| ACSMS-API-COMMON-XXX  | API Name              | GET      | /api/v1/xxx/dropdown    | 概要説明                                           | SCR-XXX   | SCR-XXX                           |
```

**Identifying common APIs:** An API is common if it is a dropdown/lookup that:
- Returns master data (todofuken, roles, JA, kanri-shiten, shiten, etc.)
- Has no screen-specific business logic
- Could be reused by other screens

### 6. Validation Checklist

Before finishing, verify:
- [ ] All screen actions have corresponding API
- [ ] エラー一覧 uses the canonical 5-column table (`#` / `エラータイプ` / `エラーコード` / `エラーメッセージ` / `備考`)
- [ ] エラータイプ column is exactly `共通` or `画面固有` — NEVER duplicates エラーコード
- [ ] All 7 canonical 共通 rows are present for protected endpoints (in order: BAD_REQUEST → UNAUTHORIZED → FORBIDDEN → DATA_SCOPE_VIOLATION → VALIDATION_ERROR → TOO_MANY_REQUESTS → INTERNAL_SERVER_ERROR)
- [ ] 共通 messages match canonical wording **character-for-character** (no paraphrasing)
- [ ] Error codes use generic `NOT_FOUND` for 404 errors (no `TANKA_NOT_FOUND` / `JA_NOT_FOUND` variants)
- [ ] NOT_FOUND message: `指定された{resource}が見つかりません。` pattern
- [ ] DUPLICATE_CODE message: `同一の{resource}コードが既に登録されています。` pattern — NEVER `この{X}は既に登録されています`
- [ ] CONFLICT message: exact `関連データが存在するため削除できません。` — NEVER paraphrased
- [ ] `CONFLICT` used only for FK-blocked delete; `DUPLICATE_CODE` used for unique-constraint violations — NEVER swapped
- [ ] All エラーメッセージ end with `。` (full-width period) in the エラー一覧 table
- [ ] JSON レスポンス失敗例 messages use the same wording as the エラー一覧 table (drop the trailing `。` only if project convention, but be consistent)
- [ ] レスポンスデータ lists ALL fields individually (no "同一構造" reference)
- [ ] `Nullable` column matches the DB schema (`NULL許容` in database-design.md) for every field — NOT the UI's notion of "optional"
- [ ] Every `Nullable=〇` field shows `null` in the JSON success example when the value is absent; every non-nullable string field shows `""` — NEVER mix (`biko: ""` ✓, `jastem_koza_no: null` ✓, but `biko: null` ✗)
- [ ] レスポンスデータ / JSON examples contain **NO** `access_token` / `refresh_token` fields
- [ ] レスポンス成功例 shows full JSON with all fields
- [ ] Response format matches standard (data wrapper, meta for list, message for delete)
- [ ] Pagination uses `per_page`, `sort_by`, `sort_order`
- [ ] `4.2 認証・認可チェック` uses the unified wording `認証情報を検証する（HTTP-only Cookieセッション）` (protected) or `認証チェック不要` (public) — NEVER mentions JWT / Bearer / access token / refresh token
- [ ] Auth section lists correct permission code (from seeder.md) + roles + DataScope
- [ ] For login/mfa/verify success responses: note line about HTTP-only Cookie session ID added below JSON example
- [ ] DataScope condition included in ALL SQL queries
- [ ] `deleted_at IS NULL` in all SELECT/UPDATE/DELETE queries
- [ ] 操作ログ記録 step with SQL for CREATE/UPDATE/DELETE APIs
- [ ] Audit log `operation` column uses bare `'CREATE'` / `'UPDATE'` / `'DELETE'` only — NO entity/screen prefix
- [ ] CREATE/UPDATE/DELETE `処理手順` starts with a transaction-boundary note: `※ 4.4 ... と 4.5 操作ログ記録 は単一トランザクション内で実行する。` — main DML step + audit log INSERT are atomically committed or rolled back together
- [ ] Error log (`log_type = 3`) in 4.7 例外処理 is explicitly marked `トランザクション外で記録` so the audit trail survives even after rollback
- [ ] Error log SQL in 例外処理 for CREATE/UPDATE/DELETE APIs
- [ ] All SQL uses `:param` parameterized format
- [ ] Japanese text for messages and field descriptions
- [ ] Frontmatter has correct screen_id and screen_name
