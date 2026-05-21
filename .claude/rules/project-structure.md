# Project Structure — agrinews

> Standard folder layout for the `agrinews` monorepo: NestJS backend + Vue 3 frontend + Terraform infrastructure.

---

## Top-Level Structure

```
agrinews/
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Agent definitions (reserved)
│   ├── commands/               # /deploy, /fix-issue, /review
│   ├── rules/                  # 11 mandatory rules
│   ├── skills/                 # Skills (reserved)
│   ├── settings.json
│   └── CLAUDE.md
│
├── apps/
│   ├── backend/                # NestJS backend application
│   │   └── .env.example        # Backend environment variables
│   ├── frontend/               # Vue 3 SPA frontend
│   │   └── .env.example        # Frontend environment variables
│   ├── docker/                 # Dockerfiles
│   │   ├── Dockerfile.backend
│   │   └── Dockerfile.frontend
│   └── docker-compose.yml      # Local development with Docker
│
├── infra/                      # Terraform Infrastructure as Code
│   ├── modules/                # Reusable Terraform modules
│   └── environments/           # Per-environment configs (dev, stg, prod)
│
├── docs/                       # Documentation
│   ├── database/               # Schema design + seeder definitions
│   ├── design/                 # Screen designs (ACSMS-SCR-001 ~ 031)
│   ├── design-vi/              # Vietnamese translations
│   └── requirement/            # Requirements (Japanese → Markdown)
│
├── scripts/                    # Utility tools (Excel ↔ Markdown converters)
├── .gitlab-ci.yml              # GitLab CI/CD pipeline
├── .gitignore
└── README.md
```

---

## Backend Structure (NestJS — Domain Modules)

```
apps/backend/
├── src/
│   ├── main.ts                         # Application entry point
│   ├── app.module.ts                   # Root module
│   │
│   ├── common/                         # Shared across all modules
│   │   ├── decorators/                 # Custom decorators
│   │   ├── exceptions/                 # Base domain exceptions
│   │   │   └── domain.exception.ts
│   │   ├── filters/                    # Global exception filter
│   │   │   └── global-exception.filter.ts
│   │   ├── guards/                     # Auth guards
│   │   │   ├── session-auth.guard.ts
│   │   │   └── permissions.guard.ts
│   │   ├── interceptors/              # Response transform, logging
│   │   ├── pipes/                     # Custom validation pipes
│   │   └── dto/                       # Shared DTOs (pagination, etc.)
│   │       └── pagination.dto.ts
│   │
│   ├── config/                        # Configuration module
│   │   └── config.module.ts
│   │
│   ├── modules/                       # Domain modules (one per domain)
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── session.service.ts     # Redis-backed session CRUD
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── exceptions/
│   │   │       └── invalid-credentials.exception.ts
│   │   │
│   │   ├── redis/                     # Global ioredis client
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts        # imports([User]) from @/database/entities
│   │   │   ├── users.controller.ts
│   │   │   ├── users.controller.spec.ts  # Unit test next to source
│   │   │   ├── users.service.ts
│   │   │   ├── users.service.spec.ts     # Unit test next to source
│   │   │   ├── users.mapper.ts           # Entity → response DTO (pure fn `toUserResponse`)
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   └── exceptions/
│   │   │       └── user-not-found.exception.ts
│   │
│   └── database/                      # Database configuration + ALL entities
│       ├── database.module.ts
│       ├── data-source.ts             # CLI DataSource — `entities: ['entities/*']`
│       ├── entities/                  # ★ Single source of truth for entities
│       │   ├── user.entity.ts         # 1 entity = 1 file
│       │   ├── ja.entity.ts           # No per-module entity folders
│       │   ├── m-code.entity.ts       # Owner module = TypeOrmModule.forFeature([X])
│       │   └── ...                    # Cross-module FK: import @/database/entities
│       └── migrations/
│
├── test/                              # Integration & E2E tests
│   ├── integration/                   # Cross-module tests with test DB
│   └── e2e/                           # Playwright E2E tests
│
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

### Backend Rules
- **Domain modules** — not organized by technical layers
- Each module contains: module, controller, service, DTOs, exceptions (entities are NOT here — they live in `src/database/entities/`)
- **Entities are shared** — one canonical file per table in `src/database/entities/<name>.entity.ts`. The `@Entity('table_name')` decorator must appear exactly once across the whole repo. Module that CRUDs the entity calls `TypeOrmModule.forFeature([Entity])`; other modules that need it (FK relation, secondary read) IMPORT from `@/database/entities/<name>.entity` — never redefine.
- `common/` contains shared code: guards, filters, interceptors, base DTOs
- Dependency flow: Controller → Service → Repository (one direction only)

---

## Frontend Structure (Vue 3 + Vite SPA)

```
apps/frontend/
├── src/
│   ├── main.ts                        # Application entry point
│   ├── App.vue                        # Root component
│   │
│   ├── views/                         # Page-level components (route-based)
│   │   ├── auth/
│   │   │   ├── LoginView.vue
│   │   │   └── RegisterView.vue
│   │   ├── dashboard/
│   │   │   └── DashboardView.vue
│   │
│   ├── components/                    # Reusable UI components
│   │   ├── common/                    # App-wide (Button, Modal, Table)
│   │   │   ├── BaseButton.vue
│   │   │   └── __tests__/
│   │   │       └── BaseButton.spec.ts # Component unit test
│   │   └── layout/                    # Sidebar, Header, Layout
│   │
│   ├── composables/                   # Reusable logic (useXxx)
│   │   ├── useAuth.ts
│   │   ├── __tests__/
│   │   │   └── useAuth.spec.ts        # Composable unit test
│   │   └── useUsers.ts
│   │
│   ├── stores/                        # Pinia stores (Setup Store)
│   │   ├── auth.store.ts
│   │   ├── __tests__/
│   │   │   └── auth.store.spec.ts     # Store unit test
│   │   └── user.store.ts
│   │
│   ├── api/                           # Orval auto-generated clients
│   │   └── (generated — DO NOT edit manually)
│   │
│   ├── router/                        # Vue Router configuration
│   │   └── index.ts
│   │
│   ├── types/                         # Local TypeScript types
│   └── utils/                         # Pure utility functions
│
├── test/                              # E2E tests
│   └── e2e/                           # Playwright E2E tests
│       └── login.spec.ts
│
├── public/
├── index.html
├── vite.config.ts
├── vitest.config.ts                   # Vitest configuration
├── tsconfig.json
├── orval.config.ts                    # Orval API client generation config
└── package.json
```

### Frontend Rules
- `views/` — page-level, tied to route (PascalCase + View suffix)
- `components/` — reusable UI (PascalCase)
- `composables/` — logic hooks (camelCase, prefix `use`)
- `stores/` — Pinia Setup Store (camelCase, suffix `.store.ts`)
- `api/` — auto-generated by Orval — **DO NOT edit manually**
- `__tests__/` — unit tests next to source (components, composables, stores)
- `test/e2e/` — Playwright E2E tests

---

## Infrastructure Structure (Terraform)

```
infra/
├── modules/                           # Reusable Terraform modules
│   ├── networking/                    # VPC, subnets, IGW, NAT
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── ecs/                           # ECS cluster, task def, service
│   ├── rds/                           # RDS PostgreSQL
│   ├── cdn/                           # S3 + CloudFront
│   └── security/                      # WAF, security groups
│
└── environments/                      # Per-environment configurations
    ├── dev/
    │   ├── main.tf                    # Module calls
    │   ├── variables.tf
    │   └── terraform.tfvars
    ├── stg/
    └── prod/
```

### Infrastructure Rules
- Every module: `main.tf`, `variables.tf`, `outputs.tf`, `README.md`
- All variables must have `description`
- All resources must have required tags
- Secrets from AWS Secrets Manager — NOT in `.tfvars`

---

## Layered Architecture (Backend)

```
Request → Controller → Service → Repository → Database
            ↑              ↑
          Guard          Entity
          DTO
          Pipe
```

- **Controller**: Route + validate + delegate to Service
- **Service**: Business logic, orchestration
- **Repository**: Data access (TypeORM)
- **Entity**: Data schema (TypeORM decorators)
- **DTO**: Input/output validation (class-validator)

---

## File Naming Summary

| Type | Convention | Example |
|------|-----------|---------|
| NestJS module | kebab-case | `users.module.ts` |
| NestJS controller | kebab-case | `users.controller.ts` |
| NestJS service | kebab-case | `users.service.ts` |
| TypeORM entity | kebab-case | `user.entity.ts` |
| DTO | kebab-case | `create-user.dto.ts` |
| Vue component | PascalCase | `UserProfile.vue` |
| Vue view | PascalCase + View | `DashboardView.vue` |
| Composable | camelCase + use | `useAuth.ts` |
| Pinia store | camelCase + .store | `auth.store.ts` |
| Terraform module | snake_case folder | `networking/main.tf` |
| Test file | source + .spec | `users.service.spec.ts` |
