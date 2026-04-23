import { readFileSync } from 'fs';

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
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY_PATH
      ? readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8')
      : '',
    publicKey: process.env.JWT_PUBLIC_KEY_PATH
      ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
      : '',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
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
