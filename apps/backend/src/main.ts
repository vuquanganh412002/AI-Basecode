import { NestFactory } from '@nestjs/core';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants/api.constants';
import { ErrorCode } from './common/constants/error-codes.constant';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DEFAULT_SESSION_COOKIE_NAME } from './config/config-defaults.constant';

async function bootstrap() {
  // [json-body-limit] Express 既定の body 上限 ~100KB では ACSMS-SCR-019 の Excel 取込
  // （最大500行×~700byte ≈ 350KB）が DTO `@ArrayMaxSize(500)` / `ROW_LIMIT_EXCEEDED`
  // 到達前に `PayloadTooLargeError` で弾かれる。5MB に引上げ正規エラーコードを出し、
  // 他バッチ（oshirase, log export 等）にも余裕を持たせる。
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  const configService = app.get(ConfigService);

  // constructor の `bodyParser:true` は既定サイズのみ。limit:5mb で再登録する。
  const express = require('express');
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // [trust-proxy] CloudFront→ALB→ECS の背後では TCP peer が ALB で実クライアント IP は
  // X-Forwarded-For に載る。未設定だと `req.ip` が ALB IP になり ThrottlerGuard が全
  // リクエストを1キーに集約（レート制限崩壊）＋監査ログ(t_log.ip_address)が proxy を記録。
  // 信頼ホップ数を設定するとインフラ hop（CloudFront+ALB）だけスキップし、CloudFront が
  // 付与した viewer IP に解決（左端 XFF 偽装は不可）。ローカル/proxy無し → 0。
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
        // フィールド毎に1メッセージを決定順で返す（カンマ連結でなく最重要エラーを先頭に。
        // 空 login_id で「should not be empty, must contain only half-width...」の様な
        // 二重表示を防ぐ）。FE useApiForm は1文字列を `<a-form-item :help>` に bind し
        // Object.fromEntries が最後の1件に潰すため複数メッセージは無駄。
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
        // class-validator のネストしたエラー木を平坦化。配列に @ValidateNested({each})
        // を掛ける DTO（現状は一括取込の `rows` のみ）では要素 index を Excel 行番号に
        // 変換（ヘッダが1行目 → index N は Excel 行 N+2、取込の IMPORT_VALIDATION_ERROR
        // 慣習と一致）。FE 取込パネルは { row, field, message } を行毎に表示できる。
        // 非ネスト DTO（各フォーム）は最上位のみ → 従来と同じ { field, message }。
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
                message: pickMessage(e.constraints),
              });
            }
            if (e.children && e.children.length > 0) {
              out.push(...flatten(e.children, childRow));
            }
          }
          return out;
        };
        const details = flatten(errors);
        // 必ず HttpException を throw する — plain object を返すと NestJS が非 Error を
        // throw し GlobalExceptionFilter が解釈できず 500 に落ちる。HttpException で
        // 包み標準 `{ error_code, message, errors }` 形状の 400 に分類させる。
        return new HttpException(
          {
            code: ErrorCode.VALIDATION_ERROR,
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
  // バージョンプレフィックスは一括付与 — controller は無プレフィックスパスを宣言
  // (`@Controller('auth')` 等)。health は `GET /api/v1/health` で ALB/ECS の
  // ヘルスチェック（path `/api/v1/health`）が解決する。
  app.setGlobalPrefix(API_PREFIX);

  // Helmet はレスポンスヘッダを堅牢化するが、既定のいくつかは HTTPS 前提:
  //   - contentSecurityPolicy の `upgrade-insecure-requests` はサブリソースを HTTPS
  //     化 → 平文 HTTP のステージング（TLS 終端無し）で Swagger UI が ERR_SSL_PROTOCOL_ERROR。
  //   - HSTS は host を ~6ヶ月 HTTPS 固定 → 平文 HTTP で送るとブラウザが以後 HTTP 拒否。
  //   - COOP / COEP は HTTPS でのみ有効 → それ以外はログノイズ。
  // → 本番以外は4つとも無効。ALB(TLS 終端)背後の nodeEnv=production で再有効化。
  const isProd = configService.get<string>('nodeEnv') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      hsts: isProd,
      crossOriginOpenerPolicy: isProd,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // SESSION_SECRET を渡し `res.cookie(..., { signed: true })` と `req.signedCookies`
  // を有効化。認証のセッション cookie 改竄検知に必須。
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
    configService.get<string>('session.cookieName') ?? DEFAULT_SESSION_COOKIE_NAME;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('agrinews API')
    .setDescription('クラウド版購読者管理システム API')
    .setVersion('1.0')
    .addCookieAuth(sessionCookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      // Swagger UI の「Try it out」がセッション cookie を送るように。無しだと
      // HttpOnly session_id が付かず、同 UI でログイン後も保護 API が 401 になる。
      withCredentials: true,
      // リロードしても「Authorize」状態を保持（テスタが毎回再ログイン不要）。
      persistAuthorization: true,
    },
  });

  // /api/docs の Swagger UI はメモリ上の `document` から配信（ファイル書出し不要）。
  // オンディスクのスナップショットが要る場合は `npm run swagger:export` を使う。

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
bootstrap();
