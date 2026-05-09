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
- `SESSION_SECRET` — 32+ byte random string used to sign the session cookie
- `DB_PASSWORD` — Postgres password
- `STORAGE_ACCESS_KEY` — S3 / MinIO access key
- `STORAGE_SECRET_KEY` — S3 / MinIO secret key
- (`DATABASE_URL` / `REDIS_URL` accepted as full connection strings if used)

### Production fail-fast — `apps/backend/src/config/configuration.ts`

The config factory **refuses to start when `NODE_ENV=production`** if any
of the secrets above is unset OR still at its dev fallback value. The
list of dev fallbacks is the `DEV_FALLBACKS` constant at the top of
`configuration.ts` — extend that constant when you add a new secret.

A concrete error at boot is far better than silent insecure operation:

```
Error: [config] Refusing to start: NODE_ENV=production but the following
secrets are missing or still at insecure defaults — SESSION_SECRET (unset),
DB_PASSWORD (still at dev default), STORAGE_ACCESS_KEY (still at dev default).
Wire each from AWS Secrets Manager via the ECS task definition.
```

`SESSION_SECRET` also gets a length check (`>= 32 bytes`).

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
- Expires in 1 hour
- Single use — invalidate after successful reset
- After successful reset: **delete all Redis sessions for this account** (see *Session Index* above) to force re-login everywhere
- Cooldown: **5-minute interval per email**, enforced in `AuthService.forgotPassword`. A second request within 5 min of the previous one → HTTP 429 `PASSWORD_RESET_RATE_LIMIT` with message `再送信は5分後に可能です。時間をおいてから再度お試しください。`. Window measured by `t_mfa_otp.created_at` (rows persist after invalidation), so the prior-token-invalidation step below does NOT reset the cooldown.
- **Prior-token invalidation**: every successful forgot-password call must `UPDATE t_mfa_otp SET used_flg=true WHERE account_id=:id AND otp_type=2 AND used_flg=false` before INSERTing the new row, in the same transaction. Guarantees only ONE active reset link per account at any time — re-submitting the email kills the previous email's link.
- **Anti-enumeration trade-off**: cooldown response (429) only fires for existing accounts; non-existent emails always return 200. This intentionally leaks "account exists" to a determined attacker who probes the timing, but preserves a clear UX message for legitimate users who hit the cooldown. Accepted trade-off in this project.

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

Restrict data by role's organizational hierarchy. **Use the shared
helpers in `src/common/utils/data-scope.ts` — never re-implement the
role/jaId/kanriShitenId switch inline.**

```ts
import {
  assertJaScope,
  assertBranchScope,
  applyJaScope,
  applyBranchScope,
} from '@/common/utils/data-scope';

// ─── List queries — apply scope WHERE clause to a query builder ─────
async findAll(query: PaginationDto, session: SessionPayload) {
  const qb = this.repo.createQueryBuilder('d');
  applyJaScope(qb, 'd', 'jaId', session);
  // For branch-scoped resources (e.g. t_dokusya, t_log):
  // applyBranchScope(qb, 'd', { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' }, session);
  return qb
    .take(query.per_page)
    .skip((query.page - 1) * query.per_page)
    .getManyAndCount();
}

// ─── Single-record access — verify scope after fetch ────────────────
async findById(id: number, session: SessionPayload): Promise<Dokusya> {
  const record = await this.repo.findOne({ where: { id } });
  if (!record) throw new DokusyaNotFoundException(id);
  assertJaScope(record.jaId, session, '購読者');  // throws NotFound if out of scope
  return record;
}
```

Scope helpers (all from `src/common/utils/data-scope.ts`):

| Helper | Use for |
|---|---|
| `assertJaScope(recordJaId, session, label?)` | After fetching a JA-scoped row (m_ja, m_dokusya master, m_hanbaiten, m_oshirase, m_account, etc.) |
| `assertBranchScope(recordJaId, recordKanriShitenId, session, label?)` | After fetching a branch-scoped row where JA_KANRI_SHITEN sees only their own kanri_shiten_id (t_dokusya, t_log, t_login_log) |
| `applyJaScope(qb, alias, jaIdField, session)` | List queries on JA-scoped resources |
| `applyBranchScope(qb, alias, { jaIdField, kanriShitenIdField }, session)` | List queries on branch-scoped resources |

All helpers throw NotFoundException (not ForbiddenException) on
out-of-scope hits to mask row existence. NICHINO_ADMIN /
NICHINO_STAFF (session.ja_id == null) bypass every scope check.

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

### Layer 3 — FE mirror (UX only, NOT a security boundary)

The FE form must visually disable inputs the BE will silently drop, so
restricted users don't burn time editing fields the server will discard.
Defense-in-depth: the FE `:disabled` is **only** a UX hint — Layer 3 BE
allow-list is the actual security. A hostile user with `curl` cannot
bypass the BE filter (verified: PUT with `bank_code: "9999"` as CHUOKAI
returns HTTP 200 but `bank_code` in the DB stays unchanged).

Pattern for any edit form with field-level restriction:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();

// Roles that get the restricted edit experience for this resource.
// Mirror the BE FIELD_RESTRICTIONS table — keep both lists in sync.
const RESTRICTED_EDITOR_ROLES = ['CHUOKAI', 'JA_HONTEN'];
const isRestrictedEditor = computed(
  () =>
    isEdit.value &&  // create-mode runs through `model.create` permission gate
    RESTRICTED_EDITOR_ROLES.includes(authStore.user?.role_code ?? ''),
);
</script>

<template>
  <!-- Editable for everyone — no :disabled binding -->
  <a-input v-model:value="formState.tel" />

  <!-- Read-only for restricted editors -->
  <a-input v-model:value="formState.bank_code" :disabled="isRestrictedEditor" />
  <a-radio-group v-model:value="formState.chuokai_flg" :disabled="isRestrictedEditor">
    <a-radio :value="true">中央会</a-radio>
    <a-radio :value="false">単協</a-radio>
  </a-radio-group>
</template>
```

Rules:

- **Identical allow-list on FE and BE**. When extending `FIELD_RESTRICTIONS`
  on the server, update `RESTRICTED_EDITOR_ROLES` + the `:disabled`
  bindings on the corresponding form. Drift is invisible — server keeps
  rejecting silently while the form lets users type.
- **Read-only via `:disabled`, never `v-if`**. Hiding a restricted field
  removes context (the user can't see what value they have); greying it
  out preserves it.
- **Tests assert both layers**:
  1. FE spec — for each restricted field, mount the edit view as a
     restricted role and assert `disabled` attribute / `ant-select-disabled`
     class is present.
  2. BE spec — service unit test sends a DTO containing the disallowed
     field, verifies it does NOT propagate into the saved entity.

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
