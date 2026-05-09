---
name: scaffold
description: Scaffold a production-ready fullstack monorepo (NestJS + Vue 3 + Docker). Generates backend, frontend, Docker Compose, nginx with local SSL, storage/email abstractions, and environment configs. Reusable across projects.
disable-model-invocation: true
argument-hint: project_name
---

# Scaffold Project

## Description

Generate a production-ready fullstack monorepo. The output is Dockerized, uses clean architecture, and is designed for easy AWS migration. This skill is **project-agnostic** — all project-specific values derive from the `$ARGUMENTS` parameter.

## Inputs

**Required argument:** `$ARGUMENTS` = project name (e.g., `agrinews`, `crm`, `eshop`)

All generated files use `$ARGUMENTS` as:
- Package name: `$ARGUMENTS-backend`, `$ARGUMENTS-frontend`
- Docker network: `$ARGUMENTS-network`
- Database name: `${ARGUMENTS}_dev`
- S3 bucket: `$ARGUMENTS`
- Local domain: `$ARGUMENTS.local` (configurable in env)
- Compose project: `$ARGUMENTS`

**Stack (fixed):**
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: Vue 3 + Vite + Ant Design Vue + Tailwind CSS + Pinia
- API Client: Orval (auto-generated from Swagger/OpenAPI)
- Auth: HTTP-only Cookie session (Redis-backed, 24h sliding TTL)
- Infra: Docker Compose (local, with Redis), AWS-ready (ElastiCache Redis for production)

## Templates

This skill ships with a `templates/` directory containing **exact, tested, production-proven files** for all critical components. These files use `__PROJECT__` as placeholder.

### Template → Target mapping (21 files)

Copy each template to its target path. Replace all `__PROJECT__` with `$ARGUMENTS` value.

| # | Template | Target | Why it's a template |
|---|----------|--------|-------------------|
| 1 | `backend/tsconfig.json` | `apps/backend/tsconfig.json` | strictPropertyInitialization: false |
| 2 | `backend/main.ts` | `apps/backend/src/main.ts` | ValidationPipe exceptionFactory + Swagger |
| 3 | `backend/app.module.ts` | `apps/backend/src/app.module.ts` | Request ID middleware (as unknown as) |
| 4 | `backend/global-exception.filter.ts` | `apps/backend/src/common/filters/global-exception.filter.ts` | Returns `{ error_code, message, errors? }` — reads `ErrorCode` from `error-codes.constant.ts` |
| 4a | `backend/error-codes.constant.ts` | `apps/backend/src/common/constants/error-codes.constant.ts` | Single source of truth for error codes + default JP messages |
| 4b | `backend/domain.exception.ts` | `apps/backend/src/common/exceptions/domain.exception.ts` | Base exception class with `code` field |
| 4c | `backend/common.exceptions.ts` | `apps/backend/src/common/exceptions/common.exceptions.ts` | 8 ready-to-use common exceptions (UnauthorizedException, NotFoundException, etc.) |
| 5 | `backend/database.module.ts` | `apps/backend/src/database/database.module.ts` | ConfigService generic `get<string>()`, `migrationsRun: true`, `synchronize: false` |
| 5b | `backend/data-source.ts` | `apps/backend/src/database/data-source.ts` | CLI DataSource for `migration:generate / run / revert` |
| 5c | — (generated) | `apps/backend/src/database/migrations/{TS+00N}-Create{Table}.ts` | One file per table — CREATE TABLE + indexes + FKs. Timestamps FK-safe. |
| 5d | — (generated) | `apps/backend/src/database/migrations/{TS2+00N}-Seed{Table}.ts` | One file per seed category from `docs/database/seeder.md` (optional) |
| 6 | `backend/session-auth.guard.ts` | `apps/backend/src/common/guards/session-auth.guard.ts` | Reads signed `session_id` cookie, validates against Redis, extends TTL |
| 6a | `backend/session.service.ts` | `apps/backend/src/modules/auth/session.service.ts` | Redis-backed session CRUD (create/get/touch/destroy/destroyAllForAccount) |
| 6b | `backend/redis.module.ts` | `apps/backend/src/modules/redis/redis.module.ts` | Global ioredis client (supports REDIS_URL + TLS for AWS ElastiCache) |
| 6c | `backend/redis.service.ts` | `apps/backend/src/modules/redis/redis.service.ts` | Thin wrapper over ioredis |
| 6d | `backend/m-code.entity.ts` | `apps/backend/src/database/entities/m-code.entity.ts` | m_code table mapping (unique `(code_category, code_value)`) — lives in shared `database/entities/`, not in code module |
| 6e | `backend/code.service.ts` | `apps/backend/src/modules/code/code.service.ts` | `@Global` service — caches all m_code rows at `onModuleInit`; exposes `has()`, `getLabel()`, `reload()` |
| 6f | `backend/code.controller.ts` | `apps/backend/src/modules/code/code.controller.ts` | `GET /api/v1/codes` + `GET /api/v1/codes/:category` (session-auth) |
| 6g | `backend/code.module.ts` | `apps/backend/src/modules/code/code.module.ts` | `@Global()` — inject `CodeService` from any feature module without re-importing |
| 6h | `backend/create-integration-app.ts` | `apps/backend/test/utils/create-integration-app.ts` | Shared helper for `*.integration.spec.ts` — boots full Nest app on pg-mem + ioredis-mock + cookie-parser + ConfigModule + MailService stub. Solves the 5 wiring obstacles documented in the file header. Spec calls `createIntegrationTestApp({ modules: [MyModule] })` and gets `{app, dataSource, redis, sessionService, seedSession, close}`. Append new entity classes to `ALL_ENTITIES` as feature modules are added. |
| 7 | `frontend/vite.config.ts` | `apps/frontend/vite.config.ts` | allowedHosts for nginx proxy |
| 9 | `frontend/axios-instance.ts` | `apps/frontend/src/api/axios-instance.ts` | Thin interceptor — delegates to `handleApiError` |
| 9a | `frontend/error-codes.ts` | `apps/frontend/src/constants/error-codes.ts` | Mirror of backend `ErrorCode` — keep in sync |
| 9b | `frontend/error-handler.ts` | `apps/frontend/src/api/error-handler.ts` | Central switch on `error_code` → toast / redirect / delegate |
| 9c | `frontend/useApiForm.ts` | `apps/frontend/src/composables/useApiForm.ts` | Composable that maps `VALIDATION_ERROR.errors[]` to form fields |
| 9d | `frontend/tailwind.config.ts` | `apps/frontend/tailwind.config.ts` | Design tokens (primary, Noto Sans JP, rounded-ant), `darkMode: 'class'`, `preflight: false` |
| 9e | `frontend/styles/tailwind.css` | `apps/frontend/src/styles/tailwind.css` | Google Fonts + Material Icons imports, `@layer base` body styles |
| 9f | `frontend/composables/useDarkMode.ts` | `apps/frontend/src/composables/useDarkMode.ts` | Singleton `{mode, toggle, set}` + localStorage + prefers-color-scheme |
| 9g | `frontend/composables/useBreadcrumb.ts` | `apps/frontend/src/composables/useBreadcrumb.ts` | Reads `route.meta.breadcrumb` chain → `[{label, to}]` |
| 9h | `frontend/composables/useTableQuery.ts` | `apps/frontend/src/composables/useTableQuery.ts` | `{state, loading, total, onChange, applyFilters, resetFilters}` + optional URL sync |
| 10 | `frontend/layouts/AuthLayout.vue` | `apps/frontend/src/layouts/AuthLayout.vue` | Centered card wrapper + floating dark toggle |
| 10a | `frontend/layouts/MainLayout.vue` | `apps/frontend/src/layouts/MainLayout.vue` | Sidebar + header + content. Replaces old `components/layout/MainLayout.vue` |
| 10b | `frontend/components/layout/AppSidebar.vue` | `apps/frontend/src/components/layout/AppSidebar.vue` | **CUSTOMIZE:** replace sections array with project menu. `__PROJECT_NAME__` → brand |
| 10c | `frontend/components/layout/AppHeader.vue` | `apps/frontend/src/components/layout/AppHeader.vue` | Notification bell + user dropdown + logout |
| 10d | `frontend/components/layout/DarkModeToggle.vue` | `apps/frontend/src/components/layout/DarkModeToggle.vue` | Reusable theme toggle button |
| 10d1 | `frontend/components/common/BaseCard.vue` | `apps/frontend/src/components/common/BaseCard.vue` | Unified card wrapper — `variant: content\|auth\|flat`, `no-padding`. Use everywhere instead of raw `<section>` |
| 10d2 | `frontend/components/common/BaseIconButton.vue` | `apps/frontend/src/components/common/BaseIconButton.vue` | Round icon button — notification, dark toggle, header actions. `badge` prop for red dot |
| 10e | `frontend/components/common/BasePageHeader.vue` | `apps/frontend/src/components/common/BasePageHeader.vue` | title + auto breadcrumb + `actions` slot |
| 10f | `frontend/components/common/BaseSearchForm.vue` | `apps/frontend/src/components/common/BaseSearchForm.vue` | grid wrapper + 検索/検索クリア + `extra` slot |
| 10g | `frontend/components/common/BaseDataTable.vue` | `apps/frontend/src/components/common/BaseDataTable.vue` | `<script setup generic="T">`. Forwards all a-table slots (`bodyCell`, etc.) |
| 10h | `frontend/components/common/BaseActionColumn.vue` | `apps/frontend/src/components/common/BaseActionColumn.vue` | 編集/削除 with `canEdit/canDelete` props |
| 10i | `frontend/components/common/BaseConfirmModal.vue` | `apps/frontend/src/components/common/BaseConfirmModal.vue` | v-model:open + `danger` prop for destructive actions |
| 10j | `frontend/components/common/MfaInput.vue` | `apps/frontend/src/components/common/MfaInput.vue` | v-model + `@complete` event + paste auto-fill |
| 10k | `frontend/components/common/NoticeList.vue` | `apps/frontend/src/components/common/NoticeList.vue` | お知らせ card with date + title |
| 10k1 | `frontend/codes-api.ts` | `apps/frontend/src/api/codes/codes.ts` | Thin axios wrapper for `GET /api/v1/codes` + per-category |
| 10k2 | `frontend/codes.store.ts` | `apps/frontend/src/stores/codes.store.ts` | `useCodesStore` — m_code cache. `loadAll()` / `reset()` called from `auth.store` lifecycle |
| 10l | `frontend/LoginView.vue` | `apps/frontend/src/views/auth/LoginView.vue` | SCR-001. Replace `__BRAND_NAME__`, `__SYSTEM_NAME__`, `__CONTACT_*__` placeholders |
| 10m | `frontend/MfaVerifyView.vue` | `apps/frontend/src/views/auth/MfaVerifyView.vue` | SCR-001 MFA step — uses `MfaInput` + redirects on complete |
| 11 | `docker/docker-compose.yml` | `apps/docker-compose.yml` | 7 services, volume mounts, healthchecks |
| 12 | `docker/nginx.conf` | `apps/docker/nginx/nginx.conf` | `/health` proxy block |
| 13 | `docker/nginx-ssl.conf` | `apps/docker/nginx/nginx-ssl.conf` | HTTPS + `/health` proxy block |
| 14 | `backend/env.development` | `apps/backend/.env.development` | Backend runtime vars (DB, REDIS, SESSION, STORAGE, MAIL). Compose symlinks `apps/.env` → this file. |
| 15 | `docker/Dockerfile.backend` | `apps/docker/backend/Dockerfile` | `npm install` (not npm ci) |
| 16 | `docker/Dockerfile.backend.prod` | `apps/docker/backend/Dockerfile.prod` | Multi-stage + non-root + healthcheck |
| 17 | `docker/Dockerfile.frontend` | `apps/docker/frontend/Dockerfile` | `npm install` (not npm ci) |
| 18 | `docker/Dockerfile.frontend.prod` | `apps/docker/frontend/Dockerfile.prod` | Multi-stage nginx |
| 19 | `docker/Dockerfile.nginx` | `apps/docker/nginx/Dockerfile` | Simple nginx |
| 20 | `scripts/generate-certs.sh` | `scripts/generate-certs.sh` | mkcert + openssl |
| 21 | `scripts/setup-hosts.sh` | `scripts/setup-hosts.sh` | /etc/hosts entry |

### How to use

**Step 1:** For each row in the table above:
1. Read the template file from `.claude/skills/scaffold/templates/{template}`
2. Replace all `__PROJECT__` with the `$ARGUMENTS` value
3. Write to the target path

**Step 2:** For remaining files not in templates (~60 files):
- Generate based on the phase specifications below
- Follow the "Critical rules" boxes to avoid known bugs

## Pre-flight

### 1. Read project rules (if they exist)

Check if `.claude/rules/` directory exists. If yes, read ALL rule files and follow them for code generation. If no rules exist, use the defaults defined in this skill.

### 2. Read database schema (if exists)

If `docs/database/database-design.md` exists, use its table definitions for entity generation. Otherwise generate generic audit-log entities.

---

## Phase 1: Folder Structure

Create this structure. Replace `$ARGUMENTS` with the actual project name value.

```
apps/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── constants/
│   │   │   │   └── error-codes.constant.ts  # ErrorCode enum + JP messages
│   │   │   ├── decorators/
│   │   │   │   └── permissions.decorator.ts
│   │   │   ├── dto/
│   │   │   │   └── pagination.dto.ts
│   │   │   ├── exceptions/
│   │   │   │   ├── domain.exception.ts       # Base class
│   │   │   │   └── common.exceptions.ts      # 8 common exception classes
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts
│   │   │   ├── guards/
│   │   │   │   ├── session-auth.guard.ts
│   │   │   │   └── permissions.guard.ts
│   │   │   └── interceptors/
│   │   │       └── transform.interceptor.ts
│   │   ├── config/
│   │   │   └── configuration.ts
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── data-source.ts
│   │   │   ├── entities/                            # ALL TypeORM entities live here
│   │   │   │   ├── account.entity.ts                # 1 entity = 1 file = 1 source of truth
│   │   │   │   ├── m-code.entity.ts                 # No per-module entity folders.
│   │   │   │   ├── log.entity.ts                    # Owner module = whoever calls
│   │   │   │   └── ...                              # TypeOrmModule.forFeature([Entity])
│   │   │   └── migrations/
│   │   │       ├── {TS+001}-Create{Table1}.ts       # One Create migration per table
│   │   │       ├── {TS+002}-Create{Table2}.ts       # …in FK-safe timestamp order
│   │   │       ├── …
│   │   │       ├── {TS2+001}-Seed{Table1}.ts        # One Seed migration per seed category
│   │   │       └── {TS2+00N}-Seed{TableN}.ts        # …only if seeder.md exists
│   │   └── modules/
│   │       ├── auth/
│   │       │   ├── auth.module.ts                   # imports([Account, MfaOtp, Role,
│   │       │   ├── auth.controller.ts               #          Permission, RolePermission])
│   │       │   ├── auth.service.ts                  # entities live in src/database/entities/
│   │       │   ├── session.service.ts              # Redis-backed session CRUD
│   │       │   ├── dto/login.dto.ts
│   │       │   └── exceptions/invalid-credentials.exception.ts
│   │       ├── redis/
│   │       │   ├── redis.module.ts                 # @Global() ioredis client
│   │       │   └── redis.service.ts
│   │       ├── code/                               # @Global() m_code cache
│   │       │   ├── code.module.ts                  # imports([MCode]) — entity at
│   │       │   ├── code.service.ts                 # onModuleInit load + has/getLabel
│   │       │   └── code.controller.ts              # src/database/entities/m-code.entity.ts
│   │       ├── health/
│   │       │   ├── health.module.ts
│   │       │   └── health.controller.ts
│   │       ├── storage/
│   │       │   ├── storage.module.ts
│   │       │   ├── storage.service.ts
│   │       │   ├── interfaces/storage-provider.interface.ts
│   │       │   └── providers/
│   │       │       ├── minio.provider.ts
│   │       │       └── s3.provider.ts
│   │       └── mail/
│   │           ├── mail.module.ts
│   │           ├── mail.service.ts
│   │           ├── interfaces/mail-provider.interface.ts
│   │           └── providers/
│   │               ├── smtp.provider.ts
│   │               └── ses.provider.ts
│   ├── test/
│   │   ├── setup.ts                  # silences Logger + seeds env vars
│   │   ├── fixtures/                 # shared mock builders (per-module factories)
│   │   ├── integration/              # *.integration.spec.ts
│   │   └── utils/
│   │       └── create-integration-app.ts  # pg-mem + ioredis-mock + Nest helper
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   ├── jest.config.ts             # NestJS BE → Jest (ts-jest); FE keeps Vitest
│   ├── .env.example
│   ├── .env.development           # Backend runtime vars (DB, REDIS, SESSION, STORAGE, MAIL)
│   ├── .env.staging
│   └── .env.production
│
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── env.d.ts
│   │   ├── styles/tailwind.css            # Font + Material Icons imports + @layer base
│   │   ├── router/index.ts
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   └── codes.store.ts             # useCodesStore — m_code cache (dropdowns + labels)
│   │   ├── constants/
│   │   │   └── error-codes.ts             # Mirror of BE ErrorCode + ApiErrorResponse type
│   │   ├── composables/
│   │   │   ├── useAuth.ts
│   │   │   ├── useApiForm.ts              # Maps VALIDATION_ERROR.errors[] to form fields
│   │   │   ├── useDarkMode.ts             # Singleton theme toggle + localStorage
│   │   │   ├── useBreadcrumb.ts           # Auto-generate from route.meta.breadcrumb
│   │   │   └── useTableQuery.ts           # Pagination + sort + filter state (+ URL sync)
│   │   ├── api/
│   │   │   ├── axios-instance.ts          # Thin wrapper — delegates to handler
│   │   │   └── error-handler.ts           # Central switch on error_code
│   │   ├── layouts/                       # Route-level layouts (wrap router-view)
│   │   │   ├── AuthLayout.vue             # Centered card (login / MFA / password reset)
│   │   │   └── MainLayout.vue             # Sidebar + header + content (authenticated)
│   │   ├── components/
│   │   │   ├── layout/                    # App chrome — NOT route-level
│   │   │   │   ├── AppSidebar.vue         # Permission-filtered menu sections
│   │   │   │   ├── AppHeader.vue          # Notification + user dropdown + logout
│   │   │   │   └── DarkModeToggle.vue
│   │   │   └── common/                    # Reusable cross-screen primitives
│   │   │       ├── BasePageHeader.vue     # title + auto breadcrumb + actions slot
│   │   │       ├── BaseSearchForm.vue     # grid + 検索/検索クリア buttons
│   │   │       ├── BaseDataTable.vue      # a-table + pagination (generic<T>)
│   │   │       ├── BaseActionColumn.vue   # 編集/削除 buttons for table rows
│   │   │       ├── BaseConfirmModal.vue   # delete confirmation (danger=true)
│   │   │       ├── MfaInput.vue           # 6-digit OTP with auto-focus + paste
│   │   │       └── NoticeList.vue         # お知らせ card (login + dashboard)
│   │   ├── views/
│   │   │   ├── auth/
│   │   │   │   ├── LoginView.vue          # SCR-001
│   │   │   │   └── MfaVerifyView.vue      # SCR-001 MFA step
│   │   │   └── dashboard/DashboardView.vue
│   │   └── types/index.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── orval.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.example
│   └── .env.development           # Frontend vars only (VITE_*)
│
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── Dockerfile.prod
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── Dockerfile.prod
│   ├── nginx/
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── nginx-ssl.conf
│   ├── minio/init-minio.sh
│   └── certs/
│       ├── .gitkeep
│       └── README.md
│
├── docker-compose.yml
└── .env                         ← symlink to ./backend/.env.development (compose reads backend env)

scripts/
├── generate-certs.sh            ← SSL certs via mkcert (local HTTPS)
├── setup-hosts.sh               ← Add local domain to /etc/hosts
└── seed.ts

.gitlab-ci.yml
```

---

## Phase 2: Backend

### Critical rules (learned from production bugs)

1. **tsconfig.json** — MUST include `"strictPropertyInitialization": false` (TypeORM entities and class-validator DTOs use decorators, not constructor assignment)
2. **Dockerfile** — Use `RUN npm install` (not `npm ci`) because first scaffold has no lock file
3. **configuration.ts** — `session.secret` + `redis.url` come from env; in production both MUST be loaded from AWS Secrets Manager
4. **ConfigService** — Always use generic type: `config.get<string>('key')` to avoid TypeORM type mismatch
5. **Request typing** — Cast Express Request via `as unknown as Record<string, unknown>` (not direct `as Record`)
6. **cookie-parser** — Mount with `cookieParser(SESSION_SECRET)` so `req.signedCookies` populates; `SessionAuthGuard` requires this.

### 2.1 package.json

```
name: "$ARGUMENTS-backend"
```

Dependencies: @nestjs/{core,common,platform-express,typeorm,swagger,config,throttler}, typeorm, pg, ioredis, cookie-parser, class-validator, class-transformer, bcryptjs, helmet, @aws-sdk/{client-s3,s3-request-presigner,client-ses}, minio, nodemailer, dayjs, uuid, reflect-metadata, rxjs

DevDependencies: @nestjs/{cli,testing}, jest, ts-jest, @types/jest, typescript, ts-node, pg-mem, ioredis-mock, supertest, @types/{node,bcryptjs,express,cookie-parser,nodemailer,uuid,supertest}

Scripts: start:dev (`nest start --watch`), build, test, test:coverage, migration:{generate,run,revert}, swagger:export, seed

**Why Jest (BE) and Vitest (FE)** — split by ecosystem:
- NestJS docs/CLI/examples default to Jest. ts-jest natively emits `design:paramtypes` decorator metadata, so `Test.createTestingModule(...)` works out-of-box without an extra SWC plugin.
- Vue 3/Vite ecosystem defaults to Vitest. Same Vite transform pipeline, native SFC handling, no setup tax.
- Each side uses its native tool — minimum friction long term.

**jest.config.ts** — MUST include:
1. `preset: 'ts-jest'` — drives TypeScript compilation + decorator metadata.
2. `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }` — matches `tsconfig.paths`. Spec imports like `import { JaService } from '@/modules/ja/ja.service'` resolve.
3. `testMatch: ['**/*.spec.ts']` (NEVER `*.test.ts`).
4. `setupFiles: ['<rootDir>/test/setup.ts']` — silences Nest Logger and seeds default env vars (`SESSION_SECRET`, `NODE_ENV=test`).
5. Coverage `collectCoverageFrom` excludes: `src/main.ts`, `src/**/*.module.ts`, `src/database/entities/**`, `src/**/dto/**/*.dto.ts`, `src/database/migrations/**`, `src/**/*.constant.ts`, `src/**/index.ts`, `src/database/data-source.ts`.
6. **Per-module coverage thresholds** — global at 0 so untested modules don't fail the build; add a per-module gate as each spec suite is completed. Jest istanbul counts ~1-2% stricter than Vitest V8, so calibrate using actual measured values:

```ts
coverageThreshold: {
  global: { statements: 0, branches: 0, functions: 0, lines: 0 },

  // Per-module gates (add one block per completed module)
  'src/modules/<module>/**/*.ts': {
    statements: 97, functions: 98, lines: 97,
    // Branches capped lower because defense-in-depth paths (SQL DataScope
    // filter + in-memory fallback) are hard to reach in unit tests.
    branches: 73,
  },
  // Add 'src/modules/next-module/**/*.ts': {...} when ready.
},
```

7. `forceExit: true` — Redis/TypeORM connections sometimes leave handles open after test teardown; forceExit avoids hung CI runs.

8. **`tsconfig.json` requirements**: `esModuleInterop: true` + `experimentalDecorators: true` + `emitDecoratorMetadata: true`. Without `esModuleInterop`, default imports like `import cookieParser from 'cookie-parser'` fail under ts-jest with `... is not a function`.

9. **Volume mounts** (in `apps/docker-compose.yml` backend service) — bind-mount `./backend/test:/app/test` and `./backend/jest.config.ts:/app/jest.config.ts` so dev-time iteration on specs + config doesn't require a container rebuild.

With ts-jest, `gen-ut-backend` controller specs use full `Test.createTestingModule` + `supertest`. Service specs default to plain `new __SERVICE__(...)` (faster, doesn't need Nest lifecycle).

**Integration test helper** — scaffold emits `apps/backend/test/utils/create-integration-app.ts` (template `6h` in the table above). Resolves the 5 wiring obstacles (pg-mem ↔ TypeOrmModule via `dataSourceFactory`, ConfigModule provision, ioredis-mock hookup, cookie-parser middleware, MailService stub, m_code seed timing). Each module's `*.integration.spec.ts` then just calls `createIntegrationTestApp({ modules: [XxxModule], seedSql: [...] })`. **When adding a new feature module with new entities, append the entity classes to `ALL_ENTITIES`** in this helper — pg-mem's DataSource needs an explicit list since `dataSourceFactory` bypasses TypeORM's `autoLoadEntities`.

### 2.2 main.ts (Bootstrap)

```typescript
// Key elements:
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => ({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors: errors.map(e => ({
      field: e.property,
      message: Object.values(e.constraints || {}).join(', '),
    })),
  }),
}));
app.useGlobalFilters(new GlobalExceptionFilter());
app.use(helmet());
// cookie-parser NEEDS the session secret so signed cookies work
// (req.signedCookies[session_id] in SessionAuthGuard).
app.use(cookieParser(configService.get<string>('session.secret')));
app.enableCors({ origin: allowedOrigins, credentials: true });
// Swagger at /api/docs, addCookieAuth('session_id')
// Export swagger.json to ../frontend/swagger.json (try/catch)
```

### 2.3 configuration.ts

Single centralized config. All values from env vars. **No hardcoded project-specific values.**

```typescript
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || `${/* $ARGUMENTS */ 'app'}_dev`,
    synchronize: false,
  },
  // Auth: HTTP-only Cookie session backed by Redis.
  // Local: connects to docker-compose `redis` service.
  // Prod:  set REDIS_URL to AWS ElastiCache primary endpoint + REDIS_TLS=true.
  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true',
    keyPrefix: process.env.REDIS_KEY_PREFIX || '',
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
    // Signs the session cookie; in prod load from AWS Secrets Manager.
    secret: process.env.SESSION_SECRET || '',
    ttlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? String(24 * 60 * 60), 10),
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'minio',   // 'minio' | 's3'
    endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    region: process.env.STORAGE_REGION || 'ap-northeast-1',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin123',
    bucket: process.env.STORAGE_BUCKET || '$ARGUMENTS',
  },
  mail: {
    provider: process.env.MAIL_PROVIDER || 'smtp',       // 'smtp' | 'ses'
    host: process.env.MAIL_HOST || 'localhost',
    port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    from: process.env.MAIL_FROM || 'noreply@$ARGUMENTS.local',
    region: process.env.MAIL_REGION || 'ap-northeast-1',
  },
});
```

### 2.4 common/

| File | Description |
|------|-------------|
| constants/error-codes.constant.ts | `ErrorCode` const + `ErrorMessage` map — single source of truth |
| exceptions/domain.exception.ts | `DomainException extends HttpException` with `code` field |
| exceptions/common.exceptions.ts | 8 common exception classes (see 2.4.1 below) |
| filters/global-exception.filter.ts | Catch all, format `{ error_code, message, errors? }`, hide 500 internals, log structured JSON. Uses `STATUS_TO_CODE` map for non-DomainException HttpExceptions |
| guards/session-auth.guard.ts | Reads signed `session_id` cookie, validates against Redis (`session:{id}`), extends TTL, attaches payload to `req.user` |
| guards/permissions.guard.ts | Reads `@Permissions()` metadata, checks `user.permissions[]` array |
| decorators/permissions.decorator.ts | `SetMetadata('permissions', perms)` |
| dto/pagination.dto.ts | page (default 1), per_page (1-100, default 20), sort_by (default 'created_at'), sort_order (asc/desc, default 'desc') with `@ApiPropertyOptional` |
| interceptors/transform.interceptor.ts | Wraps response in `{ data }`, skip if already has `data` or `message` key |

### 2.4.1 Unified Error Handling (BE + FE contract)

Every API error response follows this shape:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "email", "message": "メールアドレスの形式が不正です" }]
}
```

**Standard ErrorCode → HTTP status map (both BE and FE use this):**

| HTTP | ErrorCode | Meaning / FE action |
|------|-----------|---------------------|
| 400 | `BAD_REQUEST` | Malformed request — FE toasts `message` |
| 400 | `VALIDATION_ERROR` | Body carries `errors[]` — FE maps to form fields via `useApiForm` |
| 400 | `DUPLICATE_CODE` | Unique constraint — FE toasts, component highlights field |
| 401 | `UNAUTHORIZED` | Session expired — FE attempts refresh, else redirects /login |
| 403 | `FORBIDDEN` | No permission — FE redirects /403 |
| 403 | `DATA_SCOPE_VIOLATION` | Out of scope — FE toasts |
| 404 | `NOT_FOUND` | Resource missing — FE toasts; caller decides redirect |
| 409 | `CONFLICT` | State conflict (delete blocked) — FE toasts / shows modal |
| 429 | `TOO_MANY_REQUESTS` | Rate limited — FE toasts + disables button |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected — FE toasts generic message; actual error hidden |

**Rules:**

1. **Never hardcode error code strings in services.** Import from `error-codes.constant.ts` or throw a subclass of `DomainException` from `common.exceptions.ts`.
2. **Resource errors use generic `NOT_FOUND`** with a descriptive message (`'指定された単価が見つかりません'`). Do NOT create `TANKA_NOT_FOUND`, `JA_NOT_FOUND`, etc.
3. **`DUPLICATE_CODE` is HTTP 400**, not 409. `CONFLICT` (409) is reserved for state conflicts (e.g. cannot delete because of FK).
4. **Keep BE and FE constant files in sync** — any new error code requires updating both + the FE `handleApiError` switch.
5. **Screen-specific codes** (e.g. `INVALID_CREDENTIALS`, `OTP_EXPIRED`, `DEADLINE_NOTICE_DUPLICATE`) extend `DomainException` directly and are NOT added to `ErrorCode`. They live in their module's `exceptions/` folder.

**Usage in services:**

```typescript
import { NotFoundException, DuplicateCodeException } from '../../common/exceptions/common.exceptions';

async findById(id: string): Promise<Tanka> {
  const tanka = await this.repo.findOne({ where: { id } });
  if (!tanka) throw new NotFoundException('単価');       // → 404 NOT_FOUND
  return tanka;
}

async create(dto: CreateTankaDto): Promise<Tanka> {
  const exists = await this.repo.count({ where: { code: dto.code } });
  if (exists > 0) throw new DuplicateCodeException('単価コード'); // → 400 DUPLICATE_CODE
  return this.repo.save(dto);
}
```

### 2.5 modules/auth/ + modules/redis/

**Controller endpoints (`auth.controller.ts`):**
- POST /api/v1/auth/login — body `{ login_id, password }` → on success issues session, Set-Cookie
- POST /api/v1/auth/mfa/verify — body `{ mfa_token, otp_code }` → issues session, Set-Cookie
- POST /api/v1/auth/mfa/resend — re-issues OTP + new mfa_token
- POST /api/v1/auth/refresh — reads `session_id` cookie, extends Redis TTL, returns refreshed user
- POST /api/v1/auth/logout — `DEL session:{id}` in Redis + clears cookie
- POST /api/v1/auth/forgot-password (always 200, prevents enumeration)
- POST /api/v1/auth/reset-password — on success calls `sessionService.destroyAllForAccount(accountId)`

**Session cookie flags (set via `res.cookie(cookieName, sessionId, options)`):**
```typescript
{
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  signed: true,                           // signed by SESSION_SECRET (cookie-parser)
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,            // 24h sliding (re-set by /refresh)
}
```

**Redis layout:**
```
session:{uuid}                → JSON payload (account_id, login_id, role_code, permissions[], …)  EX 24h
account_sessions:{account_id} → Set of session_ids owned by that account  EX 24h
```

**SessionService API:** `create(payload) → sessionId` · `get(id) → payload | null` · `touch(id)` (sliding refresh) · `destroy(id)` · `destroyAllForAccount(accountId)` (used by password reset + admin revoke).

**RedisModule:** `@Global()` ioredis client. Local = `redis://redis:6379`. Prod = `REDIS_URL=rediss://<elasticache>:6379` + `REDIS_TLS=true`.

**Auth service:** bcrypt 10 rounds (`bcryptjs`), `maskEmail()` utility for logging, never logs full session IDs.

### 2.6 modules/health/

- `GET /health` → `{ status: 'ok', timestamp }`
- `GET /health/ready` → checks DB via `dataSource.query('SELECT 1')`

### 2.7 modules/storage/ (Provider abstraction)

```typescript
interface StorageProvider {
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- `StorageService` reads `storage.provider` from config → instantiates `MinioStorageProvider` or `S3StorageProvider`
- Switch local→AWS: change `STORAGE_PROVIDER=s3` in env

### 2.8 modules/mail/ (Provider abstraction)

```typescript
interface MailProvider {
  sendMail(options: { to: string; subject: string; html: string }): Promise<void>;
}
```

- `MailService` reads `mail.provider` from config → instantiates `SmtpMailProvider` or `SesMailProvider`
- Switch local→AWS: change `MAIL_PROVIDER=ses` in env
- High-level methods: `sendOtp()`, `sendPasswordReset()`, `sendNotification()`
- Never log full email or OTP — use `maskEmail()`

### 2.9 modules/code/ (m_code master — @Global)

The project enumerates business values (性別, 支払方法, お知らせ種別, ログ種別, …) in the `m_code` table rather than PostgreSQL ENUM or TypeScript enum. Every feature module needs read access, so `CodeModule` is `@Global()` and `CodeService` is injectable anywhere without re-importing.

**Module layout:**
- `code.service.ts` — caches the full table in memory via `onModuleInit()`; exposes `getAll()`, `getByCategory(cat)`, `has(cat, val)`, `getLabel(cat, val)`, `reload()`. Call `reload()` if a future admin screen mutates codes.
- `code.controller.ts` — `GET /api/v1/codes` (returns whole map) + `GET /api/v1/codes/:category` (single category). Both behind `SessionAuthGuard` — any logged-in user can read.
- `code.module.ts` — `@Global()` + `TypeOrmModule.forFeature([MCode])` + exports `CodeService`. Imports `MCode` from `src/database/entities/m-code.entity.ts` (entities live in `database/`, not in module folders — see §2.10).

**Rules (enforce across feature modules):**
- Entity columns that reference m_code (e.g. `tanka_type`, `gender`, `shiharai_hoho`) are typed `int` / `varchar` — NEVER `@Column({ type: 'enum' })`.
- Do NOT generate TypeScript `enum` for m_code categories. Use plain number / string primitives.
- DTO validation uses `@IsInt()` / `@IsString()` for shape only; the allowed-value check lives in each service as `this.codeService.has('CATEGORY', dto.field)` and raises `VALIDATION_ERROR` on miss.
- FE mirror: `useCodesStore().loadAll()` runs once per session (from `auth.store` login / MFA / refreshSession hooks); components read via `codes.options(cat)` and `codes.label(cat, val)`. See §3.

**Seeder migration:** if `docs/database/seeder.md §5` exists, emit a `{TS2+00M}-Seed_m_code.ts` migration that inserts every category row. Covers 21 categories in the agrinews schema. See §2.10.1 for timestamp ordering.

---

### 2.10 database/ (Migration-first strategy)

**CRITICAL: `synchronize: false` always. ALL schema changes via migrations. NEVER sync models directly.**

**database.module.ts:**
- `autoLoadEntities: true`
- `synchronize: false` — NEVER change this
- `migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')]`
- `migrationsRun: true` — auto-runs pending migrations on app start
- Connection pool: `extra: { max: 10, idleTimeoutMillis: 30000 }`

**data-source.ts** (for CLI migration commands):
```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app_dev',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
```

**Migration workflow:**
```bash
# 1. Create/edit entity file (in src/database/entities/, e.g., tanka.entity.ts)

# 2. Generate migration from entity diff
npm run migration:generate -- src/database/migrations/CreateTankaTable

# 3. Review generated migration file in src/database/migrations/

# 4. Run migration (or restart app — migrationsRun: true auto-runs)
npm run migration:run

# 5. Revert if needed
npm run migration:revert
```

**App startup flow:**
```
App starts → TypeORM connects to DB → migrationsRun: true
  → Check migrations table → Run pending migrations → App ready
```

**Rules:**
- NEVER set `synchronize: true` (not even in development)
- Every entity change MUST have a corresponding migration file
- Migration files are version-controlled and immutable
- `migrationsRun: true` ensures DB is always up-to-date on app start

### 2.10.1 Initial Migration Generation (MANDATORY during scaffold)

**After all entity files are created, the skill MUST generate ONE migration file PER TABLE plus ONE seeder file PER seed category.** This ensures the app starts with a usable DB on first run (via `migrationsRun: true`), and each table's history is independently reviewable/revertable.

#### Rules

**1. One migration per table (schema)**

- **Filename**: `{TIMESTAMP}-Create{PascalTableName}.ts`
  - TIMESTAMP = 13-digit Unix epoch ms. Start at a fixed base (e.g. `1711900800000`) and increment by 1 per file — this guarantees FK-safe execution order.
  - Example: `1711900800001-CreateMRoles.ts`, `1711900800002-CreateMPermissions.ts`, `1711900800003-CreateMRolesPermissions.ts`, ...
- **Class name**: `Create{PascalTableName}{TIMESTAMP}` implementing `MigrationInterface`
- **Ordering rule (CRITICAL)**: Assign timestamps in FK-safe order — parent tables first, child tables later.
- **Content**:
  - `up(queryRunner)`: single `CREATE TABLE` statement for THIS table + all its indexes (`CREATE INDEX`) + FK constraints
  - `down(queryRunner)`: single `DROP TABLE IF EXISTS` for THIS table
  - Column types must match DB design exactly (`VARCHAR(N)`, `TIMESTAMPTZ`, `BIGSERIAL`, `INTEGER`, `TEXT`, `BOOLEAN`, etc.)
  - FK constraint name format: `FK_{child_table}_{parent_table}` (e.g. `FK_m_account_m_roles`)
  - Index name format: `IX_{table}_{cols}`, unique: `UQ_{table}_{col}`
  - Default values: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `deleted_at TIMESTAMPTZ DEFAULT NULL`, booleans `DEFAULT false`
  - Use parameterized SQL via `queryRunner.query(...)` — no string concat

**2. One seeder per seed category (data)**

- **When to generate**: Only if `docs/database/seeder.md` exists.
- **Filename**: `{TIMESTAMP}-Seed{PascalTableName}.ts` — timestamps come AFTER all schema migrations.
  - Example: `1711900900001-SeedMRoles.ts`, `1711900900002-SeedMPermissions.ts`, ...
- **Ordering**: parents before children (same FK rule as schema). Typical order for agrinews-style project:
  1. SeedMRoles
  2. SeedMPermissions
  3. SeedMRolesPermissions
  4. SeedMTodofuken
  5. SeedMCode
  6. SeedMAccount (initial admin)
- **Content**:
  - `up()`: multi-row `INSERT INTO ... VALUES (...), (...), ...`
  - `down()`: `DELETE FROM` or `TRUNCATE ... CASCADE` — reverse order of up()
  - Never insert explicit `BIGSERIAL` PK values — rely on insertion order. If child rows reference them by ID (e.g. `m_roles_permissions`), explain via comment that the order is intentional.
  - For password fields in m_account: use bcrypt hash placeholder `'$2b$10$CHANGE_ME_BEFORE_PRODUCTION'` with a comment requiring reset

**3. Example folder structure (post-scaffold)**

```
apps/backend/src/database/migrations/
├── 1711900800001-CreateMRoles.ts
├── 1711900800002-CreateMPermissions.ts
├── 1711900800003-CreateMRolesPermissions.ts
├── 1711900800004-CreateMTodofuken.ts
├── 1711900800005-CreateMCode.ts
├── 1711900800006-CreateMJa.ts
├── 1711900800007-CreateMKanriShiten.ts
├── 1711900800008-CreateMShiten.ts
├── 1711900800009-CreateMTanka.ts
├── 1711900800010-CreateMHanbaiten.ts
├── 1711900800011-CreateMAccount.ts
├── 1711900800012-CreateTMfaOtp.ts
├── 1711900800013-CreateTOshirase.ts
├── ...
├── 1711900900001-SeedMRoles.ts
├── 1711900900002-SeedMPermissions.ts
├── 1711900900003-SeedMRolesPermissions.ts
├── 1711900900004-SeedMTodofuken.ts
├── 1711900900005-SeedMCode.ts
└── 1711900900006-SeedMAccount.ts
```

**4. Example skeleton (single-table migration)**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMRoles1711900800001 implements MigrationInterface {
  name = 'CreateMRoles1711900800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "m_roles" (
        "role_id" BIGSERIAL PRIMARY KEY,
        "role_code" VARCHAR(50) NOT NULL,
        "role_name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_by" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_by" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        CONSTRAINT "UQ_m_roles_role_code" UNIQUE ("role_code")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_m_roles_deleted_at" ON "m_roles" ("deleted_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "m_roles"`);
  }
}
```

**5. Example skeleton (single-table seeder)**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMRoles1711900900001 implements MigrationInterface {
  name = 'SeedMRoles1711900900001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "m_roles" (role_code, role_name, description) VALUES
        ('NICHINO_ADMIN',   '日農（管理者）', '日本農業新聞 管理者アカウント'),
        ('NICHINO_STAFF',   '日農（担当者）', '日本農業新聞 担当者アカウント'),
        ('CHUOKAI',         '中央会',         '中央会アカウント'),
        ('JA_HONTEN',       'JA本店',         'JA本店アカウント'),
        ('JA_KANRI_SHITEN', 'JA管理支店',     'JA管理支店アカウント')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "m_roles" WHERE role_code IN ('NICHINO_ADMIN','NICHINO_STAFF','CHUOKAI','JA_HONTEN','JA_KANRI_SHITEN')`);
  }
}
```

**6. Verification checklist**

- [ ] Every table in `docs/database/database-design.md` has exactly ONE Create migration
- [ ] Every seed category in `docs/database/seeder.md` has exactly ONE Seed migration
- [ ] Timestamps are monotonically increasing and FK-safe
- [ ] All FK constraint names follow `FK_{child}_{parent}` convention
- [ ] Running all migrations on fresh DB succeeds without error
- [ ] Running all migrations down in reverse order leaves DB clean (no orphan indexes/types)

**7. Execution on first startup**

1. `docker-compose up` → backend container starts
2. `migrationsRun: true` → TypeORM checks `migrations` table (creates if missing)
3. All Create migrations run in timestamp order → schema built
4. All Seed migrations run → seed data inserted
5. App ready to accept requests

User does NOT need to run `npm run migration:run` manually — first `docker-compose up` is enough.

---

## Phase 3: Frontend

### Critical rules (learned from production bugs)

1. **Vite config** — MUST include `allowedHosts: ['$ARGUMENTS.local', 'localhost']` in `server` section, otherwise nginx proxy gets blocked
2. **Ant Design Vue icons** — MUST use `#prefix` slot, NOT `:prefix` prop. The prop causes runtime error `function UserOutlined(props, context) {...}`
3. **Tailwind CSS** — Set `corePlugins: { preflight: false }` to avoid Ant Design Vue style conflicts
4. **Error handling** — Axios interceptor MUST delegate to `handleApiError`. Components MUST use `useApiForm` for form submissions — do NOT catch validation errors manually in each component (see 3.x below)
4. **Auth store** — Access token in memory ONLY (ref, never localStorage). Refresh token in HTTP-only cookie (managed by backend)

### 3.1 package.json

```
name: "$ARGUMENTS-frontend"
```

Dependencies: vue, vue-router, pinia, ant-design-vue, @ant-design/icons-vue, axios, dayjs
DevDependencies: vite, @vitejs/plugin-vue, typescript, vue-tsc, tailwindcss, postcss, autoprefixer, orval, vitest, @vue/test-utils, jsdom, @vitest/coverage-v8

### 3.2 Key files

| File | Key points |
|------|------------|
| vite.config.ts | `allowedHosts: ['$ARGUMENTS.local', 'localhost']`, alias `@` → `src/` |
| orval.config.ts | Input `./swagger.json`, output `./src/api/generated.ts`, mutator `./src/api/axios-instance.ts` |
| tailwind.config.ts | Design tokens (primary `#1677ff`, Noto Sans JP, rounded-ant `6px`), `darkMode: 'class'`, `preflight: false` |
| styles/tailwind.css | `@import` Noto Sans JP + Material Icons/Symbols, `@layer base` body bg, `@layer utilities` for material icon sizing |
| main.ts | createApp → use pinia, router, Antd. Import `ant-design-vue/dist/reset.css` + tailwind.css |
| router/index.ts | ALL routes lazy-loaded. beforeEach auth guard → redirect /login if not authenticated. `meta.breadcrumb` for `useBreadcrumb`. `meta.permission` for screen-level permission check |
| stores/auth.store.ts | Pinia setup store — session-cookie auth (no token in JS). Holds `user` ref, `isAuthenticated = computed(!!user)`, `login/verifyMfa/refreshSession/logout`. After each successful auth step calls `useCodesStore().loadAll()`; on logout / failed refresh calls `useCodesStore().reset()`. `hasPermission(perm)` reads `user.value.permissions`. |
| stores/codes.store.ts | Pinia setup store — mirror of backend `m_code`. `loadAll()` called from `auth.store` lifecycle (idempotent cache). `options(cat)` → `<a-select>` options; `label(cat, val)` / `labelShort(cat, val)` → table cell rendering. |
| api/axios-instance.ts | Thin wrapper. Request interceptor: Bearer token. Response interceptor → `handleApiError` |
| api/error-handler.ts | Central switch on `error_code`. UNAUTHORIZED → silent refresh / redirect, FORBIDDEN → /403, VALIDATION_ERROR → pass through, others → toast |
| constants/error-codes.ts | `ErrorCode` const + `ApiErrorResponse` type — mirror of backend constant |
| composables/useApiForm.ts | `{ fieldErrors, submitting, submit }` — wraps form submissions, auto-maps `VALIDATION_ERROR.errors[]` to `fieldErrors[field]` |
| composables/useDarkMode.ts | `{ mode, toggle, set }` singleton — persists to localStorage, syncs `.dark` on `<html>` |
| composables/useBreadcrumb.ts | `{ items }` — reads `route.matched[].meta.breadcrumb` chain, prepends 'ホーム' |
| composables/useTableQuery.ts | `{ state, loading, total, onChange, applyFilters, resetFilters }` — page/per_page/sort/filter state with optional URL sync |
| layouts/AuthLayout.vue | Centered card + footer + floating dark-mode toggle. Use for login / MFA / password-reset |
| layouts/MainLayout.vue | Sidebar + header + scrollable content + `onErrorCaptured` safety net |
| components/layout/AppSidebar.vue | **Project-customize:** `sections: MenuSection[]` array. Each item has optional `permission` — filtered via `authStore.hasPermission()` |
| components/layout/AppHeader.vue | Notification bell + user dropdown with logout |
| components/common/Base*.vue | Cross-screen primitives (see 3.2.2 below) |

### 3.2.1.5 Design System (unified tokens — MANDATORY)

The FE has ONE design system. Don't invent new card/button/radius styles per screen.

**Font:** Noto Sans JP (primary), Inter (Latin fallback). Set via `body { font-family }` in `tailwind.css`.

**Primary color:** `#1677ff` (Ant Design blue). Derived from Ant's `colorPrimary` token + Tailwind's `primary` custom color. Do NOT hardcode hex elsewhere.

**Semantic color tokens (CSS variables — auto-flip in dark mode):**

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text-main` | `rgba(0,0,0,0.88)` | `rgba(255,255,255,0.88)` | Primary text |
| `--color-text-secondary` | `rgba(0,0,0,0.45)` | `rgba(255,255,255,0.55)` | Muted text, icon prefix |
| `--color-bg-layout` | `#f5f5f5` | `#020617` (slate-950) | Body / route wrapper bg |

Tailwind classes `text-text-main`, `text-text-secondary`, `bg-bg-layout` reference these vars — do NOT add `dark:` variants.

Cards use explicit `bg-white dark:bg-slate-900` so they sit ABOVE the body bg.

**Border radius scale (semantic):**

| Token | Size | Use for |
|-------|------|---------|
| `rounded-ant` | 6px | `<a-input>`, `<a-button>` (Ant default; auto) |
| `rounded-lg` | 8px | Small panels, OTP digit boxes |
| `rounded-xl` | 12px | Auth cards, modals, hero features |
| `rounded-full` | ∞ | Avatars, icon buttons, badges |

**Shadow scale:**

| Token | Use for |
|-------|---------|
| `shadow-ant-card` | Content cards (list screens inside MainLayout) — subtle |
| `shadow-xl` | Floating/auth cards, modals |

**Buttons — MUST use `<a-button>`, never raw `<button>`:**
- `type="primary"` for submit/main actions
- `type="default"` for secondary (検索クリア, キャンセル)
- `type="link"` for in-text links (コードを再送する, ログイン画面に戻る)
- `type="text"` for low-emphasis toolbar actions
- Round icon buttons (notification bell, dark mode toggle, notification) → use `<BaseIconButton>`

**Cards — MUST use `<BaseCard>`, never raw `<section class="bg-white ...">`:**
- `variant="content"` (default): subtle — for list screens
- `variant="auth"`: prominent — for login, MFA, password-reset
- `variant="flat"`: border only — for nested panels
- `no-padding` prop when you need to customize inner layout (e.g., header bar with different bg)

**Icon system:**
- `material-icons` font — for sidebar menus, buttons, status indicators
- `material-symbols-outlined` font — for detailed/decorative icons (MFA, contact)
- **Never mix inline SVG** with Material Icons in same screen — pick one.

### 3.2.2 UI Component Tiers (when to put what where)

| Tier | Location | Purpose | Example |
|------|----------|---------|---------|
| **Layout** | `src/layouts/` | Wraps `router-view`. One per route group. | `AuthLayout`, `MainLayout` |
| **Layout chrome** | `src/components/layout/` | App-level chrome used by MainLayout. Not meant to be reused outside the layout. | `AppSidebar`, `AppHeader`, `DarkModeToggle` |
| **Common** | `src/components/common/` | Reusable building blocks for any feature screen. Slot/props-driven, no business logic. Prefix: `Base*`. | `BasePageHeader`, `BaseDataTable`, `MfaInput` |
| **Feature-specific** | `src/features/<domain>/components/` or alongside the view | Domain components used by only one feature. | `TankaFilterBar`, `DokusyaAddressCard` |
| **View** | `src/views/<domain>/` | Page-level components tied to a route. Compose layouts + common + feature components. | `TankaListView` |

**Golden rule:** "If two different features need it, promote it to `common/`. If it's specific to one feature, keep it inside the feature folder."

### 3.2.3 Standard list-page skeleton (pattern)

Every `*ListView.vue` (master search/list screens) follows this composition:

```vue
<script setup lang="ts">
import BasePageHeader from '@/components/common/BasePageHeader.vue';
import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseConfirmModal from '@/components/common/BaseConfirmModal.vue';
import { useTableQuery } from '@/composables/useTableQuery';

const { state, loading, total, onChange, applyFilters, resetFilters } =
  useTableQuery<FiltersType>({ defaultFilters: { /* ... */ } });

async function fetchList() { /* call generated API, assign rows + total */ }
function onSearch() { applyFilters(state.filters); fetchList(); }
function onClear() { resetFilters(); fetchList(); }
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader title="XXマスタ明細検索画面" />

    <BaseSearchForm :loading="loading" @search="onSearch" @clear="onClear">
      <!-- filter fields here -->
    </BaseSearchForm>

    <BaseDataTable title="XX一覧" v-bind="/* columns, rows, page, ... */"
                   @change="(p,f,s) => { onChange(p,f,s); fetchList(); }">
      <template #headerActions><a-button type="primary">新規登録</a-button></template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <BaseActionColumn @edit="..." @delete="..." />
        </template>
      </template>
    </BaseDataTable>

    <BaseConfirmModal :open="..." danger @ok="..." />
  </div>
</template>
```

This pattern scales to 20+ master list screens (tanka, hanbaiten, ja, shiten, oshirase, account, etc.) without custom scaffolding per screen.



### 3.2.1 Error Handling Flow (must match backend 2.4.1)

```
Component submit
  ↓
useApiForm.submit(fn)
  ↓ (try)
fn() → axios → backend
  ↓ (catch AxiosError)
axios response interceptor → handleApiError(err)
  ↓
switch (error_code):
  UNAUTHORIZED        → silent refresh → retry / redirect /login
  FORBIDDEN           → router.push({ name: 'Forbidden' })
  DATA_SCOPE_VIOLATION→ message.error(data.message)
  VALIDATION_ERROR    → (no toast — fall through to caller)
  DUPLICATE_CODE,
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  TOO_MANY_REQUESTS   → message.error(data.message)
  INTERNAL_SERVER_*,
  default             → message.error('システムエラーが発生しました…')
  ↓
Promise.reject(err) → back to useApiForm
  ↓
If VALIDATION_ERROR: populate fieldErrors — bind to <a-form-item>
```

**Rule: components MUST NOT add their own 401/403/500 toasts.** The interceptor handles those. Components only care about form field errors via `useApiForm.fieldErrors`.

**Usage in a Vue component:**

```vue
<script setup lang="ts">
import { useApiForm } from '@/composables/useApiForm';
import { getTanka } from '@/api/tanka/tanka';

const { fieldErrors, submitting, submit } = useApiForm();
const form = reactive({ tanka_code: '', tanka_name: '' });

async function onSubmit() {
  await submit(async () => {
    await getTanka().tankaControllerCreate(form);
    message.success('登録しました');
  });
}
</script>

<template>
  <a-form :model="form" @finish="onSubmit">
    <a-form-item label="単価コード"
                 :validate-status="fieldErrors.tanka_code ? 'error' : ''"
                 :help="fieldErrors.tanka_code">
      <a-input v-model:value="form.tanka_code" />
    </a-form-item>
    <a-button type="primary" html-type="submit" :loading="submitting">保存</a-button>
  </a-form>
</template>
```

### 3.3 API client usage rules

`src/api/` has 2 types of files:
- `axios-instance.ts` — **hand-written** (from template). Custom interceptors, error handling. DO NOT EDIT by Orval.
- Everything else — **Orval auto-generated**. DO NOT EDIT manually. Re-generate by running `npx orval`.

**All API calls in Vue components MUST use the generated client:**

```typescript
// ✅ CORRECT — use generated client (typed, auto-completed)
import { getAuth } from '@/api/auth/auth';
const { authControllerLogin } = getAuth();
await authControllerLogin({ email: '...', password: '...' });

// ❌ WRONG — manual axios bypasses generated client
import axios from 'axios';
await axios.post('/api/v1/auth/login', { ... });

// ❌ WRONG — manual fetch bypasses generated client
await fetch('/api/v1/auth/login', { method: 'POST', body: ... });
```

### 3.4 Vue component rules

- ALL components use `<script setup lang="ts">` (NO Options API)
- Icons via slot: `<a-input><template #prefix><UserOutlined /></template></a-input>`
- All interactive elements: `aria-label`
- All `<input>`: associated `<label>` (or a-form-item label)
- Error boundary: `onErrorCaptured()` in MainLayout

---

## Phase 4: Docker

### Critical rules (learned from production bugs)

1. **Dockerfile** — Use `RUN npm install` (not `npm ci`) for first scaffold (no lock file)
2. **docker-compose.yml** — Docker reads `.env` by default, NOT `.env.development`. Create `.env` as symlink: `ln -sf .env.development .env`
3. **PostgreSQL version** — Use latest stable (16-alpine). Check existing volumes before starting
4. **nginx `/health`** — MUST have separate `location /health` block proxying to backend, otherwise frontend catch-all returns HTML
5. **Volume mounts** — Mount `backend/src` AND `docker/certs` to backend container

### 4.1 docker-compose.yml

Services: postgres (16-alpine, healthcheck), backend (hot reload via src mount + certs mount), frontend (hot reload via src mount), nginx (SSL certs mount + nginx-ssl.conf mount, ports 80+443), mailhog, minio (healthcheck), minio-init

Network name: `${COMPOSE_PROJECT_NAME:-$ARGUMENTS}-network`

### 4.2 nginx-ssl.conf (local HTTPS)

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name $ARGUMENTS.local *.$ARGUMENTS.local;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $ARGUMENTS.local *.$ARGUMENTS.local;

    ssl_certificate     /etc/nginx/certs/$ARGUMENTS.local.pem;
    ssl_certificate_key /etc/nginx/certs/$ARGUMENTS.local-key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    location /api    { proxy_pass http://backend; ... }
    location /health { proxy_pass http://backend; ... }   # ← DON'T FORGET
    location /       { proxy_pass http://frontend; ... (+ WebSocket upgrade for HMR) }
}
```

### 4.3 Dockerfiles

**Dev (backend + frontend):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install          # ← NOT npm ci (no lock file on first run)
COPY . .
EXPOSE {port}
CMD ["npm", "run", "{start_command}"]
```

**Prod (backend):** Multi-stage: builder → non-root user, HEALTHCHECK, `CMD ["node", "dist/main"]`
**Prod (frontend):** Multi-stage: builder → nginx:alpine with static files

---

## Phase 5: Environment & Scripts

### 5.1 .env.development

```env
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=https://$ARGUMENTS.local,http://localhost,http://localhost:5173
COMPOSE_PROJECT_NAME=$ARGUMENTS
LOCAL_DOMAIN=$ARGUMENTS.local

DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=${ARGUMENTS}_dev

# Auth: Session (HTTP-only Cookie, Redis-backed).
# Prod: set REDIS_URL to AWS ElastiCache primary endpoint + REDIS_TLS=true
# and load SESSION_SECRET from AWS Secrets Manager.
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
# REDIS_URL=
SESSION_COOKIE_NAME=session_id
SESSION_SECRET=dev-session-secret-please-rotate-in-production
SESSION_TTL_SECONDS=86400

STORAGE_PROVIDER=minio
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123
STORAGE_BUCKET=$ARGUMENTS
STORAGE_REGION=ap-northeast-1

MAIL_PROVIDER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_FROM=noreply@$ARGUMENTS.local
```

### 5.2 .env symlink (CRITICAL)

After writing `.env.development`, create symlink:
```bash
cd apps && ln -sf .env.development .env
```
Docker compose reads `.env` by default. Without this symlink, all `${VAR}` references in docker-compose.yml resolve to empty strings.

### 5.3 Frontend .env.development

```env
VITE_API_BASE_URL=https://$ARGUMENTS.local/api
VITE_APP_TITLE=$ARGUMENTS
```

### 5.4 scripts/generate-certs.sh

Uses `mkcert` for local HTTPS:
- SSL cert for: `$ARGUMENTS.local`, `*.$ARGUMENTS.local`, localhost, 127.0.0.1, ::1
- Output to: `apps/docker/certs/`
- Follow shell-script rules: shebang, `set -euo pipefail`, script header, exit codes, dependency check
- Auth uses session cookies (no JWT keys needed).

### 5.5 scripts/setup-hosts.sh

Adds `127.0.0.1 $ARGUMENTS.local` to `/etc/hosts` (idempotent, requires sudo).

### 5.6 .gitlab-ci.yml stub

Workflow rules + stages (lint, test, build, deploy) + domain-specific templates (.backend_job, .frontend_job) with path-based filtering.

### 5.7 .gitignore additions

```
apps/docker/certs/*.pem
apps/.env.development
apps/.env.staging
apps/.env.production
apps/.env
apps/backend/.env*
!apps/backend/.env.example
apps/frontend/.env.development
!apps/frontend/.env.example
apps/frontend/src/api/generated*
apps/frontend/swagger.json
```

---

## Phase 6: Post-generation

### 6.1 Setup commands (run automatically after file generation)

```bash
# Make scripts executable
chmod +x scripts/generate-certs.sh scripts/setup-hosts.sh

# Create .env symlink
cd apps && ln -sf .env.development .env && cd ..

# Generate certs
./scripts/generate-certs.sh

# Add local domain to /etc/hosts
./scripts/setup-hosts.sh
```

### 6.2 Start project

```bash
cd apps && docker compose up -d --build
```

### 6.3 Generate typed API client from Swagger

After backend is running, export Swagger JSON and generate the frontend API client:

```bash
# Wait for backend to be ready
sleep 10

# Export OpenAPI spec from running backend
curl -sk https://$ARGUMENTS.local/api/docs-json -o apps/frontend/swagger.json

# Copy swagger.json into frontend container (docker only mounts src/)
docker cp apps/frontend/swagger.json $ARGUMENTS-frontend-1:/app/swagger.json

# Run Orval to generate typed API client
docker exec $ARGUMENTS-frontend-1 npx orval
```

This generates inside `apps/frontend/src/api/`:
```
src/api/
├── axios-instance.ts           ← Custom axios (from template, NOT generated)
├── generated.schemas.ts        ← DTO interfaces (auto-generated)
├── auth/
│   └── auth.ts                 ← Auth API functions (auto-generated)
├── health/
│   └── health.ts               ← Health API functions (auto-generated)
└── {module}/
    └── {module}.ts             ← Added automatically when backend adds new modules
```

**Usage in Vue components:**
```typescript
import { getAuth } from '@/api/auth/auth';
const { authControllerLogin } = getAuth();

// Fully typed — LoginDto auto-completed from Swagger
await authControllerLogin({ email: 'user@example.com', password: '...' });
```

**When backend adds new APIs:** re-run the 3 commands above. Orval auto-generates new files per module.

### 6.4 Verify all endpoints

After containers start, verify:
- `https://$ARGUMENTS.local` → 200 (Frontend)
- `https://$ARGUMENTS.local/api/docs` → 200 (Swagger UI)
- `https://$ARGUMENTS.local/api/docs-json` → 200 (OpenAPI JSON)
- `https://$ARGUMENTS.local/health` → 200 (Backend health)
- `http://$ARGUMENTS.local` → 301 (HTTP→HTTPS redirect)
- `http://localhost:8025` → 200 (Mailhog UI)
- `http://localhost:9001` → 200 (MinIO Console)

---

## Validation Checklist

Before reporting done:
- [ ] All services start with `docker compose up -d` (no errors)
- [ ] Frontend loads at `https://$ARGUMENTS.local` (trusted SSL)
- [ ] Swagger UI loads at `https://$ARGUMENTS.local/api/docs`
- [ ] Swagger JSON at `https://$ARGUMENTS.local/api/docs-json` returns valid OpenAPI spec
- [ ] Health check responds at `https://$ARGUMENTS.local/health`
- [ ] HTTP → HTTPS redirect works (301)
- [ ] `swagger.json` exported to `apps/frontend/swagger.json`
- [ ] Orval generated typed API client in `apps/frontend/src/api/`
- [ ] Generated `src/api/generated.schemas.ts` contains DTO interfaces
- [ ] Generated `src/api/auth/auth.ts` contains typed auth functions
- [ ] Backend hot-reload works (edit src/ → auto-restart)
- [ ] Frontend hot-reload works (edit src/ → HMR)
- [ ] No hardcoded project name in source code (all from env)
- [ ] No hardcoded secrets
- [ ] `.env.example` documents all required variables
- [ ] PEM files excluded in `.gitignore`
- [ ] Generated API files excluded in `.gitignore` (src/api/generated*, swagger.json)

## Constraints

- MUST NOT hardcode project name, domain, or secrets in source code
- MUST use `npm install` (not `npm ci`) in dev Dockerfiles
- MUST include `strictPropertyInitialization: false` in backend tsconfig
- MUST use `#slot` syntax for Ant Design Vue icons (not `:prop`)
- MUST include `allowedHosts` in Vite server config
- MUST include `location /health` in nginx config
- MUST create `.env` symlink for docker-compose
- MUST use ConfigService for all backend configuration
- MUST use `synchronize: false` + `migrationsRun: true` (NEVER synchronize models directly)
- MUST create `data-source.ts` for CLI migration commands
- MUST use HTTP-only Cookie session backed by Redis (`HttpOnly`+`Secure`+`SameSite=Strict`, signed with `SESSION_SECRET`)
- MUST NOT put session IDs, tokens, or credentials in `localStorage` / `sessionStorage` — auth flows entirely through the cookie
- MUST set `withCredentials: true` on frontend axios/Orval + `credentials: true` on backend CORS
- MUST configure `cookie-parser(SESSION_SECRET)` at bootstrap so `req.signedCookies` works
- All Vue components: `<script setup lang="ts">` only
- All API calls: via Orval-generated client (no manual axios to backend)
- Storage and Mail: provider abstraction (interface + swappable implementations)
