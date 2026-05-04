# agrinews — Automation Test Suite

TDD red-phase test base for the agrinews Cloud Subscriber Management System.

## Stack

| Layer | Framework |
|---|---|
| Backend unit | Vitest + `@nestjs/testing` |
| Backend integration | Vitest + supertest + test DB (pg-mem / postgres-test) |
| Frontend component | Vitest + Vue Test Utils + jsdom |
| E2E | Playwright (Chromium) |

## Prerequisites

- Docker + Docker Compose running with the main stack: `cd apps && docker compose up -d`
- Node.js (any version — scripts run inside Docker containers, host Node version does not matter)

## Setup (one command)

```bash
cd apps/autotest-agri
npm run bootstrap
```

This single command does everything:
1. `npm install` (skips if `node_modules` already exists)
2. Creates `.env.test` from `.env.example` (skips if already exists)
3. Starts `postgres-test` (port 5433) + `redis-test` (port 6380) Docker services
4. Runs all 27 TypeORM migrations on the test database
5. Seeds roles, JA master, and 4 test accounts
6. Installs Playwright Chromium browser

> **Note:** Migrations and seeding run **inside Docker containers** (backend + postgres-test). No local `ts-node` or `psql` required.

### Re-running setup

Bootstrap is idempotent — safe to re-run anytime:
- `npm install` is skipped if `node_modules` exists
- `.env.test` is skipped if it exists
- SQL inserts use `ON CONFLICT DO NOTHING`
- Playwright install is skipped if already cached

### Step-by-step (if needed)

```bash
npm install --engine-strict=false
cp .env.example .env.test
npm run setup:db      # start containers + run migrations
npm run seed:db       # seed roles + JA + test accounts
npm run playwright:install
```

## Running Tests

```bash
# Unit + component tests (no DB required)
npm run test:unit

# Integration tests (requires postgres-test + redis-test)
npm run test:integration

# E2E tests (requires full Docker stack running)
npm run test:e2e

# E2E with UI mode (interactive)
npm run test:e2e:ui

# Coverage report → reports/coverage/
npm run test:coverage

# All tests
npm run test:all
```

## Directory Structure

```
apps/autotest-agri/
├── src/
│   ├── fixtures/          # Faker factories
│   ├── page-objects/      # Playwright POMs
│   └── utils/             # Shared helpers
├── e2e/                   # Playwright specs by category
│   ├── auth/
│   ├── masters/
│   ├── subscribers/
│   ├── reports/
│   └── permissions/
├── integration/           # Supertest integration specs
├── unit/                  # Symlink targets (IDE convenience)
│   ├── backend/
│   └── frontend/
├── fixtures/              # Static JSON test data
├── scripts/               # DB setup + seeding
└── reports/               # Test output
    ├── coverage/
    ├── results/
    └── performance/
```

## Generating Tests

Use the `/gen-autotest` skill to generate failing specs for a screen:

```bash
/gen-autotest ACSMS-SCR-001 --type=component
/gen-autotest ACSMS-SCR-003 --type=all
/gen-autotest ACSMS-SCR-010 --type=unit
```
