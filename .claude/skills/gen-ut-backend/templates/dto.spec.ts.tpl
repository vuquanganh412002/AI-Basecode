// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __DTO__    = DTO class name (e.g. "CreateTankaDto")
//   __DTO_FILE__ = dto filename relative (e.g. "create-tanka.dto")
//   __MODULE__ = module folder name (e.g. "tanka")

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { __DTO__ } from '../../src/modules/__MODULE__/dto/__DTO_FILE__';

describe('__DTO__', () => {
  // For each field in api.md リクエストパラメータ table:
  //   - happy path: valid input passes
  //   - each validator constraint: empty, too short, too long, wrong type, invalid format

  // it('should pass validation when all required fields present and valid', async () => {
  //   const dto = plainToInstance(__DTO__, { /* valid payload */ });
  //   const errors = await validate(dto);
  //   expect(errors).toHaveLength(0);
  // });
  //
  // it('should fail when required field "name" is missing', async () => {
  //   const dto = plainToInstance(__DTO__, { /* missing name */ });
  //   const errors = await validate(dto);
  //   expect(errors.some(e => e.property === 'name')).toBe(true);
  // });
  //
  // it('should fail when name exceeds 100 chars', async () => {
  //   const dto = plainToInstance(__DTO__, { name: 'x'.repeat(101) });
  //   const errors = await validate(dto);
  //   expect(errors.some(e => e.constraints?.maxLength)).toBe(true);
  // });
});
