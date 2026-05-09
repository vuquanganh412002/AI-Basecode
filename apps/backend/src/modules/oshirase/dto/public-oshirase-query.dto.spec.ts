// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (公開お知らせ一覧)
//
// PublicOshiraseQueryDto class-validator specs for API-001-006 §4.1.

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublicOshiraseQueryDto } from './public-oshirase-query.dto';

async function fields(payload: unknown): Promise<string[]> {
  const dto = plainToInstance(PublicOshiraseQueryDto, payload, {
    enableImplicitConversion: true,
  });
  const errors = await validate(dto as object);
  return errors.map((e) => e.property);
}

describe('PublicOshiraseQueryDto', () => {
  it('should pass validation when both params are valid', async () => {
    const errors = await fields({ publish_location: 1, limit: 10 });
    expect(errors).toEqual([]);
  });

  it('should pass validation when both params are omitted (defaults apply)', async () => {
    const errors = await fields({});
    expect(errors).toEqual([]);
  });

  it('should reject when publish_location is not 1 or 2', async () => {
    const errors = await fields({ publish_location: 99 });
    expect(errors).toContain('publish_location');
  });

  it('should reject when publish_location is non-numeric string', async () => {
    const errors = await fields({ publish_location: 'abc' });
    expect(errors).toContain('publish_location');
  });

  it('should reject when limit exceeds 10', async () => {
    const errors = await fields({ limit: 11 });
    expect(errors).toContain('limit');
  });

  it('should reject when limit is below 1', async () => {
    const errors = await fields({ limit: 0 });
    expect(errors).toContain('limit');
  });

  it('should accept publish_location=2 when querying menu screen notices', async () => {
    const errors = await fields({ publish_location: 2 });
    expect(errors).not.toContain('publish_location');
  });
});
