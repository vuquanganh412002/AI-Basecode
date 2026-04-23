---
name: gen-api-doc
description: Generate API design document (API設計書) from screen design, database schema, and requirements. Use when user asks to create or generate API documentation for a screen (ACSMS-SCR-XXX).
disable-model-invocation: true
argument-hint: [ACSMS-SCR-XXX]
allowed-tools: Read Grep Glob Write
---

# Generate API Design Document

## Description
Generate API design document (API設計書) for a screen based on its screen design, database schema, and existing API doc template.

## Process

### 1. Read Input Files

Read ALL of the following before generating:

**Screen files** (in `docs/design/$ARGUMENTS/`):
- `screen-design.md` — screen items, functions, messages
- `index.html` — screen mockup (if screen-design.md not available)

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
## エラー一覧 (1 table with エラータイプ column: 共通/画面固有)

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

**エラー一覧 — Single table with エラータイプ column:**

```markdown
| # | エラータイプ | エラーコード | エラーメッセージ | 備考 |
|---|---|---|---|---|
| 1 | 共通 | BAD_REQUEST | リクエストパラメータが不正です。 | HTTP 400 |
| 2 | 共通 | UNAUTHORIZED | セッションが切れました。再度ログインしてください。 | HTTP 401 |
| 3 | 共通 | FORBIDDEN | この画面へのアクセス権限がありません。 | HTTP 403 |
| 4 | 共通 | DATA_SCOPE_VIOLATION | このデータへのアクセス権限がありません。 | HTTP 403 |
| 5 | 共通 | VALIDATION_ERROR | 入力値が不正です。詳細はerrorsフィールドを確認してください。 | HTTP 400 |
| 6 | 共通 | TOO_MANY_REQUESTS | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7 | 共通 | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。 | HTTP 500 |
| 8 | 画面固有 | NOT_FOUND | 指定された{resource}が見つかりません。 | HTTP 404 |
| 9 | 画面固有 | DUPLICATE_CODE | 同一の{resource}コードが既に登録されています。 | HTTP 400 (if applicable) |
| 10 | 画面固有 | CONFLICT | 関連データが存在するため削除できません。 | HTTP 409 (if applicable) |
```

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
4.1 リクエストのバリデーション (each field)
4.2 認証・認可チェック
4.3 重複チェック (if unique constraint, SQL)
4.4 データ登録/更新 (SQL with RETURNING *)
4.5 操作ログ記録 (SQL INSERT INTO t_log — MANDATORY)
4.6 レスポンス生成
4.7 例外処理 (+ error log SQL)
```

DELETE:
```
4.1 リクエストのバリデーション
4.2 認証・認可チェック
4.3 データ取得条件の設定 (existence + scope check)
4.4 論理削除の実行 (SQL UPDATE SET deleted_at = NOW())
4.5 操作ログ記録 (SQL INSERT INTO t_log — MANDATORY)
4.6 レスポンス生成
4.7 例外処理 (+ error log SQL)
```

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

- CREATE: before_value = '', after_value = registered data JSON
- UPDATE: before_value = data before update JSON, after_value = data after update JSON
- DELETE: before_value = data before delete JSON, after_value = ''
- Never include password/token/PII in JSON values

**Auth section in 処理手順:**
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
- [ ] エラー一覧 is 1 table with エラータイプ column (共通/画面固有)
- [ ] Error codes use generic `NOT_FOUND` for 404 errors
- [ ] レスポンスデータ lists ALL fields individually (no "同一構造" reference)
- [ ] レスポンス成功例 shows full JSON with all fields
- [ ] Response format matches standard (data wrapper, meta for list, message for delete)
- [ ] Pagination uses `per_page`, `sort_by`, `sort_order`
- [ ] Auth section lists correct permission code (from seeder.md)
- [ ] DataScope condition included in ALL SQL queries
- [ ] `deleted_at IS NULL` in all SELECT/UPDATE/DELETE queries
- [ ] 操作ログ記録 step with SQL for CREATE/UPDATE/DELETE APIs
- [ ] Error log SQL in 例外処理 for CREATE/UPDATE/DELETE APIs
- [ ] All SQL uses `:param` parameterized format
- [ ] Japanese text for messages and field descriptions
- [ ] Frontmatter has correct screen_id and screen_name
