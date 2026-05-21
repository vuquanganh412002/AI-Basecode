---
name: gen-ut-backend
description: Generate failing NestJS unit + integration tests (TDD red phase) for a screen BEFORE backend implementation. Reads api.md and emits Jest spec files for service / controller / DTO / integration + test fixtures targeting 98% effective coverage. Use after /gen-api-doc, before /gen-code.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Backend Unit Tests (TDD Red Phase)

## Description

Emit a **failing** Jest test suite for the backend side of a screen. Tests are written FIRST, implementation follows. The skill reads the already-generated `api.md` and derives assertions 1-to-1 from each clause of the spec.

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
- `apps/backend/src/modules/code/code.service.ts` (mock `has()` / `getLabel()` in service specs; seed real values via integration)

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
| Field with `※m_code.code_category='XXX'を参照` in api.md §2 | 1 `it('should reject when <field> is not a valid <XXX> code')` test: mock `CodeService.has()` to return `false`, assert `VALIDATION_ERROR` with that field in `errors[]`. Use real valid values (e.g. `tanka_type: 1`) from `seeder.md §5` in happy-path assertions — NEVER `TankaTypeEnum.KODOKU`. |

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
- [ ] Imports use `@/...` for src and `@test/...` for fixtures/utils — NEVER `'../../...'` traversal. Same-folder siblings keep `./...`. See `.claude/rules/nestjs.md §Path aliases`.
- [ ] Controller specs that call `.createNestApplication()` MUST mirror production's `app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] })` after `useGlobalFilters(...)` and before `app.init()`. Otherwise `/api/v1/...` routes return 404 because the prefix only lives in `main.ts`. Import: `import { API_PREFIX } from '@/common/constants/api.constants'`.
- [ ] New supertest URLs prefer the `apiUrl()` helper from `@test/utils/api-url` over hardcoded `/api/v1/...` literals — so a future version bump (`v1` → `v2`) doesn't ripple through every spec. Pattern: `await request(app).post(apiUrl('auth/login')).send(body)`. Existing literal URLs continue to work.
- [ ] List endpoint specs assert the standard pagination shape `{ data: [...], meta: { total, page, per_page, total_pages } }` — service implementation will use the `paginate()` helper. Spec doesn't import the helper but DOES assert the exact key set so the helper's contract is enforced.
- [ ] Error response specs assert `{ error_code, message, errors? }` shape — never `{ statusCode, error }`. The `GlobalExceptionFilter` normalizes everything; specs verify that contract.

## Validation summary (print at end)

```
✓ Files created: N
✓ Tests generated: M
✓ Endpoints covered: X/X
✓ Error codes covered: Y/Y
✓ SQL steps covered: Z/Z
✓ DTO fields covered: F/F
⚠ Estimated branches: ≥98% (verify with `cd apps/backend && npm run test:coverage`)

→ REVIEW the generated specs before running /gen-code-backend. Edit any assertion
  that looks wrong (happy-path shape, DataScope case, Japanese error message).
  Running /gen-code-backend back-to-back without review makes "test-first" trivial —
  both sides get derived from the same api.md so tests "pass" meaninglessly.
→ Then: /gen-code-backend __SCREEN_ID__
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
| `integration.spec.ts.tpl` | `apps/backend/test/integration/{module}.integration.spec.ts` | Uses `createIntegrationTestApp()` helper — full Nest + pg-mem + ioredis-mock + real guards/filters |
| `factory.ts.tpl` | `apps/backend/test/fixtures/{module}.factory.ts` | Test data builder |

**Integration helper dependency**: integration spec template imports `createIntegrationTestApp` + `buildSessionCookie` from `apps/backend/test/utils/create-integration-app.ts`. The helper is shipped by `/scaffold` (template `6h`). When adding NEW entity classes for this module, append them to `ALL_ENTITIES` in the helper — pg-mem's DataSource needs an explicit list because `dataSourceFactory` bypasses TypeORM's `autoLoadEntities`.

## Contracts with sibling skills

- **`/gen-ut-backend` is the source of truth for backend expected behaviour.** Generated specs must not be overwritten by other skills.
- **`/gen-code` must NOT edit any `*.spec.ts` file.** It only writes source files until tests pass; its last step is removing the `@ts-nocheck` banner.
- **If `api.md` changes after `/gen-ut-backend` ran:** delete the affected spec files and rerun.
- **Independent of `/gen-ut-frontend`** — the two skills produce disjoint file sets. Order doesn't matter.

## Common pitfalls

- **Service spec — plain `new` is simpler**. Plain `new __SERVICE__(repo, dataSource, auditLog, codeService)` is more direct than `Test.createTestingModule` for unit tests — service tests don't need Nest's lifecycle (guards, pipes, interceptors). Keep this pattern.
- **Controller spec — uses Test.createTestingModule + supertest**. ts-jest emits `design:paramtypes` decorator metadata natively, so Nest DI works out of the box. Mock guards via `.overrideGuard(SessionAuthGuard).useValue({...})`, mock service via `{ provide: __SERVICE__, useValue: serviceMock }`. Keep service mocks in **snake_case** (matching `__ENTITY__ResponseDto`) and include `message` field for create/update.
- **Service mock typing — use `any` (not strict types)**. Spec uses `let service: any` for service mocks instead of `Record<string, ReturnType<typeof jest.fn>>`. Strict typing causes `mockRejectedValue` arg to widen to `never` (Jest stricter than Vitest), blocking error-path tests.
- **Mock factory MUST be singleton**: `createQueryBuilder: vi.fn(() => qbMock)` where `qbMock` is declared at `beforeEach` scope, NOT `vi.fn(() => ({ ... }))` which returns a fresh instance per call (spec-side `qb.getRawOne.mockResolvedValue(...)` then has no effect on the service's qb instance).
- **`txManager.save` mock MUST handle 1-arg AND 2-arg styles**: TypeORM allows `save(entity)` and `save(EntityClass, value)`. Mock with `(entityOrValue, maybeValue?) => maybeValue ?? entityOrValue` and pass through entity-shape (camelCase), not DTO-shape (snake_case).
- **`txManager.create` MUST be present**: services using `manager.create(Entity, payload)` inside transaction will throw "create is not a function" otherwise.
- **`NotFoundException` — use @nestjs/common's class** (`new NotFoundException({ code, error_code, message })`) so `rejects.toThrow(NotFoundException)` instanceof checks pass. Our custom `common.exceptions.NotFoundException` is a sibling class, not a subclass.
- **`DomainException` body has both `code` and `error_code`** (since project-wide infra fix). Service can throw any DomainException subclass and `expect(rejects).toMatchObject({ response: { error_code: 'X' } })` works.
- **pg-mem limitations**: no triggers, limited JSONB, no tsvector. If a screen's SQL uses these, emit `it.skip('requires real postgres — run in nightly CI')` and do NOT count that step against coverage.
- **Throttler / rate-limit**: only testable at integration layer. Emit `it.todo('covered in integration')` for `TOO_MANY_REQUESTS` at unit layer.
- **Japanese message assertions**: use literal strings from api.md (e.g. `'正常に削除しました'`).
- **Time-bearing factory fields use `Date.now()` / `new Date()`, never a hardcoded literal.** A factory like `const NOW = new Date('2026-04-29T10:00:00Z'); expiredAt: new Date(NOW.getTime() + 30 * 60 * 1000)` becomes flaky-by-calendar: any test that doesn't override `expiredAt` and runs >30min after the literal date trips the service's own expiry check (`expiredAt < Date.now()`) before reaching the assertion the test actually wants. SCR-012 hit this: `password-reset.factory.ts` had hardcoded NOW and 2 tests in `password-reset.service.spec.ts` that didn't override `expiredAt` started failing 5 days after the literal. Use:
  ```ts
  export function buildResetTokenOtp(overrides: Partial<MfaOtp> = {}): MfaOtp {
    const now = new Date();   // ← always wall-clock, never a fixed literal
    return {
      otpId: 200, accountId: 1,
      expiredAt: new Date(now.getTime() + 30 * 60 * 1000),
      createdAt: now,
      ...overrides,
    } as unknown as MfaOtp;
  }
  ```
  Tests that DO want a fixed expiry (e.g. "should throw EXPIRED when…") still override via `buildResetTokenOtp({ expiredAt: new Date(Date.now() - 60_000) })` — the default just stops being a time-bomb.
- **API endpoints with "always 200" account-enumeration prevention** (forgot-password / public lookup endpoints): api.md typically shows "Always return 200 even when the email/code is unknown". Spec assertions: (1) success message is identical for the unknown-email and known-email paths, (2) when the email is unknown, NO downstream side-effect fires — assert `mailService.sendX` and `repo.save` were NOT called. The "no side-effect" check guards against a regression where the route returns 200 but still leaks state via DB insert / mail send. Pattern in `password-reset.service.spec.ts`.
- **SCR adds endpoints to an EXISTING module** (e.g. SCR-012's password reset endpoints attach to the existing `AuthController`/`AuthService` rather than spinning up a new module): **append the new specs as sibling top-level `describe(...)` blocks INSIDE the existing root spec file** — do NOT create a `__tests__/` subfolder. Project convention is "1 source file = 1 spec file", and the merged commit `0fe97ff` standardised every module to this layout. Pattern:
  1. Open the existing root spec (e.g. `auth.service.spec.ts`). Find the closing `});` of the current top-level `describe(...)`.
  2. Rename the existing top-level describe label for symmetry: `'AuthService'` → `'AuthService — SCR-001 (login + MFA + refresh + logout)'`.
  3. Append your new SCR's content as a SIBLING top-level `describe(...)` block (NOT nested) with a label like `'AuthService — password reset (SCR-012)'`. Insert a banner `// ══════════════════════════════════════════════════════════════════════` between the two top-level describes for readability.
  4. Merge imports at file top: dedup common imports, add SCR-specific factory imports. Alphabetize by source path. Use `@/` and `@test/` aliases only — never relative `../`. If two factories export the same identifier, rename one via `import { buildX as buildXForm } from '@test/fixtures/x-form.factory'` (see account.service.spec.ts for canonical example).
  5. Update the file header comment to mention BOTH SCRs (1-2 lines).
  6. Each sibling describe keeps its OWN `beforeEach` with fresh mock setup — never try to share/dedupe mock state across sibling blocks (mock pollution is the #1 cause of "merge regressed tests" bugs).
  7. If a Jest module mock (`jest.mock('bcryptjs', ...)`) is needed, declare it ONCE at file top (Jest hoists module mocks file-wide); inside each `beforeEach`, call `mockReset()` to clear call history between describes.
  Constructor signature: the existing service may need a NEW dep (e.g. `@Optional() @InjectDataSource() dataSource?: DataSource`) — `/gen-code-backend` documents the `@Optional()` rule on its side; the spec just passes the dataSource as the new positional arg in `new Service(...args, dataSource)`. Past commits showing the canonical merged layout: `db84f1d` (hanbaiten — SCR-018 + SCR-017), `0fe97ff` (6 modules merged from `__tests__/` back to root). **Watch out for full-width Japanese parens `（）`**: the Edit tool sometimes normalises them to half-width `()` when copy-pasting through string literals. Grep `（` / `）` after every merge to verify preservation.

### List endpoint pitfalls (SCR-004 lessons — apply to every list service spec)

- **`qbMock` MUST include the QueryBuilder list-path methods** (`orderBy`, `take`, `skip`, `getManyAndCount`) in its initial declaration — even if the suite was originally generated for a non-list endpoint. List services chain `repo.createQueryBuilder('x').where(...).andWhere(...).orderBy(...).take(...).skip(...).getManyAndCount()`; specs that only declared `getOne`/`getRawOne` crash with `TypeError: qb.orderBy is not a function`.
  ```ts
  qbMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getRawOne: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  ```
- **DataScope assertion uses regex on the SQL string**, not literal-equal:
  ```ts
  // applyJaScope() emits 'mj.jaId = :scopeJaId' (TypeORM camelCase)
  // — match either snake or camel via single regex:
  const scopedCall = qbMock.andWhere.mock.calls.find(
    ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
  );
  expect(scopedCall).toBeDefined();
  ```
- **For NICHINO_ADMIN bypass**, assert NO scope predicate is bound:
  ```ts
  const calls = qbMock.andWhere.mock.calls;
  const scopedCall = calls.find(
    ([_sql, params]: any[]) =>
      params && Object.prototype.hasOwnProperty.call(params, 'ja_id') && params.ja_id != null,
  );
  expect(scopedCall).toBeUndefined();
  ```
- **6-table conflict check** (DELETE endpoints) goes through `dataSource.query`, not a typed repository, when most related tables aren't entities yet. Mock per-table:
  ```ts
  dataSource.query = jest.fn(async (sql: string) => {
    if (/m_kanri_shiten/i.test(sql)) return [{ count: '2' }];
    return [{ count: '0' }];
  });
  ```
- **Integration helper `createIntegrationTestApp` must wire the production `exceptionFactory`** for `ValidationPipe` so VALIDATION_ERROR responses match the FE contract. Without it, integration tests get plain `BAD_REQUEST` while unit-level controller specs (which DO wire the factory) see `VALIDATION_ERROR`. The helper currently has the factory; if you regenerate it via `/scaffold`, verify the factory is preserved.
- **Integration spec for DELETE conflict check**: pre-create the unrelated tables in `seedSql` so the service's `COUNT(*)` queries succeed even when the entity classes ship in a later SCR:
  ```ts
  seedSql: [
    `CREATE TABLE IF NOT EXISTS m_kanri_shiten (
       kanri_shiten_id SERIAL PRIMARY KEY,
       ja_id BIGINT NOT NULL,
       deleted_at TIMESTAMPTZ NULL
     )`,
    // … same for m_shiten, m_hanbaiten, m_tanka, t_dokusya
  ],
  ```
- **`m_account` columns** (when integration-test-INSERTing for conflict tests) — use `password_hash` (NOT `login_password`), `account_name` (required), `login_failure_count` (NOT `failure_count`). Read [account.entity.ts](../../../apps/backend/src/database/entities/account.entity.ts) before crafting the INSERT.

## Out of scope

- Does NOT generate any frontend test (use `/gen-ut-frontend` separately).
- Does NOT install npm packages (jest, ts-jest, @types/jest, pg-mem, ioredis-mock, supertest, @types/supertest are already in `apps/backend/package.json` from scaffold).
- Does NOT emit `apps/backend/test/utils/create-integration-app.ts` — that's a one-time `/scaffold` template (`6h`). If missing, copy from agrinews reference or rerun `/scaffold` to regenerate.
- Does NOT modify `jest.config.ts` or CI config — but the project's jest config MUST have:
  - `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }` matching tsconfig paths
  - `preset: 'ts-jest'` — ts-jest natively emits `design:paramtypes` for Nest DI
  - **Per-module coverage thresholds** (global 0, per-glob 97% lines/stmts + 98% funcs + 73% branches) — Jest istanbul counts ~1-2% stricter than Vitest V8, so calibrated values are slightly lower. When adding a new module's spec suite, append a threshold block to `coverageThreshold`:
    ```ts
    'src/modules/<new-module>/**/*.ts': {
      statements: 97, functions: 98, lines: 97, branches: 73,
    },
    ```
    See [scaffold SKILL.md §2.1](../scaffold/SKILL.md) for the canonical config block.
- Requires `tsconfig.json` to have `esModuleInterop: true` so `import cookieParser from 'cookie-parser'` (and similar CommonJS default imports) resolve under ts-jest.
- Does NOT install `unplugin-swc`. If you want full HTTP-flow controller specs (Strategy B in `controller.spec.ts.tpl`), add `unplugin-swc` + `@swc/core` to `apps/backend/package.json` and configure vitest separately.
- Does NOT generate E2E tests.
