---
name: gen-autotest
description: Generate black-box automation tests (TDD red phase) for a screen — UI browser tests (Playwright + Page Object Model) and API HTTP tests (Playwright request context). All tests live in apps/autotest-agri/ and run against the live application from the playwright container. Reads api.md + screen-design.md + database schema. Run after /gen-api-doc, before /gen-code.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX [--type=all|ui|api]"
---

# Generate Automation Tests (TDD Red Phase)

## Description

Single skill that emits a **failing** black-box test suite for one screen:

| Type | Framework | How it works | Output |
|---|---|---|---|
| UI (browser) | Playwright browser | Controls live Chromium against `https://nginx` | `apps/autotest-agri/e2e/` |
| API (HTTP) | Playwright request context | HTTP requests to `https://nginx/api/v1` | `apps/autotest-agri/api/` |

Tests are written FIRST (TDD red), implementation follows. **No source imports** — pure black-box.

### Pipeline position

```
/gen-api-doc   ACSMS-SCR-XXX  →  docs/design/$ARG/$ARG-api.md
       ↓
/gen-autotest  ACSMS-SCR-XXX  →  failing specs in apps/autotest-agri/ (RED)
       ↓
/gen-code      ACSMS-SCR-XXX  →  implementation (GREEN)
```

---

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Optional:** `--type=<all|ui|api>` (default `all`)
- `ui` → Playwright browser tests + Page Object Model
- `api` → Playwright API tests (request context, no browser)
- `all` → both ui + api

**Abort conditions:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → abort with `Run /gen-api-doc $ARGUMENTS first`
- `--type=ui` or `--type=all` requested but `docs/design/$ARGUMENTS/screen-design.md` missing → abort
- `$ARGUMENTS` not in `docs/design/screen-list.md` → abort

---

## Process

### Phase 1 — Read (parallel)

**Spec:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md`
- `docs/design/$ARGUMENTS/screen-design.md` (only if `--type` includes `ui`)

**Reference:**
- `docs/database/database-design.md`
- `docs/database/seeder.md`

**Rules (mandatory):**
- `.claude/rules/security.md`

**Templates (this skill):**
- `.claude/skills/gen-autotest/templates/*.tpl`

**Existing utilities (read to understand helpers available):**
- `apps/autotest-agri/src/utils/auth-helpers.ts` (if it exists)
- `apps/autotest-agri/src/utils/api-helpers.ts` (if it exists)
- `apps/autotest-agri/src/page-objects/base.page.ts` (if it exists)

### Phase 2 — Analyze

**From `api.md`, extract API test cases:**

| api.md clause | → generated API test cases |
|---|---|
| `# API ACSMS-API-XXX-NNN` | 1 `describe` per endpoint |
| `リクエストパラメータ` table | 1 `it()` per required field missing + 1 per format violation |
| `レスポンスデータ` table | Shape assertion on success path (key presence + types) |
| Each row in `エラー一覧` | 1 `it()` per error code |
| Protected endpoint | 401 UNAUTHORIZED (no cookie) + 403 FORBIDDEN (wrong permission) + 403 DATA_SCOPE_VIOLATION (wrong JA) |
| DataScope filtering | Role-filtered list: NICHINO_ADMIN sees all, CHUOKAI/JA_HONTEN sees own JA, JA_KANRI_SHITEN sees own branch |
| Mutations (POST/PATCH/DELETE) | Success response shape + correct HTTP status |

**From `screen-design.md`, extract UI test cases:**
- Form fields → field rendering, labels, validation messages
- Required fields → submit empty → inline error appears
- Buttons → disabled during loading, enabled on valid data
- Success flow → form submit → success toast → redirect
- Error flow → server 5xx → error toast displayed
- Permission-gated routes → wrong role → redirect to /403 or /login
- Accessibility → interactive elements have labels

### Phase 3 — Generate

For each output file, **load the matching template** from `.claude/skills/gen-autotest/templates/` and substitute placeholders. Templates live next to this SKILL.md — never inline test code in this file.

**Every generated spec MUST:**
1. Start with `// @ts-nocheck — TDD red phase (/gen-autotest)`
2. Include screen header: `// Screen: <ID> — <Name>`
3. Use `.spec.ts` extension (never `.test.ts`)
4. Name each `it()` / `test()` as `should <expected behavior> when <condition>`

---

## Templates

All test code lives in `.claude/skills/gen-autotest/templates/` — substitute `{{PLACEHOLDERS}}` at generation time.

| Template | Purpose | Output path |
|---|---|---|
| `api.spec.tpl` | Playwright API tests (request context) | `apps/autotest-agri/api/{{category}}/{{screen-id}}-{{domain}}.api.spec.ts` |
| `e2e.spec.tpl` | Playwright browser E2E spec | `apps/autotest-agri/e2e/{{category}}/{{screen-id}}-{{slug}}.spec.ts` |
| `page-object.tpl` | Playwright Page Object Model per screen | `apps/autotest-agri/src/page-objects/{{screen-slug}}.page.ts` |
| `base-page.tpl` | Playwright base page (one-time, shared) | `apps/autotest-agri/src/page-objects/base.page.ts` |
| `fixtures.tpl` | Static JSON test data | `apps/autotest-agri/fixtures/{{screen-id}}.fixtures.json` |

### Placeholder convention

```
{{SCREEN_ID}}        ACSMS-SCR-003
{{SCREEN_NAME}}      単価マスタ登録画面
{{domain}}           tanka                         (lowercase, hyphenated for paths)
{{Entity}}           Tanka                         (PascalCase singular)
{{PageClass}}        TankaSearchPage | TankaCreatePage
{{category}}         auth | masters | subscribers | reports | permissions
{{screen-slug}}      tanka-search | tanka-create
{{path}}             /masters/tanka                (frontend route path)
{{api_path}}         /tanka                        (API path under /api/v1/)
{{permission}}       tanka.create
{{field_name}}       tanka_code | ja_id            (form field name attribute)
{{FieldPascal}}      TankaCode | JaId              (PascalCase for method names)
```

When generating, fill placeholders from api.md (`URI`, `メソッド`, request/response tables) and `screen-list.md` (screen name).

---

## File layout produced

For `ACSMS-SCR-003` 単価マスタ with `--type=all`:

```
apps/autotest-agri/
├── src/page-objects/
│   ├── base.page.ts                              ← base-page.tpl (only if missing)
│   ├── tanka-search.page.ts                      ← page-object.tpl
│   └── tanka-create.page.ts                      ← page-object.tpl
├── e2e/masters/
│   ├── ACSMS-SCR-003-tanka-search.spec.ts        ← e2e.spec.tpl
│   └── ACSMS-SCR-003-tanka-create.spec.ts        ← e2e.spec.tpl
├── api/masters/
│   └── ACSMS-SCR-003-tanka.api.spec.ts           ← api.spec.tpl
└── fixtures/
    └── ACSMS-SCR-003.fixtures.json               ← fixtures.tpl
```

---

## Quality checklist (every generated file)

- [ ] `// @ts-nocheck — TDD red phase` banner present
- [ ] Screen ID + name comment present
- [ ] `.spec.ts` extension (never `.test.ts`)
- [ ] `it()` / `test()` names follow `should <behavior> when <condition>`
- [ ] Page Objects encapsulate all selectors — no inline selectors in spec files
- [ ] Success path + every `エラー一覧` row covered (API tests)
- [ ] DataScope filter tested per role (NICHINO_ADMIN, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN)
- [ ] Auth: 401 UNAUTHORIZED + 403 FORBIDDEN tested per protected endpoint
- [ ] No passwords / session IDs / OTPs hardcoded in assertions
- [ ] Tests are deterministic (no timing races — use `waitFor`, not `sleep`)

---

## Success criteria

✅ All generated `.spec.ts` files have `@ts-nocheck` banner
✅ Test names match `^should .+ when .+$`
✅ Every `エラー一覧` row mapped to ≥ 1 API test
✅ DataScope filtering tested per role
✅ Auth guard tested: 401 (no cookie) + 403 (wrong permission) per endpoint
✅ UI specs cover happy path + validation errors + permission denial
✅ Playwright page objects encapsulate selectors (no inline selectors in spec files)
✅ Tests run inside playwright container without host-side dependencies
