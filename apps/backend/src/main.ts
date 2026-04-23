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
          message: '入力値が不正です。詳細はerrorsフィールドを確認してください',
          errors: details,
        };
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(helmet());
  app.use(cookieParser());

  const allowedOrigins = configService.get<string>('allowedOrigins');
  app.enableCors({
    origin: Array.isArray(allowedOrigins)
      ? allowedOrigins
      : allowedOrigins?.split(',') || [],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('agrinews API')
    .setDescription('クラウド版購読者管理システム API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
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
