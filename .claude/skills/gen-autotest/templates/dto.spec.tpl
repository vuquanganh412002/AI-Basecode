// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { {{Action}}{{Entity}}Dto } from './{{action}}-{{entity}}.dto';

describe('{{Action}}{{Entity}}Dto validation', () => {
  const validInput = { /* {{VALID_DTO_PAYLOAD}} */ };

  it('should pass validation when all fields are valid', async () => {
    const dto = plainToInstance({{Action}}{{Entity}}Dto, validInput);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // {{REQUIRED_FIELDS_LOOP}}  → for each required field
  it('should fail validation when required field {{field}} is missing', async () => {
    const { {{field}}: _, ...rest } = validInput;
    const dto = plainToInstance({{Action}}{{Entity}}Dto, rest);
    const errors = await validate(dto);
    expect(errors.some(e => e.property === '{{field}}')).toBe(true);
  });

  // {{LENGTH_FIELDS_LOOP}} → for each length-bounded field
  it('should fail validation when {{field}} exceeds max length {{max}}', async () => {
    const dto = plainToInstance({{Action}}{{Entity}}Dto, {
      ...validInput,
      {{field}}: 'x'.repeat({{max}} + 1),
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === '{{field}}')).toBe(true);
  });

  it('should fail validation when {{field}} is shorter than min length {{min}}', async () => {
    const dto = plainToInstance({{Action}}{{Entity}}Dto, {
      ...validInput,
      {{field}}: 'x'.repeat(Math.max(0, {{min}} - 1)),
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === '{{field}}')).toBe(true);
  });

  // {{FORMAT_FIELDS_LOOP}} → for each format-constrained field (email / number / enum / regex)
  it('should fail validation when {{field}} has invalid format', async () => {
    const dto = plainToInstance({{Action}}{{Entity}}Dto, {
      ...validInput,
      {{field}}: '{{invalid_value}}',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === '{{field}}')).toBe(true);
  });

  it('should strip unknown properties when whitelist is enabled', async () => {
    const dto = plainToInstance({{Action}}{{Entity}}Dto, {
      ...validInput,
      __unknown__: 'should-be-stripped',
    });
    expect((dto as any).__unknown__).toBeUndefined();
  });
});
