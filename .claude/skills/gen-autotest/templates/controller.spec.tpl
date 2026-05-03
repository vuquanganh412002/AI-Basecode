// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { {{Entity}}Controller } from './{{entity}}.controller';
import { {{Entity}}Service } from './{{entity}}.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { create{{Entity}}Mock, createSessionPayloadMock } from '../../../test/fixtures/{{entity}}.factory';

describe('{{Entity}}Controller', () => {
  let controller: {{Entity}}Controller;
  let mockService: Record<string, vi.Mock>;
  const adminPayload = createSessionPayloadMock({ role_code: 'NICHINO_ADMIN' });
  const reqStub = { user: adminPayload, ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } };

  beforeEach(async () => {
    mockService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [{{Entity}}Controller],
      providers: [
        { provide: {{Entity}}Service, useValue: mockService },
        Reflector,
      ],
    })
      .overrideGuard(SessionAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<{{Entity}}Controller>({{Entity}}Controller);
  });

  describe('POST /api/v1/{{domain}} (create)', () => {
    it('should call service.create with dto, user and request when invoked', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      const created = create{{Entity}}Mock(dto);
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(dto, reqStub as any);

      expect(result).toEqual({ data: created });
      expect(mockService.create).toHaveBeenCalledWith(dto, adminPayload, reqStub);
    });

    it('should require permission "{{permission_create}}" when route metadata is read', () => {
      const reflector = new Reflector();
      const perms = reflector.get<string[]>('permissions', controller.create);
      expect(perms).toContain('{{permission_create}}');
    });
  });

  describe('GET /api/v1/{{domain}} (findAll)', () => {
    it('should pass pagination query and session user when listing', async () => {
      const query = { page: 1, per_page: 20, sort_by: 'created_at', sort_order: 'desc' };
      const payload = { data: [create{{Entity}}Mock()], meta: { total: 1, page: 1, per_page: 20, total_pages: 1 } };
      mockService.findAll.mockResolvedValue(payload);

      const result = await controller.findAll(query, reqStub as any);

      expect(result).toEqual(payload);
      expect(mockService.findAll).toHaveBeenCalledWith(query, adminPayload);
    });

    it('should require permission "{{permission_view}}" when route metadata is read', () => {
      const reflector = new Reflector();
      const perms = reflector.get<string[]>('permissions', controller.findAll);
      expect(perms).toContain('{{permission_view}}');
    });
  });

  describe('GET /api/v1/{{domain}}/:id (findById)', () => {
    it('should return wrapped data when service returns record', async () => {
      const item = create{{Entity}}Mock({ id: 1 });
      mockService.findById.mockResolvedValue(item);

      const result = await controller.findById('1', reqStub as any);

      expect(result).toEqual({ data: item });
      expect(mockService.findById).toHaveBeenCalledWith('1', adminPayload);
    });
  });

  describe('PATCH /api/v1/{{domain}}/:id (update)', () => {
    it('should require permission "{{permission_update}}" when route metadata is read', () => {
      const reflector = new Reflector();
      const perms = reflector.get<string[]>('permissions', controller.update);
      expect(perms).toContain('{{permission_update}}');
    });

    it('should pass id, dto, user and request to service when called', async () => {
      const dto = { /* update */ };
      const updated = create{{Entity}}Mock({ id: 1 });
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto, reqStub as any);

      expect(result).toEqual({ data: updated });
      expect(mockService.update).toHaveBeenCalledWith('1', dto, adminPayload, reqStub);
    });
  });

  describe('DELETE /api/v1/{{domain}}/:id (delete)', () => {
    it('should require permission "{{permission_delete}}" when route metadata is read', () => {
      const reflector = new Reflector();
      const perms = reflector.get<string[]>('permissions', controller.delete);
      expect(perms).toContain('{{permission_delete}}');
    });

    it('should return success message when delete completes', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1', reqStub as any);

      expect(result).toEqual({ message: '正常に削除しました' });
    });
  });
});
