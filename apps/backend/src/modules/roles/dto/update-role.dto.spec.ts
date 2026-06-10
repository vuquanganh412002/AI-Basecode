// Screen: ACSMS-SCR-027 — ロール管理画面
//
// UpdateRoleDto validation tests per ACSMS-API-027-003 §リクエストパラメータ.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRoleDto } from '@/modules/roles/dto/update-role.dto';

const VALID = {
  role_name: '中央会',
  description: '中央会アカウント（更新）',
  permission_ids: [1, 2, 3, 4, 5, 6, 7],
} as const;

async function check(input: unknown) {
  return validate(plainToInstance(UpdateRoleDto, input));
}

describe('UpdateRoleDto', () => {
  it('should accept fully-populated valid payload when all fields are correct', async () => {
    expect(await check(VALID)).toHaveLength(0);
  });

  describe('role_name (required, max 20)', () => {
    it('should reject when role_name is missing', async () => {
      const errs = await check({ ...VALID, role_name: undefined });
      expect(errs.some((e) => e.property === 'role_name')).toBe(true);
    });

    it('should reject when role_name is empty string', async () => {
      const errs = await check({ ...VALID, role_name: '' });
      expect(errs.some((e) => e.property === 'role_name')).toBe(true);
    });

    it('should reject when role_name exceeds 20 chars', async () => {
      const errs = await check({ ...VALID, role_name: 'あ'.repeat(21) });
      expect(errs.some((e) => e.property === 'role_name')).toBe(true);
    });

    it('should accept when role_name is exactly 20 chars', async () => {
      const errs = await check({ ...VALID, role_name: 'あ'.repeat(20) });
      expect(errs.some((e) => e.property === 'role_name')).toBe(false);
    });
  });

  describe('description (optional, max 200)', () => {
    it('should accept when description is omitted', async () => {
      const { description: _drop, ...without } = VALID;
      expect((await check(without)).some((e) => e.property === 'description')).toBe(false);
    });

    it('should accept when description is empty string (空欄可)', async () => {
      const errs = await check({ ...VALID, description: '' });
      expect(errs.some((e) => e.property === 'description')).toBe(false);
    });

    it('should reject when description exceeds 200 chars', async () => {
      const errs = await check({ ...VALID, description: 'あ'.repeat(201) });
      expect(errs.some((e) => e.property === 'description')).toBe(true);
    });
  });

  describe('permission_ids (required, integer array)', () => {
    it('should reject when permission_ids is missing', async () => {
      const errs = await check({ ...VALID, permission_ids: undefined });
      expect(errs.some((e) => e.property === 'permission_ids')).toBe(true);
    });

    it('should reject when permission_ids is not an array', async () => {
      const errs = await check({ ...VALID, permission_ids: 'not-array' });
      expect(errs.some((e) => e.property === 'permission_ids')).toBe(true);
    });

    it('should accept when permission_ids is an empty array (全権限解除)', async () => {
      const errs = await check({ ...VALID, permission_ids: [] });
      expect(errs.some((e) => e.property === 'permission_ids')).toBe(false);
    });

    it('should reject when a permission_ids element is not an integer', async () => {
      const errs = await check({ ...VALID, permission_ids: [1, 'two', 3] });
      expect(errs.some((e) => e.property === 'permission_ids')).toBe(true);
    });

    it('should accept when permission_ids contains valid integers', async () => {
      const errs = await check({ ...VALID, permission_ids: [1, 2, 28, 38] });
      expect(errs.some((e) => e.property === 'permission_ids')).toBe(false);
    });
  });

  // Per api.md §3 注記: role_code is NOT updatable. ValidationPipe(forbidNonWhitelisted)
  // rejects it at the pipe layer (controller-level concern). This DTO spec only
  // verifies it's not declared on the class — controller spec covers the 400.
  describe('role_code (not declared — caught by ValidationPipe whitelist)', () => {
    it('should not declare role_code on the DTO class', () => {
      const instance = plainToInstance(UpdateRoleDto, VALID);
      expect(Object.prototype.hasOwnProperty.call(instance, 'role_code')).toBe(false);
    });
  });
});
