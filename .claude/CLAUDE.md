# Claude Code Configuration — agrinews

## Project Overview

Cloud Subscriber Management System (クラウド版購読者管理システム) for Japan Agricultural News.

- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: Vue 3 + Ant Design Vue + Tailwind CSS
- Auth: HTTP-only Cookie session (Redis-backed, 24h sliding TTL), RBAC (model.action permissions), DataScope, field-level restrictions
- Infra: AWS (ECS Fargate, RDS, S3, CloudFront), Terraform
- CI/CD: GitLab CI/CD

## Mandatory Rules (11 files)

All rules in `.claude/rules/` are **mandatory**:

| File | Scope |
| --- | --- |
| `project-structure.md` | Folder layout, backend/frontend/infra structure |
| `naming-conventions.md` | NestJS, Vue, DB, Terraform, event naming |
| `nestjs.md` | **Backend**: architecture, API, TypeORM, error handling, security, Dockerfile |
| `vue.md` | **Frontend**: components, state, Orval, Ant Design Vue, router guards, a11y |
| `security.md` | **CRITICAL**: HTTP-only Cookie session (Redis-backed), RBAC (PermissionsGuard), DataScope, field-level restrictions |
| `monitoring.md` | CloudWatch, structured logging, health checks |
| `testing.md` | Vitest framework, backend/frontend test patterns, E2E (Playwright) |
| `git-workflow.md` | Branch strategy, conventional commits, MR rules |
| `gitlab-ci.md` | GitLab CI/CD pipeline YAML syntax, domain isolation, deployment |
| `terraform.md` | Terraform modules, state management, security, multi-environment |
| `shell-script.md` | Shell script standards (POSIX, shellcheck) |

## Available Skills & Commands

### Skills (`.claude/skills/`)
- `/gen-api-doc ACSMS-SCR-XXX` — Generate API design document from screen design
- `/gen-ut-backend ACSMS-SCR-XXX` — Generate failing NestJS unit + integration tests (TDD red phase) for a screen BEFORE backend implementation. Targets 98% effective coverage.
- `/gen-ut-frontend ACSMS-SCR-XXX` — Generate failing Vue 3 / Pinia tests (TDD red phase) for a screen BEFORE frontend implementation. Targets 98% effective coverage.
- `/gen-code-backend ACSMS-SCR-XXX` — Generate NestJS source (entity/DTO/service/controller/module) that satisfies `gen-ut-backend` specs. One-shot; removes `@ts-nocheck` banner after `tsc --noEmit` passes.
- `/gen-code-frontend ACSMS-SCR-XXX` — Generate Vue 3 source (types/store/view + router entry) that satisfies `gen-ut-frontend` specs. One-shot; removes `@ts-nocheck` banner after `vue-tsc --noEmit` passes.
- `/scaffold [project_name]` — Scaffold production-ready fullstack monorepo (NestJS + Vue 3 + Docker)

### TDD Pipeline

Full per-screen pipeline (order, review steps, migration + Orval timing, order rules) lives in **[README.md](../../README.md) § Development Workflow**. That is the canonical reference — do not duplicate it here.

Quick reminder for this-session work:
- BE leg: `/gen-ut-backend` → review specs → `/gen-code-backend` → `migration:generate` → `api:generate`
- FE leg: `/gen-ut-frontend` → review specs → `/gen-code-frontend`
- FE depends on BE output (Orval client). Specs are immutable to `gen-code-*`. Migration is manual.

### Commands (`.claude/commands/`) — migrating to skills
- `/review` — Code review
- `/fix-issue` — Analyze and fix a reported issue
- `/deploy` — Deploy the application

## Development Workflow

See [README.md § Development Workflow](../../README.md) for the canonical per-screen TDD pipeline (Steps: `/gen-api-doc` → `/gen-ut-backend` → review → `/gen-code-backend` → migration + Orval → `/gen-ut-frontend` → review → `/gen-code-frontend` → `npm test`).

Before any code generation:
1. Read requirement docs (`docs/requirement/`, `docs/design/`)
2. Read database schema (`docs/database/database-design.md`)
3. Follow rules in `.claude/rules/`

## Key Documentation

| Document | Location |
| --- | --- |
| Requirements | `docs/requirement/` |
| Database Schema | `docs/database/database-design.md` |
| Seeder Data | `docs/database/seeder.md` |
| Screen Designs | `docs/design/ACSMS-SCR-*` |
