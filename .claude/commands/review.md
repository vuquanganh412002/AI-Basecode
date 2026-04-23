# Review Command

## Description
Perform a thorough code review of specified files or changes.

## Usage
`/review [file/module/branch]`

## Process

1. Read the changed files (git diff or specified files)
2. Check against rules in `.claude/rules/`
3. Report findings by severity

## Review Checklist

### Backend (see `nestjs.md`)
- [ ] Layered architecture respected (Controller → Service → Repository)
- [ ] `@Permissions('model.action')` on all endpoints
- [ ] DTO validation with `@ApiProperty()` on all fields
- [ ] Domain exceptions (not raw HttpException)
- [ ] N+1 queries prevented (use relations/QueryBuilder)
- [ ] Parameterized queries (no string concatenation)
- [ ] Pagination on all list endpoints
- [ ] Transactions for multi-step operations

### Frontend (see `vue.md`)
- [ ] `<script setup lang="ts">` only (no Options API)
- [ ] Props/emits typed with TypeScript
- [ ] Orval generated client used (no manual fetch)
- [ ] Pinia setup store pattern
- [ ] Router guard checks permission
- [ ] No `v-html` with unsanitized content
- [ ] Lazy loading on routes

### Security (see `security.md`)
- [ ] No hardcoded secrets
- [ ] DataScope filtering in Service layer
- [ ] Field-level restrictions enforced per role
- [ ] Sensitive fields excluded from response DTO
- [ ] No passwords/tokens/PII in logs

### Testing (see `testing.md`)
- [ ] Unit tests for new service methods (vi.fn mocks)
- [ ] Edge cases tested (null, empty, invalid)
- [ ] Coverage > 80% for business logic

## Output Format

- 🔴 **Critical** — Must fix before merge
- 🟡 **Warning** — Should fix, potential issue
- 🟢 **Suggestion** — Nice to have
- ✅ **Good** — Highlight what's done well
