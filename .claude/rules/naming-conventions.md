# Naming Conventions — AgriNews_ACSMS

> Standard naming rules for NestJS backend, Vue 3 frontend, TypeORM database, Terraform infrastructure, and more.

---

## 🏗️ NestJS Backend Naming

### Files
| Type | Convention | Example |
|------|-----------|---------|
| Module | `{domain}.module.ts` | `users.module.ts` |
| Controller | `{domain}.controller.ts` | `users.controller.ts` |
| Service | `{domain}.service.ts` | `users.service.ts` |
| Entity | `{entity}.entity.ts` | `user.entity.ts` |
| DTO (create) | `create-{entity}.dto.ts` | `create-user.dto.ts` |
| DTO (update) | `update-{entity}.dto.ts` | `update-user.dto.ts` |
| DTO (response) | `{entity}-response.dto.ts` | `user-response.dto.ts` |
| Exception | `{name}.exception.ts` | `user-not-found.exception.ts` |
| Guard | `{name}.guard.ts` | `session-auth.guard.ts` |
| Interceptor | `{name}.interceptor.ts` | `transform.interceptor.ts` |
| Test | `{source}.spec.ts` | `users.service.spec.ts` |

### Classes
```ts
// Module: PascalCase + Module suffix
export class UsersModule {}

// Controller: PascalCase + Controller suffix
export class UsersController {}

// Service: PascalCase + Service suffix
export class UsersService {}

// Entity: PascalCase (singular)
export class User {}

// DTO: PascalCase + Dto suffix
export class CreateUserDto {}
export class UserResponseDto {}

// Exception: PascalCase + Exception suffix
export class UserNotFoundException extends DomainException {}

// Guard: PascalCase + Guard suffix
export class SessionAuthGuard {}
```

---

## 🖥️ Vue 3 Frontend Naming

### Files
| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase `.vue` | `UserProfile.vue` |
| View (page) | PascalCase + View | `DashboardView.vue` |
| Composable | camelCase + use prefix | `useAuth.ts` |
| Store | camelCase + .store | `auth.store.ts` |
| Util | camelCase | `formatDate.ts` |
| Type | camelCase | `user.types.ts` |

### Components
```vue
<!-- Component naming in template: PascalCase or kebab-case -->
<UserProfile :user="currentUser" />
<user-profile :user="currentUser" />
```

### Props & Events
```ts
// Props: camelCase
defineProps<{ userName: string; isActive: boolean }>()

// Events: camelCase (verb)
defineEmits<{ updateProfile: [data: ProfileData]; close: [] }>()
```

### Composables
```ts
// Always prefix with 'use'
export function useAuth() { ... }
export function useAuth() { ... }
export function useUsers() { ... }
```

### Pinia Stores
```ts
// Store ID: camelCase domain name
export const useAuthStore = defineStore('auth', () => { ... });
export const useAiStore = defineStore('ai', () => { ... });
export const useUserStore = defineStore('user', () => { ... });
```

---

## 🗄️ Database Naming (TypeORM + PostgreSQL)

### Tables
```sql
-- snake_case, plural nouns
users
order_items
product_categories
user_role_mappings    -- junction tables: entity1_entity2_mappings
```

### Columns
```sql
id                    -- primary key (UUID)
user_id               -- foreign key: {referenced_table_singular}_id
created_at            -- timestamps: {event}_at
updated_at
deleted_at            -- soft delete
is_active             -- booleans: is_, has_, can_
has_verified_email
email                 -- data fields: plain descriptive name
full_name
```

### Indexes & Constraints
```sql
idx_{table}_{columns}           -- idx_users_email
uniq_{table}_{column}           -- uniq_users_email
fk_{child_table}_{parent_table} -- fk_orders_users
```

### TypeORM Entity ↔ Database Mapping
```ts
// Entity class: PascalCase singular
// Table name: snake_case plural
@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })  // Column: snake_case
  fullName: string;                // Property: camelCase
}
```

---

## ☁️ Terraform / AWS Naming

### Resource Names in AWS
```
# Pattern: {project}-{environment}-{resource}
agrinews-prod-ecs-cluster
agrinews-prod-rds-postgres
agrinews-dev-alb
agrinews-stg-s3-frontend
```

### Terraform Resources
```hcl
# Resource names: snake_case
resource "aws_ecs_cluster" "main" { ... }
resource "aws_rds_cluster" "postgres" { ... }

# Variables: snake_case
variable "environment" { ... }
variable "ecs_task_cpu" { ... }

# Outputs: snake_case
output "ecs_cluster_arn" { ... }
output "rds_endpoint" { ... }
```

### Tags (MANDATORY)
```hcl
tags = {
  Project     = "AgriNews_ACSMS"
  Environment = var.environment   # dev | stg | prod
  ManagedBy   = "terraform"
  Team        = "engineering"
}
```

---

## 📨 Event Naming

### Domain Events
```
user.registered
user.email_verified
dokusya.created
dokusya.updated
```

---

## 🌍 Environment Variables

```bash
# UPPER_SNAKE_CASE for all env vars
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...
DB_HOST=localhost

# Auth (HTTP-only Cookie session backed by Redis)
REDIS_URL=redis://localhost:6379
SESSION_SECRET=...

# AWS
AWS_REGION=ap-southeast-1
```

---

## 🌐 URL / Route Naming

```
# REST: plural nouns, kebab-case, versioned
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Nested resources
GET    /api/v1/users/:id/orders

# Auth actions
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```
