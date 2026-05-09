import { NestFactory } from '@nestjs/core';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
  app.use(helmet());

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

  try {
    writeFileSync('../frontend/swagger.json', JSON.stringify(document, null, 2));
  } catch {
    // Swagger export is optional in Docker
  }

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
bootstrap();
