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
- [ ] **Audit log calls inside the transaction MUST pass `manager` as the last argument** — `logCreate(ctx, after, manager)`, `logUpdate(ctx, before, after, manager)`, `logDelete(ctx, before, manager)`. Without it the audit INSERT routes through the standalone `AuditLogService` repo (different DB connection) and survives any rollback → orphan `t_log` row for a business write that never committed. Audit trail diverges from real state — the most dangerous failure mode for a compliance system. See `.claude/rules/nestjs.md §Audit Log — Usage in Service`.
- [ ] Error log (`log_type=3`) emitted OUTSIDE the transaction in the catch branch — `logError(ctx, op, err)` MUST NOT receive `manager`. It runs after rollback; a manager-bound INSERT would also be discarded. The standalone INSERT must survive so the failure trace persists.
- [ ] Every controller declares the path WITHOUT version prefix — `@Controller('tanka')`, NOT `@Controller('api/v1/tanka')`. The `api/v1` prefix is applied centrally via `app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] })` in `main.ts` (see `.claude/rules/nestjs.md §Version prefix`). Only `@Controller('health')` stays unversioned.
- [ ] List endpoints return the standard pagination shape via `paginate(rows, total, page, per_page)` from `@/common/utils/paginate` — NEVER inline-build `{ data, meta: {...} }`. Service signature: `Promise<PaginatedResponse<XListItem>>`. Adding a new meta key (e.g. `has_next`) ripples to every list endpoint automatically; inline construction breaks that.
- [ ] Controllers return EXPLICIT shape — `return { data }` (single), `return { data, message }` (with toast), `return paginate(...)` (list), `return { message }` (no payload). NEVER rely on a magic `TransformInterceptor` (the project deliberately doesn't have one — see `.claude/rules/nestjs.md §Response shape`).
- [ ] Errors flow through `GlobalExceptionFilter` — controllers/services NEVER hand-roll error JSON. Throw a `DomainException` subclass (`JaNotFoundException`, `DuplicateCodeException`, etc.) or any `HttpException` with a `code` field; the filter normalizes to `{ error_code, message, errors? }`.
- [ ] Success message field uses **verb-only** literals: `'登録しました。'` / `'更新しました。'` / `'削除しました。'`. NEVER prefix with the entity name (`JAを登録しました。`, `単価を削除しました。`) or the adverb `正常に`. Custom copy (e.g. `'パスワードを更新しました。ログイン画面に移動します。'`) is allowed only when verb alone is ambiguous — justify in service-method comment. See `.claude/rules/nestjs.md §BE message convention`.
- [ ] Error message uses subject + value template — duplicate: `${resource}「${value}」はすでに登録されています。` (via `DuplicateCodeException`); not-found: `指定された${resource}が見つかりません。` (via per-resource `*NotFoundException` extending `DomainException`). NEVER throw bare `BadRequestException({ message: 'すでに登録されています。' })` — user needs to know WHICH value conflicted.
- [ ] Imports exception classes from `@/common/exceptions/common.exceptions` (project's `NotFoundException` / `ConflictException` / `DuplicateCodeException` / `BadRequestException` extending `DomainException`) — NEVER from `@nestjs/common` for business errors. Naming collision + inconsistent body shape → `GlobalExceptionFilter` falls back to generic `STATUS_TO_CODE[status]` instead of extracting the project's `code` field. See `.claude/rules/nestjs.md §Service-layer common helpers`.
- [ ] Service uses centralized helpers — `paginate()`, `buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, targetId)`, `assertNoRelatedRows(dataSource, RELATED_TABLES, 'fk_id', value)`, `applyJaScope` / `applyBranchScope` / `assertJaScope`, `fetchFkInJa(repo, idField, id, expectedJaId, '<label>')` for EVERY FK-id field in a CREATE/UPDATE body (see Layer 4 DataScope rule below), `filterAllowedFields`, `extractAuditContext`, `pickString` / `pickBool` / `pickNumber` (for the UPDATE-after-filterAllowedFields pattern), `assertMCodeValues(this.codeService, [{ field, value, category, label }, ...])` for m_code-referenced field validation. NEVER write a local `function jaNotFound()`, local `function buildAuditCtx()`, `private async assertNoRelatedRows()`, `private pickString/Bool/Number()`, `private assertCodeValues()` with inline `HttpException` — those are anti-patterns the helpers replace. Only `SCREEN_NAME` / `TABLE_NAME` / `SORT_COLUMN_MAP` / `RELATED_TABLES` / `FIELD_RESTRICTIONS` stay module-local.
- [ ] Entity → response DTO mapping lives in `src/modules/{module}/{module}.mapper.ts` as a pure exported function (`to{Module}Response(entity, ...joinedFields)`) — NOT as a `private toResponse()` method on the service. Mapper file imports the entity + response DTO; no Nest DI, no repo, no service. Service calls `toJaResponse(saved, todofukenName)` after the DML. See [`apps/backend/src/modules/ja/ja.mapper.ts`](../../../apps/backend/src/modules/ja/ja.mapper.ts) as canonical reference.
- [ ] If the new module needs a `.env`-sourced value (URL, region, feature flag, …), wire it through `ConfigService`: (a) add a key under the appropriate nested group in [`src/config/configuration.ts`](../../../apps/backend/src/config/configuration.ts) (`app.*`, `mail.*`, etc.), (b) mirror in [`apps/backend/.env.example`](../../../apps/backend/.env.example), (c) read via `this.configService.get<T>('group.key')`. NEVER `process.env.X` directly in service / controller / module code — only `configuration.ts` itself + `database/data-source.ts` (TypeORM CLI, no DI) + `scripts/*.ts` (standalone CLI) are exempt. See `.claude/rules/nestjs.md §Configuration`.
- [ ] All cross-folder imports use `@/...` path alias (NEVER `'../../...'` traversal). Test fixtures use `@test/...`. Same-folder siblings keep `./...`. See `.claude/rules/nestjs.md §Path aliases`.
- [ ] Every controller endpoint has `@UseGuards(SessionAuthGuard, PermissionsGuard)` at class or method level + `@Permissions('model.action')` matching `api.md` §4.2
- [ ] Code-category columns (anywhere api.md says `※m_code.code_category='XXX'を参照`) are typed `int` / `varchar` in the entity — NOT `@Column({type:'enum'})`. The category is either Group A (TS enum + `m_code` for label) or Group B (`m_code`-only, no enum) per the decision rules in `.claude/rules/nestjs.md §Master code values`.
- [ ] **Group A categories** (`LOG_TYPE`, `RESULT_STATUS`, `LOGIN_RESULT`, `OTP_TYPE`, `OSHIRASE_STATUS`, `PUBLISH_LOCATION` — verify the up-to-date list against `apps/backend/src/common/enums/index.ts`): import from `@/common/enums`. Constants follow `export const Foo = { BAR: 1 } as const; export type Foo = (typeof Foo)[keyof typeof Foo]` — PascalCase identifier + UPPER_SNAKE_CASE members. Do NOT use `enum` (blocks Node native TS, pollutes `Object.values`). DTO validates with `@IsIn(Object.values(MyConst), { message: '…' })`. Branching logic uses constant members (`if (status === OshiraseStatus.PUBLIC)`), never magic numbers (`=== 2`). QueryBuilder binds the value as a parameter — `.where('o.status = :status', { status: OshiraseStatus.PUBLIC })`, not `.andWhere('o.status = 2')`. Adding a new value requires editing BOTH `apps/backend/src/common/enums/<name>.enum.ts` AND the FE mirror `apps/frontend/src/constants/enums/<name>.ts` — `apps/backend/test/integration/enum-sync.spec.ts` fails CI on drift.
- [ ] **Group B categories** (`DOKUSYA_SHUBETSU`, `SHIHARAI_HOHO`, `GENDER`, `TANKA_TYPE`, `OSHIRASE_TYPE`, `DOWNLOAD_TYPE`, etc. — anything not in Group A): NO TS enum. DTO uses `@IsInt()` / `@IsString()` for shape; the allowed-value check lives in service via `this.codeService.has('XXX', dto.field)` and raises `VALIDATION_ERROR` on miss. Customer can extend at runtime by inserting `m_code` rows.
- [ ] **Picking the group when adding a new category** (Group A only when ALL three hold): (1) value set is fixed by business design, not extensible at runtime; (2) code branches on the value (BE service / FE template); (3) a new value would require code review (new logic branch). When unsure, default to Group B — moving B → A later is small (add the enum), moving A → B later is hard (must strip all branching that assumed the closed set).
- [ ] Every controller endpoint has `@ApiOperation`, `@ApiResponse`, `@ApiCookieAuth('session_id')` decorators
- [ ] `audit_log.operation` value is bare verb `'CREATE'` / `'UPDATE'` / `'DELETE'` — NEVER prefixed with entity or screen (e.g. `'TANKA_CREATE'` is forbidden)
- [ ] DataScope filter applied in service layer (NEVER in controller) for list queries and single-record access
- [ ] **Layer 4 DataScope — FK reference in body**: every FK id arriving from a CREATE/UPDATE request body (e.g. `kanri_shiten_id`, `haitatsuryo_tanka_id`, `shiten_id`) MUST be validated via `fetchFkInJa(repo, idField, id, expectedJaId, '<label>')` BEFORE the INSERT/UPDATE. The pre-existing pattern of `findOne({ where: { idField, deletedAt: IsNull() } }) → throw BadRequestException(...)` is INSUFFICIENT — it accepts FK ids of rows in OTHER tenants, creating cross-tenant data corruption. `expectedJaId`: pass `session.ja_id` for endpoints restricted to JA-scoped roles (shiten); pass `dto.ja_id ?? session.ja_id` when the endpoint supports NICHINO_STAFF 代行入力 (account, hanbaiten); pass `Number(before.jaId)` on UPDATE flows so changing the FK still binds to the existing row's tenant. Wrap UPDATE-side calls in `if (dto.X !== undefined)` so partial updates don't tank when the field is omitted. Helper throws `BadRequestException('<label>IDが存在しません。')` for both "row missing" and "row exists in different tenant" — same message prevents tenant-id enumeration. See `apps/backend/src/modules/shiten/shiten.service.ts` CREATE around the [uniqueness-check] block for the canonical usage. See `.claude/rules/security.md §Layer 4 — FK reference scope`.
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

→ Entity changed? Run migration before going FE:
    cd apps/backend
    npm run migration:generate -- -n Add<Module>Table
    npm run migration:run
→ Then: cd apps/backend && npm test -- <module>
→ Then (FE leg): /gen-ut-frontend <screen> → /gen-code-frontend <screen>
   (FE wrapper at apps/frontend/src/api/<tag>/<tag>.ts is hand-written
    to mirror this BE's response shape — no codegen step.)
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
| `mapper.ts.tpl` | `src/modules/{module}/{module}.mapper.ts` | Pure entity→response DTO mapper (`to{Module}Response(entity, ...joined)`) — no Nest DI, importable from anywhere |
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
  1. **Append new SCR specs as sibling top-level `describe(...)` blocks INSIDE the existing root spec file** — do NOT create a `__tests__/` subfolder. Project convention is "1 source file = 1 spec file" (commits `db84f1d` + `0fe97ff` standardised every BE module to this layout). `/gen-ut-backend` documents the merge pattern in detail; `/gen-code-backend` only needs to ensure its emitted source keeps existing test count GREEN. Mock-state pollution across sibling describes is the #1 risk — each sibling `describe` must keep its OWN `beforeEach` with fresh mocks.
  2. **New constructor deps use `@Optional()`**: when the new endpoints need a dep the existing service didn't have (e.g. `DataSource` for transactions, `CodeService` for m_code validation), declare it with `@Optional() @InjectDataSource() private readonly dataSource?: DataSource` at the END of the constructor list. Production DI still injects the real instance; older specs in the same merged file that did `new Service(...N args)` keep type-checking after their `@ts-nocheck` banner is removed. A required param would force editing every prior spec block — which `/gen-code-backend` is not allowed to do.
  3. **Throw a clear runtime guard** when the optional dep is missing: `if (!this.dataSource) throw new Error('Service.dataSource is undefined — SCR-XXX endpoints require it.')`. Catches the "test forgot to wire it" case loudly instead of silently calling `.transaction` on `undefined`.
- **Optional fields with `@IsOptional()` + `@Matches`**: `@IsOptional()` only skips `null` / `undefined`, NOT empty strings. Frontend forms send `tel: ""` for blank inputs → `@Matches(/^\d+$/)` rejects → 400 even though the field is supposedly optional. Pair `@Transform(blankToUndef)` BEFORE `@IsOptional()`. Pattern (canonical) in `.claude/rules/nestjs.md §DTO validation gotchas` — copy the `blankToUndef` helper to the top of the DTO file and apply to every optional regex/email field.
- **Kana fields (`*_name_kana`) MUST carry an `@Matches` katakana regex.** Default is 半角 (`/^[ｦ-ﾟ\s]+$/u`) — used by JA (SCR-005), 管理支店 (SCR-009), and 支店 (SCR-007):
  ```ts
  @Matches(/^[ｦ-ﾟ\s]+$/u, {
    message: '支店名(カナ)は半角カタカナで入力してください。',
  })
  shiten_name_kana?: string;
  ```
  Half-width covers letters `ｦ-ﾝ` + prolonged sound mark `ｰ` (U+FF70) + dakuten/handakuten `ﾞ ﾟ` — the range `ｦ-ﾟ` (U+FF66-FF9F) covers all. `\s` already includes U+3000 — do NOT add `　` to the class (SonarLint dup-class warning). Switch to 全角 (`/^[ァ-ヶー\s]+$/u`) ONLY when screen-design.md explicitly requires it and the field has no export-side consumer; document the deviation in the field's `@ApiPropertyOptional` description. The message wording MUST exactly match the FE's `kanaFormatMessage('<label>')` output (FE imports the helper from `@/utils/kana` — see `gen-code-frontend` skill). The BE has no shared decorator yet — write the literal regex + Japanese message verbatim so FE/BE stay grep-able. Without this, hiragana / kanji / fullwidth digits leak into CSV/Excel exports and break formatting far from the form. DTO `VALID` fixtures + controller / service spec request bodies MUST match the chosen variant (typing full-width into a half-width DTO breaks every `*.dto.spec.ts` happy-path assertion). When extending `UpdateXDto` via `PartialType(OmitType(CreateXDto, [...]))`, the `@Matches` is inherited automatically — do NOT redeclare on the Update DTO. Punctuation isn't katakana — strip `（）` / `()` / `.` from kana fixtures and use space-separated kana segments (`'ﾄｳｷｮｳ ｶｲｼｮｳ'`). See `.claude/rules/vue.md §Kana fields MUST validate the script`.
- **Every `class-validator` decorator needs a Japanese `message`** — `@IsNotEmpty()` without an explicit message ships `"login_id should not be empty"` to end users. The global `exceptionFactory` (see `.claude/rules/nestjs.md §Validation Error Factory`) now picks ONE message per field by priority (`isNotEmpty` first, then type checks, then format), so leaving English on a low-priority constraint hides until that's the only failing constraint. For required messages use the canonical literal from the screen's `## メッセージ情報` table (e.g. `'ユーザーIDを入力してください。'` for ACSMS-MSG-001-001); for format/length write a Japanese sentence that names the field.
- **Don't pair `@Length(N, N)` with `@Matches(/^\d{N}$/)`** on the same field — redundant. The priority picker collapses to one message, but prefer a single `@Matches(/^\d{N}$/)` that enforces both length and digits in one Japanese message.
- **`@ValidateIf((o, v) => …)` is property-level, not per-decorator** — its condition gates ALL validators of the property, including `@IsNotEmpty`. So `@IsNotEmpty() @ValidateIf((_, v) => v.length > 0) @Matches(...)` does NOT mean "skip Matches on empty, keep required check"; on empty input the condition returns false and the property silently passes everything. Don't reach for `@ValidateIf` to dedupe constraint messages — rely on the picker.
- **`api.md` may reference a common helper endpoint that has no dedicated module yet** (e.g. SCR-005 needs `GET /api/v1/todofuken` for the prefecture dropdown — read-only list, ACSMS-API-COMMON-001). When the screen's `api.md` mentions an `ACSMS-API-COMMON-NNN` endpoint and `apps/backend/src/modules/<name>/` doesn't exist, GENERATE the module too: small read-only service + controller + module, register in `app.module.ts`. Don't skip with the assumption "someone else will build it" — the FE view will 404 on dropdown load.
- **After registering a NEW module, the live Swagger UI at `/api/docs` updates on the next BE reload** (handled by `npm run start:dev` watch mode). Useful for testing the new endpoint by hand. The on-disk snapshot at `apps/backend/swagger.json` (only generated when `npm run swagger:export` runs) stays stale until you rerun it — refresh only if a teammate is reading the snapshot or running offline tools (Postman / Insomnia / contract diff).
- **Seed migration with `INSERT...SELECT...UNION ALL` needs explicit `::timestamptz` casts on date literals.** Postgres infers `'2026-01-01'` as `text` through a `UNION` (it doesn't with plain `INSERT...VALUES`, which is why the original 1711900900003 seed worked). Symptom: `error: column "created_at" is of type timestamp with time zone but expression is of type text`. Fix: write `'2026-01-01'::timestamptz` for every date literal in the SELECT branches. See `1711900900008-SeedRoleAndDaikoPermissions.ts` for the canonical shape.
- **`SERIAL` sequences are NOT rolled back** when a migration's transaction fails. If your first attempt INSERTs 2 rows into `m_permissions` and then fails on the second statement, `permission_id` advances by 2 even after `ROLLBACK`. The next successful run gets ids that don't match what `seeder.md` documents (44/45 vs 66/67 in dev). For *fresh* databases the documented ids hold; for already-touched dev DBs, query `WHERE permission_code = 'X'` instead of trusting the id. Don't try to reset the sequence — there's no functional difference and the IDs are internal.
- **Adding a new permission code is a 4-place change**: (1) seeder migration `INSERT INTO m_permissions`, (2) seeder migration `INSERT INTO m_roles_permissions` for the role(s) that should hold it, (3) `docs/database/seeder.md` §2.X subsection + §3 matrix + role summary + シードデータ table for affected role(s), (4) `docs/requirement/account_concept.md` 機能分類 matrix row. Skipping (1) or (2) means `hasPermission()` is silently false everywhere — the FE menu disappears with no error. Skipping (3)/(4) means the canonical spec drifts from runtime behavior.

## Out of scope

- Does NOT generate migration SQL. After entity changes, user runs:
  `npm run migration:generate -- -n <Name> && npm run migration:run`
  Integration specs that hit pg-mem read the entity metadata directly so migrations aren't strictly required for `npm test` to green — but real-PG integration environments do require them.
- Does NOT touch the FE wrapper. When the BE response shape changes, the matching `apps/frontend/src/api/<tag>/<tag>.ts` wrapper must be updated by hand in the FE leg (`/gen-code-frontend` emits a new wrapper for new tags; existing wrappers stay until manually edited). The live Swagger UI at `/api/docs` is the easiest visual reference for the response shape.
- Does NOT install npm packages.
- Does NOT modify `vitest.config.ts`, `nest-cli.json`, or CI config.
- Does NOT generate frontend code (use `/gen-code-frontend`).
- Does NOT iterate on vitest failures — user runs `npm test` and fixes manually.
- Does NOT edit specs, factories, or fixtures.
