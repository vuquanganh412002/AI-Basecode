// Screen: ACSMS-SCR-023 — ファイルアップロード画面
//
// POST /api/v1/file-upload — multipart upload request DTO. Files
// themselves are validated by Multer (size + MIME) outside this DTO;
// the DTO covers ja_ids[] shape.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UploadFileUploadDto } from '@/modules/file-upload/dto/upload-file-upload.dto';

async function check(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UploadFileUploadDto, input);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('UploadFileUploadDto — SCR-023 multipart body validation', () => {
  it('should accept a body with ja_ids = [12345]', async () => {
    expect(await check({ ja_ids: [12345] })).toEqual([]);
  });

  it('should accept a body with multiple ja_ids = [12345, 67890]', async () => {
    expect(await check({ ja_ids: [12345, 67890] })).toEqual([]);
  });

  // ─── ja_ids ───────────────────────────────────────────────────
  describe('ja_ids', () => {
    it('should reject when ja_ids is missing', async () => {
      expect(await check({})).toContain('ja_ids');
    });

    it('should reject when ja_ids is an empty array', async () => {
      // api.md §4.1 — TARGET_JA_REQUIRED when ja_ids is empty
      expect(await check({ ja_ids: [] })).toContain('ja_ids');
    });

    it('should ACCEPT a scalar ja_ids by wrapping it into a single-element array', async () => {
      // multipart sends `ja_ids[]=12345` as a scalar STRING '12345'
      // when only one field is present (no array shape on the wire).
      // The DTO's @Transform pre-step normalises this into [12345] so
      // the downstream @IsArray + @IsInt pass. This is intentional
      // per the [coerce-string-to-int] comment on the DTO; a scalar
      // is NOT a validation error.
      expect(await check({ ja_ids: 12345 })).toEqual([]);
    });

    it('should reject when ja_ids is an object (uncoerceable to int array)', async () => {
      // {} → wrapped to [{}] → @IsInt rejects each
      expect(await check({ ja_ids: { not: 'an id' } })).toContain('ja_ids');
    });

    it('should reject when ja_ids contains a non-numeric value', async () => {
      expect(await check({ ja_ids: [12345, 'abc'] })).toContain('ja_ids');
    });

    it('should reject when ja_ids contains a negative number', async () => {
      expect(await check({ ja_ids: [-1] })).toContain('ja_ids');
    });

    it('should reject when ja_ids contains a non-integer value', async () => {
      expect(await check({ ja_ids: [1.5] })).toContain('ja_ids');
    });

    it('should coerce stringified numbers to integers when multipart sends ja_ids="12345"', async () => {
      // multipart/form-data delivers all values as strings — DTO must
      // accept '12345' and '67890' coming from the wire.
      const dto = plainToInstance(UploadFileUploadDto, {
        ja_ids: ['12345', '67890'],
      });
      const errors = await validate(dto);
      expect(errors).toEqual([]);
    });
  });
});
