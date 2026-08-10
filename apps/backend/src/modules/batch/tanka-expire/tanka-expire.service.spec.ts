import { DataSource } from 'typeorm';
import { Tanka } from '@/database/entities/tanka.entity';
import { TankaExpireService } from './tanka-expire.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

/** 実行サマリの t_log 書込み。呼ばれたことだけ検証できればよいのでスパイで足りる。 */
function auditMock(): { logOperation: jest.Mock } {
  return { logOperation: jest.fn().mockResolvedValue(undefined) };
}

describe('TankaExpireService', () => {
  let service: TankaExpireService;
  let qb: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let db: { createQueryBuilder: jest.Mock };
  let audit: { logOperation: jest.Mock };

  beforeEach(() => {
    qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 3 }),
    };
    db = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    // 単体は plain new（Nest ライフサイクル不要）。
    audit = auditMock();
    service = new TankaExpireService(
      db as unknown as DataSource,
      audit as unknown as AuditLogService,
    );
  });

  it('should UPDATE m_tanka set active_flg=false for expired active rows', async () => {
    await service.run();

    expect(qb.update).toHaveBeenCalledWith(Tanka);
    expect(qb.set).toHaveBeenCalledWith({ activeFlg: false });

    const conds = [
      qb.where.mock.calls[0][0],
      ...qb.andWhere.mock.calls.map((c) => c[0] as string),
    ];
    // active + 期限あり + 期限切れ(<today) + 未削除 の4条件。
    expect(conds).toEqual(
      expect.arrayContaining([
        'active_flg = true',
        'tekiyo_end_date IS NOT NULL',
        'tekiyo_end_date < :today',
        'deleted_at IS NULL',
      ]),
    );
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });

  it('should bind :today as a JST YYYY-MM-DD string (当日は < なので対象外)', async () => {
    await service.run();
    const todayCall = qb.andWhere.mock.calls.find(
      (c) => c[0] === 'tekiyo_end_date < :today',
    );
    expect(todayCall?.[1]).toEqual({
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('should be idempotent — resolve without throwing when 0 rows affected', async () => {
    qb.execute.mockResolvedValue({ affected: 0 });
    await expect(service.run()).resolves.toBeUndefined();
  });
});
