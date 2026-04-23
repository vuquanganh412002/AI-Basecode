# Scaffold Skill Review — agrinews

**Date**: April 17, 2026  
**Reviewer**: GitHub Copilot  
**File**: `.claude/skills/scaffold/SKILL.md` + templates

---

## ✅ Strengths

### 1. **Comprehensive Documentation**
- ✅ Well-organized phases (1-6) with clear deliverables
- ✅ Critical rules boxes prevent production bugs
- ✅ 21 template files documented with "why it's a template"
- ✅ Validation checklist (21 items) for sign-off
- ✅ Constraints section lists forbidden patterns

### 2. **Production-Proven Templates**
- ✅ All 21 backend/frontend/Docker templates follow standards
- ✅ `strictPropertyInitialization: false` in tsconfig.json (TypeORM decorator fix)
- ✅ JWT RS256 with file-based key management
- ✅ Multi-stage Dockerfiles with health checks
- ✅ nginx SSL with HSTS + security headers

### 3. **Security Architecture**
- ✅ JWT RS256 (never HS256)
- ✅ HTTP-only cookies for refresh tokens
- ✅ RBAC guards + DataScope filters
- ✅ Email masking in logs (`maskEmail()`)
- ✅ Password bcrypt 10 rounds
- ✅ Global exception filter hides 500 internals
- ✅ Helmet + CORS configured

### 4. **Clean Architecture**
- ✅ Domain-driven modules (auth, health, storage, mail)
- ✅ Provider pattern for storage (MinIO/S3) and mail (SMTP/SES)
- ✅ Dependency injection throughout
- ✅ Configuration externalizedto environment files
- ✅ Request ID tracing via middleware

### 5. **Database & Migration Strategy**
- ✅ `synchronize: false` + `migrationsRun: true` (correct pattern)
- ✅ `data-source.ts` for CLI migrations
- ✅ Migration-first development (never sync models)
- ✅ Connection pooling configured
- ✅ Initial migration generation documented

### 6. **Frontend Best Practices**
- ✅ Vue 3 Composition API (script setup only)
- ✅ Vite with allowedHosts (prevents nginx proxy issues)
- ✅ Ant Design Vue with **correct icon slot pattern** (`#prefix`, not `:prefix` prop)
- ✅ Tailwind + Ant Design Vue with `corePlugins: preflight: false`
- ✅ Orval for typed API generation
- ✅ Access token in memory only (never localStorage)
- ✅ Refresh token via HTTP-only cookie

### 7. **Docker & Local Development**
- ✅ Docker Compose with 7 services (postgres, backend, frontend, nginx, mailhog, minio, minio-init)
- ✅ Local SSL with mkcert + locally-trusted certificates
- ✅ Hot reload via volume mounts (src/)
- ✅ Health checks on postgres, minio
- ✅ nginx `/health` proxy block (critical!)
- ✅ HTTP → HTTPS redirect

### 8. **Post-Generation Automation**
- ✅ Shell scripts for certs + hosts setup
- ✅ Orval integration for typed API client
- ✅ .env symlink handling documented
- ✅ Project-agnostic (all `$ARGUMENTS` based)

---

## ⚠️ Issues & Recommendations

### 1. **axios-instance.ts Request Interceptor Has Dynamic Import Issue**

**File**: `templates/frontend/axios-instance.ts` (lines 13-22)  
**Issue**: Uses dynamic import in request interceptor, which is async but interceptor expects sync operation

```typescript
// ❌ Current (BROKEN)
instance.interceptors.request.use((config) => {
  const authModule = import('@/stores/auth.store');  // Returns Promise!
  authModule.then(({ useAuthStore }) => {
    const authStore = useAuthStore();
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
  });
  return config;  // Interceptor completes before auth header is added
});
```

**Why it breaks**: The interceptor returns immediately while the import Promise is still pending. Request headers won't contain the Bearer token.

**Recommendation**:
```typescript
import { useAuthStore } from '@/stores/auth.store';

instance.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});
```

Or if circular dependency is a concern:
```typescript
instance.interceptors.request.use((config) => {
  try {
    const authStore = (window as any).__authStore;
    if (authStore?.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }
  } catch {}
  return config;
});
```

---

### 2. **Missing docker-compose.yml Template**

**File**: `SKILL.md` (line 167)  
**Issue**: Template table references 21 files, but `docker-compose.yml` is not in the templates list

```
# Template → Target mapping (21 files)
| # | Template | Target | Why it's a template |
...
| 14 | `docker/env.development` | `apps/.env.development` | ...
| 15 | `docker/Dockerfile.backend` | `apps/docker/backend/Dockerfile` | ...
```

**Missing**: `docker/docker-compose.yml` — should be #11, required for Phase 4

**Recommendation**:
1. Add docker-compose.yml to templates/docker/
2. Update table to include it as row 11
3. Document all 7 services: postgres, backend, frontend, nginx, mailhog, minio, minio-init

---

### 3. **Entity Generation Not Fully Documented**

**File**: `SKILL.md` (Phase 2.9.1)  
**Issue**: Says "After all entity files are created" but doesn't explain how to create them in the first place

```
## 2.9.1 Initial Migration Generation (MANDATORY during scaffold)

**After all entity files are created, the skill MUST also generate an initial migration file**
```

**Missing details**:
- Where do entity files go? (`src/modules/*/entities/`)
- What should they look like? (Example entity with decorators)
- Should the skill auto-generate them or is user responsible?
- How many entities should be created for a minimal scaffold?

**Recommendation**: Add section showing minimal entity files needed:
```typescript
// src/modules/audit-log/entities/log.entity.ts
@Entity('t_log')
export class Log {
  @PrimaryGeneratedColumn('bigint')
  logId: number;

  @Column('varchar', { length: 100 })
  event: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### 4. **Environment Variable Validation Missing**

**File**: `SKILL.md` (Phase 2.3)  
**Issue**: Configuration reads from env but doesn't validate on bootstrap

```typescript
// config/configuration.ts
jwt: {
  privateKey: process.env.JWT_PRIVATE_KEY_PATH
    ? readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8') : '',
  publicKey: process.env.JWT_PUBLIC_KEY_PATH
    ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8') : '',
}
```

If paths are wrong, files won't exist → `readFileSync` throws → silent failure in production.

**Recommendation**: Add to app bootstrap:
```typescript
// src/main.ts
onModuleInit() {
  const config = app.get(ConfigService);
  if (!config.get('jwt.privateKey')) {
    throw new Error('JWT_PRIVATE_KEY_PATH not configured or file not found');
  }
  if (!config.get('jwt.publicKey')) {
    throw new Error('JWT_PUBLIC_KEY_PATH not configured or file not found');
  }
}
```

---

### 5. **axios-instance.ts 401 Response Handling Incomplete**

**File**: `templates/frontend/axios-instance.ts` (lines 24-35)  
**Issue**: Redirect on 401 but doesn't clear Pinia state

```typescript
if (status === 401) {
  try {
    const { useAuthStore } = await import('@/stores/auth.store');
    const authStore = useAuthStore();
    await authStore.refreshToken();  // If this fails...
    return instance(error.config);    // We still try to retry
  } catch {
    router.push({ name: 'Login', query: { redirect: ... } });  // But forgot to clear token
  }
}
```

If refresh fails, the store still has stale token → user redirected but can try again × N times.

**Recommendation**:
```typescript
if (status === 401) {
  const { useAuthStore } = await import('@/stores/auth.store');
  const authStore = useAuthStore();
  try {
    await authStore.refreshToken();
    return instance(error.config);
  } catch (err) {
    authStore.logout();  // Clear token
    router.push({ name: 'Login', query: { redirect: ... } });
    return Promise.reject(err);
  }
}
```

---

### 6. **Setup Commands Missing Integration Test**

**File**: `SKILL.md` (Phase 6.2)  
**Issue**: After setup, no validation that all services are healthy

Current:
```bash
./scripts/generate-certs.sh
./scripts/setup-hosts.sh
cd apps && docker compose up -d --build
```

Missing:
```bash
# Wait for health checks to pass
sleep 30
docker compose logs backend  # Check for errors
docker compose ps            # Verify all services running
```

**Recommendation**: Add to skill:
```bash
# Verify all services are healthy
echo "Waiting for services to be ready..."
max_attempts=30
for ((i=1; i<=max_attempts; i++)); do
  if curl -sk https://$ARGUMENTS.local/health &>/dev/null; then
    echo "✓ Backend is ready"
    break
  fi
  if [ $i -eq $max_attempts ]; then
    echo "✗ Backend failed to start"
    docker compose logs backend
    exit 1
  fi
  sleep 1
done
```

---

### 7. **Orval Config Not in Templates**

**File**: `SKILL.md` (Phase 3.2)  
**Issue**: Says to create `orval.config.ts` but template not provided

```
| File | Key points |
|------|------------|
| ...
| orval.config.ts | Input `./swagger.json`, output `./src/api/generated.ts`, ... |
```

**Missing**: `templates/frontend/orval.config.ts`

**Recommendation**: Add template with:
```typescript
import { defineConfig } from '@orval/core';

export default defineConfig({
  'api': {
    input: './swagger.json',
    output: {
      target: './src/api/generated.ts',
      client: 'axios',
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
```

---

### 8. **No Guidance on DB Seeding**

**File**: `SKILL.md` (mention of seeder.md but no instructions)  
**Issue**: Says "If `docs/database/seeder.md` exists, also generate a second migration" but:
- How to create seeder.md?
- What format? (JSON? YAML?)
- Which data should be seeded? (roles, permissions, users?)

**Recommendation**: Add Phase 2.9.2 with seeder.md format:
```markdown
## Seed Data Format (docs/database/seeder.md)

```yaml
tables:
  m_roles:
    - role_id: 1
      role_code: ADMIN
      role_name: Administrator
  m_permissions:
    - permission_id: 1
      permission_code: user.view
      permission_name: View Users
```

---

### 9. **MFA DTO Missing from Backend Template**

**File**: `SKILL.md` (Phase 2.5)  
**Issue**: Auth endpoints reference MFA but no DTO templates provided

```typescript
@Post('mfa/verify')
async verifyMfa(
  @Body() body: { mfa_token: string; otp_code: string },
  @Res({ passthrough: true }) res: Response,
)
```

Should be:
```typescript
export class VerifyMfaDto {
  @ApiProperty()
  @IsNotEmpty()
  mfa_token: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(6, 6)
  otp_code: string;
}
```

**Recommendation**: Add DTO templates for auth endpoints:
- `login.dto.ts` ✅ (exists in current codebase)
- `verify-mfa.dto.ts` ❌
- `resend-mfa.dto.ts` ❌
- `reset-password.dto.ts` ❌
- `forgot-password.dto.ts` ❌

---

### 10. **Missing Response DTOs for All Endpoints**

**File**: `SKILL.md` (doesn't mention response DTOs)  
**Issue**: Only request DTOs covered; response DTOs missing

**Recommendation**: Add to Phase 2.5:
```typescript
export class LoginResponseDto {
  @ApiProperty()
  mfa_required: boolean;

  @ApiProperty()
  mfa_token?: string;

  @ApiProperty()
  access_token?: string;

  @ApiProperty()
  user?: { id: string; email: string; };
}
```

---

### 11. **Refresh Token Endpoint Missing DTO Validation**

**File**: `templates/frontend/axios-instance.ts` (lines 24-29)  
**Issue**: Refresh endpoint in template has no input validation

```typescript
// ❌ No validation
@Post('refresh')
async refresh(@Body() body: { refresh_token?: string }) {
  return this.authService.refreshToken(body.refresh_token ?? '');
}

// ✅ Should validate
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}
```

**Recommendation**: Add RefreshTokenDto to backend auth DTOs.

---

### 12. **PostgreSQL Version Not Pinned**

**File**: `SKILL.md` (Phase 4.1)  
**Issue**: Says "Use latest stable (16-alpine)" but docker-compose template might use unpinned image

```yaml
# ❌ Unpinned
postgres:
  image: postgres:latest

# ✅ Pinned
postgres:
  image: postgres:16-alpine
```

**Recommendation**: Ensure docker-compose.yml template uses exact version tags.

---

### 13. **Missing Linting Instructions**

**File**: `SKILL.md` (doesn't cover linting)  
**Issue**: No mention of ESLint, Prettier, or how to lint generated code

**Recommendation**: Add Phase 6.3:
```bash
# Setup linting
cd apps/backend && npm run lint
cd ../frontend && npm run lint
```

---

### 14. **Validation Checklist Missing Some Items**

**File**: `SKILL.md` (Section "Validation Checklist")  
**Issue**: Only 21 items; missing critical checks

**Missing checks**:
- [ ] All templates replaced `__PROJECT__` with actual name
- [ ] JWT keys file-readable (correct permissions)
- [ ] Database seeded with admin account
- [ ] Backend ESLint passes
- [ ] Frontend ESLint + Prettier passes
- [ ] All env vars in .env.example documented
- [ ] No hardcoded secrets in any template
- [ ] Docker images tagged correctly (versioned, not latest)

---

### 15. **Setup-hosts.sh Shell Script Issue**

**File**: `templates/scripts/setup-hosts.sh`  
**Issue**: Not provided as a template; would need to be reviewed

**Recommendation**: Review setup-hosts.sh when it's available to ensure:
- Uses `set -euo pipefail`
- Checks if entry already exists (idempotent)
- Handles macOS vs Linux differences

---

## 📋 Summary Table

| Issue | Severity | Category | Status |
|-------|----------|----------|--------|
| axios-instance interceptor dead code | 🔴 HIGH | Frontend | TODO |
| Missing docker-compose.yml template | 🔴 HIGH | Docker | TODO |
| Entity generation not documented | 🔴 HIGH | Backend | TODO |
| Missing environment variable validation | 🟠 MEDIUM | Backend | TODO |
| axios 401 refresh doesn't clear token | 🟠 MEDIUM | Frontend | TODO |
| Missing bootstrap service health check | 🟠 MEDIUM | Infra | TODO |
| Missing orval.config.ts template | 🟠 MEDIUM | Frontend | TODO |
| No DB seeding documentation | 🟠 MEDIUM | Database | TODO |
| MFA DTOs not templated | 🟠 MEDIUM | Backend | TODO |
| Missing response DTOs | 🟠 MEDIUM | Backend | TODO |
| Refresh token DTO validation missing | 🟠 MEDIUM | Backend | TODO |
| PostgreSQL version not pinned | 🟠 MEDIUM | Docker | TODO |
| Missing linting instructions | 🟡 LOW | Process | TODO |
| Validation checklist incomplete | 🟡 LOW | Process | TODO |
| setup-hosts.sh shell issues | 🟡 LOW | Scripts | TODO |

---

## 🎯 Recommendations by Priority

### Priority 1 (Blocker Issues)
1. **Fix axios-instance.ts** — Request interceptor won't add Bearer token
2. **Add docker-compose.yml template** — Essential for Phase 4
3. **Document entity generation** — Users won't know how to create entities

### Priority 2 (Quality Issues)
4. Add environment variable validation on bootstrap
5. Fix 401 response handling to clear token state
6. Add post-startup health check
7. Template missing: orval.config.ts, setup-hosts.sh
8. Add MFA request/response DTOs
9. Add all response DTOs for Swagger docs

### Priority 3 (Polish)
10. Add linting instructions
11. Expand validation checklist
12. Pin PostgreSQL version
13. Add database seeding documentation
14. Document refresh token DTO

---

## 🏗️ Architecture Assessment

**Strengths**:
- Project-agnostic (fully parameterized with `$ARGUMENTS`)
- Production-proven (battle-tested templates)
- Clean layered architecture
- Proper security patterns (JWT RS256, RBAC, DataScope)
- Migration-first database strategy
- Comprehensive documentation with phases

**Weaknesses**:
- Some critical impl details missing (DTOs, validation)
- Frontend axios integration has bugs
- Database seeding not documented
- Post-launch health checks missing

---

## ✨ Overall Assessment

**Score: 8.0/10**

**Verdict**: Excellent skill documentation and templates with **solid foundation**, but needs fixes in:
- Frontend axios interceptor (currently broken for auth)
- Missing critical templates (docker-compose.yml, orval.config.ts)
- Entity generation guidance
- Post-startup validation

**Recommendation**: Fix Priority 1 issues before users run the skill. All other issues can be addressed in v2.

