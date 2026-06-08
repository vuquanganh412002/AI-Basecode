#!/usr/bin/env bash
# Purpose: Initialize MinIO bucket for local development
# Usage: Called by docker-compose minio-init service
# Dependencies: mc (MinIO Client)
# Exit Codes: 0=success
set -euo pipefail

mc alias set local http://minio:9000 "${STORAGE_ACCESS_KEY}" "${STORAGE_SECRET_KEY}"
mc mb --ignore-existing "local/${STORAGE_BUCKET}"
echo "MinIO bucket '${STORAGE_BUCKET}' ready."
