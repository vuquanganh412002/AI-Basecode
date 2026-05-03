// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { {{Entity}}Service } from './{{entity}}.service';
import { {{Entity}} } from './entities/{{entity}}.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  {{Entity}}NotFoundException,
  {{Entity}}DuplicateException,
} from './exceptions';
import { DataScopeViolationException } from '../../common/exceptions/data-scope-violation.exception';
import { create{{Entity}}Mock, createSessionPayloadMock } from '../../../test/fixtures/{{entity}}.factory';

describe('{{Entity}}Service', () => {
  let service: {{Entity}}Service;
  let mockRepo: Record<string, vi.Mock>;
  let mockAuditLog: { logOperation: vi.Mock };
  let mockDataSource: { transaction: vi.Mock };

  const adminPayload = createSessionPayloadMock({ role_code: 'NICHINO_ADMIN', ja_id: null });
  const chuokaiPayload = createSessionPayloadMock({ role_code: 'CHUOKAI', ja_id: 2 });

  beforeEach(async () => {
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      findAndCount: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      }),
    };
    mockAuditLog = { logOperation: vi.fn() };
    mockDataSource = {
      transaction: vi.fn(async (cb) => cb(mockRepo)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {{Entity}}Service,
        { provide: getRepositoryToken({{Entity}}), useValue: mockRepo },
        { provide: AuditLogService, useValue: mockAuditLog },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<{{Entity}}Service>({{Entity}}Service);
  });

  describe('create', () => {
    it('should create {{entity}} when valid data is provided', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      const created = create{{Entity}}Mock(dto);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, adminPayload, { ip: '127.0.0.1', headers: {} } as any);

      expect(result).toEqual(created);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should wrap save and audit-log in a single transaction when create succeeds', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(create{{Entity}}Mock(dto));
      mockRepo.save.mockResolvedValue(create{{Entity}}Mock(dto));

      await service.create(dto, adminPayload, { ip: '127.0.0.1', headers: {} } as any);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockAuditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({ logType: 1, operation: 'CREATE', resultStatus: 1 }),
        expect.any(Object),
      );
    });

    it('should throw {{Entity}}DuplicateException when {{entity}}_code already exists', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      mockRepo.findOne.mockResolvedValue(create{{Entity}}Mock());

      await expect(service.create(dto, adminPayload, {} as any))
        .rejects.toThrow({{Entity}}DuplicateException);
    });

    it('should rollback main DML when audit log fails inside transaction', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(create{{Entity}}Mock(dto));
      mockRepo.save.mockResolvedValue(create{{Entity}}Mock(dto));
      mockAuditLog.logOperation.mockRejectedValueOnce(new Error('audit log down'));
      mockDataSource.transaction.mockImplementationOnce(async (cb) => { await cb(mockRepo); throw new Error('rolled back'); });

      await expect(service.create(dto, adminPayload, {} as any)).rejects.toThrow();
    });

    it('should still emit error log (log_type=3) outside tx when create fails', async () => {
      const dto = { /* {{CREATE_DTO_FIELDS}} */ };
      mockRepo.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(dto, adminPayload, {} as any)).rejects.toThrow('db down');

      expect(mockAuditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({ logType: 3, resultStatus: 2, errorMessage: expect.any(String) }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results when called with valid query', async () => {
      const items = [create{{Entity}}Mock(), create{{Entity}}Mock()];
      mockRepo.findAndCount.mockResolvedValue([items, items.length]);

      const result = await service.findAll(
        { page: 1, per_page: 20, sort_by: 'created_at', sort_order: 'desc' },
        adminPayload,
      );

      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(items.length);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by ja_id when role is CHUOKAI', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, per_page: 20 }, chuokaiPayload);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ja_id: 2 }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return {{entity}} when record exists', async () => {
      const item = create{{Entity}}Mock();
      mockRepo.findOne.mockResolvedValue(item);

      const result = await service.findById(String(item.id), adminPayload);

      expect(result).toEqual(item);
    });

    it('should throw {{Entity}}NotFoundException when record is missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('999', adminPayload))
        .rejects.toThrow({{Entity}}NotFoundException);
    });

    it('should throw DataScopeViolationException when role cannot access record', async () => {
      mockRepo.findOne.mockResolvedValue(create{{Entity}}Mock({ ja_id: 99 }));

      await expect(service.findById('1', chuokaiPayload))
        .rejects.toThrow(DataScopeViolationException);
    });
  });

  describe('update', () => {
    it('should update record and write audit log within a transaction', async () => {
      const before = create{{Entity}}Mock({ id: 1 });
      const after = { ...before, /* updated fields */ };
      mockRepo.findOne.mockResolvedValue(before);
      mockRepo.save.mockResolvedValue(after);

      const result = await service.update('1', { /* update dto */ }, adminPayload, {} as any);

      expect(result).toEqual(after);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockAuditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'UPDATE', beforeValue: before, afterValue: after }),
        expect.any(Object),
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete record and emit audit log when no related data', async () => {
      const before = create{{Entity}}Mock({ id: 1 });
      mockRepo.findOne.mockResolvedValue(before);
      mockRepo.find.mockResolvedValue([]);
      mockRepo.softDelete.mockResolvedValue({ affected: 1 });

      await service.delete('1', adminPayload, {} as any);

      expect(mockRepo.softDelete).toHaveBeenCalledWith('1');
      expect(mockAuditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'DELETE', beforeValue: before }),
        expect.any(Object),
      );
    });

    it('should throw HasRelatedDataException when child records exist', async () => {
      mockRepo.findOne.mockResolvedValue(create{{Entity}}Mock({ id: 1 }));
      mockRepo.find.mockResolvedValue([{ id: 1 }]);

      await expect(service.delete('1', adminPayload, {} as any)).rejects.toThrow();
    });
  });
});
