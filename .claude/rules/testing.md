# Testing Standards — Vitest + NestJS + Vue 3

> Standards for testing in the `agrinews` project. Vitest for all tests, Vue Test Utils for frontend.

## Testing Pyramid
```
         [E2E Tests]         ← Few, slow (Playwright)
       [Integration Tests]   ← Some, test module interaction
     [Unit Tests]            ← Many, fast (Vitest)
```

## Requirements
- Unit test coverage: **minimum 80%** for business logic
- All new features must have tests
- All bug fixes must have a regression test
- Tests run in CI (GitLab) before any merge

---

## Test Framework — Vitest (not Jest)

### Why Vitest
- Native ESM support
- Compatible with Vite (frontend)
- Faster than Jest
- Same API as Jest (easy migration)
- TypeScript first-class support

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

### Unit Test (Service)
```ts
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: Record<string, vi.Mock>;

  beforeEach(async () => {
    mockRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      mockRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw UserNotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('999'))
        .rejects.toThrow(UserNotFoundException);
    });
  });
});
```

### Testing Rules (Backend)
- Mock ALL dependencies via NestJS `Test.createTestingModule`
- Use `vi.fn()` for mocks (Vitest API)
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
