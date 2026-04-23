# Claude Code Configuration — agrinews

## Project Overview

Cloud Subscriber Management System (クラウド版購読者管理システム) for Japan Agricultural News.

- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: Vue 3 + Ant Design Vue + Tailwind CSS
- Auth: JWT RS256, RBAC (model.action permissions), DataScope, field-level restrictions
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
| `security.md` | **CRITICAL**: JWT RS256, RBAC (PermissionsGuard), DataScope, field-level restrictions |
| `monitoring.md` | CloudWatch, structured logging, health checks |
| `testing.md` | Vitest framework, backend/frontend test patterns, E2E (Playwright) |
| `git-workflow.md` | Branch strategy, conventional commits, MR rules |
| `gitlab-ci.md` | GitLab CI/CD pipeline YAML syntax, domain isolation, deployment |
| `terraform.md` | Terraform modules, state management, security, multi-environment |
| `shell-script.md` | Shell script standards (POSIX, shellcheck) |

## Available Skills & Commands

### Skills (`.claude/skills/`)
- `/gen-api-doc ACSMS-SCR-XXX` — Generate API design document from screen design
- `/scaffold [project_name]` — Scaffold production-ready fullstack monorepo (NestJS + Vue 3 + Docker)

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
