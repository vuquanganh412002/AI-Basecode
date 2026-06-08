#!/usr/bin/env bash
# Purpose: Add agrinews.jp to /etc/hosts for local development
# Usage: ./scripts/setup-hosts.sh (requires sudo)
# Dependencies: none
# Exit Codes: 0=success, 2=already configured
set -euo pipefail

readonly EXIT_SUCCESS=0
readonly EXIT_ALREADY_SET=2
readonly DOMAIN="agrinews.jp"
readonly HOSTS_FILE="/etc/hosts"
readonly ENTRY="127.0.0.1 ${DOMAIN}"

if grep -q "${DOMAIN}" "${HOSTS_FILE}"; then
  echo "${DOMAIN} is already in ${HOSTS_FILE}"
  exit "${EXIT_ALREADY_SET}"
fi

echo "Adding '${ENTRY}' to ${HOSTS_FILE} (requires sudo)..."
echo "${ENTRY}" | sudo tee -a "${HOSTS_FILE}" > /dev/null
echo "Done. ${DOMAIN} now resolves to 127.0.0.1"
exit "${EXIT_SUCCESS}"
