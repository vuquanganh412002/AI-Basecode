import { DataSource } from 'typeorm';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { LogType, ResultStatus } from '@/common/enums';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

/** 業務値が動かなかった再計算（ポインタだけ前進 or 完全同一）。 */
const NO_BUSINESS_CHANGE = { changedFields: [], before: null, after: {} };
/** 業務値が動いた再計算。 */
const businessChanged = (jaId: number | null = 12) => ({
  changedFields: ['dokusyaBusu'],
  before: { dokusyaId: 4, jaId, dokusyaBusu: 1 },
  after: { dokusyaBusu: 6 },
});

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  recomputeMaster: jest.fn(),
}));

const mockRecomputeMaster = recomputeMaster as jest.Mock;

describe('DokusyaRecomputeService', () => {
  let service: DokusyaRecomputeService;
  let db: { query: jest.Mock; transaction: jest.Mock };
  let managerMock: { findOne: jest.Mock };
  let audit: { logOperation: jest.Mock; logError: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecomputeMaster.mockResolvedValue(NO_BUSINESS_CHANGE);
    managerMock = { findOne: jest.fn().mockResolvedValue(null) };
    // 外部連携を廃止したので run() が投げる SELECT は chunk のみ（顧客要件 2026-07）。
    db = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    audit = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    service = new DokusyaRecomputeService(
      db as unknown as DataSource,
      audit as unknown as AuditLogService,
    );
  });

  it('should recompute every non-deleted subscriber in a transaction, asOf=today', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '4' }, { dokusya_id: '9' }]);

    await service.run();

    const [sql] = db.query.mock.calls[0] as [string];
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('dokusya_id > $1');
    // 情報変更反映は履歴行を作らず master を書き換えるだけなので、実行者は
    // t_dokusya.updated_by にしか残らない。actor を渡さないと登録時の値のままに
    // なるため、値を固定して検証する（顧客要件 2026-08）。
    expect(mockRecomputeMaster).toHaveBeenCalledWith(
      managerMock,
      4,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'SYSTEM_BATCH_NIGHTLY',
    );
    expect(mockRecomputeMaster).toHaveBeenCalledWith(
      managerMock,
      9,
      expect.any(String),
      'SYSTEM_BATCH_NIGHTLY',
    );
  });

  it('should page with a keyset cursor when a full chunk (500) is returned', async () => {
    const fullChunk = Array.from({ length: 500 }, (_, i) => ({
      dokusya_id: String(i + 1),
    }));
    db.query
      .mockResolvedValueOnce(fullChunk)
      .mockResolvedValueOnce([{ dokusya_id: '501' }]);

    await service.run();

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(mockRecomputeMaster).toHaveBeenCalledTimes(501);
    // 2番目の chunk のカーソル = 1番目末尾の id(500)。$2 は当日(JST)。
    const [cursor, today] = db.query.mock.calls[1][1] as [number, string];
    expect(cursor).toBe(500);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should continue with the rest when one subscriber fails (per-row isolation)', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '1' }, { dokusya_id: '2' }]);
    mockRecomputeMaster.mockImplementation((_m: unknown, id: number) =>
      id === 1
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(NO_BUSINESS_CHANGE),
    );

    // 段は止まらないが、失敗は握り潰さず件数で返す（呼出し元が exit code に反映）。
    await expect(service.run()).resolves.toEqual({ ok: 1, ng: 1 });
    expect(mockRecomputeMaster).toHaveBeenCalledTimes(2);
  });

  it('should resolve without calling recomputeMaster when there are no subscribers', async () => {
    db.query.mockResolvedValue([]);

    await service.run();

    expect(mockRecomputeMaster).not.toHaveBeenCalled();
  });

  // 顧客要件 2026-07: 本バッチは自社クラウド内で完結し、電子版へは push しない。
  // 以前は「本日 effective 化する予約情報変更」の候補集合を先に SELECT して
  // recompute 後に update を push していたが、その候補は当日中なら何度でも同じ
  // ものが返るため、同日に2回流すと同じ update を2回送っていた（回帰防止）。
  it('外部連携（push）を行わず、push 用の master 参照もしない', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '9' }]);

    await service.run();

    // 投げる SELECT は chunk のみ（push 対象の候補抽出クエリは廃止済み）。
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(managerMock.findOne).not.toHaveBeenCalled();
  });

  // [stale-only] master が古い購読者だけを抽出する（顧客要件 2026-07 / 性能）。
  // master の (joho, rireki_no) は有効行からコピーした「今指している位置」なので、
  // 「その位置より後ろに到来済みの行があるか」で古さを判定できる。
  // 不等号が `<= $2`（`= $2` ではない）なのが自己修復のキモ — バッチが1日落ちても
  // 翌晩そのまま拾い直せる。
  it('should extract only subscribers whose master is stale (keyset + due-row EXISTS)', async () => {
    db.query.mockResolvedValueOnce([]);

    await service.run();

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('d.dokusya_id > $1');
    expect(sql).toContain('EXISTS');
    expect(sql).toContain('r.joho_henko_tekiyo_date <= $2');
    // master が指す位置より後ろの行があるか（タプル比較）。
    expect(sql).toContain(
      '(r.joho_henko_tekiyo_date, r.rireki_no)',
    );
    expect(sql).toContain('(d.joho_henko_tekiyo_date, d.rireki_no)');
    // master.joho が NULL の行はタプル比較が NULL になり EXISTS が偽になるため、
    // 別枝で必ず対象に含める（無いと永久に再計算されない）。
    expect(sql).toContain('d.joho_henko_tekiyo_date IS NULL');
    expect(params[0]).toBe(0); // 初回カーソル
    expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // 当日(JST)
  });

  // ── 監査ログ (t_log) ────────────────────────────────────────────

  it('should write an audit row in the SAME transaction when business values changed', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '4' }]);
    mockRecomputeMaster.mockResolvedValue(businessChanged(12));

    await service.run();

    expect(audit.logOperation).toHaveBeenCalledTimes(1);
    const [params, manager] = audit.logOperation.mock.calls[0];
    expect(manager).toBe(managerMock); // 業務書込みと同一 tx
    expect(params.logType).toBe(LogType.SYSTEM);
    expect(params.accountId).toBeNull();
    expect(params.resultStatus).toBe(ResultStatus.SUCCESS);
    expect(params.targetTable).toBe('t_dokusya');
    expect(params.targetId).toBe(4);
    expect(params.jaId).toBe(12); // t_log 検索の DataScope
  });

  it('should NOT write an audit row when only the pointer advanced', async () => {
    // ポインタ2列の前進は業務変更ではない。ここで書くと、中身が変わっていない
    // 購読者ぶんの t_log が毎晩積み上がる — updated_at を動かさないのと同じ基準。
    db.query.mockResolvedValueOnce([{ dokusya_id: '4' }]);
    mockRecomputeMaster.mockResolvedValue(NO_BUSINESS_CHANGE);

    await service.run();

    expect(audit.logOperation).not.toHaveBeenCalled();
  });

  it('should write an ERROR audit row OUTSIDE the transaction when a row fails', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '4' }]);
    mockRecomputeMaster.mockRejectedValue(new Error('boom'));

    await expect(service.run()).resolves.toEqual({ ok: 0, ng: 1 });

    expect(audit.logError).toHaveBeenCalledTimes(1);
    expect(audit.logError.mock.calls[0][2]).toBeInstanceOf(Error);
    expect(audit.logOperation).not.toHaveBeenCalled();
  });
});
