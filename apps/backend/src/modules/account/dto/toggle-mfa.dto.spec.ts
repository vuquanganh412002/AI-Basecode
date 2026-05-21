// Screen: header self-service — MFA toggle
//
// ToggleMfaDto class-validator specs.

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ToggleMfaDto } from './toggle-mfa.dto';

async function fields(payload: unknown): Promise<string[]> {
  const dto = plainToInstance(ToggleMfaDto, payload);
  const errors = await validate(dto as object);
  return errors.map((e) => e.property);
}

describe('ToggleMfaDto', () => {
  it('should pass validation when enabled is true', async () => {
    expect(await fields({ enabled: true })).toEqual([]);
  });

  it('should pass validation when enabled is false', async () => {
    expect(await fields({ enabled: false })).toEqual([]);
  });

  it('should reject when enabled is missing', async () => {
    expect(await fields({})).toContain('enabled');
  });

  it('should reject when enabled is a string instead of boolean', async () => {
    expect(await fields({ enabled: 'true' })).toContain('enabled');
  });

  it('should reject when enabled is a number', async () => {
    expect(await fields({ enabled: 1 })).toContain('enabled');
  });
});
