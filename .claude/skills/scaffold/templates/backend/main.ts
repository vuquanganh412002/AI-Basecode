import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
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
        const details = errors.map((e) => ({
          field: e.property,
          message: Object.values(e.constraints || {}).join(', '),
        }));
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: details,
        };
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(helmet());

  // cookie-parser MUST receive SESSION_SECRET so `res.cookie(..., { signed: true })`
  // works and `req.signedCookies` populates — required by SessionAuthGuard.
  app.use(cookieParser(configService.get<string>('session.secret')));

  const allowedOrigins = configService.get<string[]>('allowedOrigins');
  app.enableCors({
    origin: allowedOrigins || [],
    credentials: true,
  });

  const sessionCookieName =
    configService.get<string>('session.cookieName') ?? 'session_id';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('__PROJECT__ API')
    .setDescription('__PROJECT__ API Documentation')
    .setVersion('1.0')
    .addCookieAuth(sessionCookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  try {
    writeFileSync('../frontend/swagger.json', JSON.stringify(document, null, 2));
  } catch {
    // Swagger export is optional in Docker
  }

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
bootstrap();
