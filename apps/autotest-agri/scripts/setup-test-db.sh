#!/usr/bin/env bash
# Purpose: Start test DB/Redis containers and run TypeORM migrations via backend container
# Usage: bash scripts/setup-test-db.sh [--skip-start]
# Dependencies: docker
# Exit Codes: 0=success, 1=error
set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/../../docker-compose.yml"
BACKEND_CONTAINER="agrinews-backend-1"
PG_TEST_CONTAINER="agrinews-postgres-test-1"

# ── 1. Start test services ────────────────────────────────────────────────────
if [ "${1:-}" != "--skip-start" ]; then
  echo "[setup-test-db] Starting postgres-test + redis-test..."
  docker compose -f "$COMPOSE_FILE" --profile test up -d postgres-test redis-test

  echo "[setup-test-db] Waiting for postgres-test to be healthy..."
  for i in $(seq 1 30); do
    STATUS="$(docker inspect --format='{{.State.Health.Status}}' "$PG_TEST_CONTAINER" 2>/dev/null || echo 'missing')"
    [ "$STATUS" = "healthy" ] && break
    echo "  [$i] $STATUS — retrying in 2s..."
    sleep 2
  done

  STATUS="$(docker inspect --format='{{.State.Health.Status}}' "$PG_TEST_CONTAINER" 2>/dev/null || echo 'error')"
  if [ "$STATUS" != "healthy" ]; then
    echo "[setup-test-db] ERROR: postgres-test did not become healthy." >&2
    exit 1
  fi
fi

# ── 2. Run migrations via backend container ───────────────────────────────────
# Backend container has Node 20 + ts-node + node_modules.
# postgres-test is reachable from backend container by its container name.
echo "[setup-test-db] Running migrations on test database..."
docker exec "$BACKEND_CONTAINER" sh -c "
  DB_HOST=agrinews-postgres-test-1 \
  DB_PORT=5432 \
  DB_NAME=agrinews_test \
  DB_USERNAME=agrinews_test \
  DB_PASSWORD=agrinews_test \
  npx ts-node \
    --project tsconfig.json \
    --transpile-only \
    -r reflect-metadata \
    -e \"
const ds = require('./src/database/data-source').default;
ds.initialize()
  .then((d) => d.runMigrations())
  .then((m) => { console.log('[migrations] ran:', m.length); process.exit(0); })
  .catch((e) => { console.error('[migrations] FAILED:', e.message); process.exit(1); });
\"
"

echo "[setup-test-db] Done."
