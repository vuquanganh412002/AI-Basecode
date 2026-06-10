# AgriNews_ACSMS — Cloud Subscriber Management System

> クラウド版購読者管理システム (ACSMS)
>
> Cloud-based subscriber management for Japan Agricultural News (日本農業新聞)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Backend** | NestJS + TypeScript (strict) |
| **Frontend** | Vue 3 + Vite (`<script setup>`) |
| **UI** | Ant Design Vue 4 + Tailwind CSS |
| **State** | Pinia (Setup Store) |
| **API Client** | Hand-written axios wrappers per BE tag (`src/api/<tag>/<tag>.ts`) |
| **ORM** | TypeORM + PostgreSQL (RDS) |
| **Auth** | HTTP-only Cookie session (Redis-backed, 24h sliding TTL) + bcrypt + RBAC (model.action) |
| **Cache / Session store** | Redis (ioredis + ElastiCache) |
| **Infra** | Terraform + AWS (ECS Fargate, RDS, ElastiCache, S3, CloudFront) |
| **CI/CD** | GitLab CI/CD |
| **Testing** | Vitest (98% effective coverage target) + Vue Test Utils + Playwright |
| **Monitoring** | CloudWatch (Logs, Metrics, Alarms) |

---

## Project Structure

```
AgriNews_ACSMS/
├── .claude/                    # Claude Code AI configuration
│   ├── agents/                 # Reserved
│   ├── commands/               # Legacy slash commands (migrating to skills)
│   ├── rules/                  # 11 mandatory coding rules
│   ├── skills/                 # gen-api-doc, gen-ut-*, gen-code-*, scaffold
│   ├── settings.json
│   └── CLAUDE.md
│
├── apps/
│   ├── backend/                # NestJS backend (domain modules)
│   ├── frontend/               # Vue 3 SPA
│   ├── docker/
│   └── docker-compose.yml
│
├── docs/
│   ├── database/               # Schema design + seeder definitions
│   ├── design/                 # Screen designs (ACSMS-SCR-001 ~ 031)
│   ├── design-vi/              # Vietnamese translations
│   └── requirement/            # Requirements (Japanese → Markdown)
│
├── scripts/                    # Excel ↔ Markdown conversion tools
├── .gitignore
└── README.md
```

---

## Roles & Permissions

| Role | Code | Scope |
| --- | --- | --- |
| 日農（管理者） | `NICHINO_ADMIN` | Full admin — JA master, accounts, announcements |
| 日農（担当者） | `NICHINO_STAFF` | Dealer proxy input, file management |
| 中央会 | `CHUOKAI` | Prefecture-level JA coordinator |
| JA本店 | `JA_HONTEN` | JA headquarters — own JA data |
| JA管理支店 | `JA_KANRI_SHITEN` | JA branch — own branch data |

Authorization: 3-layer model (Permission Guard → DataScope Filter → Field-Level Restriction)

---

## Documentation

| Document | Location |
| --- | --- |
| Requirements | `docs/requirement/` |
| Database Schema | `docs/database/database-design.md` |
| Seeder Data | `docs/database/seeder.md` |
| Screen Designs | `docs/design/ACSMS-SCR-*` |

---

## Claude Code Skills & Commands

### Skills (`.claude/skills/`)

| Skill | Purpose |
| --- | --- |
| `/scaffold [project_name]` | One-time — scaffold fullstack monorepo (NestJS + Vue 3 + Docker) |
| `/gen-api-doc ACSMS-SCR-XXX` | Generate API設計書 from screen design + DB schema |
| `/gen-ut-backend ACSMS-SCR-XXX` | Generate failing NestJS unit + integration tests (TDD red) — 98% coverage target |
| `/gen-ut-frontend ACSMS-SCR-XXX` | Generate failing Vue 3 / Pinia tests (TDD red) — 98% coverage target |
| `/gen-code-backend ACSMS-SCR-XXX` | Generate NestJS source (entity / DTO / service / controller / module) that satisfies the BE spec. Auto-removes `@ts-nocheck` after `tsc --noEmit` passes |
| `/gen-code-frontend ACSMS-SCR-XXX` | Generate Vue 3 source (types / store / view + router entry) that satisfies the FE spec. Auto-removes `@ts-nocheck` after `vue-tsc --noEmit` passes |

### Legacy commands (`.claude/commands/` — migrating to skills)

| Command | Purpose |
| --- | --- |
| `/review` | Code review (current changes or specific path) |
| `/fix-issue <description>` | Analyze and fix a reported issue |
| `/deploy <env>` | Deploy to dev / stg / prod |

---

## Development Workflow (per screen — TDD pipeline)

```
/gen-api-doc        ACSMS-SCR-XXX                                 [spec]
       ↓
/gen-ut-backend     ACSMS-SCR-XXX   → (review BE specs)            [RED]
/gen-code-backend   ACSMS-SCR-XXX                                 [BE src/ GREEN]
npm run migration:generate -- -n <Name> && npm run migration:run
       ↓
/gen-ut-frontend    ACSMS-SCR-XXX   → (review FE specs)            [RED]
/gen-code-frontend  ACSMS-SCR-XXX                                 [FE src/ GREEN]
       ↓
cd apps/backend && npm test     # verify BE green
cd apps/frontend && npm test    # verify FE green
       ↓
/review  → /fix-issue  → /deploy
```

**Step summary**:
1. **Spec** — `/gen-api-doc` reads screen design + DB schema, emits `docs/design/ACSMS-SCR-XXX/ACSMS-SCR-XXX-api.md`.
2. **RED tests** — `/gen-ut-*` emit `*.spec.ts` with a `// @ts-nocheck — TDD red phase` banner so vitest fails red but tsc still passes. **Read the generated specs before moving on** — that's where TDD earns its keep.
3. **GREEN source** — `/gen-code-*` read the matching specs (immutable contract), emit source, then run the type-checker. On pass they strip the banner; on fail they keep it and print the first 30 error lines.
4. **Verify** — user runs `npm test` manually; iterate if still red.

**Order rules**:
- **FE depends on BE when the screen has API calls**: `/gen-code-frontend` writes a hand-written wrapper at `apps/frontend/src/api/<tag>/<tag>.ts` mirroring the BE response shape. Run `/gen-code-backend` first so the response DTO is settled before mirroring it. FE-only screens (dashboard / 404 / static) can skip the BE leg entirely.
- **Migration is not automatic**: `/gen-code-backend` emits the `@Entity` but migration files need a human-chosen name via `npm run migration:generate -- -n <Name>`.
- **Specs are immutable** to `/gen-code-*`. The skill treats them as the contract and won't edit them.
- **Stale-contract guard**: if `api.md` or `screen-design.md` mtime is newer than spec mtime, `/gen-code-*` aborts and asks to rerun `/gen-ut-*` first.
- **One-shot**: no vitest-until-green loop. Fix-and-rerun is manual.

---

## AWS Deploy

Manual deploy to ECS (backend) + S3/CloudFront (frontend):

```bash
cp apps/backend/.env.deploy.example apps/backend/.env.deploy
cp apps/frontend/.env.deploy.example apps/frontend/.env.deploy
# Edit values, then:
./scripts/deploy-aws.sh
```

Env variables, migration/seed flow, and troubleshooting: **[docs/deploy-aws.md](docs/deploy-aws.md)**.

---

## Security

> **NEVER commit:** `.env` files, API keys, secrets, `.claude/settings.local.json`

All secrets via AWS Secrets Manager. See `.claude/rules/security.md`.

### First-deploy admin bootstrap

The initial `NICHINO_ADMIN` account is **not** auto-seeded by migrations. After `npm run migration:run` on a fresh environment, run `npm run seed` explicitly. The seed is idempotent (skips if `login_id='admin'` exists), sets `mfa_enable_flg=true`, and never writes cleartext password anywhere.

#### Local dev

```bash
# 1. Bring stack up + run schema migrations
docker compose -f apps/docker-compose.yml up -d
docker compose -f apps/docker-compose.yml exec backend npm run migration:run

# 2. Create admin — password generated + printed to stdout ONCE
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local npm run seed'
# → copy the printed password into your password manager

# 3. Login at https://agrinews.jp/login (login_id=admin) — OTP arrives in MailHog
open http://localhost:8025
```

To set a password yourself instead of letting the script generate one:

```bash
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local INITIAL_ADMIN_PASSWORD="MyDev@Pass123" npm run seed'
```

To reset (forgot password, or after `docker compose down -v`):

```bash
docker compose -f apps/docker-compose.yml exec postgres \
  psql -U postgres -d agrinews_dev -c "DELETE FROM m_account WHERE login_id='admin';"
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local npm run seed'
```

#### Production / staging

`INITIAL_ADMIN_PASSWORD` is **required** in production — the script throws if missing. Generate it out-of-band, store in Secrets Manager, then bootstrap once via ECS exec / bastion:

```bash
INITIAL_ADMIN_EMAIL=ops@agrinews.jp \
INITIAL_ADMIN_PASSWORD="$(aws secretsmanager get-secret-value \
  --secret-id prod/agrinews/initial-admin-password \
  --query SecretString --output text)" \
  npm run seed
```

#### Env vars

| Variable | Required | Default | Notes |
|---|---|---|---|
| `INITIAL_ADMIN_EMAIL` | ✅ always | — | Used for MFA OTP delivery |
| `INITIAL_ADMIN_PASSWORD` | ✅ in prod / optional in dev | random base64(18) | Min 12 chars |
| `INITIAL_ADMIN_LOGIN_ID` | optional | `admin` | |
| `INITIAL_ADMIN_NAME` | optional | `日農 管理者` | |

> Subsequent admin accounts are created via the in-app account-management screen by the first admin — **not** via `npm run seed`. The seed script exists only to break the chicken-and-egg problem of the very first account.
