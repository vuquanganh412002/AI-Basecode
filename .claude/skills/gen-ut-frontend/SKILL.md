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

Read EVERY screen-design source file that exists in
`docs/design/$ARGUMENTS/`. The two files complement each other and
neither is sufficient on its own:

| File | What it contributes | Read when |
|---|---|---|
| `docs/design/$ARGUMENTS/screen-design.md` | Functional spec converted from the customer's Excel doc — validation rules, required-field flags, error-message text, business-logic clauses, button-action semantics | ALWAYS read if file exists |
| `docs/design/$ARGUMENTS/index.html` | UI mockup wireframe — DOM hierarchy, Japanese label text, button labels, table column headers, CSS classes that selectors target | ALWAYS read if file exists |
| `docs/design/$ARGUMENTS/$ARGUMENTS-api.md` | API contract for mock shapes — request DTO, response shape, `エラー一覧` codes | ALWAYS read if file exists |

If both `screen-design.md` and `index.html` exist, **read both** and
cross-reference. Test assertions about copy/labels should match the
Japanese text in `index.html` (which is what users actually see); tests
about validation rules / business behaviour should be driven by
`screen-design.md` (which is the customer-signed spec).

If only one of the two screen-spec files exists, read that one and
flag in the validation summary that the spec is one-sided.

Other parallel reads:

**Rules** (always read):
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

From **screen-design.md** + **index.html** (use both — see Phase 1) extract testable units:

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
- [ ] Every required-string field that is bound to a CLEARABLE control (`<a-select allow-clear>`, `<a-date-picker>`, `<a-cascader>`...) has an additional spec asserting the cleared (`undefined`) state shows `必須項目です。` AND does NOT show `エラーが発生しました` — guards the `?.trim()` vs `.trim()` regression (see vue.md §Validation)
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

→ REVIEW the generated specs before running /gen-code-frontend. Edit any assertion
  that looks wrong (selector, emit payload, toast message). Running /gen-code-frontend
  back-to-back without review makes "test-first" trivial — both sides get derived
  from the same screen-design.md so tests "pass" meaninglessly.
→ If the screen has API calls: ensure BE is done first —
    /gen-code-backend __SCREEN_ID__   (if not yet)
    cd apps/frontend && npm run api:generate
→ Then: /gen-code-frontend __SCREEN_ID__
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
- **Japanese text assertions**: use literal strings from screen-design.md (e.g. `'検索'`, `'正常に削除しました'`).
- **Antd `<a-button>` with 2 CJK characters auto-inserts a space** ("登 録" not "登録"). Tests asserting `text().toContain('登録')` fail because antd adds a half-width gap between two adjacent CJK chars for visual breathing room. Use a selector + substring match instead:
  ```ts
  // ❌ Brittle on antd button labels like 登録 / 削除 / 検索
  expect(wrapper.text()).toContain('登録');
  // ✅ Robust
  const btn = wrapper.find('button[type="submit"]');
  expect(btn.exists()).toBe(true);
  expect(btn.text()).toContain('登');
  ```
  Labels with 3+ chars (`前の画面に戻る`) or non-CJK don't get the space — literal match is fine there.
- **Page title + breadcrumb belong to MainLayout's AppHeader, NOT the view.** Mounting a view standalone in unit tests does NOT render them. Don't generate assertions like `expect(wrapper.text()).toContain('JAマスタ登録画面')` for the page title — they fail because the title comes from `route.meta.breadcrumb` consumed by AppHeader. Generate that assertion against the form's own H3 inside the card (e.g. `'JA基本情報入力'`) which IS in the view, or skip it entirely.
- **`wrapper.vm.someMethod()` assumes `defineExpose`** but Vue Test Utils' default `VueWrapper<ComponentPublicInstance<{}, Omit<{}, never>>>` typing doesn't surface exposed methods. After `/gen-code` removes `@ts-nocheck`, vue-tsc trips with TS2339. Prefer driving submit via DOM events (`wrapper.find('form').trigger('submit')`, `await wrapper.find('[data-test="X"]').trigger('click')`) so the spec doesn't depend on internal method shapes.
- **FE-only screens (dashboard, static pages)**: if no api.md, skill still works — API mocks use placeholder TODO shapes which `/gen-code` fills in.
- **`<span class="material-icons">{{ name }}</span>` text leaks into `wrapper.text()` in jsdom.** The Material Icons font isn't loaded in the test environment, so the icon name (e.g. `home`, `person_add`) renders as plain text and prepends every label — `'homeメニュー画面'` instead of `'メニュー画面'`. When asserting menu / button labels, filter the icon spans first:
  ```ts
  function visibleLabels(wrapper) {
    return wrapper.findAll('aside nav button').map((b) => {
      const labelSpans = b.findAll('span').filter((s) => !s.classes('material-icons'));
      return labelSpans.map((s) => s.text()).join('').trim();
    }).filter(Boolean);
  }
  ```
  Don't try to stub the icon font — the `.material-icons` class lookup is the cleanest split. See `AppSidebar.spec.ts` for the canonical helper.
- **Permission-driven visibility tests need real `hasPermission()`.** With `createTestingPinia()` defaults, all returned functions get auto-stubbed → `hasPermission()` returns `undefined` and every menu collapses. Pass `{ stubActions: false }` and seed the user directly: `useAuthStore().user = buildUser({ permissions: [...] })`. Pattern in `AppSidebar.spec.ts`.

### List-view spec patterns (SCR-004 lessons — apply to every CRUD list view)

- **JSDom doesn't auto-submit a form when the submit button is clicked.** A `<a-button html-type="submit">` triggers form submission in real browsers but NOT in JSDom. Drive the search via the form's `submit` event:
  ```ts
  // ❌ Click on the submit button — listJa is never called.
  await wrapper.find('button[type="submit"]').trigger('click');
  // ✅ Trigger 'submit' on the form itself.
  await wrapper.find('form').trigger('submit');
  ```
- **`wrapper.find('label')` returns only the FIRST label hit.** When asserting that BOTH "JAコード" and "JA名" labels render, naively `wrapper.find('label').text().includes('JA名')` always reads the first label and fails. Use `findAll`:
  ```ts
  const labelTexts = wrapper.findAll('label').map((l) => l.text());
  expect(labelTexts.some((t) => t.includes('JAコード'))).toBe(true);
  expect(labelTexts.some((t) => t.includes('JA名'))).toBe(true);
  ```
- **Searching for the 検索 button by text is fragile** under antd's CJK auto-spacing (`'検索'` becomes `'検 索'`). Use the form's submit selector:
  ```ts
  // ✅ One submit button per BaseSearchForm — robust to antd internals
  const searchBtn = wrapper.find('button[type="submit"]');
  expect(searchBtn.exists()).toBe(true);
  ```
- **`router.push` assertions** need `JSON.stringify`, not `.map(String)`. Vue-router push targets are objects (`{ name: 'JaCreate' }`) and `String({...})` collapses to `'[object Object]'`:
  ```ts
  // ❌ Always sees '[object Object]'
  const pushed = pushSpy.mock.calls.flatMap((c) => c).map(String).join(' ');
  // ✅ Preserves nested fields
  const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
  expect(pushed).toContain('JaCreate');
  ```
- **Antd's `MessageType` rejects `() => undefined` mocks** once `@ts-nocheck` is removed. Cast the noop to the message type:
  ```ts
  const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
  vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
  ```
- **Toast assertions use the verb-only `useNotify()` literal — NEVER prefix the subject.** Project-wide convention is `'登録しました。'` / `'更新しました。'` / `'削除しました。'`, not `'JAを登録しました。'`. Generated specs MUST assert literals, not substrings:
  ```ts
  // ❌ Loose — masks the regression where notify gains a subject prefix.
  expect(message.success).toHaveBeenCalledWith(expect.stringContaining('登録'));
  // ✅ Pin the full string. Use the verb-only form.
  expect(message.success).toHaveBeenCalledWith('登録しました。');
  ```
  BE-owned messages with subject (e.g. `'パスワードを更新しました。ログイン画面に移動します。'` from ResetPasswordView) are different — those flow from BE response, not `useNotify`. Assert those literally too. See `.claude/rules/vue.md §useNotify` for the convention rationale.
- **Mock `Modal.confirm` with synchronous `onOk` invocation** so the test can assert what happens after the user clicks 「はい」 without dealing with async modal lifecycle:
  ```ts
  vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
    opts?.onOk?.();
    return { destroy: () => undefined, update: () => undefined };
  });
  ```
- **API errors during `onMounted` fetchList should be expected to NOT propagate as unhandled rejections.** The view's `fetchList` catches them per `.claude/rules/vue.md §List view rules #5`. The spec just asserts the API was called (`expect(listJa).toHaveBeenCalled()`); the global axios interceptor toasts.
- **Don't assert on a-table's `#emptyText` slot.** The empty message is rendered as a sibling `<p>` outside the table (BaseDataTable's dynamic slot loop crashes on null `slotProps`). Assert via `wrapper.text()` matching the literal string (`expect(wrapper.text()).toContain('検索結果が見つかりませんでした。')`).

## Out of scope

- Does NOT generate any backend test (use `/gen-ut-backend` separately).
- Does NOT install npm packages.
- Does NOT modify `vitest.config.ts` or CI config.
- Does NOT generate E2E (Playwright) tests.
