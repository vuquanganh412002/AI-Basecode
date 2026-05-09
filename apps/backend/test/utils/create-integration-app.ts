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
  HttpException,
  HttpStatus,
  INestApplication,
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
import cookieParser from 'cookie-parser';
import IORedis from 'ioredis-mock';
import { DataSource, DataSourceOptions } from 'typeorm';
import { newDb } from 'pg-mem';

import configuration from '@/config/configuration';
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
import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { Oshirase } from '@/database/entities/oshirase.entity';

import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { CodeModule } from '@/modules/code/code.module';
import { CodeService } from '@/modules/code/code.service';
import { MailModule } from '@/modules/mail/mail.module';
import { MailService } from '@/modules/mail/mail.service';
import { RedisModule } from '@/modules/redis/redis.module';
import { RedisService } from '@/modules/redis/redis.service';
import { SessionService, SessionPayload } from '@/modules/auth/session.service';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';

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
  Ja,
  Todofuken,
  Oshirase,
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
     (2, 'ZEI_KUBUN', '2', '外税', '外税', 2, '', 'SYSTEM', 'SYSTEM')
   ON CONFLICT DO NOTHING`,
];

export async function createIntegrationTestApp(
  options: CreateIntegrationOptions = {},
): Promise<IntegrationTestContext> {
  // 1. pg-mem datasource — built ONCE, passed to Nest via dataSourceFactory
  const ds = buildPgMemDataSource();

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
          synchronize: true,
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
      ...(options.modules ?? []),
    ],
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

  if (options.customize) builder = options.customize(builder);

  const moduleRef: TestingModule = await builder.compile();

  // 3. Build app instance (does NOT init yet — m_code seed must run first
  //    so CodeService.onModuleInit() sees the rows).
  const app = moduleRef.createNestApplication();

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
        const details = errors.map((e) => ({
          field: e.property,
          message: Object.values(e.constraints || {})[0] ?? '入力値が不正です',
        }));
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

  // 4. Schema sync — when we provide a pre-built DataSource via
  //    `dataSourceFactory`, Nest does NOT auto-run `synchronize`. Trigger
  //    it manually so all entity tables (m_ja, m_code, m_todofuken, t_log,
  //    …) exist before seed SQL runs.
  const dataSource = moduleRef.get<DataSource>(getDataSourceToken());
  await dataSource.synchronize();

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
