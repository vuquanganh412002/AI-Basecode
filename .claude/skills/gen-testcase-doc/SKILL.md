---
name: gen-testcase-doc
description: Generate test specification document (テスト仕様書) from screen design, API doc, and RBAC matrix. Use when user asks to create or generate testcase documentation for a screen (ACSMS-SCR-XXX).
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Test Specification Document

## Description

Generate a test specification document (テスト仕様書) for a screen,
mirroring the customer's VTI Excel deliverable but in markdown so it can
be reviewed in PRs and converted back to Excel on demand. The output
covers seven categories — the original six the customer ships in SCR-003
plus a 共通エラーハンドリング cross-cutting category:
アクセス権限 / 画面表示 / Header / 入力チェック / 業務ロジック登録 /
業務ロジック更新 / 共通エラーハンドリング.

**Customer audience reminder**: the deliverable goes to 日本農業新聞 QA
team. Their reviewers expect Japanese-throughout, professional register,
verbatim message strings, and no developer-internal jargon. Engineering
shorthand like `submit ブロック`, `BE 側 reject`, `Optimistic lock`,
`cross-JA` is unacceptable in the deliverable — see §Japanese wording
rules below.

The companion converter `scripts/testcase_md_to_excel.py` produces the
final `.xlsx` for delivery.

Pipeline position:

```
/gen-api-doc        ACSMS-SCR-XXX  →  api.md       (API contract)
/gen-testcase-doc   ACSMS-SCR-XXX  →  testcase.md  (test design)
python3 scripts/testcase_md_to_excel.py …          →  testcase.xlsx
```

## Inputs

**Required argument**: `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-005`).

**Abort conditions** (check in order, fail fast):

1. `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → abort: `Run /gen-api-doc $ARGUMENTS first — testcase design needs the エラー一覧 and request param tables`.
2. Both `docs/design/$ARGUMENTS/screen-design.md` AND `docs/design/$ARGUMENTS/index.html` missing → abort listing the expected paths.

**Soft warnings** (do not abort):

- `mtime(api.md) > mtime(SCR-003-testcase.md reference)` — print a note that the reference may be stale, but proceed.

## Process

### Phase 1 — Read

Read EVERY input below in parallel. Each contributes a different slice
of the test design and the skill assumes nothing is missing once the
abort checks pass.

| File | Contributes |
|---|---|
| `docs/design/$ARGUMENTS/screen-design.md` | UI fields, validation rules, business clauses, button-action semantics |
| `docs/design/$ARGUMENTS/index.html` | Japanese button / column / label text used in step / expected literals |
| `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` | request param tables → input boundary cases; `エラー一覧` → 異常系 cases (one TC per error row); `処理手順` → 業務ロジック happy-path cases |
| **`docs/design/common/testcase-viewpoints.md`** | **Canonical 37-viewpoint strategy doc. Each viewpoint maps to a category of TC (security / validation / business logic / integration / non-functional). Every generated TC MUST reference at least one `観点ID` so reviewers can audit coverage breadth across the system.** |
| `docs/design/ACSMS-SCR-003/ACSMS-SCR-003-testcase.md` | Canonical reference: frontmatter shape, section ordering, TC numbering, result-table layout, multilingual phrasing (JP / VN / EN mixed copy is intentional — preserve customer voice) |
| `docs/database/seeder.md` (§3 m_roles_permissions) | Role × permission matrix → アクセス権限 cases per role |
| `docs/requirement/account_concept.md` | 機能分類 × ロール ○/× → which roles should be allowed vs denied |
| `.claude/rules/testing.md` | Naming convention `should <expected> when <condition>` (used in test-case descriptions when applicable) |
| `.claude/rules/vue.md` (§No standalone error pages, §Menu / Navigation) | Permission-denied UX (`アクセス権がありません。` toast + bounce to /dashboard) |

### Phase 2 — Analyze

Derive the test inventory by category. Each category maps to one or more
**観点ID** from `docs/design/common/testcase-viewpoints.md` — recording the
mapping is mandatory (see §Critical rules).

| Category | Primary 観点ID coverage |
|---|---|
| アクセス権限 | VP-A-01 (RBAC), VP-A-02 (DataScope), VP-A-04 (URL attack) |
| 画面表示 | VP-E-01 (layout), VP-E-02 (responsive), VP-E-03 (keyboard) |
| 入力チェック | VP-B-01..VP-B-08 (required/length/format/half-width/date/etc) |
| 業務ロジック | VP-C-01 (CRUD+audit), VP-C-02 (concurrent), VP-C-03 (FK) |
| 編集画面 | VP-C-02 (concurrent edit), VP-A-03 (field-level read-only) |
| 共通エラーハンドリング | VP-A-05 (session expiry), VP-A-06 (XSS/SQL), VP-A-07 (rate-limit), VP-D-08 (network/500) |

If a TC fits two viewpoints (e.g. a SQL-injection on JAコード is both VP-A-06
and VP-B-03), record the *primary* one — the one whose risk is highest.

#### アクセス権限 (Access Control)

For every protected route belonging to this screen (look for
`meta: { permission: 'X.action' }` style in the screen-design's
function spec, or list each エラー一覧 row that mentions FORBIDDEN /
DATA_SCOPE_VIOLATION):

- Generate ONE testcase per each of the **5 roles** in `seeder.md §3`:
  `NICHINO_ADMIN`, `NICHINO_STAFF`, `CHUOKAI`, `JA_HONTEN`,
  `JA_KANRI_SHITEN`.
- Per role, look up `account_concept.md` matrix to decide ○ (allow) or
  × (deny).
- Deny case asserts the literal `アクセス権がありません。` toast (per
  `.claude/rules/vue.md §No standalone error pages`).
- Allow case asserts navigation to the screen URL (no toast).

#### 画面表示 (Layout / Rendering)

For each of the following extracted from `index.html` + `screen-design.md`:

- Page title rendering
- Breadcrumb segments + click-through
- Each form field (label + textbox / dropdown / radio / date picker)
- Each table column (when the screen is a list)
- Each button (label, position, enabled/disabled state)
- Tab order (keyboard navigation)
- Responsive layout (no overflow)

…emit one Normal-type testcase. Steps are typically `Open the screen
+ visually verify`.

#### 入力チェック (Input Validation)

For every form field with validation in `api.md` request params:

- Required check (blank input → `必須項目です。`)
- Format check (regex from `@Matches` → field-specific message)
- Length check (min / max boundaries — at-limit, over-limit)
- Boundary values (min, max, min-1, max+1, max+2 where relevant)
- Special chars / HTML / SQL-injection input (should be accepted and escaped)
- Whitespace handling (leading / trailing trim)
- Half-width / full-width acceptance
- Default value rendering on form load

Use the literal Japanese error messages from `api.md エラー一覧` —
character-for-character. Don't paraphrase.

#### 業務ロジック (Business Logic / 機能)

For every API operation in `api.md`:

- Happy path: all valid inputs → success toast + redirect (e.g.
  `登録しました。`, `更新しました。`, `削除しました。`)
- DB persistence check: query target table, verify INSERT / UPDATE /
  DELETE happened
- Audit log check: query `t_log`, verify a row with operation =
  `CREATE` / `UPDATE` / `DELETE` and `result_status = 1`

Edit-mode specific (when `:id/edit` exists):

- Form load with old data
- Concurrent edit conflict (two browsers, same record)
- Read-only fields (e.g. start date in the past)

#### 編集画面 (Edit Mode) — only when the screen has an edit route

Emit a separate edit-mode category mirroring the SCR-003 reference,
covering load-existing-data + 更新 happy-path + concurrent-edit +
update-error-paths + read-only field assertions (per security.md
Layer 3 — verify both the FE `:disabled` and the BE silent-drop).

#### 共通エラーハンドリング (Common Error Handling) — MANDATORY

Every screen MUST have a dedicated category for cross-cutting error
paths. Generate ONE TC per row in `api.md エラー一覧` that is NOT
FORBIDDEN (covered by アクセス権限). At minimum:

| エラーコード | TC 内容 | 観点ID |
|---|---|---|
| UNAUTHORIZED | セッション切れ時、HTTP 401 + redirect to /login | VP-A-05 |
| BAD_REQUEST | 不正リクエストパラメータ送信、HTTP 400 | VP-D-01 (or closest) |
| VALIDATION_ERROR | 必須漏れ統合送信、HTTP 400 + `errors[]` 配列形状検証 | VP-B-01 |
| TOO_MANY_REQUESTS | レート制限超過、HTTP 429 | VP-A-07 |
| INTERNAL_SERVER_ERROR | サーバークラッシュ模擬、HTTP 500 | VP-D-08 |
| NOT_FOUND (画面固有) | 削除済リソース取得、HTTP 404 | VP-D-02 |
| 画面固有エラー (e.g. DUPLICATE_CODE, CONFLICT) | 該当エラー条件で発生、verbatim message + error_code | varies |
| ネットワーク切断 | DevTools Network offline 模擬、FE トースト確認 | VP-D-08 |

Each TC's 期待結果 MUST include the literal `error_code: XXX` AND
the verbatim message string from `api.md` エラー一覧 — character-for-
character match. Use `HTTP {code}` notation for the HTTP status.

NEVER fabricate an error message. If the spec doesn't define a
message for a scenario (e.g. optimistic-lock conflict), assert ONLY
the HTTP code + `error_code` and add a `備考` note marking the message
as TBD pending spec confirmation. Don't invent customer-facing copy.

### Phase 3 — Generate

**Output files (BOTH languages produced from a single skill run)**:

| Language | Markdown path | Excel deliverable |
|---|---|---|
| 🇯🇵 日本語 (canonical, customer-facing) | `docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md` | `docs/design/$ARGUMENTS/【日本農業新聞様】…テスト仕様書_…_v1.0.xlsx` |
| 🇻🇳 Tiếng Việt (dev/QA team) | `docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md` | `docs/design-vi/$ARGUMENTS/【日本農業新聞様】…テスト仕様書_…_v1.0.xlsx` |

The JP version is the authoritative source — design and review against it. The VI version is **derived** from the JP version by translating body content while preserving structural markers — see §Phase 4 below.

**Frontmatter** (copy `customer_name`, `system_name`, `format_code`,
`format_version`, `test_level`, `test_environment`, `author`,
`reviewer` from the SCR-003 reference; replace `screen_id` /
`screen_name` / `issue_date` per the current screen).

The frontmatter values stay **Japanese** even in the VI file — these
fields populate the Excel customer-facing header (表紙 / 概要 sheet)
which the customer reviews in Japanese.

**Output file (JP source)**: `docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md`

**Frontmatter** (copy `customer_name`, `system_name`, `format_code`,
`format_version`, `test_level`, `test_environment`, `author`,
`reviewer` from the SCR-003 reference; replace `screen_id` /
`screen_name` / `issue_date` per the current screen).

**Section order** (must match the SCR-003 reference):

1. `## 変更履歴` — table with No / 発行日 / 版数 / 担当者 / 変更内容 / 確認者 / 承認者
2. `## システム概要` — prose paragraph (copy verbatim from `$SCR-api.md` if present, otherwise reuse the canonical wording from the SCR-003 reference)
3. `## 資料目的` — single sentence: 「{screen_name}（{screen_id}）」において、システム上で新規作成されるテスト仕様書の詳細を記述した資料です。
4. `## 関連資料` — table with No / 資料コード / 資料名 (typically one row referencing the screen design doc)
5. `## テストカテゴリ一覧` — table: # / カテゴリ / テストケース数 + 合計 row
6. `# カテゴリ N: …` — one H1 per category
7. Inside each category, `## TC-{nnn}-{seq}` per testcase

The 概要-related fields (test_level, test_environment, author, reviewer) live in **frontmatter** and are read by the converter for the 機能 sheet's rows 1-4 metadata and the 概要 sheet's VTI header. There is no `## 概要` table in markdown — the converter derives that block automatically.

**TC numbering**: `ACSMS-TC-{screen_seq}-{nnn}` where `{screen_seq}` =
the last 3 digits of `$ARGUMENTS` (e.g. `ACSMS-TC-005-001`). `{nnn}` is
**sequential across the whole document**, NOT per category — so TC IDs
survive renumbering categories.

This code is what the customer reads in the **要件ID** column of the
機能 sheet — the converter pulls it directly from each TC's H2 heading.
Do NOT emit a separate `- **要件ID**:` line; the heading is the single
source of truth.

**Column → markdown mapping** (機能 sheet, per TC row):

| Excel column | Markdown source | Format |
|---|---|---|
| **要件ID** | H2 heading code (`ACSMS-TC-{XXX}-{NNN}`) | one identifier |
| **説明** | H2 heading text after the `—` (em-dash) | one short sentence summarising the test scenario, e.g. `画面アクセス禁止`, `必須エラー（単価名が空）`, `登録正常系` |
| **前提条件** | `- **前提条件**:` bullet (multi-line allowed) | list of conditions only, each prefixed with the full-width middle dot `・`. Example: `・NICHINO_ADMIN でログイン済み（MFA認証済み）`. NEVER write `テストアカウント: foo@test.jp` — account emails rot fast and the role is the load-bearing detail. NEVER mix in actions or expected outcomes |
| **ステップ／手順** | `### 手順` section | each step rendered on **two lines**: heading line `ステップN：` (full-width colon `：`, NOT half-width `:`) followed by the action body on the next line. Insert one blank line between steps. Multi-line action bodies (SQL, JSON snippets, list of sub-steps) are allowed — keep them under the matching `ステップN：` heading. Describes **only the action**; do NOT inline `期待結果：` |
| **期待結果／アウトプット** | `### 期待結果` section | per-step expectations rendered as `ステップN：` heading + body (matches 手順 numbering). When a step has multiple expected outcomes, prefix each with `・`. Whole-test outcomes (DB final state, audit log, redirect target spanning the whole flow) live in a trailing `補足：` block at the bottom — also `・`-prefixed |
| **種類** | `- **種類**:` bullet | `Normal (正常)` / `Abnormal (異常)` / `Boundary (境界)` |

**Per-testcase block** (every TC, in this order):

```markdown
## ACSMS-TC-005-001 — 画面アクセス禁止（NICHINO_ADMIN）

- **観点ID**: VP-A-01   ← MANDATORY — must match an ID in docs/design/common/testcase-viewpoints.md
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・NICHINO_ADMIN でログイン済み（MFA認証済み）
  - ・権限「tanka.view」を持たない

### 手順

ステップ1：
ダッシュボードを開き、サイドバーに「単価マスタ」項目が表示されないことを確認

ステップ2：
ブラウザのアドレスバーに「/tanka/create」を入力し、直接アクセス

ステップ3：
DevToolsのNetworkタブでPOST「/api/v1/tanka」を有効なrequest bodyで送信

ステップ4：
DBで以下クエリを実行し、ログおよびデータを確認
```sql
SELECT * FROM t_log
WHERE result_status = 2
  AND target_table = 'm_tanka'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
サイドバーに「単価マスタ」項目が表示されない

ステップ2：
トースト「アクセス権がありません。」が表示される
かつ、「/dashboard」へリダイレクトされる

ステップ3：
HTTPステータスコード：403
error_code：FORBIDDEN
message：「この画面へのアクセス権限がありません」

ステップ4：
・t_log にエラーログが1件以上存在する
・account_id がテストアカウントと一致する
・m_tanka に新規データが追加されていない

補足：
・FEメニュー、FEルーターガード、BE APIガードの3層すべてでアクセスが制御される

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)
```

The two result tables are **always emitted with `-` placeholders** —
testers fill them in after `testcase_md_to_excel.py` produces the
deliverable Excel.

### Phase 4 — Translate to Vietnamese (mirror file)

After the JP testcase markdown is finalized, produce a Vietnamese
mirror at `docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md`. Same
TC count, same TC IDs, same structural skeleton — only **body content**
translates to Vietnamese.

**Translate (JP → VI)**:

| JP source | VI target |
|---|---|
| TC heading description after `—` | natural Vietnamese sentence |
| `前提条件` body bullets (under each `・`) | Vietnamese, keep `・` prefix |
| `手順` action body (under each `ステップN：`) | Vietnamese imperative |
| `期待結果` body (under each `ステップN：`) | Vietnamese 体言止め-equivalent |
| `補足` body bullets | Vietnamese |
| `備考` content | Vietnamese (or `(なし)` JP literal for empty) |
| `テストカテゴリ一覧` row labels | Vietnamese (e.g. `Kiểm soát quyền truy cập (Access Control)`) |
| Result-table column headers | Vietnamese: `Mục / Giá trị / Kết quả / Thực tế / Output / Người thực hiện / Ngày xác nhận / Bug ID` |

**Keep verbatim Japanese (do NOT translate)**:

- All frontmatter values (`customer_name: 日本農業新聞様`, `screen_name: 単価マスタ登録画面`, etc.) — these populate the customer-facing Excel header
- TC IDs (`ACSMS-TC-XXX-NNN`)
- Structural section headers (`## 変更履歴`, `## システム概要`, `## 資料目的`, `## 関連資料`, `## テストカテゴリ一覧`, `### 手順`, `### 期待結果`, `### 備考`, `### テスト結果（1回目）`, `### テスト結果（2回目）`)
- Inline field labels (`- **観点ID**:`, `- **種類**:`, `- **前提条件**:`)
- Step prefix `ステップN：` and whole-test prefix `補足：` (full-width colon — converter uses these to apply bold)
- 種類 literals (`Normal (正常)` / `Abnormal (異常)` / `Boundary (境界)`)
- 観点ID values (`VP-A-01` etc.)
- All system messages quoted in 期待結果 (`アクセス権がありません。`, `セッションが切れました。再度ログインしてください。`, `指定された単価が見つかりません。`, error_code values, etc.) — these are the LITERAL strings the system actually returns. Translating them would break test assertions
- HTTP literals (`HTTP 401`, `error_code: FORBIDDEN`)
- DB / API identifiers in backticks (`m_tanka`, `t_log`, `tekiyo_start_date`, etc.)
- Permission codes (`tanka.view`)
- Role names (`NICHINO_ADMIN`, `JA_HONTEN`, etc.)
- Empty-content marker `(なし)` (the converter recognizes this as "no content")

**Vietnamese register**:

- **Imperative form** for `手順` step bodies (`Mở dashboard`, `Click nút...`, `Truy cập trực tiếp URL...`, `Nhập "..." vào...`)
- **Noun-form / phrase-end** for `期待結果` step bodies (`Toast hiển thị`, `Redirect về /dashboard`, `Không có row mới trong m_tanka`)
- Use English/Japanese loanwords where the existing convention does:
  - `dashboard`, `sidebar`, `submit`, `record`, `row`, `redirect`, `toast`, `request body`, `validation`, `placeholder`, `breakpoint`, `read-only` → keep English
  - `boundary` → `giá trị biên`
  - `silent drop` → `silent drop` (or `lặng lẽ bỏ qua`)

**Generation method** — when running this skill, after producing the JP file, dispatch a sub-task (or do it inline) to translate. Brief the translator:

```
SOURCE: docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md (JP, just generated)
TARGET: docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md (overwrite)
RULES: see SKILL.md §Phase 4 — preserve all structural markers,
       translate only body content, keep all JP system-message
       strings verbatim.
VERIFY: same TC count, same category count, same `ステップN：` count,
        same JP-message verbatim count as source.
```

After both files exist, run the converter on **both**:

```
python3 scripts/testcase_md_to_excel.py docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md
python3 scripts/testcase_md_to_excel.py docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md
```

Both Excel files use the SAME Japanese column headers (the converter
hardcodes them since the deliverable template is fixed). Body cells
flip language per source markdown.

## Critical rules (enforce BEFORE writing)

- [ ] All 5 roles enumerated in アクセス権限 — `NICHINO_ADMIN`,
      `NICHINO_STAFF`, `CHUOKAI`, `JA_HONTEN`, `JA_KANRI_SHITEN`. Even
      when matrix says all five are allowed (or all five denied) — emit
      one TC per role so the deliverable shows full coverage.
- [ ] Permission-denied case asserts the literal `アクセス権がありません。`
      toast — NOT a custom message, NOT `アクセス拒否されました`, NOT
      `403 Forbidden`. The router guard text is canonical.
- [ ] Every row in `api.md エラー一覧` that is NOT
      UNAUTHORIZED / FORBIDDEN is covered by at least one TC in
      異常系 (or the category that triggers it, e.g. DUPLICATE_CODE
      goes under 業務ロジック → `登録` happy-path's negative variant).
- [ ] Japanese error messages copied **verbatim** from `api.md`.
      No paraphrasing (`既に登録されています` ≠ `すでに登録されています`).
- [ ] TC IDs follow `ACSMS-TC-{XXX}-{NNN}` exactly — the H2 heading is
      the single source of truth for the 要件ID column. Do NOT emit a
      separate `- **要件ID**:` line (legacy format).
- [ ] TC IDs are sequential across the whole document — no gaps, no
      duplicates, no per-category restart.
- [ ] `### 手順` section contains ONLY actions, never expected outcomes.
      No inline `- **期待**: …` annotations inside steps. Reviewers
      reading just the 手順 column must see a clean action sequence.
- [ ] Each step in `### 手順` is rendered as a TWO-LINE block —
      heading `ステップN：` (full-width colon `：`) on its own line,
      then the action body on the next line(s). NOT `1.` / `2.`
      numeric markdown lists, NOT `Step N:` English, NOT inline
      single-line `ステップN: action`. Insert a blank line between
      consecutive steps for readability.
- [ ] `### 期待結果` mirrors the 手順 structure: per-step expectation
      starts with `ステップN：` heading + body. When the step has
      multiple outcomes, prefix each outcome with `・`. Whole-test
      outcomes (DB final state, audit log spanning the whole flow)
      live in a trailing `補足：` block at the bottom — also `・`-
      prefixed. NEVER use the legacy `- 全体:` flat bullet form.
- [ ] `- **前提条件**:` lists conditions only, each bullet prefixed
      with the full-width middle dot `・` (e.g.
      `・NICHINO_ADMIN でログイン済み（MFA認証済み）`,
      `・権限「tanka.view」を持たない`). DON'T write
      `テストアカウント: foo@test.jp` — the email rots across
      environments and the role is the load-bearing detail. Never
      embed the first action of the test in the precondition —
      actions belong in `### 手順`.
- [ ] Every TC has both result tables (1回目 / 2回目) with `-`
      placeholders. Don't omit either.
- [ ] Multi-line steps and expected results preserve line breaks
      exactly as a tester would read them (use markdown soft-wrap or
      explicit `\n` inside the text — the Excel converter handles
      `wrap_text` rendering).
- [ ] **Japanese-only deliverable** — the customer is 日本農業新聞.
      All 説明 / 前提条件 / 手順 / 期待結果 / 補足 content MUST be
      Japanese. NO Vietnamese, NO English engineering jargon (`submit`,
      `disabled`, `reject`, `BE 側`, `cross-JA`, `Optimistic lock`,
      `lost update`, `case-insensitive`, `parameterized query`,
      `injection`, `breakpoints`, `Network offline`, `pre-update`,
      `business write`, `audit log`, `Stored XSS`, `happy path`).
      Use the canonical Japanese forms instead — see §Japanese
      wording rules below for the substitution table.
      EXCEPTIONS: HTTP literals (`HTTP 403`, `error_code: FORBIDDEN`),
      DB identifiers in backticks (`tanka_code`, `m_tanka`,
      `result_status`), tool names (`DevTools`, `Network` tab),
      key names (`Enter`, `Tab`).
- [ ] **Spec-source field names** — copy column / table identifiers
      verbatim from `screen-design.md` and `database-design.md`.
      `tekiyo_start_date`, NOT `applied_start_date`. `kingaku_zeikomi`,
      NOT `tax_included_amount`. Drift between testcase + schema is
      a dealbreaker for the customer review.
- [ ] **Politeness register: 体言止め for 期待結果 bodies**. Noun-form
      sentences (no です／ます endings). `表示される` → `表示`,
      `登録されます` → `登録`. Consistent with QA-doc convention.
- [ ] **Verbatim message strings** — every Japanese error message
      quoted in 期待結果 must match `api.md` エラー一覧 character-
      for-character (including 「。」 trailing period). Run
      `grep -F "<message>" api.md && grep -F "<message>" testcase.md`
      to verify. Common drift trap: `すでに登録` (screen-design form)
      vs `既に登録` (api.md form) — the api.md form wins.
- [ ] **No 末尾追補 / "appended late" categories** — every TC must
      live in its semantically-correct category from the FIRST draft.
      An edit-mode read-only TC goes under 編集画面 (or 業務ロジック更新),
      a session-expiry TC goes under 共通エラー — never under a
      catch-all "Bổ sung cuối tài liệu" / "末尾追補" row with a 備考
      apologizing for placement. Customer reads that confession as
      "the team ran out of time". Plan categories upfront in Phase 2
      and keep TCs in place.
- [ ] **VI mirror parity** — after JP file is final, produce
      `docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md` with the
      same TC count, same TC IDs, same category count, same
      `ステップN：`/`補足：` block count, same verbatim JP-message
      count. Run the converter on BOTH files; both Excel deliverables
      must report `Sections: N  Testcases: M` matching each other.
- [ ] **Every TC has a `観点ID` line** referencing an entry in
      `docs/design/common/testcase-viewpoints.md`. The ID must exist
      verbatim (e.g. `VP-A-01`, NOT `vp-a-1` or `VP_A_01`). If a TC
      doesn't fit any viewpoint, that means the strategy doc has a gap
      — escalate to test lead before writing custom categories.
- [ ] **Coverage check across viewpoints**: at least one TC mapped to
      each viewpoint that the strategy doc lists for this screen's
      category (e.g. a master CRUD screen MUST have TCs covering
      VP-A-01, VP-A-02, VP-B-01, VP-C-01, VP-C-03 at minimum).

## Japanese wording rules — banned terms + replacements

The deliverable goes to a Japanese QA team that does NOT have a
software-engineering background. English/Latin terms commonly seen in
internal engineering notes are unacceptable. Apply these substitutions
EVERY time the term appears in 説明 / 前提条件 / 手順 / 期待結果 / 補足
content (NOT inside backticked code identifiers, SQL, HTTP literals).

| ❌ Banned (English/Latin) | ✅ Japanese form |
|---|---|
| submit (verb) | 送信 |
| disabled (UI state) | 無効 |
| disable (verb) | 無効化 |
| reject / rejected | 拒否 |
| BE 側 / backend | バックエンド側 / サーバー側 |
| FE 側 / frontend | フロントエンド側 |
| cross-JA / cross-tenant | 他JA |
| Network offline / offline mode | ネットワーク切断 |
| breakpoints (CSS) | ブレークポイント |
| primary (button) | 主ボタン |
| secondary (button) | 副ボタン |
| Optimistic lock / optimistic | 楽観ロック |
| lost update | 更新ロスト |
| case-insensitive | 大文字小文字を区別しない |
| parameterized query | パラメータ化クエリ |
| injection | インジェクション |
| pre-update / before update | 更新前 |
| Stored XSS | 蓄積型XSS |
| audit log | 監査ログ |
| business write | 業務書き込み |
| rollback (verb) | ロールバック (katakana acceptable) |
| happy path | 正常系 |
| double-click | ダブルクリック (katakana standard) |
| placeholder | プレースホルダー |
| validation | バリデーション (katakana acceptable) |
| blank (UI context) | 空欄 |
| whitespace | 空白文字 |
| trim (verb) | 前後空白除去 |
| row (DB) | 行 |
| field (form / API) | 項目 |
| request body / response body | リクエストボディ / レスポンスボディ |
| reload (UI) | 再読み込み |
| design 仕様 | 設計仕様 |
| boundary (TC title) | 境界値 |
| read-only (UI / DTO) | 読み取り専用 |
| Test Data | テストデータ |
| record (DB context, when not in backticks) | レコード (katakana acceptable) |
| @Transform / @ValidateIf / @Matches / class-validator decorators | DON'T quote — explain behavior in Japanese |

Standard CS terms in katakana that read natural in Japanese — KEEP
as-is: ボタン, ダブルクリック, クリック, ラジオボタン, テキストボックス,
ドロップダウン, トースト, セッション, ログイン, ロード, インジェクション,
ブラウザ, タブ, プレースホルダー, レイアウト, フォーマット, カラム,
インデックス.

## Validation summary (printed at end)

```
✓ JP source: docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md
✓ VI mirror: docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md
✓ Total testcases: N (JP) / N (VI) — must match
✓ Categories: アクセス権限(5) / 画面表示(X) / Header(H) / 入力チェック(Y) / 業務ロジック登録(Z₁) / 業務ロジック更新(Z₂) / 共通エラーハンドリング(7+)
✓ NO 末尾追補 / "Bổ sung cuối tài liệu" category — all TCs in semantically-correct categories
✓ Role coverage: 5/5 (NICHINO_ADMIN, NICHINO_STAFF, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN)
✓ エラー一覧 coverage: M/M rows in api.md mapped to at least one TC (with verbatim error_code + message asserted)
✓ 観点ID coverage: V/V viewpoints applicable to this screen mapped to ≥1 TC
✓ Banned-term scan (JP): 0 occurrences of {submit, disabled, BE 側, cross-JA, Optimistic, blank, whitespace, trim, request body, design 仕様, boundary, read-only, Test Data, …}
✓ Spec-field consistency: 0 hand-translated DB column names — all match screen-design.md / database-design.md verbatim
✓ Verbatim message scan: every quoted Japanese error message found via grep -F in api.md エラー一覧
✓ VI parity scan: same TC count, same category count, same `ステップN：`/`補足：` block count, same JP-message verbatim count as JP source

→ REVIEW both .md files (especially JP message literals, role expectations,
   the TC numbering, and run a banned-term grep). The Excel converter uses
   the file as-is — what you ship is what you get.

→ When ready, convert BOTH to deliverable Excel:
   python3 scripts/testcase_md_to_excel.py docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md
   python3 scripts/testcase_md_to_excel.py docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md
   Both Excel files will be emitted next to their .md with the VTI naming pattern.
   Both must report `Sections: N  Testcases: M` matching each other.
```

If the validation summary count doesn't match what you intended (e.g.
the エラー一覧 coverage report shows missing rows), STOP and add the
missing TCs before declaring done.

## Common pitfalls

- **Reusing TC numbers from a re-run**: the skill is idempotent — re-running it overwrites the `.md`. If you've already filled result columns in a generated `.xlsx`, regenerate the md, regenerate the xlsx, and copy result columns over. Treat the `.md` as canonical, the `.xlsx` as derived.
- **Hardcoding role-specific test data inline**: don't write `テストアカウント: admin01@test.jp` — write `・NICHINO_ADMIN でログイン済み（MFA認証済み）`. Test-account emails are environment-specific and rot fast.
- **Using `should X when Y` in the testcase description**: that convention is for unit-test names (Vitest/Jest specs). Testcase docs use natural Japanese descriptions matching the customer's voice (e.g. `画面アクセス禁止`, `必須エラー — 単価コード未入力`).
- **Mixing TC IDs across screens**: `ACSMS-TC-005-001` belongs to SCR-005 only. Don't reuse a number you saw in SCR-003 — every screen has its own sequence.
- **Inventing error messages**: if a scenario has no defined message in `api.md` / `screen-design.md` (e.g. optimistic-lock conflict toast), DO NOT fabricate one. Assert only HTTP code + `error_code` and add a 備考 note marking the message as TBD pending spec confirmation.
- **Hand-translating DB column names**: `tekiyo_start_date` is the actual schema column, NOT `applied_start_date` / `start_date` / `effective_from`. Copy verbatim from screen-design.md mapping table or database-design.md.
- **Drifting between api.md and screen-design.md message strings**: when both sources quote a Japanese error message and they disagree (e.g. `既に登録` vs `すでに登録`), the api.md form wins for testcase 期待結果 — that's the API contract and what the tester actually receives over the wire.
- **Treating 異常系 as a single category**: split into 業務ロジック negative paths (DUPLICATE_CODE, CONFLICT etc.) under the relevant function category, AND a separate 共通エラーハンドリング category for cross-cutting infrastructure errors (UNAUTHORIZED, BAD_REQUEST, TOO_MANY_REQUESTS, INTERNAL_SERVER_ERROR, ネットワーク切断). 6 categories minimum, 7 when there's edit mode.

## In scope (per skill run)

- ✅ Generate JP testcase markdown at `docs/design/$ARGUMENTS/$ARGUMENTS-testcase.md`
- ✅ Generate VI mirror markdown at `docs/design-vi/$ARGUMENTS/$ARGUMENTS-testcase-vi.md`
- ✅ Run converter on both → 2 Excel files
- ✅ Validate count parity between JP and VI (same TCs, same categories, same `ステップN：` count)

## Out of scope

- Does NOT generate executable tests (Vitest specs, Playwright e2e). Use `/gen-ut-frontend` and `/gen-ut-backend` for those — testcase docs are *design* artifacts, not runnable code.
- Does NOT generate a test report sheet (the テスト報告書 sheet in the deliverable is computed by Excel formulas inside the converter).
- Does NOT update `docs/design/common-api.md` or any other registry.
- Does NOT update `docs/design/common/testcase-viewpoints.md` — if a TC needs a viewpoint that doesn't exist (e.g. screen introduces a new risk axis), STOP and escalate to test lead. Don't invent VPs.
- Does NOT install npm packages or run tests.
