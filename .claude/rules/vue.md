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

### 4. Path aliases — `@/` (src) and `@test/` (test)

The frontend uses two path aliases configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`:

| Alias | Resolves to | Use for |
|---|---|---|
| `@/...` | `apps/frontend/src/...` | All imports from production source |
| `@test/...` | `apps/frontend/test/...` | Imports from `test/fixtures`, `test/utils` |

**Mandatory**: NEVER use `'../...'` relative imports that traverse the source tree. The only acceptable relative imports are `'./sibling-file'` (same directory).

```ts
// ✅ Correct
import LoginView from '@/views/auth/LoginView.vue';
import { useAuthStore } from '@/stores/auth.store';
import { buildUser } from '@test/fixtures/auth.fixture';
import { setup } from './helpers';   // same-folder sibling — fine

// ❌ Wrong — relative paths going up
import LoginView from '../LoginView.vue';
import { buildUser } from '../../../../test/fixtures/auth.fixture';
```

Why: refactoring (moving a file, renaming a folder) doesn't break imports; reading an import line tells you exactly where the symbol lives without counting `../`s.

### 5. JSDoc for Public APIs

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

The shared axios instance (`src/api/axios-instance.ts`) MUST be created with `withCredentials: true` so the browser attaches the session cookie on every request.

### 4. Store Mutations via Actions Only

````vue
<script setup lang="ts">
const userStore = useUserStore();

await userStore.fetchUsers();       // ✅ Action call
userStore.users = response.data;    // ❌ Direct mutation
</script>
````

## API & Data Fetching

### 1. Hand-written axios wrappers (MANDATORY)

Each backend tag gets one wrapper file at `src/api/<tag>/<tag>.ts` that
imports the shared `axiosInstance` and exposes typed functions for every
endpoint. Views/composables/stores import only from these wrappers —
never call `fetch()` or instantiate axios elsewhere.

```typescript
// ✅ Hand-written wrapper — src/api/users/users.ts
import axiosInstance from '@/api/axios-instance';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface UserListResponse {
  data: User[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

export async function listUsers(params: { page?: number } = {}): Promise<UserListResponse> {
  const res = await axiosInstance.get<UserListResponse>('/api/v1/users', { params });
  return res.data;
}

// ❌ View bypassing the wrapper
async function fetchUsers() {
  const response = await fetch('/api/v1/users');
  return response.json();
}
```

**Why hand-written, not Orval-generated**: tried Orval-delegation
across all 14 modules; trade-offs (type lossy `nullable: true` →
`{ [k:string]: unknown } | null`, intentional FE/BE type divergence
on m_code radio bindings, factory-wrapped ugly function names, extra
build step + generated folder churn in PRs) outweighed the manual-sync
risk at this codebase size. Reverted in commit `<rollback>` —
hand-written wrappers stay as the canonical pattern.

The BE Swagger UI at `/api/docs` and the on-disk snapshot via
`npm run swagger:export` (BE-only) remain available for testing tools
and offline docs.

Exception: Third-party APIs (Google Maps, Stripe) may use direct
`fetch()` or SDK.

### 2. Wrapper conventions

- File per BE controller: `src/api/<tag>/<tag>.ts`
- Export DTO-mirror interfaces + envelope helpers + async functions
- Functions return the unwrapped body (most cases `res.data`; for
  `{ data, meta }` list endpoints, return the whole envelope so the
  caller has access to pagination meta)
- Spec lives at `src/api/__tests__/<tag>.spec.ts`, mocks `axiosInstance`

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

## Code Master (m_code) — dropdowns & labels

The project enumerates 21 business categories (性別, 単価種類, 支払方法, お知らせ種別, …) via the backend `m_code` table. FE does NOT hardcode these values — they come from `GET /api/v1/codes`, cached in `useCodesStore` for the session.

### Group A vs Group B — when to add a TS enum

The 21 categories split into two groups by whether the values participate
in **branching logic**:

| Group | Pattern | Example categories |
|---|---|---|
| **A** — fixed-set, has BE branching | TS enum at [`apps/frontend/src/constants/enums/`](../../apps/frontend/src/constants/enums/) (mirroring [`apps/backend/src/common/enums/`](../../apps/backend/src/common/enums/)) **+** label via `useCodesStore().label(...)` | `LOG_TYPE`, `RESULT_STATUS`, `LOGIN_RESULT`, `OTP_TYPE`, `OSHIRASE_STATUS`, `PUBLISH_LOCATION` |
| **B** — extensible, pure display | `m_code`-only — no enum. Both options and labels via `useCodesStore`. | `DOKUSYA_SHUBETSU`, `SHIHARAI_HOHO`, `GENDER`, `TANKA_TYPE`, `OSHIRASE_TYPE`, `DOWNLOAD_TYPE`, … |

**Group A criteria** (all must hold):
1. The set of values is fixed by business design (not extensible at runtime).
2. Code branches on the value (`if (status === Status.Public) …`, `switch`, etc.).
3. Adding a new value would require code review (new business case, new branch).

If a customer renames `m_code.code_name` for a Group A category, the
label flips immediately (`useCodesStore().reload()` after BE
`POST /codes/reload`); **no redeploy** because the enum holds VALUES
only, never the customer-visible string. Adding a new VALUE *does*
require a deploy because the enum + branching logic must be updated.

**Group B**: no enum. Customer can extend at runtime; FE just renders
whatever `useCodesStore().options(category)` returns.

### Group A file layout

```
apps/frontend/src/constants/enums/
├── index.ts              # barrel re-export
├── log-type.ts           # mirror of apps/backend/src/common/enums/log-type.enum.ts
├── result-status.ts
├── login-result.ts
├── otp-type.ts
├── oshirase-status.ts
└── publish-location.ts
```

```ts
// apps/frontend/src/constants/enums/log-type.ts
export const LogType = {
  USER_OPERATION: 1,
  SYSTEM: 2,
  ERROR: 3,
  FILE_OPERATION: 4,
} as const;
export type LogType = (typeof LogType)[keyof typeof LogType];
```

**Naming convention** (also in `naming-conventions.md`):
- Identifier (`LogType`): PascalCase. Same name for both the value
  (`const`) and the derived type alias — TS merges them across the
  value/type namespaces.
- Members (`USER_OPERATION`): UPPER_SNAKE_CASE — these are fixed
  numeric constants, project rule for constants applies.

**Why `const … as const` instead of `enum`**:
- `enum` emits IIFE runtime code that can't run on Node native TS
  (`--experimental-strip-types`) and isn't compatible with TS's
  `--erasableSyntaxOnly` mode.
- Numeric `enum` adds reverse-mapping keys (`Object.values(LogType)`
  returns `[1, 2, 3, 4, 'USER_OPERATION', 'SYSTEM', 'ERROR', 'FILE_OPERATION']`
  — 8 entries, half are noise) that footgun any iteration / `@IsIn`
  validation.
- `as const` produces a plain object — fully tree-shakable, type-erasable,
  no surprises with `Object.values`.

Each FE enum file has a **matching BE file at the parallel path**.
The integration test `apps/backend/test/integration/enum-sync.spec.ts`
parses both sides and **fails CI on any drift** (renamed key, different
number, missing member, missing file). This is intentionally NOT a
shared workspace package — keeping them separate keeps the dependency
boundary clean; the sync test is the contract.

### Group A usage — constant for branching, m_code for display

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCodesStore } from '@/stores/codes.store';
import { OshiraseStatus } from '@/constants/enums';

const codes = useCodesStore();
const props = defineProps<{ status: number }>();

// Branching logic uses the constant (type-safe, refactor-safe).
const isPublishing = computed(() => props.status === OshiraseStatus.PUBLIC);

// Display always uses m_code (customer-editable).
const statusLabel = computed(() => codes.label('OSHIRASE_STATUS', props.status));
</script>

<template>
  <a-tag :color="isPublishing ? 'green' : 'default'">
    {{ statusLabel }}
  </a-tag>
</template>
```

**Never** write the branching as `props.status === 2` — magic number.
**Never** write the label as `{ 1: '下書き', 2: '公開' }[props.status]` —
hardcoded.

### Rules

- Never hardcode options or label maps in views / constants files. **Includes radio groups, checkboxes, segmented controls — not just `<a-select>`.** Customer can change `m_code.code_name` from the DB (e.g. `'購読料'` → `'新聞購読料'`) and expects every dropdown / radio / table cell to reflect the new label without an FE redeploy.
- Never call `getCodes()` directly from a view. Always go through `useCodesStore`.
- `useCodesStore().loadAll()` is called once per session from `auth.store.ts` after login / MFA / `refreshSession` succeeds. Views assume the cache is populated.
- `useCodesStore().reset()` is called from `auth.store.ts` on logout / 401 so the next user starts fresh.

### ❌ Banned patterns (caught in past reviews)

```vue
<!-- ❌ Hardcoded radio option labels -->
<a-radio-group v-model:value="formState.zei_kubun">
  <a-radio value="1">内税</a-radio>
  <a-radio value="2">外税</a-radio>
</a-radio-group>

<!-- ❌ Hardcoded radio with drift from DB seeder
     (DB has '購読料', UI shows '新聞購読料') -->
<a-radio-group v-model:value="state.filters.tanka_type">
  <a-radio :value="1">新聞購読料</a-radio>
  <a-radio :value="2">配達手数料</a-radio>
</a-radio-group>

<!-- ❌ Inline label map for table cell display -->
<template v-if="column.key === 'zei_kubun'">
  {{ { 1: '内税', 2: '外税' }[record.zei_kubun] }}
</template>

<!-- ❌ Local constants file mirroring m_code -->
// constants/zei-kubun.ts
export const ZEI_KUBUN_OPTIONS = [
  { value: 1, label: '内税' },
  { value: 2, label: '外税' },
];
```

### ✅ Canonical replacements

```vue
<!-- ✅ Radio group looped from m_code (preferred when you need radio UX) -->
<script setup lang="ts">
import { useCodesStore } from '@/stores/codes.store';
const codes = useCodesStore();
</script>

<template>
  <a-radio-group v-model:value="formState.zei_kubun">
    <a-radio
      v-for="opt in codes.options('ZEI_KUBUN')"
      :key="opt.value"
      :value="String(opt.value)"
    >
      {{ opt.label }}
    </a-radio>
  </a-radio-group>
</template>
```

```vue
<!-- ✅ Dropdown — prefer <BaseCodeSelect> wrapper for less boilerplate -->
<BaseCodeSelect category="ZEI_KUBUN" v-model:value="formState.zei_kubun" />
```

**Type-coercion gotcha** (caught when migrating `JaFormView` / `TankaListView`):
`CodeService.normalizeValue()` (BE) emits `value: number` when `code_value` parses
as integer (e.g. `'1'` → `1`). But form state is bound differently per view:

| Form state type | Coerce in template |
|---|---|
| `string` (e.g. `<a-radio value="1">`, `formState.zei_kubun: '1' \| '2'`) | `:value="String(opt.value)"` |
| `number` (e.g. `<a-radio :value="1">`, `state.filters.tanka_type: 1 \| 2`) | `:value="Number(opt.value)"` |

Antd's radio match is strict-equal — without coercion the option won't highlight as selected when loading existing data.

### Usage — dropdown (`<a-select>`)

```vue
<script setup lang="ts">
import { useCodesStore } from '@/stores/codes.store';
const codes = useCodesStore();
const formState = reactive({ tanka_type: 1 });
</script>

<template>
  <a-form-item label="単価種類" name="tanka_type">
    <a-select v-model:value="formState.tanka_type" :options="codes.options('TANKA_TYPE')" />
  </a-form-item>
</template>
```

### Usage — table cell (value → Japanese label)

```vue
<script setup lang="ts">
import { useCodesStore } from '@/stores/codes.store';
const codes = useCodesStore();
</script>

<template>
  <a-table :columns="cols" :data-source="rows">
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'tanka_type'">
        {{ codes.label('TANKA_TYPE', record.tanka_type) }}
      </template>
    </template>
  </a-table>
</template>
```

Use `codes.labelShort(...)` when column width is tight.

### Categories currently seeded (source of truth: `docs/database/seeder.md §5`)

`DOKUSYA_SHUBETSU`, `TETSUZUKI_SHURUI`, `DENSHI_DOKUSYA_SHUBETSU`, `SHIHARAI_HOHO`, `GENDER`, `YOKIN_SHUBETSU`, `ZEI_KUBUN`, `TANKA_TYPE`, `ITAKU_KUBUN`, `TESURYO_KUBUN`, `YUBIN_KUBUN`, `MAIL_MAGAZINE_FLG`, `OSHIRASE_TYPE`, `PUBLISH_LOCATION`, `OSHIRASE_STATUS`, `LOG_TYPE`, `RESULT_STATUS`, `FILE_UPLOAD_STATUS`, `DOWNLOAD_TYPE`, `LOGIN_RESULT`, `OTP_TYPE`.

### Testing pattern

Component tests stub the store via `createTestingPinia`:

```ts
import { createTestingPinia } from '@pinia/testing';
import { useCodesStore } from '@/stores/codes.store';

const pinia = createTestingPinia({
  initialState: {
    codes: {
      all: {
        TANKA_TYPE: [
          { value: 1, label: '購読料', label_short: '購読料' },
          { value: 2, label: '配達手数料', label_short: '配達手数料' },
        ],
      },
    },
  },
});
mount(TankaCreateView, { global: { plugins: [pinia] } });
```

---

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

### Named routes only — NEVER navigate by literal path

[`router/index.ts`](../../apps/frontend/src/router/index.ts) is the single source of truth for paths AND names — that is the centralization mechanism. Call sites MUST use `{ name: '...' }` (and `{ name, params }` when needed), never `{ path: '/...' }` literal.

```ts
// ✅ Correct — named route
router.push({ name: 'Dashboard' })
router.push({ name: 'JaEdit', params: { id: row.ja_id } })
<router-link :to="{ name: 'JaList' }">JA一覧</router-link>

// Breadcrumb meta — same rule
meta: {
  breadcrumb: [
    { label: 'JAマスタ明細検索', to: { name: 'JaList' } },   // ✅
    { label: 'JAマスタ登録画面' },
  ],
}

// ❌ Wrong — path literal
router.push({ path: '/dashboard' })
router.push('/ja/' + id + '/edit')
<router-link to="/ja">JA一覧</router-link>
meta: { breadcrumb: [{ label: 'JAマスタ明細検索', to: '/ja' }, ...] }
```

Why: renaming a path (`/login` → `/sign-in`) only requires editing `router/index.ts`; every named call site keeps working. Path literals scatter the URL — rename ripples through every caller, easy to miss in templates.

DO NOT introduce a `ROUTE_NAMES.LOGIN = 'Login'` constant table. With ~10 named routes, the indirection costs more than typo-safety it adds — Vue Router types check `RouteLocationRaw`, IDE rename on the literal `'Login'` already finds all references, and adopting `unplugin-vue-router` later gives full compile-time safety in one shot. Keep the convention literal-named for now.

### Route param naming — `:id` for the resource PK

Use `:id` for the primary key of the resource the route addresses. Reserve `:<resource>_id` ONLY when the same path needs to disambiguate two IDs (`/ja/:id/branches/:branch_id`). Reasons:

- Mirrors REST/BE convention (BE controllers expose `/api/v1/ja/:id`, not `/:ja_id`)
- Shorter, fewer characters in URL + callsite
- Inside the view, alias to a meaningful local: `const jaIdParam = computed(() => Number(route.params.id))` — local naming carries the semantic without bloating the URL

```ts
// ✅ Correct
{ path: ':id/edit', name: 'JaEdit' }
router.push({ name: 'JaEdit', params: { id: row.ja_id } })

// ❌ Wrong — redundant prefix on a single-ID route
{ path: ':ja_id/edit', name: 'JaEdit' }
router.push({ name: 'JaEdit', params: { ja_id: row.ja_id } })
```

(The DOMAIN field on entities + API responses stays `ja_id` — the rule only governs URL path params.)

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
import { message } from 'ant-design-vue';

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
    // No /403 page — toast + bounce to dashboard. Avoids leaving the
    // user on a dead-end error screen; they always have a place to go.
    message.error('この画面へのアクセス権限がありません');
    return next({ name: 'Dashboard' });
  }

  next();
});
```

### No standalone error pages — always bounce to /dashboard

The project intentionally has **no `/403` and no `/404` pages**. Both
flow back to `/dashboard`:

| Trigger | Behavior |
|---|---|
| Permission denied (client guard or API `FORBIDDEN`) | `message.error('この画面へのアクセス権限がありません')` + `router.push({ name: 'Dashboard' })` |
| Unknown URL (`/:pathMatch(.*)*`) | Silent `redirect: { name: 'Dashboard' }` (no toast — user typed junk) |
| Session expired (`UNAUTHORIZED`) | clear user + `router.push({ name: 'Login', query: { redirect } })` |

Rationale: a dead-end error page leaves the user with nowhere to go.
Bouncing to the dashboard always gives them a working starting point,
and the toast (for permission cases) explains *why* they didn't end up
where they clicked.

Catch-all route shape:
```ts
// router/index.ts — last entry
{ path: '/:pathMatch(.*)*', redirect: { name: 'Dashboard' } },
```

Do NOT add a route named `Forbidden` or `NotFound` — nothing should
push to them. The two callers that exist are the navigation guard
above and `src/api/error-handler.ts` for `FORBIDDEN`; both push to
`Dashboard` directly.

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

**Convention**: confirm dialogs (delete, generic yes/no) use **`はい` / `いいえ`** for the OK / Cancel buttons. The destructive intent is conveyed by `okType: 'danger'` (red button), not by the label text. `BaseConfirmModal` defaults to `はい / いいえ`; inline `Modal.confirm` calls must pass them explicitly.

```ts
// ✅ Inline Modal.confirm — set okText/cancelText explicitly
Modal.confirm({
  title: '削除確認',
  content: 'このJAを削除してもよろしいですか？',
  okText: 'はい',
  okType: 'danger',
  cancelText: 'いいえ',
  async onOk() { await removeJa(row.ja_id) },
});

// ✅ BaseConfirmModal — defaults are はい / いいえ; just add `danger`
<BaseConfirmModal
  :open="deleteTarget !== null"
  title="削除確認"
  :content="`単価「${target.tanka_name}」を削除してもよろしいですか？`"
  danger
  @ok="confirmDelete"
/>
```

**Exception** — action-specific dialogs (e.g. MFA toggle) keep verb-style
labels for clarity:
```ts
Modal.confirm({
  title: 'MFAを有効にしますか？',
  okText: '有効にする',     // verb, not はい — clarifies the action
  cancelText: 'キャンセル',
  okType: 'primary',
});
```
Use this exception sparingly — only when the verb genuinely disambiguates. For
plain "are you sure?" prompts (delete, archive, discard changes) → はい / いいえ.

```vue
<template>
  <!-- Quick reference for plain a-modal usage -->
  <a-modal v-model:open="visible" title="削除確認" @ok="handleDelete" ok-type="danger" ok-text="はい" cancel-text="いいえ">
    <p>このレコードを削除してもよろしいですか？</p>
  </a-modal>
</template>
```

### UI Rules
- Ant Design Vue for complex components (Table, Form, Modal, DatePicker, Select)
- Tailwind CSS for layout and spacing
- Never mix inline styles with Tailwind
- Use `a-message` for success/error notifications
- Use `a-spin` for loading states

---

## Design Tokens (MANDATORY)

Single source of truth: [`src/design-tokens.ts`](../../apps/frontend/src/design-tokens.ts) (TS) +
mirrored in [`src/styles/tailwind.css`](../../apps/frontend/src/styles/tailwind.css) `@theme` block.

**Never** hardcode colors, font families, or use raw Tailwind palette classes
(`text-slate-700`, `bg-white`, `border-red-500`, etc.) in templates. Use semantic
utility classes that resolve to the project's tokens. To re-skin the app for a
new client, change values in `design-tokens.ts` + `tailwind.css` once — no
template files should need touching.

### Available semantic utility classes

#### Brand & status colors
| Class | Meaning |
|---|---|
| `bg-primary` `text-primary` `border-primary` | 主色 — primary action |
| `bg-primary-hover` | Hover state of primary |
| `bg-success` `text-success` | 成功 - green |
| `bg-warning` `text-warning` | 警告 - amber |
| `bg-error` `text-error` `hover:text-error-hover` | エラー - red (delete actions) |
| `bg-info` `text-info` | 情報 - blue |
| `bg-success-subtle` `bg-warning-subtle` `bg-error-subtle` `bg-info-subtle` | Tinted backgrounds for badges/banners |

#### Text hierarchy (4 levels — flips dark/light automatically)
| Class | Use for | AntD equivalent |
|---|---|---|
| `text-text-main` | Body, headings | `colorText` (.88) |
| `text-text-description` | Form labels, help text | `colorTextSecondary` (.65) |
| `text-text-secondary` | Captions, fine print | `colorTextTertiary` (.45) |
| `text-text-disabled` | Disabled state | `colorTextQuaternary` (.25) |
| `text-icon` | Menu/list icons | — |

#### Surfaces (page / card backgrounds)
| Class | Use for |
|---|---|
| `bg-bg-layout` | Page background (under cards) |
| `bg-surface-card` | Cards, modals, sidebars (white / slate-900) |
| `bg-surface-card-subtle` | Card header bars, banners (slate-50 / slate-800/30) |
| `bg-surface-hover` `hover:bg-surface-hover` | Row hover state |
| `bg-surface-active` | Selected/active row tint |

#### Borders & dividers
| Class | Use for |
|---|---|
| `border-border` `divide-border` | Default borders for cards/sections |
| `border-border-strong` | Form input borders, table cells |
| `border-surface-card` | Border that blends with card surface (e.g. notification dot ring) |

#### Typography & shape
| Class | Token |
|---|---|
| `font-display` | Noto Sans JP, Inter, sans-serif |
| `rounded-ant` | 6px (matches AntD default) |
| `shadow-ant-card` | AntD card shadow |

### Examples

```vue
<!-- ✅ Card with semantic surface + border + text -->
<div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-6">
  <h3 class="font-bold text-text-main">単価マスタ</h3>
  <p class="text-text-description text-sm mt-1">編集対象を選択してください</p>
</div>

<!-- ✅ Status badge -->
<span class="bg-error-subtle text-error px-3 py-1 rounded text-sm font-bold">
  承認待ち
</span>

<!-- ✅ Hover row -->
<a class="block px-4 py-3 hover:bg-surface-hover text-text-main">…</a>

<!-- ✅ Delete action -->
<button class="text-error hover:text-error-hover font-medium">削除</button>

<!-- ❌ DO NOT — raw palette / hardcode -->
<div class="bg-white dark:bg-slate-900 border-slate-200 text-slate-700">
<button class="text-red-500 hover:text-red-700">削除</button>
<span style="color: #1677ff">JA</span>
```

### When you need a new token

1. Add to [`src/design-tokens.ts`](../../apps/frontend/src/design-tokens.ts).
2. Mirror in [`src/styles/tailwind.css`](../../apps/frontend/src/styles/tailwind.css) under `@theme` (static) or `@theme inline` + `:root/.dark` (flips with dark mode).
3. If AntD components also need it, pass through `ConfigProvider` token in [`src/App.vue`](../../apps/frontend/src/App.vue).

### Locale & font
- Locale `jaJP` is set globally in `App.vue` via `<ConfigProvider :locale="jaJP">`.
- Body font is `Noto Sans JP` (loaded via `<link>` in `index.html` and used by both AntD `fontFamily` token and Tailwind `font-display`).

### What NOT to use
- ❌ Raw Tailwind palette colors for text/bg/border in app code: `text-slate-*`, `bg-white`, `bg-red-50`, `border-slate-200`, `text-amber-500`, etc.
- ❌ Inline `style="color: ..."` or hardcoded hex/rgb in templates.
- ❌ Custom `dark:` variants for colors that already have a runtime token (let `--text-main` etc. flip automatically).
- Exceptions:
  - `bg-black/40` for modal backdrops (semantic value: opaque overlay) — fine.
  - Specific decorative colors (e.g. `text-amber-500 dark:text-sky-300` on the dark-mode toggle's sun/moon icon) — fine when intentional.

---

## Reusable Building Blocks (MANDATORY)

Reach for the existing primitive before writing new code. These are the
common patterns extracted across screens — do not re-implement them
inline. If the pattern needs a new variant, extend the primitive instead
of forking it.

### Composables (`src/composables/`)

| Composable | Use for |
|---|---|
| `useApiForm()` | Form submit + field-error mapping. Returns `{ submitting, fieldErrors, submit }`. Caller's `<a-form-item :validate-status="fieldErrors.X ? 'error' : ''" :help="fieldErrors.X">` shows server-side validation. |
| `useTableQuery<F>({...})` | List screens — pagination + sort + filter state, URL-syncing. Returns `{ state, loading, total, onChange, applyFilters, resetFilters }`. |
| `useNotify()` | Centralized success toasts: `.created()`, `.updated()`, `.deleted()`, `.uploaded()`, `.downloaded()` — all 0-arg, project-wide verb-only convention (`'登録しました。'` not `'JAを登録しました。'`). The button + screen imply the subject. Use this instead of raw `message.success(...)` so all screens use uniform Japanese phrasing. For genuinely custom copy use `notify.success(text)`. |
| `useAuth()` | Wraps the auth store. Returns `{ user, login, logout, hasPermission }`. |
| `useBreadcrumb()` | Auto-builds breadcrumb from route hierarchy. |
| `useDarkMode()` | Light/dark toggle state. |
| `useSidebar()` | Sidebar open/close + responsive breakpoint. |
| `useMenu({ excludeRoot? })` | Returns the canonical sidebar/dashboard menu — permission-filtered against the current session. Both `AppSidebar.vue` and `DashboardView.vue` consume this; never inline a menu list anywhere else. |

### Common components (`src/components/common/`)

| Component | Replaces |
|---|---|
| `<BaseCard>` | `<div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">` |
| `<BaseDataTable>` | `<a-table>` with project conventions baked in: pagination at `bottomLeft` with `'/ 頁'` label, horizontal scroll (`scroll: { x: 'max-content' }`), 1rem horizontal padding on first/last cells (alignment with the `p-4` title bar), sort-icon next to the column title (not pushed to the cell's right edge), table title slot, `change` event for sort + pagination |
| `<BaseSearchForm>` | Search-form card with grid layout + 検索 / クリア buttons |
| `<BaseActionColumn>` | 編集 / 削除 link pair for table rows |
| `<BaseConfirmModal>` | 削除確認 modal — pass `:open`, `:content`, `danger` |
| `<BaseFormFooter>` | Submit + Cancel button bar at the bottom of every create/edit form |
| `<BaseCodeSelect>` | `<a-select>` bound to an m_code category. `<BaseCodeSelect category="TANKA_TYPE" v-model:value="form.tanka_type" />` instead of importing `useCodesStore` and passing `:options="codes.options(...)"` every time. |
| `<BasePageHeader>` | Page title + auto breadcrumb above content |
| `<BaseIconButton>` | Round icon button with optional badge dot |
| `<NoticeList>` | Public notice list (login screen / dashboard) |
| `<MfaInput>` | 6-digit OTP input with auto-focus + paste support |

### Formatters (`src/utils/formatters.ts`)

Always render API values through these — never inline `value.toLocaleString()` or string concat. Each formatter returns `''` for `null/undefined` so callers don't have to guard.

| Function | Output |
|---|---|
| `formatYen(3500)` | `¥3,500` |
| `formatNumber(12345)` | `12,345` |
| `formatTaxRate(10)` | `10%` |
| `formatDate(iso)` | `YYYY/MM/DD` (Japanese-locale dayjs) |
| `formatDateTime(iso)` | `YYYY/MM/DD HH:mm` |
| `formatYearMonth(iso)` | `YYYY/MM` |
| `formatPostalCode('1234567')` | `123-4567` |
| `formatPhone('0312345678')` | `03-1234-5678` (10 or 11 digits) |
| `truncate(str, 20)` | `<= 20 chars + "…"` |

### Date/Time — pin to Asia/Tokyo (MANDATORY)

The system is JST-only operationally. Every "what is now" / "what is today" calculation, every parse of a `YYYY/MM/DD HH:mm` string the user typed, and every filename timestamp MUST be computed in **Asia/Tokyo**, not in the browser's local TZ. A developer in Vietnam (UTC+7) or CI in UTC must produce the same validation pass/fail as an admin in Japan (UTC+9).

Helpers live at [`src/utils/datetime.ts`](../../apps/frontend/src/utils/datetime.ts) — call sites import from there.

| Helper | Use for |
|---|---|
| `nowTokyo()` | Current `Dayjs` in `Asia/Tokyo` |
| `todayStartTokyo()` | 00:00:00 of today in JST |
| `nowMinuteFloorTokyo()` | Current minute floor in JST (past-datetime checks at minute precision) |
| `parseDatetimeTokyo(s)` | Parse `YYYY/MM/DD HH:mm` interpreting numbers as JST wall-clock → `Date` (UTC instant) |
| `parseDatetimeWithSecondsTokyo(s)` | Same, with seconds (`YYYY/MM/DD HH:mm:ss`) — log search range |
| `pickerToTokyoWallclock(d)` | Antd `<a-date-picker>` Dayjs (browser-local) → Tokyo-pinned Dayjs with the SAME wall-clock numbers (user-intent preserving) |
| `todayIsoTokyo()` | Today as `YYYY-MM-DD` in JST (for `<input type="date">` / BE date-only columns) |
| `timestampForFilenameTokyo()` | `YYYYMMDD_HHmmss` for downloaded filenames |

### Banned patterns

```ts
// ❌ Browser-local "now" / "today"
const now = dayjs();
const today = dayjs().startOf('day');
const stamp = new Date();
const fn = `log_${now.getFullYear()}${...}.csv`;

// ❌ Browser-local datetime parse — `new Date(y, mo-1, ...)` is hard-wired
//    to local TZ. A picker in Vietnam stores "2026/05/28 14:00" intending
//    JST, but this constructs the instant for 14:00 VN (= 12:00 JST).
function parseDatetime(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi);
}
```

### Canonical replacements

```ts
import {
  nowTokyo,
  todayStartTokyo,
  nowMinuteFloorTokyo,
  parseDatetimeTokyo,
  pickerToTokyoWallclock,
  timestampForFilenameTokyo,
} from '@/utils/datetime';

// ✅ Past-datetime check at minute precision
const start = parseDatetimeTokyo(formState.publish_start_date);
if (start && start.getTime() < nowMinuteFloorTokyo().valueOf()) {
  fieldErrors.publish_start_date = '過去日時は指定できません。';
}

// ✅ Disable past dates on picker
function disabledStartDate(current: Dayjs | null): boolean {
  if (!current) return false;
  return current.isBefore(todayStartTokyo());
}

// ✅ Picker time-panel — disable hours/minutes before "now in JST"
function disabledStartTime(current: Dayjs | null) {
  if (!current) return {};
  const currentTokyo = pickerToTokyoWallclock(current);
  const now = nowTokyo();
  if (!currentTokyo.isSame(now, 'day')) return {};
  return buildDisabledTimeFor(now);
}

// ✅ Filename timestamp — always JST
link.download = `log_export_${timestampForFilenameTokyo()}.csv`;
```

### When `dayjs()` direct call is allowed

- **Never** for "now" / "today" — use `nowTokyo()` / `todayStartTokyo()`.
- **Allowed** for parsing a picker-frame string (e.g. `dayjs(formState.tekiyo_start_date)` where `tekiyo_start_date` is a `YYYY-MM-DD` string from `<a-date-picker>`) when comparing against another picker-frame `Dayjs` (`current` from the picker's `:disabled-date` callback). Both sides are in the same TZ frame so the comparison is consistent; pinning one side to Tokyo while the other stays browser-local would create a mismatch.
- For DISPLAY-only formatting from an ISO string the BE returned, use `formatDate / formatDateTime` from `src/utils/formatters.ts` — those already pin to Tokyo via `dayjs.tz.setDefault('Asia/Tokyo')`.

### Testing pattern

Tests for any of the helpers above flip `vi.setSystemTime()` to a UTC instant that straddles a JST day boundary and assert the output renders the JST date — see [`src/utils/__tests__/datetime.spec.ts`](../../apps/frontend/src/utils/__tests__/datetime.spec.ts). New form-validation specs that hit the helpers MUST do the same so they fail in JST production if a future refactor accidentally re-introduces a browser-local call.

### Reference patterns

#### List / search / delete view (canonical)

Conventions distilled from SCR-004 review feedback. New CRUD list
screens MUST match this shape — copy-paste, then swap module names.

```vue
<!-- ✅ List view — full canonical shape -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Modal, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { listX, removeX, type XListItem } from '@/api/x/x';

interface XFilters { x_code: string; x_name: string }

const router = useRouter();
const notify = useNotify();
const { state, loading, total, onChange, applyFilters, resetFilters } =
  useTableQuery<XFilters>({
    defaultFilters: { x_code: '', x_name: '' },
    defaultSortBy: 'x_code',
    defaultSortOrder: 'asc',
  });
const rows = ref<XListItem[]>([]);

const columns: TableColumnsType = [
  { title: 'Xコード', dataIndex: 'x_code', key: 'x_code', sorter: true, width: 140 },
  { title: 'X名', dataIndex: 'x_name', key: 'x_name', sorter: true },
  // ... other columns ...
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listX({
      x_code: state.filters.x_code || undefined,
      x_name: state.filters.x_name || undefined,
      page: state.page, per_page: state.per_page,
      sort_by: state.sort_by, sort_order: state.sort_order,
    });
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: the global axios interceptor in
    // src/api/error-handler.ts already toasted FORBIDDEN / 500.
    // Re-throwing would surface an unhandled rejection in onMounted's
    // fire-and-forget invocation. This is the "expected and intentionally
    // ignored" case from §Error Handling Architecture.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}
onMounted(fetchList);

function onSearch(): void {
  // Trim leading/trailing whitespace on every text filter so paste
  // artifacts and IME-confirmed spaces don't alter the ILIKE pattern.
  // Mutate state.filters directly so the input visibly reflects the
  // trimmed value too (user sees their leading spaces disappear when
  // they hit 検索 — clear feedback that something happened).
  state.filters.x_code = state.filters.x_code.trim();
  state.filters.x_name = state.filters.x_name.trim();
  applyFilters({ ...state.filters });
  void fetchList();
}
function onClear(): void { resetFilters(); void fetchList(); }
function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args); void fetchList();
}
function goCreate(): void { void router.push({ name: 'XCreate' }); }
function goEdit(row: XListItem): void {
  void router.push({ name: 'XEdit', params: { x_id: row.x_id } });
}
function askDelete(row: XListItem): void {
  Modal.confirm({
    title: '削除確認',
    content: `このXを削除してもよろしいですか？（${row.x_name}）`,
    okText: '削除', okType: 'danger', cancelText: 'キャンセル',
    async onOk() {
      try {
        await removeX(row.x_id);
        notify.deleted();
        await fetchList();
      } catch {
        // Global interceptor already handled CONFLICT / 500 — view must NOT re-toast.
      }
    },
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- ❶ Search section: 4-col grid → 2 fields take half-card width.
         Label has NO fixed width (`w-20` would force ugly empty gap);
         input gets `flex-1` to absorb remaining cell space. -->
    <BaseSearchForm :loading="loading" :columns="4" @search="onSearch" @clear="onClear">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">Xコード</label>
        <a-input v-model:value="state.filters.x_code" placeholder="Xコード" allow-clear class="flex-1" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">X名</label>
        <a-input v-model:value="state.filters.x_name" placeholder="X名" allow-clear class="flex-1" />
      </div>
    </BaseSearchForm>

    <!-- ❷ Empty-result message rendered OUTSIDE the table.
         a-table's `#emptyText` slot is not safely forwardable through
         BaseDataTable's dynamic slot loop — it crashes with
         "Cannot read properties of null (reading 'key')". Render the
         message in a sibling element instead. -->
    <p v-if="!loading && total === 0" class="text-text-description text-sm" data-test="x-empty-message">
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="X一覧"
      :columns="columns" :rows="rows" :loading="loading"
      :page="state.page" :per-page="state.per_page" :total="total"
      row-key="x_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <!-- `mr-1` on the icon span — without it the "+" sticks to text. -->
        <a-button type="primary" @click="goCreate">
          <template #icon><span class="material-icons text-sm mr-1">add</span></template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'x_code'">
          <a class="text-primary hover:underline" @click.prevent="goEdit(record as XListItem)">
            {{ (record as XListItem).x_code }}
          </a>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn :can-edit="false" @delete="askDelete(record as XListItem)" />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>
```

Key list-view rules (apply to every CRUD list screen):

1. **`:columns="4"`** on `<BaseSearchForm>` — 2 search fields then occupy
   the LEFT HALF of the card. With `:columns="2"` they fill the entire
   card width which looks unbalanced for a 2-field common case.
2. **No `w-20` on labels** inside the search row — let labels size to
   their natural content. Combine with `gap-2` (8px) on the
   `flex items-center` wrapper for tight pairing.
3. **`<a-input class="flex-1">`** so the input absorbs the remaining
   horizontal space inside its grid cell.
4. **Empty message OUTSIDE the table** (sibling `<p>` with `v-if="!loading && total === 0"`).
   Don't use a-table's `#emptyText` slot when the table is wrapped by
   `BaseDataTable` — its dynamic `<slot :name="slotName" v-bind="slotProps" />`
   loop crashes on the null `slotProps` antd passes for that slot.
5. **`fetchList` catches errors silently** — `onMounted` fires
   without await; an unhandled rejection from the API call would
   surface as a Vitest "unhandled rejection" warning. The global
   axios interceptor already toasts FORBIDDEN / 500, so the view
   only needs to clear local state. This is the "expected and
   intentionally ignored" exception from §Error Handling Architecture.
5a. **`onSearch` MUST trim every text filter before applying.**
   `state.filters.x = state.filters.x.trim()` for every string
   filter, then call `applyFilters` + `fetchList`. Reasons:
   (a) paste artifacts and IME-confirmed spaces shouldn't change
   the ILIKE result set; (b) mutate the v-model in place so the
   input visibly updates — user sees their leading spaces vanish
   when they hit 検索, which is clear feedback that something
   happened. Don't trim in `fetchList` itself: trimming there
   leaves the visible input dirty, which is confusing.
6. **`Modal.confirm` for delete** (not `BaseConfirmModal`). Antd's
   `Modal.confirm` makes the spec contract testable via
   `vi.spyOn(Modal, 'confirm').mockImplementation(opts => opts.onOk?.())`.
7. **Delete-error handler swallows** — global interceptor toasts
   CONFLICT / 500 centrally; view must NOT re-toast.
8. **`mr-1` on the "+" icon span** in the 新規登録 button — antd's
   button-icon-text spacing isn't enough on its own.
9. **Form-load value coercion**: when the BE returns a numeric
   `m_code` value (e.g. `zei_kubun: 1`) and the form binds a string
   radio (`v-model:value` of `'1'` / `'2'`), coerce at the load
   boundary: `formState.zei_kubun = String(resp.data.zei_kubun ?? '')`.
   Antd's radio match is strict-equal, so without coercion the edit
   form shows nothing selected.

#### Form-edit view (canonical)

```vue
<!-- ✅ Create/edit form — minimum boilerplate -->
<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import BaseCodeSelect from '@/components/common/BaseCodeSelect.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useNotify } from '@/composables/useNotify';

const router = useRouter();
const notify = useNotify();
const { fieldErrors, submitting, submit } = useApiForm();
const form = reactive({ tanka_type: 1, tanka_name: '', kingaku: 0 });

async function onSubmit() {
  await submit(async () => {
    await api.create(form);
    notify.created();
    router.push({ name: 'TankaList' });
  });
}
</script>

<!-- ✅ Create/edit form — minimum boilerplate -->
<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';
import BaseCodeSelect from '@/components/common/BaseCodeSelect.vue';
import { useApiForm } from '@/composables/useApiForm';
import { useNotify } from '@/composables/useNotify';

const router = useRouter();
const notify = useNotify();
const { fieldErrors, submitting, submit } = useApiForm();
const form = reactive({ tanka_type: 1, tanka_name: '', kingaku: 0 });

async function onSubmit() {
  await submit(async () => {
    await api.create(form);
    notify.created();
    router.push({ name: 'TankaList' });
  });
}
</script>

<template>
  <a-form layout="vertical" :model="form" @finish="onSubmit">
    <a-form-item label="単価種別" :validate-status="fieldErrors.tanka_type ? 'error' : ''" :help="fieldErrors.tanka_type">
      <BaseCodeSelect v-model:value="form.tanka_type" category="TANKA_TYPE" />
    </a-form-item>
    <!-- ... -->
    <BaseFormFooter :submitting="submitting" submit-text="登録" @cancel="router.back()" />
  </a-form>
</template>
```

### When to extract a new primitive

Extract when:
1. The pattern appears in **3+ screens** with identical structure.
2. The pattern encodes a **product convention** (e.g. "削除" links are red, "登録/更新/削除" toasts use the `useNotify()` verbs, dates are `YYYY/MM/DD`).
3. The pattern wraps a **library quirk** (e.g. AntD Table sorter type mismatch handled inside `BaseDataTable`).

Do **not** extract for one-off patterns or to chase abstraction cleverness — keep it inline until the third caller arrives.

---

## Menu / Navigation (MANDATORY)

The product menu is one logical thing rendered two ways: the left rail
(`AppSidebar.vue`) and the dashboard cards (SCR-010 `DashboardView.vue`).
Both surfaces MUST consume the same source so labels / icons /
permissions never drift.

### Single source of truth

- **Definition**: [`src/constants/menu-sections.ts`](../../apps/frontend/src/constants/menu-sections.ts)
  exports `MENU_SECTIONS: MenuSection[]`. Each item is
  `{ name, label, icon, permission? }` — `name` is the route name,
  `permission` is the `model.action` code from `seeder.md §3` that gates
  visibility.
- **Filter**: [`src/composables/useMenu.ts`](../../apps/frontend/src/composables/useMenu.ts)
  returns `visibleSections` — `MENU_SECTIONS` with items the current
  user lacks permission for stripped, plus empty sections collapsed.
  `useMenu({ excludeRoot: true })` additionally drops the rootless
  「メニュー画面」 entry so the dashboard doesn't show a "go to dashboard"
  card while on the dashboard.

### Rules

1. **Never inline a menu list** in `AppSidebar.vue`,
   `DashboardView.vue`, or anywhere else. Edit `MENU_SECTIONS`.
2. **Never gate a menu by a permission a different role also has** —
   if menu X is meant for role A only, A must hold a permission B / C / D
   don't carry. Audit against
   [`docs/database/seeder.md §3`](../../docs/database/seeder.md) before
   reusing an existing perm. The 販売店代行入力 case taught us this:
   gating it by `hanbaiten.create` (which CHUOKAI / JA_HONTEN /
   JA_KANRI also have) made the entry leak to 3 wrong roles. Adding a
   dedicated `hanbaiten.daiko_input` perm granted only to NICHINO_STAFF
   was the fix.
3. **A new menu entry is a 3-place change**: (a) add the row to
   `MENU_SECTIONS`, (b) add the permission row to the seeder migration
   AND to `docs/database/seeder.md` §2 + §3, (c) add the row to
   `docs/requirement/account_concept.md` matrix so the canonical spec
   stays the source of truth FE/BE align against. Skipping (b) means
   `hasPermission(...)` is always false for everyone — the menu
   silently disappears.
4. **Test new entries** in
   [`AppSidebar.spec.ts`](../../apps/frontend/src/components/layout/__tests__/AppSidebar.spec.ts)
   — extend the relevant role's should-show / should-hide assertion so
   future drift trips a test, not a customer.

### Adding a new entry — checklist

```
[ ] MENU_SECTIONS row added (name, label, icon, permission)
[ ] router/index.ts has a route with that `name`. If the real view
    doesn't exist yet, create a TODO placeholder view file at the
    canonical location (`src/views/<module>/<View>.vue`) — don't reuse
    a sibling view (rendering a CREATE form when the user lands on the
    list URL is misleading) and don't use `redirect:` (flips the address
    bar). The placeholder shows brief "later SCR で実装予定" copy + an
    optional CTA to the most-functional sibling. Match `permission` to
    the menu's gate. Example:
        { path: '', name: 'JaList',
          component: () => import('@/views/ja/JaListView.vue'),
          meta: { breadcrumb: 'JAマスタ一覧', permission: 'ja.view' } }
    When the real screen ships, that SCR's gen-code-frontend run
    overwrites the placeholder file — route name / path stay the same.
[ ] seeder migration adds INSERT into m_permissions + m_roles_permissions
[ ] seeder.md §2.X + §3 matrix + role summary + シードデータ updated
[ ] account_concept.md matrix gains the row with ○/× per role
[ ] AppSidebar.spec.ts: matching role's should-show / should-hide asserts the new label
[ ] vue-tsc --noEmit clean
[ ] npm run migration:run on dev DB
[ ] Manual click-through smoke test from sidebar AND dashboard for the new menu
```

### Why the placeholder route matters

`AppSidebar.vue` and `DashboardView.vue` both wrap navigation with
`if (!router.hasRoute(name)) return` — a missing route silently does
nothing instead of throwing. So a menu pointing at an unregistered
route name looks like the click button is broken: no log, no error,
nothing. Always pair a `MENU_SECTIONS` entry with a route, even when
the real view isn't built yet.

**TODO placeholder file, not `redirect:` and not a reused sibling view.**

- Redirecting (`/ja` → `/ja/create`) flips the address bar, breaking
  the URL contract the user clicked into and confusing bookmarks /
  breadcrumbs.
- Reusing a sibling view (rendering `JaFormView` at `/ja`) puts the
  wrong screen content under the URL — landing on a list URL and
  seeing a CREATE form is misleading and tempts users to submit.
- Instead, ship a small TODO placeholder file at the canonical view
  location (`src/views/<module>/<View>.vue`) with a short "実装予定"
  message + optional CTA to the most-functional sibling.

When the real screen ships in a later SCR, that screen's
`/gen-code-frontend` run overwrites the placeholder file — route
name + path stay the same so all menu links and bookmarks continue
to resolve. Mark the placeholder with a top-of-file `// TODO:`
comment so it's grep-able.

---

## Error Handling Architecture (MANDATORY)

Errors are handled at four layers. Every screen relies on these — do not
re-implement toast/redirect logic inside views.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1 — HTTP errors (axios response interceptor)                 │
│  src/api/axios-instance.ts → src/api/error-handler.ts               │
│  Routes by error_code:                                              │
│    INVALID_CREDENTIALS / OTP_*  → toast (auth screens stay put)     │
│    UNAUTHORIZED on /auth/refresh  → SILENT (background probe; the   │
│       caller in auth.store catches and clears state. Toast here     │
│       would scare a user opening /login fresh on first F5.)         │
│    UNAUTHORIZED on /auth/login or /auth/mfa/*  → toast (user-       │
│       initiated form post, the message is meaningful)               │
│    UNAUTHORIZED elsewhere  → clear user, push /login?redirect=…     │
│    FORBIDDEN      → toast + push /dashboard (no standalone 403)    │
│    VALIDATION_ERROR → no toast (handed to useApiForm in caller)     │
│    DUPLICATE_CODE / NOT_FOUND / CONFLICT / 500 → toast              │
│    Network error  → "ネットワークエラーが発生しました…" toast        │
│  Then `Promise.reject(error)` so callers can still react.           │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2 — Form validation (composable)                             │
│  src/composables/useApiForm.ts                                      │
│  Catches the rejected error from Layer 1, checks for                │
│  VALIDATION_ERROR + errors[], maps to fieldErrors:                  │
│    fieldErrors.email = "メールアドレスの形式が不正です"              │
│  Bind to <a-form-item :validate-status :help> for inline display.   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3 — Vue render / lifecycle errors (boundary)                 │
│  src/App.vue onErrorCaptured                                        │
│  Catches exceptions thrown from descendant components (auth +       │
│  main layouts). Shows toast + console.error, returns false to       │
│  stop bubbling so the app stays mounted.                            │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 4 — Last-resort global handler                               │
│  src/main.ts app.config.errorHandler                                │
│  Catches anything that escapes onErrorCaptured (unhandled promise   │
│  rejection inside setup(), async lifecycle hook, etc.). Generic     │
│  toast + log.                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Rules

1. **Never** call `message.error(...)` directly in a view for an HTTP
   error response — the axios interceptor in `error-handler.ts` already
   showed a toast. Re-toasting from the view double-displays.
2. **Never** wrap an axios call in `try/catch` just to swallow errors
   silently. Either:
   - Use `useApiForm().submit(fn)` — handles validation + submitting state.
   - Use `try/finally` to reset local UI state (loading, modal close)
     and let the error propagate (interceptor already toasted).
   - Catch only when the error is *expected* and intentionally ignored
     (e.g. login screen's optional oshirase fetch — comment why).
3. **Always** use `useNotify()` (`notify.created()`, `notify.deleted()`,
   `notify.error('...')`) for **success** toasts so phrasing stays
   uniform. Reserve `message.*` for places where the centralized
   error-handler itself runs.
4. **Adding a new `error_code`**: update the `ErrorCode` enum
   (`src/constants/error-codes.ts`) AND add a `case` in
   `error-handler.ts` (toast / redirect / no-op). Do not handle it in
   the view.
5. **Field-level validation**: backend returns
   `{ error_code: 'VALIDATION_ERROR', errors: [{ field, message }] }`.
   `useApiForm` maps these to `fieldErrors` automatically. Bind in form:
   ```vue
   <a-form-item
     :validate-status="fieldErrors.email ? 'error' : ''"
     :help="fieldErrors.email"
   >
   ```
6. **Component render bug**: do nothing in the view — `App.vue`'s
   `onErrorCaptured` shows the toast. Investigate via console log.

### Anti-patterns

```ts
// ❌ Re-toasting after axios already toasted
try {
  await api.create(form);
} catch (err) {
  message.error('登録に失敗しました');  // duplicate toast
}

// ❌ Swallowing without comment
try {
  await api.fetchSomething();
} catch {}

// ❌ Manual error_code switch in a view
catch (err) {
  if (err.response?.data?.error_code === 'DUPLICATE_CODE') {
    message.error('重複しています');
  }
}

// ✅ Let the interceptor handle, only manage local UI state
try {
  rows.value = (await api.list(state)).data;
} finally {
  loading.value = false;
}

// ✅ Form submit using useApiForm
const { fieldErrors, submitting, submit } = useApiForm();
async function onSubmit() {
  await submit(async () => {
    await api.create(form);
    notify.created();
    router.push({ name: 'TankaList' });
  });
}
```

---

## Form / Layout Conventions (MANDATORY)

Lessons from SCR-005's QA loop. Apply these to every CRUD screen so
each new view doesn't re-discover them.

### Permission-aware list buttons (CRUD list screens)

Pattern for the list-screen header + actions column when permissions
vary by role (e.g. `model.create` granted only to NICHINO_ADMIN,
`model.delete` to admin + nobody else, `model.update` to admin +
CHUOKAI + JA_HONTEN):

| Element | When user lacks the matching `model.*` permission |
|---|---|
| 新規登録 button | **Visible but `:disabled`**, NOT hidden — keeps the affordance discoverable, signals "this exists, you just can't use it" |
| 削除 link in actions column | **Visible but `:disabled`** via `BaseActionColumn`'s `:disable-delete` prop |
| 編集 entry (ja_code-style cell click) | Anchor only when `canUpdate`, otherwise plain `<span>` (avoid dead links that would land on a 403-bounce dashboard) |
| Whole list screen | Router guard's `meta.permission: 'model.view'` — user without view permission is bounced before the screen mounts |

Implementation:

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
const authStore = useAuthStore();
const canCreate = computed(() => authStore.hasPermission('ja.create'));
const canUpdate = computed(() => authStore.hasPermission('ja.update'));
const canDelete = computed(() => authStore.hasPermission('ja.delete'));
</script>

<template>
  <a-button type="primary" :disabled="!canCreate" @click="goCreate">新規登録</a-button>
  ...
  <BaseActionColumn
    :can-edit="false"
    :disable-delete="!canDelete"
    @delete="askDelete(record)"
  />
</template>
```

Why disabled (greyed) and not hidden: ops users frequently switch
roles when troubleshooting; a hidden button means "this feature might
not exist", a greyed one means "you don't have rights for this
specific feature in your current role". The latter is far less
confusing.

### Permission-aware form field restrictions

For edit forms where some roles can only edit a subset of columns
(see [`security.md` Layer 3 — FE mirror](./security.md)), disable the
inputs the BE will silently drop. Pattern:

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
const authStore = useAuthStore();

const RESTRICTED_EDITOR_ROLES = ['CHUOKAI', 'JA_HONTEN'];
const isRestrictedEditor = computed(
  () => isEdit.value
        && RESTRICTED_EDITOR_ROLES.includes(authStore.user?.role_code ?? ''),
);
</script>

<template>
  <a-input v-model:value="formState.tel" />  <!-- editable for everyone -->
  <a-input v-model:value="formState.bank_code" :disabled="isRestrictedEditor" />
  <a-radio-group v-model:value="formState.chuokai_flg" :disabled="isRestrictedEditor">
    <a-radio :value="true">中央会</a-radio>
    <a-radio :value="false">単協</a-radio>
  </a-radio-group>
</template>
```

Test pattern (mirror BE allow-list, assert per-field disabled state):

```ts
function inputByLabel(wrapper, labelText) {
  const items = wrapper.findAllComponents({ name: 'AFormItem' });
  const found = items.find((it) => it.text().includes(labelText));
  if (!found) return { disabled: false };
  // antd marks .ant-select with `ant-select-disabled` (parent class),
  // so check the form-item HTML for any disabled signal.
  const html = found.html();
  return {
    disabled:
      /disabled(?:=|>|\s)/.test(html) || html.includes('ant-select-disabled'),
  };
}

it('disables 金融機関コード when CHUOKAI edits', async () => {
  const { wrapper } = await renderView({
    jaId: 5,
    user: buildAuthUser({ role_code: 'CHUOKAI', permissions: ['ja.view', 'ja.update'] }),
  });
  expect(inputByLabel(wrapper, '金融機関コード').disabled).toBe(true);
});
```

The FE `:disabled` is **UX only** — Layer 3 BE allow-list (see
`security.md`) is the actual security boundary. Verified: a curl PUT
with restricted fields returns HTTP 200 but the DB columns stay
unchanged.

### Page chrome — owned by MainLayout, not by views

`MainLayout > AppHeader` already renders the page title (read from
`route.meta.breadcrumb` of the leaf route) and the breadcrumb chain.
Views MUST NOT duplicate them. A view's template starts directly
with the form / table card — see `TankaListView.vue` for the
correct pattern. Adding `<header><h2>...</h2><nav>breadcrumb</nav></header>`
inside a view ships it twice (one from MainLayout, one from the view)
which is the common bug.

Configure breadcrumb on the route, not in the view.

**Project breadcrumb convention (MANDATORY)** — depth follows the user's
real navigation path, not the sidebar group hierarchy:

| Screen | Levels | Example |
|---|---|---|
| List | 2 | `ホーム > JAマスタ一覧` |
| Create | 3 (middle clickable) | `ホーム > JAマスタ一覧 > JAマスタ登録画面` |
| Edit | 3 (middle clickable) | `ホーム > JAマスタ一覧 > JAマスタ編集画面` |

Why no `マスタ管理` intermediate level: it's a sidebar grouping concept,
NOT a navigable page. Users land on the list directly from the sidebar /
dashboard, then click into create/edit. The breadcrumb should reflect
that journey so the middle node ("JAマスタ一覧") gives users a one-click
path back to the list.

**Implementation**:
- Wrapper parent route (`/ja`, `/tanka`, …) carries NO breadcrumb meta —
  it's just a path prefix, users never visit it literally.
- List route (empty-path child): `meta.breadcrumb: 'JAマスタ一覧'` (string).
- Create / Edit routes: array form so the list parent is rendered as a
  link:

  ```ts
  {
    path: 'create',
    name: 'JaCreate',
    component: () => import('@/views/ja/JaFormView.vue'),
    meta: {
      breadcrumb: [
        { label: 'JAマスタ一覧', to: '/ja' },   // clickable parent
        { label: 'JAマスタ登録画面' },            // current page (no `to`)
      ],
      permission: 'ja.create',
    },
  }
  ```

`useBreadcrumb()` already supports both string and array forms (see
[useBreadcrumb.ts](../../apps/frontend/src/composables/useBreadcrumb.ts)).

### Required-field marker — `*` red, AFTER label

Drop the antd `required` prop on `<a-form-item>` (renders a leading
`*` per AntD default). Use the `#label` slot to put the asterisk
AFTER the label, in the project's `text-error` semantic colour:

```vue
<a-form-item name="ja_code"
  :validate-status="fieldErrors.ja_code ? 'error' : ''"
  :help="fieldErrors.ja_code">
  <template #label>
    <span>JAコード</span>
    <span class="text-error ml-1">*</span>
  </template>
  <a-input v-model:value="form.ja_code" maxlength="10" />
</a-form-item>
```

### Form footer — primary action LEFT, both buttons left-aligned

Japanese enterprise convention places the primary action leftmost.
Antd's default of right-aligning OK/Cancel is the wrong reflex
here. Use a left-aligned row (or `BaseFormFooter` once it grows
to support this):

```vue
<div class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2">
  <a-button type="primary" html-type="submit" :loading="submitting">登録</a-button>
  <a-button :disabled="submitting" @click="router.back()">前の画面に戻る</a-button>
</div>
```

### Validation — mirror BE rules on FE for instant feedback

Don't rely on the server round-trip alone. `validateClient(form)`
should match the BE DTO regex so the user sees errors without
waiting for HTTP. Keep messages literal from screen-design.md
(`メッセージ情報` section). Required check fires when blank,
format check fires when non-blank — guard with
`if (!errs.X && form.X)` so users see one message at a time:

```ts
// required first — note `?.trim()`, NOT `.trim()`. Antd's
// `<a-select allow-clear>` (and `<a-date-picker>`, `<a-cascader>`...)
// sets the v-model to `undefined` (not "") when the × clear icon is
// clicked. Calling `.trim()` directly throws TypeError, the error
// bubbles up to the global handler, and the user sees the generic
// `エラーが発生しました。ページを更新してください。` toast — which
// completely hides the actual required-field violation. Optional
// chaining returns undefined → falsy → required error fires correctly.
if (!form.bank_code?.trim()) errs.bank_code = '必須項目です。';
// format only when non-blank
if (!errs.bank_code && form.bank_code && !/^\d{4}$/.test(form.bank_code)) {
  errs.bank_code = '銀行コードは半角数字4桁で入力してください';
}
```

Apply `?.trim()` to **every** required-string check, even fields that
look like plain text inputs today — they may be migrated to a clearable
control later, and the bug won't re-surface as a typecheck error
(the form-state type still says `string` even when antd assigns
`undefined` at runtime).

#### Kana fields (`*_name_kana`) MUST validate the script

Any field whose name ends in `_kana` represents a phonetic reading and
MUST be format-validated against katakana. Without validation the user
can submit Latin / hiragana / kanji / fullwidth digits — which then
flows downstream into CSV/Excel exports (Zengin bank data, 増減連絡票
PDFs, etc.) and breaks formatting in places far from where the bug was
introduced.

**Project default is 半角カタカナ (half-width)** — chosen for Zengin /
bank-CSV compatibility (those formats require half-width by spec).
JA (SCR-005) `ja_name_kana`, 管理支店 (SCR-009)
`kanri_shiten_name_kana`, and 支店 (SCR-007) `shiten_name_kana` all
use this variant.

**Use the shared util — never inline the regex.** FE side has a
single source of truth at
[`apps/frontend/src/utils/kana.ts`](../../apps/frontend/src/utils/kana.ts):

| Export | Purpose |
|---|---|
| `HALF_WIDTH_KATAKANA_RE` | The `/^[ｦ-ﾟ\s]+$/u` regex |
| `kanaFormatMessage(fieldLabel)` | Builds `'{label}(カナ)は半角カタカナで入力してください。'` |

Inlining a local `const KATAKANA_RE = /^[ｦ-ﾟ\s]+$/u` or hand-rolling
the message string in a view is a code-review block. If the regex
ever needs to widen (e.g. accept parens for a future screen) it's a
one-file change.

If a future screen-design genuinely requires 全角 (rare — only for
display-only kana fields with no export-side consumer), use
`/^[ァ-ヶー\s]+$/u` and adjust the message wording. Document the
exception in the field's `@ApiPropertyOptional` description so the
deviation is visible.

Half-width regex covers `ｦ-ﾝ` letters, prolonged sound mark `ｰ`
(U+FF70), and dakuten/handakuten `ﾞ ﾟ` (U+FF9E/F) — the range `ｦ-ﾟ`
(U+FF66-FF9F) gives all of them. `\s` already includes the full-width
space U+3000, so do NOT add `　` to the character class (SonarLint
flags it as a duplicate).

```ts
// FE — KanriShitenFormView.vue (half-width variant)
import { HALF_WIDTH_KATAKANA_RE, kanaFormatMessage } from '@/utils/kana';

const KANA_FORMAT_MSG = kanaFormatMessage('管理支店名');

if (form.kanri_shiten_name_kana && !HALF_WIDTH_KATAKANA_RE.test(form.kanri_shiten_name_kana)) {
  errs.kanri_shiten_name_kana = KANA_FORMAT_MSG;
}
```

```ts
// BE DTO — create-kanri-shiten.dto.ts (mirror the FE regex inline —
// no shared decorator yet; keep the regex + message verbatim so the
// FE/BE contract stays grep-able). Use the same wording as
// kanaFormatMessage('管理支店名') on the FE.
@Matches(/^[ｦ-ﾟ\s]+$/u, {
  message: '管理支店名(カナ)は半角カタカナで入力してください。',
})
kanri_shiten_name_kana?: string;
```

**Fixture and seed data MUST match the chosen variant.** If a screen
goes half-width:
- `seed-dev.ts` records use half-width katakana
- DTO spec `VALID` fixtures use half-width katakana
- Controller / service spec request bodies use half-width katakana
- Integration spec SQL inserts can technically stay full-width (DB-only,
  no DTO validation), but DO change them too — once any test goes
  through PUT/POST on those records, the BE rejects mid-suite

**Punctuation is NOT katakana.** `（カイショウ）` / `(カイメイ)` / `.` / `,`
do NOT match the katakana regex. Test fixtures that want a
"renamed-variant" marker should use a space + katakana segment instead:
`'ﾄｳｷｮｳﾁｭｳｵｳ ｶｲｼｮｳ'`, not `'ﾄｳｷｮｳﾁｭｳｵｳ(ｶｲｼｮｳ)'`. If a screen genuinely
needs to accept parens/punctuation in the kana, widen the regex
explicitly and document why in the field comment.

#### NEVER use HTML5 native input types for validation

`<input type="email">`, `<input type="number">`, `<input type="url">`,
`<input type="tel">` (with HTML5 pattern), and `<input type="date">`
all trigger the **browser's native validation tooltip** on submit —
an OS-level popup with a hard-coded English message
(`"Please include an '@' in the email address."`) that:

1. Bypasses the project's Japanese error messages (`有効なメールアドレスを入力してください。`).
2. Renders OUTSIDE the `<a-form-item :help>` slot, breaking the
   consistent error-placement convention.
3. Cannot be styled or localised — the message is the user's OS locale.

Always use `type="text"` (or omit the `type` attribute, which antd
defaults to text) and let `validateClient(form)` run the format regex.
The BE will repeat the check via `class-validator` (`@IsEmail`) and
return the same Japanese message via VALIDATION_ERROR for the
defence-in-depth path.

```vue
<!-- ❌ Triggers browser-native English popup, ignores project i18n -->
<a-input v-model:value="formState.email" type="email" maxlength="100" />

<!-- ✅ Plain text input + project's regex check + a-form-item :help -->
<a-input v-model:value="formState.email" maxlength="100" />
```

```ts
// validateClient(form):
const EMAIL_INVALID_MSG = '有効なメールアドレスを入力してください。';
if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
  errs.email = EMAIL_INVALID_MSG;
}
```

Same rule for any input that needs format validation: rely on the
project's regex + Japanese message via `<a-form-item>`, never on the
browser's HTML5 `type` attribute.

The BE returns the same field-level errors via VALIDATION_ERROR;
`useApiForm` already merges them into `fieldErrors`.

This applies to **auth screens too** (login, MFA verify, password
reset) — never let blank login submit to the BE just to bounce with
a 400. `LoginView.vue` checks `login_id` / `password` blank with the
canonical literals (`ユーザーIDを入力してください。` /
`パスワードを入力してください。` per ACSMS-MSG-001-001/002) and
short-circuits before calling `submit()`. Same pattern for
`MfaVerifyView` and any future password-reset screen.

### Auto-focus the first error on submit

After both client-side validation and server-side VALIDATION_ERROR,
focus + scroll the first input that has an error so the user
doesn't have to hunt for it. DOM-ordered (not insertion-ordered)
because validators may push errors in any order:

```ts
const FIELD_ORDER = ['ja_code', 'ja_name', /* …in template order */];

function focusFirstError(errors: Record<string, string>) {
  const first = FIELD_ORDER.find((f) => errors[f]);
  if (!first) return;
  void nextTick(() => {
    const root = document.getElementById(first);
    if (!root) return;
    // Antd places `id` differently per control:
    //   <a-input>/<a-textarea>: id on the native control → focus directly
    //   <a-select>             : id on wrapper, focus `.ant-select-selector`
    //   <a-radio-group>        : id on wrapper, focus first `<input type="radio">`
    const inner =
      root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement
        ? root
        : root.querySelector<HTMLElement>(
            '.ant-select-selector, input, textarea, [tabindex]:not([tabindex="-1"])',
          );
    inner?.focus();
    root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
```

Call from BOTH paths in `submitWith()`: after `validateClient()`
returns errors, and after `submit()` finishes if `fieldErrors`
non-empty.

### Antd `<a-button>` text — auto-spaces 2 CJK characters

`<a-button>登録</a-button>` renders DOM text as `登 録` (with a
space) because Antd v4 inserts a half-width space between two
adjacent CJK characters for visual breathing room. Tests asserting
literal `'登録'` fail. Use selector + substring match:

```ts
// ❌ Brittle:
expect(wrapper.text()).toContain('登録');

// ✅ Robust:
const submitBtn = wrapper.find('button[type="submit"]');
expect(submitBtn.exists()).toBe(true);
expect(submitBtn.text()).toContain('登');
```

Buttons with 3+ chars (`'前の画面に戻る'`) or non-CJK don't get
the space treatment — literal match is fine there.

### `<ol>` / `<ul>` reset when preflight is skipped

`tailwind.css` skips `@import "tailwindcss/preflight"` (Ant Design
Vue ships its own resets and the two collide). Browser default
`<ol>`/`<ul>` keep `padding-inline-start: 40px` for bullets.
Anywhere you build a horizontal list (breadcrumbs, etc.), add
`m-0 pl-0 list-none` to the `<ol>` so it sits flush-left:

```vue
<ol class="inline-flex items-center space-x-1 m-0 pl-0 list-none">
  <li v-for="..." :key="...">…</li>
</ol>
```

### Empty-string optional fields → BE 400

Frontend forms initialise optional inputs to `""`. The BE DTO
must transform blank → undefined (see
`.claude/rules/nestjs.md §DTO validation gotchas`). If a new
backend field starts returning unexpected 400 errors after the FE
form submits empties, that's the cause.

### Block Enter implicit submit on long CRUD forms (>3 fields)

HTML default: a `<form>` with one `<button type="submit">` and a
focused text input auto-submits when the user presses Enter.
That's the right UX for short forms (login, search) but the wrong
UX for **CRUD edit forms with 4+ fields** — users press Enter as
a "next field" reflex (especially Japanese IME 完了 → Enter), and
the form submits with incomplete data → toast spam.

**Rule**: every form CRUD with 4+ inputs MUST wire
`preventEnterImplicitSubmit` on the `<a-form>` `@keydown` handler.
The utility lives at [`src/utils/form-keyboard.ts`](../../apps/frontend/src/utils/form-keyboard.ts).

```vue
<script setup lang="ts">
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
</script>

<template>
  <a-form
    layout="vertical"
    :model="formState"
    @keydown="preventEnterImplicitSubmit"
    @finish="onFormSubmit"
  >
    <!-- 17 fields … -->
  </a-form>
</template>
```

The utility preserves:
- Enter in `<textarea>` → newline (`<a-textarea>` users keep multi-line typing)
- Enter on focused submit `<button>` → submit (accessibility — keyboard-only users still complete the flow)
- Enter inside antd combobox controls (`<a-select>`, `<a-cascader>`, `<a-date-picker>`) → confirm highlighted option (detected via `closest('[role="combobox"]')`)
- Shift/Cmd/Ctrl/Alt + Enter → not blocked (power-user shortcut convention)

Blocks Enter on regular text inputs, number inputs, password inputs.

**Forbidden alternative**: removing `html-type="submit"` from the
button + adding `@click="onFormSubmit"` instead. That breaks form
semantics (screen readers, browser autofill, address-line-style
autocomplete heuristics).

**Skip for**: 1-2 field forms where Enter-to-submit is desired —
login, MFA OTP entry (when the user explicitly wants Enter to
mean "submit my password" / "I'm done"), search bars.

**Regression guard**: every CRUD form spec MUST include
`it('should NOT call createX when Enter is pressed inside a text
input')` — trigger `keydown` with `key: 'Enter'` on the first
`<input>` and assert the API was not called. Pattern in
[`JaFormView.spec.ts`](../../apps/frontend/src/views/ja/__tests__/JaFormView.spec.ts).

### Japanese system-message punctuation — trailing 「。」 (MANDATORY)

Every user-facing Japanese system message MUST end with `「。」`.
This applies to:

| Message kind | Site | Example |
|---|---|---|
| Success toast | `useNotify()` helper or direct `message.success(…)` | `'登録しました。'`, `'MFAを有効にしました。'` |
| Error toast | `message.error(…)`, axios interceptor copy | `'予期しないエラーが発生しました。'` |
| Validation help | `<a-form-item :help="…">`, BE DTO `@Matches({ message: '…' })` | `'銀行コードは半角数字4桁で入力してください。'` |
| API result `message` field | BE service return value | `'登録しました。'`, `'更新しました。'`, `'削除しました。'` (verb-only — see `.claude/rules/nestjs.md §BE message convention`) |
| Guard error message | `PermissionsGuard`, exception classes | `'この画面へのアクセス権限がありません。'` |

**Centralised**: `useNotify().{created, updated, deleted, uploaded,
downloaded}` are 0-arg, verb-only. No subject prefix — the button
the user clicked + the screen they're on already imply the subject;
adding it ("JAを登録しました。") makes every toast read like
Captain Obvious. Convention is project-wide.
```ts
notify.created();   // → "登録しました。"
notify.updated();   // → "更新しました。"
notify.deleted();   // → "削除しました。"
```
For genuinely custom copy (e.g. `'パスワードを更新しました。ログイン画面に移動します。'`),
call `notify.success(text)` directly with the literal string.

**Skip for**:
- UI placeholders (`<input placeholder="IDを入力してください">`) — convention is no period
- Mock display content (e.g. dashboard demo notices)
- Test description strings (`it('should toast ログインしました success')`)

**Tests** asserting these literals must include the period —
`expect(message.success).toHaveBeenCalledWith('ログインしました。')`.

