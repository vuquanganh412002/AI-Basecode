# AutoTest Agri — Usage Guide

> How to use the `AutoTest Agri` agent and `/gen-autotest` skill to generate the TDD red-phase test suite for the agrinews project.

---

## What is AutoTest Agri?

AutoTest Agri is a Claude subagent that owns all automation testing for the agrinews Cloud Subscriber Management System. It reads design docs and database schema to generate **failing specs (TDD red)** across three layers:

| Layer | Framework | Output |
|---|---|---|
| Backend unit | Vitest + `@nestjs/testing` | service / controller / DTO specs |
| Backend integration | Vitest + supertest + test DB | controller → DB tests |
| Frontend component | Vitest + Vue Test Utils | component / composable / store / view specs |
| E2E | Playwright | user-flow scenarios + page objects |

---

## How the Agent Behaves (Execution Workflow)

Every time the agent receives a request it **must** follow this four-stage workflow:

```
1. PLAN (Haiku)     → Produce a numbered pipeline of steps + proposed solution
       ↓
2. PRESENT          → Before each step: state objective, approach, files affected
                      and present options (A / B / C or approve / skip / modify)
       ↓
3. WAIT             → Do NOT execute until user approves a choice
       ↓
4. EXECUTE (Sonnet) → Claude Sonnet carries out the approved step
                      (code writing, file generation, tool calls)
       ↓
   REPORT → brief result summary → move to next step
```

The agent **never** batches multiple execution steps without a separate approval for each.

---

## TDD Pipeline Position

```
/gen-api-doc   ACSMS-SCR-XXX  →  docs/design/$ID/$ID-api.md   (spec)
       ↓
/gen-autotest  ACSMS-SCR-XXX  →  failing specs (RED)           ← this agent
       ↓
/gen-code      ACSMS-SCR-XXX  →  implementation (GREEN)        (planned)
```

`/gen-api-doc` must be run **before** invoking `/gen-autotest`. If `api.md` is missing the skill aborts immediately.

---

## Command Reference

```bash
/gen-autotest ACSMS-SCR-XXX [--type=all|unit|component|e2e]
```

| Flag | What it generates |
|---|---|
| `--type=all` *(default)* | Backend unit + integration + Frontend + E2E |
| `--type=unit` | Backend service / controller / DTO / integration specs only |
| `--type=component` | Frontend component / composable / store / view specs only |
| `--type=e2e` | Playwright specs + page objects only |

### Examples

```bash
# Full test suite for screen 003
/gen-autotest ACSMS-SCR-003

# Backend tests only
/gen-autotest ACSMS-SCR-003 --type=unit

# E2E tests only
/gen-autotest ACSMS-SCR-010 --type=e2e

# Frontend tests only
/gen-autotest ACSMS-SCR-010 --type=component
```

---

## Prerequisites

Before running `/gen-autotest`, ensure:

1. `docs/design/ACSMS-SCR-XXX/ACSMS-SCR-XXX-api.md` exists → run `/gen-api-doc` first.
2. `docs/design/ACSMS-SCR-XXX/screen-design.md` exists if using `--type=e2e` or `--type=component`.
3. Screen ID appears in `docs/design/screen-list.md`.

---

## Output File Layout

For `ACSMS-SCR-003` (単価マスタ) with `--type=all`:

```
apps/backend/
├── src/modules/tanka/
│   ├── tanka.service.spec.ts
│   ├── tanka.controller.spec.ts
│   └── dto/
│       ├── create-tanka.dto.spec.ts
│       ├── update-tanka.dto.spec.ts
│       └── search-tanka.dto.spec.ts
└── test/
    ├── fixtures/tanka.factory.ts
    └── integration/tanka.integration.spec.ts

apps/frontend/src/
├── components/__tests__/
│   ├── TankaList.spec.ts
│   └── TankaForm.spec.ts
├── composables/__tests__/
│   └── useTankaSearch.spec.ts
├── stores/__tests__/
│   └── tanka.store.spec.ts
└── views/__tests__/
    └── TankaSearchView.spec.ts

apps/autotest-agri/
├── src/page-objects/
│   ├── base.page.ts             ← created once, shared across all screens
│   ├── tanka-search.page.ts
│   └── tanka-create.page.ts
├── e2e/masters/
│   ├── ACSMS-SCR-003-tanka-create.spec.ts
│   └── ACSMS-SCR-003-tanka-update.spec.ts
└── fixtures/
    └── ACSMS-SCR-003.fixtures.json
```

---

## Running the Tests

```bash
cd apps/autotest-agri

# Install dependencies (first time only)
npm install

# Backend unit + frontend tests
npm run test:unit

# Integration tests (requires test DB)
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# Coverage report → reports/coverage/
npm run test:coverage
```

---

## Coverage Targets

| Layer | Target |
|---|---|
| Backend service / controller | ≥ 80% statements |
| Frontend component | ≥ 70% statements |
| Overall effective coverage | **≥ 98%** |

**Excluded from coverage** (per `.claude/rules/testing.md`):

- Backend: `src/main.ts`, `*.module.ts`, `entities/**`, `migrations/**`, `*.constant.ts`
- Frontend: `src/main.ts`, `App.vue`, `router/index.ts`, `api/generated/**`, `types/**`

---

## Quality Gates (checked on every generated file)

- [ ] `// @ts-nocheck — TDD red phase` banner present
- [ ] Screen ID + name comment at top
- [ ] `.spec.ts` extension (never `.test.ts`)
- [ ] `it()` names follow `should <behavior> when <condition>`
- [ ] All external deps mocked (Repository, AuditLogService, DataSource, API client)
- [ ] Success path + every `エラー一覧` row covered
- [ ] DataScope filter tested per role: NICHINO_ADMIN, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN
- [ ] Mutations: `dataSource.transaction(...)` + audit log + rollback + outside-tx error log (log_type=3)
- [ ] Guards: `SessionAuthGuard` + `PermissionsGuard` verified per endpoint
- [ ] No real HTTP / DB calls in unit specs
- [ ] No passwords / session IDs / OTPs in fixtures or assertions

---

## Key Test Cases Auto-Generated

The agent derives test cases directly from `api.md`. Here is what gets generated per source:

| Source in `api.md` | Generated tests |
|---|---|
| Each `# API ACSMS-API-XXX-NNN` | 1 service `describe` + 1 controller `describe` |
| `リクエストパラメータ` table | DTO field tests: required / min / max / format per field |
| `レスポンスデータ` table | Response shape assertion on success path |
| Each row in `エラー一覧` | 1 `it()` per error code |
| `4.x 処理手順` SQL | Mock-call assertions on repository method + params |
| `操作ログ記録` | `AuditLogService.logOperation` called inside transaction, correct `log_type` + bare verb (`CREATE` / `UPDATE` / `DELETE`) |
| Transaction rollback | `it('should rollback when audit log fails')` |
| Error log outside tx | `it('should still emit error log (log_type=3) when transaction rolls back')` |
| Any protected endpoint | Extra UNAUTHORIZED + FORBIDDEN + DATA_SCOPE_VIOLATION cases |

---

## Boundaries — What the Agent Does NOT Do

- Does **not** write implementation code — only failing tests.
- Does **not** modify `docs/` or `.claude/rules/` files.
- Does **not** touch source files outside `__tests__/` and `test/` subtrees.
- Does **not** execute a step without user approval (see Execution Workflow above).

---

## Abort Conditions

The skill stops immediately and prints a message if:

| Condition | Message |
|---|---|
| `api.md` missing | `Run /gen-api-doc ACSMS-SCR-XXX first` |
| `screen-design.md` missing with `--type=e2e` or `--type=component` | `screen-design.md required for this --type` |
| Screen ID not in `screen-list.md` | `Unknown screen ID` |

---

## Related Files

| Path | Purpose |
|---|---|
| `.claude/agents/autotest.agent.md` | Agent definition |
| `.claude/skills/gen-autotest/SKILL.md` | Skill internals: phases, mappings, quality gates |
| `.claude/skills/gen-autotest/templates/` | 13 `.tpl` template files |
| `apps/autotest-agri/` | Generated test base |
| `docs/design/screen-list.md` | Screen catalogue (31 screens) |
| `docs/database/database-design.md` | Entity schema + nullable columns |
| `docs/database/seeder.md` | Role + permission codes |
