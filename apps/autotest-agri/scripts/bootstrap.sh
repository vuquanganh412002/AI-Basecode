#!/usr/bin/env bash
# Purpose: Full one-shot bootstrap for autotest-agri (Docker-native)
#   1. Start test containers (postgres-test, redis-test, playwright) via docker compose
#   2. Wait for postgres-test to be healthy
#   3. Run TypeORM migrations on test DB (via backend container)
#   4. Seed test data (via backend + postgres-test containers)
# Usage: bash scripts/bootstrap.sh
# Dependencies: docker
# Exit Codes: 0=success, 1=error
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$(dirname "$(dirname "$SCRIPT_DIR")")/docker-compose.yml"

# ── 1. Start test containers ──────────────────────────────────────────────────
echo "[bootstrap] Starting test containers (postgres-test, redis-test, playwright)..."
docker compose -f "$COMPOSE_FILE" --profile test up -d --build postgres-test redis-test playwright

# ── 2. Wait for postgres-test ─────────────────────────────────────────────────
echo "[bootstrap] Waiting for postgres-test to be healthy..."
for i in $(seq 1 30); do
  STATUS="$(docker inspect --format='{{.State.Health.Status}}' agrinews-postgres-test-1 2>/dev/null || echo 'missing')"
  [ "$STATUS" = "healthy" ] && break
  echo "  [$i] $STATUS — retrying in 2s..."
  sleep 2
done

STATUS="$(docker inspect --format='{{.State.Health.Status}}' agrinews-postgres-test-1 2>/dev/null || echo 'error')"
if [ "$STATUS" != "healthy" ]; then
  echo "[bootstrap] ERROR: postgres-test did not become healthy." >&2
  exit 1
fi

# ── 3. Run migrations ─────────────────────────────────────────────────────────
echo "[bootstrap] Running TypeORM migrations on test DB..."
bash "$SCRIPT_DIR/setup-test-db.sh" --skip-start

# ── 4. Seed test data ─────────────────────────────────────────────────────────
echo "[bootstrap] Seeding test data..."
bash "$SCRIPT_DIR/seed-test-data.sh"

echo ""
echo "============================================"
echo "  autotest-agri bootstrap complete!"
echo ""
echo "  Run tests:"
echo "    npm run test:unit              (backend vitest)"
echo "    npm run test:component         (frontend vitest)"
echo "    npm run test:integration       (backend integration)"
echo "    npm run test:e2e               (playwright)"
echo "    npm run test:coverage:backend  (backend coverage)"
echo "    npm run test:coverage:frontend (frontend coverage)"
echo "============================================"
