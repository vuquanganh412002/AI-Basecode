import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import { DenshiShoninStatus } from '@/common/enums';
import { DokusyaSyncService } from './dokusya-sync.service';
import type { DenshiUserRow } from './dokusya-sync.mapper';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  applyChange: jest.fn(),
}));
const mockApplyChange = applyChange as jest.Mock;

// 管理支店: kanri_shiten_code はハイフン入り → normalize で '1301002001' に一致。
const KANRI_ROWS = [
  { kanri_shiten_id: '20', ja_id: '10', kanri_shiten_code: '1301-002-001' },
];
const HANBAITEN_ROWS = [
  { hanbaiten_id: '55', ja_id: '10', hanbaiten_code: 'H001' },
];

function buildUser(overrides: Partial<DenshiUserRow> = {}): DenshiUserRow {
  return {
    id: 1001,
    JACd: '1301002001',
    status: 0,
    approval: 1,
    member_type: 2,
    sex: 1,
    subscribe_flg: 1,
    first_name: '農業',
    last_name: '太郎',
    first_kana: 'のうぎょう',
    last_kana: 'たろう',
    zip1: '100',
    zip2: '0001',
    pref_id: 13,
    addr: '千代田区',
    city: '1-1-1',
    tel1: '0312345678',
    activated_at: '2026-04-01 00:00:00',
    paper_permission_dt: null,
    Campagna_flg: '0',
    chg_ts: '2026-04-01 00:00:00',
    ...overrides,
  };
}

interface Opts {
  deltaRows?: DenshiUserRow[];
  existing?: { dokusyaId: number; denshiShoninStatus?: number | null } | null;
  lockLocked?: boolean;
  fullSync?: boolean;
}

function buildService(opts: Opts = {}) {
  const {
    deltaRows = [buildUser()],
    existing = null,
    lockLocked = true,
    fullSync = false,
  } = opts;

  const managerMock = {
    findOne: jest.fn().mockResolvedValue(existing),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const stateRepo = {
    findOne: jest.fn().mockResolvedValue({
      batchName: 'dokusya-sync',
      lastSourceId: '0',
      lastSourceUpdatedAt: new Date(0),
    }),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    create: jest.fn((v: unknown) => v),
  };

  const lockQr = {
    connect: jest.fn(),
    release: jest.fn(),
    query: jest.fn((sql: string) =>
      sql.includes('pg_try_advisory_lock')
        ? Promise.resolve([{ locked: lockLocked }])
        : Promise.resolve(undefined),
    ),
  };

  const mainDb = {
    createQueryRunner: jest.fn(() => lockQr),
    getRepository: jest.fn(() => stateRepo),
    query: jest.fn((sql: string) => {
      if (sql.includes('m_kanri_shiten')) return Promise.resolve(KANRI_ROWS);
      if (sql.includes('m_hanbaiten')) return Promise.resolve(HANBAITEN_ROWS);
      return Promise.resolve([]);
    }),
    transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
  };

  const denshibanQuery = jest.fn().mockResolvedValue(deltaRows);
  const denshibanDb = {
    withConnection: jest.fn((fn: (ds: unknown) => unknown) =>
      fn({ query: denshibanQuery }),
    ),
  };

  const rireki = { lockDokusyaRow: jest.fn().mockResolvedValue(undefined) };
  const configService = { get: jest.fn(() => fullSync) };

  const service = new DokusyaSyncService(
    denshibanDb as unknown as DenshibanDbService,
    rireki as unknown as DokusyaRirekiService,
    mainDb as unknown as DataSource,
    configService as unknown as ConfigService,
  );
  return { service, mainDb, managerMock, stateRepo, lockQr, denshibanDb, denshibanQuery, rireki };
}

describe('DokusyaSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyChange.mockResolvedValue({
      dokusyaId: 500,
      insertedRirekiIds: [900],
      before: null,
      after: {},
      denshiSync: false,
    });
  });

  it('skips the whole run when advisory lock is NOT acquired (previous run in progress)', async () => {
    const { service, denshibanDb } = buildService({ lockLocked: false });
    await service.run();
    expect(denshibanDb.withConnection).not.toHaveBeenCalled();
    expect(mockApplyChange).not.toHaveBeenCalled();
  });

  it('acquires + releases the advisory lock around the sync', async () => {
    const { service, lockQr } = buildService();
    await service.run();
    const sqls = lockQr.query.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(sqls.some((s) => s.includes('pg_try_advisory_lock'))).toBe(true);
    expect(sqls.some((s) => s.includes('pg_advisory_unlock'))).toBe(true);
  });

  it('CREATE: new user → applyChange(CREATE) + sets denshi_kaiin_id on master', async () => {
    const { service, managerMock } = buildService({ existing: null });
    await service.run();

    expect(mockApplyChange).toHaveBeenCalledTimes(1);
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('CREATE');
    expect(input.source).toBe('BATCH');
    expect(input.johoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 作成後に master へ denshi_kaiin_id を set する。
    const setKaiin = managerMock.update.mock.calls.find(
      (c: unknown[]) =>
        (c[2] as Record<string, unknown>)?.denshiKaiinId === 1001,
    );
    expect(setKaiin).toBeDefined();
  });

  it('UPDATE: existing user → applyChange(UPDATE) with lock, no CREATE', async () => {
    const { service, rireki } = buildService({ existing: { dokusyaId: 77 } });
    await service.run();

    expect(rireki.lockDokusyaRow).toHaveBeenCalledWith(expect.anything(), 77);
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('UPDATE');
    expect(input.dokusyaId).toBe(77);
  });

  it('CANCEL: status=9 on existing → applyChange(UPDATE, busu=0) + softDelete master', async () => {
    const { service, managerMock } = buildService({
      existing: { dokusyaId: 88 },
      deltaRows: [buildUser({ status: 9 })],
    });
    await service.run();

    const input = mockApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('UPDATE');
    expect(input.values.dokusyaBusu).toBe(0);
    expect(managerMock.softDelete).toHaveBeenCalled();
  });

  it('SKIP: JACd not resolvable to 管理支店 → no applyChange', async () => {
    const { service } = buildService({
      deltaRows: [buildUser({ JACd: '9999999999' })],
    });
    await service.run();
    expect(mockApplyChange).not.toHaveBeenCalled();
  });

  it('resolves JACd against kanri_shiten_code with hyphens stripped', async () => {
    // KANRI_ROWS code is '1301-002-001'; user JACd '1301002001' must still match.
    const { service } = buildService({ existing: null });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.values.jaId).toBe(10);
    expect(input.values.kanriShitenId).toBe(20);
  });

  it('advances the watermark to the processed max id / chg_ts', async () => {
    const { service, stateRepo } = buildService({
      deltaRows: [buildUser({ id: 1001 }), buildUser({ id: 1005, chg_ts: '2026-04-02 00:00:00' })],
    });
    await service.run();
    const patch = stateRepo.update.mock.calls[0][1];
    expect(String(patch.lastSourceId)).toBe('1005');
    expect(patch.lastSourceUpdatedAt).toBeInstanceOf(Date);
  });

  it('UPDATE preserves cloud-owned tanka_id (never overwrites — omitted from values)', async () => {
    const { service } = buildService({
      existing: { dokusyaId: 77, denshiShoninStatus: DenshiShoninStatus.APPROVED },
    });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    // tanka_id は cloud 所有 → applyChange の values に含めず既存値を保持する。
    expect('tankaId' in input.values).toBe(false);
  });

  it('UPDATE keeps cloud-decided denshi_shonin_status when electronic is pending(0)', async () => {
    const { service } = buildService({
      existing: { dokusyaId: 77, denshiShoninStatus: DenshiShoninStatus.APPROVED },
      deltaRows: [buildUser({ approval: 0 })], // 電子版=未承認
    });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    // cloud が承認済み → 電子版の 0 で差し戻さない（values から除外）。
    expect('denshiShoninStatus' in input.values).toBe(false);
  });

  it('UPDATE takes electronic denshi_shonin_status when it is decided (approval=2)', async () => {
    const { service } = buildService({
      existing: { dokusyaId: 77, denshiShoninStatus: DenshiShoninStatus.APPROVED },
      deltaRows: [buildUser({ approval: 2 })], // 電子版=否認
    });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.values.denshiShoninStatus).toBe(DenshiShoninStatus.REJECTED);
  });

  it('full-sync mode queries users without the watermark predicate', async () => {
    const { service, denshibanQuery } = buildService({ fullSync: true });
    await service.run();
    const sql = denshibanQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain('id > ?');
    expect(sql).toContain('Campagna_flg'); // キャンペーン除外は常に適用
  });
});
