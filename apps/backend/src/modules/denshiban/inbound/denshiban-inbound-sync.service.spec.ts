import type { DataSource, EntityManager } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import type { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { CodeService } from '@/modules/code/code.service';

import {
  buildDokusyaFromDenshiban,
  type DenshibanUserRow,
  type DokusyaDraft,
  type InboundBuildCtx,
} from '../mapper/denshiban-dokusya.builder';

// applyChange is a free function — mock the whole writer module.
jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  applyChange: jest.fn(),
}));
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import type { DenshibanDokusyaAssembler } from './denshiban-dokusya.assembler';
import type { DenshibanInboundFetcher } from './denshiban-inbound.fetcher';
import { DenshibanInboundSyncService } from './denshiban-inbound-sync.service';

const mockedApplyChange = applyChange as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CTX: InboundBuildCtx = {
  jaId: 1,
  kanriShitenId: 10,
  hanbaitenId: 100,
  shiharaiHoho: 1,
  rirekiNo: 1,
  syncDate: '2026-07-19',
};

function userRow(o: Partial<DenshibanUserRow> = {}): DenshibanUserRow {
  return {
    id: '5001',
    first_name: '山田',
    last_name: '太郎',
    first_kana: 'ﾔﾏﾀﾞ',
    last_kana: 'ﾀﾛｳ',
    zip1: '123',
    zip2: '4567',
    pref_id: '13',
    addr: '千代田区',
    city: '1-1',
    building: '',
    tel1: '0312345678',
    tel2: '',
    email: 'taro@example.jp',
    melmaga: '1',
    birthyear: '1990',
    sex: '1',
    member_type: '2',
    status: '1',
    approval: '1',
    payment_cycle: '12',
    payment_start_ym: '202607',
    profession: '0',
    others_profession: null,
    products: '0',
    others_products: null,
    remarks1: '',
    remarks2: '',
    remarks3: '',
    remarks4: '',
    remarks5: '',
    paper_permission_dt: null,
    paper_zip: null,
    paper_pref_id: null,
    paper_addr: null,
    paper_city: null,
    paper_building: null,
    activated_at: '2026-07-01',
    deleted_at: null,
    ...o,
  };
}

function draftOf(o: Partial<DenshibanUserRow> = {}): DokusyaDraft {
  return buildDokusyaFromDenshiban(userRow(o), CTX);
}

/** A cloud row = a draft's comparable state + the master-only ids. */
function existingFrom(draft: DokusyaDraft, dokusyaId = 42): Dokusya {
  return {
    ...draft,
    dokusyaId,
    jaId: 1,
    rirekiNo: 3,
    denshiKaiinId: draft.denshiKaiinId,
  } as unknown as Dokusya;
}

// ── Harness ───────────────────────────────────────────────────────────────────

interface Harness {
  service: DenshibanInboundSyncService;
  fetcher: { fetchCollectingRows: jest.Mock };
  assembler: { assemble: jest.Mock };
  auditLog: { logCreate: jest.Mock; logUpdate: jest.Mock };
  codeService: { has: jest.Mock };
  manager: { findOne: jest.Mock; update: jest.Mock };
}

function setup(): Harness {
  const manager = {
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
      cb(manager as unknown as EntityManager),
    ),
  } as unknown as DataSource;
  const fetcher = { fetchCollectingRows: jest.fn().mockResolvedValue([]) };
  const assembler = { assemble: jest.fn() };
  const auditLog = { logCreate: jest.fn(), logUpdate: jest.fn() };
  const codeService = { has: jest.fn().mockReturnValue(true) };

  const service = new DenshibanInboundSyncService(
    dataSource,
    fetcher as unknown as DenshibanInboundFetcher,
    assembler as unknown as DenshibanDokusyaAssembler,
    auditLog as unknown as AuditLogService,
    codeService as unknown as CodeService,
  );
  return { service, fetcher, assembler, auditLog, codeService, manager };
}

beforeEach(() => {
  mockedApplyChange.mockReset();
  mockedApplyChange.mockResolvedValue({
    dokusyaId: 42,
    insertedRirekiIds: [1],
    before: null,
    after: { dokusyaId: 42 },
    denshiSync: false,
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('DenshibanInboundSyncService — CREATE', () => {
  it('未マッチは applyChange(CREATE) + denshi_kaiin_id 別途スタンプ + audit', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow()]);
    h.assembler.assemble.mockResolvedValue(draftOf());
    h.manager.findOne.mockResolvedValue(null);

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ fetched: 1, created: 1, updated: 0, skipped: 0, failed: 0 });

    const input = mockedApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('CREATE');
    expect(input.source).toBe('BATCH');
    expect(input.johoDate).toBe('2026-07-19');
    // 会員ID / rireki_no は values に載せない（master-only / DB default）。
    expect('denshiKaiinId' in input.values).toBe(false);
    expect('rirekiNo' in input.values).toBe(false);
    expect(input.values.jaId).toBe(1);

    // 会員IDは master に別 update でスタンプ。
    expect(h.manager.update).toHaveBeenCalledWith(
      Dokusya,
      { dokusyaId: 42 },
      { denshiKaiinId: 5001 },
    );
    expect(h.auditLog.logCreate).toHaveBeenCalledTimes(1);
  });

  it('shiharai_hoho が m_code 未登録なら create せず失敗カウント', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow()]);
    h.assembler.assemble.mockResolvedValue(draftOf());
    h.codeService.has.mockReturnValue(false);

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ created: 0, failed: 1 });
    expect(mockedApplyChange).not.toHaveBeenCalled();
  });

  it('会員ID(id) が空なら取り込まず失敗カウント', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow({ id: '' })]);
    h.assembler.assemble.mockResolvedValue(draftOf({ id: '' }));

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ created: 0, failed: 1 });
    expect(mockedApplyChange).not.toHaveBeenCalled();
  });
});

// ── UPDATE / SKIP ─────────────────────────────────────────────────────────────

describe('DenshibanInboundSyncService — UPDATE / SKIP', () => {
  it('差分ありは applyChange(UPDATE) に変更列だけ渡す + audit', async () => {
    const h = setup();
    const draft = draftOf({ email: 'new@example.jp' });
    const existing = existingFrom(draftOf({ email: 'old@example.jp' }));
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow({ email: 'new@example.jp' })]);
    h.assembler.assemble.mockResolvedValue(draft);
    h.manager.findOne.mockResolvedValue(existing);
    mockedApplyChange.mockResolvedValue({
      dokusyaId: 42,
      insertedRirekiIds: [4],
      before: { dokusyaId: 42 },
      after: { dokusyaId: 42 },
      denshiSync: false,
    });

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ updated: 1, created: 0, skipped: 0, failed: 0 });
    const input = mockedApplyChange.mock.calls[0][1];
    expect(input.mode).toBe('UPDATE');
    expect(input.dokusyaId).toBe(42);
    expect(input.values).toEqual({ email: 'new@example.jp' }); // 変更列のみ
    expect(h.auditLog.logUpdate).toHaveBeenCalledTimes(1);
  });

  it('全一致は skip（applyChange 呼ばない）', async () => {
    const h = setup();
    const draft = draftOf();
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow()]);
    h.assembler.assemble.mockResolvedValue(draft);
    h.manager.findOne.mockResolvedValue(existingFrom(draft));

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ skipped: 1, updated: 0, created: 0 });
    expect(mockedApplyChange).not.toHaveBeenCalled();
  });
});

// ── Row isolation / summary ────────────────────────────────────────────────────

describe('DenshibanInboundSyncService — 行単位の隔離', () => {
  it('1行が失敗しても他行は処理継続（per-row tx）', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockResolvedValue([userRow({ id: '1' }), userRow({ id: '2' })]);
    h.assembler.assemble
      .mockRejectedValueOnce(new Error('assemble failed')) // 1行目失敗
      .mockResolvedValueOnce(draftOf({ id: '2' })); // 2行目成功
    h.manager.findOne.mockResolvedValue(null);

    const summary = await h.service.syncAll();

    expect(summary).toMatchObject({ fetched: 2, created: 1, failed: 1 });
  });

  it('fetch 失敗は伝播（バッチ全体を失敗させる）', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockRejectedValue(new Error('denshiban disabled'));

    await expect(h.service.syncAll()).rejects.toThrow(/disabled/);
  });

  it('空フェッチは summary 全ゼロ', async () => {
    const h = setup();
    h.fetcher.fetchCollectingRows.mockResolvedValue([]);

    const summary = await h.service.syncAll();

    expect(summary).toEqual({ fetched: 0, created: 0, updated: 0, skipped: 0, failed: 0 });
  });
});
