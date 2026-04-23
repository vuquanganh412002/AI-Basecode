# Fix Issue Command

## Description
Analyze and fix a reported bug or issue systematically.

## Usage
`/fix-issue [description or issue number]`

## Process

### 1. Understand the Issue
- Read the error message or bug description
- Identify affected module(s) and layer (controller/service/repository)
- Check related screen design in `docs/design/ACSMS-SCR-*`

### 2. Root Cause Analysis
- Check recent changes: `git log --oneline -20`
- Review affected files
- Check existing tests for expected behavior

### 3. Plan the Fix
- Identify the minimal change needed
- Consider side effects on other modules
- Plan test updates to cover the fix

### 4. Implement
- Follow backend rules (`nestjs.md`) or frontend rules (`vue.md`)
- Follow security rules (`security.md`) — especially DataScope and permissions
- Make targeted fix — no unrelated changes

### 5. Verify
- Run relevant tests: `npm test -- --testPathPattern=[affected]`
- Run full test suite: `npm test`
- Run lint: `npm run lint`

### 6. Commit
Follow `git-workflow.md`:
```
fix(<scope>): <short description>

Closes #<issue-number>
```
