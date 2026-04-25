export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
  ],
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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
    // Signs the session cookie to detect tampering. In production MUST be
    // a 32+ byte random string sourced from AWS Secrets Manager.
    secret:
      process.env.SESSION_SECRET ||
      'dev-session-secret-change-in-production-xxxxxxxxxx',
    ttlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? String(24 * 60 * 60), 10),
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'minio',
    endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    region: process.env.STORAGE_REGION || 'ap-northeast-1',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin123',
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
});
