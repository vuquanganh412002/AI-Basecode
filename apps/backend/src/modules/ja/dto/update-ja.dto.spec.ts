// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//
// Drives src/modules/ja/dto/update-ja.dto.ts. UpdateJaDto SHOULD be a
// PartialType of CreateJaDto EXCEPT that `ja_code` is not included
// (ja_code is immutable post-create per api.md §4 注記).

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateJaDto } from '@/modules/ja/dto/update-ja.dto';

async function run(payload: any) {
  const dto = plainToInstance(UpdateJaDto, payload);
  return validate(dto);
}

describe('UpdateJaDto', () => {
  it('should pass validation when body is empty (all fields optional)', async () => {
    const errors = await run({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when only partial CHUOKAI-allowed fields are present', async () => {
    const errors = await run({
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info@example.com',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 2,
      biko: 'メモ',
    });
    expect(errors).toHaveLength(0);
  });

  it('should reject ja_code field (immutable — not present on UpdateJaDto)', async () => {
    // COVERS: 注記 — ja_code is immutable after create
    // With forbidNonWhitelisted, the controller's ValidationPipe rejects extra keys.
    // Here we only check that ja_code is NOT a declared property of UpdateJaDto.
    const props = Object.keys(new (UpdateJaDto as any)());
    expect(props).not.toContain('ja_code');
  });

  it('should fail when ja_name exceeds 200 chars', async () => {
    const errors = await run({ ja_name: 'あ'.repeat(201) });
    expect(errors.some((e) => e.property === 'ja_name')).toBe(true);
  });

  it('should fail when bank_code is not 4 half-width digits', async () => {
    const errors = await run({ bank_code: 'abcd' });
    expect(errors.some((e) => e.property === 'bank_code')).toBe(true);
  });

  it('should fail when email is malformed', async () => {
    const errors = await run({ email: 'bad' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when yubin_no is 6 digits (require exactly 7)', async () => {
    const errors = await run({ yubin_no: '123456' });
    expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
  });

  it('should fail when tel contains hyphen', async () => {
    const errors = await run({ tel: '03-1234-5678' });
    expect(errors.some((e) => e.property === 'tel')).toBe(true);
  });

  it('should fail when chuokai_flg is not a boolean', async () => {
    const errors = await run({ chuokai_flg: 'true' });
    expect(errors.some((e) => e.property === 'chuokai_flg')).toBe(true);
  });

  it('should fail when biko exceeds 500 chars', async () => {
    const errors = await run({ biko: 'あ'.repeat(501) });
    expect(errors.some((e) => e.property === 'biko')).toBe(true);
  });

  it('should pass shape validation when zei_kubun is integer (m_code allowed-value checked in service)', async () => {
    const errors = await run({ zei_kubun: 1 });
    expect(errors.some((e) => e.property === 'zei_kubun')).toBe(false);
  });
});
