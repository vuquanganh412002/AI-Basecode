# Testing Standards — Jest (BE) + Vitest (FE) + NestJS + Vue 3

> Standards for testing in the `AgriNews_ACSMS` project.
> - **Backend (NestJS)**: Jest + ts-jest + supertest — NestJS docs default; ts-jest emits decorator metadata natively.
> - **Frontend (Vue 3)**: Vitest + Vue Test Utils — Vue/Vite ecosystem default; shares Vite transform pipeline.

## Testing Pyramid
```
         [E2E Tests]         ← Few, slow (Playwright)
       [Integration Tests]   ← Some, test module interaction (BE: pg-mem + ioredis-mock)
     [Unit Tests]            ← Many, fast (BE: Jest, FE: Vitest)
```

## Requirements
- **Effective** coverage target — aspirational vs gate:
  - **Backend (Jest)** — aspirational ≥ 97-98% (branches / functions / lines / statements). Jest's istanbul-based instrumentation works well with NestJS decorators so this is realistic.
  - **Frontend (Vitest + v8)** — aspirational ≥ 95% but CI gate set lower at **statements/lines 90, branches/functions 85**. v8 instruments compiled Vue templates as separate function nodes per `v-model` / `:disabled` binding, so even a test that exercises both branches of `:disabled="isFoo"` leaves the binding line marked uncovered. Pushing past ~92% on FE requires switching the provider to `istanbul` (better Vue plugin) or annotating each template binding with `/* v8 ignore next */` — both add maintenance burden without finding real test gaps. The floor catches "new untested file" and "test removed" regressions, not template-binding noise.
  - "Effective" excludes bootstrap, decorator-only files, migrations, constants, generated code — see exclude list in each runner's config (`jest.config.ts` for BE, `vitest.config.ts` for FE).
- Test-first (TDD): specs are generated BEFORE implementation via `/gen-ut-backend` (BE) + `/gen-ut-frontend` (FE), then `/gen-code-backend` + `/gen-code-frontend` emit source that satisfies each side's contract.
- All new features must have tests
- All bug fixes must have a regression test
- Tests run in CI (GitLab) before any merge

### Coverage excludes (intentionally uncovered)

Backend (`apps/backend/jest.config.ts` → `collectCoverageFrom`):
- `src/main.ts` — bootstrap
- `src/**/*.module.ts` — NestJS module decorators
- `src/database/entities/**` — TypeORM decorator-only classes (entities live here, not in modules)
- `src/**/dto/**/*.dto.ts` — class-validator decorator shells (tested via `*.dto.spec.ts` separately)
- `src/database/migrations/**` + `src/database/data-source.ts`
- `src/**/*.constant.ts` — enums / constant maps

Frontend (`apps/frontend/vitest.config.ts`):
- `src/main.ts`, `src/App.vue`, `src/router/index.ts`
- `src/env.d.ts`, `src/types/**`, `src/**/*.d.ts`

## TDD workflow

Per-screen pipeline (order, review steps, migration timing) lives in the **[README.md § Development Workflow](../../README.md)** — canonical reference, do not duplicate.

Rules that govern test files specifically:

- **Immutable specs**: `*.spec.ts`, `*.fixture.ts`, `*.factory.ts` are written by `/gen-ut-*` and are the contract. `/gen-code-*` MUST NOT edit them. If the contract is wrong, rerun `/gen-ut-*` — don't patch the spec by hand from `/gen-code-*`.
- **Red-phase banner**: every generated spec starts with `// @ts-nocheck — TDD red phase`. `/gen-code-*` removes the banner as its last step when the type-checker (`tsc --noEmit` for BE, `vue-tsc --noEmit` for FE) passes.
- **Stale-contract guard**: if `api.md` or `screen-design.md` mtime is newer than any `*.spec.ts`, `/gen-code-*` aborts and asks to rerun the matching `/gen-ut-*` first.
- **Spec-canonical**: when spec and api.md / screen-design.md disagree, the spec wins. Regen specs to refresh the contract.
- **Review matters**: between `/gen-ut-*` and `/gen-code-*`, read the specs and fix anything wrong (happy-path shape, error-message literals, DataScope cases). Running them back-to-back without review makes "test-first" trivial.
- **One-shot**: `/gen-code-*` does not loop on test failures. User runs `npm test` manually and iterates.

---

## Test Framework — Split by Ecosystem

### Backend: Jest + ts-jest

- NestJS docs / CLI / examples default — patterns copy-paste
- ts-jest emits `design:paramtypes` decorator metadata natively → `Test.createTestingModule()` works without an extra plugin
- Larger ecosystem of NestJS testing utilities

### Frontend: Vitest

- Vue 3 / Vite ecosystem default — `create-vue` scaffolds with it
- Native SFC (`.vue`) support via `@vitejs/plugin-vue`
- Shares Vite config + transforms with the dev server (no drift)
- Faster than Jest for FE specs (esbuild)

Each side uses the runner aligned with its framework — minimum friction long term.

---

## Backend Testing (NestJS)

### Test File Organization
```
src/modules/users/
  ├── users.service.ts
  ├── users.service.spec.ts          # Unit test
  ├── users.controller.spec.ts       # Controller test
  └── __tests__/
      └── users.integration.spec.ts  # Integration test
```

### Unit Test (Service) — plain `new`
```ts
// users.service.spec.ts
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: any;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
    };
    // Service unit specs use plain `new` — no Nest lifecycle needed.
    service = new UsersService(repo);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      repo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when not found', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById('999'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
```

### Controller Test — Test.createTestingModule + supertest
```ts
// ts-jest emits decorator metadata natively, so Nest DI works in
// Test.createTestingModule({...}).compile() — no extra plugin.
const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [{ provide: UsersService, useValue: serviceMock }],
})
  .overrideGuard(SessionAuthGuard).useValue(sessionGuardStub)
  .overrideGuard(PermissionsGuard).useValue(permissionsGuardStub)
  .compile();

const app = moduleRef.createNestApplication();
await app.init();
await request(app.getHttpServer()).get('/api/v1/users/1').expect(200);
```

### Testing Rules (Backend)
- Use `jest.fn()` for mocks (Jest API)
- Service spec: plain `new ServiceClass(...)` — bypass Nest DI (faster, simpler)
- Controller spec: `Test.createTestingModule` + `supertest` (full HTTP stack)
- Mock typing: `let service: any` — strict types (`Record<string, ReturnType<typeof jest.fn>>`) widen `mockRejectedValue` arg to `never`, blocking error-path tests
- Test service methods independently — no real DB
- Test edge cases: empty list, null, invalid input
- Verify mock calls: `expect(mock).toHaveBeenCalledWith(...)`

---

## Frontend Testing (Vue 3 + Vue Test Utils)

### Test File Organization
```
src/components/
  ├── UserCard.vue
  └── __tests__/
      └── UserCard.spec.ts

src/composables/
  ├── useAuth.ts
  └── __tests__/
      └── useAuth.spec.ts

src/stores/
  ├── user.store.ts
  └── __tests__/
      └── user.store.spec.ts
```

### Component Test
```ts
// UserCard.spec.ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import UserCard from '../UserCard.vue';

describe('UserCard', () => {
  it('renders user name', () => {
    const wrapper = mount(UserCard, {
      props: { name: 'John Doe', email: 'john@example.com' },
    });

    expect(wrapper.text()).toContain('John Doe');
  });

  it('emits select event when clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { name: 'John', email: 'john@example.com' },
    });

    await wrapper.find('[data-testid="select-btn"]').trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual(['john@example.com']);
  });
});
```

### Composable Test
```ts
// useAuth.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('should set isAuthenticated after login', async () => {
    const { isAuthenticated, login } = useAuth();

    expect(isAuthenticated.value).toBe(false);

    await login({ email: 'test@test.com', password: 'password' });

    expect(isAuthenticated.value).toBe(true);
  });
});
```

### Pinia Store Test
```ts
// user.store.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '../user.store';

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should add user', () => {
    const store = useUserStore();
    store.addUser({ id: '1', name: 'John' });

    expect(store.users).toHaveLength(1);
    expect(store.users[0].name).toBe('John');
  });
});
```

### Testing Rules (Frontend)
- Use `mount()` or `shallowMount()` from `@vue/test-utils`
- Test props rendering, events emission, user interactions
- Mock API calls — no real HTTP requests
- Test composables independently with reactive assertions
- Test Pinia stores with `setActivePinia(createPinia())`

---

## E2E Testing — Playwright

```ts
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and see dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@agrinews.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-btn"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## Test Commands
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

---

## Naming Conventions
- Test files: `[filename].spec.ts` (not `.test.ts`)
- `describe` blocks: Match module/class being tested
- `it` blocks: `should [expected behavior] when [condition]`

## Checklist
- [ ] Unit tests for service methods (mock dependencies)
- [ ] Edge cases tested (empty, null, invalid input)
- [ ] Component tests for user interactions
- [ ] Store tests with fresh Pinia instance
- [ ] Coverage > 80% for business logic
- [ ] No real DB/API calls in unit tests
- [ ] CI pipeline runs tests before merge
