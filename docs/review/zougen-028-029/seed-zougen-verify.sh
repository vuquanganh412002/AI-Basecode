#!/usr/bin/env bash
# Purpose: Seed dữ liệu kiểm chứng báo cáo 増減 (SCR-028/029) vào PostgreSQL.
#          Chạy seed-zougen-verify.sql (idempotent) rồi kiểm tra số bản ghi.
# Usage:   ./seed-zougen-verify.sh
#          DB_CONTAINER=my-pg DB_NAME=agrinews_dev DB_USER=postgres ./seed-zougen-verify.sh
# Dependencies: docker, psql (trong container)
# Exit Codes: 0=success, 2=thiếu tham số/môi trường, 3=thiếu dependency,
#             4=container không chạy, 5=seed thất bại
set -euo pipefail

# ── Hằng số / cấu hình (override qua biến môi trường) ───────────────────────
readonly EXIT_SUCCESS=0
readonly EXIT_MISSING_DEP=3
readonly EXIT_NO_CONTAINER=4
readonly EXIT_SEED_FAILED=5

DB_CONTAINER="${DB_CONTAINER:-agrinews-postgres-1}"
DB_NAME="${DB_NAME:-agrinews_dev}"
DB_USER="${DB_USER:-postgres}"
readonly DB_CONTAINER DB_NAME DB_USER

readonly JA_CODE="JAZG9001"
readonly LOGIN_ID="chuokai_zg"
readonly LOGIN_PWD="admin@1234567"

# Thư mục chứa script này → tìm file .sql cạnh nó.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly SEED_SQL="${SCRIPT_DIR}/seed-zougen-verify.sql"

# ── Helpers ────────────────────────────────────────────────────────────────
log() {
  printf '[seed-zougen] %s\n' "$1" >&2
}

check_dependencies() {
  command -v docker >/dev/null 2>&1 || {
    log "ERROR: 'docker' không tìm thấy trong PATH."
    exit "$EXIT_MISSING_DEP"
  }
  [ -f "$SEED_SQL" ] || {
    log "ERROR: Không tìm thấy file seed: $SEED_SQL"
    exit "$EXIT_MISSING_DEP"
  }
}

check_container() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    log "ERROR: Container '$DB_CONTAINER' không chạy. Đặt DB_CONTAINER=... nếu tên khác."
    exit "$EXIT_NO_CONTAINER"
  fi
}

# Chạy 1 câu SQL, trả về stdout đã trim.
run_sql() {
  local sql="$1"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$sql"
}

run_seed() {
  log "Đang seed vào ${DB_CONTAINER}/${DB_NAME} ..."
  if ! docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 < "$SEED_SQL"; then
    log "ERROR: Seed thất bại."
    exit "$EXIT_SEED_FAILED"
  fi
}

verify_seed() {
  local ja_id master_cnt rireki_cnt acc_cnt
  ja_id="$(run_sql "SELECT ja_id FROM m_ja WHERE ja_code='${JA_CODE}';")"
  if [ -z "$ja_id" ]; then
    log "ERROR: Không tìm thấy JA '${JA_CODE}' sau khi seed."
    exit "$EXIT_SEED_FAILED"
  fi
  master_cnt="$(run_sql "SELECT count(*) FROM t_dokusya d JOIN m_ja j ON j.ja_id=d.ja_id WHERE j.ja_code='${JA_CODE}';")"
  rireki_cnt="$(run_sql "SELECT count(*) FROM t_dokusya_rireki r JOIN m_ja j ON j.ja_id=r.ja_id WHERE j.ja_code='${JA_CODE}';")"
  acc_cnt="$(run_sql "SELECT count(*) FROM m_account WHERE login_id='${LOGIN_ID}';")"

  log "──────────────────────────────────────────────"
  log "Seed OK."
  log "  JA          : ${JA_CODE} (ja_id=${ja_id})"
  log "  Độc giả     : ${master_cnt} master / ${rireki_cnt} lịch sử (rireki)"
  log "  Account     : ${acc_cnt}  → login ${LOGIN_ID} / ${LOGIN_PWD}"
  log "──────────────────────────────────────────────"
  log "Tiếp theo — chạy verify (đổi tekiyo tùy ý):"
  log "  docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} \\"
  log "    -v tekiyo=\"'2026-07-01'\" -v hanbaiten_codes=\"\" -v kanri_shiten_codes=\"\" \\"
  log "    < ${SCRIPT_DIR}/verify-zougen-report.sql"
}

main() {
  check_dependencies
  check_container
  run_seed
  verify_seed
  exit "$EXIT_SUCCESS"
}

main "$@"
