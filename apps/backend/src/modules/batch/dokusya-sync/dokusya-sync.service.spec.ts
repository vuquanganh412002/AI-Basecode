import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import { DenshiShoninStatus } from '@/common/enums';
import { DokusyaSyncService, PAGE_SIZE } from './dokusya-sync.service';
import type { DenshiUserRow } from './dokusya-sync.mapper';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

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
  // 電子版単独の受け皿となるダミー販売店（顧客要件2026-08）。
  { hanbaiten_id: '99', ja_id: '10', hanbaiten_code: '9999999999' },
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
  /** m_hanbaiten の行（ダミー販売店の有無を切り替えるテスト用）。 */
  hanbaitenRows?: Array<{ hanbaiten_id: string; ja_id: string; hanbaiten_code: string }>;
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
    hanbaitenRows = HANBAITEN_ROWS,
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
      if (sql.includes('m_hanbaiten')) return Promise.resolve(hanbaitenRows);
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
  /** 実行サマリの t_log 書込み（1 実行 1 行）。呼ばれたことを検証できれば足りる。 */
  const auditLog = { logOperation: jest.fn().mockResolvedValue(undefined) };

  const service = new DokusyaSyncService(
    denshibanDb as unknown as DenshibanDbService,
    rireki as unknown as DokusyaRirekiService,
    mainDb as unknown as DataSource,
    configService as unknown as ConfigService,
    auditLog as unknown as AuditLogService,
  );
  return { service, mainDb, managerMock, stateRepo, lockQr, denshibanDb, denshibanQuery, rireki, auditLog };
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
    // actor は監査列に入るだけでなく、t_dokusya_rireki の最古行(rireki_no=1)の
    // created_by として「電子版から同期された読者」を判別するキー（顧客要件
    // 2026-08）。値を変えると判別が壊れるので固定で検証する。
    expect(input.actor).toBe('SYSTEM_DENSHI_SYNC');
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

  // 顧客要件 2026-08 — 解約は「tetsuzuki_shurui=解約 + 中止日保持」で表し、
  // master を論理削除しない。SCR-014 の購読停止は予約時点で電子版へ cancel を
  // push するため、中止日が未来でも電子版は即 status=9 になる。ここで
  // softDelete すると予約しただけで master が消え、さらに到来日バッチの抽出
  // 条件（deleted_at IS NULL）から外れて予約が永久に確定されない。
  it('CANCEL: status=9 on existing → applyChange(UPDATE, busu=0) and does NOT soft-delete master', async () => {
    const { service, managerMock } = buildService({
      existing: { dokusyaId: 88 },
      deltaRows: [buildUser({ status: 9 })],
    });
    await service.run();

    const input = mockApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('UPDATE');
    expect(input.values.dokusyaBusu).toBe(0);
    expect(managerMock.softDelete).not.toHaveBeenCalled();
  });

  // 中止日は電子版 users.deleted_at を正とする（顧客要件 2026-08）。
  it('CANCEL: should carry users.deleted_at into dokusya_chushi_date', async () => {
    const { service } = buildService({
      existing: { dokusyaId: 88 },
      deltaRows: [buildUser({ status: 9, deleted_at: '2030-09-30 00:00:00' })],
    });
    await service.run();

    const input = mockApplyChange.mock.calls[0][1];
    expect(input.values.dokusyaChushiDate).toBe('2030-09-30');
  });

  // 販売店の解決（顧客要件2026-08）: 電子版単独は当該 JA のダミー販売店
  // （hanbaiten_code=9999999999）。併読も同じ扱いで、電子版側の ShopCd は
  // 参照しない（顧客要件 2026-08）。
  describe('hanbaiten resolution', () => {
    it('should assign the JA dummy hanbaiten for a 電子版単独 row', async () => {
      const { service } = buildService({ existing: null });
      await service.run();

      expect(mockApplyChange.mock.calls[0][1].values.hanbaitenId).toBe(99);
    });

    it('should set null when the JA has no dummy hanbaiten (行は落とさない)', async () => {
      const { service } = buildService({
        existing: null,
        hanbaitenRows: [{ hanbaiten_id: '55', ja_id: '10', hanbaiten_code: 'H001' }],
      });
      await service.run();

      // 取り込みは通ること（skip も throw もしない）。
      expect(mockApplyChange).toHaveBeenCalledTimes(1);
      expect(mockApplyChange.mock.calls[0][1].values.hanbaitenId).toBeNull();
    });

    it('should assign the dummy for a 併読 row too, ignoring ShopCd', async () => {
      // 紙の配達担当は cloud 側（SCR-011 / SCR-017）で設定する運用に統一した
      // ので、同期は販売店を決めない。実在する ShopCd でもダミーを付ける。
      const { service } = buildService({
        existing: null,
        deltaRows: [
          buildUser({ paper_permission_dt: '2026-04-01', ShopCd: 'H001' }),
        ],
      });
      await service.run();

      expect(mockApplyChange.mock.calls[0][1].values.hanbaitenId).toBe(99);
    });

    it('should assign the dummy for a 併読 row with an unknown ShopCd', async () => {
      const { service } = buildService({
        existing: null,
        deltaRows: [
          buildUser({ paper_permission_dt: '2026-04-01', ShopCd: 'UNKNOWN' }),
        ],
      });
      await service.run();

      expect(mockApplyChange.mock.calls[0][1].values.hanbaitenId).toBe(99);
    });
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

  // 2026-07-29 実データ検証で判明した恒久 miss の再発防止。単純 max() だと失敗行より
  // 後ろの成功行が watermark を追い越し、失敗行が二度と差分に乗らなくなる。
  it('does NOT advance the watermark past a failed row (later successes must not overtake it)', async () => {
    const { service, stateRepo } = buildService({
      deltaRows: [
        buildUser({ id: 1001, chg_ts: '2026-04-01 00:00:00' }),
        buildUser({ id: 1002, chg_ts: '2026-04-02 00:00:00' }), // ここで失敗
        buildUser({ id: 1003, chg_ts: '2026-04-03 00:00:00' }), // 後続は成功
      ],
    });
    mockApplyChange
      .mockResolvedValueOnce({ dokusyaId: 1, insertedRirekiIds: [1] })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ dokusyaId: 3, insertedRirekiIds: [3] });

    await service.run();

    const patch = stateRepo.update.mock.calls[0][1];
    // 失敗した 1002 の手前（1001）で止まる → 次回実行が 1002 から読み直す。
    expect(String(patch.lastSourceId)).toBe('1001');
  });

  it('skips (not fails) a CREATE row that has no 購読開始日 at all', async () => {
    const { service } = buildService({
      deltaRows: [
        buildUser({
          id: 1001,
          activated_at: null,
          application_date: null,
          created_at: null,
        }),
      ],
    });
    await service.run();
    // master の NOT NULL 制約で必ず落ちる行なので applyChange を呼ばずに skip する。
    expect(mockApplyChange).not.toHaveBeenCalled();
  });

  it('falls back 購読開始日 to application_date when activated_at is empty', async () => {
    const { service } = buildService({
      deltaRows: [
        buildUser({
          id: 1001,
          activated_at: null,
          application_date: '2026-03-15 09:00:00',
          created_at: '2026-01-05 09:00:00',
        }),
      ],
    });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.values.shokiDokusyaKaishiDate).toBe('2026-03-15');
    expect(input.values.dokusyaKaishiDate).toBe('2026-03-15');
  });

  it('falls back 購読開始日 to created_at when activated_at と application_date が空', async () => {
    const { service } = buildService({
      deltaRows: [
        buildUser({
          id: 1001,
          activated_at: null,
          application_date: null,
          created_at: '2026-01-05 09:00:00',
        }),
      ],
    });
    await service.run();
    const input = mockApplyChange.mock.calls[0][1];
    expect(input.values.shokiDokusyaKaishiDate).toBe('2026-01-05');
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

  it('取込対象条件（collecting=1 or (treatment=1 and payment_id=6)）を常に適用する', async () => {
    // full-sync / 差分どちらの SELECT にも eligibility フィルタが入ること。
    const full = buildService({ fullSync: true });
    await full.service.run();
    const fullSql = full.denshibanQuery.mock.calls[0][0] as string;
    expect(fullSql).toContain('collecting = 1');
    expect(fullSql).toContain('treatment = 1 AND payment_id = 6');

    const delta = buildService({ deltaRows: [] });
    await delta.service.run();
    const deltaSql = delta.denshibanQuery.mock.calls[0][0] as string;
    expect(deltaSql).toContain('collecting = 1');
    expect(deltaSql).toContain('treatment = 1 AND payment_id = 6');
  });

  // ── ページング（差分が尽きるまで反復）─────────────────────────────────
  // 旧実装は 1 クエリ `LIMIT 50000` のみで、超過分は静かに切り捨てられていた。
  // full-sync は watermark を無視して chg_ts 昇順に読むため、50k 超のテーブルでは
  // 毎晩「最も古い 50k 件」だけを見て新しい行に永久に到達しなかった。
  function buildFullPage(startId: number, chgTs: string): DenshiUserRow[] {
    return Array.from({ length: PAGE_SIZE }, (_, i) =>
      buildUser({ id: startId + i, chg_ts: chgTs }),
    );
  }

  it('1 ページが満杯なら次ページを keyset カーソルで読み、尽きるまで反復する', async () => {
    const { service, denshibanQuery, stateRepo } = buildService();
    denshibanQuery.mockReset();
    denshibanQuery
      .mockResolvedValueOnce(buildFullPage(2000, '2026-04-01 00:00:00'))
      .mockResolvedValueOnce([buildUser({ id: 9001, chg_ts: '2026-04-02 00:00:00' })]);

    await service.run();

    expect(denshibanQuery).toHaveBeenCalledTimes(2);
    // 2 ページ目は前ページ末尾の (chg_ts, id) から続ける（OFFSET ではない）。
    expect(denshibanQuery.mock.calls[1][0] as string).toContain('AND id > ?');
    expect(denshibanQuery.mock.calls[1][1] as unknown[]).toContain(
      2000 + PAGE_SIZE - 1,
    );
    // 完走したので watermark は最終行まで進む。
    expect(String(stateRepo.update.mock.calls[0][1].lastSourceId)).toBe('9001');
  });

  it('full-sync でもページングする（1 ページ目は watermark 無し・2 ページ目はカーソル）', async () => {
    const { service, denshibanQuery } = buildService({ fullSync: true });
    denshibanQuery.mockReset();
    denshibanQuery
      .mockResolvedValueOnce(buildFullPage(3000, '2026-04-01 00:00:00'))
      .mockResolvedValueOnce([]);

    await service.run();

    expect(denshibanQuery).toHaveBeenCalledTimes(2);
    expect(denshibanQuery.mock.calls[0][0] as string).not.toContain('id > ?');
    expect(denshibanQuery.mock.calls[1][0] as string).toContain('AND id > ?');
  });

  // 差分条件は `id > wId OR chg_ts > wTs` の両方 strict。同じ chg_ts の途中で中断した
  // まま chg_ts だけ進めると、そのグループの未処理行は id でも chg_ts でも watermark
  // 以下になり二度と差分に乗らない（別グループの大きい id に負けるため）。
  it('同一 chg_ts グループの途中で中断したら watermark をそのグループの手前で止める', async () => {
    const { service, stateRepo } = buildService({
      deltaRows: [
        buildUser({ id: 9999, chg_ts: '2026-04-01 00:00:00' }), // 別グループ・大きい id
        buildUser({ id: 5, chg_ts: '2026-04-02 00:00:00' }), // 同グループ・成功
        buildUser({ id: 6, chg_ts: '2026-04-02 00:00:00' }), // 同グループ・失敗
      ],
    });
    mockApplyChange
      .mockResolvedValueOnce({ dokusyaId: 1, insertedRirekiIds: [1] })
      .mockResolvedValueOnce({ dokusyaId: 2, insertedRirekiIds: [2] })
      .mockRejectedValueOnce(new Error('boom'));

    await service.run();

    const patch = stateRepo.update.mock.calls[0][1];
    // 04-02 グループは丸ごと未コミット → 次回 `chg_ts > 04-01` で id=5,6 とも再取得される。
    expect(String(patch.lastSourceId)).toBe('9999');
    expect((patch.lastSourceUpdatedAt as Date).getTime()).toBe(
      new Date('2026-04-01 00:00:00').getTime(),
    );
  });

  // 顧客要望 2026-08 — 行単位ではなく「1 実行 1 行」の実行サマリを t_log へ残す。
  describe('run summary audit log', () => {
    it('should write exactly one t_log row per run with the counts', async () => {
      const { service, auditLog } = buildService({
        existing: null,
        deltaRows: [buildUser({ id: 1 })],
      });
      await service.run();

      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
      const arg = auditLog.logOperation.mock.calls[0][0];
      // operation = 「処理内容 (実行者名)」（顧客指定 2026-08）。t_log には
      // 実行者を入れる文字列列が無く account_id は bigint なのでここに載せる。
      expect(arg.operation).toBe('電子版読者同期 (SYSTEM_DENSHI_SYNC)');
      expect(arg.targetId).toBeNull();
      expect(arg.targetTable).toBe('t_dokusya');
      // 件数は afterValue に JSON で入る。
      expect(JSON.parse(arg.afterValue)).toEqual(
        expect.objectContaining({ read: expect.any(Number) }),
      );
      // 業務トランザクションとは別に書く（manager を渡さない）。
      expect(auditLog.logOperation.mock.calls[0][1]).toBeUndefined();
    });
  });
});
