---
name: gen-code-frontend
description: Generate Vue 3 frontend source (types / Pinia store / view) for a screen AFTER `/gen-ut-frontend` has produced failing specs. Reads spec files + screen-design.md + api.md (optional) and emits implementation that makes the specs go green. Last step removes the `@ts-nocheck` TDD banner once `tsc --noEmit` passes.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Frontend Source (TDD Green Phase)

## Description

Emit the Vue 3 source tree that satisfies the spec suite produced by `/gen-ut-frontend`. Tests are the contract; implementation must match their assertions. The skill is **one-shot** — it generates files and runs `tsc --noEmit`, but does NOT loop on vitest failures. The user runs `npm test` afterwards and iterates manually.

Pipeline position:

```
/gen-api-doc         ACSMS-SCR-XXX  →  api.md (spec — optional for FE-only screens)
/gen-ut-backend      ACSMS-SCR-XXX  →  backend *.spec.ts (failing — RED)
/gen-ut-frontend     ACSMS-SCR-XXX  →  frontend *.spec.ts (failing — RED)
/gen-code-backend    ACSMS-SCR-XXX  →  backend src/ (passing — GREEN)
/gen-code-frontend   ACSMS-SCR-XXX  →  frontend src/ (passing — GREEN)
```

The backend counterpart is `/gen-code-backend`; run it separately (order doesn't matter — the two produce disjoint file sets).

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Abort conditions (check in order, fail fast):**

1. Both `screen-design.md` AND `index.html` missing in `docs/design/$ARGUMENTS/` → abort listing expected paths.
2. No `apps/frontend/src/views/**/*.spec.ts` for the screen's module → abort: `Run /gen-ut-frontend $ARGUMENTS first`.
3. `mtime(screen-design.md) > mtime(any *.spec.ts)` OR (api.md exists AND `mtime(api.md) > mtime(spec)`) → abort: `screen-design.md / api.md newer than spec files — rerun /gen-ut-frontend $ARGUMENTS to refresh the contract`.

The Orval client is **auto-regenerated** in Phase 0 below — no manual
prerequisite check on `src/api/generated/`. If `npm run api:generate`
fails (e.g. missing `apps/frontend/swagger.json`), Phase 0 itself
aborts with a clear next step.

Use `stat -f %m <path>` (macOS) / `stat -c %Y <path>` (Linux) for timestamps.

## Process

### Phase 0 — Auto-regenerate Orval client

Run `npm run api:generate` in `apps/frontend/` BEFORE reading any spec
or generating any source. This guarantees `src/api/generated/**` is in
sync with the latest backend OpenAPI export, so the view code emitted
in Phase 3 can import freshly-typed API functions and the spec mocks
of those functions resolve without a "module not found" error.

Sequence:

1. Verify `apps/frontend/swagger.json` exists.
   - If missing, abort: `swagger.json missing. Run in apps/backend/: npm run swagger:export (after /gen-code-backend $ARGUMENTS).`
2. Run `cd apps/frontend && npm run api:generate` (timeout 120s).
   - On non-zero exit, abort: `npm run api:generate failed. Inspect orval output above; common cause is invalid swagger.json from the backend.`
3. On success, print: `✓ Orval client regenerated under apps/frontend/src/api/generated/`.

Skip Phase 0 ONLY for genuinely API-less screens — i.e. NO spec file
under `apps/frontend/src/views/<module>/__tests__/*.spec.ts` contains
either `vi.mock('@/api/...'` or an import from `@/api/`. Static
dashboards / 404 pages / tutorial views are typical examples. Detect
this by grepping the spec files; if every spec is API-mock-free, skip.

Re-running this skill is cheap: orval is idempotent and finishes in a
few seconds when the spec hasn't changed.



### Phase 1 — Read

(Phase 0 — Orval auto-regen — runs first; see above.)

Parallel reads:

**Spec (canonical contract):**
- `apps/frontend/src/views/<module>/__tests__/*.spec.ts`
- `apps/frontend/src/stores/__tests__/<module>.store.spec.ts` (if exists)
- `apps/frontend/test/fixtures/<module>.fixture.ts` (if exists)

**Reference spec (for UI structure, copy, API shape) — read EVERY file
that exists; the two screen-spec files complement each other:**
- `docs/design/$ARGUMENTS/screen-design.md` — functional spec from the
  customer's Excel (validation rules, business clauses, error-message
  text). Read whenever the file exists.
- `docs/design/$ARGUMENTS/index.html` — UI mockup wireframe (DOM,
  Japanese label / button / column-header text, CSS classes that
  selectors hit). Read whenever the file exists. Use literal strings
  from here for the Japanese text in templates so it matches what the
  user sees.
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` — API request / response
  shapes and `エラー一覧`. Read when present.

**Rules (mandatory):**
- `.claude/rules/vue.md`
- `.claude/rules/security.md` (Frontend Security section)
- `.claude/rules/naming-conventions.md`

**Existing infra to reuse (do NOT redefine):**
- `apps/frontend/src/api/generated/**` (Orval client — call, never redefine)
- `apps/frontend/src/stores/auth.store.ts` (session-cookie auth pattern)
- `apps/frontend/src/stores/codes.store.ts` (`useCodesStore` — m_code cache; dropdowns + labels read from here)
- `apps/frontend/src/components/common/**` (Base* components)
- `apps/frontend/src/components/layout/**` (Header / Sidebar / UserMenu)
- `apps/frontend/src/router/index.ts` (target for route registration)
- `apps/frontend/src/api/error-handler.ts`
- `apps/frontend/src/constants/error-codes.ts`

**Templates:**
- `.claude/skills/gen-code-frontend/templates/*.tpl` (3 files)

### Phase 2 — Analyze

Build a plan from spec files — tests dictate shape:

| Spec clause | → source file must expose |
|---|---|
| `mount(View, { props: { … } })` | `<View>.vue` with matching `defineProps<…>()` |
| `wrapper.find('[data-testid="xxx"]')` | element with `data-testid="xxx"` in template |
| `wrapper.emitted('yyy')` | `defineEmits<{ yyy: [...] }>()` + `emit('yyy', …)` call |
| `router.push` mock called with path | router-link OR programmatic navigation to that path |
| `vi.mocked(listXxx).mockResolvedValue(...)` | view calls `listXxx()` from `@/api/generated` |
| `store.xxx` accessed | Pinia store exposes `xxx` as ref / computed |
| `store.yyy(args)` called | store exposes async action `yyy` |
| Error toast assertion (`message.error`) | view/store catches error, calls `message.error()` with literal Japanese string |

Cross-check with `screen-design.md` / `index.html` for:
- Layout structure (grid, form rows, table columns)
- Ant Design component types (`a-table`, `a-form`, `a-modal`, `a-select`, `a-date-picker`)
- Labels / button text (Japanese literals)

Cross-check with `api.md` (if present) for:
- API function name (camelCase from `operationId` / path+method)
- Request/response field names (snake_case)

### Phase 3 — Generate

**Order (dependency-first):**

1. `types/<module>.types.ts` — request/response shapes (import from `@/api/generated` when possible)
2. `stores/<module>.store.ts` (only if specs reference it)
3. `views/<module>/<View>.vue` (one file per View spec)
4. **Register route**: add to `apps/frontend/src/router/index.ts` (idempotent — skip if path already present)
5. **Sync sidebar / dashboard menu → router**: `MENU_SECTIONS` (`src/constants/menu-sections.ts`) is the source of truth for which menu items appear; both `AppSidebar.vue` and `DashboardView.vue` consume it via `useMenu()`. After step 4, audit `MENU_SECTIONS` for items in this screen's module that reference a route name NOT yet registered in `router/index.ts` (the click-handler does `if (!router.hasRoute(name)) return` — silent skip — so a missing route looks like nothing happens). For each missing name, follow this two-step pattern:

   **a) Create a TODO placeholder view file** at the canonical location for that route name (`src/views/<module>/<View>.vue`). Don't reuse a sibling view — the URL would render the wrong screen content (e.g. landing on `/ja` and seeing a CREATE form is misleading). Keep the placeholder minimal: brief copy explaining "this screen is planned for a later SCR" + an optional CTA button to the most-functional sibling. Mark the file with a top-of-file `// TODO:` comment so it's grep-able when the real screen is generated. Example skeleton:
   ```vue
   <script setup lang="ts">
   // TODO: JAマスタ一覧 / 検索画面 — placeholder until the dedicated SCR ships.
   // Real implementation will replace this entire file (route name + path stay
   // the same so sidebar / dashboard menu links keep resolving).
   import { useRouter } from 'vue-router';
   const router = useRouter();
   function goCreate(): void { router.push({ name: 'JaCreate' }); }
   </script>
   <template>
     <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-6 max-w-2xl">
       <h3 class="font-bold text-text-main text-lg mb-2">JAマスタ一覧</h3>
       <p class="text-text-description text-sm mb-4">
         この画面は今後のSCRで実装予定です。現在は登録画面への導線のみ提供しています。
       </p>
       <button type="button" class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded font-bold" @click="goCreate">JAマスタ登録画面へ</button>
     </div>
   </template>
   ```

   **b) Register the route** pointing at this placeholder (NOT `redirect:` — redirect flips the address bar). Match the route's `permission` to the menu item's `permission` so the guard agrees with the visibility filter:
   ```ts
   // Menu (sidebar + dashboard) targets `JaList` at `/ja`. The real
   // list / search view lives in a future SCR; JaListView.vue is a
   // TODO placeholder so the URL stays `/ja` (no redirect that would
   // flip the address bar). Replace the placeholder file when the
   // real screen is generated — route name + path stay the same.
   {
     path: '',
     name: 'JaList',
     component: () => import('@/views/ja/JaListView.vue'),
     meta: { breadcrumb: 'JAマスタ一覧', permission: 'ja.view' },
   },
   ```
   When the real list view is later generated by another `/gen-code-frontend` run, that SCR's specs OVERWRITE the placeholder file — the route name, path, and import target stay the same so no other code touches.

**File layout produced** (example for `ACSMS-SCR-003` 単価マスタ with 2 views):

```
apps/frontend/src/
├── views/tanka/
│   ├── TankaListView.vue
│   └── TankaCreateView.vue
├── stores/tanka.store.ts     (only if inferred from spec)
└── types/tanka.types.ts
```

### Phase 4 — Compile-gate + unban

After writing all files:

1. Run `cd apps/frontend && npx vue-tsc --noEmit` (timeout 120s).
2. If **exit 0** (no type errors):
   - For each `*.spec.ts` file under the screen's module, remove the banner line `// @ts-nocheck — TDD red phase (...)`. Do NOT touch any other line.
   - Print: `✓ vue-tsc passed — @ts-nocheck banner removed from N spec file(s)`.
3. If **exit ≠ 0**:
   - Do NOT remove banners.
   - Print the first 30 lines of vue-tsc output.
   - Print: `⚠ vue-tsc failed — banner kept. Fix the type errors above, then rerun this skill OR gỡ banner thủ công.`

## Critical rules (enforce BEFORE writing)

- [ ] NEVER edit any `*.spec.ts`, `*.fixture.ts` file — specs are the immutable contract
- [ ] `<script setup lang="ts">` only — NO Options API
- [ ] API calls go through Orval-generated client (`@/api/generated`) — NEVER raw `fetch` / `axios`
- [ ] No `session_id` / tokens in `localStorage` / `sessionStorage` — HttpOnly cookie + `withCredentials: true` only
- [ ] Ant Design Vue for complex components (Table, Form, Modal, DatePicker, Select); Tailwind for layout only
- [ ] `v-for` has `:key` with stable unique id (never index)
- [ ] `v-if` and `v-for` NEVER on same element
- [ ] Every interactive element is a `<button>` / `<a>` / `<router-link>` — no clickable `<div>`
- [ ] Every icon-only button has `aria-label`
- [ ] Japanese literals (button text, error messages) copy verbatim from screen-design.md / api.md
- [ ] Code-category dropdowns / labels (any api.md field with `※m_code.code_category='XXX'を参照`) bind to `useCodesStore.options('XXX')` and `useCodesStore.label('XXX', value)` — NEVER hardcode options or a local label map. See `.claude/rules/vue.md §Code Master (m_code)`.
- [ ] No `v-html` with user content (XSS) — use `DOMPurify.sanitize(...)` if absolutely required
- [ ] No `console.log` / `debugger` left in committed code
- [ ] Route registered in `router/index.ts` using `component: () => import('@/views/...')` (lazy load)
- [ ] Do NOT introduce a `Forbidden` / `NotFound` named route or a `/403` / `/404` page. Permission-denied bounces to `Dashboard` with a toast (handled centrally in `router/index.ts` guard + `src/api/error-handler.ts`); unknown paths silently `redirect: { name: 'Dashboard' }` via the trailing `/:pathMatch(.*)*` entry. See `.claude/rules/vue.md §No standalone error pages`.
- [ ] Route has `meta: { requiresAuth: true, permission: 'model.action' }` if the screen is protected
- [ ] Every `MENU_SECTIONS` item targeting this module has a registered route — placeholder `redirect:` is OK for not-yet-built sibling views (e.g. List view of a master while only Create exists). Click on the sidebar / dashboard entry must NOT silent-skip.

## Validation summary (print at end)

```
✓ Orval client regenerated (Phase 0)
✓ View files: V
✓ Store files: S
✓ Type files: 1
✓ Routes registered: R  (matches protected view count)
✓ Menu→route sync: M sidebar/dashboard items target routes that now resolve (placeholders P)
✓ vue-tsc --noEmit: pass
✓ @ts-nocheck banners removed: B
→ Next: cd apps/frontend && npm test -- <module>
```

If vue-tsc fails:

```
⚠ vue-tsc --noEmit: FAIL (see above)
→ Fix type errors, rerun /gen-code-frontend $ARGUMENTS (idempotent)
```

## Placeholder reference

| Placeholder | Meaning | Example |
|---|---|---|
| `__SCREEN_ID__` | Screen code | `ACSMS-SCR-003` |
| `__SCREEN__` | Screen name (Japanese) | `単価マスタ登録画面` |
| `__MODULE__` | Feature folder | `tanka` |
| `__VIEW__` | Vue component class | `TankaListView` |
| `__VIEW_FILE__` | Vue file basename | `TankaListView` |
| `__STORE__` | Pinia store hook | `useTankaStore` |
| `__STORE_FILE__` | Pinia store file basename | `tanka.store` |
| `__TYPES_FILE__` | Types file basename | `tanka.types` |
| `__ROUTE_PATH__` | URL path segment | `tanka` |
| `__ROUTE_NAME__` | Named route | `TankaList` |
| `__PERMISSION__` | Permission required for route | `tanka.view` |

## Template → target mapping

| Template | Target | Purpose |
|---|---|---|
| `types.ts.tpl` | `src/types/{module}.types.ts` | Local request/response types (import from generated when possible) |
| `store.ts.tpl` | `src/stores/{module}.store.ts` | Pinia Setup Store (state + actions) |
| `view.vue.tpl` | `src/views/{module}/{View}.vue` | `<script setup>` + Ant Design template |

## Contracts with sibling skills

- **Spec files are immutable.** `/gen-code-frontend` MUST NOT edit `*.spec.ts` or `*.fixture.ts`. Its only edits outside `src/views/<module>/` + `src/stores/` + `src/types/` are (a) appending route(s) to `router/index.ts` (including placeholder `redirect:` entries for menu items whose real view isn't built yet), and (b) removing the `@ts-nocheck` banner after vue-tsc passes.
- **Idempotent.** Re-running overwrites view/store/types files but does not duplicate router entries.
- **Spec-canonical.** If a prop name or emit signature in the spec disagrees with screen-design.md, the spec wins.
- **Stale contract check.** If screen-design.md or api.md is newer than the spec, abort and tell the user to rerun `/gen-ut-frontend` first.
- **Independent of `/gen-code-backend`.** The two skills produce disjoint file sets.

## Common pitfalls

- **Orval client regen**: handled automatically by Phase 0. If you see a stale generated client AFTER this skill runs, the failure is on the backend side — `swagger.json` wasn't refreshed. Run `cd apps/backend && npm run swagger:export` then re-run this skill.
- **Page chrome lives in MainLayout, NOT the view.** Do NOT add a `<header><h2>{{ pageTitle }}</h2><nav>breadcrumb</nav></header>` block inside the view template. `MainLayout > AppHeader` already renders the title + breadcrumb from `route.meta.breadcrumb`. Including them in the view ships them twice. Compare the generated view against `TankaListView.vue` — that's the canonical pattern and it has no page-title element. See `.claude/rules/vue.md §Form / Layout Conventions`.
- **Required-field marker uses the `#label` slot, NOT `required` prop.** Antd's `required` renders a leading red `*` (Western convention). Project standard is asterisk AFTER the label. Drop `required` and use the slot:
  ```vue
  <a-form-item name="X" :validate-status="..." :help="...">
    <template #label>
      <span>JAコード</span>
      <span class="text-error ml-1">*</span>
    </template>
  </a-form-item>
  ```
- **`<ol>` / `<ul>` need `m-0 pl-0 list-none`** anywhere they're used, because Tailwind v4's preflight is opt-out (it conflicts with antd's reset). Without these, the browser default `padding-inline-start: 40px` sneaks in and pushes content to the right.
- **Form footer convention**: primary action LEFT, both buttons left-aligned with `justify-start`. NOT `justify-end` and NOT `justify-between`. See vue.md §Form / Layout Conventions for the snippet.
- **Auto-focus the first error after a failed submit** (client-side AND after server VALIDATION_ERROR). Generate a `FIELD_ORDER` array matching template DOM order and a `focusFirstError(errors)` helper. Antd places `id` differently per control (`<a-input>` on native input; `<a-select>` / `<a-radio-group>` on the wrapper) so the helper must drill into `.ant-select-selector` / first `<input type="radio">` for those wrappers. Pattern in vue.md §Form / Layout Conventions.
- **Client-side validation should mirror BE DTO regex** so users get instant feedback without a server round-trip. Match the DTO's `@Matches` patterns in `validateClient(form)` and emit the same Japanese message the BE would. The BE's response just refines (e.g. duplicate-code uniqueness) — for format checks, don't make the user wait for HTTP.
- **Required-string checks MUST use `?.trim()`, never `.trim()`.** Antd's `<a-select allow-clear>` / `<a-date-picker>` / `<a-cascader>` set the v-model to `undefined` (not `""`) when the × clear icon is clicked. `form.todofuken_code.trim()` then throws `TypeError`, bubbles up to the global error handler, and the user sees the generic `エラーが発生しました。ページを更新してください。` toast — which masks the actual required-field violation. Use `if (!form.X?.trim()) errs.X = REQUIRED_MSG;` for every required-string check, even fields that look like plain `<a-input>` today (they may be migrated to a clearable control later, and the form-state type still says `string` so TS won't catch it). See `.claude/rules/vue.md §Validation — mirror BE rules`.
- **Antd `<a-button>` auto-spaces 2-CJK-character labels** ("登 録" not "登録"). Tests asserting literal `'登録'` fail (see `gen-ut-frontend` pitfalls); when generating templates, this doesn't matter visually because the space is intended. Just be aware test selectors should target `button[type="submit"]` not literal text.
- **Optional-field empty strings**: the BE DTO's `@IsOptional()` does NOT skip `""` (only `null`/`undefined`). The view sends `tel: ""` for blank inputs. The BE needs `@Transform(blankToUndef)` before `@IsOptional()`. If the FE form submits 400 errors for fields the user left blank, that's the BE-side bug — fix the DTO, not the view. See `nestjs.md §DTO validation gotchas`.
- **`/gen-code-frontend` rebuilds the FE container? No.** When this skill adds new npm devDeps (rare — `@pinia/testing` was the only example so far), the running `agrinews-frontend-1` container's anonymous `/app/node_modules` volume keeps the OLD modules. Tests run from inside the container will fail to resolve. After any `package.json` change, run from `apps/`: `docker compose build frontend && docker compose up -d --force-recreate --renew-anon-volumes frontend`. The skill itself does NOT do this — note it in the validation summary so the operator can run it.
- **`withCredentials: true`**: already configured in `src/api/axios-instance.ts`. Do NOT re-set in the view/store.
- **Ant Design form binding**: use `v-model:value` (not `v-model`). Use `a-form-item name="xxx"` matching `formState.xxx` for validation to wire up.
- **Reactivity pitfalls**: use `ref()` for primitives, `reactive()` for objects. Don't `reactive(0)` — reassigning loses reactivity.
- **Router guard checks `meta.permission`**: if missing, the guard skips the RBAC check. Always add `meta: { permission: '...' }` for protected screens.
- **Cross-SCR `<router-link>` should use path-based `to="/path"`, NOT `:to="{ name: 'XYZ' }"`** when the link points at a route owned by a different SCR's view. Each view's spec creates a NARROW test router that registers only the routes the view itself navigates to (e.g. `LoginView.spec.ts` registers `Login`, `MfaVerify`, `Dashboard`). A `:to="{ name: 'ForgotPassword' }"` in `LoginView.vue` triggers `Error: No match for {"name":"ForgotPassword"}` at render time inside the LoginView spec because that test router never declared the route. Path-based `to="/forgot-password"` resolves against any router with that path registered, and `/gen-code-frontend` is NOT allowed to edit the existing `LoginView.spec.ts` to add the new route. Pattern: SCR-012 added "パスワードを忘れた場合" link to LoginView.vue using `to="/forgot-password"` to bridge to the new `/forgot-password` route without breaking the SCR-001 LoginView spec.
- **Public auth views (forgot-password, reset-password, MFA verify) wire as separate top-level routes**, NOT children of `MainLayout`. `MainLayout` carries `meta: { requiresAuth: true }` and the global guard would bounce unauthenticated users on those pages straight to `/login` — ironic for a "user can't log in" flow. Use the same shape as `Login` / `MfaVerify`:
  ```ts
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },   // critical — bypasses the auth guard
  }
  ```
  Each view renders its own `<AuthLayout>` wrapper internally (like `LoginView.vue`), so they get the unauthenticated chrome (no sidebar / header / breadcrumb).
- **A new screen needs a sidebar/dashboard entry → 3 places, not 1.** Edit `src/constants/menu-sections.ts` (the canonical FE menu source — both AppSidebar and DashboardView consume it via `useMenu()`), AND add the matching `model.action` permission to a seeder migration + `docs/database/seeder.md` (otherwise `hasPermission(...)` is always false and the menu is silently invisible), AND add the row to `docs/requirement/account_concept.md` matrix so the canonical spec stays the source of truth FE/BE align against. Do NOT inline a menu list anywhere — drift between sidebar and dashboard already happened once. See `.claude/rules/vue.md §Menu / Navigation` for the full checklist + the 販売店代行入力 case study (don't gate a role-exclusive menu by a permission other roles also have).
- **Japanese text in templates**: write literal strings — no string table / i18n keys for now (the project has no i18n system yet).
- **`message.error(...)` import**: `import { message } from 'ant-design-vue'`. It is NOT a method on the component — import the top-level named export.
- **Never set `type="email"` / `"number"` / `"url"` / `"tel"` / `"date"` on `<a-input>`.** HTML5 native input types trigger the browser's hard-coded English validation tooltip (`"Please include an '@' in the email address."`) on submit — an OS-locale popup that ignores the project's Japanese messages and renders outside the `<a-form-item :help>` slot, breaking the consistent error-placement convention. Use plain `<a-input v-model:value="formState.email" maxlength="100" />` and let `validateClient(form)` run the regex + emit the Japanese message. See `.claude/rules/vue.md §Validation — NEVER use HTML5 native input types`.
- **CRUD edit forms (4+ fields) MUST block Enter implicit submit.** Wire `@keydown="preventEnterImplicitSubmit"` from `@/utils/form-keyboard` on the `<a-form>`. HTML default Enter-on-input → submit is fine for login/search but bad UX on long forms (Japanese IME 完了 → Enter triggers accidental submit with incomplete data). The utility preserves Enter on textarea (newline), focused submit button (accessibility), antd combobox (option select), and modifier+Enter combos. Pattern + regression test: `JaFormView.vue` + `JaFormView.spec.ts`. See `.claude/rules/vue.md §Block Enter implicit submit on long CRUD forms`.
- **Japanese system messages MUST end with 「。」.** Toasts, validation help, BE result `message` fields, guard errors. `useNotify()` helpers append it automatically. Direct `message.success('…')` calls and BE service messages need the period explicit. UI placeholders (`<input placeholder="…">`) and test descriptions are exempt. See `.claude/rules/vue.md §Japanese system-message punctuation`.
- **`useNotify()` toasts are 0-arg, verb-only — DO NOT prefix the subject.** `notify.created()` → `'登録しました。'`, NOT `'JAを登録しました。'`. The button the user clicked + the screen they're on already imply the subject; tacking on "JAを" / "単価を" / "MFA設定を" makes every toast read like Captain Obvious ("on the JA edit screen, after clicking 更新, the toast reads 'JAを更新しました'"). Project-wide convention. Generated calls MUST be `notify.created()` / `.updated()` / `.deleted()` / `.uploaded()` / `.downloaded()` with no args. For genuinely custom copy (e.g. ResetPasswordView's `'パスワードを更新しました。ログイン画面に移動します。'`) use `notify.success(text)` directly with the literal string. BE response `message` fields can be specific (BE-owned) — those flow through differently and don't violate this rule. Spec assertions match literal strings: `expect(message.success).toHaveBeenCalledWith('登録しました。')`. See `.claude/rules/vue.md §Reusable Building Blocks → useNotify` + `vue.md §Japanese system-message punctuation`.

### List view — canonical patterns (SCR-004 lessons)

`.claude/rules/vue.md §Reusable Building Blocks → Reference patterns → List / search / delete view (canonical)` is the source of truth. Highlights — every list/search/delete screen MUST follow these:

- **`<BaseSearchForm :columns="4">`** for a 2-field search (JAコード + JA名). `:columns="2"` makes each field fill half the card AND together they fill the entire card width — visually unbalanced. With `columns=4` the 2 fields land in the LEFT HALF only, leaving the right half empty (cleaner enterprise look, matches design mockups).
- **No fixed-width labels** in the search row. Drop `w-20` / `w-24` from `<label>`. Pair `<label class="…whitespace-nowrap">` with `gap-2` (8px) on the flex container so the label hugs the input.
- **`<a-input class="flex-1">`** so the input absorbs the remaining cell space.
- **Empty-result message rendered as a sibling `<p>` outside the table**, NOT via a-table's `#emptyText` slot. `BaseDataTable`'s dynamic `<slot :name="slotName" v-bind="slotProps" />` loop crashes on the null `slotProps` antd passes for emptyText. Use `<p v-if="!loading && total === 0">検索結果が見つかりませんでした。</p>` above the `<BaseDataTable>`.
- **`fetchList` MUST catch and swallow** errors silently. `onMounted(fetchList)` is fire-and-forget; an unhandled rejection bubbles up as a Vitest "unhandled rejection" warning AND scares users on real 403/500. The global axios interceptor already toasts; the view only needs to clear local state (`rows.value = []; total.value = 0`). This is the "expected and intentionally ignored" exception from `vue.md §Error Handling Architecture` — add a comment so future readers know why the catch is empty.
- **`onSearch` MUST trim every text filter before applying.** `state.filters.x = state.filters.x.trim()` for each string filter, then call `applyFilters` + `fetchList`. Trimming guards against paste artifacts and IME-confirmed leading/trailing spaces silently widening the ILIKE pattern. Mutate state.filters directly (not just the params sent to the API) so the input visibly updates when the user hits 検索 — clear feedback that something happened. Don't trim only inside `fetchList`: that leaves the visible input dirty and confuses the user. Pattern in `JaListView.vue` `onSearch` + `vue.md §List view rules #5a`.
- **Use `Modal.confirm` for delete**, NOT `BaseConfirmModal`. Antd's `Modal.confirm({ onOk, onCancel })` is testable via `vi.spyOn(Modal, 'confirm').mockImplementation(opts => opts.onOk?.())` in unit specs.
- **Delete-error catch swallows**: same as fetchList. Don't re-toast 409 / 500.
- **`mr-1` on the "+" icon span** in the `新規登録` button. Antd's built-in icon-text gap is too tight.
- **Form-load value coercion (Edit mode)**: when the BE returns a numeric m_code value (e.g. `zei_kubun: 1`) and the form binds a string radio (`v-model:value` of `'1'` / `'2'`), coerce at the load boundary:
  ```ts
  formState.zei_kubun = String(resp.data.zei_kubun ?? '');
  ```
  Antd's radio uses strict equality, so without coercion `'1' !== 1` and the edit form shows nothing selected.

### Breadcrumb convention (every CRUD module)

Per `.claude/rules/vue.md §Form / Layout Conventions §Configure breadcrumb on the route`, depth follows navigation flow, NOT sidebar groups:

| Screen | Levels | meta.breadcrumb |
|---|---|---|
| List | 2 (`ホーム > X一覧`) | `'X一覧'` (string) |
| Create | 3 (`ホーム > X一覧 > X登録画面`, middle clickable) | `[{ label: 'X一覧', to: '/x' }, { label: 'X登録画面' }]` |
| Edit | 3 (`ホーム > X一覧 > X編集画面`, middle clickable) | `[{ label: 'X一覧', to: '/x' }, { label: 'X編集画面' }]` |

Wrapper parent route (`/ja`, `/tanka`, …) MUST NOT carry its own breadcrumb meta — it's just a path prefix. `useBreadcrumb()` already supports both string and array forms; `AppHeader` shows the breadcrumb when `length > 1 && route.name !== 'Dashboard'`.

## Out of scope

- Does NOT run `npm run swagger:export` on the backend. That step lives in `/gen-code-backend`'s post-write phase OR the operator runs it manually after backend code is in. Phase 0 here only consumes the resulting `apps/frontend/swagger.json` and regenerates the FE Orval client from it.
- Does NOT install npm packages.
- Does NOT modify `vitest.config.ts`, `vite.config.ts`, `orval.config.ts`, or CI config.
- Does NOT generate backend code (use `/gen-code-backend`).
- Does NOT iterate on vitest failures.
- Does NOT edit specs or fixtures.
- Does NOT add menu entries to `AppSidebar.vue` — user wires nav manually after review.
