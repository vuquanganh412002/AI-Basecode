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
| **ORM** | TypeORM + PostgreSQL (RDS / Aurora) |
| **External DB** | MySQL — customer 電子版 system, read-only secondary connection |
| **Auth** | HTTP-only Cookie session (Redis-backed, 24h sliding TTL) + bcrypt + RBAC (model.action) |
| **Cache / Session store** | Redis (ioredis + ElastiCache) |
| **Object storage** | S3 (AWS) / MinIO (local) |
| **Mail** | SES (AWS) / MailHog (local) |
| **Infra** | Terraform + AWS (ECS Fargate, RDS, ElastiCache, S3, CloudFront, EventBridge) — separate `agrinews-terraform` repo |
| **CI/CD** | GitLab CI/CD |
| **Testing** | **Jest** (backend) + **Vitest** + Vue Test Utils (frontend) + Playwright (E2E) |
| **Monitoring** | CloudWatch (Logs, Metrics, Alarms) |

Backend and frontend deliberately use different test runners — Jest is the NestJS
default and emits decorator metadata natively, Vitest shares the Vite transform
pipeline with the SPA. See `.claude/rules/testing.md`.

---

## Quick Start (local)

Prerequisites: Docker, Node 20+, `mkcert`, `openssl`.

```bash
# 1. Map agrinews.jp → 127.0.0.1 (the local stack is served over HTTPS via nginx)
./scripts/setup-hosts.sh          # requires sudo

# 2. Generate local TLS certificates
./scripts/generate-certs.sh       # requires mkcert

# 3. Env files — the defaults already match the docker-compose topology
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# docker compose needs a .env next to docker-compose.yml. Symlink it to the
# backend env so there is one file to edit (see apps/.env.example for the
# alternative of keeping a separate copy):
ln -s ./backend/.env apps/.env

# 4. Bring the stack up
docker compose -f apps/docker-compose.yml up -d

# 5. Schema + the first admin account + customer sample data
docker compose -f apps/docker-compose.yml exec backend npm run migration:run
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local npm run seed:admin'    # login_id='admin'
docker compose -f apps/docker-compose.yml exec backend npm run seed:sample   # JA / 管理支店 / accounts

# 6. Open the app — OTP mail lands in MailHog
open https://agrinews.jp/login
open http://localhost:8025
```

To wipe and rebuild the dev database in one step (drop → migrate → seed:admin → seed:sample):

```bash
./scripts/reset-dev-db.sh
```

### Sample data (`npm run seed:sample`)

Loads the customer-supplied JA master data — 5 JA (3 単協 + 2 中央会),
6 管理支店, and the accounts below. It refuses to run when
`NODE_ENV=production`, and re-running is a no-op.

The source Excel is real customer data, so it is **not** in this repo — the
values are transcribed into `apps/backend/scripts/seed-sample-data.ts`. Ask the
team for the original if you need to re-check a cell.

Two things are seeded that the Excel does **not** contain, because without them
you cannot reach the screens that create everything else: one dummy 販売店 per
JA with code `9999999999` (the 電子版 placeholder — see
`apps/backend/src/common/constants/hanbaiten-dummy.constant.ts`) and the two
日農 accounts below. 支店 / 単価 / お知らせ / 購読者 are deliberately **not**
seeded — create them from the UI so real and fixture data never blur together.

| login_id | password | Role | Scope |
| --- | --- | --- | --- |
| `admin` | `admin@1234567` | NICHINO_ADMIN | from `seed:admin` |
| `admin01` | `admin@1234567` | NICHINO_ADMIN | — |
| `staff01` | `admin@1234567` | NICHINO_STAFF | — |
| `1165741000` | `1165741000` | JA_HONTEN | 松本ハイランド |
| `1165741000_ks` | `1165741000` | JA_KANRI_SHITEN | 松本ハイランド |
| `1275570000` | `1275570000` | JA_HONTEN | 大阪泉州 |
| `1275570050` | `1275570050` | JA_KANRI_SHITEN | 大阪泉州購買口 |
| `1275570055` | `1275570055` | JA_KANRI_SHITEN | 大阪泉州総務口 |
| `1275506000` | `1275506000` | JA_HONTEN | たかつき |
| `1275506000_ks` | `1275506000` | JA_KANRI_SHITEN | たかつき |
| `1275506010` | `1275506010` | JA_KANRI_SHITEN | たかつき・総務 |
| `1275506015` | `1275506015` | JA_KANRI_SHITEN | たかつき・経済 |
| `1333300000` | `1333300000` | CHUOKAI | 愛媛県中央会 |
| `1083300000` | `1083300000` | CHUOKAI | 茨城県中央会 |

JA passwords come from the Excel's `password_hash` column (= the code itself).
The `_ks` suffix exists only because the Excel gives the 本店 and its 管理支店
account the same `login_id`, which is UNIQUE — the password stays the bare code.
Deviations from the Excel are listed at the top of
`apps/backend/scripts/seed-sample-data.ts`.

### Local services

| Service | URL / Port | Notes |
| --- | --- | --- |
| App (nginx) | https://agrinews.jp | 80 → 443 redirect; proxies FE + BE |
| Backend | http://localhost:3000 | Swagger UI at `/api/docs` |
| Frontend (Vite) | http://localhost:5173 | |
| MailHog | http://localhost:8025 | catches every outgoing mail (OTP, password reset) |
| MinIO console | http://localhost:9001 | S3-compatible storage; credentials are `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` from `apps/.env` |
| PostgreSQL | localhost:5432 | main business DB |
| Redis | localhost:6379 | session + rate-limit store |
| 電子版 MySQL (mock) | localhost:3307 | local stand-in for the customer system |

### Tests

```bash
cd apps/backend  && npm test              # Jest — unit + integration (pg-mem)
cd apps/backend  && npm run test:pg       # integration against a real Postgres
cd apps/frontend && npm test              # Vitest
cd apps/frontend && npm run test:coverage # FE gate: 90% lines/statements, 85% branches/functions
```

---

## Project Structure

```
AgriNews_ACSMS/
├── .claude/                    # Claude Code AI configuration
│   ├── commands/               # Legacy slash commands (migrating to skills)
│   ├── rules/                  # 11 mandatory coding rules
│   ├── skills/                 # gen-api-doc, gen-testcase-doc, gen-ut-*, gen-code-*, scaffold
│   ├── settings.json
│   └── CLAUDE.md
│
├── apps/
│   ├── backend/                # NestJS — domain modules under src/modules/,
│   │   │                       #   entities under src/database/entities/,
│   │   │                       #   batch entrypoints under src/batch/
│   │   └── .env.example        # copy to .env — defaults run as-is
│   ├── frontend/               # Vue 3 SPA
│   ├── docker/                 # Dockerfiles + nginx config
│   └── docker-compose.yml
│
├── docs/
│   ├── database/               # Schema design + seeder definitions
│   ├── design/                 # Screen designs (ACSMS-SCR-001 ~ 031)
│   ├── design-vi/              # Vietnamese translations
│   ├── requirement/            # Requirements (Japanese → Markdown)
│   └── deploy-aws.md           # Deploy runbook
│
├── scripts/                    # Excel ↔ Markdown converters, deploy, local setup
└── README.md
```

Terraform lives in the separate **`agrinews-terraform`** repository — this repo
has no `infra/` directory.

---

## Roles & Permissions

| Role | Code | Scope |
| --- | --- | --- |
| 日農（管理者） | `NICHINO_ADMIN` | Full admin — JA master, accounts, announcements |
| 日農（担当者） | `NICHINO_STAFF` | Dealer proxy input, file management |
| 中央会 | `CHUOKAI` | Prefecture-level JA coordinator |
| JA本店 | `JA_HONTEN` | JA headquarters — own JA data |
| JA管理支店 | `JA_KANRI_SHITEN` | JA branch — own branch data |

Authorization is a 4-layer model, each layer guarding a different surface:

1. **Permission Guard** (controller) — `@Permissions('model.action')`
2. **DataScope Filter** (service) — restricts rows by the role's org hierarchy
3. **Field-Level Restriction** (service) — per-role column allow-list on update
4. **FK Reference Guard** (service) — validates FK ids in the request body belong
   to the caller's tenant, blocking cross-tenant injection

Details in `.claude/rules/security.md`.

---

## Batch Jobs

Run as ECS one-off tasks, scheduled by EventBridge rules defined in
`agrinews-terraform`. Each has a `:dev` (`ts-node`, runs `src/` directly) and a
`:prod` (compiled, `node dist/…`) script. ECS invokes the `:prod` one.

| Job | Schedule (JST) | Purpose |
| --- | --- | --- |
| `dokusya:sync` | every 10 min | Pull 電子版 `users` → `t_dokusya` (incremental; force a full reconcile with `DENSHIBAN_FULL_SYNC=true`) |
| `dokusya:apply-due` | 00:05 | Finalise subscriptions whose 購読中止日 has arrived; apply scheduled info changes |
| `tanka:expire` | 00:15 | Flip `m_tanka.active_flg` to FALSE once `tekiyo_end_date` has passed |
| `file:cleanup` | 23:45 | Delete S3 objects past `scheduled_delete_date`; soft-delete the DB rows |
| `log:cleanup` | **not scheduled** | Hard-delete `t_log` / `t_login_log` older than `LOG_RETENTION_YEARS` (default 5). The entrypoint exists but no EventBridge rule creates it — run it by hand, or add it to `scheduled-batches.tf`. |

Schedules above are the source of truth in
`agrinews-terraform/envs/<env>/scheduled-batches.tf` (dev / stg / prod are
identical). Those files express the same times in **UTC** because EventBridge
cron has no timezone — e.g. 00:05 JST is written `cron(5 15 * * ? *)`.

Locally:

- One-off: `npm run <job>:dev --workspace=apps/backend`, or inside Docker
  `docker compose -f apps/docker-compose.yml exec backend sh -c 'cd /app && npm run <job>:dev'`
- On a schedule: the `batch-scheduler` compose service runs busybox `crond`
  against `apps/docker/backend/batch-crontab`. It reuses the backend image, so
  no extra tooling. Only `dokusya:sync` is enabled by default — the nightly
  jobs are commented out there because waiting until 00:05 to observe one is
  rarely what you want. That crontab is written in **JST** (the container sets
  `TZ=Asia/Tokyo`), so do not copy cron expressions between it and terraform
  without converting.

## 電子版 Integration

Two-way link with the customer's existing 電子版 system:

- **Pull** — `dokusya-sync` reads the 電子版 MySQL DB (read-only user) and maps
  rows into `t_dokusya` / `t_dokusya_rireki`. Toggle with `DENSHIBAN_DB_ENABLED`.
- **Push** — subscriber changes are sent to the 電子版 `updateUserInfo` API
  (AES-256-GCM signed with a shared key). Toggle with `DENSHIBAN_PUSH_ENABLED`;
  off by default so the cloud side can run standalone.

---

## Documentation

| Document | Location |
| --- | --- |
| Requirements | `docs/requirement/` |
| Database Schema | `docs/database/database-design.md` |
| Seeder Data | `docs/database/seeder.md` |
| Screen Designs | `docs/design/ACSMS-SCR-*` |
| Deploy Runbook | `docs/deploy-aws.md` |
| API (live) | `http://localhost:3000/api/docs` — or `npm run swagger:export` for a snapshot |

---

## Claude Code Skills & Commands

### Skills (`.claude/skills/`)

| Skill | Purpose |
| --- | --- |
| `/scaffold [project_name]` | One-time — scaffold fullstack monorepo (NestJS + Vue 3 + Docker) |
| `/gen-api-doc ACSMS-SCR-XXX` | Generate API設計書 from screen design + DB schema |
| `/gen-testcase-doc ACSMS-SCR-XXX` | Generate the test-case document (テストケース) for a screen |
| `/gen-ut-backend ACSMS-SCR-XXX` | Generate failing NestJS unit + integration tests (TDD red) |
| `/gen-ut-frontend ACSMS-SCR-XXX` | Generate failing Vue 3 / Pinia tests (TDD red) |
| `/gen-code-backend ACSMS-SCR-XXX` | Generate NestJS source (entity / DTO / service / controller / module) satisfying the BE spec. Auto-removes `@ts-nocheck` after `tsc --noEmit` passes |
| `/gen-code-frontend ACSMS-SCR-XXX` | Generate Vue 3 source (types / store / view + router entry) satisfying the FE spec. Auto-removes `@ts-nocheck` after `vue-tsc --noEmit` passes |

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
cd apps/backend && npm test     # verify BE green (Jest)
cd apps/frontend && npm test    # verify FE green (Vitest)
       ↓
/review  → /fix-issue  → /deploy
```

**Step summary**:
1. **Spec** — `/gen-api-doc` reads screen design + DB schema, emits `docs/design/ACSMS-SCR-XXX/ACSMS-SCR-XXX-api.md`.
2. **RED tests** — `/gen-ut-*` emit `*.spec.ts` with a `// @ts-nocheck — TDD red phase` banner so the suite fails red but the type-checker still passes. **Read the generated specs before moving on** — that's where TDD earns its keep.
3. **GREEN source** — `/gen-code-*` read the matching specs (immutable contract), emit source, then run the type-checker. On pass they strip the banner; on fail they keep it and print the first 30 error lines.
4. **Verify** — user runs `npm test` manually; iterate if still red.

**Order rules**:
- **FE depends on BE when the screen has API calls**: `/gen-code-frontend` writes a hand-written wrapper at `apps/frontend/src/api/<tag>/<tag>.ts` mirroring the BE response shape. Run `/gen-code-backend` first so the response DTO is settled before mirroring it. FE-only screens (dashboard / static) can skip the BE leg entirely.
- **Migration is not automatic**: `/gen-code-backend` emits the `@Entity` but migration files need a human-chosen name via `npm run migration:generate -- -n <Name>`.
- **Specs are immutable** to `/gen-code-*`. The skill treats them as the contract and won't edit them.
- **Stale-contract guard**: if `api.md` or `screen-design.md` mtime is newer than spec mtime, `/gen-code-*` aborts and asks to rerun `/gen-ut-*` first.
- **One-shot**: no test-until-green loop. Fix-and-rerun is manual.

---

## AWS Deploy

Manual deploy to ECS (backend) + S3/CloudFront (frontend):

```bash
cp apps/backend/.env.deploy.example apps/backend/.env.deploy
cp apps/frontend/.env.deploy.example apps/frontend/.env.deploy
# Edit values, then:
./scripts/deploy-aws.sh
```

The deploy script sorts keys into three classes: **deploy-managed** (ECR / ECS
targets, never injected into the container), **secret-managed** (stripped from
plaintext — AWS Secrets Manager supplies them via the task definition `secrets`
block), and **plaintext** (merged into the task definition as-is). Both
`.env.deploy.example` files document which key falls where.

Env variables, migration/seed flow, and troubleshooting: **[docs/deploy-aws.md](docs/deploy-aws.md)**.

### Env file conventions

There are three env scopes, each with a tracked `.example` template:

| File | Consumed by |
| --- | --- |
| `apps/.env` | docker compose `${...}` interpolation only (container init values) |
| `apps/backend/.env` | the backend container (`env_file`) and `npm run start:dev` |
| `apps/frontend/.env` | Vite at build/dev time (`VITE_*`) |

Section and key order is identical across `.env`, `.env.example`, and
`.env.deploy` so a local config can be diffed against a deployed one directly.
`.env.example` ships working local defaults — `cp .env.example .env` boots
without edits. Production refuses to start on those defaults: `configuration.ts`
runs `assertProductionSecrets()` when `NODE_ENV=production` and crashes if
`SESSION_SECRET` / `DB_PASSWORD` / `STORAGE_*` are unset or still at a dev value.

---

## Security

> **NEVER commit:** `.env` files, API keys, secrets, `.claude/settings.local.json`

All secrets via AWS Secrets Manager. See `.claude/rules/security.md`.

### First-deploy admin bootstrap

The initial `NICHINO_ADMIN` account is **not** auto-seeded by migrations. After `npm run migration:run` on a fresh environment, run `npm run seed:admin` explicitly. The seed is idempotent (skips if `login_id='admin'` exists), sets `mfa_enable_flg=true`, and never writes a cleartext password anywhere.

#### Local dev

```bash
# Create admin. In dev the password defaults to the fixed 'admin@1234567'
# so nobody has to grep logs; the script prints it.
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local npm run seed:admin'
```

To set a password yourself instead of letting the script generate one:

```bash
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local INITIAL_ADMIN_PASSWORD="MyDev@Pass123" npm run seed:admin'
```

To reset (forgot password, or after `docker compose down -v`):

```bash
docker compose -f apps/docker-compose.yml exec postgres \
  psql -U postgres -d agrinews_dev -c "DELETE FROM m_account WHERE login_id='admin';"
docker compose -f apps/docker-compose.yml exec backend \
  sh -c 'INITIAL_ADMIN_EMAIL=dev@local npm run seed:admin'
```

#### Production / staging

`INITIAL_ADMIN_PASSWORD` is **required** in production — the script throws if missing. Generate it out-of-band, store in Secrets Manager, then bootstrap once via ECS exec / bastion:

```bash
INITIAL_ADMIN_EMAIL=ops@agrinews-manage.com \
INITIAL_ADMIN_PASSWORD="$(aws secretsmanager get-secret-value \
  --secret-id prod/agrinews/initial-admin-password \
  --query SecretString --output text)" \
  npm run seed:admin
```

#### Env vars

| Variable | Required | Default | Notes |
|---|---|---|---|
| `INITIAL_ADMIN_EMAIL` | ✅ always | `admin@agrinews-manage.com` | MFA OTP destination. Always pass it explicitly in prod — the default is a dev convenience, not a real mailbox. |
| `INITIAL_ADMIN_PASSWORD` | ✅ in prod / optional in dev | `admin@1234567` (dev only) | Min 12 chars. Production throws when unset — no fallback. |
| `INITIAL_ADMIN_LOGIN_ID` | optional | `admin` | |
| `INITIAL_ADMIN_NAME` | optional | `日農 管理者` | |

> Subsequent admin accounts are created via the in-app account-management screen by the first admin — **not** via `npm run seed:admin`. The seed script exists only to break the chicken-and-egg problem of the very first account.
