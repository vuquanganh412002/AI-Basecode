# Backend Code Review — agrinews

**Date**: April 17, 2026  
**Reviewer**: GitHub Copilot  
**Files Reviewed**: Core modules, guards, filters, DTOs, configuration, services

---

## ✅ Strengths

### 1. **Security Architecture**
- ✅ **JWT RS256 Implementation** (`auth.module.ts`): Correctly configured asymmetric keys with proper algorithm specification
- ✅ **RBAC Pattern** (`permissions.guard.ts`): Clean permission-based access control
- ✅ **DataScope Decorator** (`data-scope.decorator.ts`): Multi-tenant isolation implemented
- ✅ **Password Masking** (`auth.service.ts`): Email addresses masked in logs
- ✅ **HTTP-only Cookies** (`auth.controller.ts`): Refresh tokens secured with httpOnly, secure, sameSite flags

### 2. **Error Handling**
- ✅ **Global Exception Filter** (`global-exception.filter.ts`): Centralized error handling with masked sensitive errors in production
- ✅ **Domain Exceptions** (`domain.exception.ts`): Custom exception hierarchy for business errors
- ✅ **Validation Error Factory** (`main.ts`): Field-level validation error details with structured response

### 3. **Module Organization**
- ✅ **Domain-Driven Design**: Proper separation (auth, health, storage, mail, audit-log)
- ✅ **Dependency Injection**: Constructor injection throughout 
- ✅ **Module Exports**: Services properly exported for cross-module communication

### 4. **API & Swagger**
- ✅ **OpenAPI Documentation**: All endpoints decorated with `@ApiOperation`, `@ApiResponse`
- ✅ **Bearer Auth**: `@ApiBearerAuth()` configured
- ✅ **DTO Decorators**: All DTO fields have `@ApiProperty`

### 5. **Infrastructure**
- ✅ **Configuration Management**: Environment-based config via `ConfigService`
- ✅ **Database Connection Pooling**: Proper pool sizing (max: 10, idleTimeout: 30s)
- ✅ **Health Checks**: Separate liveness (`/health`) and readiness (`/health/ready`) endpoints
- ✅ **Request Tracing**: X-Request-ID middleware for request correlation

### 6. **Reusable Services**
- ✅ **Provider Pattern** (Storage, Mail): Pluggable providers (MinIO/S3, SMTP/SES)
- ✅ **Audit Logging**: Proper audit log service with operation/login tracking
- ✅ **Error Resilience**: Audit log failures don't break application

---

## ⚠️ Issues & Recommendations

### 1. **RefreshToken Flow Issues**

**File**: `auth.controller.ts:47`  
**Issue**: Standard refresh token endpoint reads from request body instead of HTTP-only cookie

```typescript
// ❌ Current (WRONG)
@Post('refresh')
async refresh(@Body() body: { refresh_token?: string }) {
  return this.authService.refreshToken(body.refresh_token ?? '');
}

// ✅ Recommended
@Post('refresh')
async refresh(@Req() req: Request) {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) throw new UnauthorizedException();
  return this.authService.refreshToken(refreshToken);
}
```

**Why**: Token in request body can be intercepted. Use httpOnly cookie exclusively.

---

### 2. **JWT Public Key Missing Error Handling**

**File**: `config/configuration.ts:16-20`  
**Issue**: Missing JWT public key defaults to empty string, causing silent failures

```typescript
// ❌ Current
jwt: {
  privateKey: process.env.JWT_PRIVATE_KEY_PATH ? readFileSync(...) : '',
  publicKey: process.env.JWT_PUBLIC_KEY_PATH ? readFileSync(...) : '',
}

// ✅ Recommended
onModuleInit() {
  if (!this.configService.get('jwt.privateKey')) {
    throw new Error('JWT_PRIVATE_KEY_PATH not configured');
  }
  if (!this.configService.get('jwt.publicKey')) {
    throw new Error('JWT_PUBLIC_KEY_PATH not configured');
  }
}
```

**Why**: Empty keys will cause cryptic JWT failures at runtime.

---

### 3. **MFA Token Workflow Incomplete**

**File**: `auth.service.ts:22-28`  
**Issue**: All MFA methods are TODO stubs without actual token validation

```typescript
async verifyMfa(mfaToken: string, otpCode: string) {
  this.logger.log({ event: 'auth.mfa.verify' });
  // TODO: Validate mfa_token, verify OTP (max 5 attempts, 5min expiry)
  // TODO: Generate access + refresh tokens
  return { /* stub */ };
}
```

**Recommendation**: 
- Implement `t_mfa_otp` table storage (OTP hash, expiry, attempt count)
- Add validation: token exists, OTP matches (bcrypt), expiry valid, attempts < 5
- Return access + refresh tokens on success
- Invalidate token after successful verify

---

### 4. **Password Reset Token Missing**

**File**: `auth.service.ts:54-60`  
**Issue**: `resetPassword()` method is stub without actual token verification

```typescript
async resetPassword(token: string, newPassword: string) {
  this.logger.log({ event: 'auth.reset_password' });
  // TODO: Verify reset token, update password, invalidate all refresh tokens
  const _hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
}
```

**Recommendation**:
- Create `t_password_reset_token` table (token hash, user_id, expiry, used_at)
- Verify: token exists, expiry valid, not already used
- Update m_account password, set used_at, invalidate all refresh tokens
- Return success/error

---

### 5. **Unvalidated JWT Strategy**

**File**: `strategies/jwt.strategy.ts:24`  
**Issue**: JWT payload directly mapped to user without validation

```typescript
validate(payload: Record<string, unknown>) {
  return {
    accountId: payload.accountId,  // No type checking
    roleCode: payload.roleCode,    // Trust payload blindly
    permissions: payload.permissions || [],
  };
}
```

**Recommendation**:
```typescript
validate(payload: any): User {
  if (!payload.accountId || !payload.roleCode) {
    throw new UnauthorizedException('Invalid token');
  }
  // Permissions should be fetched from DB, not trusted from token
  return { accountId: payload.accountId, roleCode: payload.roleCode };
}
```

---

### 6. **Permissions Not Fetched from Database**

**File**: `strategies/jwt.strategy.ts:28`  
**Issue**: Permissions array stored in JWT — becomes stale if roles changed

```typescript
// ❌ Store in token (scope creep)
permissions: payload.permissions || []

// ✅ Should query from DB
async validate(payload: any) {
  const user = await this.usersService.findById(payload.accountId);
  return { ...payload, permissions: user.permissions };
}
```

**Why**: If admin revokes permission, user still has it until token expires (24h window).

---

### 7. **Missing Input Validation in Refresh**

**File**: `auth.controller.ts:47`  
**Issue**: `refresh` endpoint has no DTO validation for refresh token format

```typescript
@Post('refresh')
async refresh(@Body() body: { refresh_token?: string }) {
  // No validation that refresh_token is non-empty UUID/JWT
  return this.authService.refreshToken(body.refresh_token ?? '');
}
```

**Recommendation**:
```typescript
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

@Post('refresh')
async refresh(@Body() dto: RefreshTokenDto) {
  return this.authService.refreshToken(dto.refresh_token);
}
```

---

### 8. **Missing Rate Limiting on Auth Endpoints**

**File**: `app.module.ts:23`  
**Issue**: Global throttle (100 req/min) applies uniformly; auth endpoints need stricter limits

```typescript
// ❌ Current (too lenient for auth)
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])

// ✅ Need fine-grained throttling
// Login: 5 req/min
// MFA verify: 5 req/min (max 5 attempts)
// Forgot password: 3 req/hour per email
```

**Recommendation**: Add per-route throttling decorators (Throttle guards not yet implemented).

---

### 9. **Missing Cors Origin Validation**

**File**: `app.module.ts:37-42`  
**Issue**: CORS origins parsed from comma-separated string without validation

```typescript
const allowedOrigins = configService.get<string>('allowedOrigins');
app.enableCors({
  origin: Array.isArray(allowedOrigins)
    ? allowedOrigins
    : allowedOrigins?.split(',') || [],  // No URL validation
  credentials: true,
});
```

**Recommendation**:
```typescript
const originString = configService.get<string>('allowedOrigins');
const origins = originString?.split(',').map(o => {
  try { new URL(o); return o; }
  catch { throw new Error(`Invalid CORS origin: ${o}`); }
}) || [];
app.enableCors({ origin: origins, credentials: true });
```

---

### 10. **TypeORM Synchronize Disabled But No Validation**

**File**: `database/database.module.ts:15`  
**Issue**: `synchronize: false` (correct), but no check that migrations ran successfully

```typescript
synchronize: false,
migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
migrationsRun: true,  // Auto-run, but no error handling
```

**Recommendation**: 
```typescript
onModuleInit() {
  this.logger.log('Waiting for migrations...');
  // Check migration status in app bootstrap
}
```

---

### 11. **Missing Content Security Policy**

**File**: `main.ts:35`  
**Issue**: Helmet is used but CSP not explicitly configured

```typescript
// ✅ Add explicit CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // For swagger UI
    },
  },
}));
```

---

### 12. **Audit Log Service Silently Fails**

**File**: `audit-log/audit-log.service.ts:46-48`  
**Issue**: Audit log errors swallowed, no alerting mechanism

```typescript
catch (error) {
  this.logger.error({ event: 'audit_log.save_failed', error });
  // No throw — audit failure silently ignored
}
```

**Recommendation**:
- Don't swallow audit log errors (they indicate DB issues)
- Let error propagate so caller can handle
- Or throw custom `AuditLogException` with alerting

```typescript
catch (error) {
  this.logger.error({ event: 'audit_log.save_failed', error });
  throw new InternalServerErrorException('Unable to save audit log');
}
```

---

### 13. **Missing AccessToken Expiry Validation**

**File**: `config/configuration.ts:22`  
**Issue**: JWT expiry times are strings, not validated for format

```typescript
accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',  // No validation
refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d', // No validation
```

**Recommendation**: Validate on bootstrap:
```typescript
const accessExpiry = configService.get('jwt.accessTokenExpiry');
if (!['24h', '48h', '1d', '2d'].includes(accessExpiry)) {
  throw new Error(`Invalid JWT_ACCESS_EXPIRY: ${accessExpiry}`);
}
```

---

### 14. **Missing Logging for Security Events**

**File**: `auth.controller.ts`  
**Issue**: No logging for authentication events (only in service)

```typescript
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);  // Controller doesn't log request details
}
```

**Recommendation**: Log in controller with request context:
```typescript
@Post('login')
@Permissions('auth.login')  // Even public endpoints need permission (ALLOW_ALL)
async login(@Body() dto: LoginDto, @Req() req: Request) {
  this.logger.log({ 
    event: 'auth.login.attempt', 
    email: dto.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  try {
    return await this.authService.login(dto);
  } catch (error) {
    this.logger.warn({
      event: 'auth.login.failed',
      email: dto.email,
      ipAddress: req.ip,
      error: error.message,
    });
    throw error;
  }
}
```

---

### 15. **Missing Response DTOs**

**File**: `auth.controller.ts`  
**Issue**: No response DTOs defined, Swagger responses return generic objects

```typescript
// ❌ No response DTO
@ApiResponse({ status: 200, description: 'Access token returned' })
async verifyMfa(...) {
  return { data: { access_token: result.accessToken, user: result.user } };
}

// ✅ Should have
export class MfaVerifyResponseDto {
  @ApiProperty()
  data: {
    access_token: string;
    user: UserResponseDto;
  };
}

@ApiResponse({ status: 200, type: MfaVerifyResponseDto })
```

---

## 📋 Summary Table

| Issue | Severity | Category | Status |
|-------|----------|----------|--------|
| RefreshToken from body | 🔴 HIGH | Security | TODO |
| JWT public key missing | 🔴 HIGH | Config | TODO |
| MFA workflow incomplete | 🔴 HIGH | Auth | TODO |
| Password reset token missing | 🔴 HIGH | Auth | TODO |
| Unvalidated JWT payload | 🟠 MEDIUM | Security | TODO |
| Permissions from token (stale) | 🟠 MEDIUM | Security | TODO |
| Missing refresh DTO validation | 🟠 MEDIUM | Validation | TODO |
| Missing auth rate limiting | 🟠 MEDIUM | Security | TODO |
| CORS origin validation | 🟠 MEDIUM | Config | TODO |
| Missing CSP headers | 🟠 MEDIUM | Security | TODO |
| Audit log errors swallowed | 🟠 MEDIUM | Reliability | TODO |
| Missing expiry validation | 🟡 LOW | Config | TODO |
| Missing security logging | 🟡 LOW | Observability | TODO |
| Missing response DTOs | 🟡 LOW | API | TODO |

---

## 16. **Missing Entity Files for Database Tables**

**File**: `database/migrations/1711900800000-InitialSchema.ts`  
**Issue**: Database schema defined in raw SQL migration, but no TypeORM entity files created yet

The migration creates 50+ tables (m_roles, m_ja, t_dokusya, t_hanbaiten, etc.) but only 2 entity files exist:
- `audit-log/entities/log.entity.ts` ✅
- `audit-log/entities/login-log.entity.ts` ✅

**Missing entities** (646 line migration for tables without entities):
- m_roles, m_permissions, m_roles_permissions
- m_ja, m_kanri_shiten, m_shiten
- m_code, m_todofuken
- t_dokusya, t_hanbaiten
- t_mfa_otp, t_password_reset_token (need to add)
- t_subscription_type, t_payment_method, etc.

**Recommendation**: 
1. Run `npm run migration:generate -- -n ...` to create entity files from tables
2. Create TypeORM entities with proper:
   - `@Entity('table_name')` decorators
   - `@Column()` decorators for each field
   - `@Index()` for common queries
   - `@OneToMany()` / `@ManyToOne()` relationships

Example:
```typescript
// Module should have:
@Module({
  imports: [TypeOrmModule.forFeature([MRole, MPermission, MAccount])],
  // ... rest
})
```

---

## 17. **Test Coverage at 0%**

**File**: `vitest.config.ts`  
**Issue**: Coverage threshold set to 80% but zero tests exist

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

**Current Status**:
- ✅ Vitest configured correctly
- ❌ `test/` folder is empty
- ❌ Zero `.spec.ts` files

**Recommendation**: Create unit tests for all services (>80% coverage):
1. AuthService: login, mfa, password reset flows
2. AuditLogService: log operation, log login
3. MailService: OTP, password reset emails
4. StorageService: upload, download, signed URLs

Minimum test count: 40+ tests to reach 80% coverage.

---

## 🎯 Immediate Next Steps

**Priority 1 (Security-Critical)**:
1. Implement MFA workflow with database storage (t_mfa_otp table)
2. Implement password reset token validation (t_password_reset_token table)
3. Fix refresh token to read from httpOnly cookie only
4. Validate JWT payload and fetch permissions from DB

**Priority 2 (Code Quality)**:
5. Create TypeORM entity files for all 50+ database tables
6. Create response DTOs for all endpoints (MfaVerifyResponseDto, RefreshResponseDto, etc.)
7. Add rate limiting decorators on auth endpoints
8. Add security logging on all auth paths

**Priority 3 (Testing)**:
9. Create unit tests for AuthService (login, MFA, password reset)
10. Create unit tests for AuditLogService
11. Create unit tests for MailService
12. Achieve 80% coverage for critical modules

**Priority 4 (Hardening)**:
13. Add explicit CSP headers
14. Validate CORS origins on bootstrap
15. Update audit log to throw on failure
16. Validate JWT secret keys on app init

---

## ✨ Overall Assessment

**Score: 7.0/10**

**Strengths**: 
- Modern NestJS patterns, proper security architecture (RBAC, DataScope, RS256)
- Good module organization, error handling, health checks
- Well-structured database schema with migrations
- Audit logging service for compliance

**Weaknesses**: 
- Auth workflows incomplete (TODOs remain for MFA, reset password, refresh token)
- Security gaps (refresh token flow, permission caching, JWT validation)
- Zero test coverage (no .spec.ts files)
- Missing TypeORM entity files for 50+ tables
- Missing response DTOs, missing request validation on some endpoints

**Verdict**: **Good architecture foundation, but NOT production-ready**. 

Must complete before deployment:
- ✅ All TODO items in auth service
- ✅ TypeORM entity files for all tables
- ✅ 80+ unit tests for >80% coverage
- ✅ Security fixes (refresh token, JWT validation, rate limiting)
- ✅ Response DTOs for Swagger documentation

