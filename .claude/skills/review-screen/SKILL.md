---
name: review-screen
description: Review backend + frontend implementation of a screen (ACSMS-SCR-XXX) against requirements, API design, security rules, coding conventions, and test coverage. Outputs a markdown report to docs/review/ACSMS-SCR-XXX-review.md.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Screen Review

## Description

Perform a thorough review of the backend **and** frontend implementation of a screen against:

- Functional requirements (screen-design.md)
- API contract (api.md)
- Security rules (security.md: RBAC, DataScope, field-level restrictions)
- NestJS coding conventions (nestjs.md)
- Vue 3 coding conventions (vue.md)
- Naming conventions (naming-conventions.md)
- Test coverage adequacy (testing.md)

Outputs a structured markdown report to:
```
docs/review/$ARGUMENTS-review.md
```

---

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-005`).

**Abort conditions (check in order):**

1. `docs/design/$ARGUMENTS/screen-design.md` missing → abort: `No screen-design.md found for $ARGUMENTS`.
2. `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` missing → warn in report: `api.md not found — API contract checks skipped`.

---

## Process

### Phase 1 — Gather Context

Read **all** of the following in parallel before starting the review.

**Requirement / design docs:**
- `docs/design/$ARGUMENTS/screen-design.md`
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` (if exists)
- `docs/design/$ARGUMENTS/index.html` (if exists)

**Database & seeder:**
- `docs/database/database-design.md` — table definitions referenced by the screen
- `docs/database/seeder.md §2–3` — permissions and roles

**Requirements:**
- `docs/requirement/account_concept.md` — permission matrix & DataScope rules

**Backend source** — identify the module name from screen-design.md, then read:
- `apps/backend/src/modules/<module>/<module>.controller.ts`
- `apps/backend/src/modules/<module>/<module>.service.ts`
- `apps/backend/src/modules/<module>/<module>.mapper.ts` (if exists)
- `apps/backend/src/modules/<module>/dto/` — all DTOs
- `apps/backend/src/modules/<module>/exceptions/` — all exceptions
- `apps/backend/src/modules/<module>/<module>.controller.spec.ts`
- `apps/backend/src/modules/<module>/<module>.service.spec.ts`
- `apps/backend/src/database/entities/<entity>.entity.ts` — entities used by this screen
- `apps/backend/src/common/utils/data-scope.ts` (if DataScope is expected)
- `apps/backend/src/common/utils/field-restrictions.ts` (if field-level restrictions expected)

**Frontend source** — identify view files from screen-design.md (list/form/detail), then read:
- `apps/frontend/src/views/<module>/<Screen>View.vue` — main view(s)
- `apps/frontend/src/views/<module>/__tests__/<Screen>View.spec.ts` — spec(s)
- Relevant store file(s) if used by this screen
- Router entries in `apps/frontend/src/router/index.ts` (the routes for this screen)

**Rules (skim for checklist items):**
- `.claude/rules/security.md`
- `.claude/rules/nestjs.md`
- `.claude/rules/vue.md`
- `.claude/rules/naming-conventions.md`
- `.claude/rules/testing.md`

---

### Phase 2 — Analyse

Evaluate each dimension below. Mark each item as:
- ✅ **Pass** — compliant
- ⚠️ **Warning** — minor issue / improvement suggestion
- ❌ **Fail** — non-compliant / bug / security risk

#### A. Functional Completeness (BE + FE)

Compare screen-design.md § 機能説明 and api.md endpoints against actual implementation:

| Check | Scope |
|---|---|
| All required API endpoints implemented | BE |
| All screen items / form fields rendered | FE |
| All list columns displayed with correct labels (via useCodesStore if m_code) | FE |
| Pagination / sort / filter working per spec | BE + FE |
| Empty-result message rendered outside table | FE |
| Create / Edit / Delete flows complete | BE + FE |
| Success toasts use `useNotify()` verbs (登録/更新/削除しました。) | FE |
| Error responses match api.md error table (error_code, HTTP status) | BE |

#### B. Security — RBAC & DataScope

| Check | Scope |
|---|---|
| `@UseGuards(SessionAuthGuard, PermissionsGuard)` on controller | BE |
| `@Permissions('model.action')` on every endpoint | BE |
| Permissions match seeder.md §3 permission list | BE |
| `applyJaScope` / `applyBranchScope` used for list queries | BE |
| `assertJaScope` / `assertBranchScope` called after single-record fetch | BE |
| DataScope throws `NotFoundException` (not `ForbiddenException`) on out-of-scope | BE |
| NICHINO_ADMIN / NICHINO_STAFF bypass scope correctly (ja_id == null) | BE |
| Router meta `permission: 'model.view'` set on route | FE |
| Nav guard bounces to dashboard on FORBIDDEN, not 403 page | FE |

#### C. Security — Field-Level Restrictions (if applicable)

| Check | Scope |
|---|---|
| `FIELD_RESTRICTIONS` constant defined in service | BE |
| `filterAllowedFields(dto, model, roleCode)` called in update path | BE |
| `pick*` helpers used to extract allowed values (not manual inline logic) | BE |
| `RESTRICTED_EDITOR_ROLES` defined in view | FE |
| `isRestrictedEditor` computed property guards `:disabled` bindings | FE |
| Both BE and FE allow-lists are in sync (same field names, same roles) | BE + FE |
| Disabled via `:disabled`, NOT hidden via `v-if` | FE |

#### D. Security — General

| Check | Scope |
|---|---|
| No secrets / credentials hardcoded | BE + FE |
| No `process.env` direct access (outside allowed exceptions) | BE |
| All env values via `ConfigService` | BE |
| No `v-html` with unsanitized content | FE |
| No token / session ID in `localStorage` / `sessionStorage` | FE |
| Response DTO never exposes password, session ID, OTP, reset token | BE |
| Sensitive fields excluded from audit log `beforeValue` / `afterValue` | BE |
| SQL parameterized queries only (no string concatenation) | BE |

#### E. NestJS Conventions

| Check | Scope |
|---|---|
| Entity lives in `src/database/entities/`, not module folder | BE |
| `TypeOrmModule.forFeature([Entity])` in owner module only | BE |
| Cross-module entity imported from `@/database/entities/` | BE |
| `@/` path alias used (no `../../` traversal) | BE |
| Controller: no business logic, delegates to service | BE |
| Service: business logic only, throws domain exceptions | BE |
| Domain exceptions extend `DomainException` (not raw `HttpException`) | BE |
| `paginate()` helper used for list response shape | BE |
| Main DML + audit log in single transaction | BE |
| Error log (`logType=3`) outside the transaction (catch block) | BE |
| `operation` field bare verb: `'CREATE'` / `'UPDATE'` / `'DELETE'` | BE |
| Success message body verb-only: `'登録しました。'` (no entity prefix) | BE |
| Nullable columns typed `string \| null` (not optional `?:`) | BE |
| TIMESTAMPTZ used for all timestamp columns | BE |
| `m_code` validated via `codeService.has(...)` not hardcoded | BE |

#### F. Vue 3 / Frontend Conventions

| Check | Scope |
|---|---|
| `<script setup lang="ts">` only (no Options API) | FE |
| All imports via `@/` alias (no `../..` traversal) | FE |
| Named routes only — no literal path strings in `router.push()` | FE |
| Route param `:id` (not `:<module>_id` on single-ID routes) | FE |
| Orval-generated API client used (no manual `fetch` / `axios`) | FE |
| `useCodesStore()` for ALL m_code dropdowns / radios / labels | FE |
| No hardcoded option labels for m_code categories | FE |
| `useTableQuery` composable for list screens | FE |
| `useApiForm` composable for form submit | FE |
| `useNotify()` for success toasts | FE |
| Error handling: no re-toast after HTTP error (interceptor already toasted) | FE |
| Empty message rendered OUTSIDE `<BaseDataTable>` | FE |
| `<BaseDataTable>` / `<BaseSearchForm>` / `<BaseActionColumn>` used | FE |
| `<BaseFormFooter>` primary action LEFT-aligned | FE |
| Required fields marked with `*` AFTER label in `text-error` color | FE |
| `preventEnterImplicitSubmit` on CRUD forms with 4+ fields | FE |
| `type="text"` on inputs (no HTML5 type validation) | FE |
| All system messages end with `「。」` | FE |
| Antd `Modal.confirm` for delete (not `BaseConfirmModal`) | FE |
| `okText: 'はい'` / `cancelText: 'いいえ'` on delete confirm dialogs | FE |
| Semantic design tokens used (no raw Tailwind palette classes) | FE |
| Breadcrumb configured on route meta (not inside view) | FE |
| Breadcrumb depth: List=2 levels, Create/Edit=3 levels (middle clickable) | FE |
| `onSearch` trims text filters before `applyFilters` | FE |
| Permission-aware buttons: `canCreate` / `canDelete` `:disabled` (not hidden) | FE |

#### G. Naming Conventions

| Check | Scope |
|---|---|
| Module files: `kebab-case.ts` | BE |
| Classes: PascalCase with correct suffix (Module/Controller/Service/Dto/Exception) | BE |
| DB table names: `snake_case` plural | DB |
| Column names: `snake_case` | DB |
| Vue view files: `PascalCase + View.vue` | FE |
| Composables: `camelCase` with `use` prefix | FE |
| Pinia stores: `camelCase + .store.ts` | FE |

#### H. Test Coverage

| Check | Scope |
|---|---|
| Service spec covers happy path (findAll, findById, create, update, delete) | BE |
| Service spec covers error paths (not found, duplicate, scope violation) | BE |
| Service spec covers DataScope filtering (rows filtered by jaId) | BE |
| Service spec covers field-restriction (disallowed field not saved) if applicable | BE |
| Controller spec covers routing, DTO validation, guard behaviour | BE |
| FE view spec covers: list renders, pagination, search, empty state | FE |
| FE view spec covers: delete confirm shown, API called, toast shown | FE |
| FE view spec covers: form submit → success toast → redirect | FE |
| FE view spec covers: server validation errors mapped to form fields | FE |
| FE view spec covers: field `:disabled` for restricted roles (if applicable) | FE |
| FE view spec covers: `preventEnterImplicitSubmit` on form | FE |

---

### Phase 3 — Write Report

Write the report to `docs/review/$ARGUMENTS-review.md`.

Report structure:

```markdown
# Review: $ARGUMENTS — <Screen Name>

**Date:** YYYY-MM-DD  
**Reviewer:** Claude (automated)  
**Status:** ✅ PASS | ⚠️ WARNINGS | ❌ FAIL

---

## Summary

| Dimension | Result | Issues |
|---|---|---|
| A. Functional Completeness | ✅/⚠️/❌ | N |
| B. RBAC & DataScope | ✅/⚠️/❌ | N |
| C. Field-Level Restrictions | ✅/⚠️/❌ | N |
| D. Security — General | ✅/⚠️/❌ | N |
| E. NestJS Conventions | ✅/⚠️/❌ | N |
| F. Vue 3 Conventions | ✅/⚠️/❌ | N |
| G. Naming Conventions | ✅/⚠️/❌ | N |
| H. Test Coverage | ✅/⚠️/❌ | N |
| **Overall** | ✅/⚠️/❌ | **N total** |

---

## Critical Issues (❌ Fail)

> _None_ or list below, ordered by severity.

### [Issue Title]

- **Location:** `apps/backend/src/modules/ja/ja.service.ts:42`
- **Severity:** ❌ Fail
- **Rule:** `security.md § Layer 2 — DataScope`
- **Problem:** <description of what is wrong>
- **Fix:**
  ```ts
  // suggested fix code
  ```

---

## Warnings (⚠️)

> _None_ or list below.

### [Warning Title]

- **Location:** `apps/frontend/src/views/ja/JaListView.vue:88`
- **Severity:** ⚠️ Warning
- **Rule:** `vue.md § Reusable Building Blocks`
- **Problem:** <description>
- **Suggestion:** <what to improve>

---

## Passed Checks (✅)

> Dimensions that are fully compliant — listed for completeness.

- **Functional Completeness:** All endpoints implemented and all screen items rendered.
- **RBAC & DataScope:** Guards applied correctly, scope filtering in place.
- ...

---

## Checklist Reference

<details>
<summary>Full checklist (click to expand)</summary>

### A. Functional Completeness
| Check | Result | Note |
|---|---|---|
| All required API endpoints implemented | ✅ | |
| ... | | |

### B. RBAC & DataScope
...

### H. Test Coverage
...

</details>
```

---

### Phase 4 — Register in CLAUDE.md (optional)

If the `docs/review/` directory did not exist before, add a row to the
**Key Documentation** table in `.claude/CLAUDE.md`:

```markdown
| Review Reports | `docs/review/` |
```

Only add this row once (check if it already exists first).

---

## Output

- `docs/review/$ARGUMENTS-review.md` — full review report
- Console summary: overall status (PASS / WARNINGS / FAIL) + count of ❌ fails and ⚠️ warnings
- If any ❌ Fail items: exit with a note `Fix critical issues before merging.`
- If only ⚠️ warnings: `Consider addressing warnings before merging.`
- If all ✅: `All checks passed.`
