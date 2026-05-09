/**
 * Shared helper for backend integration specs.
 *
 * Solves five obstacles that make pg-mem + ioredis-mock + Nest hard to
 * assemble correctly:
 *
 *   1. pg-mem ↔ TypeOrmModule — uses `dataSourceFactory` so Nest reuses
 *      the in-memory DataSource instead of spawning a new connection
 *      that dials localhost:5432.
 *   2. ConfigService — loads the same `configuration` factory production
 *      uses, so SessionService etc. find `session.ttlSeconds` etc.
 *   3. ioredis-mock — wraps an in-memory Redis instance behind a fake
 *      RedisService so SessionService.create/get/touch work.
 *   4. cookie-parser — SessionAuthGuard reads `req.signedCookies`; that
 *      map only populates when cookieParser(secret) middleware runs.
 *   5. m_code timing — seeds m_code BEFORE `app.init()` fires
 *      CodeService.onModuleInit() so its in-memory cache is populated.
 *
 * Usage from a spec:
 *
 *   const ctx = await createIntegrationTestApp({ modules: [MyModule] });
 *   const sid = await ctx.seedSession({ permissions: ['x.view'] });
 *   await request(ctx.app.getHttpServer()).get('/api/v1/x/1')
 *     .set('Cookie', [buildSessionCookie(ctx.app, sid)])
 *     .expect(200);
 *   await ctx.close();
 *
 * IMPORTANT — when you add a new feature module with new entities, append
 * the entity classes to `ALL_ENTITIES` below. The pg-mem DataSource needs
 * an explicit entity list (autoLoadEntities is bypassed by dataSourceFactory).
 */

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
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
// Common entity classes shipped by the scaffold. Append per-project
// entities below as they're added (pg-mem dataSourceFactory bypass
// requires an explicit list — TypeOrmModule.forFeature autoload is
// not consulted for the DataSource's entityMetadatas).
import { Account } from '@/database/entities/account.entity';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { Permission } from '@/database/entities/permission.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { MCode } from '@/database/entities/m-code.entity';
import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';

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

const ALL_ENTITIES = [
  // Common (scaffold-shipped) — DO NOT remove
  Account,
  MfaOtp,
  Permission,
  Role,
  RolePermission,
  MCode,
  Log,
  LoginLog,
  // Per-project — append entity classes as feature modules are added:
  // Ja, Todofuken, Tanka, Hanbaiten, Dokusya, ...
];

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
  /** Feature modules under test (e.g. [MyFeatureModule]). AuthModule +
   *  CodeModule + AuditLogModule + RedisModule + MailModule are always added. */
  modules?: Type<unknown>[];
  /**
   * Optional callback to override providers on the testing module before it
   * compiles. ioredis-mock + ConfigService + MailService stub are wired here.
   */
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  /** Extra SQL to run after schema sync but before app.init() — ideal for
   *  seeding m_code rows so CodeService.onModuleInit picks them up, or
   *  for seeding feature data the spec needs. */
  seedSql?: string[];
}

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
 * bare-minimum reference data every module touches: m_code categories the
 * scaffold seeds in production, and any other reference tables.
 *
 * Per-project: if you have screens that depend on m_todofuken / m_kanri_shiten
 * etc., add INSERT statements for those tables here too.
 */
const DEFAULT_SEED_SQL = [
  // Sample: ZEI_KUBUN code category. Add the rest of m_code categories
  // your modules depend on (GENDER, TANKA_TYPE, OSHIRASE_TYPE, ...).
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
    del: (...keys: string[]) =>
      keys.length ? redis.del(...keys) : Promise.resolve(0),
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

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 4. Schema sync — when we provide a pre-built DataSource via
  //    `dataSourceFactory`, Nest does NOT auto-run `synchronize`. Trigger
  //    it manually so all entity tables (m_code, t_log, …) exist before
  //    seed SQL runs.
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
  const secret =
    config.get<string>('session.secret') ?? 'test-secret-32-bytes-xxxxxxxxxxxx';
  // Lazy require to avoid binding 'cookie-signature' types in non-test code
  const sign = require('cookie-signature').sign as (
    val: string,
    secret: string,
  ) => string;
  return `session_id=s:${sign(sessionId, secret)}`;
}
