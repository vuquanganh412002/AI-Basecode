import { isNodeEnv, toBoolean } from '@/common/utils/env';
import {
  DEFAULT_FRONTEND_URL,
  DEFAULT_MAIL_FROM,
  DEFAULT_MAIL_FROM_NAME,
  DEFAULT_MAIL_HOST,
  DEFAULT_SESSION_TTL_SECONDS,
} from './config-defaults.constant';

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
      DEFAULT_FRONTEND_URL,
    ],
    app: {
      /**
       * Public base URL of the SPA — used by BE when composing absolute
       * links sent to users (password-reset email, etc.). Falls back to
       * the local Vite dev server origin.
       */
      frontendUrl: process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL,
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
      /**
       * ログ保持年数。ログ削除バッチ(log-cleanup)が
       * `t_log` / `t_login_log` のうちこの年数より古いレコードを物理削除する。
       * 既定は 5年（顧客レビュー 2026-07 No.5）。
       */
      logRetentionYears: Number.parseInt(process.env.LOG_RETENTION_YEARS ?? '5', 10),
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
      ttlSeconds: parseInt(
        process.env.SESSION_TTL_SECONDS ?? String(DEFAULT_SESSION_TTL_SECONDS),
        10,
      ),
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
      port: Number.parseInt(process.env.DENSHIBAN_DB_PORT ?? '3306', 10),
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
      // 電子版「会員情報更新」共通API (updateUserInfo)。顧客は ECS の NAT IP
      // 2つだけを whitelist しているため、疎通確認はローカルからではなく
      // ECS 起動時に行う（DenshibanApiService）。
      apiUrl:
        process.env.DENSHIBAN_API_URL || '',
      // ⚠️ TEMPORARY 診断フラグ — true のとき、起動時に updateUserInfo へ
      // 「データを書き込まない invalid probe」を1回 POST して response を
      // ログに出す（NAT whitelist + TLS + 共通鍵での復号が通るか確認）。
      // 既定 OFF。疎通確認が済んだら本フラグごと削除する。
      apiPing: toBoolean(process.env.DENSHIBAN_API_PING),
      // cloud → 電子版 push（updateUserInfo 呼び出し）の有効化フラグ。既定 OFF。
      // ローカルは擬似デモ（denshiban-demo, http://host.docker.internal:4000/
      // readermanage/updateUserInfo）を DENSHIBAN_API_URL に設定し true にする。
      // 本番(AWS)は URL だけ差し替える。false のときは push をスキップし cloud の
      // 書き込みのみ行う（電子版連携なしで動作確認できる）。
      pushEnabled: toBoolean(process.env.DENSHIBAN_PUSH_ENABLED ?? 'false'),
      // dokusya-sync バッチの全件リコンサイルモード。true のとき watermark を
      // 無視して users 全件を走査する（夜間の取りこぼし対策・§2.3）。既定 OFF＝増分。
      fullSync: toBoolean(process.env.DENSHIBAN_FULL_SYNC),
    },
    mail: {
      // Optional explicit override. When unset, MailService selects the provider
      // from NODE_ENV (local → SMTP/Mailhog, otherwise → SES). docker-compose
      // sets MAIL_PROVIDER=smtp to force Mailhog while NODE_ENV=development.
      provider: process.env.MAIL_PROVIDER || 'smtp',
      host: process.env.MAIL_HOST || DEFAULT_MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
      from: process.env.MAIL_FROM || DEFAULT_MAIL_FROM,
      // 受信トレイに表示する送信者名（差出人の表示名）。MAIL_FROM はアドレスのみ、
      // 表示名はこちらで付与する（例: "AGRINEWS" <noreply@agrinews.jp>）。
      fromName: process.env.MAIL_FROM_NAME || DEFAULT_MAIL_FROM_NAME,
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
