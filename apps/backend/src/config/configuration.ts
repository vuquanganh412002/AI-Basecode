import { isNodeEnv, toBoolean } from '@/common/utils/env';
import {
  DEFAULT_FRONTEND_URL,
  DEFAULT_MAIL_FROM,
  DEFAULT_MAIL_FROM_NAME,
  DEFAULT_MAIL_HOST,
  DEFAULT_SESSION_TTL_SECONDS,
} from './config-defaults.constant';

/**
 * 本番に残してはならない開発用フォールバック。NODE_ENV=production でこれらが未設定
 * または dev 値のままなら factory が起動拒否 — Secrets Manager 未配線を安全に静かに
 * 動かすのでなく boot 時に大声でクラッシュさせる。
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

export default function configuration() {
  assertProductionSecrets();
  const storageProvider = process.env.STORAGE_PROVIDER || 'minio';

  return {
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      DEFAULT_FRONTEND_URL,
    ],
    app: {
      // SPA の公開ベース URL — BE がユーザー向け絶対リンク（パスワードリセットメール等）
      // に使用。未設定時はローカル Vite dev origin。
      frontendUrl: process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL,
      /**
       * Express `app.set('trust proxy', n)` 用の信頼リバースプロキシ hop 数。
       * CloudFront→ALB→ECS では信頼 hop が2つ付くため n=2 のときだけ `req.ip` が実
       * viewer IP に解決（X-Forwarded-For 偽装不可）。誤値だとレート制限＋監査ログが
       * proxy IP をキーにする（全リクエストが1クライアント扱い）か左端 XFF を信用する。
       * ローカル/proxy無し: 0。
       */
      trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '2', 10),
      // ログ保持年数。log-cleanup バッチが `t_log` / `t_login_log` の
      // この年数より古いレコードを物理削除する。既定5年（顧客レビュー 2026-07 No.5）。
      logRetentionYears: Number.parseInt(process.env.LOG_RETENTION_YEARS ?? '5', 10),
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      // dev fallback — assertProductionSecrets() rejects this in prod.
      password: process.env.DB_PASSWORD || DEV_FALLBACKS.DB_PASSWORD,
      database: process.env.DB_NAME || 'agrinews_dev',
      synchronize: false,
      // Managed Postgres (Aurora/RDS) は非 TLS を拒否（pg_hba "no encryption"）。
      // デプロイ環境は DB_SSL=true、ローカルは証明書無しで off。
      ssl: toBoolean(process.env.DB_SSL),
    },
    /**
     * Redis — ローカルは Docker サービス `redis`、本番は AWS ElastiCache。
     * `REDIS_URL`（単一文字列）があれば優先、無ければ host/port/pass から組立。
     */
    redis: {
      url: process.env.REDIS_URL || '',
      // REDIS_HOST 未設定でも NODE_ENV=local を動かす。Docker 利用者は .env で
      // REDIS_HOST=redis を設定可。
      host: process.env.REDIS_HOST || (isLocalNodeEnv() ? 'localhost' : 'redis'),
      port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
      // ElastiCache AUTH トークン — ECS は `REDIS_AUTH_TOKEN` で公開。ローカルの
      // `REDIS_PASSWORD` 規約と一致不要なので両名を受ける。
      password: process.env.REDIS_PASSWORD || process.env.REDIS_AUTH_TOKEN || '',
      // ElastiCache の in-transit 暗号化は TLS 必須、ローカルは off。
      tls: toBoolean(process.env.REDIS_TLS),
      keyPrefix: process.env.REDIS_KEY_PREFIX || '',
    },
    session: {
      cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
      // セッション cookie の署名（改竄検知）。本番は Secrets Manager の 32+ byte
      // ランダム文字列必須 — assertProductionSecrets() が強制。
      secret:
      process.env.SESSION_SECRET || DEV_FALLBACKS.SESSION_SECRET,
      ttlSeconds: Number.parseInt(
        process.env.SESSION_TTL_SECONDS ?? String(DEFAULT_SESSION_TTL_SECONDS),
        10,
      ),
    },
    storage: {
      provider: storageProvider,
      endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
      // [public-endpoint] presigned URL 書換え用のブラウザ向けホスト。内部 `endpoint`
      // (`http://minio:9000`) は Node SDK 用でブラウザは Docker ホスト名を解決不可。
      // 既定は同値、異なる時のみ設定（dev: backend→minio:9000, browser→localhost:9000）。
      publicEndpoint:
        process.env.STORAGE_PUBLIC_ENDPOINT ||
        process.env.STORAGE_ENDPOINT ||
        'http://localhost:9000',
      region: process.env.STORAGE_REGION || 'ap-northeast-1',
      // ECS の S3 は明示キー未設定なら task role を使用。ローカル MinIO は旧 docker
      // 構成向けにフォールバック資格情報を保持。
      accessKey:
        process.env.STORAGE_ACCESS_KEY ||
        (storageProvider === 's3' ? '' : DEV_FALLBACKS.STORAGE_ACCESS_KEY),
      secretKey:
        process.env.STORAGE_SECRET_KEY ||
        (storageProvider === 's3' ? '' : DEV_FALLBACKS.STORAGE_SECRET_KEY),
      bucket: process.env.STORAGE_BUCKET || 'agrinews',
    },
    /**
     * 顧客「電子版」DB（読み取り専用 / MySQL:3306）への副接続。メイン業務DB
     * (PostgreSQL, `database`) とは別物で、電子版の既存データ参照用。`readerexample`
     * のような読み取り専用ユーザーで接続する。
     *
     * `enabled=false` で完全スキップ可（接続情報未確定の環境ではアプリを落とさず
     * 無効化）。本番は DENSHIBAN_DB_* を ECS task definition / AWS Secrets Manager
     * から注入。まず検証環境（example.rds.amazonaws.com）で疎通確認する。
     */
    denshiban: {
      enabled: toBoolean(process.env.DENSHIBAN_DB_ENABLED ?? 'true'),
      host: process.env.DENSHIBAN_DB_HOST || 'example.rds.amazonaws.com',
      port: Number.parseInt(process.env.DENSHIBAN_DB_PORT ?? '3306', 10),
      username: process.env.DENSHIBAN_DB_USERNAME || 'readerexample',
      // 未共有の環境では空のまま — enabled=false で無効化するか
      // DENSHIBAN_DB_PASSWORD を env / Secrets Manager から注入。
      password: process.env.DENSHIBAN_DB_PASSWORD || '',
      // 接続先DB名。検証環境で未指定なら指定なしで接続を試みる。
      database: process.env.DENSHIBAN_DB_NAME || '',
      // 本番 RDS は TLS 必須。検証環境/ローカルは false。
      ssl: toBoolean(process.env.DENSHIBAN_DB_SSL),
      // 電子版共有の共通キー（common key: examplestring）。現状は疎通確認の対象外だが、
      // 今後の電子版DBデータ取得で利用するため設定として保持する。
      commonKey: process.env.DENSHIBAN_DB_COMMON_KEY || 'examplestring',
      // 電子版「会員情報更新」共通API (updateUserInfo)。顧客が ECS の NAT IP 2つのみ
      // whitelist するため、疎通確認はローカルではなく ECS 起動時に行う（DenshibanApiService）。
      apiUrl:
        process.env.DENSHIBAN_API_URL || '',
      // cloud → 電子版 push（updateUserInfo）の有効化フラグ。既定 OFF。ローカルは
      // 擬似デモ（denshiban-demo, http://host.docker.internal:4000/readermanage/
      // updateUserInfo）を DENSHIBAN_API_URL に設定し true にする。本番(AWS)は URL のみ
      // 差し替え。false なら push をスキップし cloud 書き込みのみ（電子版連携なしで動作確認可）。
      pushEnabled: toBoolean(process.env.DENSHIBAN_PUSH_ENABLED ?? 'false'),
      // dokusya-sync バッチの全件リコンサイルモード。true で watermark を無視し users
      // 全件を走査（夜間の取りこぼし対策・§2.3）。既定 OFF＝増分。
      fullSync: toBoolean(process.env.DENSHIBAN_FULL_SYNC),
    },
    mail: {
      // 任意上書き。未設定なら MailService が NODE_ENV で選択（local → SMTP/Mailhog、
      // 他 → SES）。docker-compose は NODE_ENV=development でも Mailhog を使うため
      // MAIL_PROVIDER=smtp を設定。
      provider: process.env.MAIL_PROVIDER || 'smtp',
      host: process.env.MAIL_HOST || DEFAULT_MAIL_HOST,
      port: Number.parseInt(process.env.MAIL_PORT ?? '1025', 10),
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
      from: process.env.MAIL_FROM || DEFAULT_MAIL_FROM,
      // 差出人の表示名。MAIL_FROM はアドレスのみ、表示名はこちらで付与
      // （例: "AGRINEWS" <noreply@agrinews.jp>）。
      fromName: process.env.MAIL_FROM_NAME || DEFAULT_MAIL_FROM_NAME,
      region: process.env.MAIL_REGION || 'ap-northeast-1',
      // SES configuration set (provider=ses only) — attributes outbound mail so
      // its CloudWatch metrics + SNS bounce/complaint events fire. Undefined
      // when unset → SES sends without a configuration set.
      configurationSet: process.env.MAIL_CONFIGURATION_SET || undefined,
    },
  };
};
