#!/usr/bin/env bash
# Purpose: Dump ALL ja_id=108 data into one portable, INSERT-ONLY seed file.
#          Pure additive: INSERT ... ON CONFLICT DO NOTHING in FK-parent-first
#          order. No DELETE, no session_replication_role, no superuser needed —
#          it only ever ADDS ja_id=108 rows and never touches other data.
# Usage:   ./gen-seed-ja108.sh [output.sql]
#          PSQL override: PSQL="psql -U postgres -d agrinews_dev" ./gen-seed-ja108.sh
# Deps:    docker (default) OR a psql on PATH via the PSQL env var.
# Exit:    0 success, 1 on any psql error.
set -euo pipefail

readonly JA_ID=108
readonly OUT="${1:-$(dirname "$0")/seed-ja108-full.sql}"

# How to reach psql. Default: the local dev docker container. Override with
# PSQL="psql ..." when running elsewhere.
PSQL="${PSQL:-docker exec -i agrinews-postgres-1 psql -U postgres -d agrinews_dev}"

# FK topological order (parents → children). "table:id_column".
# m_tanka MUST precede m_hanbaiten (m_hanbaiten.haitatsuryo_tanka_id → m_tanka).
readonly TABLES=(
  "m_ja:ja_id"
  "m_kanri_shiten:kanri_shiten_id"
  "m_shiten:shiten_id"
  "m_tanka:tanka_id"
  "m_hanbaiten:hanbaiten_id"
  "m_account:account_id"
  "t_dokusya:dokusya_id"
  "t_dokusya_rireki:dokusya_rireki_id"
  "t_koza_furikae:koza_furikae_id"
  "t_log:log_id"
  "t_file_download:file_download_id"
)

# psql -tA helper (tuples only, unaligned) for scalar queries.
q() { $PSQL -tA -c "$1"; }

# Comma-separated column list for INSERT (...) in ordinal order.
cols_of() {
  local tbl="$1"
  q "SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='${tbl}'"
}

# 'quote_nullable(c1), quote_nullable(c2), ...' expression list (ordinal order).
# quote_nullable emits a safely-quoted literal for every type and the bare
# keyword NULL for nulls — so escaping is correct for text/timestamptz/json/etc.
qexprs_of() {
  local tbl="$1"
  q "SELECT string_agg('quote_nullable(' || quote_ident(column_name) || ')', ', ' ORDER BY ordinal_position)
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='${tbl}'"
}

{
  echo "-- ============================================================"
  echo "-- Portable seed (INSERT-ONLY): all data for ja_id=${JA_ID}"
  echo "-- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ) (UTC)"
  echo "-- Load with:  psql -U <user> -d <db> -v ON_ERROR_STOP=1 -f $(basename "$OUT")"
  echo "--"
  echo "-- SAFE FOR EXISTING DATA:"
  echo "--   * Only INSERTs ja_id=${JA_ID} rows — never DELETEs / UPDATEs anything."
  echo "--   * ON CONFLICT DO NOTHING → rows already present are skipped, other"
  echo "--     data is never modified. Re-runnable."
  echo "--   * FK-parent-first order → no need to disable FK, runs as a normal role."
  echo "--   * Wrapped in one transaction → any error rolls back the whole load."
  echo "--"
  echo "-- PREREQUISITE on target: schema migrated + GLOBAL base seed present"
  echo "--   (m_code, m_todofuken, m_roles/m_permissions, NICHINO base accounts)."
  echo "--   t_log rows may reference base account_ids; m_* reference m_todofuken."
  echo "-- ============================================================"
  echo
  echo "BEGIN;"
  echo

  for entry in "${TABLES[@]}"; do
    tbl="${entry%%:*}"
    idcol="${entry##*:}"
    cols="$(cols_of "$tbl")"
    qexprs="$(qexprs_of "$tbl")"
    echo "-- ${tbl}"
    $PSQL -tA -c "SELECT 'INSERT INTO ${tbl} (${cols}) VALUES (' || concat_ws(', ', ${qexprs}) || ') ON CONFLICT DO NOTHING;'
                    FROM ${tbl} WHERE ja_id = ${JA_ID} ORDER BY ${idcol}"
    echo
  done

  echo "-- advance identity sequences past the loaded max so the app's future"
  echo "-- auto-inserts don't collide with seeded ids (touches only the sequence"
  echo "-- counter, never any row; setting it to MAX(id) over the whole table is"
  echo "-- always correct and never harms other data)."
  for entry in "${TABLES[@]}"; do
    tbl="${entry%%:*}"
    idcol="${entry##*:}"
    echo "SELECT setval(pg_get_serial_sequence('${tbl}', '${idcol}'), (SELECT COALESCE(MAX(${idcol}), 1) FROM ${tbl}));"
  done
  echo
  echo "COMMIT;"
} > "$OUT"

echo "Wrote $OUT ($(wc -l < "$OUT") lines)"
