---
name: gen-ut-backend
description: Generate failing NestJS unit + integration tests (TDD red phase) for a screen BEFORE backend implementation. Reads api.md and emits Vitest spec files for service / controller / DTO / integration + test fixtures targeting 98% effective coverage. Use after /gen-api-doc, before /gen-code.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Backend Unit Tests (TDD Red Phase)

## Description

Emit a **failing** Vitest test suite for the backend side of a screen. Tests are written FIRST, implementation follows. The skill reads the already-generated `api.md` and derives assertions 1-to-1 from each clause of the spec.

Pipeline position:

```
/gen-api-doc       ACSMS-SCR-XXX  →  api.md (spec)
/gen-ut-backend    ACSMS-SCR-XXX  →  backend *.spec.ts (failing — RED)
/gen-ut-frontend   ACSMS-SCR-XXX  →  frontend *.spec.ts (failing — RED)
/gen-code          ACSMS-SCR-XXX  →  source files (passing — GREEN)
```

The frontend equivalent is `/gen-ut-frontend`; run it separately (order doesn't matter — the two skills produce independent files).

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Abort conditions:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → abort with message: `Run /gen-api-doc $ARGUMENTS first`.

## Process

### Phase 1 — Read

Parallel reads:

**Screen spec:**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md`

**Reference data:**
- `docs/database/database-design.md` (entity columns + types)
- `docs/database/seeder.md` (role codes + permission codes)

**Rules:**
- `.claude/rules/testing.md`
- `.claude/rules/nestjs.md`
- `.claude/rules/security.md`

**Existing code to mirror or mock:**
- `apps/backend/src/common/guards/session-auth.guard.ts`
- `apps/backend/src/common/guards/permissions.guard.ts`
- `apps/backend/src/common/filters/global-exception.filter.ts`
- `apps/backend/src/common/constants/error-codes.constant.ts`
- `apps/backend/src/modules/auth/session.service.ts` (shape of `SessionPayload`)

**Templates:**
- `.claude/skills/gen-ut-backend/templates/*.tpl` (5 files)

### Phase 2 — Analyze

From **api.md** extract testable units:

| api.md clause | → generates |
|---|---|
| `# API ACSMS-API-XXX-NNN` | 1 `describe` in controller spec + 1 in service spec |
| `リクエストパラメータ` table | 1 DTO validation test per field (required, min, max, format) |
| `レスポンスデータ` table | shape assertion on happy-path response |
| `エラー一覧` table row | 1 `it()` per error code (incl. common: `UNAUTHORIZED`, `FORBIDDEN`, `DATA_SCOPE_VIOLATION`, `VALIDATION_ERROR`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`) |
| `4.x 処理手順` SQL block | 1 mock-call assertion (repo.findOne called with `{ where: { deleted_at: IsNull(), ja_id } }`, etc.) |
| `操作ログ記録` step | `AuditLogService.logOperation` called with correct `log_type`, `operation` (bare `'CREATE'` / `'UPDATE'` / `'DELETE'` — no entity/screen prefix), `result_status`; for CREATE/UPDATE/DELETE also assert the call is wrapped in `dataSource.transaction(...)` — business write + audit log must share one tx |
| Transaction rollback (CREATE/UPDATE/DELETE) | One `it('should rollback and NOT persist when audit log fails')` per mutating endpoint: force `AuditLogService.logOperation` to throw → assert main repo `save` / `update` effect was rolled back (mock manager never commits) |
| Error log outside transaction | `it('should still emit error audit log (log_type=3) when transaction rolls back')` — mock DML to throw, assert `AuditLogService.logOperation` called again OUTSIDE the tx with `log_type: 3, result_status: 2` |
| Protected endpoint (default per api.md §4.2) | extra `UNAUTHORIZED` + `FORBIDDEN` + `DATA_SCOPE_VIOLATION` cases |

### Phase 3 — Generate

**Granularity:** 1 spec file per source file. Group related cases inside nested `describe` blocks.

**Every generated spec file MUST:**
1. Start with `// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)`
2. Include screen header: `// Screen: <ID> — <Name>`
3. Use `.spec.ts` extension (never `.test.ts`)
4. Name each `it()` as `should <expected behavior> when <condition>` (regex `/^should .+ when .+$/`)

**File layout produced** (example for `ACSMS-SCR-003` 単価マスタ with 5 endpoints):

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
    ├── fixtures/
    │   └── tanka.factory.ts
    └── integration/
        └── tanka.integration.spec.ts
```

## Critical rules (enforce BEFORE writing)

- [ ] Every endpoint in `api.md` has both controller + service `describe` blocks
- [ ] Every row in `エラー一覧` has ≥1 test case
- [ ] Every `4.x` SQL step has ≥1 mock-call assertion
- [ ] Every field in `リクエストパラメータ` has a DTO validation test
- [ ] Every field in `レスポンスデータ` appears in at least one happy-path assertion
- [ ] All `it()` names match regex `/^should .+ when .+$/`
- [ ] All file paths end with `.spec.ts`
- [ ] Protected endpoints produce `UNAUTHORIZED` + `FORBIDDEN` + `DATA_SCOPE_VIOLATION` cases
- [ ] CREATE/UPDATE/DELETE endpoints produce `AuditLogService.logOperation` call assertion
- [ ] Assertion checks `operation` is bare `'CREATE'` / `'UPDATE'` / `'DELETE'` (fail if test expects prefixed value like `'JA_CREATE'`)
- [ ] Each mutating endpoint has a rollback test: main DML + audit log wrapped in `dataSource.transaction(...)`; if audit log rejects, main write must be rolled back
- [ ] Each mutating endpoint has an error-log test: on transaction failure, `log_type=3` audit log is still emitted OUTSIDE the rolled-back transaction
- [ ] Every spec file starts with the `@ts-nocheck` TDD banner

## Validation summary (print at end)

```
✓ Files created: N
✓ Tests generated: M
✓ Endpoints covered: X/X
✓ Error codes covered: Y/Y
✓ SQL steps covered: Z/Z
✓ DTO fields covered: F/F
⚠ Estimated branches: ≥98% (verify with `cd apps/backend && npm run test:coverage`)
```

## Placeholder reference

| Placeholder | Meaning | Example |
|---|---|---|
| `__SCREEN_ID__` | Screen code | `ACSMS-SCR-003` |
| `__SCREEN__` | Screen name (Japanese) | `単価マスタ登録画面` |
| `__MODULE__` | Backend module folder | `tanka` |
| `__ENTITY__` | TypeORM entity class | `Tanka` |
| `__SERVICE__` | NestJS service class | `TankaService` |
| `__CONTROLLER__` | NestJS controller class | `TankaController` |
| `__DTO__` | DTO class | `CreateTankaDto` |
| `__DTO_FILE__` | DTO file basename | `create-tanka.dto` |

## Template → target mapping

| Template | Target | Purpose |
|---|---|---|
| `service.spec.ts.tpl` | `apps/backend/src/modules/{module}/{module}.service.spec.ts` | Mock repo via `getRepositoryToken`, cover business logic |
| `controller.spec.ts.tpl` | `apps/backend/src/modules/{module}/{module}.controller.spec.ts` | supertest + `overrideGuard(SessionAuthGuard)` |
| `dto.spec.ts.tpl` | `apps/backend/src/modules/{module}/dto/{dto}.dto.spec.ts` | class-validator `validate()` per field |
| `integration.spec.ts.tpl` | `apps/backend/test/integration/{module}.integration.spec.ts` | pg-mem + ioredis-mock + real guards/filters |
| `factory.ts.tpl` | `apps/backend/test/fixtures/{module}.factory.ts` | Test data builder |

## Contracts with sibling skills

- **`/gen-ut-backend` is the source of truth for backend expected behaviour.** Generated specs must not be overwritten by other skills.
- **`/gen-code` must NOT edit any `*.spec.ts` file.** It only writes source files until tests pass; its last step is removing the `@ts-nocheck` banner.
- **If `api.md` changes after `/gen-ut-backend` ran:** delete the affected spec files and rerun.
- **Independent of `/gen-ut-frontend`** — the two skills produce disjoint file sets. Order doesn't matter.

## Common pitfalls

- **pg-mem limitations**: no triggers, limited JSONB, no tsvector. If a screen's SQL uses these, emit `it.skip('requires real postgres — run in nightly CI')` and do NOT count that step against coverage.
- **Throttler / rate-limit**: only testable at integration layer. Emit `it.todo('covered in integration')` for `TOO_MANY_REQUESTS` at unit layer.
- **Session cookie auth**: unit controller specs use `.overrideGuard(SessionAuthGuard).useValue(...)`. Integration specs inject `ioredis-mock`, seed a session, and hit the real guard.
- **Japanese message assertions**: use literal strings from api.md (e.g. `'正常に削除しました'`).

## Out of scope

- Does NOT generate any frontend test (use `/gen-ut-frontend` separately).
- Does NOT install npm packages (pg-mem, ioredis-mock, supertest, @types/supertest are already in `apps/backend/package.json`).
- Does NOT modify `vitest.config.ts` or CI config.
- Does NOT generate E2E tests.
