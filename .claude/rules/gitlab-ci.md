# GitLab CI/CD Pipeline Coding Standards

## Core Principles

1. **Domain Isolation**: Backend, frontend, and infrastructure jobs execute independently with explicit `needs:` dependencies only within domains.
2. **Fail-Fast Execution**: Pipelines terminate immediately on script failure; retry only for transient failures.
3. **Resource Accountability**: All artifacts and cache entries have explicit size management and retention policies.
4. **Deployment Safety**: Environment promotion is controlled via protected environments and role-based access.
5. **Self-Contained Pipelines**: All logic, scripts, and configurations reside in version control; no external orchestration.

---

## Syntax & Logic

### Rule 1: Mandatory `rules:` Syntax
- **MUST** use `rules:` instead of deprecated `only:` and `except:`.
- **PROHIBITED**: `only:`, `except:`, `only: [branches]`, `except: [branches]`.

```yaml
job_name:
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_COMMIT_TAG != null'
      when: never
```

### Rule 2: Mandatory `workflow:rules`
- **MUST** define `workflow:rules` at pipeline root.
- **MUST** include rules for: main branch, feature branches, tags, MR events.

```yaml
workflow:
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_COMMIT_TAG'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - when: never
```

### Rule 3: Inheritance via `extends:`
- **MUST** use `extends:` to inherit from templates (prefixed with `.`).
- **MUST** define reusable templates as `.template_name`.

```yaml
.backend_job:
  image: node:18
  cache: {key: backend, paths: [apps/backend/node_modules/]}

backend_test:
  extends: .backend_job
  script: [npm test]
```

### Rule 4: Reusable Scripts via `!reference`
- **MUST** use `!reference` for shared script blocks.
- **PROHIBITED**: Copy-pasting scripts across jobs.

```yaml
.setup_creds:
  - export TOKEN="$CI_JOB_TOKEN"

deploy_staging:
  script:
    - !reference [.setup_creds, 0]
    - ./deploy.sh
```

---

## Execution Flow

### Rule 5: DAG with `needs:` for Parallel Execution
- **MUST** use `needs:` to define job dependencies within same domain.
- **MUST NOT** rely on stage ordering alone.
- **Domain isolation**: Backend jobs depend only on backend jobs; frontend only on frontend; infra only on infra.

```yaml
backend_test:
  needs: [backend_build]
  script: [npm test]

frontend_test:
  needs: [frontend_build]
  script: [npm test]
```

### Rule 6: Interruptible Non-Main Jobs
- **MUST** set `interruptible: true` for feature/MR jobs.
- **MUST** set `interruptible: false` for main/staging/production jobs.

```yaml
feature_test:
  interruptible: true
  rules:
    - if: '$CI_COMMIT_BRANCH != "main"'

prod_deploy:
  interruptible: false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

### Rule 7: Retry Policy for Flaky Jobs
- **MUST** set `retry: max: 2` only for transient failures (network, external APIs).
- **PROHIBITED**: Retry for logic/compilation errors.

```yaml
integration_test:
  retry:
    max: 2
    when: [runner_system_failure, stuck_or_timeout_failure]
  script: [npm run test:integration]
```

---

## Scripting Best Practices

### Rule 8: Multi-Line Scripts via YAML Block Scalars
- **MUST** use `|` for multi-line scripts.
- **PROHIBITED**: `;` or `&&` chaining.

```yaml
script:
  - |
    set -e
    export VAR="$CI_COMMIT_SHA"
    ./deploy.sh
```

### Rule 9: Variable Quoting
- **MUST** quote all CI/CD variable references: `"$VARIABLE_NAME"`.

```yaml
script:
  - echo "Branch: $CI_COMMIT_BRANCH"
  - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD"
```

### Rule 10: Fail-Fast with `set -e`
- **MUST** include `set -e` as first line in multi-line `script:` blocks.

```yaml
script:
  - |
    set -e
    npm run build
    npm test
```

### Rule 11: Setup Tasks in `before_script:`
- **MUST** use `before_script:` for initialization (exports, logins, installs).
- **MUST NOT** mix setup and execution logic in `script:`.

```yaml
before_script:
  - docker login -u "$USER" -p "$PASS" "$REGISTRY"
script:
  - docker push "$REGISTRY/image:latest"
```

### Rule 12: No Inline Credentials
- **PROHIBITED**: Credentials in scripts or comments.
- **MUST**: Use CI/CD variables with `masked: true` and `protected: true`.

```yaml
script:
  - curl -H "Authorization: Bearer \"$API_TOKEN\"" api.example.com
```

---

## Resource Management

### Rule 13: Artifact Expiration
- **MUST** set `expire_in:` for all `artifacts:`.
- Production: `never` (releases only). Test/build: `7 days`. Logs: `30 days`.

```yaml
build_job:
  artifacts: {paths: [dist/], expire_in: 7 days}

release_job:
  artifacts: {paths: [releases/], expire_in: never}
  rules:
    - if: '$CI_COMMIT_TAG'
```

### Rule 14: Specific Cache/Artifact Paths
- **MUST** define specific `paths:` for cache and artifacts.
- **PROHIBITED**: Wildcards (`*.*`, `**`).
- Separate cache keys per domain.

```yaml
.backend_cache:
  cache: {key: backend_npm, paths: [apps/backend/node_modules/], policy: pull}

.frontend_cache:
  cache: {key: frontend_npm, paths: [apps/frontend/node_modules/], policy: pull}
```

### Rule 15: Cache Policies
- **MUST** use `policy: pull` for jobs that consume cache (test, lint, build).
- **MUST** use `policy: pull-push` for jobs that update cache (install, code generation).

```yaml
backend_install:
  cache: {key: backend_npm, paths: [node_modules/], policy: pull-push}

backend_test:
  cache: {key: backend_npm, paths: [node_modules/], policy: pull}
```

---

## Deployment-Specific Rules

### Rule 16: Explicit Environment Assignment
- **MUST** set `environment: {name, url, deployment_tier}` for all deployment jobs.
- Names: `development`, `staging`, `production` (lowercase).

```yaml
deploy_staging:
  environment: {name: staging, url: https://staging.example.com, deployment_tier: staging}
  script: [./deploy.sh staging]

deploy_production:
  environment: {name: production, url: https://example.com, deployment_tier: production}
  script: [./deploy.sh production]
```

### Rule 17: Protected Environment Rules
- **MUST** configure protected environments: main branch only deploys to `production`.
- **MUST** require approvals for production.
- **MUST** set `when: manual` for production jobs.

```yaml
deploy_production:
  environment: {name: production, auto_stop_in: never}
  when: manual
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
  script: [./deploy.sh production]
```

### Rule 18: Environment Auto-Stop
- **MUST** set `auto_stop_in` for ephemeral environments (review: `7 days`, staging: `1 week`).
- **PROHIBITED** for production (use `never`).

```yaml
deploy_review:
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    auto_stop_in: 7 days
    url: https://review-$CI_MERGE_REQUEST_IID.example.com
```

### Rule 19: Masked and Protected Variables
- **MUST** configure sensitive variables as `masked: true` and `protected: true`.
- Sensitive types: passwords, API keys, tokens, encryption keys.
- Configure in Settings > CI/CD > Variables.

### Rule 20: Deployment Credentials Rotation
- **MUST** rotate deployment tokens every 90 days.
- **MUST** use temporary tokens (single pipeline run if possible).
- **PROHIBITED**: Long-lived static credentials.

```yaml
deploy_job:
  before_script:
    - export INTERNAL_TOKEN="$CI_JOB_TOKEN"
    - export API_TOKEN=$(./request_temp_token.sh "$DEPLOY_KEY")
```

---

## Monorepo Domain Separation

### Rule 21: Job Naming Convention
- **MUST** follow: `[domain]_[stage]_[purpose]`.
- Domain: `backend`, `frontend`, `infra`. Stage: `lint`, `build`, `test`, `deploy`, `release`.
- Examples: `backend_test_unit`, `frontend_build_vite`, `infra_validate_terraform`.

### Rule 22: Path-Based Job Filtering
- **MUST** use `only: changes:` to run jobs only when domain files change.
- Backend: `apps/backend/**/*`, `packages/{contracts,types}/**/*`.
- Frontend: `apps/frontend/**/*`, `packages/{contracts,types}/**/*`.
- Infra: `infra/**/*`, `packages/terraform/**/*`.

```yaml
backend_test:
  only:
    changes: [apps/backend/**/*, packages/contracts/**/*]
  script: [npm run test:backend]
```

### Rule 23: Domain-Specific Cache Keys
- **MUST** use separate cache keys per domain: `backend_npm`, `frontend_npm`, `infra_terraform`.
- **PROHIBITED**: Shared cache keys across domains.

```yaml
.backend_cache:
  cache: {key: backend_npm_$CI_COMMIT_REF_SLUG, paths: [apps/backend/node_modules/]}

.frontend_cache:
  cache: {key: frontend_npm_$CI_COMMIT_REF_SLUG, paths: [apps/frontend/node_modules/]}
```

### Rule 24: Domain-Specific Templates
- **MUST** define templates per domain: `.backend_job`, `.frontend_job`, `.infra_job`.
- Templates encapsulate `image`, `cache`, `before_script`, `only: changes:`.

```yaml
.backend_job:
  image: node:18
  extends: .backend_cache
  only:
    changes: [apps/backend/**/*]
  before_script: [cd apps/backend, npm ci]

backend_lint:
  extends: .backend_job
  script: [npm run lint]
```

---

## Prohibited Patterns

| Pattern | Replacement | Reason |
|---------|-------------|--------|
| `only: [branches]` | `rules: if:` | Deprecated syntax |
| `except: [tags]` | `rules: when: never` | Deprecated syntax |
| `allow_failure: true` | Document tolerance in comments | Masks failures |
| Cross-domain `needs:` | Use contracts/APIs | Violates domain isolation |
| Hardcoded credentials | Masked CI/CD variables | Security breach |
| Wildcard paths: `**` | Specific paths | Bloats storage |
| Shared cache keys | Domain-specific keys | Cache poisoning |
| `retry: max: 3+` | Max 2 retries | Hides systematic failures |
| `timeout: infinite` | Explicit timeout | Hung jobs |
| `expire_in: 365 days` | `7 days` or `never` | Storage bloat |

---

## Validation & Safety

### Rule 25: Pipeline Validation
- All `.gitlab-ci.yml` changes **MUST** pass lint validation (syntax + schema).
- Use `ci_lint` API or `gitlab-runner verify` locally before push.

### Rule 26: Branch Protection
- **main**: Require MR approval + passing pipeline.
- **staging**: Require MR approval.
- Configure in Settings > Protected Branches.

### Rule 27: Test Coverage Gates
- **Backend**: >= 80% coverage. **Frontend**: >= 70% component coverage.
- **Infra**: `terraform validate` + `terraform plan` review before apply.
