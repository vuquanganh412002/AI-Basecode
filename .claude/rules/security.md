# Security Rules — NestJS + AWS

> CRITICAL — These rules must NEVER be violated. Applies to all agents.

## 🚨 CRITICAL — Never Violate These

- **Never** hardcode secrets, API keys, passwords, or tokens in source code
- **Never** commit `.env` files to version control
- **Never** log sensitive data (passwords, session IDs, PII)
- **Never** use `eval()` or `Function()` with user input
- **Always** validate and sanitize all user inputs
- **Always** use HTTP-only Cookie session backed by Redis — **NEVER** store session IDs in `localStorage` / `sessionStorage`
- **Always** set `HttpOnly`, `Secure`, `SameSite=Strict` on the session cookie

---

## Secrets Management — AWS Secrets Manager

```ts
// ✅ Always get secrets from ConfigService (backed by AWS Secrets Manager)
@Injectable()
export class UsersService {
  constructor(private readonly configService: ConfigService) {}

  private get sessionSecret(): string {
    return this.configService.get<string>('SESSION_SECRET');
  }
}

// ❌ NEVER hardcode
const apiKey = 'sk-ant-xxxxx';

// ❌ NEVER use process.env directly
const secret = process.env.SESSION_SECRET;
```

### Required Secrets (AWS Secrets Manager)
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (session store, OTP store, rate-limit counters)
- `SESSION_SECRET` — 32+ byte random string used to sign the session cookie

---

## Authentication — HTTP-only Cookie Session (Redis-backed)

### Session Strategy

| Item | Value |
|---|---|
| Session ID | UUID v4 (cryptographically random, issued on login) |
| Transport | HTTP-only Cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`) |
| Store | Redis — key `session:{session_id}`, TTL 24h |
| Timeout (absolute) | 24h from login |
| Timeout (sliding) | 24h from last request — extended via `POST /api/v1/auth/refresh` |
| Re-login required | After 24h inactivity OR after password reset (all sessions destroyed) |

Session payload stored in Redis (JSON):
```json
{
  "account_id": 1,
  "login_id": "admin01",
  "role_id": 1,
  "role_code": "NICHINO_ADMIN",
  "ja_id": null,
  "kanri_shiten_id": null,
  "permissions": ["dokusya.view", "dokusya.create", ...],
  "created_at": "2026-04-23T10:00:00Z",
  "last_activity_at": "2026-04-23T10:15:00Z"
}
```

Never put the password hash, OTP, or reset token inside the session payload.

### Password Hashing
```ts
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const hashed = await bcrypt.hash(password, SALT_ROUNDS);
const isValid = await bcrypt.compare(password, hashed);
```

### Session Configuration
```ts
// Use express-session with connect-redis (or @fastify/session if Fastify).
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redis = createClient({ url: config.get('REDIS_URL') });
await redis.connect();

app.use(
  session({
    name: 'session_id',                        // Cookie name
    store: new RedisStore({ client: redis, prefix: 'session:' }),
    secret: config.get('SESSION_SECRET'),      // For cookie signature
    resave: false,
    saveUninitialized: false,
    rolling: true,                             // Sliding expiration
    cookie: {
      httpOnly: true,                          // JS cannot read cookie (XSS protection)
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'strict',                      // CSRF protection
      maxAge: 24 * 60 * 60 * 1000,             // 24h
      path: '/',
    },
  }),
);
```

### Session Index (for bulk invalidation)

To invalidate all sessions of an account (e.g. on password reset), maintain a per-account index:

```
account_sessions:{account_id} (Redis Set)  →  { session_id_1, session_id_2, ... }
```

- On login: `SADD account_sessions:{account_id} {session_id}` + set TTL on the Set to 24h.
- On logout / session expire: `SREM account_sessions:{account_id} {session_id}` and `DEL session:{session_id}`.
- On password reset: iterate the Set, `DEL session:{sid}` for each, then `DEL account_sessions:{account_id}`.

---

## MFA — Email OTP

### Flow

```
1. User login with email + password → 200 { "mfa_required": true, "mfa_token": "temp-uuid" }
2. Server sends 6-digit OTP to user's email
3. User submits OTP → POST /api/v1/auth/mfa/verify { "mfa_token": "...", "otp_code": "123456" }
4. Server verifies OTP → 200 { "data": { "user": {...} } } + Set-Cookie: session_id=<uuid>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
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
| POST | `/api/v1/auth/login` | Email + password → mfa_required + send OTP email (MFA case) OR create session + Set-Cookie (no-MFA case) |
| POST | `/api/v1/auth/mfa/verify` | Verify OTP → create session + Set-Cookie `session_id` |
| POST | `/api/v1/auth/mfa/resend` | Resend OTP email |
| POST | `/api/v1/auth/refresh` | Validate cookie session, extend TTL to another 24h, return refreshed user |
| POST | `/api/v1/auth/logout` | `DEL session:{session_id}` in Redis + expire the cookie (`Max-Age=0`) |

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
- After successful reset: **delete all Redis sessions for this account** (see *Session Index* above) to force re-login everywhere
- Rate limit: 3 requests per email per hour

### API Endpoints

| Method | URI | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/forgot-password` | Send reset email (always 200) |
| POST | `/api/v1/auth/reset-password` | Verify token + update password |

---

## Authorization — 3-Layer Model

```
Request → SessionAuthGuard → PermissionsGuard → Controller → Service (DataScope + FieldLevel)
```

`SessionAuthGuard` reads `session_id` from the signed cookie, loads the payload from Redis (`GET session:{session_id}`), and attaches it to `req.user`. If the session is missing or expired, respond `401 UNAUTHORIZED`. On each successful request, refresh the TTL (`EXPIRE session:{session_id} 86400`) so active users don't get kicked out.

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
- `SessionAuthGuard` + `PermissionsGuard` at controller or endpoint level
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
- **NEVER** store session IDs, tokens, or credentials in `localStorage` / `sessionStorage` — authentication relies entirely on the HTTP-only session cookie, which the browser sends automatically
- Axios / Orval client: set `withCredentials: true` so the session cookie is attached to cross-origin requests; ensure backend CORS allows the frontend origin with `credentials: true`
- Pinia auth store holds only the `user` object (role, permissions, profile) — `isAuthenticated` derives from `!!user`, NOT from any stored token
- On `401 UNAUTHORIZED` from any API: clear local `user` state, redirect to `/login` (the server has already rejected the expired cookie)
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
- [ ] Auth: HTTP-only Cookie session (Redis store), cookie flags `HttpOnly`+`Secure`+`SameSite=Strict`, 24h TTL (sliding)
- [ ] Sessions invalidated on password reset (`DEL session:{sid}` for all account sessions)
- [ ] Password: bcrypt 10 rounds
- [ ] All endpoints have `SessionAuthGuard` + `PermissionsGuard` with `@Permissions('model.action')`
- [ ] DataScope filtering in Service layer for all queries
- [ ] Field-level restrictions enforced per role
- [ ] SQL: parameterized queries only
- [ ] Rate limiting on public endpoints
- [ ] Response DTO never exposes sensitive fields (password hash, session ID, OTP, reset token)
- [ ] Never log passwords, session IDs, PII
- [ ] CORS strict origin + `credentials: true` so the session cookie is sent
- [ ] Frontend axios / Orval uses `withCredentials: true`; no token in `localStorage`
- [ ] npm audit clean
