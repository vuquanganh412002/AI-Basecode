---
name: gen-ut-frontend
description: Generate failing Vue 3 unit tests (TDD red phase) for a screen BEFORE frontend implementation. Reads screen-design.md / index.html (and api.md if present for API-mock shapes) and emits Vitest spec files for views + Pinia stores + fixtures targeting 98% effective coverage. Use after /gen-api-doc, before /gen-code.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX"
---

# Generate Frontend Unit Tests (TDD Red Phase)

## Description

Emit a **failing** Vitest test suite for the frontend side of a screen. Tests are written FIRST, implementation follows. The skill reads the screen design (UI mockup) and, when available, the backend `api.md` (to mock response shapes accurately).

Pipeline position:

```
/gen-api-doc       ACSMS-SCR-XXX  →  api.md (spec — optional for FE-only screens)
/gen-ut-backend    ACSMS-SCR-XXX  →  backend *.spec.ts (failing — RED)
/gen-ut-frontend   ACSMS-SCR-XXX  →  frontend *.spec.ts (failing — RED)
/gen-code          ACSMS-SCR-XXX  →  source files (passing — GREEN)
```

The backend equivalent is `/gen-ut-backend`; run it separately (order doesn't matter — the two skills produce independent files).

## Inputs

**Required:** `$ARGUMENTS` = screen ID (e.g. `ACSMS-SCR-003`).

**Abort conditions:**
- Both `screen-design.md` AND `index.html` missing in `docs/design/$ARGUMENTS/` → abort with message listing the expected paths.

**Optional inputs:**
- `api.md` — if present, used to mock API response shapes. Without it, API calls are mocked with placeholder TODO payloads.

## Process

### Phase 1 — Read

Parallel reads:

**Screen spec:**
- `docs/design/$ARGUMENTS/screen-design.md` (preferred)
- `docs/design/$ARGUMENTS/index.html` (fallback / UI reference)
- `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` (optional — for API mock shapes)

**Rules:**
- `.claude/rules/testing.md`
- `.claude/rules/vue.md`

**Existing code to mirror or mock:**
- `apps/frontend/src/api/**` (shape of generated API client)
- `apps/frontend/src/stores/auth.store.ts` (Pinia store pattern)
- `apps/frontend/src/components/common/**` (Base* components rendered by views)
- `apps/frontend/src/constants/error-codes.ts` (matches backend ErrorCode enum)

**Templates:**
- `.claude/skills/gen-ut-frontend/templates/*.tpl` (2 files)

### Phase 2 — Analyze

From **screen-design.md / index.html** extract testable units:

| UI element | → generates |
|---|---|
| Form field + `v-model` | input binding + validation-error rendering test |
| Table column | row rendering assertion |
| Action button (登録 / 検索 / 削除 / 編集) | click → emit or `router.push` assertion |
| Message block (success / error toast) | text visibility assertion |
| Dropdown / select | options rendering + selection event |
| Modal (confirm / dialog) | open/close trigger + action buttons |
| Pagination controls | page change → re-fetch assertion |
| Breadcrumb | correct labels rendered |

From **api.md** (if available) extract mock shapes:

| api.md clause | → FE mock |
|---|---|
| `レスポンスデータ` happy-path | `vi.mocked(api.list).mockResolvedValue({ data: […], meta: {…} })` |
| `エラー一覧` row | `vi.mocked(api.create).mockRejectedValue({ error_code: 'DUPLICATE_CODE', message: '…' })` to test error toast render |

### Phase 3 — Generate

**Granularity:** 1 spec file per source file. Group related cases inside nested `describe` blocks.

**Every generated spec file MUST:**
1. Start with `// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)`
2. Include screen header: `// Screen: <ID> — <Name>`
3. Use `.spec.ts` extension (never `.test.ts`)
4. Name each `it()` as `should <expected behavior> when <condition>` (regex `/^should .+ when .+$/`)

**File layout produced** (example for `ACSMS-SCR-003` 単価マスタ with 2 views):

```
apps/frontend/
├── src/views/tanka/__tests__/
│   ├── TankaListView.spec.ts
│   └── TankaCreateView.spec.ts
├── src/stores/__tests__/
│   └── tanka.store.spec.ts          (only if store inferred from screen actions)
└── test/fixtures/
    └── tanka.fixture.ts
```

## Critical rules (enforce BEFORE writing)

- [ ] Every view .vue file in screen-design has a mount spec
- [ ] Every form field has at least 1 v-model + validation test
- [ ] Every button / link has at least 1 click test (emit OR router navigation)
- [ ] Every error case from api.md (if present) has an FE-side toast-render test
- [ ] All `it()` names match regex `/^should .+ when .+$/`
- [ ] All file paths end with `.spec.ts`
- [ ] API layer imports are wrapped in `vi.mock('@/api/...')` — no real HTTP
- [ ] No generated test imports from `src/api/generated/**` without mocking
- [ ] Every spec file starts with the `@ts-nocheck` TDD banner

## Validation summary (print at end)

```
✓ Files created: N
✓ Tests generated: M
✓ Views covered: V/V
✓ Interactions covered (buttons/forms): I/I
✓ API error toasts covered: E/E  (if api.md present)
⚠ Estimated branches: ≥98% (verify with `cd apps/frontend && npm run test:coverage`)
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

## Template → target mapping

| Template | Target | Purpose |
|---|---|---|
| `view.spec.ts.tpl` | `apps/frontend/src/views/{module}/__tests__/{View}.spec.ts` | `mount()` + Ant Design + `createTestingPinia` + vue-router stub |
| `store.spec.ts.tpl` | `apps/frontend/src/stores/__tests__/{module}.store.spec.ts` | `setActivePinia(createPinia())` pattern |

Fixtures written to `apps/frontend/test/fixtures/{module}.fixture.ts` when a view needs shared mock data.

## Contracts with sibling skills

- **`/gen-ut-frontend` is the source of truth for frontend expected behaviour.** Generated specs must not be overwritten by other skills.
- **`/gen-code` must NOT edit any `*.spec.ts` file.** It only writes source files until tests pass; its last step is removing the `@ts-nocheck` banner.
- **If `screen-design.md` / `api.md` changes after `/gen-ut-frontend` ran:** delete the affected spec files and rerun.
- **Independent of `/gen-ut-backend`** — the two skills produce disjoint file sets. Order doesn't matter.

## Common pitfalls

- **Ant Design Vue components**: many rely on browser APIs (matchMedia, ResizeObserver). The stubs live in `apps/frontend/test/setup.ts` — do NOT re-stub inside spec files.
- **Ant Design stubs vs real render**: prefer `global.plugins: [Antd]` over stubbing; stubbed components break `:data-source` / slot tests. Only stub heavy components (`<a-upload-dragger>` etc.) when they pull in non-jsdom APIs.
- **Router navigation**: use `createMemoryHistory()` + inline route stubs. Never hit the real router.
- **Pinia auth state**: for protected views, seed a minimal user via `createTestingPinia({ initialState: { auth: { user: buildUser() } } })`.
- **Japanese text assertions**: use literal strings from screen-design.md (e.g. `'検索'`, `'登録'`, `'正常に削除しました'`).
- **FE-only screens (dashboard, static pages)**: if no api.md, skill still works — API mocks use placeholder TODO shapes which `/gen-code` fills in.

## Out of scope

- Does NOT generate any backend test (use `/gen-ut-backend` separately).
- Does NOT install npm packages.
- Does NOT modify `vitest.config.ts` or CI config.
- Does NOT generate E2E (Playwright) tests.
