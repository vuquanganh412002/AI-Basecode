# Security Rules — NestJS + AWS

> CRITICAL — These rules must NEVER be violated. Applies to all agents.

## 🚨 CRITICAL — Never Violate These

- **Never** hardcode secrets, API keys, passwords, or tokens in source code
- **Never** commit `.env` files to version control
- **Never** log sensitive data (passwords, tokens, PII)
- **Never** use `eval()` or `Function()` with user input
- **Always** validate and sanitize all user inputs
- **Always** use JWT RS256 — **NEVER** HS256 for production

---

## Secrets Management — AWS Secrets Manager

```ts
// ✅ Always get secrets from ConfigService (backed by AWS Secrets Manager)
@Injectable()
export class UsersService {
  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('JWT_PRIVATE_KEY');
  }
}

// ❌ NEVER hardcode
const apiKey = 'sk-ant-xxxxx';

// ❌ NEVER use process.env directly
const secret = process.env.JWT_PRIVATE_KEY;
```

### Required Secrets (AWS Secrets Manager)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_PRIVATE_KEY` — RS256 private key for token signing
- `JWT_PUBLIC_KEY` — RS256 public key for token verification

---

## Authentication — JWT RS256

### Token Strategy

| Token | Expiry | Storage |
|---|---|---|
| Access Token | 24 hours | Response body → Pinia memory |
| Refresh Token | 7 days | HTTP-only cookie |

Session: user stays logged in for 24h. After access token expires, silent refresh via refresh token cookie. After 7 days without activity → re-login required.

### Password Hashing
```ts
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const hashed = await bcrypt.hash(password, SALT_ROUNDS);
const isValid = await bcrypt.compare(password, hashed);
```

### JWT Configuration
```ts
// RS256 — asymmetric keys (NEVER use HS256)
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    privateKey: config.get('JWT_PRIVATE_KEY'),
    publicKey: config.get('JWT_PUBLIC_KEY'),
    signOptions: { algorithm: 'RS256', expiresIn: '24h' },
  }),
})
```

---

## MFA — Email OTP

### Flow

```
1. User login with email + password → 200 { "mfa_required": true, "mfa_token": "temp-uuid" }
2. Server sends 6-digit OTP to user's email
3. User submits OTP → POST /api/v1/auth/mfa/verify { "mfa_token": "...", "otp_code": "123456" }
4. Server verifies OTP → 200 { "data": { "access_token": "...", "user": {...} } } + Set-Cookie: refresh_token
```

### OTP Rules
- 6-digit numeric code
- Expires in 5 minutes
- Max 5 verify attempts per OTP (then invalidate)
- Max 3 resend per login session
- Store OTP as bcrypt hash in `t_mfa_otp` table (never plaintext)
- Rate limit: 1 OTP per 60 seconds

### API Endpoints

| Method | URI | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Email + password → mfa_required + send OTP email |
| POST | `/api/v1/auth/mfa/verify` | Verify OTP → access_token + refresh_token |
| POST | `/api/v1/auth/mfa/resend` | Resend OTP email |
| POST | `/api/v1/auth/refresh` | Refresh access token via cookie |
| POST | `/api/v1/auth/logout` | Clear refresh token cookie |

---

## Forgot Password — Email Reset

### Flow

```
1. User submits email → POST /api/v1/auth/forgot-password { "email": "user@example.com" }
2. Server sends reset link with token to email (always 200, even if email not found — prevent enumeration)
3. User clicks link → GET /reset-password?token=xxx (frontend page)
4. User submits new password → POST /api/v1/auth/reset-password { "token": "xxx", "new_password": "..." }
5. Server verifies token, updates password, invalidates all existing sessions
```

### Reset Token Rules
- Random UUID token, stored as bcrypt hash in DB
- Expires in 30 minutes
- Single use — invalidate after successful reset
- Invalidate all existing refresh tokens for this account after reset
- Rate limit: 3 requests per email per hour

### API Endpoints

| Method | URI | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/forgot-password` | Send reset email (always 200) |
| POST | `/api/v1/auth/reset-password` | Verify token + update password |

---

## Authorization — 3-Layer Model

```
Request → JwtAuthGuard → PermissionsGuard → Controller → Service (DataScope + FieldLevel)
```

### Layer 1: Permission Guard (Controller)

Check `model.action` permission from `m_roles_permissions`.

```ts
// Custom decorator
export const Permissions = (...perms: string[]) => SetMetadata('permissions', perms);

// Guard
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionsService: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!required) return true;
    const user = context.switchToHttp().getRequest().user;
    const userPerms = await this.permissionsService.getByRoleId(user.roleId);
    return required.every(p => userPerms.includes(p));
  }
}

// Usage
@Post()
@Permissions('tanka.create')
create(@Body() dto: CreateTankaDto) { ... }
```

### Layer 2: DataScope Filter (Service)

Restrict data by role's organizational hierarchy.

```ts
interface DataScope {
  roleCode: string;             // NICHINO_ADMIN, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN
  jaId: number | null;          // User's JA ID
  kanriShitenId: number | null; // User's branch ID
}

// Service applies DataScope
async findAll(query: PaginationDto, scope: DataScope) {
  const qb = this.repo.createQueryBuilder('d');
  switch (scope.roleCode) {
    case 'CHUOKAI':
    case 'JA_HONTEN':
      qb.andWhere('d.jaId = :jaId', { jaId: scope.jaId });
      break;
    case 'JA_KANRI_SHITEN':
      qb.andWhere('d.kanriShitenId = :ksId', { ksId: scope.kanriShitenId });
      break;
  }
  return qb.take(query.per_page).skip((query.page - 1) * query.per_page).getManyAndCount();
}

// For single record access — verify ownership before returning
async findById(id: string, scope: DataScope): Promise<Dokusya> {
  const record = await this.repo.findOne({ where: { id } });
  if (!record) throw new DokusyaNotFoundException(id);
  if (scope.jaId && record.jaId !== scope.jaId) {
    throw new DataScopeViolationException();
  }
  return record;
}
```

| Role | dokusya | hanbaiten | ja master | report | file | log |
| --- | --- | --- | --- | --- | --- | --- |
| NICHINO_ADMIN | — | — | All JA | — | All | All |
| NICHINO_STAFF | — | All JA (proxy) | — | — | All | All |
| CHUOKAI | Own chuokai | Own chuokai | Own (partial fields) | Own | Own + managed JA | Own |
| JA_HONTEN | Own JA | Own JA | Own JA (partial fields) | Own branches | Own JA | Own branches |
| JA_KANRI_SHITEN | Own branch | Own JA | — | Own branch | Own JA | Own branch |

### Layer 3: Field-Level Restriction (Service/DTO)

Some roles can only edit specific fields. Use field whitelist:

```ts
const FIELD_RESTRICTIONS: Record<string, Record<string, string[]>> = {
  ja: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: ['yubinNo', 'address', 'tel', 'fax', 'email', 'tantoBusho', 'tantoName', 'zeiKubun', 'biko'],
    JA_HONTEN: ['yubinNo', 'address', 'tel', 'fax', 'email', 'tantoBusho', 'tantoName', 'zeiKubun', 'biko'],
  },
  shiten: {
    CHUOKAI: ['shitenCode', 'shitenName', 'shitenNameKana'],
    JA_HONTEN: ['shitenCode', 'shitenName', 'shitenNameKana'],
    JA_KANRI_SHITEN: ['shitenCode', 'shitenName', 'shitenNameKana'],
  },
  kanri_shiten: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: ['yubinNo', 'address', 'tel', 'fax', 'biko'],
    JA_HONTEN: ['yubinNo', 'address', 'tel', 'fax', 'biko'],
    JA_KANRI_SHITEN: ['yubinNo', 'address', 'tel', 'fax', 'biko'],
  },
};

function filterAllowedFields(dto: Record<string, any>, model: string, roleCode: string) {
  const allowed = FIELD_RESTRICTIONS[model]?.[roleCode];
  if (!allowed) return {};
  if (allowed.includes('*')) return dto;
  return Object.fromEntries(Object.entries(dto).filter(([key]) => allowed.includes(key)));
}
```

### Additional Business Rules
- Credit card / combo subscribers: read-only for all JA roles
- NICHINO_STAFF: hanbaiten proxy — create/update only, no delete

### Guard Rules
- `JwtAuthGuard` + `PermissionsGuard` at controller or endpoint level
- DataScope filtering in Service layer — never in Controller
- Field-level restriction in Service layer
- Guards contain NO business logic — only auth/authz

---

## Input Validation

### DTO Validation (class-validator)
```ts
// ✅ Validate all incoming data at DTO boundary
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
```

## SQL Injection Prevention
- TypeORM parameterized queries — **NEVER** string concatenation
```ts
// ✅ Safe
const user = await this.userRepo
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .getOne();

// ❌ VULNERABLE
await this.userRepo.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## Rate Limiting

### API Rate Limiting
```ts
// Public-facing endpoints
@Throttle({ default: { ttl: 60000, limit: 100 } })  // 100 req/min
@Controller('api/v1')

// Auth endpoints — stricter
@Throttle({ default: { ttl: 60000, limit: 5 } })     // 5 req/min
@Controller('api/v1/auth')

```

---

## HTTP Security

### NestJS Security Setup
```ts
// Helmet for security headers
app.use(helmet());

// CORS — strict origin
app.enableCors({
  origin: configService.get('ALLOWED_ORIGINS')?.split(',') || [],
  credentials: true,
});
```

### AWS WAF
- DDoS protection on ALB
- Rate limiting at infrastructure level
- SQL injection detection rules
- XSS protection rules

---

## Frontend Security

- NEVER use `v-html` with user-controlled content (XSS risk)
- Store tokens in memory only — use httpOnly cookie for refresh token
- NEVER log sensitive data to console in production
- Use Orval generated client (built-in type safety)

---

## Dependency Security
```bash
# Regularly audit dependencies
npm audit
npm audit fix

# Check in CI pipeline
npm audit --audit-level=high
```

---

## Checklist

- [ ] Secrets from AWS Secrets Manager (ConfigService) — never hardcode
- [ ] JWT RS256 — never HS256
- [ ] Password: bcrypt 10 rounds
- [ ] All endpoints have PermissionsGuard with `@Permissions('model.action')`
- [ ] DataScope filtering in Service layer for all queries
- [ ] Field-level restrictions enforced per role
- [ ] SQL: parameterized queries only
- [ ] Rate limiting on public endpoints
- [ ] Response DTO never exposes sensitive fields
- [ ] Never log passwords, tokens, PII
- [ ] CORS configured strictly
- [ ] npm audit clean
