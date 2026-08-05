/**
 * Production-safe seeder — bootstraps the single initial admin account.
 * Safe to run in any environment (dev / stg / prod). Run this FIRST on a
 * fresh database so `admin` takes account_id=1.
 *
 * Inserts:
 *   - m_account x 1 (login_id='admin', role_id=1 NICHINO_ADMIN, ja_id=NULL)
 *
 * Invoke with:
 *   npm run seed:admin
 *
 * NOT wired into migrationsRun — never auto-runs at boot. Idempotent:
 * skips when login_id='admin' already exists.
 *
 * 顧客提供のサンプルマスタ（JA 5 / 管理支店 6 / 電子版ダミー販売店 5 /
 * アカウント 13）は `npm run seed:sample` を本スクリプトの後に実行する
 * （NODE_ENV=production では起動を拒否する）。
 *
 * Env vars:
 *   INITIAL_ADMIN_EMAIL      — default 'admin@agrinews-manage.com' (MFA OTP destination)
 *   INITIAL_ADMIN_PASSWORD   — required in production. In dev, defaults to
 *                              the fixed 'admin@1234567' so developers can
 *                              log in without grepping logs.
 *   INITIAL_ADMIN_LOGIN_ID   — default 'admin'
 *   INITIAL_ADMIN_NAME       — default '日農 管理者'
 */
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import dataSource from '@/database/data-source';

config();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;
// NOSONAR — intentional hard-coded fixture password, dev fallback only.
// Production refuses to use it (see check below).
const DEV_DEFAULT_PASSWORD = 'admin@1234567';

async function main(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const loginId = process.env.INITIAL_ADMIN_LOGIN_ID ?? 'admin';
  const accountName = process.env.INITIAL_ADMIN_NAME ?? '日農 管理者';
  const email = process.env.INITIAL_ADMIN_EMAIL ?? 'admin@agrinews-manage.com';

  let password = process.env.INITIAL_ADMIN_PASSWORD;
  let passwordSource: 'env' | 'default' = 'env';

  if (!password) {
    if (isProd) {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD is required in production. Generate one out-of-band, ' +
          'store it in your secrets manager, and pass it via env.',
      );
    }
    password = DEV_DEFAULT_PASSWORD;
    passwordSource = 'default';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await dataSource.initialize();
  try {
    const existing = await dataSource.query(
      `SELECT account_id FROM m_account WHERE login_id = $1 LIMIT 1`,
      [loginId],
    );
    if (existing.length > 0) {
      console.log(
        `[seed:admin] admin '${loginId}' already exists (account_id=${existing[0].account_id}) — skipping`,
      );
      return;
    }

    await dataSource.query(
      `INSERT INTO m_account (
         login_id, password_hash, account_name, role_id,
         ja_id, kanri_shiten_id, todofuken_code,
         paper_flg, denshi_flg,
         email, sub_email_1, sub_email_2, sub_email_3,
         password_updated_at, last_login_at, login_failure_count,
         mfa_enable_flg, account_lock_flg, account_lock_at,
         biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, 1,
         NULL, NULL, NULL,
         false, false,
         $4, '', '', '',
         NOW(), NULL, 0,
         true, false, NULL,
         '初期管理者アカウント',
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )`,
      [loginId, passwordHash, accountName, email],
    );

    console.log(`[seed:admin] created admin '${loginId}' (role_id=1, mfa_enable_flg=true, email=${email})`);
    if (passwordSource === 'default') {
      console.log(`[seed:admin] password = '${DEV_DEFAULT_PASSWORD}' (dev default — pass INITIAL_ADMIN_PASSWORD to override)`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[seed:admin] failed:', err.message);
  process.exit(1);
});
