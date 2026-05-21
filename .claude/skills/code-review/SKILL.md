---
name: code-review
description: Run the project's mandatory code-review checklist against the source code of a given screen (ACSMS-SCR-XXX). Side selector (BE / FE / both — default both) scopes the review. Produces an inline OK/NOK/NA table with file:line evidence and suggested diffs for each NOK. Does NOT apply fixes — review only.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX [BE|FE]"
---

# Code Review Checklist Skill

## Description

Evaluates the source code generated for a screen (`ACSMS-SCR-XXX`) against the project's mandatory code-review checklist. The optional second argument scopes the review to one side (`BE` or `FE`); omitted = review both sides. Output is an inline markdown report with `OK` / `NOK` / `NA` per item; each `NOK` row carries file:line evidence + a suggested diff (NOT applied).

## Arguments

`$ARGUMENTS` is a space-separated string with up to two tokens:

| Position | Required | Values | Meaning |
|---|---|---|---|
| 1 | yes | `ACSMS-SCR-XXX` (3-digit) | The screen to review. Folder lookup at `docs/design/<scr>/`. |
| 2 | no | `BE` / `FE` / `BOTH` / unset | Which side to review. Case-insensitive. Default when omitted: `BOTH`. |

### Invocation examples

| User input | Effective scope |
|---|---|
| `/code-review ACSMS-SCR-027` | Both BE + FE (default) |
| `/code-review ACSMS-SCR-027 BE` | Backend only |
| `/code-review ACSMS-SCR-027 FE` | Frontend only |
| `/code-review ACSMS-SCR-027 be` | Backend only (case-insensitive) |
| `/code-review ACSMS-SCR-027 BOTH` | Both BE + FE (explicit) |

### Argument-parsing rules

1. Tokenize `$ARGUMENTS` by whitespace. First token = SCR ID. Second token (if present) = side selector.
2. Normalize the side token to uppercase. Accept `BE`, `FE`, `BOTH` (or `ALL` as alias). Anything else (e.g. `backend`, `front`, `b`, `f`) → reject with:
   > Invalid side selector `<token>`. Expected `BE`, `FE`, or `BOTH`. Example: `/code-review ACSMS-SCR-027 BE`.
3. If the SCR folder doesn't exist (`docs/design/<scr>/` missing), abort:
   > Screen `<scr>` not found at `docs/design/<scr>/`. Check the SCR ID — folder convention is `ACSMS-SCR-XXX` (3-digit, no leading zeros beyond that).
4. If side is `BE` and no backend module exists for the resolved domain, abort:
   > No backend source found for `<scr>` (domain `<domain>`, expected at `apps/backend/src/modules/<domain>/`). Run `/gen-code-backend <scr>` first, or use `/code-review <scr> FE` if only the frontend exists.
5. Same for `FE` and `BOTH` — abort if the relevant side has zero source files.

## When to use

- After `/gen-code-backend` + `/gen-code-frontend` complete for a screen, before opening MR → `BOTH` (default)
- Pre-merge audit when only backend was touched in this branch → `BE`
- Pre-merge audit when only frontend was touched in this branch → `FE`
- Mid-development sanity check after `/gen-code-backend` while `/gen-code-frontend` hasn't run yet → `BE`

NOT for: full-repo audit (use `/review` or `/security-review`), single-file review (use plain prompt), or applying fixes (this skill is read-only).

## Process

### 1. Parse arguments + resolve screen scope

Parse `$ARGUMENTS` per §Argument-parsing rules above. Identify:
- **`<scr>`** — e.g. `ACSMS-SCR-027`
- **`<side>`** — `BE` / `FE` / `BOTH`

Identify the `<domain>` by reading the screen's api doc front matter (`docs/design/<scr>/<scr>-api.md`) — it lists endpoints under `/api/v1/<domain>/...`. If api.md missing, fall back to reading `docs/design/<scr>/screen-design.md` or grepping for the SCR ID across `apps/backend/src` and `apps/frontend/src` to locate the module.

Discover the file set conditionally on `<side>`:

**Backend** (only when `<side> ∈ {BE, BOTH}`) — search by screen identifier in comments + by domain folder:
- `apps/backend/src/modules/<domain>/**/*.ts` — controller, service, module, DTOs, exceptions, mapper, constants
- `apps/backend/src/database/entities/<entity>.entity.ts` — entity(s) the module CRUDs
- `apps/backend/src/database/migrations/*<SCR-keyword>*` — related migration(s)
- `apps/backend/src/modules/<domain>/__tests__/**/*.spec.ts` + `test/integration/<domain>*.spec.ts` — specs (used for cross-reference, NOT reviewed)

**Frontend** (only when `<side> ∈ {FE, BOTH}`):
- `apps/frontend/src/views/<domain>/**/*.vue` + sibling `.ts`
- `apps/frontend/src/stores/<domain>.store.ts` (if exists)
- `apps/frontend/src/api/<domain>/<domain>.ts` (Orval-generated — review usage only, not the generated file itself)
- `apps/frontend/src/views/<domain>/__tests__/**/*.spec.ts` (cross-reference only)
- Router entry in `apps/frontend/src/router/index.ts` (for the screen's routes only)

If the chosen side yields zero source files, abort per §Argument-parsing rules #4-5.

### 2. Read the rules

Load (skim — only what's needed per check item):
- `.claude/rules/nestjs.md` (for BE checks)
- `.claude/rules/vue.md` (for FE checks)
- `.claude/rules/security.md` (for §2.x)
- `.claude/rules/naming-conventions.md` (for §1.1, §4.x naming items)
- `.claude/rules/testing.md` (coverage context only, NOT in checklist)

### 3. Run automated pre-checks (scoped to `<side>`)

Run these in parallel, capture output. **Skip the BE block when `<side>=FE`; skip the FE block when `<side>=BE`.** The hardcode + message scans narrow their paths to the active side too.

#### Environment — Docker-based dev stack

`node` / `tsc` / `vue-tsc` / `eslint` are NOT installed on the host. The project runs the dev stack via `apps/docker-compose.yml`; binaries live inside the long-running containers. Always run via `docker exec`.

| Container | Image | Workdir | Tool source |
|---|---|---|---|
| `agrinews-backend-1` | `agrinews-backend` (node:22-alpine) | `/app` (= `apps/backend`) | `node_modules/.bin/` |
| `agrinews-frontend-1` | `agrinews-frontend` (vite) | `/app` (= `apps/frontend`) | `node_modules/.bin/` |
| `agrinews-postgres-1` | `postgres:18-alpine` | — | for ad-hoc `psql` |
| `agrinews-redis-1` | `redis:7-alpine` | — | for ad-hoc `redis-cli` |

Pre-check that the dev stack is up before running tool commands:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "agrinews-(backend|frontend)"
```

If a container is missing or `Exited`, fall back to `grep`-only checks and note the limitation in the report's evidence column ("tsc/lint not run — container down"). NEVER attempt to install node on the host or modify the container; the review is read-only.

#### Backend pre-checks (when `<side> ∈ {BE, BOTH}`)

```bash
# Type-check (no output = clean)
docker exec agrinews-backend-1 npx tsc --noEmit -p . 2>&1 | head -50

# Lint — eslint binary may not be on PATH; invoke via local bin
docker exec agrinews-backend-1 sh -c \
  'node_modules/.bin/eslint "src/modules/<domain>/**/*.ts" 2>&1' | head -50

# Optional: run the module's test suite (cross-reference only, NOT part of the checklist)
docker exec agrinews-backend-1 npx jest src/modules/<domain> --silent 2>&1 | tail -15

# Host-side greps still work — they read source files directly off the volume mount.
grep -rnE "(===|!==|==|!=)\s*[0-9]+" apps/backend/src/modules/<domain> \
  --include='*.ts' \
  | grep -v '\.spec\.ts'

grep -rnE "['\"][^'\"]*[ぁ-んァ-ヶー一-龯][^'\"]*['\"]" apps/backend/src/modules/<domain> \
  --include='*.ts' \
  | grep -v 'common/constants/messages' \
  | grep -v '\.spec\.ts' \
  | grep -v 'exceptions/'

grep -rn "process\.env\." apps/backend/src/modules/<domain> --include='*.ts'

grep -L "@Permissions\|@UseGuards" apps/backend/src/modules/<domain>/*.controller.ts
```

#### Frontend pre-checks (when `<side> ∈ {FE, BOTH}`)

```bash
# Type-check Vue + TS (no output = clean)
docker exec agrinews-frontend-1 npx vue-tsc --noEmit 2>&1 | head -50

# Lint — eslint via local bin
docker exec agrinews-frontend-1 sh -c \
  'node_modules/.bin/eslint "src/views/<domain>/**/*.{ts,vue}" 2>&1' | head -50

# Optional: run the module's vitest suite
docker exec agrinews-frontend-1 npx vitest run src/views/<domain> 2>&1 | tail -15

# Host-side greps (volume-mounted source).
grep -rnE "(===|!==|==|!=)\s*[0-9]+" apps/frontend/src/views/<domain> \
  --include='*.ts' --include='*.vue' \
  | grep -v '__tests__'

grep -rnE "['\"][^'\"]*[ぁ-んァ-ヶー一-龯][^'\"]*['\"]" apps/frontend/src/views/<domain> \
  --include='*.ts' --include='*.vue' \
  | grep -v 'constants/messages' \
  | grep -v '__tests__'

grep -rnE "localStorage\.(setItem|getItem)" apps/frontend/src/views/<domain> \
  --include='*.ts' --include='*.vue'

grep -rn "console\." apps/frontend/src/views/<domain> \
  --include='*.ts' --include='*.vue' \
  | grep -v '__tests__'
```

#### Rules for tool invocation

1. **Never `cd` into `apps/backend` or `apps/frontend` on the host** to run `npx tsc` / `npx vue-tsc` directly — the host has no `node`, the npx network install fails or produces the wrong major version (ESLint 10 ↔ 9 config mismatch). Always go through `docker exec`.
2. **No output from `tsc` / `vue-tsc` = pass.** Treat exit-code 0 + empty stdout as clean. Note "verified clean via `docker exec ... npx tsc --noEmit`" in evidence cells.
3. **Lint binary fallback chain**: try `node_modules/.bin/eslint` (most reliable); if missing, the project's `npm run lint` is broken and lint isn't enforced — note this as a follow-up infra issue, do NOT block the review on it.
4. **Tests are diagnostics, not part of the 42-item checklist.** Use `docker exec ... jest|vitest` to sanity-check the module compiles + behaves, but their pass/fail does not appear as a checklist row (test quality is the contract of `/gen-ut-*`, not `/code-review`).
5. **Don't start/stop containers**: if `agrinews-backend-1` is down, surface the limitation in the report and proceed with grep-only checks. Bringing the stack up is the user's call.

### 4. Evaluate each checklist item

For each row in the table below, determine `OK` / `NOK` / `NA`:

- **OK** — verified pass (cite file:line or "verified via <command>")
- **NOK** — concrete violation found (cite file:line + 1-line evidence)
- **NA** — item doesn't apply to this screen (explain why in 1 phrase)

When `NOK`, attach a suggested diff in a `diff` code block immediately after the row. Do NOT apply it.

### 5. Produce output

ONE inline markdown table per checklist section (1-4 + the 2 new rules). Schema:

| # | Check Item | Status | Evidence / Reason | Severity |
|---|---|---|---|---|

Then for each `NOK` row, a suggested-diff block:

```markdown
**NOK 1.3.a — magic number in branching**

`apps/backend/src/modules/oshirase/oshirase.service.ts:84`

```ts
if (record.status === 2) {  // magic number
```

Suggested fix:
```diff
- if (record.status === 2) {
+ if (record.status === OshiraseStatus.PUBLIC) {
```
(Import: `import { OshiraseStatus } from '@/common/enums';`)
```

End with a summary block:

```
Summary — $ARGUMENTS
  OK:  X items
  NOK: Y items (🔴 Z block, 🟡 A major, 🟢 B minor)
  NA:  C items
  Verdict: [Pass | Acceptable | Review Again]
```

Verdict rule:
- **Pass**: 0 🔴, 0 🟡, NOK count ≤ 3 (all 🟢)
- **Acceptable**: 0 🔴, ≤ 2 🟡
- **Review Again**: any 🔴 OR > 2 🟡

## Checklist (mandatory items)

### §1 Format

| # | Item | Severity if NOK | What to check (BE / FE) |
|---|---|---|---|
| 1.1 | Coding convention | 🟡 Major | `tsc --noEmit` + `lint` clean. BE: kebab-file + PascalClass+suffix + camelCase method. FE: PascalComponent.vue + `<script setup>` (no Options API). |
| 1.2 | Meaningful names | 🟡 Major | No `data` / `result` / `temp` / `x` / `handle` orphan names. Boolean: `is*`/`has*`/`can*`. Domain term in JP/romaji preserved (`tanka`, `dokusya`). |
| 1.3 | No hardcode (general) | 🔴 Block / 🟡 Major | See §1.3.a + §1.3.b below. Block when business-critical (permission, status transition); Major otherwise. |
| **1.3.a** | **No magic number in branching** | 🔴 Block in critical / 🟡 elsewhere | BE: `=== 1` / `=== 'X'` in `if`/`switch`/`where` MUST reference enum constant from `@/common/enums` (Group A) or `codeService.has('CATEGORY', v)` (Group B). FE: same, via `@/constants/enums`. Exceptions: HTTP status, pagination defaults, math `0/1/-1`, test data, array index. |
| **1.3.b** | **No inline Japanese message (≥2 uses)** | 🟡 Major / 🟢 Minor first-time | Reusable messages MUST live in `@/common/constants/messages` (BE) or `@/constants/messages` (FE). Module-specific: `<domain>.constants.ts`. Success toasts MUST use `useNotify().created/updated/deleted()` (FE) / `SUCCESS_MESSAGES.*` (BE). Single-use literal allowed when <30 chars + context-clear (button label, screen-design literal). |
| 1.4 | No duplication | 🟡 Major | Pattern repeated ≥3 times → extract. BE common helpers (`paginate`, `buildAuditCtx`, `assertJaScope`, `fetchFkInJa`, `assertNoRelatedRows`) MUST be used. FE common components (`BaseCard`, `BaseDataTable`, `BaseSearchForm`, `BaseActionColumn`, `BaseConfirmModal`, `BaseFormFooter`, `BaseCodeSelect`) MUST be used. |
| 1.5 | Complex logic commented (WHY) | 🟢 Minor | Workaround/non-obvious decision has 1-line comment explaining reason. NO comments explaining WHAT (code self-documents). |
| 1.6 | Comments accurate + current | 🟢 Minor | No stale `// TODO: fix later`, no `// changed by X on Y`, no comments referencing renamed symbols. |
| 1.7 | Operation purpose | 🟢 Minor | Public service methods + every controller endpoint has JSDoc or `@ApiOperation`. |
| 1.8 | Other facts commented | 🟢 Minor | Edge cases, transaction boundaries, security layer reasoning has 1-line note. |
| 1.9 | Class/function header | NA | Project convention: NO file-level header. Skip. |

### §2 Security

| # | Item | Severity if NOK | What to check |
|---|---|---|---|
| 2.1 | SQL injection protected | 🔴 Block | BE: 100% queries parameterized (`.where('x = :x', { x })`). Zero `repo.query(\`... ${var} ...\`)`. |
| 2.2 | Session/auth correct | 🔴 Block | BE: all endpoints (except `/auth/login`, `/auth/forgot-password`, `/health`, `/codes`) have `@UseGuards(SessionAuthGuard, PermissionsGuard)`. Cookie `HttpOnly + Secure(prod) + SameSite=Strict`. |
| 2.3 | Access control sufficient | 🔴 Block | BE: every endpoint has `@Permissions('model.action')`. List query: `applyJaScope` / `applyBranchScope`. Single record: `assertJaScope` / `assertBranchScope` after fetch. FK body: `fetchFkInJa`. Update: `filterAllowedFields`. FE: router `meta.permission` + button `:disabled="!hasPermission"` + form field `:disabled="isRestrictedEditor"`. |
| 2.4 | Security config | 🟡 Major | BE: `helmet()` + CORS origin from env + rate limit (auth 5/min, public 100/min). |
| 2.5 | No sensitive data exposure | 🔴 Block | No log of password / session_id / OTP / reset token / full email / credit card. Response DTO has no `password`/`passwordHash`/`sessionId`/`otpCode`. |
| 2.6 | Attack protection | 🔴 Block | FE: no `v-html` with user content (or wrapped with `DOMPurify.sanitize`). BE: `forbidNonWhitelisted: true`. |
| 2.7 | No under-protected API | 🔴 Block | No endpoint without `@Permissions` decorator (when authentication required). |
| 2.8 | Validate input/output | 🟡 Major | BE: every DTO field has `@ApiProperty` + class-validator with Japanese `message`. `@IsOptional` paired with `@Transform(blankToUndef)` for optional strings. FE: `validateClient(form)` mirrors BE rule. Kana fields use `@/utils/kana`. Required strings use `form.x?.trim()` (optional chaining for antd `allow-clear`). |
| 2.9 | Store data securely | 🔴 Block | Password: `bcrypt.hash(pwd, 10)`. OTP/reset-token: bcrypt hash in DB. File: S3 not local disk. |
| 2.10 | No hardcoded credentials | 🔴 Block | 100% secrets via `configService.get('xxx')`. `grep "process\\.env\\." apps/backend/src/modules/<domain>` zero hit (except CLI/data-source). |

### §3 Third party

| # | Item | Severity if NOK | What to check |
|---|---|---|---|
| 3.1 | New dep approval | 🟡 Major | `package.json` diff in PR — every new dep has PM approval note (or pre-approved list). |
| 3.2 | License compliance | 🟡 Major | No GPL/AGPL deps. MIT/Apache-2.0/BSD only. |

### §4 Source code

| # | Item | Severity if NOK | What to check |
|---|---|---|---|
| 4.1 | Meaningful method name | 🟡 Major | Verb-first: `findById`, `assertScope`, `logCreate`. No `do()` / `process()` / `handle()` orphan. FE composable: `use*` prefix. |
| 4.2 | Descriptive parameters | 🟢 Minor | No `(a, b, c)`. Boolean prefer option-object over positional. |
| 4.3 | Happy path distinguishable | 🟢 Minor | Service method: guards (throw) at top, happy return at bottom. No deeply-nested else branches for happy case. |
| 4.4 | Operation not too long | 🟢 Minor | Service method ≤ 50 lines. Component template ≤ 200 lines. |
| 4.5 | Decision points limited | 🟢 Minor | Cyclomatic complexity ≤ 10. Nesting ≤ 3 levels. |
| 4.6 | Variables well-named | 🟢 Minor | No `obj` / `arr` / `temp`. Loop var named (`for (const dokusya of ...)`). |
| 4.7-4.9 | Block descriptions | 🟢 Minor | ≥20-line block has 1-line WHY comment. Complex regex has match/no-match example. |
| 4.10 | Indentation | 🟡 Major | 2 spaces. Method-chain dot-aligned. |
| 4.11 | One command per line | 🟡 Major | No `a(); b();` same line. |
| 4.12 | Line breaks for long lines | 🟢 Minor | Max 100 chars. Long signature: 1 param per line. |
| 4.13 | Continuation line indent | 🟢 Minor | Chained calls indented 1 level. |
| 4.14 | Variable ≠ object/class name | 🟢 Minor | No `const User = ...` when `import { User }` exists. |
| 4.15-4.17 | Function naming consistency | 🟢 Minor | Repo: `findById/findAll/save`. Service: `findById/create/update/remove`. Mapper: `toXxxResponse`. Validator: `assertXxx`/`validateXxx`. |
| 4.18 | Object naming standard | 🟢 Minor | Pinia: `useXxxStore`. Entity: PascalCase singular. DTO: `CreateXxxDto`/`UpdateXxxDto`/`XxxResponseDto`. |
| 4.19-4.20 | Folder structure | 🟡 Major | Matches `project-structure.md`. BE: `src/modules/<domain>/`. FE: `src/views/<domain>/`. Entity at `src/database/entities/`. |
| 4.21 | No redundant lines | 🟡 Major | No commented-out code. No `console.log` left. No unused imports. No unused variables (`noUnusedLocals: true`). No dead functions. |

## Output template (MANDATORY — produce in this exact shape)

The skill MUST emit a Vietnamese-language report with two halves:

1. **Per-item detail** — §1-§4 sections, each containing a markdown table with columns `# | Check Item | Status | 1-line Evidence | Severity`. Each section ends with a **Section score** line: `**Section N score**: X OK / Y NOK / Z NA — <state>`. The state line gives one-sentence judgment + which items to fix.
2. **Summary chi tiết** — full debrief broken into 7 subsections (specified below). NEVER produce a 4-line summary; the user explicitly asks for the long form.

After both halves, the **Suggested diffs** block lists each NOK with a compileable diff.

### Skeleton (fill in placeholders, keep section headings + Vietnamese phrasing verbatim)

```markdown
# Báo cáo Code Review — <scr> (<screen Japanese name>) — <Bản chi tiết Summary | Backend only | Frontend only>

**Scope**: <BE | FE | BE + FE>

## Files reviewed

(Render only the side(s) being reviewed. Omit the unused side completely — do not list "Frontend: skipped" or similar.)

**Backend** (N source files):  ← only when <side> ∈ {BE, BOTH}
- [`<path>`](<path>) — <1-line role>
- …

**Frontend** (M source files):  ← only when <side> ∈ {FE, BOTH}
- [`<path>`](<path>) — <1-line role>
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L<line>) (entries L<start>-L<end>)

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK / ❌ NOK / ⚪ NA | <evidence with file:line if NOK> | 🟡 Major / 🟢 Minor / 🔴 Block / — |
| 1.2 | Meaningful naming | … | … | … |
| 1.3 | Avoid all hardcode | … | <call out 1.3.a magic-number AND 1.3.b message-inline findings separately inside this single 1.3 row> | … |
| 1.4 | No duplication | … | … | … |
| 1.5 | Complex logic commented | … | … | … |
| 1.6 | Comments accurate & up-to-date | … | … | … |
| 1.7 | Operation purpose commented | … | … | … |
| 1.8 | Other relevant facts commented | … | … | … |
| 1.9 | Correct header comments on class/function | … | … | … |

**Section 1 score**: X OK / Y NOK / Z NA — <state>

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | … | … | … |
| 2.2 | Authentication & Session management | … | … | … |
| 2.3 | Access Control sufficient | … | … | … |
| 2.4 | Security Configuration | … | … | … |
| 2.5 | No sensitive data exposure | … | … | … |
| 2.6 | Attack Protection | … | … | … |
| 2.7 | No under-protected APIs | … | … | … |
| 2.8 | Validate input and output | … | … | … |
| 2.9 | Store data securely | … | … | … |
| 2.10 | No hardcoded credentials | … | … | … |

**Section 2 score**: X OK / Y NOK / Z NA — <state>

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | … | … | … |
| 3.2 | License agreements respected | … | … | … |

**Section 3 score**: X OK / Y NOK / Z NA — <state>

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | … | … | … |
| 4.2 | Descriptive parameter names | … | … | … |
| 4.3 | Normal path distinguishable | … | … | … |
| 4.4 | Operation not too long (extract private) | … | … | … |
| 4.5 | Decision points limited | … | … | … |
| 4.6 | Variables well named | … | … | … |
| 4.7 | General description for code paragraphs | … | … | … |
| 4.8 | Description of changes | … | … | … |
| 4.9 | Complicated paragraphs have explanation | … | … | … |
| 4.10 | Structural code paragraph indented | … | … | … |
| 4.11 | One command per line | … | … | … |
| 4.12 | Break sign for long lines | … | … | … |
| 4.13 | Continuation line indent | … | … | … |
| 4.14 | Variable ≠ object/class name | … | … | … |
| 4.15 | Functions named in common way | … | … | … |
| 4.16 | Global vs local function differentiated | … | … | … |
| 4.17 | Function name has meaning | … | … | … |
| 4.18 | Object naming standard-compliant | … | … | … |
| 4.19 | Folder/library naming per design doc | … | … | … |
| 4.20 | Folder content conforms standard | … | … | … |
| 4.21 | No redundant/unused lines | … | … | … |

**Section 4 score**: X OK / Y NOK / Z NA — <state>

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | … | … | … | …% |
| 2. Security | 10 | … | … | … | …% |
| 3. Third party | 2 | … | … | … | …% |
| 4. Source code | 21 | … | … | … | …% |
| **Total** | **42** | **…** | **…** | **…** | **…%** |

### Phân bổ severity <N> NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | … | <item numbers or "—"> |
| 🟡 Major | … | <item numbers + 1-word tag, e.g. "1.3 (hardcode message), 2.5 (console.log expose)"> |
| 🟢 Minor | … | <item numbers + 1-word tag> |

### Đánh giá theo nhóm tiêu chí

(Group the 42 items into ~7-8 thematic buckets. The buckets below are the canonical set — adjust ONLY if a screen has so few violations in one bucket that merging is clearer. Each row gives the bucket's items, its status icon, and a 1-line note.)

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | <✅/🟡/❌> (X/10 OK) | <1-line> |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | <…> | <1-line> |
| **Hardcode & Duplication** (1.3, 1.4) | <…> | <1-line> |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | <…> | <1-line> |
| **Sensitive Data Handling** (2.5, 2.9) | <…> | <1-line> |
| **Code Length & Complexity** (4.4, 4.5) | <…> | <1-line> |
| **Code Hygiene** (4.10-4.13, 4.21) | <…> | <1-line> |
| **Third Party** (3.1-3.2) | <…> | <1-line> |

### Strength (điểm mạnh đáng ghi nhận)

(3-5 numbered bullets. Cite file:line. Focus on patterns the screen got RIGHT that future screens should copy — audit-log discipline, defensive coding, justified deviations with reference docs, intentional security hardening, clear labeled-block comments. Avoid generic praise like "code is clean".)

1. **<short title>**: <concrete observation with file:line + why it matters>.
2. …

### Weakness (điểm cần cải thiện)

(2-4 numbered bullets. Each one explains WHAT the symptom is + the SYSTEMIC cause it hints at. Not duplicates of action items — these are about root cause patterns.)

1. **<short title>**: <1-2 sentences linking the symptom to a process gap, e.g. "pre-commit hook chưa check console.log", "message centralization chưa adopt", "method length sẽ phình thêm khi requirement mở rộng">.
2. …

### Verdict cuối

- [ ] Pass
- [ ] Review Again ← <select this if any 🔴 OR > 2 🟡>
- [ ] Acceptable ← <select this if 0 🔴 AND ≤ 2 🟡>

(Place `[x]` next to exactly one option per the rule above.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | <emoji> | `<file>:<line>` | <e.g. "2.5 + 4.21"> | <concrete verb-first action> | <X phút> |
| 2 | … | … | … | … | … |

**Tổng effort dự kiến để chuyển từ "<current verdict>" → "Pass"**: ~<X> phút (item #1-#<N>); item #<M> optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

(For each NOK row from the per-item tables, produce one block. Group cross-module diffs under a single NOK if the same root cause produces multiple sites.)

### NOK <item#> #<sub#> — <short title>

Hiện trạng:
\```
<file:line>
<file:line>
…
\```

\```ts
// optional: paste the offending lines for context
\```

Suggested fix:
\```diff
- <removed>
+ <added>
\```

(Optional: explanation of WHY this fix, with rule reference like `.claude/rules/security.md §Layer 4`.)
```

### Formatting requirements (non-negotiable)

- **Language**: Vietnamese narrative, Japanese literals preserved as-is in evidence cells.
- **Status emoji**: `✅ OK` / `❌ NOK` / `⚪ NA` — always with emoji prefix.
- **Severity emoji**: `🔴 Block` / `🟡 Major` / `🟢 Minor` / `—` (for OK/NA). Always with emoji prefix.
- **File links**: render as `[`path`](path#L<line>)` markdown link, NOT bare path.
- **NEVER omit a checklist row** even if status is OK and evidence is `—`. The reviewer needs to see every item evaluated to trust the report.
- **NEVER fold §1.3.a and §1.3.b into separate table rows**. Both findings live INSIDE the single 1.3 row's evidence cell (the customer's checklist template only has rows 1.1-1.9 — sub-letters are an internal extension; the report must match the customer's numbering for export to Excel).
- **Severity per row reflects WORST finding inside that row**. So if 1.3 has a magic-number violation (Block) and a message-inline violation (Major), the 1.3 row's Severity column shows 🔴 Block.
- **Verdict ruleset** (apply mechanically):
  - Pass: 0 🔴, 0 🟡, NOK count ≤ 3 (all 🟢)
  - Acceptable: 0 🔴, ≤ 2 🟡
  - Review Again: any 🔴 OR > 2 🟡
- **Action items table** is the actionable distillation. Keep it ≤ 6 rows. Group related fixes into one row when they share a diff (e.g. "promote message to constant" covers 4 files in one row).
- **Effort estimate** is in minutes, realistic for one engineer: 1-line fix = 1 min, single-file refactor = 5-15 min, cross-file message migration = 20-40 min, multi-file refactor with helper extraction = 30-60 min.

## Rules for the reviewer

1. **Read-only**: NEVER call `Edit` / `Write` / `NotebookEdit`. Suggested diffs are inline-only.
2. **Evidence required**: every NOK MUST have file:line. No "looks bad" without citation.
3. **Distinguish severities**: don't tag everything 🔴. Use the column in §Checklist above as ground truth.
4. **NA is fine**: if a screen has no FK to another tenant, §Layer 4 FK check is `NA` — don't force-fit.
5. **Specs are not reviewed**: cross-reference `*.spec.ts` for expected behavior, but do not flag spec quality (specs are immutable contracts from `/gen-ut-*`).
6. **Generated code excluded**: `apps/frontend/src/api/generated/**` (Orval) is skipped — review usage at call sites only.
7. **Don't expand scope**: if the screen's BE was already merged and only FE changed, review FE-only — note in output that BE was skipped.
8. **Cite the rule**: when a NOK references a rule, link the file (`.claude/rules/security.md §Layer 4`).
9. **Be concrete in diffs**: every suggested diff must compile if applied. No `// fill this in` placeholders.
10. **Follow the Output template exactly**: every row of the customer's 42-item checklist (1.1-1.9, 2.1-2.10, 3.1-3.2, 4.1-4.21) MUST appear in the per-item tables — even OK rows with `—` evidence. Skipping rows breaks the Excel export.
11. **Long-form Summary is mandatory**: §Summary chi tiết must include all 7 subsections (Bảng số liệu, Phân bổ severity, Đánh giá theo nhóm tiêu chí, Strength, Weakness, Verdict cuối, Action items). NEVER collapse to a 4-line summary — the customer needs the long debrief for project reporting.
12. **Vietnamese narrative**: explanations, scores, and bucket notes are in Vietnamese. Only Japanese system literals (messages, screen names) are preserved verbatim in evidence cells.
13. **Bucketing in §Đánh giá theo nhóm tiêu chí**: use the 8 canonical buckets from the Output template (Architecture & Naming, Comments & Documentation, Hardcode & Duplication, Security & Auth, Sensitive Data Handling, Code Length & Complexity, Code Hygiene, Third Party). Adjust only when a bucket has zero items relevant to this screen.
14. **Strength + Weakness are distinct lenses**: Strength = patterns to copy in future screens (cite file:line). Weakness = root-cause / process-gap analysis, NOT a restatement of action items.
15. **Verdict is mechanical**: apply the ruleset (Pass / Acceptable / Review Again) by counting severities, not by intuition. If the count says Acceptable, mark Acceptable even when there are 0 NOK (which would be Pass) — re-read the ruleset.
16. **Side-scoped review honors the `<side>` argument strictly**:
    - When `<side>=BE`, evaluate every item against backend source ONLY. FE-specific items become `NA` with reason `Frontend not in scope (side=BE)`. Examples: §1.3.b FE component checks, §2.5 console.log on FE, §4.21 FE dead-code.
    - When `<side>=FE`, evaluate every item against frontend source ONLY. BE-specific items become `NA` with reason `Backend not in scope (side=FE)`. Examples: §2.1 SQL injection, §2.2 SessionAuthGuard, §2.3 DataScope helpers, §2.10 process.env.
    - When `<side>=BOTH`, evaluate items normally — both sides contribute evidence.
    - The Report title gains a `— Backend only` / `— Frontend only` suffix when side ≠ BOTH; the `**Scope**:` line below the title states the active side.
    - The Files reviewed section omits the unused side entirely.
    - The Action items table only lists items for the active side; do not include cross-module FE-message-extract diffs when `<side>=BE` (and vice versa) — note them as follow-up at the end if relevant.
17. **NA reason is required when side-scoping forces NA**: write `Frontend not in scope (side=BE)` or `Backend not in scope (side=FE)` in the Evidence column verbatim, so the report stays grep-able when consolidated across screens.

## Examples of NOK with evidence + diff

### Example 1 — Magic number (§1.3.a)

`apps/backend/src/modules/dokusya/dokusya.service.ts:127`
```ts
if (dokusya.shubetsu === 3) {
  // electronic subscriber branch
}
```

Diff:
```diff
+ import { DokusyaShubetsu } from '@/common/enums';
...
- if (dokusya.shubetsu === 3) {
+ if (dokusya.shubetsu === DokusyaShubetsu.ELECTRONIC) {
```

If `DokusyaShubetsu` doesn't exist yet (Group B category):
```diff
- if (dokusya.shubetsu === 3) {
+ if (!this.codeService.has('DOKUSYA_SHUBETSU', dokusya.shubetsu)) { ... }
+ // or via label lookup if branching on a known stable code
```

### Example 2 — Inline message duplicated (§1.3.b)

Found in 3 places:
- `apps/backend/src/modules/auth/auth.service.ts:88`
- `apps/backend/src/modules/auth/auth.service.ts:142`
- `apps/backend/src/modules/account/account.service.ts:67`

Each: `'再送信は5分後に可能です。時間をおいてから再度お試しください。'`

Diff:
```diff
// apps/backend/src/modules/auth/auth.constants.ts
+ export const AUTH_MESSAGES = {
+   PASSWORD_RESET_RATE_LIMIT: '再送信は5分後に可能です。時間をおいてから再度お試しください。',
+ } as const;

// auth.service.ts:88 (and :142, account.service.ts:67)
- throw new TooManyRequestsException('再送信は5分後に可能です。時間をおいてから再度お試しください。');
+ throw new TooManyRequestsException(AUTH_MESSAGES.PASSWORD_RESET_RATE_LIMIT);
```

### Example 3 — Missing DataScope on list query (§2.3)

`apps/backend/src/modules/dokusya/dokusya.service.ts:45`
```ts
async findAll(query: PaginationDto) {
  const qb = this.repo.createQueryBuilder('d');
  // missing applyBranchScope(qb, 'd', { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' }, session)
  return qb.take(query.per_page).skip(...).getManyAndCount();
}
```

Diff:
```diff
- async findAll(query: PaginationDto) {
+ async findAll(query: PaginationDto, session: SessionPayload) {
    const qb = this.repo.createQueryBuilder('d');
+   applyBranchScope(qb, 'd', { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' }, session);
    return qb.take(query.per_page).skip(...).getManyAndCount();
  }
```
Reference: `.claude/rules/security.md §Layer 2 — DataScope Filter`.

### Example 4 — Hardcoded button label on FE without convention (§1.3.b — single-use, OK)

`apps/frontend/src/views/dokusya/DokusyaListView.vue:42`
```vue
<a-button>新規登録</a-button>
```

Status: `OK` — single-use, ≤30 chars, standard button label. NOT a violation. Don't flag.

### Example 5 — Hardcoded validation message reused (§1.3.b — NOK)

`apps/frontend/src/views/dokusya/DokusyaFormView.vue:88` and `:113`:
```ts
errs.tel = '電話番号は半角数字のみで入力してください。';
errs.fax = '電話番号は半角数字のみで入力してください。';
```

Status: `NOK 🟡` — same message used twice in same file → extract.

Diff:
```diff
+ const PHONE_FORMAT_MSG = '電話番号は半角数字のみで入力してください。';
...
- errs.tel = '電話番号は半角数字のみで入力してください。';
+ errs.tel = PHONE_FORMAT_MSG;
...
- errs.fax = '電話番号は半角数字のみで入力してください。';
+ errs.fax = PHONE_FORMAT_MSG;
```

(If reused across files → promote to `@/constants/messages` → `VALIDATION_MESSAGES.PHONE_FORMAT`.)

---

## Final reminder

Output the inline table + diffs IN CHAT. Do not write a file. Do not apply edits. Do not run tests. End with the Summary block and Verdict.
