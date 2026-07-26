import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LogCleanupService } from './log-cleanup.service';

describe('LogCleanupService', () => {
  let service: LogCleanupService;
  let db: { query: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    db = { query: jest.fn() };
    config = { get: jest.fn() };
    // 単体は plain new（Nest ライフサイクル不要）。
    service = new LogCleanupService(
      db as unknown as DataSource,
      config as unknown as ConfigService,
    );
  });

  it('should DELETE from t_log and t_login_log using the timestamp column + make_interval', async () => {
    config.get.mockReturnValue(5);
    // タプル [rows, rowCount]; rowCount < CHUNK_SIZE → 1テーブル1回で終了。
    db.query.mockResolvedValue([[], 2]);

    await service.run();

    expect(db.query).toHaveBeenCalledTimes(2);
    const sqls = db.query.mock.calls.map((c) => c[0] as string);

    const logSql = sqls.find((s) => s.includes('DELETE FROM t_log'));
    expect(logSql).toContain('log_datetime < NOW() - make_interval(years => $1)');

    const loginSql = sqls.find((s) => s.includes('DELETE FROM t_login_log'));
    expect(loginSql).toContain('login_datetime < NOW() - make_interval(years => $1)');
  });

  it('should count deletions from tuple[1] (rowCount), not from array length', async () => {
    config.get.mockReturnValue(5);
    // 0件削除でも DataSource は [[], 0] を返す。length(=2) で数えないこと。
    db.query.mockResolvedValue([[], 0]);

    // 冪等: 0件なら1テーブル1回で終了（誤って length=2 を full-chunk 扱いしない）。
    await service.run();
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('should bind the retention years from config as the sole $1 parameter', async () => {
    config.get.mockReturnValue(7);
    db.query.mockResolvedValue([[], 0]);

    await service.run();

    expect(config.get).toHaveBeenCalledWith('app.logRetentionYears');
    for (const call of db.query.mock.calls) {
      expect(call[1]).toEqual([7]);
    }
  });

  it('should default to 5 years when config returns undefined', async () => {
    config.get.mockReturnValue(undefined);
    db.query.mockResolvedValue([[], 0]);

    await service.run();

    for (const call of db.query.mock.calls) {
      expect(call[1]).toEqual([5]);
    }
  });

  it('should loop chunked deletes until a chunk affects fewer than CHUNK_SIZE rows', async () => {
    config.get.mockReturnValue(5);
    // t_log: 1回目フルチャンク(5000) → 2回目 端数で終了。t_login_log: 1回で終了。
    db.query
      .mockResolvedValueOnce([[], 5000])
      .mockResolvedValueOnce([[], 1])
      .mockResolvedValueOnce([[], 0]);

    await service.run();

    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it('should be idempotent — resolve without throwing when nothing matches', async () => {
    config.get.mockReturnValue(5);
    db.query.mockResolvedValue([[], 0]);

    await expect(service.run()).resolves.toBeUndefined();
    // 各テーブル1回ずつ（0件でも1回は問い合わせる）。
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
