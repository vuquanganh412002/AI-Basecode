// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Drives src/modules/dokusya/dto/replace-hanbaiten.dto.ts (to be
// generated). One test (or group) per row in
// docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md §API-015-002
// リクエストパラメータ + §4.1 リクエストのバリデーション.
//
// The DTO binds the JSON body of `POST /api/v1/dokusya/replace-hanbaiten`.
// NOTE: the "未来日のみ可" (> today・当日不可・顧客要件 2026-07 改訂) check on
// hanbaiten_tekiyo_date is a SERVICE-level business rule (api.md §4.1)
// and is asserted in the replace service — this DTO only enforces
// required + YYYY-MM-DD format.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { ReplaceHanbaitenDto } from '@/modules/dokusya/dto/replace-hanbaiten.dto';
import { buildReplaceBody } from '@test/fixtures/dokusya.factory';

describe('ReplaceHanbaitenDto', () => {
  // ─── Happy path ─────────────────────────────────────────────────────────
  it('should pass validation when every required field has a valid value', async () => {
    const dto = plainToInstance(ReplaceHanbaitenDto, buildReplaceBody());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── dokusya_ids (Array<Number>, required, 1..1000 items) ───────────────
  it('should fail when dokusya_ids is missing', async () => {
    const body = buildReplaceBody();
    delete body.dokusya_ids;
    const dto = plainToInstance(ReplaceHanbaitenDto, body);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_ids')).toBe(true);
  });

  it('should fail when dokusya_ids is an empty array', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ dokusya_ids: [] }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_ids')).toBe(true);
  });

  it('should pass when dokusya_ids has exactly 1 item', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ dokusya_ids: [5001] }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when dokusya_ids has exactly 1000 items', async () => {
    const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ dokusya_ids: ids }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when dokusya_ids exceeds 1000 items', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => i + 1);
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ dokusya_ids: ids }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_ids')).toBe(true);
  });

  it('should fail when dokusya_ids contains a non-numeric element', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ dokusya_ids: [5001, 'abc'] }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dokusya_ids')).toBe(true);
  });

  // ─── new_hanbaiten_id (Number, required, positive int) ──────────────────
  it('should fail when new_hanbaiten_id is missing', async () => {
    const body = buildReplaceBody();
    delete body.new_hanbaiten_id;
    const dto = plainToInstance(ReplaceHanbaitenDto, body);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'new_hanbaiten_id')).toBe(true);
  });

  it('should fail when new_hanbaiten_id is non-numeric', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ new_hanbaiten_id: 'nope' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'new_hanbaiten_id')).toBe(true);
  });

  it('should fail when new_hanbaiten_id is zero or negative', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ new_hanbaiten_id: 0 }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'new_hanbaiten_id')).toBe(true);
  });

  it('should coerce new_hanbaiten_id to Number when supplied as a numeric string', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ new_hanbaiten_id: '201' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.new_hanbaiten_id).toBe(201);
  });

  // ─── hanbaiten_tekiyo_date (String, required, YYYY-MM-DD) ────────────────
  it('should fail when hanbaiten_tekiyo_date is missing', async () => {
    const body = buildReplaceBody();
    delete body.hanbaiten_tekiyo_date;
    const dto = plainToInstance(ReplaceHanbaitenDto, body);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_tekiyo_date')).toBe(
      true,
    );
  });

  it('should fail when hanbaiten_tekiyo_date is not YYYY-MM-DD format', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ hanbaiten_tekiyo_date: '2026/06/01' }),
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hanbaiten_tekiyo_date')).toBe(
      true,
    );
  });

  it('should pass when hanbaiten_tekiyo_date is a valid YYYY-MM-DD', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ hanbaiten_tekiyo_date: '2026-06-01' }),
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── whitelist — forbid unknown params ──────────────────────────────────
  it('should reject an unknown body field when forbidNonWhitelisted is on', async () => {
    const dto = plainToInstance(
      ReplaceHanbaitenDto,
      buildReplaceBody({ hacker_field: 1 }),
    );
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === 'hacker_field')).toBe(true);
  });
});
