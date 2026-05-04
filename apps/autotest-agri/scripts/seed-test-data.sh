#!/usr/bin/env bash
# Purpose: Seed minimum test data into the test database (roles, JA, test accounts)
# Usage: bash scripts/seed-test-data.sh
# Dependencies: docker (backend container + postgres-test container must be running)
# Exit Codes: 0=success, 1=error
set -euo pipefail

BACKEND_CONTAINER="agrinews-backend-1"
PG_TEST_CONTAINER="agrinews-postgres-test-1"
TEST_PASSWORD="Test1234!"

# ── 1. Generate bcrypt hash inside backend container (has bcryptjs) ───────────
echo "[seed] Generating password hash..."
HASH="$(docker exec "$BACKEND_CONTAINER" node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('$TEST_PASSWORD', 10).then(h => process.stdout.write(h));
")"

if [ -z "$HASH" ]; then
  echo "[seed] ERROR: Failed to generate bcrypt hash." >&2
  exit 1
fi

# ── 2. Run seed SQL via postgres-test container ───────────────────────────────
echo "[seed] Seeding roles, JA and test accounts..."
docker exec "$PG_TEST_CONTAINER" psql -U agrinews_test -d agrinews_test -c "
-- Roles
INSERT INTO m_roles (role_code, role_name, created_by, updated_by)
VALUES
  ('NICHINO_ADMIN',   '日農管理者',   'seed', 'seed'),
  ('NICHINO_STAFF',   '日農スタッフ', 'seed', 'seed'),
  ('CHUOKAI',         '中央会',       'seed', 'seed'),
  ('JA_HONTEN',       'JA本店',       'seed', 'seed'),
  ('JA_KANRI_SHITEN', 'JA管理支店',   'seed', 'seed')
ON CONFLICT (role_code) DO NOTHING;

-- JA
INSERT INTO m_ja (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no, address, tel, bank_code, bank_name, zei_kubun, created_by, updated_by)
VALUES ('0001', 'テストJA', 'テストジェイエー', '13', '0000000', '', '', '0000', '', 1, 'seed', 'seed')
ON CONFLICT DO NOTHING;

-- Test accounts (one per role)
INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id, email, created_by, updated_by)
SELECT 'nichino_admin', '$HASH', 'テスト日農管理者', role_id, NULL, 'nichino_admin@test.agrinews.jp', 'seed', 'seed'
FROM m_roles WHERE role_code = 'NICHINO_ADMIN'
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id, email, created_by, updated_by)
SELECT 'chuokai', '$HASH', 'テスト中央会', role_id, (SELECT ja_id FROM m_ja WHERE ja_code='0001'), 'chuokai@test.agrinews.jp', 'seed', 'seed'
FROM m_roles WHERE role_code = 'CHUOKAI'
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id, email, created_by, updated_by)
SELECT 'ja_honten', '$HASH', 'テストJA本店', role_id, (SELECT ja_id FROM m_ja WHERE ja_code='0001'), 'ja_honten@test.agrinews.jp', 'seed', 'seed'
FROM m_roles WHERE role_code = 'JA_HONTEN'
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO m_account (login_id, password_hash, account_name, role_id, ja_id, email, created_by, updated_by)
SELECT 'ja_kanri', '$HASH', 'テストJA管理支店', role_id, (SELECT ja_id FROM m_ja WHERE ja_code='0001'), 'ja_kanri@test.agrinews.jp', 'seed', 'seed'
FROM m_roles WHERE role_code = 'JA_KANRI_SHITEN'
ON CONFLICT (login_id) DO NOTHING;

SELECT 'roles' AS table, count(*)::text AS count FROM m_roles
UNION ALL SELECT 'ja',       count(*)::text FROM m_ja
UNION ALL SELECT 'accounts', count(*)::text FROM m_account;
"

echo "[seed] Done. Test password for all accounts: $TEST_PASSWORD"
