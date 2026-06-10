// Screen: ACSMS-SCR-009 — 管理支店マスタ登録画面 (update mode)
//
// UpdateKanriShitenDto inherits from CreateKanriShitenDto but DROPS
// `ja_id` + `kanri_shiten_code` per api.md §APIS-009-003 注記
// (`kanri_shiten_code` immutable after create; `ja_id` not in body).

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateKanriShitenDto } from './update-kanri-shiten.dto';

const VALID = {
  kanri_shiten_name: '東京中央会支店（改称）',
  kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｶｲｼﾃﾝ ｶｲｼｮｳ',
  todofuken_code: '13',
  yubin_no: '1000001',
  address: '千代田区千代田1-1-1 改修ビル3F',
  tel: '0312345678',
  fax: '0312345679',
  paper_flg: true,
  denshi_flg: true,
  biko: '住所変更済み',
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(UpdateKanriShitenDto, input));
}

describe('UpdateKanriShitenDto', () => {
  it('should accept fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  it('should reject when kanri_shiten_name is missing (required per §4.1)', async () => {
    const errs = await check({ ...VALID, kanri_shiten_name: undefined });
    expect(errs.some((e) => e.property === 'kanri_shiten_name')).toBe(true);
  });

  it('should reject when todofuken_code is missing (required per §4.1)', async () => {
    const errs = await check({ ...VALID, todofuken_code: undefined });
    expect(errs.some((e) => e.property === 'todofuken_code')).toBe(true);
  });

  it('should reject when kanri_shiten_name exceeds 100 chars', async () => {
    const errs = await check({ ...VALID, kanri_shiten_name: 'あ'.repeat(101) });
    expect(errs.some((e) => e.property === 'kanri_shiten_name')).toBe(true);
  });

  it('should accept when optional fields are omitted', async () => {
    const minimal = {
      kanri_shiten_name: VALID.kanri_shiten_name,
      todofuken_code: VALID.todofuken_code,
    };
    expect(await check(minimal)).toHaveLength(0);
  });

  // Note: `ja_id` and `kanri_shiten_code` are not declared on this DTO,
  // so smuggled values would be rejected at the ValidationPipe (config
  // option `forbidNonWhitelisted: true` — see main.ts). That's a
  // pipe-level concern, not a class-level concern; tests covering it
  // belong in controller.spec.ts via supertest, not here.
});
