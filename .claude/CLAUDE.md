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
- `/scaffold [project_name]` — Scaffold production-ready fullstack monorepo (NestJS + Vue 3 + Docker)

### TDD Pipeline
```
                              ┌─► /gen-ut-backend ACSMS-SCR-XXX  ─► backend *.spec.ts  (RED)
/gen-api-doc ACSMS-SCR-XXX ──►┤                                                           ┐
   (api.md spec)              └─► /gen-ut-frontend ACSMS-SCR-XXX ─► frontend *.spec.ts (RED)
                                                                                          ▼
                                                             /gen-code ACSMS-SCR-XXX  (GREEN — planned)
```
`/gen-ut-backend` and `/gen-ut-frontend` are independent — run either first, or both in parallel. `/gen-code` planned but not yet implemented.

### Commands (`.claude/commands/`) — migrating to skills
- `/review` — Code review
- `/fix-issue` — Analyze and fix a reported issue
- `/deploy` — Deploy the application

## Development Workflow

```
1. Read requirement docs (docs/requirement/, docs/design/)
2. Read database schema (docs/database/database-design.md)
3. Follow rules in .claude/rules/ for all code generation
4. Test before commit
5. Review before merge
```

## Key Documentation

| Document | Location |
| --- | --- |
| Requirements | `docs/requirement/` |
| Database Schema | `docs/database/database-design.md` |
| Seeder Data | `docs/database/seeder.md` |
| Screen Designs | `docs/design/ACSMS-SCR-*` |
