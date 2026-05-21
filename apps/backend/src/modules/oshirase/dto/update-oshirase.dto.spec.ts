// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Drives src/modules/oshirase/dto/update-oshirase.dto.ts.
// Validation rules sourced from api.md §4.1 of API-031-004.
//
// Same shape as CreateOshiraseDto (all fields required at the wire level —
// FE sends the full record back on PATCH).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateOshiraseDto } from '@/modules/oshirase/dto/update-oshirase.dto';
import { buildUpdateOshiraseBody, futureDateString } from '@test/fixtures/oshirase.factory';

async function check(input: unknown) {
  return validate(plainToInstance(UpdateOshiraseDto, input));
}

describe('UpdateOshiraseDto', () => {
  it('should accept the canonical valid update body when all required fields are present', async () => {
    expect(await check(buildUpdateOshiraseBody())).toHaveLength(0);
  });

  it('should reject when title is missing', async () => {
    const body = buildUpdateOshiraseBody();
    delete (body as Record<string, unknown>).title;
    expect((await check(body)).some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject when title exceeds 200 chars', async () => {
    expect((await check(buildUpdateOshiraseBody({ title: 'a'.repeat(201) }))).some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject when publish_location is not 1 or 2', async () => {
    expect((await check(buildUpdateOshiraseBody({ publish_location: 3 }))).some((e) => e.property === 'publish_location')).toBe(true);
  });

  it('should reject when status is outside 1..3', async () => {
    expect((await check(buildUpdateOshiraseBody({ status: 4 }))).some((e) => e.property === 'status')).toBe(true);
  });

  it('should reject when publish_start_date is malformed', async () => {
    expect((await check(buildUpdateOshiraseBody({ publish_start_date: '2026-04-01' }))).some((e) => e.property === 'publish_start_date')).toBe(true);
  });

  it('should accept when publish_end_date is null (= 無期限)', async () => {
    expect((await check(buildUpdateOshiraseBody({ publish_end_date: null }))).some((e) => e.property === 'publish_end_date')).toBe(false);
  });

  it('should reject when publish_end_date is malformed', async () => {
    expect((await check(buildUpdateOshiraseBody({ publish_end_date: 'tomorrow' }))).some((e) => e.property === 'publish_end_date')).toBe(true);
  });

  it('should accept when ja_id is null (= 全JA向け)', async () => {
    expect((await check(buildUpdateOshiraseBody({ ja_id: null }))).some((e) => e.property === 'ja_id')).toBe(false);
  });

  it('should reject when oshirase_type is outside 1..4', async () => {
    expect((await check(buildUpdateOshiraseBody({ oshirase_type: 5 }))).some((e) => e.property === 'oshirase_type')).toBe(true);
  });

  it('should accept when target_kanri_kubun is empty string', async () => {
    expect((await check(buildUpdateOshiraseBody({ target_kanri_kubun: '' }))).some((e) => e.property === 'target_kanri_kubun')).toBe(false);
  });

  it('should reject when target_kanri_kubun exceeds 20 chars', async () => {
    expect((await check(buildUpdateOshiraseBody({ target_kanri_kubun: 'a'.repeat(21) }))).some((e) => e.property === 'target_kanri_kubun')).toBe(true);
  });

  it('should reject when content is empty string', async () => {
    expect((await check(buildUpdateOshiraseBody({ content: '' }))).some((e) => e.property === 'content')).toBe(true);
  });

  it('should reject when content exceeds 2000 chars', async () => {
    expect((await check(buildUpdateOshiraseBody({ content: 'a'.repeat(2001) }))).some((e) => e.property === 'content')).toBe(true);
  });

  it('should accept when publish_start_date is a future YYYY/MM/DD HH:mm string', async () => {
    expect((await check(buildUpdateOshiraseBody({ publish_start_date: futureDateString(14) }))).some((e) => e.property === 'publish_start_date')).toBe(false);
  });
});
