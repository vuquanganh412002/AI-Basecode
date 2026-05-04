# AutoTest Agri — Usage Guide

> How to use the `AutoTest Agri` agent and `/gen-autotest` skill to generate black-box automation tests for the agrinews project.

---

## What is AutoTest Agri?

AutoTest Agri is a Claude subagent that owns all automation testing for the agrinews Cloud Subscriber Management System. It generates **black-box tests** that run against the **live running application** from inside the playwright container — completely independent from backend and frontend source code.

| Test type | How it works | Output directory |
|---|---|---|
| UI (browser) | Playwright controls a real Chromium browser against the live frontend | `apps/autotest-agri/e2e/` |
| API (HTTP) | Playwright request context sends HTTP requests to the live backend | `apps/autotest-agri/api/` |

**Key principle**: Tests NEVER import from `apps/frontend/src/` or `apps/backend/src/`. They interact with the live app exactly as a real user or API consumer would.

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
/gen-autotest ACSMS-SCR-XXX [--type=all|ui|api]
```

| Flag | What it generates |
|---|---|
| `--type=all` *(default)* | UI browser tests + API HTTP tests |
| `--type=ui` | Playwright browser tests + Page Object Model only |
| `--type=api` | Playwright API tests (request context, no browser) only |

### Examples

```bash
# Full test suite for screen 003
/gen-autotest ACSMS-SCR-003

# UI tests only
/gen-autotest ACSMS-SCR-003 --type=ui

# API tests only
/gen-autotest ACSMS-SCR-010 --type=api
```

---

## Prerequisites

Before running `/gen-autotest`, ensure:

1. `docs/design/ACSMS-SCR-XXX/ACSMS-SCR-XXX-api.md` exists → run `/gen-api-doc` first.
2. `docs/design/ACSMS-SCR-XXX/screen-design.md` exists if using `--type=ui` or `--type=all`.
3. Screen ID appears in `docs/design/screen-list.md`.
4. Docker stack is running (for `npm test` to work): `docker compose up -d && docker compose --profile test up -d`.

---

## Output File Layout

For `ACSMS-SCR-003` (単価マスタ) with `--type=all`:

```
apps/autotest-agri/
├── src/page-objects/
│   ├── base.page.ts                          ← created once, shared across all screens
│   ├── tanka-search.page.ts                  ← page-object.tpl
│   └── tanka-create.page.ts                  ← page-object.tpl
├── e2e/masters/
│   ├── ACSMS-SCR-003-tanka-search.spec.ts    ← e2e.spec.tpl
│   └── ACSMS-SCR-003-tanka-create.spec.ts    ← e2e.spec.tpl
├── api/masters/
│   └── ACSMS-SCR-003-tanka.api.spec.ts       ← api.spec.tpl
└── fixtures/
    └── ACSMS-SCR-003.fixtures.json           ← fixtures.tpl
```

---

## Running the Tests

### Bootstrap (first time)

```bash
cd apps/autotest-agri
npm run bootstrap
# Starts postgres-test + redis-test + playwright containers
# Runs DB migrations and seeds test data
```

### Run tests

```bash
cd apps/autotest-agri

# All tests (UI + API)
npm test

# UI browser tests only
npm run test:ui

# API HTTP tests only
npm run test:api

# UI tests with visible browser
npm run test:headed
```

### View results

```bash
npm run report:serve
# Then open: http://localhost:9323
```

All commands run inside the `agrinews-playwright-1` container via `docker exec` — no host-side Node.js required.

---

## Docker Environment

| Item | Value |
|---|---|
| Playwright container | `agrinews-playwright-1` — runs ALL tests |
| Report UI | `http://localhost:9323` |
| App UI | `https://nginx` (from within container network) |
| App API | `https://nginx/api/v1` (from within container network) |
| Test DB | `agrinews-postgres-test-1` — port 5433 on host |
| Test Redis | `agrinews-redis-test-1` — port 6380 on host |

---

## Test Accounts

| Role | login_id | Password |
|---|---|---|
| NICHINO_ADMIN | `nichino_admin` | `Test1234!` |
| CHUOKAI | `chuokai` | `Test1234!` |
| JA_HONTEN | `ja_honten` | `Test1234!` |
| JA_KANRI_SHITEN | `ja_kanri` | `Test1234!` |

---

## Quality Gates (checked on every generated file)

- [ ] `// @ts-nocheck — TDD red phase` banner present
- [ ] Screen ID + name comment at top
- [ ] `.spec.ts` extension (never `.test.ts`)
- [ ] `it()` names follow `should <behavior> when <condition>`
- [ ] Page Objects encapsulate all selectors (no inline selectors in spec files)
- [ ] Success path + every `エラー一覧` row covered (API tests)
- [ ] DataScope filter tested per role: NICHINO_ADMIN, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN
- [ ] Auth: 401 UNAUTHORIZED + 403 FORBIDDEN tested per protected endpoint
- [ ] No passwords / session IDs / OTPs hardcoded in assertions

---

## Key Test Cases Auto-Generated

### UI tests (from `screen-design.md`)

| Source | Generated tests |
|---|---|
| Form fields | Field rendering, validation messages, required/optional |
| Buttons / actions | Click flows, disabled states, loading states |
| Navigation | Redirect after login, back-navigation, route guards |
| Permission-gated UI | Hidden buttons, inaccessible routes per role |
| Error states | Toast messages, inline field errors, empty state |

### API tests (from `api.md`)

| Source in `api.md` | Generated tests |
|---|---|
| Each `# API ACSMS-API-XXX-NNN` | 1 `describe` per endpoint |
| `リクエストパラメータ` table | 1 test per field: required / min / max / format |
| `レスポンスデータ` table | Response shape assertion on success path |
| Each row in `エラー一覧` | 1 `it()` per error code |
| Any protected endpoint | 401 UNAUTHORIZED + 403 FORBIDDEN + DATA_SCOPE_VIOLATION |
| DataScope table | Role-filtered list results per NICHINO_ADMIN / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN |

---

## Boundaries — What the Agent Does NOT Do

- Does **not** write files into `apps/frontend/src/` or `apps/backend/src/`.
- Does **not** write implementation code — only failing tests.
- Does **not** modify `docs/` or `.claude/rules/` files.
- Does **not** execute a step without user approval (see Execution Workflow above).

---

## Abort Conditions

The skill stops immediately and prints a message if:

| Condition | Message |
|---|---|
| `api.md` missing | `Run /gen-api-doc ACSMS-SCR-XXX first` |
| `screen-design.md` missing with `--type=ui` or `--type=all` | `screen-design.md required for this --type` |
| Screen ID not in `screen-list.md` | `Unknown screen ID` |

---

## Related Files

| Path | Purpose |
|---|---|
| `.claude/agents/autotest.agent.md` | Agent definition |
| `.claude/skills/gen-autotest/SKILL.md` | Skill internals: phases, template mappings, quality gates |
| `.claude/skills/gen-autotest/templates/` | Template files |
| `apps/autotest-agri/` | All generated test code |
| `apps/autotest-agri/src/page-objects/` | Playwright Page Object Models |
| `apps/autotest-agri/src/utils/` | Shared helpers (auth, API, assertions) |
| `apps/autotest-agri/fixtures/` | Static JSON test data per screen |
| `docs/design/screen-list.md` | Screen catalogue (31 screens) |
| `docs/database/database-design.md` | Entity schema + nullable columns |
| `docs/database/seeder.md` | Role + permission codes |
