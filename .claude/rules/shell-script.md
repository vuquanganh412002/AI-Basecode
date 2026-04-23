# Shell Script Standards

## Mandatory Requirements

- Use `#!/usr/bin/env bash` or `#!/usr/bin/env sh` (never hardcoded paths)
- Must include `set -euo pipefail` immediately after shebang
- All variables must be quoted: `"$var"`, not `$var`
- Use `$(...)` for command substitution, never backticks
- All functions must use `local` for internal variables
- Scripts must pass `shellcheck` with zero errors
- Include script header with Purpose, Usage, Dependencies, Exit Codes

## Portability: POSIX Compliance

### Shebangs
Use `#!/usr/bin/env bash` or `sh` only. Hardcoded paths like `#!/bin/bash` fail on systems with different install locations.

### Conditionals & Variables
- **POSIX sh**: Use `[ ]` and quotes: `[ "$var" = "value" ]`
- **Bash only**: Use `[[ ]]` only if script requires Bash (document why in header)
- Command substitution: Always use `$( )`, never backticks
- Variables: Always quote: `"$HOME/path"`, not `$HOME/path` (prevents word splitting)

## Error Handling & Safety

### Safety Header
All scripts must start with:
```bash
#!/usr/bin/env bash
set -euo pipefail
```
- `set -e`: Exit on error
- `set -u`: Fail on undefined variables
- `set -o pipefail`: Pipeline fails if any command fails

### Cleanup & Traps
Use `trap` for cleanup:
```bash
cleanup() {
  rm -rf "${TEMP_DIR:-}"
  exit $?
}
trap cleanup EXIT
```

### Exit Codes
Define meaningful exit codes:
```bash
readonly EXIT_SUCCESS=0
readonly EXIT_CONFIG_ERROR=2
readonly EXIT_MISSING_DEP=3
```

### Defensive Variable Assignment
Validate critical variables:
```bash
USER_HOME="${HOME:-/root}"
if [ -z "${API_KEY:-}" ]; then
  echo "ERROR: API_KEY not set" >&2
  exit 1
fi
```

## Coding Standards

### Naming
- **Variables**: `lowercase_with_underscores` or `SCREAMING_SNAKE_CASE` for constants (use `readonly`)
- **Functions**: `lowercase_with_underscores` starting with verb: `validate_config()`, `check_dependencies()`
- **Constants**: `SCREAMING_SNAKE_CASE` with `readonly`

### Function Structure
Use `local` for all variables; return explicit exit codes:
```bash
validate_config() {
  local config_file="$1"
  [ -f "$config_file" ] || return 1
  grep -q "^VERSION=" "$config_file" || return 1
  return 0
}
```

### Conditionals
```bash
# POSIX: separate conditions for clarity
if [ -f "$config" ] && [ -r "$config" ]; then
  echo "Config valid"
fi
```

### Arithmetic
Use `$(( ))` for math:
```bash
result=$((count + 10))
```

### String Comparison
Always quote variables:
```bash
if [ "$status" = "active" ]; then
  echo "Active"
fi
```

## Documentation

### Script Header
Every script must include header with Purpose, Usage, Dependencies, Exit Codes:
```bash
#!/usr/bin/env bash
# Purpose: Deploy application to production
# Usage: ./deploy.sh -e ENV -v VERSION
# Dependencies: docker, kubectl
# Exit Codes: 0=success, 2=config error, 3=missing dependency
set -euo pipefail
```

## Static Analysis

### ShellCheck Validation
All scripts must pass `shellcheck` with no errors or warnings:
```bash
shellcheck script.sh
```

Common issues fixed:
- `SC2086`: Unquoted variables that need quotes
- `SC2181`: Check exit code after command substitution
- `SC2046`: Quote expansion in arrays

### CI/CD Integration
Include shellcheck in CI/CD pipelines:
```yaml
lint_scripts:
  stage: lint
  image: koalaman/shellcheck-alpine:latest
  script:
    - shellcheck scripts/**/*.sh
```
