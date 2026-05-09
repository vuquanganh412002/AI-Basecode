// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (公開お知らせ一覧)
//
// OshiraseController HTTP specs for API ACSMS-API-001-006
// (GET /api/v1/oshirase/public — 認証不要).

import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';

import { OshiraseController } from './oshirase.controller';
import { OshiraseService } from './oshirase.service';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';

describe('OshiraseController (HTTP)', () => {
  let app: INestApplication;
  let service: any;

  beforeEach(async () => {
    service = {
      findPublic: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [OshiraseController],
      providers: [{ provide: OshiraseService, useValue: service }],
    }).compile();

    app = module.createNestApplication();
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
              message: '入力値が不正です',
              errors: details,
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  describe('GET /api/v1/oshirase/public', () => {
    it('should return 200 with data array when service returns notices', async () => {
      service.findPublic.mockResolvedValue([
        {
          oshirase_id: 1,
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          title: 'システムメンテナンスのお知らせ',
          publish_start_date: '2026-04-10',
        },
      ]);

      const res = await http()
        .get('/api/v1/oshirase/public?publish_location=1&limit=10')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        oshirase_id: 1,
        oshirase_type_label: 'システム',
      });
    });

    it('should return 200 with empty array when no notices match', async () => {
      service.findPublic.mockResolvedValue([]);

      const res = await http().get('/api/v1/oshirase/public').expect(200);

      expect(res.body).toEqual({ data: [] });
    });

    it('should accept request without auth (public endpoint)', async () => {
      service.findPublic.mockResolvedValue([]);

      // No Cookie header set — must still succeed.
      await http().get('/api/v1/oshirase/public').expect(200);
    });

    it('should default publish_location and limit when omitted from query', async () => {
      service.findPublic.mockResolvedValue([]);

      await http().get('/api/v1/oshirase/public').expect(200);

      // Service receives a DTO with defaults applied by ValidationPipe transform.
      expect(service.findPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          publish_location: 1,
          limit: 10,
        }),
      );
    });

    it('should return 400 VALIDATION_ERROR when publish_location is non-numeric', async () => {
      await http()
        .get('/api/v1/oshirase/public?publish_location=abc')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when publish_location is out of range (> 2)', async () => {
      await http()
        .get('/api/v1/oshirase/public?publish_location=99')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when limit exceeds 10', async () => {
      await http()
        .get('/api/v1/oshirase/public?limit=11')
        .expect(400)
        .expect((res) => {
          expect(res.body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 400 VALIDATION_ERROR when limit is below 1', async () => {
      await http()
        .get('/api/v1/oshirase/public?limit=0')
        .expect(400);
    });

    it('should return 500 INTERNAL_SERVER_ERROR when service throws unexpected', async () => {
      service.findPublic.mockRejectedValue(new Error('boom'));

      await http()
        .get('/api/v1/oshirase/public')
        .expect(500)
        .expect((res) => {
          expect(res.body.error_code).toBe('INTERNAL_SERVER_ERROR');
        });
    });
  });
});
