import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import {
  applyChange,
  insertScheduledKaiyaku,
  revokeScheduledKaiyaku,
} from '@/modules/dokusya/dokusya-history.writer';
import { DenshiShoninStatus } from '@/common/enums';
import { DokusyaSyncService, PAGE_SIZE } from './dokusya-sync.service';
import type { DenshiUserRow } from './dokusya-sync.mapper';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  applyChange: jest.fn(),
  insertScheduledKaiyaku: jest.fn(),
  revokeScheduledKaiyaku: jest.fn(),
}));
const mockApplyChange = applyChange as jest.Mock;
const mockInsertScheduledKaiyaku = insertScheduledKaiyaku as jest.Mock;
const mockRevokeScheduledKaiyaku = revokeScheduledKaiyaku as jest.Mock;

// #57986 — payment_end_ym（'YYYYMM'）のゲート判定用。実行時刻に依存せず常に
// 「現在年月以上」「現在年月より過去」を保証するための極端な値。
const FAR_FUTURE_PAYMENT_YM = '209912';
const STALE_PAYMENT_YM = '202001';

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
  existing?: {
    dokusyaId: number;
    denshiShoninStatus?: number | null;
    dokusyaChushiDate?: string | null;
    dokusyaShubetsu?: number;
  } | null;
  /**
   * email フォールバック照合（顧客要件 2026-08 追補）の QueryBuilder.getOne() が
   * 返す行。denshi_kaiin_id で見つからない場合のみ参照される。
   */
  emailMatch?: { dokusyaId: number; denshiKaiinId?: number | null } | null;
  /**
   * #57986: loadActiveKaiyakuRow（アクティブな解約予約/確定行の検出）の
   * QueryBuilder.getOne() が返す行。status=9 分岐で existing がある場合のみ参照。
   * 既定 null（＝予約なし）。
   */
  activeKaiyakuRow?: {
    dokusyaRirekiId: number;
    dokusyaChushiDate: string | null;
    kaiyakuFlg: boolean;
  } | null;
  lockLocked?: boolean;
  fullSync?: boolean;
}

function buildService(opts: Opts = {}) {
  const {
    deltaRows = [buildUser()],
    existing = null,
    emailMatch = null,
    activeKaiyakuRow = null,
    lockLocked = true,
    fullSync = false,
    hanbaitenRows = HANBAITEN_ROWS,
  } = opts;

  // email フォールバック照合（createQueryBuilder(Dokusya, 'd')）用。
  const emailQbMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(emailMatch),
  };
  // #57986: loadActiveKaiyakuRow（createQueryBuilder(DokusyaRireki, 'r')）用。
  const kaiyakuQbMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(activeKaiyakuRow),
  };
  const managerMock = {
    findOne: jest.fn().mockResolvedValue(existing),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    // alias で判別: email 照合は 'd'（Dokusya）、アクティブ予約検出は 'r'（DokusyaRireki）。
    createQueryBuilder: jest.fn((_entity: unknown, alias?: string) =>
      alias === 'r' ? kaiyakuQbMock : emailQbMock,
    ),
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
  return {
    service,
    mainDb,
    managerMock,
    qbMock: emailQbMock,
    kaiyakuQbMock,
    stateRepo,
    lockQr,
    denshibanDb,
    denshibanQuery,
    rireki,
    auditLog,
  };
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

  // 顧客要件 2026-08 追補: denshi_kaiin_id で見つからない場合の email フォールバック
  // 照合 — cloud 側で先に手動登録された電子版/併読読者（campaign 単価などで
  // denshi_kaiin_id が未設定のまま残っている行）との二重登録を防ぐ。
  describe('email フォールバック照合 (顧客要件 2026-08 追補)', () => {
    it('should UPDATE the email-matched row and backfill denshi_kaiin_id when not found by denshi_kaiin_id', async () => {
      const { service, managerMock, qbMock } = buildService({
        existing: null,
        emailMatch: { dokusyaId: 42, denshiKaiinId: null },
        deltaRows: [buildUser({ id: 1001, email: 'taro@example.com' })],
      });
      await service.run();

      expect(managerMock.createQueryBuilder).toHaveBeenCalled();
      const input = mockApplyChange.mock.calls[0][1];
      expect(input.mode).toBe('UPDATE');
      expect(input.dokusyaId).toBe(42);
      // 見つかった行へ denshi_kaiin_id を書き戻す（次回以降は denshi_kaiin_id で直接一致させる）。
      const backfill = managerMock.update.mock.calls.find(
        (c: unknown[]) =>
          (c[1] as Record<string, unknown>)?.dokusyaId === 42 &&
          (c[2] as Record<string, unknown>)?.denshiKaiinId === 1001,
      );
      expect(backfill).toBeDefined();
    });

    it('should scope the email match to 電子版/併読・未削除・denshi_kaiin_id IS NULL', async () => {
      const { service, qbMock } = buildService({
        existing: null,
        emailMatch: null,
        deltaRows: [buildUser({ email: 'taro@example.com' })],
      });
      await service.run();

      expect(qbMock.where).toHaveBeenCalledWith(
        expect.stringContaining('d.denshi_kaiin_id IS NULL'),
        expect.objectContaining({ email: 'taro@example.com' }),
      );
    });

    it('should CREATE (not update) when neither denshi_kaiin_id nor email match', async () => {
      const { service } = buildService({
        existing: null,
        emailMatch: null,
        deltaRows: [buildUser({ email: 'nobody@example.com' })],
      });
      await service.run();

      const input = mockApplyChange.mock.calls[0][1];
      expect(input.mode).toBe('CREATE');
    });

    it('should NOT attempt the email fallback when the user has no email', async () => {
      const { service, managerMock } = buildService({
        existing: null,
        emailMatch: { dokusyaId: 42, denshiKaiinId: null },
        deltaRows: [buildUser()], // buildUser() の既定値に email は無い
      });
      await service.run();

      expect(managerMock.createQueryBuilder).not.toHaveBeenCalled();
      const input = mockApplyChange.mock.calls[0][1];
      expect(input.mode).toBe('CREATE');
    });

    it('should NOT attempt the email fallback when already matched by denshi_kaiin_id', async () => {
      const { service, managerMock } = buildService({
        existing: { dokusyaId: 77 },
        deltaRows: [buildUser({ email: 'taro@example.com' })],
      });
      await service.run();

      expect(managerMock.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // #57986 — 解約(status=9)は「tetsuzuki_shurui=解約 + kaiyaku_flg=true」を
  // もうこの同期からは直接書かない。確定(Phase2)は既存の夜間バッチ
  // （dokusya-apply-due / insertKaiyaku）に一本化し、ここでは中止日を
  // Cloud へ反映する（予約 Phase1）だけに留める。master は論理削除しない。
  describe('CANCEL (status=9, #57986)', () => {
    it('payment_end_ym が現在年月より過去なら完全にスキップ（chushi_date・tetsuzuki・kaiyaku_flg に一切触れない）', async () => {
      const { service, managerMock } = buildService({
        existing: { dokusyaId: 88, dokusyaChushiDate: null },
        deltaRows: [buildUser({ status: 9, payment_end_ym: STALE_PAYMENT_YM })],
      });
      await service.run();

      expect(mockApplyChange).not.toHaveBeenCalled();
      expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
      expect(managerMock.softDelete).not.toHaveBeenCalled();
    });

    it('payment_end_ym が欠落/不正な形式ならスキップ（applyChange も insertScheduledKaiyaku も呼ばない）', async () => {
      const { service } = buildService({
        existing: { dokusyaId: 88, dokusyaChushiDate: null },
        deltaRows: [buildUser({ status: 9, payment_end_ym: null })],
      });
      await service.run();

      expect(mockApplyChange).not.toHaveBeenCalled();
      expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
    });

    // Case 0: Cloud にまだ全く存在しない読者が、初回同期の時点で既に解約済み
    // （Denshiban 側で入会〜解約が完結した履歴）。
    describe('Case 0 — Cloud にまだ存在しない（入会〜解約が完結した履歴）', () => {
      it('CREATE（1件目・tetsuzuki_shurui=新規で上書き）→ insertScheduledKaiyaku（2件目）の順で呼ぶ', async () => {
        const { service, managerMock } = buildService({
          existing: null,
          emailMatch: null,
          deltaRows: [
            buildUser({ status: 9, payment_end_ym: '202609', email: 'nobody@example.com' }),
          ],
        });
        await service.run();

        expect(mockApplyChange).toHaveBeenCalledTimes(1);
        const input = mockApplyChange.mock.calls[0][1];
        expect(input.mode).toBe('CREATE');
        // 解約由来の mapper 値(tetsuzuki=解約)ではなく、新規行として明示的に上書きする。
        expect(input.values.tetsuzukiShurui).toBe(1); // TetsuzukiShurui.SHINKI
        expect('kaiyakuFlg' in input.values).toBe(false);

        expect(mockInsertScheduledKaiyaku).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ dokusyaId: 500, chushiDate: '2026-09-30' }),
        );
        const applyChangeOrder = mockApplyChange.mock.invocationCallOrder[0];
        const insertKaiyakuOrder = mockInsertScheduledKaiyaku.mock.invocationCallOrder[0];
        expect(applyChangeOrder).toBeLessThan(insertKaiyakuOrder);

        // denshi_kaiin_id は履歴に無く master 専用列 → 作成後に直接 set する。
        const setKaiin = managerMock.update.mock.calls.find(
          (c: unknown[]) =>
            (c[2] as Record<string, unknown>)?.denshiKaiinId === 1001,
        );
        expect(setKaiin).toBeDefined();
      });

      it('counts.created に計上する（cancelled ではない）', async () => {
        const { service, auditLog } = buildService({
          existing: null,
          emailMatch: null,
          deltaRows: [
            buildUser({
              status: 9,
              payment_end_ym: FAR_FUTURE_PAYMENT_YM,
              email: 'nobody@example.com',
            }),
          ],
        });
        await service.run();

        const summary = JSON.parse(auditLog.logOperation.mock.calls[0][0].afterValue);
        expect(summary.created).toBe(1);
        expect(summary.cancelled).toBe(0);
      });

      it('購読開始日が全く取れない場合は CREATE も insertScheduledKaiyaku も呼ばず skip する', async () => {
        const { service } = buildService({
          existing: null,
          emailMatch: null,
          deltaRows: [
            buildUser({
              status: 9,
              payment_end_ym: FAR_FUTURE_PAYMENT_YM,
              email: 'nobody@example.com',
              activated_at: null,
            }),
          ],
        });
        await service.run();

        expect(mockApplyChange).not.toHaveBeenCalled();
        expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
      });

      it('payment_end_ym が現在年月より過去なら create すら試みず skip する', async () => {
        const { service } = buildService({
          existing: null,
          emailMatch: null,
          deltaRows: [
            buildUser({ status: 9, payment_end_ym: STALE_PAYMENT_YM, email: 'nobody@example.com' }),
          ],
        });
        await service.run();

        expect(mockApplyChange).not.toHaveBeenCalled();
        expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
      });
    });

    // Case 2: Cloud にまだ中止日なし（Denshiban 側の履歴的な解約に追従）。
    describe('Case 2 — Cloud に中止日なし（初回の解約反映）', () => {
      it('中止日を payment_end_ym の末日として算出し insertScheduledKaiyaku へ渡す', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: null, dokusyaShubetsu: 2 },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202609' })],
        });
        await service.run();

        expect(mockInsertScheduledKaiyaku).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ dokusyaId: 88, chushiDate: '2026-09-30', shubetsu: 2 }),
        );
      });

      it('他の情報変更を先に通常の UPDATE 行として反映する（applyChange → insertScheduledKaiyaku の順）', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: null, dokusyaShubetsu: 2 },
          deltaRows: [buildUser({ status: 9, payment_end_ym: FAR_FUTURE_PAYMENT_YM })],
        });
        await service.run();

        expect(mockApplyChange).toHaveBeenCalledTimes(1);
        const input = mockApplyChange.mock.calls[0][1];
        expect(input.mode).toBe('UPDATE');
        expect(input.dokusyaId).toBe(88);
        const applyChangeOrder = mockApplyChange.mock.invocationCallOrder[0];
        const insertKaiyakuOrder = mockInsertScheduledKaiyaku.mock.invocationCallOrder[0];
        expect(applyChangeOrder).toBeLessThan(insertKaiyakuOrder);
      });

      it('applyChange へ渡す values に tetsuzuki_shurui / kaiyaku_flg を含めない（前回値を carry-forward させる）', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: null, dokusyaShubetsu: 2 },
          deltaRows: [buildUser({ status: 9, payment_end_ym: FAR_FUTURE_PAYMENT_YM })],
        });
        await service.run();

        const input = mockApplyChange.mock.calls[0][1];
        expect('tetsuzukiShurui' in input.values).toBe(false);
        expect('kaiyakuFlg' in input.values).toBe(false);
      });

      it('does NOT soft-delete master', async () => {
        const { service, managerMock } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: null, dokusyaShubetsu: 2 },
          deltaRows: [buildUser({ status: 9, payment_end_ym: FAR_FUTURE_PAYMENT_YM })],
        });
        await service.run();

        expect(managerMock.softDelete).not.toHaveBeenCalled();
      });
    });

    // Case 1: Cloud に既に予約行あり（アクティブな解約予約 = loadActiveKaiyakuRow で検出）。
    describe('Case 1a — 予約あり・中止日は変わらない（他の情報だけ更新）', () => {
      it('applyChange のみを呼び、revokeScheduledKaiyaku / insertScheduledKaiyaku は呼ばない', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          // payment_end_ym='202609' → chushiDate 算出結果は '2026-09-30'（既存予約と同じ）。
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202609' })],
        });
        await service.run();

        expect(mockApplyChange).toHaveBeenCalledTimes(1);
        expect(mockRevokeScheduledKaiyaku).not.toHaveBeenCalled();
        expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
      });

      it('applyChange へ渡す values に tetsuzuki_shurui / kaiyaku_flg / dokusya_chushi_date を含めない', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202609' })],
        });
        await service.run();

        const input = mockApplyChange.mock.calls[0][1];
        expect('tetsuzukiShurui' in input.values).toBe(false);
        expect('kaiyakuFlg' in input.values).toBe(false);
        expect('dokusyaChushiDate' in input.values).toBe(false);
      });

      // [count-once] DENSHIBAN_FULL_SYNC=true の全件リコンサイルは毎回同じ行を
      // 読み直すため、既に反映済みで差分が無ければ applyChange は
      // insertedRirekiIds=[] を返す。この場合は cancelled を再カウントせず
      // unchanged に計上する（通常 UPDATE 分岐と同じ基準）。
      it('applyChange が no-op（差分なし）のとき unchanged に計上する', async () => {
        mockApplyChange.mockResolvedValueOnce({
          dokusyaId: 88,
          insertedRirekiIds: [],
          before: null,
          after: {},
          denshiSync: false,
        });
        const { service, auditLog } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202609' })],
        });
        await service.run();

        const summary = JSON.parse(auditLog.logOperation.mock.calls[0][0].afterValue);
        expect(summary.cancelled).toBe(0);
        expect(summary.unchanged).toBe(1);
      });

      it('applyChange が実際に行を挿入した（他の情報が変わった）とき cancelled に計上する', async () => {
        mockApplyChange.mockResolvedValueOnce({
          dokusyaId: 88,
          insertedRirekiIds: [901],
          before: null,
          after: {},
          denshiSync: false,
        });
        const { service, auditLog } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202609' })],
        });
        await service.run();

        const summary = JSON.parse(auditLog.logOperation.mock.calls[0][0].afterValue);
        expect(summary.cancelled).toBe(1);
        expect(summary.unchanged).toBe(0);
      });
    });

    // #57986 ユーザー指摘: 既に電子版向けに中止日を予約済みの状態から、後で
    // その中止日が変更された場合は「単純な UPDATE で上書き」ではなく、
    // 「旧予約行を取消(赤伝)してから新しい予約行を作り直す」（DokusyaService.stop
    // の変更経路と同じパターン）。
    describe('Case 1b — 予約あり・中止日が変わった（旧予約を取消→新予約を作成）', () => {
      it('revokeScheduledKaiyaku（旧予約）→ applyChange（他の情報）→ insertScheduledKaiyaku（新予約）の順で呼ぶ', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          // 電子版側で支払済み月が1ヶ月延びた（中止日が繰り下がる）ケース。
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202610' })],
        });
        await service.run();

        expect(mockRevokeScheduledKaiyaku).toHaveBeenCalledWith(
          expect.anything(),
          88,
          expect.objectContaining({ dokusyaRirekiId: 501 }),
          expect.any(String),
          expect.any(String),
        );
        expect(mockApplyChange).toHaveBeenCalledTimes(1);
        expect(mockInsertScheduledKaiyaku).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ dokusyaId: 88, chushiDate: '2026-10-31', shubetsu: 2 }),
        );

        const revokeOrder = mockRevokeScheduledKaiyaku.mock.invocationCallOrder[0];
        const applyChangeOrder = mockApplyChange.mock.invocationCallOrder[0];
        const insertKaiyakuOrder = mockInsertScheduledKaiyaku.mock.invocationCallOrder[0];
        expect(revokeOrder).toBeLessThan(applyChangeOrder);
        expect(applyChangeOrder).toBeLessThan(insertKaiyakuOrder);
      });

      it('applyChange の values に dokusya_chushi_date を直接含めない（新しい中止日は insertScheduledKaiyaku 側で作る）', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202610' })],
        });
        await service.run();

        const input = mockApplyChange.mock.calls[0][1];
        expect('dokusyaChushiDate' in input.values).toBe(false);
      });

      it('counts.cancelled に計上する', async () => {
        const { service, auditLog } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: false },
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202610' })],
        });
        await service.run();

        const summary = JSON.parse(auditLog.logOperation.mock.calls[0][0].afterValue);
        expect(summary.cancelled).toBe(1);
      });
    });

    // 既に夜間バッチが解約を確定させた後（kaiyaku_flg=true）は revoke できない
    // （revokeScheduledKaiyaku 自体が対象行の kaiyakuFlg を見て弾く仕様）。
    // 中止日が変わっても予約をいじらず、他の情報だけ更新する。
    describe('Case 1c — 既に確定済み（kaiyaku_flg=true）— revoke しない', () => {
      it('revokeScheduledKaiyaku / insertScheduledKaiyaku を呼ばず、applyChange のみで他の情報を更新する', async () => {
        const { service } = buildService({
          existing: { dokusyaId: 88, dokusyaChushiDate: '2026-09-30', dokusyaShubetsu: 2 },
          activeKaiyakuRow: { dokusyaRirekiId: 501, dokusyaChushiDate: '2026-09-30', kaiyakuFlg: true },
          // 中止日が違う値で来ても、確定済みなら revoke しない。
          deltaRows: [buildUser({ status: 9, payment_end_ym: '202610' })],
        });
        await service.run();

        expect(mockRevokeScheduledKaiyaku).not.toHaveBeenCalled();
        expect(mockInsertScheduledKaiyaku).not.toHaveBeenCalled();
        expect(mockApplyChange).toHaveBeenCalledTimes(1);
      });
    });
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
      // 紙の配達担当は cloud 側（ACSMS-SCR-011 / ACSMS-SCR-017）で設定する運用に統一した
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

  // #57986 — 実削除済み（deleted_at 有）の行は取り込み対象外。full-sync / 差分
  // どちらの SELECT にも常に入ること。
  it('deleted_at IS NULL を常に適用する（実削除済みの行は取り込まない）', async () => {
    const full = buildService({ fullSync: true });
    await full.service.run();
    const fullSql = full.denshibanQuery.mock.calls[0][0] as string;
    expect(fullSql).toContain('deleted_at IS NULL');

    const delta = buildService({ deltaRows: [] });
    await delta.service.run();
    const deltaSql = delta.denshibanQuery.mock.calls[0][0] as string;
    expect(deltaSql).toContain('deleted_at IS NULL');
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
