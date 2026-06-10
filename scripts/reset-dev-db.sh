#!/usr/bin/env bash
# Purpose: Wipe + rebuild the dev DB from scratch
#          (drop database → migration:run → seed → seed:dev)
# Usage:   ./scripts/reset-dev-db.sh
# Dependencies: docker, docker compose; postgres + backend containers running
# Exit Codes: 0=success, 1=missing dependency, 2=container not running, 3=production-env block
set -euo pipefail

readonly EXIT_SUCCESS=0
readonly EXIT_MISSING_DEP=1
readonly EXIT_CONTAINER_DOWN=2
readonly EXIT_PROD_BLOCK=3

readonly COMPOSE_FILE="${COMPOSE_FILE:-apps/docker-compose.yml}"
readonly DB_NAME="${DB_NAME:-agrinews_dev}"
readonly DB_USER="${DB_USER:-postgres}"

check_dependency() {
  local cmd="$1"
  if ! command -v "${cmd}" &> /dev/null; then
    echo "ERROR: ${cmd} is required but not installed." >&2
    exit "${EXIT_MISSING_DEP}"
  fi
}

check_container_running() {
  local svc="$1"
  if ! docker compose -f "${COMPOSE_FILE}" ps --status running --services 2> /dev/null | grep -qx "${svc}"; then
    echo "ERROR: '${svc}' container is not running." >&2
    echo "  Start with: docker compose -f ${COMPOSE_FILE} up -d postgres backend" >&2
    exit "${EXIT_CONTAINER_DOWN}"
  fi
}

# ── Sanity checks ────────────────────────────────────────────────────────
check_dependency docker

if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "ERROR: refusing to reset DB with NODE_ENV=production." >&2
  echo "  This script is dev-only. Unset NODE_ENV or set it to 'development'." >&2
  exit "${EXIT_PROD_BLOCK}"
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "ERROR: compose file not found: ${COMPOSE_FILE}" >&2
  echo "  Run this script from the repo root, or set COMPOSE_FILE=<path>." >&2
  exit "${EXIT_MISSING_DEP}"
fi

check_container_running postgres
check_container_running backend

# ── 1. Drop + recreate database ──────────────────────────────────────────
echo "▶ Dropping and recreating database '${DB_NAME}'..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" \
  -c "CREATE DATABASE \"${DB_NAME}\";"

# ── 2. Migrations ────────────────────────────────────────────────────────
echo ""
echo "▶ Running migrations..."
docker compose -f "${COMPOSE_FILE}" exec -T backend npm run migration:run

# ── 3. Production-safe seed (admin account) ──────────────────────────────
echo ""
echo "▶ Seeding initial admin account..."
docker compose -f "${COMPOSE_FILE}" exec -T backend npm run seed

# ── 4. Dev fixtures ──────────────────────────────────────────────────────
echo ""
echo "▶ Seeding dev fixtures (100 m_ja + 4 m_kanri_shiten + 100 m_tanka + 20 accounts)..."
docker compose -f "${COMPOSE_FILE}" exec -T backend npm run seed:dev

# ── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "✓ Dev DB reset complete."
echo "  Login IDs : admin (id=1) + admin01..04 / staff01..04 /"
echo "              chuokai01..04 / honten01..04 / kanri01..04 (id=2..21)"
echo "  Password  : admin@1234567"
echo "─────────────────────────────────────────────────────────────────"

exit "${EXIT_SUCCESS}"
