/**
 * Shared helper for backend integration specs.
 *
 * Solves four obstacles that make pg-mem + ioredis-mock + Nest hard to
 * assemble correctly:
 *
 *   1. pg-mem ↔ TypeOrmModule — uses `dataSourceFactory` so Nest reuses
 *      the in-memory DataSource instead of spawning a new connection
 *      that dials localhost:5432.
 *   2. ConfigService — loads the same `configuration` factory production
 *      uses, so SessionService etc. find `session.ttlSeconds` etc.
 *   3. ioredis-mock — wraps an in-memory Redis instance behind a fake
 *      RedisService so SessionService.create/get/touch work.
 *   4. m_code timing — seeds m_code BEFORE `app.init()` fires
 *      CodeService.onModuleInit() so its in-memory cache is populated.
 *
 * Usage from a spec:
 *
 *   const ctx = await createIntegrationTestApp({ modules: [JaModule] });
 *   const sid = await ctx.seedSession({ permissions: ['ja.view'] });
 *   await request(ctx.app.getHttpServer()).get('/api/v1/ja/1')
 *     .set('Cookie', [`session_id=s:${sid}.sig`])
 *     .expect(200);
 *   await ctx.close();
 */

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import {
  Global,
  HttpException,
  HttpStatus,
  INestApplication,
  Module,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import {
  Test,
  TestingModule,
  TestingModuleBuilder,
} from '@nestjs/testing';
import {
  TypeOrmModule,
  getDataSourceToken,
} from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import IORedis from 'ioredis-mock';
import { DataSource, DataSourceOptions } from 'typeorm';
import { newDb } from 'pg-mem';
import { join } from 'node:path';

import configuration from '@/config/configuration';
import { configurePgTypeParsers } from '@/database/pg-type-parsers';
import { API_PREFIX } from '@/common/constants/api.constants';
// All entity classes — pg-mem needs an explicit list to register schema
// because dataSourceFactory bypasses TypeOrmModule.forFeature autoload.
import { Account } from '@/database/entities/account.entity';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { Permission } from '@/database/entities/permission.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { MCode } from '@/database/entities/m-code.entity';
import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Ja } from '@/database/entities/ja.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { Oshirase } from '@/database/entities/oshirase.entity';
// SCR-011 — t_dokusya / t_dokusya_rireki entities are created by
// /gen-code-backend ACSMS-SCR-011; this import is part of the RED-phase
// integration spec that intentionally fails to compile until then.
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
// SCR-020 — t_koza_furikae snapshot table (口座振替データ出力).
import { KozaFurikae } from '@/database/entities/koza-furikae.entity';

import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { CodeModule } from '@/modules/code/code.module';
import { CodeService } from '@/modules/code/code.service';
import { DenshibanApiService } from '@/modules/denshiban/denshiban-api.service';
import { MailModule } from '@/modules/mail/mail.module';
import { MailService } from '@/modules/mail/mail.service';
import { RedisModule } from '@/modules/redis/redis.module';
import { RedisService } from '@/modules/redis/redis.service';
import { SessionService, SessionPayload } from '@/modules/auth/session.service';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';

/**
 * 電子版連携のスタブ。`DokusyaService` は create/update/approve/stop で
 * `DenshibanApiService.sendNow()` を **COMMIT 前に await** するので、素の
 * `DenshibanDbModule` を読ませると統合テストが顧客システムへ本当に POST して
 * しまう（しかも失敗すれば業務トランザクションごと巻き戻るので、テストは
 * 電子版の生死に左右される）。Redis / Mail / Storage と同じ方針でスタブに置く。
 *
 * `sendNow` が `null` を返す = 「送信対象外」— 紙版・併読と同じ経路になり、
 * `denshi_kaiin_id` を触らない。送信内容そのものの検証は
 * `denshiban-payload.*.spec.ts` / `denshiban-api.service.spec.ts` の担当。
 *
 * 本番では `DenshibanDbModule`（`@Global`）が `AppModule` から実体を配る。
 */
@Global()
@Module({
  providers: [
    {
      provide: DenshibanApiService,
      useValue: { sendNow: async () => null },
    },
  ],
  exports: [DenshibanApiService],
})
class DenshibanSyncStubModule {}

export interface IntegrationTestContext {
  app: INestApplication;
  dataSource: DataSource;
  redis: any;
  sessionService: SessionService;
  /** Seed a session in Redis and return the session_id. */
  seedSession: (overrides?: Partial<SessionPayload>) => Promise<string>;
  close: () => Promise<void>;
}

export interface CreateIntegrationOptions {
  /** Feature modules under test (e.g. [JaModule]). AuthModule + CodeModule
   *  + AuditLogModule + RedisModule are always added. */
  modules?: Type<unknown>[];
  /**
   * Optional callback to override providers on the testing module before it
   * compiles (rarely needed; ioredis-mock + ConfigService are wired here).
   */
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  /** Extra SQL to run after schema sync but before app.init() — ideal for
   *  seeding m_code rows so CodeService.onModuleInit picks them up. */
  seedSql?: string[];
  /**
   * Opt-in: register `ThrottlerModule` + `APP_GUARD` so the @Throttle()
   * decorators on auth endpoints actually fire. Off by default — most
   * integration specs only call each endpoint a couple of times and the
   * extra guard adds latency. Used by `auth.throttle.integration.spec.ts`
   * to prove the rate limits are wired.
   */
  enableThrottler?: boolean;
}

/**
 * Build a pg-mem DataSource that TypeORM can drive. Registers the few
 * Postgres functions pg-mem doesn't ship natively but our migrations / SQL
 * snippets reference (`current_database`, `version`, `now`).
 */
const ALL_ENTITIES = [
  Account,
  MfaOtp,
  Permission,
  Role,
  RolePermission,
  MCode,
  Log,
  LoginLog,
  Hanbaiten,
  Ja,
  KanriShiten,
  Shiten,
  Tanka,
  Todofuken,
  Oshirase,
  FileUpload,
  FileDownload,
  Dokusya,
  DokusyaRireki,
  KozaFurikae,
];

function buildPgMemDataSource(): DataSource {
  const pgmem = newDb({ autoCreateForeignKeyIndices: true });
  pgmem.public.registerFunction({
    name: 'current_database',
    implementation: () => 'test',
  });
  pgmem.public.registerFunction({
    name: 'version',
    implementation: () => 'pg-mem',
  });
  return pgmem.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: ALL_ENTITIES,
    synchronize: false, // we trigger synchronize() explicitly later
  }) as DataSource;
}

// ════════════════════════════════════════════════════════════════════════
// Real-Postgres integration harness
//
// Some endpoints use SQL that pg-mem cannot execute (window functions like
// ROW_NUMBER(), `= ANY($1)`, `RETURNING`, `DISTINCT ON`, CONCAT/`||` in LIKE,
// dynamic SET). Those specs are gated behind `describeRealPg` and run only
// when `REAL_PG=1` is set (nightly CI / local opt-in) — default `npm test`
// stays on pg-mem so contributors without Docker keep a green suite.
//
// Each Jest worker provisions its OWN database (`agrinews_inttest_<workerId>`)
// once: create-if-missing + run all migrations. Tables are TRUNCATEd between
// tests (see bootApp). Connection defaults to localhost:5432/postgres — set
// INTEGRATION_DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD to override.
// NB: we deliberately do NOT read DB_HOST (the docker-compose `.env` sets it
// to the in-container hostname `postgres`, unreachable from the host runner).
// ════════════════════════════════════════════════════════════════════════

/** True when the real-Postgres integration suites should run. */
export const REAL_PG_ENABLED = process.env.REAL_PG === '1';

/**
 * `describe` that only runs when REAL_PG=1, else skips the whole block.
 * Use for any integration suite whose SQL needs a real Postgres engine.
 */
export const describeRealPg: jest.Describe = REAL_PG_ENABLED
  ? describe
  : describe.skip;

function realPgConnection() {
  return {
    host: process.env.INTEGRATION_DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

/** Per-worker DB name so parallel Jest workers don't collide. */
function realPgDbName(): string {
  const base = process.env.INTEGRATION_DB_NAME || 'agrinews_inttest';
  const worker = process.env.JEST_WORKER_ID || '1';
  return `${base}_${worker}`;
}

// Module-scope = per Jest worker process. Guarantees migrations run at most
// once per DB per worker, even when the worker handles multiple spec files.
const provisionedDbs = new Set<string>();

/** Create the per-worker DB if missing and run every migration once. */
async function ensureRealPgSchema(dbName: string): Promise<void> {
  if (provisionedDbs.has(dbName)) return;
  const conn = realPgConnection();

  // 1. CREATE DATABASE (cannot run inside a tx) via the default `postgres` db.
  const admin = new DataSource({
    type: 'postgres',
    ...conn,
    database: 'postgres',
  });
  await admin.initialize();
  try {
    const exists = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (exists.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.destroy();
  }

  // 2. Run migrations against the (now existing) per-worker DB.
  const migrationDs = new DataSource({
    type: 'postgres',
    ...conn,
    database: dbName,
    entities: ALL_ENTITIES,
    migrations: [join(__dirname, '..', '..', 'src', 'database', 'migrations', '*.{ts,js}')],
    synchronize: false,
    extra: { options: '-c timezone=Asia/Tokyo' },
  });
  await migrationDs.initialize();
  try {
    await migrationDs.runMigrations();
  } finally {
    await migrationDs.destroy();
  }

  provisionedDbs.add(dbName);
}

function buildRealPgDataSource(dbName: string): DataSource {
  // Match runtime: DATE columns come back as 'YYYY-MM-DD' strings, JST tz.
  configurePgTypeParsers();
  return new DataSource({
    type: 'postgres',
    ...realPgConnection(),
    database: dbName,
    entities: ALL_ENTITIES,
    synchronize: false,
    extra: { options: '-c timezone=Asia/Tokyo' },
  });
}

/** TRUNCATE every public table except the migrations ledger. */
async function truncateAllTables(ds: DataSource): Promise<void> {
  const rows: Array<{ tablename: string }> = await ds.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Real-Postgres variant of `createIntegrationTestApp`. Same Nest wiring +
 * Redis/Mail/Storage stubs, but backed by an actual Postgres DB so
 * pg-mem-incompatible SQL runs. Call ONLY inside a `describeRealPg(...)`
 * block (otherwise it tries to connect when REAL_PG is unset).
 */
export async function createRealPgIntegrationApp(
  options: CreateIntegrationOptions = {},
): Promise<IntegrationTestContext> {
  const dbName = realPgDbName();
  await ensureRealPgSchema(dbName);
  const ds = buildRealPgDataSource(dbName);
  return bootApp(ds, options, { kind: 'truncate' });
}

/**
 * Default seed SQL — runs in EVERY integration test app boot. Covers the
 * bare-minimum reference data every module touches:
 *   - m_todofuken (~JA.todofuken_code FK)
 *   - m_code categories used widely (ZEI_KUBUN, GENDER, TANKA_TYPE, …)
 */
const DEFAULT_SEED_SQL = [
  `INSERT INTO m_todofuken (todofuken_code, todofuken_name, todofuken_name_kana)
   VALUES ('13', '東京都', 'トウキョウト'), ('27', '大阪府', 'オオサカフ')
   ON CONFLICT DO NOTHING`,
  `INSERT INTO m_code (code_id, code_category, code_value, code_name, code_name_short, sort_order, biko, created_by, updated_by)
   VALUES
     (1, 'ZEI_KUBUN', '1', '内税', '内税', 1, '', 'SYSTEM', 'SYSTEM'),
     (2, 'ZEI_KUBUN', '2', '外税', '外税', 2, '', 'SYSTEM', 'SYSTEM'),
     (3, 'TANKA_TYPE', '1', '新聞購読料', '購読料', 1, '', 'SYSTEM', 'SYSTEM'),
     (4, 'TANKA_TYPE', '2', '配達手数料', '配達手数料', 2, '', 'SYSTEM', 'SYSTEM')
   ON CONFLICT DO NOTHING`,
];

export async function createIntegrationTestApp(
  options: CreateIntegrationOptions = {},
): Promise<IntegrationTestContext> {
  // 1. pg-mem datasource — built ONCE, passed to Nest via dataSourceFactory
  const ds = buildPgMemDataSource();
  return bootApp(ds, options, { kind: 'synchronize' });
}

/**
 * Internal — assemble the Nest test app around a pre-built DataSource.
 * Shared by the pg-mem path (`createIntegrationTestApp`) and the real
 * Postgres path (`createRealPgIntegrationApp`). The only variation is
 * `provision`: pg-mem builds its schema via TypeORM `synchronize()`,
 * real PG already has the migration-built schema and just needs every
 * data table TRUNCATEd so each test starts from a clean slate.
 */
type ProvisionMode = { kind: 'synchronize' } | { kind: 'truncate' };

async function bootApp(
  ds: DataSource,
  options: CreateIntegrationOptions,
  provision: ProvisionMode,
): Promise<IntegrationTestContext> {
  // 2. ioredis-mock — single instance shared across SessionService methods
  const redis = new IORedis();
  const redisServiceMock = {
    get: (k: string) => redis.get(k),
    setEx: (k: string, ttl: number, v: string) => redis.setex(k, ttl, v),
    expire: (k: string, ttl: number) => redis.expire(k, ttl),
    del: (...keys: string[]) => (keys.length ? redis.del(...keys) : Promise.resolve(0)),
    sadd: (k: string, ...members: string[]) => redis.sadd(k, ...members),
    srem: (k: string, ...members: string[]) => redis.srem(k, ...members),
    smembers: (k: string) => redis.smembers(k),
    ping: () => redis.ping().then((r: string) => r === 'PONG'),
  };

  let builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          // Options on `ds` describe pg-mem driver — Nest still calls
          // dataSourceFactory below, but TypeOrmModule needs SOMETHING here
          // to satisfy its config validation.
          ...(ds.options as DataSourceOptions),
          autoLoadEntities: true,
          synchronize: provision.kind === 'synchronize',
        }),
        // Critical: tells Nest to USE our pre-built pg-mem DataSource
        // instead of spinning up a real Postgres connection.
        dataSourceFactory: async () => {
          if (!ds.isInitialized) await ds.initialize();
          return ds;
        },
      }),
      AuditLogModule,
      RedisModule,
      CodeModule,
      MailModule,
      AuthModule,
      // 本番の DenshibanDbModule 相当（@Global）。実体だと顧客システムへ本当に
      // POST してしまうのでスタブを配る — 宣言は上の DenshibanSyncStubModule。
      DenshibanSyncStubModule,
      ...(options.modules ?? []),
      // Opt-in throttler — see `enableThrottler` doc on CreateIntegrationOptions.
      ...(options.enableThrottler
        ? [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])]
        : []),
    ],
    providers: options.enableThrottler
      ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
      : [],
  });

  // Replace RedisService with ioredis-mock-backed shim
  builder = builder.overrideProvider(RedisService).useValue(redisServiceMock);

  // Stub MailService — AuthService.login/forgot-password call sendOtp/
  // sendPasswordReset; we don't want a real SMTP/SES connection in tests.
  builder = builder.overrideProvider(MailService).useValue({
    sendOtp: () => Promise.resolve(),
    sendPasswordReset: () => Promise.resolve(),
    sendNotification: () => Promise.resolve(),
  });

  // Stub StorageService — FileUploadService.upload/download/delete +
  // signed-URL generation otherwise reach for the configured MinIO /
  // S3 endpoint. Integration tests don't run a real object store, so
  // a no-op shim that records the file path is enough for the
  // controllers' happy paths to complete.
  const storageMock: { uploaded: Array<{ path: string; size: number }> } & {
    upload: (path: string, body: Buffer | Uint8Array | string, mimeType?: string) => Promise<void>;
    download: (path: string) => Promise<Buffer>;
    delete: (path: string) => Promise<void>;
    getSignedUrl: (path: string) => Promise<string>;
  } = {
    uploaded: [],
    upload: async (path, body) => {
      const size =
        body instanceof Buffer || body instanceof Uint8Array
          ? body.byteLength
          : Buffer.byteLength(String(body));
      storageMock.uploaded.push({ path, size });
    },
    // Return an empty buffer — controllers stream this back to the
    // client; specs only assert the response status + headers.
    download: async () => Buffer.from(''),
    delete: async () => undefined,
    getSignedUrl: async (path: string) =>
      `https://test-storage.local/${path}?signed=1`,
  };
  // The class is resolved lazily here so this util file doesn't need a
  // direct import (keeps it usable in module trees that don't include
  // StorageModule). `as any` because the shim is a structural subset.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StorageService } = require('@/modules/storage/storage.service');
  builder = builder.overrideProvider(StorageService).useValue(storageMock);

  if (options.customize) builder = options.customize(builder);

  const moduleRef: TestingModule = await builder.compile();

  // 3. Build app instance (does NOT init yet — m_code seed must run first
  //    so CodeService.onModuleInit() sees the rows).
  const app = moduleRef.createNestApplication();

  // [json-body-limit] Mirror main.ts — default 100KB cap rejects the
  // 500-row import payload (SCR-019) BEFORE the DTO / service-level
  // `ROW_LIMIT_EXCEEDED` check fires. Bump to 5MB so integration tests
  // exercise the canonical error path.
  const expressLib = require('express');
  app.use(expressLib.json({ limit: '5mb' }));
  app.use(expressLib.urlencoded({ limit: '5mb', extended: true }));

  // SessionAuthGuard reads `req.signedCookies[cookieName]`; that map only
  // gets populated when cookieParser(secret) middleware runs first.
  const sessionSecret =
    moduleRef.get<ConfigService>(ConfigService).get<string>('session.secret') ??
    'test-secret-32-bytes-xxxxxxxxxxxx';
  app.use(cookieParser(sessionSecret));

  // Mirror the production ValidationPipe wiring (`src/main.ts`) — without
  // the same `exceptionFactory`, validation failures surface as plain
  // BadRequestException (`error_code: 'BAD_REQUEST'`), but every spec +
  // every front-end caller expects `error_code: 'VALIDATION_ERROR'` with
  // a populated `errors[]` array.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        // Mirror src/main.ts: recurse nested @ValidateNested({ each: true })
        // arrays (import `rows`) so each failure carries its Excel row
        // (array index + 2, header = row 1) and leaf field name instead of
        // collapsing to a single generic `rows` entry.
        type ErrLike = {
          property: string;
          constraints?: Record<string, string>;
          children?: ErrLike[];
        };
        type Detail = { row?: number; field: string; message: string };
        const flatten = (errs: ErrLike[], row?: number): Detail[] => {
          const out: Detail[] = [];
          for (const e of errs) {
            const isArrayIndex = /^\d+$/.test(e.property);
            const childRow = isArrayIndex ? Number(e.property) + 2 : row;
            if (e.constraints && Object.keys(e.constraints).length > 0) {
              out.push({
                ...(row === undefined ? {} : { row }),
                field: e.property,
                message: Object.values(e.constraints)[0] ?? '入力値が不正です',
              });
            }
            if (e.children && e.children.length > 0) {
              out.push(...flatten(e.children, childRow));
            }
          }
          return out;
        };
        const details = flatten(errors);
        return new HttpException(
          {
            code: 'VALIDATION_ERROR',
            error_code: 'VALIDATION_ERROR',
            message:
              '入力値が不正です。詳細はerrorsフィールドを確認してください。',
            errors: details,
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Mirror production prefix so test URLs (`/api/v1/...`) match the live
  // routing — controllers declare unprefixed paths now (see main.ts).
  // Health probe is served under the prefix at `/api/v1/health`.
  app.setGlobalPrefix(API_PREFIX);

  // 4. Provision schema/state before seed SQL runs.
  //    - pg-mem: Nest does NOT auto-run `synchronize` when a pre-built
  //      DataSource is supplied via `dataSourceFactory`, so trigger it
  //      manually to create all entity tables.
  //    - real PG: schema already exists (migrations ran once per worker
  //      in `ensureRealPgSchema`); TRUNCATE every data table so each test
  //      starts clean (RESTART IDENTITY resets serial PKs; CASCADE handles
  //      FK order).
  const dataSource = moduleRef.get<DataSource>(getDataSourceToken());
  if (provision.kind === 'synchronize') {
    await dataSource.synchronize();
  } else {
    await truncateAllTables(dataSource);
  }

  //    Seed reference rows BEFORE app.init() so CodeService.onModuleInit()
  //    (which runs during init) sees the m_code rows.
  for (const sql of [...DEFAULT_SEED_SQL, ...(options.seedSql ?? [])]) {
    await dataSource.query(sql);
  }

  await app.init();

  // CodeService cached during init — but if extra seeds came in via
  // options.seedSql they may have added new categories. Reload to be safe.
  const codeService = app.get(CodeService);
  await codeService.reload();

  const sessionService = app.get(SessionService);

  async function seedSession(
    overrides: Partial<SessionPayload> = {},
  ): Promise<string> {
    const now = new Date().toISOString();
    return sessionService.create({
      account_id: 1,
      login_id: 'admin01',
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      kanri_shiten_id: null,
      shiten_id: null,
      permissions: [],
      created_at: now,
      last_activity_at: now,
      ...overrides,
    });
  }

  return {
    app,
    dataSource,
    redis,
    sessionService,
    seedSession,
    async close() {
      await app.close();
      if (ds.isInitialized) await ds.destroy();
      await redis.quit?.();
    },
  };
}

/**
 * Resolve the cookie-parser-signed-cookie format for `session_id`. Express
 * stores signed cookies as `s:<value>.<hmac>` after passing through
 * cookieParser(secret). For test purposes we sign with the same secret
 * the app's session.secret config uses.
 */
export function buildSessionCookie(
  app: INestApplication,
  sessionId: string,
): string {
  const config = app.get(ConfigService);
  const secret = config.get<string>('session.secret') ?? 'test-secret-32-bytes-xxxxxxxxxxxx';
  // Lazy require to avoid binding 'cookie-signature' types in non-test code
  const sign = require('cookie-signature').sign as (
    val: string,
    secret: string,
  ) => string;
  return `session_id=s:${sign(sessionId, secret)}`;
}
