#!/usr/bin/env bash
# Purpose: Generate SSL certificates (mkcert) for local HTTPS development.
#          Auth uses HTTP-only Cookie session (Redis-backed) — no JWT keys needed.
# Usage: ./scripts/generate-certs.sh
# Dependencies: mkcert
# Exit Codes: 0=success, 1=missing dependency
set -euo pipefail

readonly EXIT_SUCCESS=0
readonly EXIT_MISSING_DEP=1
readonly CERT_DIR="apps/docker/certs"
readonly DOMAIN="__PROJECT__.local"

check_dependency() {
  local cmd="$1"
  if ! command -v "${cmd}" &> /dev/null; then
    echo "ERROR: ${cmd} is required but not installed." >&2
    echo "  macOS: brew install ${cmd}" >&2
    echo "  Linux: sudo apt install ${cmd}" >&2
    exit "${EXIT_MISSING_DEP}"
  fi
}

check_dependency "mkcert"

mkdir -p "${CERT_DIR}"

# === SSL Certificate (mkcert — locally-trusted) ===
echo "=== Generating SSL certificate for ${DOMAIN} ==="
mkcert -install
mkcert \
  -cert-file "${CERT_DIR}/${DOMAIN}.pem" \
  -key-file "${CERT_DIR}/${DOMAIN}-key.pem" \
  "${DOMAIN}" "*.${DOMAIN}" localhost 127.0.0.1 ::1

echo "SSL cert: ${CERT_DIR}/${DOMAIN}.pem"
echo "SSL key:  ${CERT_DIR}/${DOMAIN}-key.pem"

echo ""
echo "All certificates generated in ${CERT_DIR}/"
echo ""
echo "Next step: add '127.0.0.1 ${DOMAIN}' to /etc/hosts"
echo "  Run: ./scripts/setup-hosts.sh"
exit "${EXIT_SUCCESS}"
