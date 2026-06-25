import { isNodeEnv, toBoolean } from '@/common/utils/env';

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

function isLocalNodeEnv(): boolean {
  return isNodeEnv('local');
}

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
  const storageProvider = process.env.STORAGE_PROVIDER || 'minio';

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
      /**
       * Number of trusted reverse-proxy hops in front of the app, passed
       * to Express `app.set('trust proxy', n)`. Behind CloudFront → ALB →
       * ECS the chain appends TWO trusted hops (CloudFront edge + ALB), so
       * `req.ip` only resolves to the REAL viewer IP — not a client-spoofed
       * X-Forwarded-For — when n = 2. Wrong value = rate-limiting + audit
       * logs key on the proxy IP (every request looks like one client) or
       * trust a spoofable leftmost XFF entry. Local/no-proxy: set 0.
       */
      trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '2', 10),
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      // dev fallback — assertProductionSecrets() rejects this in prod.
      password: process.env.DB_PASSWORD || DEV_FALLBACKS.DB_PASSWORD,
      database: process.env.DB_NAME || 'agrinews_dev',
      synchronize: false,
      // Managed Postgres (AWS Aurora/RDS) rejects non-TLS connections
      // (pg_hba "no encryption"). Enable with DB_SSL=true in deployed
      // environments; off locally where Postgres has no certificate.
      ssl: toBoolean(process.env.DB_SSL),
    },
    /**
     * Redis — local Docker: service name `redis`; production: AWS ElastiCache.
     * Prefer `REDIS_URL` (single connection string) when present, otherwise
     * build the connection from host/port/password pieces.
     */
    redis: {
      url: process.env.REDIS_URL || '',
      // Keep old local (NODE_ENV=local) working even when REDIS_HOST is not set.
      // Docker users can still set REDIS_HOST=redis in .env.
      host: process.env.REDIS_HOST || (isLocalNodeEnv() ? 'localhost' : 'redis'),
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      // ElastiCache AUTH token. The ECS task definition exposes it as the
      // secret `REDIS_AUTH_TOKEN`; accept either name so the secret name
      // doesn't have to match the local `REDIS_PASSWORD` convention.
      password: process.env.REDIS_PASSWORD || process.env.REDIS_AUTH_TOKEN || '',
      // ElastiCache with in-transit encryption requires TLS; off locally.
      tls: toBoolean(process.env.REDIS_TLS),
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
      provider: storageProvider,
      endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
      // [public-endpoint] Browser-facing host used to rewrite presigned
      // URLs. Internal `endpoint` (e.g. `http://minio:9000`) is for the
      // Node SDK to connect; browsers can't resolve Docker hostnames.
      // Defaults to the same value — only set when the two differ
      // (e.g. dev: backend talks `http://minio:9000`, browser fetches
      // `http://localhost:9000`).
      publicEndpoint:
        process.env.STORAGE_PUBLIC_ENDPOINT ||
        process.env.STORAGE_ENDPOINT ||
        'http://localhost:9000',
      region: process.env.STORAGE_REGION || 'ap-northeast-1',
      // S3 on ECS should use the task role when no explicit key is set.
      // MinIO local dev keeps fallback credentials for the old docker setup.
      accessKey:
        process.env.STORAGE_ACCESS_KEY ||
        (storageProvider === 's3' ? '' : DEV_FALLBACKS.STORAGE_ACCESS_KEY),
      secretKey:
        process.env.STORAGE_SECRET_KEY ||
        (storageProvider === 's3' ? '' : DEV_FALLBACKS.STORAGE_SECRET_KEY),
      bucket: process.env.STORAGE_BUCKET || 'agrinews',
    },
    /**
     * 顧客システム「電子版」のDB（読み取り専用 / MySQL, port 3306）への副接続。
     * メインの業務DB（PostgreSQL, `database` 上）とは別物で、電子版側が
     * 保持する既存データを参照するための専用コネクション。`readerexample`
     * のような読み取り専用ユーザーで接続する。
     *
     * `enabled=false` で接続を完全にスキップできる（接続情報が未確定の
     * 環境ではアプリ本体を落とさず無効化する）。本番では DENSHIBAN_DB_*
     * を ECS task definition / AWS Secrets Manager から注入する。
     * まずは検証環境（verification: example.rds.amazonaws.com）で疎通を確認する。
     */
    denshiban: {
      enabled: toBoolean(process.env.DENSHIBAN_DB_ENABLED ?? 'true'),
      host: process.env.DENSHIBAN_DB_HOST || 'example.rds.amazonaws.com',
      port: parseInt(process.env.DENSHIBAN_DB_PORT ?? '3306', 10),
      username: process.env.DENSHIBAN_DB_USERNAME || 'readerexample',
      // 接続情報が共有されていない環境では空のまま — enabled=false で無効化するか
      // DENSHIBAN_DB_PASSWORD を env / Secrets Manager から注入する。
      password: process.env.DENSHIBAN_DB_PASSWORD || '',
      // 接続先データベース名。検証環境で未指定なら指定なしで接続を試みる。
      database: process.env.DENSHIBAN_DB_NAME || '',
      // 本番 RDS は TLS 必須。検証環境/ローカルでは false。
      ssl: toBoolean(process.env.DENSHIBAN_DB_SSL),
      // 電子版から共有された共通キー（common key: examplestring）。現状は接続確認の
      // 対象外だが、今後この電子版DBのデータ取得時に利用するため設定として保持する。
      commonKey: process.env.DENSHIBAN_DB_COMMON_KEY || 'examplestring',
      // ⚠️ TEMPORARY — 起動時にテーブル一覧 + t_dokusya 先頭10件を「ログに出す」
      // 診断フラグ。t_dokusya は購読者(PII)なので、これは CloudWatch に PII を
      // 書き出す＝本来は禁止行為（.claude/rules/security.md / monitoring.md）。
      // dump 許可を顧客に取りに行っている間の暫定確認用。dev/検証のみ true、
      // 本番では必ず未設定(false)。許可が下りたら本フラグごと削除する。
      debugSample: toBoolean(process.env.DENSHIBAN_DB_DEBUG_SAMPLE),
    },
    mail: {
      // Optional explicit override. When unset, MailService selects the provider
      // from NODE_ENV (local → SMTP/Mailhog, otherwise → SES). docker-compose
      // sets MAIL_PROVIDER=smtp to force Mailhog while NODE_ENV=development.
      provider: process.env.MAIL_PROVIDER || 'smtp',
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
      from: process.env.MAIL_FROM || 'noreply@agrinews.jp',
      region: process.env.MAIL_REGION || 'ap-northeast-1',
      // SES configuration set (provider=ses only). Attributes outbound mail to
      // the set so its CloudWatch metrics + SNS bounce/complaint events fire.
      // Undefined when unset → SES sends without a configuration set.
      configurationSet: process.env.MAIL_CONFIGURATION_SET || undefined,
      // 日農担当者向け 増減通知（SCR-029）作成完了メールの宛先。本番は ECS task
      // env / Secrets で日農の業務管理部アドレスを設定する。
      nichinoNotifyAddress:
        process.env.MAIL_NICHINO_NOTIFY_ADDRESS || 'nichino-gyomu@agrinews.jp',
    },
  };
};
