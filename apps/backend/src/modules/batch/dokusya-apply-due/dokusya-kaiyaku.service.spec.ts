import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { ShiharaiHoho } from '@/common/enums/shiharai-hoho.enum';
import { TetsuzukiShurui } from '@/common/enums/tetsuzuki-shurui.enum';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { LogType, ResultStatus } from '@/common/enums';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  insertKaiyaku: jest.fn().mockResolvedValue(null),
}));

const mockInsertKaiyaku = insertKaiyaku as jest.Mock;

/** insertKaiyaku が「実際に解約行を追加した」ときの戻り値。 */
const kaiyakuDone = (jaId: number | null = 12) => ({
  rirekiNo: 3,
  master: {
    changedFields: ['tetsuzukiShurui'],
    before: { dokusyaId: 4, jaId, tetsuzukiShurui: 1 },
    after: { tetsuzukiShurui: 0 },
  },
});

describe('DokusyaKaiyakuService', () => {
  let service: DokusyaKaiyakuService;
  let db: { query: jest.Mock; transaction: jest.Mock };
  let managerMock: { findOne: jest.Mock };
  let audit: { logOperation: jest.Mock; logError: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsertKaiyaku.mockResolvedValue(null);
    managerMock = { findOne: jest.fn().mockResolvedValue(null) };
    db = {
      query: jest.fn().mockResolvedValue([]),
      // transaction(cb) は cb(manager) を実行してその結果(promise)を返す。
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    audit = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    service = new DokusyaKaiyakuService(
      db as unknown as DataSource,
      audit as unknown as AuditLogService,
    );
  });

  it('should extract 紙版(<=today) + 電子版・併読(<today) で全支払方法、already-cancelled のみ除外', async () => {
    await service.run();

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    // 電子版(2)/併読(3) は適用日=中止日+1日なので `中止日 < 当日`、紙版(1) は
    // `<= 当日`。DATE 列ゆえ `< 当日` は `<= 当日-1` と等価で、当日パラメータ1つで
    // 足りる。writer の DENSHI_SHUBETSU（電子版+併読）と対で保つ。
    expect(sql).toContain('dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3');
    expect(sql).toContain('dokusya_shubetsu IN ($2, $5) AND dokusya_chushi_date < $3');
    expect(sql).toContain('deleted_at IS NULL');
    // [skip-already-cancelled] 解約確定済み(tetsuzuki_shurui=解約)は抽出しない。
    // 解約後も dokusya_chushi_date は残り deleted_at も立たないため、この条件が
    // 無いと解約済みの購読者を毎晩ずっと抽出し続けてしまう（対象は増える一方）。
    expect(sql).toContain('tetsuzuki_shurui <> $4');
    expect(params[3]).toBe(TetsuzukiShurui.KAIYAKU);
    // [all-shubetsu] 顧客要件 2026-07 改訂で 併読(3) も解約確定の対象。第3システムから
    // 同期された中止日を確定しないと、向こうは解約済みなのに cloud だけ購読中のまま
    // 残る。本バッチは外部連携をしないので相手システムへの影響も無い。
    expect(params[0]).toBe(DokusyaShubetsu.PAPER);
    expect(params[1]).toBe(DokusyaShubetsu.DIGITAL);
    expect(params[4]).toBe(DokusyaShubetsu.BOTH);
    // [credit-card-included] 電子版クレカ決済者も解約確定の対象（顧客要件 2026-07
    // 改訂）。中止日は電子版から同期されて入るため、確定しないと電子版では解約済み
    // なのに cloud では購読中のまま残る。read-only ガードは画面操作の禁止であって
    // 解約確定を止める趣旨ではない。本バッチは外部連携をしないので課金にも無影響。
    expect(sql).not.toContain('shiharai_hoho');
    expect(params).not.toContain(ShiharaiHoho.CREDIT_CARD);
    // 日付パラメータは today($3) の1つだけ（JST の YYYY-MM-DD）。DB の
    // CURRENT_DATE ではなくアプリ側の todayIsoJst を渡す — 接続TZ に依存させない
    // ため（.claude/rules/nestjs.md §Timestamp policy）。
    expect(params[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // keyset カーソル($6)。第2段 recompute と同じくチャンク処理する。
    expect(sql).toContain('dokusya_id > $6');
    expect(sql).toContain('LIMIT');
    expect(params[5]).toBe(0); // 初回カーソル
    expect(params).toHaveLength(6);
  });

  it('should call insertKaiyaku in a transaction per due subscriber, asOf=today', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }, { dokusya_id: '7' }]);

    await service.run();

    expect(db.transaction).toHaveBeenCalledTimes(2);
    // actor は監査列に入るだけでなく、電子版同期由来の読者を判別するキーでも
    // ある（顧客要件 2026-08）。値そのものを固定して取り違えを検知する。
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(
      managerMock,
      4,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'SYSTEM_BATCH_NIGHTLY',
    );
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(
      managerMock,
      7,
      expect.any(String),
      'SYSTEM_BATCH_NIGHTLY',
    );
  });

  it('should continue with the rest when one subscriber fails (per-row isolation)', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '1' }, { dokusya_id: '2' }]);
    mockInsertKaiyaku.mockImplementation((_m: unknown, id: number) =>
      id === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(null),
    );

    // 段は止まらない（2件目も試行される）が、失敗は握り潰さず件数で返す。
    // 呼出し元(DokusyaApplyDueService)がこれを集計して ng>0 なら throw → exit 1。
    await expect(service.run()).resolves.toEqual({ ok: 1, ng: 1 });
    expect(mockInsertKaiyaku).toHaveBeenCalledTimes(2);
  });

  it('should resolve without calling insertKaiyaku when nothing is due', async () => {
    db.query.mockResolvedValue([]);

    await service.run();

    expect(mockInsertKaiyaku).not.toHaveBeenCalled();
  });

  // 顧客要件 2026-07: 本バッチは自社クラウド内で完結し、電子版へは push しない。
  // 以前は解約確定後に cancel を push していたが、抽出条件（master の中止日）は
  // 解約後も真のままで push が insertKaiyaku の結果と無関係だったため、解約済みの
  // 購読者へ毎晩 cancel を送り続けていた（回帰防止）。
  it('電子版の行でも外部連携（push）を一切行わない', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    managerMock.findOne.mockResolvedValue({
      dokusyaId: 4,
      dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
      dokusyaChushiDate: '2026-08-31',
    });

    await service.run();

    // master 参照そのものが不要になった（push 用の findOne が消えた）。
    expect(managerMock.findOne).not.toHaveBeenCalled();
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(
      managerMock,
      4,
      expect.any(String),
      'SYSTEM_BATCH_NIGHTLY',
    );
  });

  // 外部呼び出しが無くなったので、同日に2回流しても DB 書込みは insertKaiyaku の
  // 冪等ガード任せで副作用ゼロ。行あたり1回ずつ呼ばれるだけであること。
  it('同日に2回実行しても行あたり insertKaiyaku 1回・外部呼び出し無し', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    managerMock.findOne.mockResolvedValue({
      dokusyaId: 4,
      dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
      dokusyaChushiDate: '2026-08-31',
    });

    await service.run();
    await service.run();

    expect(mockInsertKaiyaku).toHaveBeenCalledTimes(2); // 2実行 × 1行
    expect(managerMock.findOne).not.toHaveBeenCalled();
  });

  // ── 監査ログ (t_log) ────────────────────────────────────────────
  // バッチによる解約は「なぜこの購読者が解約になったのか」を後から追う唯一の手段が
  // CloudWatch ログしか無かった（ログは期限で消える）。t_log に残す。

  it('should write an audit row in the SAME transaction when a cancellation was confirmed', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    mockInsertKaiyaku.mockResolvedValue(kaiyakuDone(12));

    await service.run();

    expect(audit.logOperation).toHaveBeenCalledTimes(1);
    const [params, manager] = audit.logOperation.mock.calls[0];
    // 業務書込みと同一 tx（manager を渡す）。ロールバック時は監査行も消える。
    expect(manager).toBe(managerMock);
    // 人ではなくスケジュール実行なので SYSTEM / account_id は null。
    expect(params.logType).toBe(LogType.SYSTEM);
    expect(params.accountId).toBeNull();
    expect(params.resultStatus).toBe(ResultStatus.SUCCESS);
    expect(params.targetTable).toBe('t_dokusya');
    expect(params.targetId).toBe(4);
    // ja_id は t_log 検索の DataScope に効く。落とすと NICHINO 以外から見えなくなる。
    expect(params.jaId).toBe(12);
  });

  it('should NOT write an audit row when insertKaiyaku skipped (idempotent no-op)', async () => {
    // 冪等スキップした夜にも書くと、同じ解約について毎晩 t_log が増えていく。
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    mockInsertKaiyaku.mockResolvedValue(null);

    await service.run();

    expect(audit.logOperation).not.toHaveBeenCalled();
  });

  it('should write an ERROR audit row OUTSIDE the transaction when a row fails', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    mockInsertKaiyaku.mockRejectedValue(new Error('boom'));

    await expect(service.run()).resolves.toEqual({ ok: 0, ng: 1 });

    // logError は manager を取らない = 独立接続。tx と一緒に巻き戻ると
    // 失敗の痕跡が残らないため。
    expect(audit.logError).toHaveBeenCalledTimes(1);
    expect(audit.logError.mock.calls[0][2]).toBeInstanceOf(Error);
    expect(audit.logOperation).not.toHaveBeenCalled();
  });
});

// t_log の DataScope は ja_id で効く。落とすと NICHINO 以外のロールから
// 「バッチで解約された」経緯が完全に見えなくなるため、before が無い経路でも
// 書き込んだ値からフォールバックする。
describe('DokusyaKaiyakuService — 監査行の ja_id フォールバック', () => {
  it('falls back to the written value when the pre-state has no ja_id', async () => {
    const managerMock = { findOne: jest.fn() };
    const db = {
      query: jest.fn().mockResolvedValue([{ dokusya_id: '4' }]),
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    const audit = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    mockInsertKaiyaku.mockResolvedValue({
      rirekiNo: 2,
      master: { changedFields: ['x'], before: null, after: { jaId: 77 } },
    });

    await new DokusyaKaiyakuService(
      db as unknown as DataSource,
      audit as unknown as AuditLogService,
    ).run();

    expect(audit.logOperation.mock.calls[0][0].jaId).toBe(77);
  });
});
