---
name: gen-autotest
description: Generate full automation test suite (TDD red phase) for a screen — backend unit/integration tests (Vitest + NestJS), frontend component/composable/store tests (Vitest + Vue Test Utils), and E2E tests (Playwright). Reads api.md + screen-design.md + database schema. Targets 98% effective coverage. Run after /gen-api-doc, before /gen-code.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX [--type=all|unit|component|e2e]"
---

# Generate Automation Tests (TDD Red Phase)

## Description

Single skill that emits a **failing** test suite for one screen across all layers:

| Layer | Framework | Output |
|---|---|---|
| Backend unit | Vitest + `@nestjs/testing` | service / controller / DTO specs |
| Backend integration | Vitest + supertest + test DB | end-to-end controller→DB tests |
| Frontend component | Vitest + Vue Test Utils | component / view / composable / store specs |
| E2E | Playwright | user-flow scenarios + page objects |

Tests are written FIRST (TDD red), implementation follows.

### Pipeline position

```
/gen-api-doc   ACSMS-SCR-XXX  →  docs/design/$ARG/$ARG-api.md
       ↓
/gen-autotest  ACSMS-SCR-XXX  →  failing specs across backend / frontend / e2e (RED)
       ↓
/gen-code      ACSMS-SCR-XXX  →  implementation (GREEN)
```

---

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Optional:** `--type=<all|unit|component|e2e>` (default `all`)
- `unit` → backend service / controller / DTO / integration specs only
- `component` → frontend component / composable / store / view specs only
- `e2e` → Playwright specs + page objects only
- `all` → everything

**Abort conditions:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → abort with `Run /gen-api-doc $ARGUMENTS first`
- `--type=e2e` requested but `docs/design/$ARGUMENTS/screen-design.md` missing → abort
- `$ARGUMENTS` not in `docs/design/screen-list.md` → abort

---

## Process

### Phase 1 — Read (parallel)

**Spec:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md`
- `docs/design/$ARGUMENTS/screen-design.md` (only if `--type` includes `e2e` or `component`)

**Reference:**
- `docs/database/database-design.md`
- `docs/database/seeder.md`

**Rules (mandatory):**
- `.claude/rules/testing.md`
- `.claude/rules/nestjs.md`
- `.claude/rules/vue.md`
- `.claude/rules/security.md`

**Existing patterns:**
- `apps/backend/src/common/guards/*.ts`
- `apps/backend/src/common/filters/global-exception.filter.ts`
- `apps/backend/src/modules/auth/session.service.ts` (SessionPayload shape)

**Templates (this skill):**
- `.claude/skills/gen-autotest/templates/*.tpl`

### Phase 2 — Analyze

From `api.md`, extract testable units:

| api.md clause | → generated test cases |
|---|---|
| `# API ACSMS-API-XXX-NNN` | 1 service `describe` + 1 controller `describe` |
| `リクエストパラメータ` table | 1 DTO spec per endpoint; field-level: required / min / max / format |
| `レスポンスデータ` table | shape assertion on success path |
| `エラー一覧` row | 1 `it()` per error code (common + screen-specific) |
| `4.x 処理手順` SQL | mock-call assertions on repository (`{ where: { deleted_at: IsNull(), ja_id } }`) |
| `操作ログ記録` | `AuditLogService.logOperation` invoked with bare `'CREATE' / 'UPDATE' / 'DELETE'`, correct `log_type`, `result_status`; for mutations assert call wrapped in `dataSource.transaction(...)` |
| Transaction rollback | `it('should rollback when audit log fails')` — force `logOperation` to throw, assert main DML rolled back |
| Error log outside tx | `it('should still emit error log (log_type=3) when transaction rolls back')` |
| Protected endpoint (default) | extra `UNAUTHORIZED` + `FORBIDDEN` + `DATA_SCOPE_VIOLATION` cases |

From `screen-design.md`, extract UI scenarios:
- Form fields → component-test prop / event / validation cases
- Buttons / actions → E2E click scenarios
- Empty / loading / error states → render-state cases
- Permission-gated UI → role-based access cases

### Phase 3 — Generate

For each output file, **load the matching template** from `.claude/skills/gen-autotest/templates/` and substitute placeholders. Templates live next to this SKILL.md — never inline test code in this file.

**Granularity:** 1 spec file per source file. Group related cases inside nested `describe` blocks.

**Every generated spec MUST:**
1. Start with `// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)`
2. Include screen header: `// Screen: <ID> — <Name>`
3. Use `.spec.ts` extension (never `.test.ts`)
4. Name each `it()` as `should <expected behavior> when <condition>` (regex `/^should .+ when .+$/`)

---

## Templates

All test code lives in `.claude/skills/gen-autotest/templates/` — substitute `{{PLACEHOLDERS}}` at generation time.

| Template | Purpose | Output path |
|---|---|---|
| `service.spec.tpl` | NestJS service unit test | `apps/backend/src/modules/{{domain}}/{{entity}}.service.spec.ts` |
| `controller.spec.tpl` | NestJS controller unit test | `apps/backend/src/modules/{{domain}}/{{entity}}.controller.spec.ts` |
| `dto.spec.tpl` | DTO class-validator test | `apps/backend/src/modules/{{domain}}/dto/{{action}}-{{entity}}.dto.spec.ts` |
| `integration.spec.tpl` | Controller → DB integration test | `apps/backend/test/integration/{{domain}}.integration.spec.ts` |
| `factory.tpl` | Faker-based test factory | `apps/backend/test/fixtures/{{domain}}.factory.ts` |
| `component.spec.tpl` | Vue component test (Vue Test Utils) | `apps/frontend/src/components/__tests__/{{Component}}.spec.ts` |
| `composable.spec.tpl` | Vue composable test | `apps/frontend/src/composables/__tests__/{{useName}}.spec.ts` |
| `store.spec.tpl` | Pinia store test | `apps/frontend/src/stores/__tests__/{{name}}.store.spec.ts` |
| `view.spec.tpl` | Vue view (page) test | `apps/frontend/src/views/__tests__/{{View}}.spec.ts` |
| `base-page.tpl` | Playwright base page object (one-time) | `apps/autotest-agri/src/page-objects/base.page.ts` |
| `page-object.tpl` | Playwright page object per screen | `apps/autotest-agri/src/page-objects/{{screen-slug}}.page.ts` |
| `e2e.spec.tpl` | Playwright E2E spec | `apps/autotest-agri/e2e/{{category}}/{{screen-id}}-{{slug}}.spec.ts` |
| `fixtures.tpl` | Static JSON test data | `apps/autotest-agri/fixtures/{{screen-id}}.fixtures.json` |

### Placeholder convention

```
{{SCREEN_ID}}        ACSMS-SCR-003
{{SCREEN_NAME}}      単価マスタ登録画面
{{domain}}           tanka                       (lowercase, snake)
{{entity}}           tanka                       (singular, lowercase)
{{Entity}}           Tanka                       (PascalCase singular)
{{Component}}        TankaList | TankaForm
{{useName}}          useTankaSearch
{{store}}            tanka
{{action}}           create | update | search
{{permission}}       tanka.create
{{role_code}}        NICHINO_ADMIN
{{ja_id}}            null | 2
{{category}}         auth | masters | subscribers | reports | permissions
{{screen-slug}}      tanka-create | tanka-search
```

When generating, fill placeholders from api.md (`URI`, `メソッド`, request/response tables) and `screen-list.md` (screen name).

---

## File layout produced

For `ACSMS-SCR-003` 単価マスタ with `--type=all`:

```
apps/backend/
├── src/modules/tanka/
│   ├── tanka.service.spec.ts          ← service.spec.tpl
│   ├── tanka.controller.spec.ts       ← controller.spec.tpl
│   └── dto/
│       ├── create-tanka.dto.spec.ts   ← dto.spec.tpl (action=create)
│       ├── update-tanka.dto.spec.ts   ← dto.spec.tpl (action=update)
│       └── search-tanka.dto.spec.ts   ← dto.spec.tpl (action=search)
└── test/
    ├── fixtures/tanka.factory.ts      ← factory.tpl
    └── integration/tanka.integration.spec.ts  ← integration.spec.tpl

apps/frontend/src/
├── components/__tests__/
│   ├── TankaList.spec.ts              ← component.spec.tpl
│   └── TankaForm.spec.ts              ← component.spec.tpl
├── composables/__tests__/
│   └── useTankaSearch.spec.ts         ← composable.spec.tpl
├── stores/__tests__/
│   └── tanka.store.spec.ts            ← store.spec.tpl
└── views/__tests__/
    └── TankaSearchView.spec.ts        ← view.spec.tpl

apps/autotest-agri/
├── src/page-objects/
│   ├── base.page.ts                   ← base-page.tpl (only if missing)
│   ├── tanka-search.page.ts           ← page-object.tpl
│   └── tanka-create.page.ts           ← page-object.tpl
├── e2e/masters/
│   ├── ACSMS-SCR-003-tanka-create.spec.ts  ← e2e.spec.tpl
│   └── ACSMS-SCR-003-tanka-update.spec.ts  ← e2e.spec.tpl
└── fixtures/
    └── ACSMS-SCR-003.fixtures.json    ← fixtures.tpl
```

---

## Coverage targets

| Layer | Target |
|---|---|
| Backend service / controller | 80%+ statements |
| Frontend component | 70%+ statements |
| Overall effective | **98%+** (excluding bootstrap, migrations, decorator-only files, generated Orval client) |

Excludes from coverage (matching `.claude/rules/testing.md`):
- Backend: `src/main.ts`, `src/**/*.module.ts`, `src/**/entities/**`, `src/database/migrations/**`, `src/**/*.constant.ts`
- Frontend: `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `src/api/generated/**`, `src/types/**`

---

## Quality checklist (every generated file)

- [ ] `// @ts-nocheck — TDD red phase` banner present
- [ ] Screen ID + name comment present
- [ ] `.spec.ts` extension (never `.test.ts`)
- [ ] `it()` names follow `should <behavior> when <condition>`
- [ ] All external dependencies mocked (Repository, AuditLogService, DataSource, API client)
- [ ] Success path + every `エラー一覧` row covered
- [ ] DataScope filter tested per role (NICHINO_ADMIN, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN)
- [ ] CREATE/UPDATE/DELETE: tx wrapping + audit log + rollback + outside-tx error log
- [ ] Guards (`SessionAuthGuard` + `PermissionsGuard`) verified
- [ ] No real HTTP / DB calls in unit specs (integration specs use test DB)
- [ ] No password / session-id / OTP in fixtures or assertions

---

## Success criteria

✅ All generated `.spec.ts` files compile (`@ts-nocheck` present)
✅ Test names match `^should .+ when .+$`
✅ Every `エラー一覧` row mapped to ≥1 test
✅ DataScope filtering tested per role
✅ Mutations: tx + audit log + rollback covered
✅ E2E specs cover happy path + validation errors + permission denial
✅ Playwright page objects encapsulate selectors (no inline selectors in spec files)
✅ Tests are deterministic (no flakiness from timing)
