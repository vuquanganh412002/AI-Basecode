import { NestFactory } from '@nestjs/core';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants/api.constants';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // [json-body-limit]
  // Default Express body-parser cap is ~100KB. SCR-019 (Hanbaiten Excel
  // import) accepts up to 500 rows × ~700 bytes per row ≈ 350KB; with
  // header / encoding overhead the body comfortably exceeds the default
  // and Express rejects with `PayloadTooLargeError` BEFORE the DTO
  // `@ArrayMaxSize(500)` or service-level `ROW_LIMIT_EXCEEDED` check
  // gets a chance to fire. Bump to 5MB so the canonical error codes
  // surface and other batch endpoints (oshirase, log export, etc.)
  // also have headroom.
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  const configService = app.get(ConfigService);

  // Apply enlarged JSON / urlencoded limits via the platform-express
  // adapter — the constructor `bodyParser:true` only enables the
  // default-sized parser; we need to re-register with `limit: 5mb`.
  const express = require('express');
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // [trust-proxy] Behind CloudFront → ALB → ECS, the immediate TCP peer is
  // the ALB and the real client IP is carried in X-Forwarded-For. Without
  // this, `req.ip` is the ALB/proxy IP — so ThrottlerGuard buckets every
  // request under one key (rate-limiting collapses) and audit logs (t_log
  // ip_address) record the proxy, not the user. Setting the trusted-hop
  // count makes Express skip exactly the infra hops (CloudFront edge + ALB)
  // and resolve `req.ip` to the CloudFront-appended viewer IP, which a
  // client cannot spoof via a leftmost XFF entry. Local/no-proxy → 0.
  const trustProxyHops = configService.get<number>('app.trustProxyHops') ?? 0;
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        // Surface ONE message per field, with a deterministic priority so
        // the user sees the most relevant error first instead of a
        // comma-joined sentence (e.g. for an empty login_id the FE would
        // otherwise display "...should not be empty, ...must contain only
        // half-width characters"). useApiForm on the FE binds a single
        // string to <a-form-item :help>, so multiple-message-per-field is
        // wasted anyway — Object.fromEntries collapses to the last entry.
        const PRIORITY = [
          'isDefined',
          'isNotEmpty',
          'isNotEmptyObject',
          'isString',
          'isNumber',
          'isInt',
          'isBoolean',
          'isArray',
          'isEnum',
          'isEmail',
          'isUuid',
        ];
        const pickMessage = (constraints: Record<string, string>): string => {
          for (const key of PRIORITY) {
            if (constraints[key]) return constraints[key];
          }
          return Object.values(constraints)[0] ?? '入力値が不正です';
        };
        const details = errors.map((e) => ({
          field: e.property,
          message: pickMessage(e.constraints || {}),
        }));
        // MUST throw a real HttpException — returning a plain object
        // makes NestJS throw a non-Error, which the GlobalExceptionFilter
        // can't decode and falls through as 500. Wrap the body in
        // HttpException so it's classified as a 400 with our standard
        // `{ error_code, message, errors }` body shape.
        return new HttpException(
          {
            code: 'VALIDATION_ERROR',
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
  // Version prefix applied centrally — controllers declare unprefixed paths
  // (`@Controller('auth')`, `@Controller('codes')`, …). Health probe is
  // served under the prefix at `GET /api/v1/health` so the ALB / ECS target
  // group health check (path `/api/v1/health`) resolves.
  app.setGlobalPrefix(API_PREFIX);

  // Helmet hardens response headers, but several of its defaults assume the
  // app is reached over HTTPS:
  //   - `contentSecurityPolicy` ships `upgrade-insecure-requests`, which
  //     makes browsers upgrade subresource requests to HTTPS. Hitting a
  //     plain-HTTP staging deploy (Ubuntu without TLS terminator) then
  //     yields ERR_SSL_PROTOCOL_ERROR on Swagger UI assets. Production
  //     terminates TLS at ALB so the upgrade is a no-op there.
  //   - `Strict-Transport-Security` (HSTS) tells browsers to pin the host
  //     to HTTPS for ~6 months. Sending it over plain HTTP teaches the
  //     browser to refuse future HTTP requests until the cache expires.
  //   - `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
  //     only take effect over HTTPS — log noise otherwise.
  // → disable all four outside production. Behind the AWS ALB (which
  //   terminates TLS), `nodeEnv=production` re-enables them.
  const isProd = configService.get<string>('nodeEnv') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      hsts: isProd,
      crossOriginOpenerPolicy: isProd,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Pass SESSION_SECRET so `res.cookie(..., { signed: true })` works and
  // `req.signedCookies` is populated. The secret is required for Auth's
  // session cookie tamper-detection.
  const sessionSecret = configService.get<string>('session.secret');
  app.use(cookieParser(sessionSecret));

  const allowedOrigins = configService.get<string>('allowedOrigins');
  app.enableCors({
    origin: Array.isArray(allowedOrigins)
      ? allowedOrigins
      : allowedOrigins?.split(',') || [],
    credentials: true,
  });

  const sessionCookieName =
    configService.get<string>('session.cookieName') ?? 'session_id';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('agrinews API')
    .setDescription('クラウド版購読者管理システム API')
    .setVersion('1.0')
    .addCookieAuth(sessionCookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      // Ensure Swagger UI's "Try it out" sends the session cookie.
      // Without this, requests omit the HttpOnly session_id cookie and
      // every protected endpoint returns 401 even after a successful
      // login via the same UI.
      withCredentials: true,
      // Keep the "Authorize" state across page reloads so testers don't
      // re-login every time they refresh.
      persistAuthorization: true,
    },
  });

  // Swagger UI at /api/docs is served from the in-memory `document` —
  // no file write needed. Use the standalone `npm run swagger:export`
  // script if you want an on-disk snapshot.

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
bootstrap();
