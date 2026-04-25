# Git Workflow — GitLab CI/CD

> Git branching strategy and CI/CD pipeline rules for the `agrinews` project.

## Branch Strategy

```
main          — Production-ready code only (protected)
develop       — Integration branch for features
feature/*     — New features
fix/*         — Bug fixes
hotfix/*      — Urgent production fixes
release/*     — Release preparation
```

## Branch Naming
```
feature/user-authentication
feature/subscriber-search
fix/login-redirect-bug
fix/subscriber-pagination
hotfix/critical-security-patch
release/v1.2.0
```

---

## Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types
| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no feature/fix |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |

### Scopes (by domain)
| Scope | Domain |
|-------|--------|
| `auth` | Authentication/authorization |
| `users` | User management |
| `dokusya` | Subscriber management |
| `frontend` | Vue 3 frontend |
| `infra` | Terraform/AWS infrastructure |
| `ci` | GitLab CI/CD pipeline |

### Examples
```
feat(dokusya): add subscriber search with pagination

fix(auth): extend session TTL correctly on refresh endpoint

docs(database): update seeder definitions

test(users): add unit tests for UsersService.findById

chore: upgrade @nestjs/core to v10.3.0

ci: add Terraform validate step to pipeline
```

---

## Merge Request (MR) Rules

> GitLab uses **Merge Requests** (not Pull Requests)

- MRs must reference an issue: `Closes #123`
- Minimum **1 reviewer** approval required
- All CI checks must pass (validate stage)
- No direct commits to `main` or `develop`
- MR title must follow conventional commit format
- Squash commits on merge (clean history)

### MR Template
```markdown
## What
[Brief description of the change]

## Why
[Business reason or issue reference: Closes #123]

## How
[Technical approach taken]

## Checklist
- [ ] Tests added/updated
- [ ] API docs updated (if endpoint changed)
- [ ] No hardcoded secrets
- [ ] Code reviewed by Code Reviewer agent
```

---

## GitLab CI/CD Pipeline

> Detailed pipeline YAML rules in `gitlab-ci.md`.

| Environment | Branch | Trigger | Approval |
|---|---|---|---|
| dev | Any | Auto on MR merge | None |
| stg | `main`, `release/*` | Manual trigger | None |
| prod | `main` only | Manual trigger | Required |

Docker tags: `{branch}-{commit_sha_short}` (dev/stg), `v{semver}` (prod). Never use `latest` for production.

---

## Commit Best Practices
- Commit frequently with small, focused changes
- Each commit = one logical change
- Never commit: `.env` files, secrets, `node_modules`, `.terraform/`
- Always run tests before committing
- Run `terraform fmt` before committing infra changes

## Tags & Releases
```bash
# Tag a release
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

### Semantic Versioning
- `MAJOR.MINOR.PATCH` — `v1.2.3`
- MAJOR: Breaking API changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes
