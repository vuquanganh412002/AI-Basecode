import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { isNodeEnv, toBoolean } from '@/common/utils/env';
import { configurePgTypeParsers } from '@/database/pg-type-parsers';

// DATE 列を 'YYYY-MM-DD' 文字列で受け取る (runtime と挙動を揃える)。
configurePgTypeParsers();

config();
if (isNodeEnv('local')) {
  // Local mode can keep machine-specific overrides in .env.local.
  config({ path: '.env', override: true });
}

const useSsl = toBoolean(process.env.DB_SSL);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Default MUST stay in sync with `src/config/configuration.ts` so
  // `npm run migration:run` (CLI, no Nest DI) and the runtime
  // DatabaseModule end up on the same DB when DB_NAME is unset.
  database: process.env.DB_NAME || 'agrinews_dev',
  entities: [join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  // Aurora/RDS require TLS — must match database.module.ts / configuration.ts.
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  // JST 運用 — keep CLI (migration:generate / migration:run / migration:revert)
  // aligned with the runtime DataSource in database.module.ts.
  extra: { options: '-c timezone=Asia/Tokyo' },
});
