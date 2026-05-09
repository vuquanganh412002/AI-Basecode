// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (公開お知らせ一覧)
//
// OshiraseService unit specs for API ACSMS-API-001-006
// (GET /api/v1/oshirase/public — 認証不要). Verifies the public list query
// honours publish_location + publish_start_date <= NOW + status=2 +
// ja_id IS NULL filter, and labels are mapped from oshirase_type code.

import { OshiraseService } from './oshirase.service';
import { buildOshirase } from '../../../test/fixtures/auth.factory';

describe('OshiraseService', () => {
  let service: OshiraseService;
  let qbMock: any;
  let repo: any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo = {
      createQueryBuilder: jest.fn(() => qbMock),
    };
    service = new OshiraseService(repo);
  });

  describe('findPublic', () => {
    it('should return mapped list with type label "システム" for oshirase_type=1 when status=2 and within window', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({
          oshiraseId: 1,
          oshiraseType: 1,
          title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
          publishStartDate: new Date('2026-04-10T00:00:00Z'),
        }),
      ]);

      const result = await service.findPublic({});

      expect(result).toEqual([
        {
          oshirase_id: 1,
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
          publish_start_date: '2026-04-10',
        },
      ]);
    });

    it('should label oshirase_type=2 as "重要" when row is type 2', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 2 })]);
      const result = await service.findPublic({});
      expect(result[0].oshirase_type_label).toBe('重要');
    });

    it('should label oshirase_type=3 as "一般" when row is type 3', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 3 })]);
      const result = await service.findPublic({});
      expect(result[0].oshirase_type_label).toBe('一般');
    });

    it('should default publish_location to 1 when query omits it', async () => {
      await service.findPublic({});
      expect(qbMock.where).toHaveBeenCalledWith(
        'o.publish_location = :publishLocation',
        { publishLocation: 1 },
      );
    });

    it('should use publish_location=2 when query specifies it', async () => {
      await service.findPublic({ publish_location: 2 });
      expect(qbMock.where).toHaveBeenCalledWith(
        'o.publish_location = :publishLocation',
        { publishLocation: 2 },
      );
    });

    it('should default limit to 10 when query omits it', async () => {
      await service.findPublic({});
      expect(qbMock.take).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 10 when client sends a higher number', async () => {
      await service.findPublic({ limit: 50 });
      expect(qbMock.take).toHaveBeenCalledWith(10);
    });

    it('should filter status=2 (公開) when querying t_oshirase', async () => {
      await service.findPublic({});
      expect(qbMock.andWhere).toHaveBeenCalledWith('o.status = 2');
    });

    it('should filter publish_start_date <= NOW when querying', async () => {
      await service.findPublic({});
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'o.publish_start_date <= :now',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should filter publish_end_date IS NULL OR >= NOW when querying', async () => {
      await service.findPublic({});
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should restrict to JA-wide notices (ja_id IS NULL) when querying', async () => {
      await service.findPublic({});
      expect(qbMock.andWhere).toHaveBeenCalledWith('o.ja_id IS NULL');
    });

    it('should order by publish_start_date DESC when listing', async () => {
      await service.findPublic({});
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        'o.publish_start_date',
        'DESC',
      );
    });

    it('should return empty array when no notices match', async () => {
      qbMock.getMany.mockResolvedValue([]);
      const result = await service.findPublic({});
      expect(result).toEqual([]);
    });

    it('should format publish_start_date as YYYY-MM-DD when serialising', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({ publishStartDate: new Date('2026-04-10T18:30:00Z') }),
      ]);
      const result = await service.findPublic({});
      expect(result[0].publish_start_date).toBe('2026-04-10');
    });

    it('should return empty label when oshirase_type is unknown (defensive)', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 99 })]);
      const result = await service.findPublic({});
      expect(result[0].oshirase_type_label).toBe('');
    });
  });
});
