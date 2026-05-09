/**
 * One-shot bootstrap for the initial NICHINO_ADMIN account.
 *
 * Invoke explicitly per environment:
 *   npm run seed
 *
 * NOT wired into migrationsRun — never auto-runs at boot. Idempotent: skips
 * if a row with login_id='admin' already exists.
 *
 *   INITIAL_ADMIN_LOGIN_ID   default 'admin'
 *   INITIAL_ADMIN_EMAIL      required (used as MFA OTP destination)
 *   INITIAL_ADMIN_PASSWORD   required in production; random fallback in dev (logged once)
 *   INITIAL_ADMIN_NAME       default '日農 管理者'
 */
import { config } from 'dotenv';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '../src/database/data-source';

config();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

function generateRandomPassword(): string {
  // 18 bytes → 24 base64 chars, removing URL-unsafe characters keeps it
  // copy-pasteable in any terminal.
  return randomBytes(18).toString('base64').replace(/[+/=]/g, '').slice(0, 24);
}

async function main(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const loginId = process.env.INITIAL_ADMIN_LOGIN_ID ?? 'admin';
  const accountName = process.env.INITIAL_ADMIN_NAME ?? '日農 管理者';
  const email = process.env.INITIAL_ADMIN_EMAIL;

  if (!email) {
    throw new Error(
      'INITIAL_ADMIN_EMAIL is required — MFA OTP cannot be delivered without it',
    );
  }

  let password = process.env.INITIAL_ADMIN_PASSWORD;
  let passwordSource: 'env' | 'generated' = 'env';

  if (!password) {
    if (isProd) {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD is required in production. Generate one out-of-band, ' +
          'store it in your secrets manager, and pass it via env.',
      );
    }
    password = generateRandomPassword();
    passwordSource = 'generated';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  await dataSource.initialize();
  try {
    const existing = await dataSource.query(
      `SELECT account_id FROM m_account WHERE login_id = $1 LIMIT 1`,
      [loginId],
    );
    if (existing.length > 0) {
      console.log(
        `[seed] admin '${loginId}' already exists (account_id=${existing[0].account_id}) — skipping`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await dataSource.query(
      `INSERT INTO m_account (
         login_id, password_hash, account_name, role_id, ja_id, kanri_shiten_id, todofuken_code,
         paper_flg, denshi_flg, email, password_updated_at, last_login_at,
         login_failure_count, account_lock_flg, account_lock_at, biko, mfa_enable_flg,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3,
         1, NULL, NULL, NULL,
         false, false, $4, NOW(), NULL,
         0, false, NULL, '初期管理者アカウント', true,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )`,
      [loginId, passwordHash, accountName, email],
    );

    console.log(`[seed] created admin '${loginId}' (role_id=1, mfa_enable_flg=true)`);
    if (passwordSource === 'generated') {
      console.log('---------------------------------------------------------------');
      console.log(`[seed] generated password (shown ONCE — store it now): ${password}`);
      console.log('---------------------------------------------------------------');
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
