// Screen: ACSMS-SCR-030 — ログ参照画面
//
// Drives src/modules/log/dto/export-log.dto.ts.
// Same filter fields as SearchLogDto minus pagination/sort.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExportLogDto } from '@/modules/log/dto/export-log.dto';

const VALID = {
  date_from: '2026/04/01 00:00:00',
  date_to: '2026/04/17 23:59:59',
  log_type: 1,
  account_id: 10,
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(ExportLogDto, input));
}

describe('ExportLogDto', () => {
  it('should accept a fully-populated valid query when all fields meet constraints', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should accept an empty query when all fields are omitted', async () => {
    expect(await check({})).toHaveLength(0);
  });

  describe('date_from (optional, YYYY/MM/DD HH:mm:ss)', () => {
    it('should reject date_from when value is not in YYYY/MM/DD HH:mm:ss format', async () => {
      const errs = await check({ ...VALID, date_from: '2026-04-01T00:00:00' });
      expect(errs.some((e) => e.property === 'date_from')).toBe(true);
    });
  });

  describe('date_to (optional, YYYY/MM/DD HH:mm:ss)', () => {
    it('should reject date_to when value is not in YYYY/MM/DD HH:mm:ss format', async () => {
      const errs = await check({ ...VALID, date_to: 'tomorrow' });
      expect(errs.some((e) => e.property === 'date_to')).toBe(true);
    });
  });

  describe('log_type (optional, integer 1..4)', () => {
    it('should accept log_type when value is 1', async () => {
      const errs = await check({ ...VALID, log_type: 1 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(false);
    });

    it('should reject log_type when value is 5', async () => {
      const errs = await check({ ...VALID, log_type: 5 });
      expect(errs.some((e) => e.property === 'log_type')).toBe(true);
    });

    it('should reject log_type when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, log_type: 'foo' });
      expect(errs.some((e) => e.property === 'log_type')).toBe(true);
    });
  });

  describe('account_id (optional, integer)', () => {
    it('should accept account_id when value is a positive integer', async () => {
      const errs = await check({ ...VALID, account_id: 42 });
      expect(errs.some((e) => e.property === 'account_id')).toBe(false);
    });

    it('should reject account_id when value is a string non-numeric', async () => {
      const errs = await check({ ...VALID, account_id: 'abc' });
      expect(errs.some((e) => e.property === 'account_id')).toBe(true);
    });
  });
});
