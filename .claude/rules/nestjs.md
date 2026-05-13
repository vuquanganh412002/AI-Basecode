# NestJS Backend Rules — agrinews

> All backend standards for `apps/backend/**/*.ts`. Covers architecture, API, database, error handling, and testing.

---

## Configuration — every env value MUST flow through `ConfigService`

Single source of truth: [`apps/backend/src/config/configuration.ts`](../../apps/backend/src/config/configuration.ts) factory. EVERY runtime value sourced from a `.env` key MUST be:

1. Declared in the `configuration.ts` factory under the appropriate nested group (`database.*`, `redis.*`, `session.*`, `storage.*`, `mail.*`, `app.*`, …).
2. Mirrored in [`apps/backend/.env.example`](../../apps/backend/.env.example) with a comment describing format + dev vs prod expectations.
3. Read via `ConfigService` in services / modules: `this.configService.get<string>('app.frontendUrl')`.

```ts
// ✅ Correct — runtime service reads from ConfigService
@Injectable()
export class AuthService {
  constructor(
    @Optional() private readonly configService?: ConfigService,
  ) {}

  someMethod() {
    const frontendUrl =
      this.configService?.get<string>('app.frontendUrl') ??
      'http://localhost:5173';
  }
}

// ❌ Wrong — bypasses central config layer
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
```

**Why**: missing-env failures crash loudly at boot (`assertProductionSecrets()` rejects `NODE_ENV=production` with default/missing secrets); `.env.example` discovers required keys for new devs; renaming an env var is a one-file change; AWS Secrets Manager wiring lives next to the rest of the config.

### Two acceptable exceptions for direct `process.env`

| Case | File | Why exempted |
|---|---|---|
| TypeORM CLI DataSource | [`src/database/data-source.ts`](../../apps/backend/src/database/data-source.ts) | `migration:generate / run / revert` runs outside Nest DI — no ConfigService available. Defaults MUST stay in sync with `configuration.ts` (e.g. `DB_NAME` default `'agrinews_dev'` matches both files). |
| Standalone CLI scripts | [`scripts/seed.ts`](../../apps/backend/scripts/seed.ts) | One-shot scripts invoked via `npm run seed` — no Nest app boots. Document each `INITIAL_ADMIN_*` env in `.env.example` under a clearly-marked "only used by CLI scripts" block. |

Anywhere else, `grep "process.env" apps/backend/src --include='*.ts'` should return ZERO hits (verified post each change).

### Production secret enforcement

[`configuration.ts`](../../apps/backend/src/config/configuration.ts) calls `assertProductionSecrets()` at factory invocation. When `NODE_ENV=production` it refuses to boot if any of `SESSION_SECRET / DB_PASSWORD / STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY` is unset OR still at its dev fallback. `SESSION_SECRET` also length-checked ≥ 32 bytes. The `DEV_FALLBACKS` constant at the top of the file is the exhaustive list — extend it whenever you add a new secret.

```
[config] Refusing to start: NODE_ENV=production but the following
secrets are missing or still at insecure defaults — SESSION_SECRET
(unset), DB_PASSWORD (still at dev default). Wire each from AWS
Secrets Manager via the ECS task definition.
```

A loud crash beats silent insecure operation.

---

## Application Bootstrap

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(helmet());
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || [],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('agrinews API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(configService.get('PORT') || 3000);
}
bootstrap();
```

---

## Architecture

### Layered Dependencies (Downward Only)

```
Controller/DTO/Guard → Service → Repository → Infrastructure
```

Services never import controllers. Repositories never import services. Controllers never access repositories directly. Never use `new` for dependencies — always constructor injection.

### Domain-Driven Modules

```
src/database/entities/                    ← ALL entities live here (shared)
  ├── user.entity.ts                      ← 1 entity = 1 file = 1 source of truth
  ├── ja.entity.ts
  ├── m-code.entity.ts
  └── ...

src/modules/[domain]/                     ← business logic per domain
  ├── [domain].module.ts                  ← imports([Entity]) from @/database/entities
  ├── [domain].controller.ts
  ├── [domain].service.ts
  ├── dto/
  │   ├── create-[entity].dto.ts
  │   ├── update-[entity].dto.ts
  │   └── [entity]-response.dto.ts
  └── exceptions/
```

```typescript
import { User } from '@/database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],   // module that CRUDs User registers it
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**Entity placement (mandatory)**:

1. Every `*.entity.ts` lives in `src/database/entities/`. NEVER under `src/modules/<x>/entities/`.
2. **Owner module** = the module that calls `TypeOrmModule.forFeature([Entity])`. Other modules that need the entity (FK target, relation, repository) IMPORT it from `@/database/entities/<name>.entity` — never redefine.
3. **Cross-module references** (e.g. `m_tanka.ja_id` FK to `m_ja`):
   ```typescript
   // src/database/entities/tanka.entity.ts
   import { Ja } from '@/database/entities/ja.entity';
   @ManyToOne(() => Ja, { onDelete: 'RESTRICT' }) ja: Ja;
   ```
4. **One entity per file**. Filename matches table singular (`user.entity.ts` for `users`, `m-code.entity.ts` for `m_code`). The `@Entity('table')` decorator on a given table must appear EXACTLY once across the whole repo.

Avoid global modules except cross-cutting concerns (ConfigModule, LoggingModule). Extract shared logic to separate module if circular dependency detected.

### Service Pattern

```typescript
@Injectable()
export class DokusyaService {
  private readonly logger = new Logger(DokusyaService.name);

  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
  ) {}

  async findAll(query: PaginationDto, scope: DataScope) {
    const qb = this.dokusyaRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.hanbaiten', 'h');

    // DataScope filter (see security.md Layer 2)
    if (scope.jaId) {
      qb.andWhere('d.jaId = :jaId', { jaId: scope.jaId });
    }
    if (scope.kanriShitenId) {
      qb.andWhere('d.kanriShitenId = :ksId', { ksId: scope.kanriShitenId });
    }

    const [data, total] = await qb
      .take(query.per_page)
      .skip((query.page - 1) * query.per_page)
      .orderBy(`d.${query.sort_by}`, query.sort_order)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: query.page,
        per_page: query.per_page,
        total_pages: Math.ceil(total / query.per_page),
      },
    };
  }

  async findById(id: string): Promise<Dokusya> {
    const dokusya = await this.dokusyaRepo.findOne({ where: { id }, relations: ['hanbaiten'] });
    if (!dokusya) throw new DokusyaNotFoundException(id);
    return dokusya;
  }

  async create(dto: CreateDokusyaDto): Promise<Dokusya> {
    const entity = this.dokusyaRepo.create(dto);
    return this.dokusyaRepo.save(entity);
  }

  async update(id: string, dto: UpdateDokusyaDto, roleCode: string): Promise<Dokusya> {
    const dokusya = await this.findById(id);
    // Field-level restriction (see security.md Layer 3)
    const filtered = filterAllowedFields(dto, 'dokusya', roleCode);
    Object.assign(dokusya, filtered);
    return this.dokusyaRepo.save(dokusya);
  }
}
```

Service rules: contains ALL business logic. Never import Controller. Never access HTTP Request/Response. Throw domain exceptions.

#### Service-layer common helpers (USE THESE — do not re-implement)

Recurring patterns across services have centralized helpers — service files should import from `@/common/...` rather than carry local copies.

| Concern | Helper | Replaces |
|---|---|---|
| Pagination response shape | `paginate(data, total, page, per_page)` from `@/common/utils/paginate` | Inline `{ data, meta: { total, page, per_page, total_pages } }` |
| Audit context build | `buildAuditCtx(session, req, screen, table, targetId)` from `@/common/utils/audit-context` | Local `function buildAuditCtx(...)` per service |
| FK-conflict-blocking-delete | `assertNoRelatedRows(dataSource, tables, fkField, fkValue)` from `@/common/utils/fk-conflict` | Local `private async assertNoRelatedRows()` per service |
| Not-found exception | `new NotFoundException('JA')` from `@/common/exceptions/common.exceptions` | Local `function jaNotFound()` factory + `@nestjs/common`'s NotFoundException |
| Duplicate-code exception | `new DuplicateCodeException('JAコード', value)` from `@/common/exceptions/common.exceptions` | Inline `BadRequestException({ code: 'DUPLICATE_CODE', message: ... })` |
| Conflict (FK) exception | `new ConflictException()` from `@/common/exceptions/common.exceptions` | Same |
| DataScope filter | `applyJaScope(qb, alias, jaIdField, session)` / `applyBranchScope(...)` from `@/common/utils/data-scope` | Inline role switch |
| Single-record scope check | `assertJaScope(recordJaId, session, label?)` / `assertBranchScope(...)` | Inline role switch |
| Field-level restriction | `filterAllowedFields(dto, model, roleCode)` from `@/common/utils/field-restrictions` (uses module-local `FIELD_RESTRICTIONS` config) | Inline allow-list |
| Type-safe value extract after filter | `pickString` / `pickBool` / `pickNumber` from `@/common/utils/pick` — `pickString(filtered, 'ja_name', before.jaName)` returns the new value when role-allowed, falls back to the original entity value otherwise | Per-service `private pickString/Bool/Number` |
| IP/UA extract | `extractAuditContext(req)` from `@/common/utils/audit-context` | `String(req?.ip ?? '')` etc. |
| m_code value validation | `assertMCodeValues(this.codeService, [{ field, value, category, label }, ...])` from `@/common/utils/m-code-validation` — throws ONE `VALIDATION_ERROR` aggregating every bad field, shape matches `ValidationPipe` output so `useApiForm` maps to `<a-form-item :help>` uniformly | Per-service `private assertCodeValues()` + inline `HttpException` |
| Single m_code lookup (non-validation) | `this.codeService.has('CATEGORY', value)` or `.label('CATEGORY', value)` (CodeService is `@Global()`) | Direct `m_code` query |

**Important — do NOT use `@nestjs/common`'s exception classes** (`NotFoundException`, `ConflictException`, `BadRequestException` from there) for business errors. They produce a different exception class than the project's `DomainException`-based ones, causing naming collisions and inconsistent body shape. Always import from `@/common/exceptions/common.exceptions` so `GlobalExceptionFilter` extracts `code` cleanly.

What stays IN the service (module-specific, not extractable):

- `SCREEN_NAME` / `TABLE_NAME` / `SCREEN_NAME_SCRXXX` constants — module identity
- `SORT_COLUMN_MAP` — column whitelist for the sortable list
- `RELATED_TABLES` — array of FK child tables for delete-blocking (passed to `assertNoRelatedRows`)
- `FIELD_RESTRICTIONS` — role × allowed-field config (passed to `filterAllowedFields`)

What lives in a SIBLING file inside the module folder:

- `<module>.mapper.ts` — pure functions like `toJaResponse(ja, todofukenName)` that map TypeORM entity (camelCase) → response DTO (snake_case). NO Nest DI, NO repo calls — service stays the orchestrator, mapper stays a pure transform. Tests can import the mapper directly without booting Nest. See [`apps/backend/src/modules/ja/ja.mapper.ts`](../../apps/backend/src/modules/ja/ja.mapper.ts) as the canonical example.

### Dependency Injection

```typescript
// ✅ Constructor injection
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
}

// ❌ Manual instantiation
private repository = new UsersRepository();
```

---

## TypeScript Standards

- Strict mode, no `any` without justification
- 2 spaces indentation, 100 char max line, single quotes, semicolons, trailing commas
- Explicit return types on public methods
- Import order: Node built-ins → NestJS → third-party → internal
- Always async/await — avoid promise chains

### Path aliases — `@/` (src) and `@test/` (test)

The backend uses two path aliases configured in `tsconfig.json` + `jest.config.ts`:

| Alias | Resolves to | Use for |
|---|---|---|
| `@/...` | `apps/backend/src/...` | All imports from production source |
| `@test/...` | `apps/backend/test/...` | Imports from `test/fixtures`, `test/utils`, `test/integration` |

**Mandatory**: NEVER use `'../...'` relative imports that traverse the source tree. The only acceptable relative imports are:
- `'./sibling-file'` — same directory
- (Nothing else.)

```ts
// ✅ Correct
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { SessionPayload } from '@/modules/auth/session.service';
import { buildJa } from '@test/fixtures/ja.factory';
import { createIntegrationApp } from '@test/utils/create-integration-app';
import { Helper } from './helper';   // same-folder sibling — fine

// ❌ Wrong — relative paths going up
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { buildJa } from '../../../test/fixtures/ja.factory';
```

Why: refactoring (moving a file, renaming a folder) doesn't break imports; grep results are predictable; reading an import line tells you exactly where the symbol lives without counting `../`s.

### Naming

| Type | Format | Example |
| --- | --- | --- |
| File | `kebab-case` | `users.controller.ts` |
| Class | PascalCase | `UsersModule`, `CreateUserDto` |
| Method | camelCase | `findById` |
| Constant | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |

### JSDoc on Public APIs

```typescript
/**
 * Update user by ID.
 * @param id - User ID
 * @param dto - Update data
 * @throws NotFoundException when user not found
 */
async updateUser(id: string, dto: UpdateUserDto): Promise<User> {}
```

---

## API Design

### Contract-First

1. Define OpenAPI spec (Swagger decorators) FIRST
2. Implement controller + DTO
3. Generate frontend client via Orval

### URL Structure

- kebab-case paths: `/api/v1/user-profiles`
- Plural nouns: `/api/v1/users`
- Nested resources: `/api/v1/users/:id/orders`
- Version prefix: applied centrally via `app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] })` in [`main.ts`](../../apps/backend/src/main.ts) — controllers declare unprefixed paths

### Version prefix — `setGlobalPrefix`, NOT per-controller

The `api/v1` prefix lives in ONE place: [`apps/backend/src/common/constants/api.constants.ts`](../../apps/backend/src/common/constants/api.constants.ts) as `API_PREFIX`. `main.ts` calls `app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] })`; the integration test boot ([`createIntegrationTestApp`](../../apps/backend/test/utils/create-integration-app.ts)) and per-controller specs mirror it.

```ts
// ✅ Correct — controller declares unprefixed path
@Controller('auth')
export class AuthController { ... }

// ❌ Wrong — duplicates the version prefix
@Controller('api/v1/auth')
```

`@Controller('health')` is the ONE exception — health probe stays unversioned (`GET /health`) so AWS ECS / ALB target group can hit it directly without coupling to API versioning.

**Tests** assert against the literal HTTP path (`/api/v1/auth/login`) — the URL is the contract, and integration tests must catch breaking changes. For new tests, prefer the `apiUrl()` helper from [`@test/utils/api-url`](../../apps/backend/test/utils/api-url.ts):

```ts
import { apiUrl } from '@test/utils/api-url';
await request(app).post(apiUrl('auth/login')).send(body);   // → /api/v1/auth/login
```

NEVER constantize individual route paths into a `route-table.ts` map (`API_ROUTES.AUTH.LOGIN = 'login'`). It harms readability at the call site, requires duplicate path-pattern + concrete-URL helpers for `:id` parameters, weakens integration tests (asserting a constant matches itself instead of the HTTP contract), and Swagger / Orval already provide central URL discovery via `/api/docs` + `swagger.json`.

### HTTP Methods & Status Codes

| Method | Usage | Success |
| --- | --- | --- |
| GET | Read (idempotent) | 200 |
| POST | Create | 201 |
| PUT | Replace / Full update | 200 |
| PATCH | Partial update | 200 |
| DELETE | Remove (soft delete) | 200 |

| Error | Meaning |
| --- | --- |
| 400 | Bad Request / Validation failed |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate limited |

### Controller Pattern

```typescript
@ApiTags('users')
@Controller('api/v1/users')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('dokusya.view')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll(@Query() query: PaginationDto): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Post()
  @Permissions('dokusya.create')
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }
}
```

Controller rules: HTTP only — no business logic. Every endpoint needs `@ApiOperation`, `@ApiResponse`, `@Permissions()`.

### DTO & Validation

```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;
}
```

Rules: `@ApiProperty()` on ALL fields. `forbidNonWhitelisted: true`. Validate at DTO layer — NOT in Service. Never expose password/secrets in response DTO.

### Response Format

**Single object:**
```json
{ "data": { ... } }
```

**List with pagination:**
```json
{
  "data": [ ... ],
  "meta": { "total": 100, "page": 1, "per_page": 20, "total_pages": 5 }
}
```

ALWAYS build this shape via the [`paginate()`](../../apps/backend/src/common/utils/paginate.ts) helper — never construct `{ data, meta: { ... } }` inline. Adding a new meta field (e.g. `has_next`) then ripples to all list endpoints automatically.

```ts
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';

async findAll(query: SearchDto): Promise<PaginatedResponse<JaListItem>> {
  const [rows, total] = await qb.getManyAndCount();
  return paginate(rows.map(toResponse), total, page, per_page);
}
```

**Delete success:**
```json
{ "message": "正常に削除しました" }
```

### Response shape — explicit at the controller, never via interceptor

Controllers MUST return the final shape (`return { data }`, `return { data, message }`, `return paginate(...)`). Do NOT introduce a `TransformInterceptor` that auto-wraps service output in `{ data }`:

- Hides the response shape from the controller — reader has to know about a global interceptor to predict the body
- Breaks `@ApiResponse({ type: JaResponseDto })` accuracy — Swagger declares the type of `data` content; magic wrapping makes the doc lie about runtime body
- Makes integration tests harder to reason about (`expect(res.body).toEqual({ data: ... })` becomes "is the interceptor wired in this spec?")

The error path is the opposite — `GlobalExceptionFilter` IS the canonical handler for `{ error_code, message, errors? }`. Controllers/services NEVER hand-roll error JSON; throw a `DomainException` (or any `HttpException` with a `code` field) and the filter normalizes.

### BE message convention — verb-only for success, subject + value for error (MANDATORY)

Two distinct rules depending on whether the message is a SUCCESS toast trigger or a diagnostic ERROR.

#### Success message (response body `{ message: ... }`)

Verb-only. NEVER prefix with the entity name (`JA`, `単価`, `支店`, `管理支店`, `アカウント`, `お知らせ`, `販売店`, `ロール`, etc.) or the adverb `正常に`.

| ✅ Correct | ❌ Wrong |
|---|---|
| `return { message: '登録しました。' };` | `return { message: 'JAを登録しました。' };` |
| `return { message: '更新しました。' };` | `return { message: '管理支店を更新しました。' };` |
| `return { message: '削除しました。' };` | `return { message: '正常に削除しました。' };` |

Reason: the user clicked a button on a specific screen. Screen + button context imply the subject. Adding `JAを` makes every toast read like Captain Obvious and breaks the FE/BE contract — FE's `useNotify().created()` / `.updated()` / `.deleted()` produce verb-only strings; BE message must match so no string-juggling at the boundary.

The 3 canonical literals project-wide: `'登録しました。'`, `'更新しました。'`, `'削除しました。'`. Anything else is custom copy and must justify why the verb alone isn't enough (e.g. `'パスワードを更新しました。ログイン画面に移動します。'` adds redirect info; `'MFAを有効にしました。'` needs subject because `有効/無効` is ambiguous without it).

The customer's `screen-design.md` MSG catalog (e.g. `ACSMS-MSG-005-002`) MUST also use the verb-only form — it's the canonical source the testcase + api docs reference.

#### Error message (DomainException / HttpException)

Subject + concrete value when the user needs to fix a specific record:

```ts
// ✅ Diagnostic — names the field + value so user can fix
throw new DuplicateCodeException('JAコード', dto.ja_code);
//   → 'JAコード「1301002001」はすでに登録されています。'

// ✅ Subject-only — generic "not found" doesn't have a value to echo back
throw new JaNotFoundException(id);
//   → '指定されたJAが見つかりません。'

// ❌ Mystery error — user can't tell what conflicted
throw new BadRequestException({ message: 'すでに登録されています。' });
```

Use the template factory at [`common.exceptions.ts`](../../apps/backend/src/common/exceptions/common.exceptions.ts):
```ts
`${resource}「${value}」はすでに登録されています。`   // duplicate
`指定された${resource}が見つかりません。`              // not found
`関連データが存在するため${resource}を削除できません。` // FK conflict
```

The asymmetry between success (verb-only) and error (subject + value) is intentional: success toasts are background confirmation where context is obvious; error messages are the user's ONLY signal about what's wrong, so they need to be self-contained.

### Nullable field serialization (MANDATORY)

API response values MUST reflect the database column's actual storage — never coerce between `null` and `""`.

- Column declared **NOT NULL** (even when UI-optional) — stores `""` when empty → API returns `""`
- Column declared **nullable** (`NULL許容=〇` in `docs/database/database-design.md`) — stores `NULL` when absent → API returns `null`

TypeORM entity + response DTO must preserve the distinction:

```typescript
// ✅ Correct — entity types match DB schema
@Entity('m_ja')
export class Ja {
  @Column({ type: 'text' }) biko: string;             // NOT NULL → always a string (maybe '')
  @Column({ type: 'varchar', length: 7, nullable: true })
  jastemKozaNo: string | null;                        // nullable → null when absent
  @Column({ type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}

// ✅ Response DTO preserves the same types
export class JaResponseDto {
  @ApiProperty() biko: string;                        // not nullable → ''
  @ApiProperty({ nullable: true }) jastem_koza_no: string | null;
  @ApiProperty({ nullable: true }) updated_at: string | null;
}
```

**Do NOT**:
- Use `?:` (optional) on response DTO fields to hide absent values — always emit the key with the correct value (`""` or `null`). Clients rely on stable shape.
- Transform `""` → `null` (or the reverse) in a class-transformer `@Transform` decorator. The storage contract is the source of truth.
- Use `ClassSerializerInterceptor` with `exposeDefaultValues: true` — it can silently convert undefined to empty string and mask real nulls. Return plain entity-mapped DTOs.

JSON examples in api.md MUST follow the same rule (see `.claude/skills/gen-api-doc/SKILL.md` Nullable column policy).

**Error (flat format):**

Common errors — FE handles in axios interceptor (1 place):

| HTTP | error_code | message | FE handling |
| --- | --- | --- | --- |
| 400 | `BAD_REQUEST` | リクエストパラメータが不正です | Show toast |
| 401 | `UNAUTHORIZED` | セッションが切れました。再度ログインしてください | Redirect → /login |
| 403 | `FORBIDDEN` | この画面へのアクセス権限がありません | Redirect → /403 |
| 403 | `DATA_SCOPE_VIOLATION` | このデータへのアクセス権限がありません | Show toast |
| 400 | `VALIDATION_ERROR` | 入力値が不正です | Map `errors[]` → form fields |
| 429 | `TOO_MANY_REQUESTS` | リクエスト回数が上限を超えました | Show toast + disable button |
| 500 | `INTERNAL_SERVER_ERROR` | システムエラーが発生しました | Show toast |

Resource errors — FE handles per screen:

| HTTP | error_code | message | FE handling |
| --- | --- | --- | --- |
| 404 | `NOT_FOUND` | 指定された{resource}が見つかりません | Redirect → list |
| 400 | `DUPLICATE_CODE` | 同一のコードが既に登録されています | Highlight code field |
| 409 | `CONFLICT` | 関連データが存在するため削除できません | Show modal |

Validation error with field details:
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です",
  "errors": [
    { "field": "email", "message": "メールアドレスの形式が不正です" },
    { "field": "tanka_code", "message": "単価コードは必須です" }
  ]
}
```

### Pagination DTO (mandatory for list queries)

```typescript
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  per_page?: number = 20;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  sort_order?: 'asc' | 'desc' = 'desc';
}
```

---

## Master code values (m_code)

The project stores enumerated values (性別, 単価種類, 支払方法, ログ種別, お知らせ種別 … 21 categories) in the `m_code` table — NOT as PostgreSQL ENUM types or TypeScript `enum` classes. Seeder data lives in `docs/database/seeder.md §5`.

### Rules (mandatory)

- Column that stores a code value is typed `INTEGER` (or `VARCHAR` when DB schema says so), NOT `@Column({ type: 'enum' })`.
- The 21 categories split into two groups by whether the values participate in branching logic. Both share the `m_code` table for the customer-editable label, but differ in whether a TS enum exists alongside.
- `CodeService` caches the full `m_code` table in memory at `onModuleInit()` and exposes `getAll()`, `getByCategory()`, `has()`, `getLabel()`. It is `@Global()`, so any module can inject it without re-importing.
- `CodeController` (`GET /api/v1/codes`) returns the cached map; FE calls this once per session and caches in Pinia. The controller does NOT accept mutations — m_code is seeded, not CRUD'd (yet).
- Never query `m_code` directly from a feature module's repo/service. Always go through `CodeService`.

### Group A — fixed-set categories with branching logic

Categories whose values are baked into branching logic (`if (status === 1) …`,
SQL `WHERE status = 2`, switch over result codes) get a TS constant at
[`apps/backend/src/common/enums/<name>.enum.ts`](../../apps/backend/src/common/enums/), mirrored at
[`apps/frontend/src/constants/enums/<name>.ts`](../../apps/frontend/src/constants/enums/).
The integration test [`apps/backend/test/integration/enum-sync.spec.ts`](../../apps/backend/test/integration/enum-sync.spec.ts)
parses both sides and fails CI on drift.

Current Group A categories (commit-time list — extend when adding):

| Category | Constant | DB column |
|---|---|---|
| `LOG_TYPE` | `LogType` | `t_log.log_type` |
| `RESULT_STATUS` | `ResultStatus` | `t_log.result_status` |
| `LOGIN_RESULT` | `LoginResult` | `t_login_log.login_result` |
| `OTP_TYPE` | `OtpType` | `t_mfa_otp.otp_type` |
| `OSHIRASE_STATUS` | `OshiraseStatus` | `t_oshirase.status` |
| `PUBLISH_LOCATION` | `PublishLocation` | `t_oshirase.publish_location` |

File pattern (`const … as const` + derived type):

```ts
// apps/backend/src/common/enums/oshirase-status.enum.ts
export const OshiraseStatus = {
  DRAFT: 1,
  PUBLIC: 2,
  HIDDEN: 3,
} as const;
export type OshiraseStatus = (typeof OshiraseStatus)[keyof typeof OshiraseStatus];
```

Naming: PascalCase identifier (TS type-like), UPPER_SNAKE_CASE members
(fixed-constant convention per `naming-conventions.md`). The same name
serves as both the value (`const`) and the type alias — TS merges them
across the value/type namespaces.

We deliberately use `const … as const` instead of `enum` because:
- `enum` emits IIFE runtime code, blocking Node native TS
  (`--experimental-strip-types`) and TS `--erasableSyntaxOnly`.
- Numeric `enum` adds reverse-mapping keys; `Object.values(LogType)`
  returns `[1, 2, 3, 4, 'USER_OPERATION', 'SYSTEM', 'ERROR', 'FILE_OPERATION']`
  (8 entries, 4 noise) — silently breaks any `@IsIn(Object.values(...))`,
  iteration, or test assertion against length.
- TS community direction is `as const` (Vue, Vite, Vitest, Stripe SDK,
  Vercel apps). NestJS docs still show `enum` but the trade-offs above
  apply to any project.

Usage pattern:

```ts
import { OshiraseStatus } from '@/common/enums';

// DTO — validate value is one of the constant members
@IsIn(Object.values(OshiraseStatus), { message: 'お知らせステータスの値が不正です。' })
status: OshiraseStatus;
// (NOTE: @IsEnum requires a TS `enum`. With const-as-const use @IsIn.)

// Service — branching logic uses the constant
if (oshirase.status === OshiraseStatus.PUBLIC) { ... }

// QueryBuilder — bind value as parameter (don't inline)
.where('o.status = :status', { status: OshiraseStatus.PUBLIC })
```

Adding / removing a value to a Group A category requires:
1. Edit `apps/backend/src/common/enums/<name>.enum.ts`
2. Edit `apps/frontend/src/constants/enums/<name>.ts` (mirror)
3. Add the matching `m_code` row via migration (so `CodeService.has()` accepts it and the customer label is editable)
4. Update branching logic / `switch` exhaustiveness checks
5. Redeploy

Renaming the customer-facing label (`m_code.code_name`) does NOT require any of the above — only DB update + `codeService.reload()`.

### Group B — extensible categories without enum

Categories where the customer can extend values at runtime (new payment
method, new subscriber type, etc.). NO TS enum — purely DB-validated.

Current Group B categories include: `DOKUSYA_SHUBETSU`, `TETSUZUKI_SHURUI`,
`DENSHI_DOKUSYA_SHUBETSU`, `SHIHARAI_HOHO`, `GENDER`, `YOKIN_SHUBETSU`,
`ZEI_KUBUN`, `TANKA_TYPE`, `ITAKU_KUBUN`, `TESURYO_KUBUN`, `YUBIN_KUBUN`,
`MAIL_MAGAZINE_FLG`, `OSHIRASE_TYPE`, `FILE_UPLOAD_STATUS`, `DOWNLOAD_TYPE`.

Pattern:

```ts
// Entity — store as int / varchar
@Column({ name: 'tanka_type', type: 'int' })
tankaType: number;

// DTO — shape check only
@Type(() => Number)
@IsInt()
tanka_type: number;

// Service — runtime allow-list via CodeService
if (!this.codeService.has('TANKA_TYPE', dto.tanka_type)) {
  throw new BadRequestException({
    error_code: 'VALIDATION_ERROR',
    message: '入力値が不正です',
    errors: [{ field: 'tanka_type', message: '単価種類の値が不正です' }],
  });
}
```

### Response serialization — DO NOT include `*_label` fields on authenticated endpoints

Authenticated endpoints (Tanka CRUD, Hanbaiten CRUD, JA CRUD, Account, …) MUST serialize ONLY the code value:

```json
// ✅ Correct — authenticated endpoint
{ "tanka_type": 1, "tanka_code": "T001", ... }

// ❌ Wrong — redundant label
{ "tanka_type": 1, "tanka_type_label": "新聞購読料", ... }
```

The FE looks up the label via `useCodesStore().label('TANKA_TYPE', value)` (the store is hydrated once after login and refreshed on `POST /codes/reload`). Reasons:

- m_code is runtime-editable. Customer renames `m_code.code_name` in the DB → calls reload → FE store reflects new label immediately. If BE serialized `_label`, the response cache (or simply the moment-of-fetch snapshot) would diverge from the FE's m_code cache for in-flight rows.
- Extra payload size (`n rows × m label fields`) for no FE benefit (FE ignores the field).
- BE has to JOIN / lookup `m_code` per list response — extra DB cost.

**Exception — public (unauthenticated) endpoints**: when the client hasn't logged in yet (login screen oshirase, public landing info, etc.), it has no m_code cache → BE MUST serialize the label. Inject `CodeService` (it's `@Global`) and call `codeService.getLabel('CATEGORY', value)`. Example: `OshiraseService.findPublic()` — public consumers of the login-screen banner.

`gen-api-doc` skill checklist (`.claude/skills/gen-api-doc/SKILL.md`) enforces this: response DTO MUST NOT have `<field>_label` columns unless the endpoint is explicitly marked public.

### Choosing Group A vs Group B (design decision when adding a category)

All three must hold for Group A — otherwise default to Group B:

1. The full set of values is fixed by business design at code-write time.
2. Code branches on the value (BE service / FE template).
3. A new value would require code review (new logic branch).

Errs on the side of Group B — moving B → A later is a small refactor
(add the enum); moving A → B later is harder (must remove all branching
logic that assumed the closed set).

### Entity column example

```ts
// m_tanka.tanka_type stores 1 (購読料) or 2 (配達手数料) — see m_code.code_category='TANKA_TYPE'
@Column({ name: 'tanka_type', type: 'int' })
tankaType: number;
```

### DTO + service validation pattern

```ts
// dto/create-tanka.dto.ts
export class CreateTankaDto {
  @ApiProperty({ description: '単価種類（m_code.code_category=TANKA_TYPE）', example: 1 })
  @Type(() => Number)
  @IsInt()
  tanka_type: number;
}

// tanka.service.ts
async create(dto: CreateTankaDto, session: SessionPayload, req: Request) {
  if (!this.codeService.has('TANKA_TYPE', dto.tanka_type)) {
    throw new BadRequestException({
      error_code: 'VALIDATION_ERROR',
      message: '入力値が不正です',
      errors: [{ field: 'tanka_type', message: '単価種類の値が不正です' }],
    });
  }
  // ... continue with the normal create flow
}
```

### Test pattern

Unit tests for service methods that call `CodeService.has()` mock the dependency:

```ts
const codeService = { has: vi.fn().mockReturnValue(true) };
Test.createTestingModule({
  providers: [
    TankaService,
    { provide: CodeService, useValue: codeService },
    // ...
  ],
});
```

Use real code values from `seeder.md §5` in assertions — e.g. `tanka_type: 1` (購読料), NOT `TankaType.KODOKU`.

---

## Database & TypeORM

### Entity Conventions

```typescript
@Entity('users')
@Index(['email'])
@Index(['role', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
```

Rules: UUID primary keys. Always `createdAt`, `updatedAt`. Soft delete via `@DeleteDateColumn()`. No business logic in entities. Table names: `snake_case` plural.

### Timestamp policy (MANDATORY)

**監査列・ログ列等のイベント時刻は TIMESTAMPTZ（JST 運用：Asia/Tokyo）を標準とする.**

Every column representing a moment in time — `created_at`, `updated_at`,
`deleted_at`, `log_datetime`, `login_datetime`, `password_updated_at`,
`last_login_at`, `account_lock_at`, `expired_at`, `publish_start_date`,
`publish_end_date`, … — MUST use `TIMESTAMPTZ`. Never `TIMESTAMP`
(without timezone), never `DATE`+`TIME` split, never `BIGINT` epoch.

Why TIMESTAMPTZ:
- Postgres stores TIMESTAMPTZ internally as UTC and converts on read
  using the session's `timezone` setting. Storage is timezone-safe even
  when ops moves between regions.
- TypeORM round-trips TIMESTAMPTZ → JS `Date` (UTC ms) cleanly. Plain
  `TIMESTAMP` loses the offset and the value silently shifts when ECS
  is deployed in any non-JST region.

Operation timezone is **Asia/Tokyo (JST)** end-to-end:
- Backend container `TZ=Asia/Tokyo` so `new Date()`, `Date#getHours()`,
  `dayjs()` default to JST in business logic + log output.
- Postgres session `SET timezone='Asia/Tokyo'` (set per-connection via
  TypeORM `extra.options: '-c timezone=Asia/Tokyo'`) so psql-side and
  `NOW()`/`CURRENT_TIMESTAMP` defaults render JST.
- API responses serialize Dates as ISO 8601 with `+09:00` offset (the
  default once `TZ=Asia/Tokyo` is set).
- Frontend `formatDate` / `formatDateTime` use `dayjs(value).format(...)`
  which honours the browser TZ; for JP-only deployments this is fine,
  for cross-region clients add `dayjs.tz('Asia/Tokyo')` via the timezone
  plugin.

TypeORM entity declaration — explicit `type: 'timestamptz'` on
`@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` is
MANDATORY (the decorator's default is `TIMESTAMP` on Postgres):

```typescript
@CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
@UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
@DeleteDateColumn({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;

// Custom audit / event columns
@Column({ name: 'log_datetime', type: 'timestamptz' }) logDatetime: Date;
@Column({ name: 'expired_at', type: 'timestamptz' }) expiredAt: Date;
```

Migration DDL mirrors this:
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ DEFAULT NULL,
```

### DB Naming

> Full naming rules in `naming-conventions.md`. Quick reference:

Tables: `snake_case` plural. Columns: `snake_case`. Indexes: `idx_{table}_{col}`. FK: `fk_{child}_{parent}`.

### Query Best Practices

Never write raw SQL. Always use TypeORM Repository or QueryBuilder.

**Select only needed fields:**
```typescript
const user = await this.userRepo.findOne({
  where: { id },
  select: ['id', 'email', 'name'],
});
```

**N+1 Prevention:**
```typescript
// ❌ N+1
for (const user of users) {
  user.orders = await this.orderRepo.find({ where: { userId: user.id } });
}

// ✅ Eager loading
const users = await this.userRepo.find({ relations: ['orders'] });

// ✅ QueryBuilder for complex joins
const users = await this.userRepo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.orders', 'order')
  .where('user.role = :role', { role: Role.ADMIN })
  .getMany();
```

**Parameterized queries (SECURITY):**
```typescript
.where('user.email = :email', { email })    // ✅ Safe
.query(`SELECT * FROM users WHERE email = '${email}'`)  // ❌ SQL injection
```

**Pagination (mandatory):**
```typescript
const [data, total] = await this.userRepo.findAndCount({
  take: per_page,
  skip: (page - 1) * per_page,
  order: { [sort_by]: sort_order },
});
```

### Transactions

```typescript
await this.dataSource.transaction(async (manager) => {
  const order = manager.create(Order, orderData);
  await manager.save(order);
  await manager.decrement(Product, { id: productId }, 'stock', 1);
});
```

**MANDATORY — Main DML + Audit log must share one transaction:**

Every CREATE / UPDATE / DELETE service method that writes to `t_log` MUST wrap the main DML AND the `AuditLogService.logOperation(...)` call inside a single `dataSource.transaction(...)` block. If either the business write or the audit INSERT fails, both must roll back so the audit trail never disagrees with actual state.

```typescript
// ✅ Correct — atomic business + audit
async create(dto: CreateTankaDto, user: SessionPayload, req: Request): Promise<Tanka> {
  return this.dataSource.transaction(async (manager) => {
    const tanka = manager.create(Tanka, { ...dto, jaId: user.ja_id });
    const saved = await manager.save(tanka);

    await this.auditLog.logOperation({
      logType: 1,
      accountId: user.account_id,
      jaId: user.ja_id,
      gamenName: '単価マスタ登録画面',
      operation: 'CREATE',
      resultStatus: 1,
      targetId: saved.tankaId,
      targetTable: 'm_tanka',
      afterValue: saved,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }, manager);   // ← AuditLogService MUST accept an optional EntityManager
    return saved;
  });
}

// ❌ WRONG — audit log outside transaction: stale audit if business write rolls back
await this.repo.save(tanka);                 // commits
await this.auditLog.logOperation(...);       // may fail separately
```

**AuditLogService signature**: accept an optional `EntityManager` so callers can opt into the surrounding transaction. When omitted, it uses its own repository (for error-log paths below).

**Error log (`log_type = 3`) runs OUTSIDE the transaction**. When the transaction is rolling back, you still need to record that an attempt happened. Catch, rollback, then log:

```typescript
try {
  await this.dataSource.transaction(async (m) => { /* business + audit */ });
} catch (err) {
  // Fire-and-forget outside the rolled-back tx so the error log survives
  await this.auditLog.logOperation({
    logType: 3,
    accountId: user.account_id,
    operation: 'CREATE',
    resultStatus: 2,
    errorMessage: (err as Error).message,
    ...ctx,
  });
  throw err;  // propagate to global exception filter
}
```

### Connection Management

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  extra: { max: 10, idleTimeoutMillis: 30000 },
})
```

### Migrations

```bash
npm run migration:generate -- -n AddUserRole
npm run migration:run
npm run migration:revert
```

Never `synchronize: true` in production. Migration files are version-controlled and immutable.

---

## Error Handling

### Domain Exception Base

```typescript
export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ message, code }, status);
  }
}
```

### Domain-Specific Exceptions

```typescript
// Resource not found — use generic NOT_FOUND code
export class TankaNotFoundException extends DomainException {
  constructor(id: string) {
    super('指定された単価が見つかりません', 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class JaNotFoundException extends DomainException {
  constructor(id: string) {
    super('指定されたJAが見つかりません', 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

// Conflict — use specific codes
export class DuplicateCodeException extends DomainException {
  constructor(resource: string) {
    super(`同一の${resource}コードが既に登録されています`, 'DUPLICATE_CODE', HttpStatus.BAD_REQUEST);
  }
}

export class ConflictException extends DomainException {
  constructor() {
    super('関連データが存在するため削除できません', 'CONFLICT', HttpStatus.CONFLICT);
  }
}

// Auth
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('メールアドレスまたはパスワードが正しくありません', 'INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
  }
}

// DataScope violation
export class DataScopeViolationException extends DomainException {
  constructor() {
    super('このデータへのアクセス権限がありません', 'DATA_SCOPE_VIOLATION', HttpStatus.FORBIDDEN);
  }
}
```

Throw domain exceptions in Service layer. Never throw raw `HttpException` or generic `Error`.

Exception naming: `{Resource}NotFoundException`, `DuplicateCodeException`, `HasRelatedDataException`, `DataScopeViolationException`.

### Global ExceptionFilter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    this.logger.error({
      event: 'api.error', statusCode: status, code,
      path: request.url, method: request.method,
      userId: request.user?.id, requestId: request.headers['x-request-id'],
    });

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'An unexpected error occurred';
    }

    response.status(status).json({ error_code: code, message });
  }
}
```

### Validation Error Factory

```typescript
// Priority picker — see "DTO validation gotchas #2" below for why this
// is a single-message-per-field design, not a join.
const CONSTRAINT_PRIORITY = [
  'isDefined', 'isNotEmpty', 'isNotEmptyObject',
  'isString', 'isNumber', 'isInt', 'isBoolean', 'isArray',
  'isEnum', 'isEmail', 'isUuid',
];
const pickMessage = (constraints: Record<string, string>): string => {
  for (const key of CONSTRAINT_PRIORITY) {
    if (constraints[key]) return constraints[key];
  }
  return Object.values(constraints)[0] ?? '入力値が不正です';
};

app.useGlobalPipes(
  new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const details = errors.map((e) => ({
        field: e.property,
        message: pickMessage(e.constraints || {}),
      }));
      // CRITICAL — return an HttpException instance, NOT a plain
      // object. NestJS does `throw factory(errors)` internally; a
      // plain object isn't an Error → GlobalExceptionFilter falls
      // through to its 500 branch and the user sees
      // "システムエラーが発生しました" instead of the actual
      // validation messages. (Burned us once on SCR-005, now
      // documented.)
      return new HttpException(
        { code: 'VALIDATION_ERROR', message: '入力値が不正です', errors: details },
        HttpStatus.BAD_REQUEST,
      );
    },
  }),
);
```

The picker returns ONE message per field (required-class first, then
type checks, then any remaining). Why not `Object.values(...).join(', ')`:

- `useApiForm` on the FE binds a single string to `<a-form-item :help>`,
  and `Object.fromEntries(errors.map(e => [e.field, e.message]))`
  collapses multiple entries to the last anyway — so a comma-joined
  message just produces ugly UX without adding information.
- For an empty `login_id` the join produced
  `"login_id should not be empty, login_id must contain only half-width characters"`
  — TWO messages where the user expects ONE. The picker yields
  `ユーザーIDを入力してください。` because `isNotEmpty` ranks first.
- The ordering also masks inconsequential format errors when the value
  is missing entirely (the format check is irrelevant if there's
  nothing to validate).

### DTO validation gotchas

1. **`@IsOptional()` does NOT skip empty strings.** It only skips
   `null` / `undefined`. Frontend forms commonly send `tel: ""` for
   blank fields → `@Matches(/^\d+$/)` rejects → fails 400 even
   though the field is "optional". Wire a `@Transform` BEFORE
   `@IsOptional()` to coerce blank strings to undefined:

   ```typescript
   import { Transform } from 'class-transformer';

   const blankToUndef = ({ value }: { value: unknown }) =>
     typeof value === 'string' && value.trim() === '' ? undefined : value;

   class CreateDto {
     @Transform(blankToUndef)   // first — strip blanks
     @IsOptional()              // then — skip undefined
     @IsString()
     @Matches(/^\d+$/, { message: '電話番号は半角数字のみで入力してください' })
     tel?: string;
   }
   ```

2. **Every `class-validator` decorator MUST carry a Japanese
   `message`.** Default messages are English (`"login_id should not
   be empty"`, `"must contain only half-width characters"`) and they
   get shipped to end users via `<a-form-item :help>` — it has
   happened. Mandatory rules:
   - Required (`@IsNotEmpty`, `@IsString`, etc.) → use the canonical
     literal from the screen's `## メッセージ情報` table when one
     exists (e.g. `ACSMS-MSG-001-001` →
     `'ユーザーIDを入力してください。'`).
   - Format (`@Matches`, `@IsEmail`, etc.) → write a Japanese sentence
     that names the field (`'パスワードは半角文字のみで入力してください。'`).
   - Length (`@MinLength`, `@MaxLength`, `@Length`) → same: name the
     field and the limit (`'パスワードは8文字以上で入力してください。'`).

   Even if the priority picker (above) hides extra messages, leaving
   English in the DTO leaks the moment a non-prioritised constraint
   fails alone.

3. **`@Length(N, N)` + `@Matches(/^\d{N}$/)` on the same field is
   redundant**, not catastrophic — the picker collapses to one
   message. Still prefer ONE constraint that carries the Japanese
   copy (`@Matches(/^\d{N}$/)` enforces both length and digits).

4. **`@ValidateIf((o, value) => …)` is property-level, not
   per-decorator.** It gates ALL validators on the property,
   including `@IsNotEmpty`. So
   ```typescript
   @IsNotEmpty()
   @ValidateIf((_, v) => typeof v === 'string' && v.length > 0)
   @Matches(/^[\x21-\x7E]+$/)
   ```
   does NOT mean "skip Matches when empty, keep IsNotEmpty" — when
   the value is empty the condition returns false and the property
   silently passes ALL validators, so a blank value is accepted as
   valid. Don't reach for `@ValidateIf` to dedupe error messages —
   use the priority picker (above) and write Japanese messages on
   each constraint.

5. **`@IsInt() / @IsNumber()` need `@Type(() => Number)`** if the
   form posts the value as a string (which JSON-encoding integers
   from `<input type="text">` does). Combine with the global
   `transform: true` ValidationPipe option.

6. **Optional `bank_code: "ff"` (wrong format) returns 400 with
   `errors[].field === "bank_code"`** — the frontend's `useApiForm`
   composable maps that to `<a-form-item :help>` automatically.
   Required-then-format ordering: required check fires when blank,
   format check fires when non-blank — guard with `if (!errs.X &&
   form.X)` on the FE so users see one message at a time.

### Error Handling Summary

| Layer | Responsibility |
| --- | --- |
| Controller | Let exceptions propagate — ExceptionFilter catches them |
| Service | Throw domain exceptions |
| Repository | Let TypeORM errors propagate to Service |
| ExceptionFilter | Format response, log error, hide internals |

Never swallow errors. Never log passwords, tokens, PII. Never expose stack traces to client.

---

## I/O & External Services

### Timeouts (mandatory for all external I/O)

```typescript
const response = await this.httpClient.post(API_URL, data, { timeout: 30000 }).toPromise();
```

### Exponential Backoff

```typescript
async callWithRetry(fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
    }
  }
}
```

### Graceful Degradation

```typescript
async getProfile(userId: string): Promise<UserProfile> {
  try {
    return await this.externalAPI.getProfile(userId);
  } catch (error) {
    this.logger.warn('External API unavailable, using fallback', { userId });
    return { name: 'Unknown', role: 'user' };
  }
}
```

Log all external calls with: requestId, duration, endpoint, status.

---

## Audit Log — t_log / t_login_log

All CRUD operations and login events must be recorded for audit purposes.

### AuditLogService

```typescript
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(TLog) private readonly logRepo: Repository<TLog>,
    @InjectRepository(TLoginLog) private readonly loginLogRepo: Repository<TLoginLog>,
  ) {}

  async logOperation(params: {
    logType: number;            // 1:user_operation, 2:system, 3:error, 4:file_upload
    accountId: number;
    jaId: number;
    gamenName: string;          // Screen name: e.g., '単価マスタ登録画面'
    operation: string;          // e.g., 'CREATE', 'UPDATE', 'DELETE'
    resultStatus: number;       // 1:success, 2:failure, 3:warning
    targetId?: number;          // e.g., tanka_id
    targetTable?: string;       // e.g., 'm_tanka'
    beforeValue?: object;       // Previous state (JSON) — for UPDATE/DELETE
    afterValue?: object;        // New state (JSON) — for CREATE/UPDATE
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): Promise<void> {
    await this.logRepo.save({
      ...params,
      logDatetime: new Date(),
      beforeValue: params.beforeValue ? JSON.stringify(params.beforeValue) : '',
      afterValue: params.afterValue ? JSON.stringify(params.afterValue) : '',
    });
  }

  async logLogin(params: {
    accountId?: number;
    loginId: string;
    loginResult: number;        // 1:success, 2:failure
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.loginLogRepo.save({
      ...params,
      loginDatetime: new Date(),
    });
  }
}
```

### Usage in Service — convenience helpers (preferred)

`AuditLogService` exposes four convenience methods (`logCreate`,
`logUpdate`, `logDelete`, `logError`) that wrap `logOperation` with the
standard logType / resultStatus / JSON.stringify defaults. Combined
with `extractAuditContext(req)` from `@/common/utils/audit-context`,
the call site reads as one line per operation.

Build the per-request context once at the top of the method, then pass
it to the helper inside the transaction (and again in the catch block
for the error log).

```typescript
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { extractAuditContext } from '@/common/utils/audit-context';

const SCREEN_NAME = '単価マスタ登録画面 (ACSMS-SCR-006)';
const TABLE_NAME = 'm_tanka';

function buildAuditCtx(
  session: SessionPayload,
  req: Request,
  targetId: number | null,
): AuditOperationContext {
  return {
    accountId: session.account_id,
    jaId: session.ja_id,
    screen: SCREEN_NAME,
    table: TABLE_NAME,
    targetId,
    ...extractAuditContext(req),
  };
}

// CREATE — main DML + audit in one transaction; error log outside.
async create(dto: CreateTankaDto, session: SessionPayload, req: Request) {
  try {
    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(manager.create(Tanka, dto));
      await this.auditLog.logCreate(
        buildAuditCtx(session, req, created.tankaId),
        created,
      );
      return created;
    });
    return saved;
  } catch (err) {
    await this.auditLog.logError(
      buildAuditCtx(session, req, null),
      'CREATE',
      err as Error,
    );
    throw err;
  }
}

// UPDATE — captures before + after.
async update(id: number, dto: UpdateTankaDto, session: SessionPayload, req: Request) {
  const before = await this.findById(id, session);
  try {
    return await this.dataSource.transaction(async (manager) => {
      const updated = await manager.save(manager.create(Tanka, { ...before, ...dto }));
      await this.auditLog.logUpdate(
        buildAuditCtx(session, req, updated.tankaId),
        before,
        updated,
      );
      return updated;
    });
  } catch (err) {
    await this.auditLog.logError(
      buildAuditCtx(session, req, id),
      'UPDATE',
      err as Error,
    );
    throw err;
  }
}

// DELETE (soft) — captures before-state.
async remove(id: number, session: SessionPayload, req: Request) {
  const existing = await this.findById(id, session);
  try {
    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(Tanka, id);
      await this.auditLog.logDelete(
        buildAuditCtx(session, req, id),
        existing,
      );
    });
  } catch (err) {
    await this.auditLog.logError(
      buildAuditCtx(session, req, id),
      'DELETE',
      err as Error,
    );
    throw err;
  }
}
```

### When to use `logOperation` directly

Drop down to `logOperation` only when the convenience helpers don't fit:
custom `logType` (e.g. SYSTEM=2 or FILE_UPLOAD=4 events), partial-success
`resultStatus=3` (warning), or non-CRUD operations like LOGIN_FAILURE
audit rows. For those, import the `LogType` / `ResultStatus` enums:

```typescript
import { LogType, ResultStatus } from '@/modules/audit-log/audit-log.service';

await this.auditLog.logOperation({
  logType: LogType.SYSTEM,
  resultStatus: ResultStatus.WARNING,
  // ...
});
```

For CRUD success/failure paths, **always** prefer the helpers — they
keep the row shape consistent across modules and make refactors cheap.

### Log Rules
- Log ALL create, update, delete operations to `t_log`
- Log ALL login attempts (success + failure) to `t_login_log`
- `operation` MUST be bare verb: `'CREATE'` / `'UPDATE'` / `'DELETE'`. NEVER prefix with entity or screen name (no `'JA_CREATE'`, `'TANKA_UPDATE'`). Screen context lives in `gamenName`; entity context lives in `targetTable`.
- `beforeValue`: previous state as JSON (for UPDATE/DELETE)
- `afterValue`: new state as JSON (for CREATE/UPDATE)
- Never log sensitive fields (password, token) in beforeValue/afterValue
- Log DataScope: always include `jaId` for scope-based log queries
- Log errors (logType=3) with errorMessage and stackTrace (internal only, never expose to client)

### Log DataScope (who can view logs)
- NICHINO_ADMIN/STAFF: all JA logs
- CHUOKAI: own chuokai logs only
- JA_HONTEN: own JA branches logs
- JA_KANRI_SHITEN: own branch account logs only

---

## File Upload — AWS S3

```typescript
// src/modules/file/file.service.ts
@Injectable()
export class FileService {
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({ region: configService.get('AWS_REGION') });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.configService.get('S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('S3_BUCKET'),
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }
}
```

### Upload Controller

```typescript
@Post('upload')
@Permissions('file.upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     'application/vnd.ms-excel', 'text/csv'];
    cb(null, allowed.includes(file.mimetype));
  },
}))
async upload(@UploadedFile() file: Express.Multer.File, @Request() req) {
  const key = await this.fileService.upload(file, `ja-${req.user.jaId}`);
  return { data: { key, original_name: file.originalname, size: file.size } };
}
```

---

## Export — CSV / Excel / PDF

### CSV Export (口座振替データ — Zengin format, OA連動用CSV)

```typescript
@Injectable()
export class CsvExportService {
  generateCsv(data: Record<string, any>[], columns: CsvColumn[]): Buffer {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row =>
      columns.map(c => this.escapeCsv(String(row[c.key] ?? ''))).join(',')
    );
    // BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    return Buffer.from(bom + [header, ...rows].join('\r\n'), 'utf-8');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
```

### Excel Export (配達手数料支払情報)

```typescript
@Injectable()
export class ExcelExportService {
  async generateXlsx(data: Record<string, any>[], columns: ExcelColumn[], sheetName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = columns.map(c => ({ header: c.label, key: c.key, width: c.width ?? 15 }));
    sheet.addRows(data);

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
```

### PDF Export (増減通知書, 増減連絡票, 購読者名簿)

```typescript
@Injectable()
export class PdfExportService {
  async generatePdf(templateName: string, data: Record<string, any>): Promise<Buffer> {
    // Use Handlebars template → HTML → PDF
    const html = this.renderTemplate(templateName, data);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    await browser.close();
    return Buffer.from(pdf);
  }

  private renderTemplate(name: string, data: Record<string, any>): string {
    const templatePath = join(__dirname, '..', 'templates', `${name}.hbs`);
    const template = Handlebars.compile(readFileSync(templatePath, 'utf-8'));
    return template(data);
  }
}
```

### Export Controller Pattern

```typescript
@Get('export/csv')
@Permissions('koza_furikae.export')
async exportCsv(@Query() query: ExportQueryDto, @Request() req, @Res() res: Response) {
  const data = await this.service.getExportData(query, req.user.scope);
  const buffer = this.csvExportService.generateCsv(data, KOZA_FURIKAE_COLUMNS);

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="koza_furikae_${format(new Date(), 'yyyyMMdd')}.csv"`,
  });
  res.send(buffer);
}

@Get('export/pdf')
@Permissions('report.export_meibo')
async exportPdf(@Query() query: ExportQueryDto, @Request() req, @Res() res: Response) {
  const data = await this.service.getReportData(query, req.user.scope);
  const buffer = await this.pdfExportService.generatePdf('meibo', data);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="meibo_${format(new Date(), 'yyyyMMdd')}.pdf"`,
  });
  res.send(buffer);
}
```

### Export Types

| Permission | Format | Output |
| --- | --- | --- |
| `koza_furikae.export` | CSV (Zengin format) / Excel | 口座振替データ |
| `haitatsuryo.export` | Excel | 配達手数料支払情報 |
| `report.export_meibo` | PDF | 購読者名簿（販売店別・管理支店別） |
| `report.export_zougen_hanbaiten` | PDF | 増減連絡票（販売店） |
| `report.export_zougen_nichino` | PDF | 増減通知（日本農業新聞） |

### Export Rules
- Always apply DataScope filter (same as list queries)
- File name format: `{type}_{yyyyMMdd}.{ext}`
- CSV: UTF-8 with BOM for Excel compatibility
- PDF: A4, Handlebars template → HTML → Puppeteer
- Excel: ExcelJS library
- Log export events: `{ event: 'export.completed', type, userId, recordCount }`
- Store export record in `t_file_download` table

---

## File Upload — AWS S3

Rules:
- File storage: 1 folder per JA (`ja-{jaId}/`)
- Max file size: 10MB
- Allowed types: PDF, Excel (xlsx/xls), CSV
- Return S3 key, not full URL (generate signed URL on download)
- Never store files on local disk

---

## Mail Service — AWS SES / SMTP

```typescript
// src/modules/mail/mail.service.ts
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(email: string, otpCode: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: '【agrinews】ログイン認証コード',
      template: 'otp',
      context: { otpCode, expiresIn: '5分' },
    });
    this.logger.log({ event: 'mail.otp.sent', email: this.maskEmail(email) });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: '【agrinews】パスワードリセット',
      template: 'password-reset',
      context: { resetUrl, expiresIn: '30分' },
    });
    this.logger.log({ event: 'mail.password_reset.sent', email: this.maskEmail(email) });
  }

  async sendNotification(email: string, subject: string, content: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `【agrinews】${subject}`,
      template: 'notification',
      context: { content },
    });
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name[0]}***@${domain}`;
  }
}
```

### NestJS Mailer Setup

```typescript
// app.module.ts
MailerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    transport: {
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    },
    defaults: { from: '"agrinews" <noreply@agrinews.jp>' },
    template: {
      dir: join(__dirname, 'templates'),
      adapter: new HandlebarsAdapter(),
    },
  }),
})
```

Rules:
- Use `@nestjs-modules/mailer` + Handlebars templates
- Never log full email address (use `maskEmail`)
- Never log OTP code or reset token
- Templates in `src/templates/` (otp.hbs, password-reset.hbs, notification.hbs)
- Subject prefix: `【agrinews】`

---

## Security

> Full security rules in `security.md`. Key points:

- Validate at DTO layer — NOT in Service
- Never expose password/secrets in response DTO
- Secrets from ConfigService (AWS Secrets Manager) — never hardcode
- See `security.md` for: HTTP-only Cookie session with Redis store (24h sliding TTL), MFA (email OTP), forgot/reset password, RBAC, DataScope, field-level restrictions, rate limiting

---

## Testing (Vitest)

### Unit Tests (> 80% coverage)

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: Record<string, vi.Mock>;

  beforeEach(async () => {
    mockRepo = { findOne: vi.fn(), save: vi.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('should return user by ID', async () => {
    mockRepo.findOne.mockResolvedValue({ id: '123', name: 'John' });
    const result = await service.findById('123');
    expect(result).toEqual({ id: '123', name: 'John' });
  });

  it('should throw NotFoundException when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findById('999')).rejects.toThrow(NotFoundException);
  });
});
```

### Controller Tests

Verify DTOs, routing, error responses with mocked services. Verify sensitive fields excluded.

### Integration Tests

Test complex queries against test database. Verify joins, filters, pagination. Reset DB between tests.

---

## Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --workspace=apps/backend
COPY apps/backend ./apps/backend
COPY tsconfig.json ./
RUN npm run build --workspace=apps/backend

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/main"]
```

Rules: multi-stage build (builder → runtime). Non-root user. HEALTHCHECK for ECS. Never use `latest` tag.
