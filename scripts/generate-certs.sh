#!/usr/bin/env bash
# Purpose: Generate SSL certificates (mkcert) + JWT RS256 keys (openssl) for local development
# Usage: ./scripts/generate-certs.sh
# Dependencies: mkcert, openssl
# Exit Codes: 0=success, 1=missing dependency
set -euo pipefail

readonly EXIT_SUCCESS=0
readonly EXIT_MISSING_DEP=1
readonly CERT_DIR="apps/docker/certs"
readonly DOMAIN="agrinews.jp"

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
check_dependency "openssl"

mkdir -p "${CERT_DIR}"

# === 1. SSL Certificate (mkcert — locally-trusted) ===
echo "=== Generating SSL certificate for ${DOMAIN} ==="
mkcert -install
mkcert \
  -cert-file "${CERT_DIR}/${DOMAIN}.pem" \
  -key-file "${CERT_DIR}/${DOMAIN}-key.pem" \
  "${DOMAIN}" "*.${DOMAIN}" localhost 127.0.0.1 ::1

echo "SSL cert: ${CERT_DIR}/${DOMAIN}.pem"
echo "SSL key:  ${CERT_DIR}/${DOMAIN}-key.pem"

# === 2. JWT RS256 Key Pair (openssl) ===
echo ""
echo "=== Generating JWT RS256 key pair ==="
openssl genrsa -out "${CERT_DIR}/dev-private.pem" 2048
openssl rsa -in "${CERT_DIR}/dev-private.pem" -pubout -out "${CERT_DIR}/dev-public.pem"
chmod 600 "${CERT_DIR}/dev-private.pem"

echo "JWT private: ${CERT_DIR}/dev-private.pem"
echo "JWT public:  ${CERT_DIR}/dev-public.pem"

echo ""
echo "All certificates generated in ${CERT_DIR}/"
echo ""
echo "Next step: add '127.0.0.1 ${DOMAIN}' to /etc/hosts"
echo "  Run: ./scripts/setup-hosts.sh"
exit "${EXIT_SUCCESS}"
