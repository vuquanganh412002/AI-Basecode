# NestJS Backend Rules — agrinews

> All backend standards for `apps/backend/**/*.ts`. Covers architecture, API, database, error handling, and testing.

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
src/modules/[domain]/
  ├── [domain].module.ts
  ├── [domain].controller.ts
  ├── [domain].service.ts
  ├── entities/[entity].entity.ts
  ├── dto/
  │   ├── create-[entity].dto.ts
  │   ├── update-[entity].dto.ts
  │   └── [entity]-response.dto.ts
  └── exceptions/
```

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

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
- Version prefix: `/api/v1/...`

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

**Delete success:**
```json
{ "message": "正常に削除しました" }
```

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
```

Rules: UUID primary keys. Always `createdAt`, `updatedAt`. Soft delete via `@DeleteDateColumn()`. No business logic in entities. Table names: `snake_case` plural.

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
app.useGlobalPipes(
  new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const details = errors.map((e) => ({
        field: e.property,
        constraints: Object.values(e.constraints || {}),
      }));
      return new HttpException(
        { error_code: 'VALIDATION_ERROR', message: '入力値が不正です', errors: details },
        HttpStatus.BAD_REQUEST,
      );
    },
  }),
);
```

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

### Usage in Service

```typescript
// After successful CREATE
await this.auditLogService.logOperation({
  logType: 1,
  accountId: user.accountId,
  jaId: user.jaId,
  gamenName: '単価マスタ登録画面',
  operation: 'CREATE',
  resultStatus: 1,
  targetId: created.tankaId,
  targetTable: 'm_tanka',
  afterValue: created,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// After successful UPDATE — log before/after
const before = await this.findById(id, scope);
const updated = await this.repo.save({ ...before, ...dto });
await this.auditLogService.logOperation({
  logType: 1,
  accountId: user.accountId,
  jaId: user.jaId,
  gamenName: '単価マスタ登録画面',
  operation: 'UPDATE',
  resultStatus: 1,
  targetId: updated.tankaId,
  targetTable: 'm_tanka',
  beforeValue: before,
  afterValue: updated,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// After successful DELETE (soft)
await this.auditLogService.logOperation({
  logType: 1,
  accountId: user.accountId,
  jaId: user.jaId,
  gamenName: '単価マスタ明細検索画面',
  operation: 'DELETE',
  resultStatus: 1,
  targetId: id,
  targetTable: 'm_tanka',
  beforeValue: existing,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

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
