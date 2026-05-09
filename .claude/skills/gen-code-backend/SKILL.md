---
name: gen-code-backend
description: Generate NestJS backend source (entity / DTO / exception / service / controller / module) for a screen AFTER `/gen-ut-backend` has produced failing specs. Reads spec files + api.md + database-design.md and emits implementation that makes the specs go green. Last step removes the `@ts-nocheck` TDD banner once `tsc --noEmit` passes.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Backend Source (TDD Green Phase)

## Description

Emit the NestJS source tree that satisfies the spec suite produced by `/gen-ut-backend`. Tests are the contract; implementation must match their assertions. The skill is **one-shot** — it generates files and runs `tsc --noEmit`, but does NOT loop on vitest failures. The user runs `npm test` afterwards and iterates manually.

Pipeline position:

```
/gen-api-doc         ACSMS-SCR-XXX  →  api.md (spec)
/gen-ut-backend      ACSMS-SCR-XXX  →  backend *.spec.ts (failing — RED)
/gen-ut-frontend     ACSMS-SCR-XXX  →  frontend *.spec.ts (failing — RED)
/gen-code-backend    ACSMS-SCR-XXX  →  backend src/ (passing — GREEN)
/gen-code-frontend   ACSMS-SCR-XXX  →  frontend src/ (passing — GREEN)
```

The frontend counterpart is `/gen-code-frontend`; run it separately (order doesn't matter — the two produce disjoint file sets).

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Abort conditions (check in order, fail fast):**

1. `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → abort: `Run /gen-api-doc $ARGUMENTS first`.
2. No `apps/backend/src/modules/<module>/*.spec.ts` for the screen's module → abort: `Run /gen-ut-backend $ARGUMENTS first`.
3. `mtime(api.md) > mtime(any *.spec.ts)` → abort: `api.md newer than spec files — rerun /gen-ut-backend $ARGUMENTS to refresh the contract, then rerun this skill`.

Use `stat -f %m <path>` (macOS) / `stat -c %Y <path>` (Linux) for timestamps.

## Process

### Phase 1 — Read

Parallel reads:

**Spec (canonical contract):**
- `apps/backend/src/modules/<module>/*.spec.ts` (controller + service + every DTO spec)
- `apps/backend/test/integration/<module>.integration.spec.ts`
- `apps/backend/test/fixtures/<module>.factory.ts`

**Reference spec (for names, SQL, column types):**
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md`
- `docs/database/database-design.md` (entity columns, types, nullability)
- `docs/database/seeder.md` (role codes, permission codes)

**Rules (mandatory):**
- `.claude/rules/nestjs.md`
- `.claude/rules/security.md`
- `.claude/rules/naming-conventions.md`

**Existing infra to reuse (do NOT redefine):**
- `apps/backend/src/common/guards/session-auth.guard.ts`
- `apps/backend/src/common/guards/permissions.guard.ts`
- `apps/backend/src/common/decorators/permissions.decorator.ts`
- `apps/backend/src/common/exceptions/domain.exception.ts`
- `apps/backend/src/common/dto/pagination.dto.ts`
- `apps/backend/src/common/constants/error-codes.constant.ts`
- `apps/backend/src/modules/audit-log/audit-log.service.ts`
- `apps/backend/src/modules/auth/session.service.ts` (`SessionPayload` shape)
- `apps/backend/src/modules/code/code.service.ts` (m_code lookup — inject whenever the screen has code-category columns like `tanka_type`, `gender`, `shiharai_hoho`, etc.)
- `apps/backend/src/app.module.ts` (target for new module registration)

**Templates:**
- `.claude/skills/gen-code-backend/templates/*.tpl` (9 files)

### Phase 2 — Analyze

Build a plan from spec files — tests dictate shape:

| Spec clause | → source file must expose |
|---|---|
| `service.spec.ts` describe blocks | `<Module>Service` with matching public methods + signatures |
| `repo.findOne.mockResolvedValue(...)` | entity field names used in mock |
| `repo.findAndCount.mockResolvedValue([rows, total])` | service returns `{ data, meta: { total, page, per_page, total_pages } }` |
| `auditLog.logOperation(...)` mocked | service calls `AuditLogService.logOperation` with bare `'CREATE'`/`'UPDATE'`/`'DELETE'` |
| `.overrideGuard(SessionAuthGuard)` in controller spec | controller uses `@UseGuards(SessionAuthGuard, PermissionsGuard)` |
| `@Permissions('xxx.yyy')` assertion in spec | controller endpoint decorated with same perm string |
| `await expect(...).rejects.toThrow(XxxException)` | `<Module>/exceptions/xxx.exception.ts` exists |
| `validate(dto)` in `dto.spec.ts` | DTO has matching `class-validator` decorators |
| Integration spec `dataSource.transaction` rollback case | service wraps DML + audit log in `dataSource.transaction((manager) => …)` |

Cross-check with `api.md` §1 (method/URI), §2 (params), §3 (response), §4 (SQL) for details the spec does not encode (e.g. column names from `4.x` SQL blocks).

Cross-check with `database-design.md` for:
- Column types (`varchar(n)`, `int`, `timestamptz`)
- `NULL許容=〇` → entity field typed `string | null`, `@Column({ nullable: true })`
- `NULL許容=-` → entity field typed `string` (never null), default `''` for text

### Phase 3 — Generate

**Order (dependency-first, to help `tsc` succeed):**

1. `apps/backend/src/database/entities/<entity>.entity.ts` ← entity lives in shared `database/entities/`, NOT in module folder
2. `<module>/exceptions/*.exception.ts` (one per custom error code beyond common 7)
3. `<module>/dto/create-<entity>.dto.ts`, `update-<entity>.dto.ts`, `<entity>-response.dto.ts`, `search-<entity>.dto.ts`
4. `<module>/<module>.service.ts`
5. `<module>/<module>.controller.ts`
6. `<module>/<module>.module.ts` (imports the entity from `@/database/entities/<name>.entity`)
7. **Register module**: add to `apps/backend/src/app.module.ts` imports array (idempotent — skip if already present)

**File layout produced** (example for `ACSMS-SCR-003` 単価マスタ):

```
apps/backend/src/
├── database/entities/
│   └── tanka.entity.ts                    ← entity lives here
└── modules/tanka/
    ├── tanka.module.ts                    ← imports([Tanka]) from @/database/entities
    ├── tanka.controller.ts
    ├── tanka.service.ts
    ├── dto/
    │   ├── create-tanka.dto.ts
    │   ├── update-tanka.dto.ts
    │   ├── search-tanka.dto.ts
    │   └── tanka-response.dto.ts
    └── exceptions/
        ├── tanka-not-found.exception.ts
        └── duplicate-tanka-code.exception.ts
```

**Cross-module FK references**: when this module's entity has a foreign key
to an entity owned by another module, IMPORT from `@/database/entities/...`
— never redefine. Example: `Tanka.ja_id → m_ja.ja_id`:

```typescript
// src/database/entities/tanka.entity.ts
import { Ja } from '@/database/entities/ja.entity';
@ManyToOne(() => Ja, { onDelete: 'RESTRICT' }) ja: Ja;
```

### Phase 4 — Compile-gate + unban

After writing all files:

1. Run `cd apps/backend && npx tsc --noEmit` (timeout 90s).
2. If **exit 0** (no type errors):
   - For each `*.spec.ts` file under the screen's module, remove the banner line `// @ts-nocheck — TDD red phase (...)`. Do NOT touch any other line.
   - Print: `✓ tsc passed — @ts-nocheck banner removed from N spec file(s)`.
3. If **exit ≠ 0**:
   - Do NOT remove banners.
   - Print the first 30 lines of tsc output.
   - Print: `⚠ tsc failed — banner kept. Fix the type errors above, then rerun this skill OR gỡ banner thủ công.`

## Critical rules (enforce BEFORE writing)

- [ ] NEVER edit any `*.spec.ts`, `*.factory.ts`, or `*.fixture.ts` file — specs are the immutable contract
- [ ] Every entity field uses the correct nullability (`nullable: true` iff `NULL許容=〇` in DB design)
- [ ] Every response DTO field matches the DB column type (NOT NULL → `''`, nullable → `null`) per `.claude/rules/nestjs.md` §Nullable field serialization
- [ ] Every service method that writes to `t_log` wraps the main DML + audit log inside `this.dataSource.transaction(async (manager) => …)` per `.claude/rules/nestjs.md`
- [ ] Error log (`log_type=3`) emitted OUTSIDE the transaction in the catch branch
- [ ] Every controller endpoint has `@UseGuards(SessionAuthGuard, PermissionsGuard)` at class or method level + `@Permissions('model.action')` matching `api.md` §4.2
- [ ] Code-category columns (anywhere api.md says `※m_code.code_category='XXX'を参照`) are typed `int` / `varchar` in the entity — NOT `@Column({type:'enum'})`. DO NOT generate a TypeScript `enum` class for the category. DTO uses `@IsInt()` / `@IsString()` for shape; the allowed-value check lives in service via `this.codeService.has('XXX', dto.field)` and raises `VALIDATION_ERROR` on miss. See `.claude/rules/nestjs.md §Master code values`.
- [ ] Every controller endpoint has `@ApiOperation`, `@ApiResponse`, `@ApiCookieAuth('session_id')` decorators
- [ ] `audit_log.operation` value is bare verb `'CREATE'` / `'UPDATE'` / `'DELETE'` — NEVER prefixed with entity or screen (e.g. `'TANKA_CREATE'` is forbidden)
- [ ] DataScope filter applied in service layer (NEVER in controller) for list queries and single-record access
- [ ] Field-level restriction applied via `filterAllowedFields()` helper for roles listed in `.claude/rules/security.md` §Layer 3
- [ ] Module added to `app.module.ts` imports (use anchor: the TypeORM/feature imports block)
- [ ] No raw SQL (use QueryBuilder or Repository methods) — TypeORM parameterized queries only
- [ ] Every timestamp column (`created_at`, `updated_at`, `deleted_at`, `*_at`, `log_datetime`, `login_datetime`, `expired_at`, `publish_*_date`, …) declared as `TIMESTAMPTZ` in migration DDL **and** `type: 'timestamptz'` in the entity — including `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` (their default is plain `TIMESTAMP` on Postgres, which silently strips the offset). Standard is JST 運用 (Asia/Tokyo); see `.claude/rules/nestjs.md §Timestamp policy`.

## Validation summary (print at end)

```
✓ Entity files: 1
✓ DTO files: D
✓ Exception files: E
✓ Service methods: M  (matches spec describe blocks: M/M)
✓ Controller endpoints: C  (matches @Permissions assertions: C/C)
✓ Module registered in app.module.ts: yes
✓ tsc --noEmit: pass
✓ @ts-nocheck banners removed: B

→ Entity changed? Run migration + refresh Orval before going FE:
    cd apps/backend
    npm run migration:generate -- -n Add<Module>Table
    npm run migration:run
    npm run start:dev   # or: npm run swagger:export
    cd ../frontend && npm run api:generate
→ Then: cd apps/backend && npm test -- <module>
→ Then (FE leg): /gen-ut-frontend <screen> → /gen-code-frontend <screen>
```

If tsc fails:

```
⚠ tsc --noEmit: FAIL (see above)
→ Fix type errors, rerun /gen-code-backend $ARGUMENTS (idempotent — re-emits from templates)
```

## Placeholder reference

| Placeholder | Meaning | Example |
|---|---|---|
| `__SCREEN_ID__` | Screen code | `ACSMS-SCR-003` |
| `__SCREEN__` | Screen name (Japanese) | `単価マスタ登録画面` |
| `__MODULE__` | Module folder (kebab-case singular) | `tanka` |
| `__MODULE_PLURAL__` | API path segment (kebab-case plural) | `tanka` |
| `__ENTITY__` | Entity class (PascalCase singular) | `Tanka` |
| `__ENTITY_FILE__` | Entity file basename | `tanka.entity` |
| `__TABLE__` | DB table name (snake_case plural) | `m_tanka` |
| `__SERVICE__` | Service class | `TankaService` |
| `__CONTROLLER__` | Controller class | `TankaController` |
| `__MODULE_CLASS__` | Module class | `TankaModule` |
| `__MODEL_KEY__` | Permission model key | `tanka` |
| `__PK__` | Primary key column name | `tanka_id` |

## Template → target mapping

| Template | Target | Purpose |
|---|---|---|
| `entity.ts.tpl` | `src/database/entities/{module}.entity.ts` | TypeORM `@Entity` with columns + relations — shared location, not in module folder |
| `dto-create.ts.tpl` | `src/modules/{module}/dto/create-{module}.dto.ts` | `class-validator` + `@ApiProperty` |
| `dto-update.ts.tpl` | `src/modules/{module}/dto/update-{module}.dto.ts` | `PartialType(CreateXxxDto)` |
| `dto-response.ts.tpl` | `src/modules/{module}/dto/{module}-response.dto.ts` | API response shape with nullable policy |
| `dto-search.ts.tpl` | `src/modules/{module}/dto/search-{module}.dto.ts` | extends `PaginationDto` (only if list endpoint exists) |
| `exception.ts.tpl` | `src/modules/{module}/exceptions/{name}.exception.ts` | extends `DomainException` |
| `service.ts.tpl` | `src/modules/{module}/{module}.service.ts` | Business logic + DataScope + audit-log tx |
| `controller.ts.tpl` | `src/modules/{module}/{module}.controller.ts` | Guards + `@Permissions` + Swagger |
| `module.ts.tpl` | `src/modules/{module}/{module}.module.ts` | `TypeOrmModule.forFeature([Entity])` + providers |

## Contracts with sibling skills

- **Spec files are immutable.** `/gen-code-backend` MUST NOT edit `*.spec.ts`, `*.factory.ts`, `*.fixture.ts`. Its only edits outside `src/modules/<module>/` are (a) appending the module to `app.module.ts` imports, and (b) removing the `@ts-nocheck` banner after tsc passes.
- **Idempotent.** Re-running on the same screen overwrites source files from templates but does not duplicate the `app.module.ts` import.
- **Spec-canonical.** If a field name or method signature in the spec disagrees with `api.md`, the spec wins — `api.md` is for reference only.
- **Stale contract check.** If `api.md` is newer than any spec file, abort and tell the user to rerun `/gen-ut-backend` first.
- **Independent of `/gen-code-frontend`.** The two skills produce disjoint file sets.

## Common pitfalls

- **Missing `AuditLogService` provider in tests**: the service depends on `DataSource` for transactions. Always inject `@InjectDataSource() dataSource: DataSource` in service constructor.
- **PartialType import path**: use `@nestjs/mapped-types` (not `@nestjs/swagger`) — the swagger version loses class-validator metadata.
- **Field-level restriction table**: lives in `.claude/rules/security.md` §Layer 3. Copy the relevant model subset into `FIELD_RESTRICTIONS` at the top of the service file.
- **DataScope NICHINO_STAFF vs NICHINO_ADMIN**: `STAFF` can create/update hanbaiten but cannot delete. Check `api.md` §4.2 for per-endpoint role list.
- **Soft delete**: always filter `deleted_at IS NULL` in list/find queries. Use `@DeleteDateColumn()` — calling `repo.softDelete()` sets it.
- **Japanese message literals**: copy verbatim from `api.md` エラー一覧 (e.g. `'同一の販売店コードが既に登録されています'`).
- **`DuplicateCodeException` should surface the actual value** in the toast — pass `dto.<unique_field>` as the optional 2nd arg so users see `JAコード「002001」はすでに登録されています。` instead of the generic `同一のJAコードが既に登録されています。`. The signature is `new DuplicateCodeException(resource, value?)` (legacy 1-arg call still works for callers that don't have the value handy). Apply this for every uniqueness-violation throw in any service. When you write the exception, also update the matching `エラー一覧` row + JSON example in api.md so the spec stays the source of truth.
- **Adding endpoints to an EXISTING module** (e.g. SCR-012 adds 3 endpoints to the existing `AuthController` instead of creating a new module) needs care so older specs don't break:
  1. **Specs under a subfolder**: put the new SCR's spec files under `src/modules/<existing>/__tests__/<screen>.{service,controller}.spec.ts` instead of overwriting the existing `<module>.{service,controller}.spec.ts`. Keeps SCR-N specs and SCR-M specs as separate test files targeting the same class.
  2. **New constructor deps use `@Optional()`**: when the new endpoints need a dep the existing service didn't have (e.g. `DataSource` for transactions), declare it with `@Optional() @InjectDataSource() private readonly dataSource?: DataSource` at the END of the constructor list. Production DI still injects the real instance; older specs that did `new Service(...8 args)` keep type-checking after their `@ts-nocheck` banner is removed. A required param would force editing every prior spec — which `/gen-code-backend` is not allowed to do.
  3. **Throw a clear runtime guard** when the optional dep is missing: `if (!this.dataSource) throw new Error('Service.dataSource is undefined — SCR-XXX endpoints require it.')`. Catches the "test forgot to wire it" case loudly instead of silently calling `.transaction` on `undefined`.
- **Optional fields with `@IsOptional()` + `@Matches`**: `@IsOptional()` only skips `null` / `undefined`, NOT empty strings. Frontend forms send `tel: ""` for blank inputs → `@Matches(/^\d+$/)` rejects → 400 even though the field is supposedly optional. Pair `@Transform(blankToUndef)` BEFORE `@IsOptional()`. Pattern (canonical) in `.claude/rules/nestjs.md §DTO validation gotchas` — copy the `blankToUndef` helper to the top of the DTO file and apply to every optional regex/email field.
- **Every `class-validator` decorator needs a Japanese `message`** — `@IsNotEmpty()` without an explicit message ships `"login_id should not be empty"` to end users. The global `exceptionFactory` (see `.claude/rules/nestjs.md §Validation Error Factory`) now picks ONE message per field by priority (`isNotEmpty` first, then type checks, then format), so leaving English on a low-priority constraint hides until that's the only failing constraint. For required messages use the canonical literal from the screen's `## メッセージ情報` table (e.g. `'ユーザーIDを入力してください。'` for ACSMS-MSG-001-001); for format/length write a Japanese sentence that names the field.
- **Don't pair `@Length(N, N)` with `@Matches(/^\d{N}$/)`** on the same field — redundant. The priority picker collapses to one message, but prefer a single `@Matches(/^\d{N}$/)` that enforces both length and digits in one Japanese message.
- **`@ValidateIf((o, v) => …)` is property-level, not per-decorator** — its condition gates ALL validators of the property, including `@IsNotEmpty`. So `@IsNotEmpty() @ValidateIf((_, v) => v.length > 0) @Matches(...)` does NOT mean "skip Matches on empty, keep required check"; on empty input the condition returns false and the property silently passes everything. Don't reach for `@ValidateIf` to dedupe constraint messages — rely on the picker.
- **`api.md` may reference a common helper endpoint that has no dedicated module yet** (e.g. SCR-005 needs `GET /api/v1/todofuken` for the prefecture dropdown — read-only list, ACSMS-API-COMMON-001). When the screen's `api.md` mentions an `ACSMS-API-COMMON-NNN` endpoint and `apps/backend/src/modules/<name>/` doesn't exist, GENERATE the module too: small read-only service + controller + module, register in `app.module.ts`. Don't skip with the assumption "someone else will build it" — the FE view will 404 on dropdown load.
- **After registering a NEW module, `swagger.json` is stale.** The `/gen-code-frontend` Phase 0 reads `apps/frontend/swagger.json` to regenerate Orval — if that file pre-dates this commit, the FE client won't see the new endpoint. Either run `cd apps/backend && npm run swagger:export` (writes to `apps/frontend/swagger.json`) before `/gen-code-frontend`, or `curl -s http://localhost:3000/api/docs-json -o apps/frontend/swagger.json` if the backend container is already running.
- **Seed migration with `INSERT...SELECT...UNION ALL` needs explicit `::timestamptz` casts on date literals.** Postgres infers `'2026-01-01'` as `text` through a `UNION` (it doesn't with plain `INSERT...VALUES`, which is why the original 1711900900003 seed worked). Symptom: `error: column "created_at" is of type timestamp with time zone but expression is of type text`. Fix: write `'2026-01-01'::timestamptz` for every date literal in the SELECT branches. See `1711900900008-SeedRoleAndDaikoPermissions.ts` for the canonical shape.
- **`SERIAL` sequences are NOT rolled back** when a migration's transaction fails. If your first attempt INSERTs 2 rows into `m_permissions` and then fails on the second statement, `permission_id` advances by 2 even after `ROLLBACK`. The next successful run gets ids that don't match what `seeder.md` documents (44/45 vs 66/67 in dev). For *fresh* databases the documented ids hold; for already-touched dev DBs, query `WHERE permission_code = 'X'` instead of trusting the id. Don't try to reset the sequence — there's no functional difference and the IDs are internal.
- **Adding a new permission code is a 4-place change**: (1) seeder migration `INSERT INTO m_permissions`, (2) seeder migration `INSERT INTO m_roles_permissions` for the role(s) that should hold it, (3) `docs/database/seeder.md` §2.X subsection + §3 matrix + role summary + シードデータ table for affected role(s), (4) `docs/requirement/account_concept.md` 機能分類 matrix row. Skipping (1) or (2) means `hasPermission()` is silently false everywhere — the FE menu disappears with no error. Skipping (3)/(4) means the canonical spec drifts from runtime behavior.

## Out of scope

- Does NOT generate migration SQL. After entity changes, user runs:
  `npm run migration:generate -- -n <Name> && npm run migration:run`
  Integration specs that hit pg-mem read the entity metadata directly so migrations aren't strictly required for `npm test` to green — but real-PG integration environments do require them.
- Does NOT regenerate the Orval client. FE leg needs fresh types — run `npm run api:generate` in `apps/frontend/` AFTER backend is up (or Swagger exported) and BEFORE `/gen-code-frontend`.
- Does NOT install npm packages.
- Does NOT modify `vitest.config.ts`, `nest-cli.json`, or CI config.
- Does NOT generate frontend code (use `/gen-code-frontend`).
- Does NOT iterate on vitest failures — user runs `npm test` and fixes manually.
- Does NOT edit specs, factories, or fixtures.
