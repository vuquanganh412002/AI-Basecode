# Vue 3 Frontend Development Guidelines

## Project Standards

### 1. File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Vue Components | `PascalCase.vue` | `UserList.vue` |
| Views | `[Feature]View.vue` | `UsersView.vue` |
| Shared Components | `Base[Noun].vue` | `BaseButton.vue` |
| Layouts | `[Name]Layout.vue` | `MainLayout.vue` |
| TypeScript | `kebab-case.ts` | `api-client.ts` |
| Composables | `use[Noun].ts` | `useAuth.ts` |
| Stores | `[feature].ts` | `auth.ts` (exports `useAuthStore`) |

### 2. Feature-Based Organization

Organize by feature/domain, NOT technical type:
```
src/features/users/
├── components/UserList.vue
├── composables/useUsers.ts
└── views/UsersView.vue
```

### 3. TypeScript Strict Mode

MANDATORY settings:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true
  }
}
```

PROHIBITED: `console.log()`, `debugger`, `any` types, `@ts-ignore` without justification.

### 4. JSDoc for Public APIs

```typescript
/**
 * @param page - 1-indexed page number
 * @returns Paginated user list
 */
export async function fetchUsers(page: number): Promise<PaginatedResponse<User>> {
  // Backend uses 0-indexed pagination
  return getUsersApi({ page: page - 1 });
}
```

## Component Architecture

### 1. Composition API (MANDATORY)

Use `<script setup>` with Composition API. Options API is PROHIBITED.

````vue
<!-- ✅ CORRECT -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUsersApi } from '@/api/generated';

const users = ref<User[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    users.value = (await getUsersApi()).data;
  } finally {
    loading.value = false;
  }
});
</script>

<!-- ❌ PROHIBITED: Options API -->
<script lang="ts">
export default defineComponent({
  data() { return { users: [] }; },
  mounted() { this.fetchUsers(); }
});
</script>
````

### 2. Props and Events Typing

Type all props and events with TypeScript:

````vue
<script setup lang="ts">
interface Props {
  users: User[];
  pageSize?: number;
}
const props = withDefaults(defineProps<Props>(), { pageSize: 10 });

const emit = defineEmits<{
  edit: [userId: string];
  'update:page': [page: number];
}>();
</script>
````

### 3. Template Rules

- `v-for` must have `:key` (unique, stable value — never use index)
- `v-if` and `v-for` must NOT be on the same element
- Use `computed` to filter list before `v-for`

```vue
<!-- ✅ Correct -->
<li v-for="user in activeUsers" :key="user.id">{{ user.name }}</li>

<!-- ❌ No :key -->
<li v-for="user in users">{{ user.name }}</li>

<!-- ❌ v-if + v-for on same element -->
<li v-for="user in users" v-if="user.isActive" :key="user.id">{{ user.name }}</li>
```

### 4. Component Nesting Depth

MAX 3 levels without justification:
```
UsersView → UserList → UserListItem → UserActions  ✅ Level 3
UsersView → ... → AvatarImage                       ❌ Level 5+
```
Deep nesting → Extract to composables.

### 4. Component Communication

- Parent → Child: Props
- Child → Parent: Events
- Cross-feature: Pinia stores

PROHIBITED: `$parent`, `$refs` for sibling access, global event bus.

### 5. Composables for Reuse

Extract shared logic to composables:

```typescript
// composables/useUsers.ts
export function useUsers() {
  const users = ref<User[]>([]);
  const loading = ref(false);
  
  async function fetchUsers() {
    loading.value = true;
    try {
      users.value = (await getUsersApi()).data;
    } finally {
      loading.value = false;
    }
  }
  
  return { users, loading, fetchUsers };
}
```

## Reactivity & Logic

### 1. Reactive State

- Primitives: `ref()`
- Objects: `reactive()`

```typescript
const count = ref(0);                     // ✅ Primitive
const user = reactive({ id: 1, name }});  // ✅ Object
const count = reactive(0);                // ❌ Loses reactivity on reassign
```

### 2. Computed Properties

Use `computed()` for derived state (memoized):

```typescript
const filteredUsers = computed(() =>
  users.value.filter(u => u.name.includes(searchQuery.value))
);

// ❌ Recalculates every render:
<div v-for="user in users.filter(u => u.name.includes(searchQuery))" />
```

### 3. Watchers (Use Sparingly)

Justify watchers; prefer `computed()` or lifecycle hooks.

```typescript
// ✅ Justified: Sync URL with state
watch(searchQuery, (q) => router.replace({ query: { q } }));

// ❌ Use computed instead:
watch([firstName, lastName], ([f, l]) => fullName.value = `${f} ${l}`);
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
```

### 4. Lifecycle Hooks

Avoid side effects in `<script setup>` body:

```typescript
// ✅ Fetch in onMounted
onMounted(() => fetchData());

// ❌ Runs before DOM ready
fetchData();
```

## State Management

### 1. Global State Justification (Pinia Stores)

Use Pinia stores ONLY for:
- User session/authentication
- Cross-feature entities (notifications)
- Application configuration (theme, locale)

Use local component state for:
- UI-only concerns (modal visibility, form inputs)
- Component-specific temporary data

```typescript
// stores/auth.ts ✅ Justified: Cross-feature authentication
// Auth uses HTTP-only Cookie session (Redis-backed). The session ID lives
// in the cookie (not accessible from JS), so the store only holds the
// decoded user payload.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: LoginCredentials) {
    const response = await loginApi(credentials);
    // Session cookie is set by the server; we only cache the user info.
    user.value = response.data.user;
  }

  return { user, isAuthenticated, login };
});
```

````vue
<!-- ✅ Local state for UI concern -->
<script setup lang="ts">
const isModalVisible = ref(false);
const formData = ref({ name: '', email: '' });
</script>
````

### 2. Store Structure (Composition API Style)

MUST use Composition API style (setup stores):

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([]);
  const currentUser = ref<User | null>(null);
  const loading = ref(false);

  // Getters
  const activeUsers = computed(() =>
    users.value.filter(user => user.status === 'active')
  );

  // Actions
  async function fetchUsers() {
    loading.value = true;
    try {
      users.value = (await getUsersApi()).data;
    } finally {
      loading.value = false;
    }
  }

  return { users, currentUser, loading, activeUsers, fetchUsers };
});
```

### 3. Secure Session Handling (CRITICAL)

Auth is session-cookie based. The `session_id` cookie is `HttpOnly` — not readable from JavaScript — so there is nothing for the store to hold. Only the decoded user payload lives in Pinia. NEVER put any token or session ID in `localStorage`/`sessionStorage`.

```typescript
// ✅ Cookie-managed session; store only caches the user profile
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: LoginCredentials) {
    // Backend sets an HttpOnly Set-Cookie: session_id=...
    const response = await loginApi(credentials);
    user.value = response.data.user;
  }

  return { user, isAuthenticated, login };
});

// ❌ PROHIBITED: storing session identifiers or tokens in localStorage
localStorage.setItem('session_id', sid);   // XSS-exfiltratable
localStorage.setItem('accessToken', token); // Same problem
```

Axios / Orval client must be created with `withCredentials: true` so the browser attaches the session cookie on every request.

### 4. Store Mutations via Actions Only

````vue
<script setup lang="ts">
const userStore = useUserStore();

await userStore.fetchUsers();       // ✅ Action call
userStore.users = response.data;    // ❌ Direct mutation
</script>
````

## API & Data Fetching

### 1. Orval-Generated API Client (MANDATORY)

Use Orval-generated client from `src/api/generated`. Manual `fetch()`/`axios` to backend is PROHIBITED.

```typescript
// ✅ Using auto-generated API client
import { getUsersApi, createUserApi } from '@/api/generated';

async function fetchUsers() {
  return (await getUsersApi()).data;
}

// ❌ Manual fetch bypassing generated client
async function fetchUsers() {
  const response = await fetch('/api/users');
  return response.json();
}
```

Exception: Third-party APIs (Google Maps, Stripe) may use direct `fetch()` or SDK.

### 2. API Client Regeneration

Regenerate when OpenAPI contract changes:
```bash
npm run api:generate
npm run api:watch  # Watch mode
```

### 3. Error Handling

Handle API errors and display user-friendly messages:

```typescript
const error = ref<string | null>(null);

async function fetchUsers() {
  loading.value = true;
  error.value = null;
  try {
    users.value = (await getUsersApi()).data;
  } catch (err) {
    error.value = 'Failed to fetch users. Please try again.';
    message.error('Failed to fetch users');
    console.error('API error:', err);
  } finally {
    loading.value = false;
  }
}
```

### 4. Loading States & Request Cancellation

```typescript
const loading = ref(false);
let cancelTokenSource = axios.CancelToken.source();

async function fetchUsers() {
  if (loading.value) return;  // Prevent duplicates
  
  loading.value = true;
  cancelTokenSource.cancel('New request started');
  cancelTokenSource = axios.CancelToken.source();
  
  try {
    users.value = (await getUsersApi({ cancelToken: cancelTokenSource.token })).data;
  } catch (err) {
    if (!axios.isCancel(err)) console.error(err);
  } finally {
    loading.value = false;
  }
}
```

## Accessibility (A11y)

### 1. ARIA Labels and Semantic HTML

Use semantic HTML and ARIA labels for interactive elements:

````vue
<template>
  <nav aria-label="Main navigation">
    <button type="button" aria-label="Open menu" @click="toggleMenu">
      <MenuIcon />
    </button>
  </nav>

  <form @submit.prevent="handleSubmit">
    <label for="email">Email Address</label>
    <input id="email" v-model="email" type="email" required />
    <button type="submit">Submit</button>
  </form>
</template>
````

PROHIBITED:
- Icon buttons without `aria-label`
- Inputs without associated `<label>`
- Clickable `<div>` instead of `<button>`

### 2. Keyboard Navigation

Ensure all interactive features accessible via keyboard:

````vue
<template>
  <div
    role="button"
    tabindex="0"
    @click="handleAction"
    @keydown.enter="handleAction"
    @keydown.space.prevent="handleAction"
  >
    Click or press Enter/Space
  </div>
</template>
````

## Performance

### 1. Route-Based Code Splitting (MANDATORY)

Use lazy loading for all routes:

```typescript
// router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),  // ✅ Lazy loaded
    children: [
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/features/users/views/UsersView.vue'),  // ✅ Lazy loaded
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/features/settings/views/SettingsView.vue'),  // ✅ Lazy loaded
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
```

PROHIBITED: Synchronous imports (no code splitting).

### 2. Component Lazy Loading

Lazy load large components (> 50 KB) using `defineAsyncComponent`:

````vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// ✅ Heavy chart component lazy loaded
const HeavyChart = defineAsyncComponent(() =>
  import('@/components/HeavyChart.vue')
);

const showChart = ref(false);
</script>

<template>
  <button @click="showChart = true">Load Chart</button>
  <HeavyChart v-if="showChart" />
</template>
````

### 3. Performance Budget Enforcement (CRITICAL)

CONSTRAINT: CI pipeline FAILS if bundle size exceeds limits.

- **Main bundle**: < 250 KB (gzipped)
- **Route chunks**: < 100 KB (gzipped)

Check bundle size:
```bash
npm run build:analyze
```

Mitigation if budget exceeded:
1. Split large components into async components
2. Remove unused dependencies (`npm run analyze`)
3. Use dynamic imports for conditional features
4. Request ADR approval for budget increase (requires justification)

### 4. Image Optimization

Optimize images: WebP format, lazy loading, responsive sizes.

````vue
<template>
  <picture>
    <source srcset="/images/hero.webp" type="image/webp" />
    <img
      src="/images/hero.jpg"
      alt="Hero banner"
      loading="lazy"
      width="1200"
      height="600"
    />
  </picture>
</template>
````

## Security & Error Handling

### 1. XSS Prevention (CRITICAL)

Sanitize user-generated HTML before rendering. NEVER use `v-html` with unsanitized content.

````vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import DOMPurify from 'dompurify';

const userContent = ref('<script>alert("XSS")</script><p>Safe content</p>');

// ✅ Sanitize before rendering
const sanitizedContent = computed(() => DOMPurify.sanitize(userContent.value));
</script>

<template>
  <div v-html="sanitizedContent"></div>
</template>
````

PROHIBITED:
````vue
<!-- ❌ XSS vulnerability -->
<template>
  <div v-html="userContent"></div>
</template>
````

### 2. Error Boundaries and User Feedback

Catch errors gracefully and display user-friendly messages:

````vue
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { message } from 'ant-design-vue';

const errorMessage = ref<string | null>(null);

onErrorCaptured((err) => {
  console.error('Component error:', err);
  errorMessage.value = 'Something went wrong. Please refresh the page.';
  message.error('An error occurred');
  return false;  // Prevent error propagation
});
</script>

<template>
  <a-alert v-if="errorMessage" type="error" :message="errorMessage" closable />
  <slot />
</template>
````

### 3. Sensitive Data Protection

PROHIBITED: Logging tokens, passwords, or personal data to console or analytics.

```typescript
async function login(credentials: LoginCredentials) {
  try {
    const response = await loginApi(credentials);
    console.log('Login successful');  // ✅ No sensitive data
    return response.data;
  } catch (err) {
    console.error('Login failed');  // ✅ No credentials logged
    throw err;
  }
}
```

PROHIBITED:
```typescript
async function login(credentials: LoginCredentials) {
  console.log('Login attempt:', credentials);    // ❌ Password logged
  const response = await loginApi(credentials);
  console.log('Session established for:', response.headers['set-cookie']); // ❌ Session ID logged
  return response.data;
}
```

## Testing

### 1. Unit Tests (Vitest)

Write unit tests for composables and business logic. Target: > 80% coverage.

```typescript
// composables/useAuth.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from './useAuth';
import { loginApi } from '@/api/generated';

vi.mock('@/api/generated');

describe('useAuth', () => {
  it('should login successfully', async () => {
    // Session cookie is set by the server; the response body only
    // contains the user payload.
    const mockResponse = { data: { user: { id: 1 } } };
    vi.mocked(loginApi).mockResolvedValue(mockResponse);

    const { login, user, isAuthenticated } = useAuth();
    await login({ email: 'test@example.com', password: 'password' });

    expect(user.value).toEqual({ id: 1 });
    expect(isAuthenticated.value).toBe(true);
  });

  it('should handle login failure', async () => {
    vi.mocked(loginApi).mockRejectedValue(new Error('Invalid credentials'));

    const { login, error } = useAuth();
    await login({ email: 'test@example.com', password: 'wrong' });

    expect(error.value).toBe('Login failed');
  });
});
```

### 2. Component Tests (Vue Test Utils)

Write component tests for interactive components.

```typescript
// components/UserList.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserList from './UserList.vue';

describe('UserList', () => {
  it('renders users correctly', () => {
    const users = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
    ];

    const wrapper = mount(UserList, {
      props: { users, loading: false },
    });

    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('Jane Doe');
  });

  it('emits edit event on button click', async () => {
    const users = [{ id: '1', name: 'John Doe', email: 'john@example.com' }];
    const wrapper = mount(UserList, {
      props: { users, loading: false },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual(['1']);
  });
});
```

### 3. E2E Tests (Playwright)

Write E2E tests for critical user flows.

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('.ant-message-error')).toBeVisible();
  });
});
```

---

## Router & Navigation Guards

### Route Configuration (Lazy Loading)

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'dokusya', name: 'DokusyaSearch', component: () => import('@/views/dokusya/DokusyaSearchView.vue'), meta: { permission: 'dokusya.view' } },
    ],
  },
];
```

### Auth Navigation Guard

```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
    return next({ name: 'Forbidden' });
  }

  next();
});
```

---

## Ant Design Vue Patterns

### Table with Pagination

```vue
<template>
  <a-table
    :columns="columns"
    :data-source="data"
    :loading="loading"
    :pagination="{ current: page, pageSize: limit, total }"
    @change="handleTableChange"
    row-key="id"
  />
</template>
```

### Form with Validation

```vue
<template>
  <a-form :model="formState" :rules="rules" @finish="handleSubmit" layout="vertical">
    <a-form-item label="Name" name="name">
      <a-input v-model:value="formState.name" />
    </a-form-item>
    <a-form-item label="Email" name="email">
      <a-input v-model:value="formState.email" />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="submitting">Submit</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
const formState = reactive({ name: '', email: '' });
const rules = {
  name: [{ required: true, message: 'Name is required' }],
  email: [{ required: true, type: 'email', message: 'Valid email required' }],
};
</script>
```

### Modal Confirmation

```vue
<template>
  <a-modal v-model:open="visible" title="Confirm Delete" @ok="handleDelete" ok-type="danger">
    <p>Are you sure you want to delete this record?</p>
  </a-modal>
</template>
```

### UI Rules
- Ant Design Vue for complex components (Table, Form, Modal, DatePicker, Select)
- Tailwind CSS for layout and spacing
- Never mix inline styles with Tailwind
- Use `a-message` for success/error notifications
- Use `a-spin` for loading states

