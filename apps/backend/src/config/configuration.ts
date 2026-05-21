/**
 * Dev-only fallback values that MUST NOT survive into a production
 * deployment. The factory below refuses to start when NODE_ENV is
 * 'production' and any of these env vars are missing or still at the
 * dev value, so a missing AWS Secrets Manager wiring crashes loud at
 * boot instead of silently running with insecure defaults.
 */
const DEV_FALLBACKS = {
  SESSION_SECRET: 'dev-session-secret-change-in-production-xxxxxxxxxx',
  DB_PASSWORD: 'postgres',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin123',
} as const;

const MIN_SESSION_SECRET_LENGTH = 32;

function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];
  for (const [key, devFallback] of Object.entries(DEV_FALLBACKS)) {
    const value = process.env[key];
    if (!value) {
      missing.push(`${key} (unset)`);
    } else if (value === devFallback) {
      missing.push(`${key} (still at dev default)`);
    }
  }
  if (
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH
  ) {
    missing.push(
      `SESSION_SECRET (length < ${MIN_SESSION_SECRET_LENGTH} bytes)`,
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `[config] Refusing to start: NODE_ENV=production but the following ` +
        `secrets are missing or still at insecure defaults — ` +
        `${missing.join(', ')}. ` +
        `Wire each from AWS Secrets Manager via the ECS task definition. ` +
        `See .claude/rules/security.md for the canonical secret list.`,
    );
  }
}

export default () => {
  assertProductionSecrets();

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
    ],
    app: {
      /**
       * Public base URL of the SPA — used by BE when composing absolute
       * links sent to users (password-reset email, etc.). Falls back to
       * the local Vite dev server origin.
       */
      frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      // dev fallback — assertProductionSecrets() rejects this in prod.
      password: process.env.DB_PASSWORD || DEV_FALLBACKS.DB_PASSWORD,
      database: process.env.DB_NAME || 'agrinews_dev',
      synchronize: false,
    },
    /**
     * Redis — local Docker: service name `redis`; production: AWS ElastiCache.
     * Prefer `REDIS_URL` (single connection string) when present, otherwise
     * build the connection from host/port/password pieces.
     */
    redis: {
      url: process.env.REDIS_URL || '',
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      // ElastiCache with in-transit encryption requires TLS; off locally.
      tls: process.env.REDIS_TLS === 'true',
      keyPrefix: process.env.REDIS_KEY_PREFIX || '',
    },
    session: {
      cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
      // Signs the session cookie to detect tampering. In production MUST
      // be a 32+ byte random string from AWS Secrets Manager — enforced
      // at boot by assertProductionSecrets().
      secret:
      process.env.SESSION_SECRET || DEV_FALLBACKS.SESSION_SECRET,
      ttlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? String(24 * 60 * 60), 10),
    },
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'minio',
      endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
      region: process.env.STORAGE_REGION || 'ap-northeast-1',
      // dev fallback — assertProductionSecrets() rejects these in prod.
      accessKey: process.env.STORAGE_ACCESS_KEY || DEV_FALLBACKS.STORAGE_ACCESS_KEY,
      secretKey: process.env.STORAGE_SECRET_KEY || DEV_FALLBACKS.STORAGE_SECRET_KEY,
      bucket: process.env.STORAGE_BUCKET || 'agrinews',
    },
    mail: {
      provider: process.env.MAIL_PROVIDER || 'smtp',
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
      from: process.env.MAIL_FROM || 'noreply@agrinews.jp',
      region: process.env.MAIL_REGION || 'ap-northeast-1',
    },
  };
};
