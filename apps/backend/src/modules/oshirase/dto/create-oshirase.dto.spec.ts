// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Drives src/modules/oshirase/dto/create-oshirase.dto.ts.
// Validation rules sourced from api.md §4.1 of API-031-003.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateOshiraseDto } from '@/modules/oshirase/dto/create-oshirase.dto';
import { buildCreateOshiraseBody, futureDateString } from '@test/fixtures/oshirase.factory';

async function check(input: unknown) {
  return validate(plainToInstance(CreateOshiraseDto, input));
}

describe('CreateOshiraseDto', () => {
  it('should accept the canonical valid body when all required fields are present', async () => {
    expect(await check(buildCreateOshiraseBody())).toHaveLength(0);
  });

  describe('title (required, 1..200)', () => {
    it('should reject title when missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).title;
      expect((await check(body)).some((e) => e.property === 'title')).toBe(true);
    });

    it('should reject title when empty string', async () => {
      expect((await check(buildCreateOshiraseBody({ title: '' }))).some((e) => e.property === 'title')).toBe(true);
    });

    it('should accept title when length is exactly 200 chars', async () => {
      expect((await check(buildCreateOshiraseBody({ title: 'a'.repeat(200) }))).some((e) => e.property === 'title')).toBe(false);
    });

    it('should reject title when length exceeds 200 chars', async () => {
      expect((await check(buildCreateOshiraseBody({ title: 'a'.repeat(201) }))).some((e) => e.property === 'title')).toBe(true);
    });
  });

  describe('publish_location (required, 1 / 2 / 3)', () => {
    it('should accept publish_location when value is 1 (ログイン画面)', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_location: 1 }))).some((e) => e.property === 'publish_location')).toBe(false);
    });

    it('should accept publish_location when value is 2 (メニュー画面)', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_location: 2 }))).some((e) => e.property === 'publish_location')).toBe(false);
    });

    it('should accept publish_location when value is 3 (メニュー画面（締め切り時間）)', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_location: 3 }))).some((e) => e.property === 'publish_location')).toBe(false);
    });

    it('should reject publish_location when value is 4 (out of range)', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_location: 4 }))).some((e) => e.property === 'publish_location')).toBe(true);
    });

    it('should reject publish_location when missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).publish_location;
      expect((await check(body)).some((e) => e.property === 'publish_location')).toBe(true);
    });
  });

  describe('status (required, 1..3)', () => {
    it('should accept status when value is 1 (下書き)', async () => {
      expect((await check(buildCreateOshiraseBody({ status: 1 }))).some((e) => e.property === 'status')).toBe(false);
    });

    it('should accept status when value is 2 (公開)', async () => {
      expect((await check(buildCreateOshiraseBody({ status: 2 }))).some((e) => e.property === 'status')).toBe(false);
    });

    it('should accept status when value is 3 (非公開)', async () => {
      expect((await check(buildCreateOshiraseBody({ status: 3 }))).some((e) => e.property === 'status')).toBe(false);
    });

    it('should reject status when value is 4', async () => {
      expect((await check(buildCreateOshiraseBody({ status: 4 }))).some((e) => e.property === 'status')).toBe(true);
    });
  });

  describe('publish_start_date (required, YYYY/MM/DD HH:mm)', () => {
    it('should accept publish_start_date when value matches YYYY/MM/DD HH:mm', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_start_date: futureDateString(7) }))).some((e) => e.property === 'publish_start_date')).toBe(false);
    });

    it('should reject publish_start_date when value is not in YYYY/MM/DD HH:mm format', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_start_date: '2026-04-01' }))).some((e) => e.property === 'publish_start_date')).toBe(true);
    });

    it('should reject publish_start_date when missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).publish_start_date;
      expect((await check(body)).some((e) => e.property === 'publish_start_date')).toBe(true);
    });
  });

  describe('publish_end_date (optional, YYYY/MM/DD HH:mm)', () => {
    it('should accept publish_end_date when value is null (= 無期限)', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_end_date: null }))).some((e) => e.property === 'publish_end_date')).toBe(false);
    });

    it('should accept publish_end_date when value matches YYYY/MM/DD HH:mm', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_end_date: futureDateString(30) }))).some((e) => e.property === 'publish_end_date')).toBe(false);
    });

    it('should reject publish_end_date when value is malformed', async () => {
      expect((await check(buildCreateOshiraseBody({ publish_end_date: 'not-a-date' }))).some((e) => e.property === 'publish_end_date')).toBe(true);
    });
  });

  describe('ja_id (optional, integer)', () => {
    it('should accept ja_id when value is null (= 全JA向け)', async () => {
      expect((await check(buildCreateOshiraseBody({ ja_id: null }))).some((e) => e.property === 'ja_id')).toBe(false);
    });

    it('should accept ja_id when value is a positive integer', async () => {
      expect((await check(buildCreateOshiraseBody({ ja_id: 42 }))).some((e) => e.property === 'ja_id')).toBe(false);
    });
  });

  describe('oshirase_type (required, 1..4)', () => {
    it('should accept oshirase_type when value is 1', async () => {
      expect((await check(buildCreateOshiraseBody({ oshirase_type: 1 }))).some((e) => e.property === 'oshirase_type')).toBe(false);
    });

    it('should accept oshirase_type when value is 4 (締め切り時間)', async () => {
      expect((await check(buildCreateOshiraseBody({ oshirase_type: 4 }))).some((e) => e.property === 'oshirase_type')).toBe(false);
    });

    it('should reject oshirase_type when value is 5', async () => {
      expect((await check(buildCreateOshiraseBody({ oshirase_type: 5 }))).some((e) => e.property === 'oshirase_type')).toBe(true);
    });

    it('should reject oshirase_type when missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).oshirase_type;
      expect((await check(body)).some((e) => e.property === 'oshirase_type')).toBe(true);
    });
  });

  describe('target_kanri_kubun (optional, max 20)', () => {
    it('should accept target_kanri_kubun when value is empty string (= 全選択)', async () => {
      expect((await check(buildCreateOshiraseBody({ target_kanri_kubun: '' }))).some((e) => e.property === 'target_kanri_kubun')).toBe(false);
    });

    it('should accept target_kanri_kubun when value has comma-separated values', async () => {
      expect((await check(buildCreateOshiraseBody({ target_kanri_kubun: '1,2,3' }))).some((e) => e.property === 'target_kanri_kubun')).toBe(false);
    });

    it('should reject target_kanri_kubun when length exceeds 20', async () => {
      expect((await check(buildCreateOshiraseBody({ target_kanri_kubun: 'a'.repeat(21) }))).some((e) => e.property === 'target_kanri_kubun')).toBe(true);
    });
  });

  describe('content (required, 1..2000)', () => {
    it('should reject content when missing', async () => {
      const body = buildCreateOshiraseBody();
      delete (body as Record<string, unknown>).content;
      expect((await check(body)).some((e) => e.property === 'content')).toBe(true);
    });

    it('should reject content when empty string', async () => {
      expect((await check(buildCreateOshiraseBody({ content: '' }))).some((e) => e.property === 'content')).toBe(true);
    });

    it('should accept content when length is exactly 2000 chars', async () => {
      expect((await check(buildCreateOshiraseBody({ content: 'a'.repeat(2000) }))).some((e) => e.property === 'content')).toBe(false);
    });

    it('should reject content when length exceeds 2000 chars', async () => {
      expect((await check(buildCreateOshiraseBody({ content: 'a'.repeat(2001) }))).some((e) => e.property === 'content')).toBe(true);
    });
  });
});
