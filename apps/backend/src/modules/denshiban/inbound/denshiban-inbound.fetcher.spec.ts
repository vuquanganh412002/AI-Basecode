import type { DataSource } from 'typeorm';

import type { DenshibanDbService } from '../denshiban-db.service';

import { DenshibanInboundFetcher, __TEST__ } from './denshiban-inbound.fetcher';

const { FETCH_COLLECTING_SQL, normalizeRow } = __TEST__;

// ── fetchCollectingRows ───────────────────────────────────────────────────────

describe('DenshibanInboundFetcher.fetchCollectingRows', () => {
  it('withConnection 経由で users を読み、DenshibanInboundRow に正規化', async () => {
    const query = jest.fn().mockResolvedValue([
      { id: 5001, JACd: '1135001999', payment_id: 6, birthyear: 1990 },
    ]);
    const denshibanDb = {
      withConnection: jest.fn((fn: (ds: DataSource) => Promise<unknown>) =>
        fn({ query } as unknown as DataSource),
      ),
    } as unknown as DenshibanDbService;

    const rows = await new DenshibanInboundFetcher(denshibanDb).fetchCollectingRows();

    // 数値列（id/payment_id/birthyear）は文字列化されている。
    expect(rows[0].id).toBe('5001');
    expect(rows[0].payment_id).toBe('6');
    expect(rows[0].birthyear).toBe('1990');
    expect(rows[0].JACd).toBe('1135001999');
  });

  it('WHERE collecting = \'1\' または treatment=1 かつ payment_id=6、DATE_FORMAT で日付を YYYY-MM-DD 化する SQL を投げる', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const denshibanDb = {
      withConnection: jest.fn((fn: (ds: DataSource) => Promise<unknown>) =>
        fn({ query } as unknown as DataSource),
      ),
    } as unknown as DenshibanDbService;

    await new DenshibanInboundFetcher(denshibanDb).fetchCollectingRows();

    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("collecting = '1'");
    expect(sql).toContain('treatment = 1 AND payment_id = 6');
    expect(sql).toContain("DATE_FORMAT(activated_at, '%Y-%m-%d')");
    expect(sql).toContain("DATE_FORMAT(deleted_at, '%Y-%m-%d')");
    expect(sql).toContain('JACd');
    expect(sql).toContain('ShopCd');
    expect(sql).toContain('payment_id');
    expect(sql).toContain('FROM users');
  });

  it('キャンペーン会員（campagna_flg = 1）を除外する SQL を投げる', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const denshibanDb = {
      withConnection: jest.fn((fn: (ds: DataSource) => Promise<unknown>) =>
        fn({ query } as unknown as DataSource),
      ),
    } as unknown as DenshibanDbService;

    await new DenshibanInboundFetcher(denshibanDb).fetchCollectingRows();

    const sql = query.mock.calls[0][0] as string;
    // 列名は denshiban 側の綴り `campagna_flg`（cloud の m_tanka.campaign_flg とは別物）。
    expect(sql).toContain('COALESCE(campagna_flg, 0) <> 1');
    // NULL 落ちを防ぐため素の `campagna_flg <> 1` は使わない。
    expect(sql).not.toMatch(/[^)]\s*campagna_flg\s*<>/);
    // 除外は AND で結合し、collecting / 口座振替 の OR 全体に掛かること。
    expect(sql).toMatch(/COALESCE\(campagna_flg, 0\) <> 1\s+AND\s+\(/);
  });

  it('subscribe_flg（本紙購読フラグ）を SELECT し、文字列として正規化する', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([{ id: 5001, subscribe_flg: 1 }]);
    const denshibanDb = {
      withConnection: jest.fn((fn: (ds: DataSource) => Promise<unknown>) =>
        fn({ query } as unknown as DataSource),
      ),
    } as unknown as DenshibanDbService;

    const rows = await new DenshibanInboundFetcher(denshibanDb).fetchCollectingRows();

    expect(query.mock.calls[0][0] as string).toContain('subscribe_flg');
    expect(rows[0].subscribe_flg).toBe('1');
  });

  it('denshiban.enabled=false（withConnection が throw）はそのまま伝播', async () => {
    const denshibanDb = {
      withConnection: jest
        .fn()
        .mockRejectedValue(new Error('電子版DB is disabled (denshiban.enabled=false)')),
    } as unknown as DenshibanDbService;

    await expect(
      new DenshibanInboundFetcher(denshibanDb).fetchCollectingRows(),
    ).rejects.toThrow(/disabled/);
  });
});

// ── normalizeRow ──────────────────────────────────────────────────────────────

describe('normalizeRow', () => {
  it('null/undefined は null、それ以外は文字列化', () => {
    const row = normalizeRow({
      id: 5001,
      first_name: '山田',
      birthyear: 1990,
      payment_id: 1,
      tel2: null,
      email: undefined,
      JACd: '1135001999',
      ShopCd: '',
    });

    expect(row.id).toBe('5001'); // number → string
    expect(row.first_name).toBe('山田');
    expect(row.birthyear).toBe('1990');
    expect(row.payment_id).toBe('1');
    expect(row.tel2).toBeNull();
    expect(row.email).toBeNull(); // undefined → null
    expect(row.JACd).toBe('1135001999');
    expect(row.ShopCd).toBe(''); // empty string stays '' (not null)
  });

  it('選択していない列は結果に現れない（未定義キーは null 化）', () => {
    const row = normalizeRow({ id: '1' });

    // 参照される全キーが存在し、未提供のものは null。
    expect(row.paper_permission_dt).toBeNull();
    expect(row.activated_at).toBeNull();
    expect(row.status).toBeNull();
  });
});

// SQL は SELECT のみ・書き込みしないことを軽く担保（read-only 契約）。
describe('FETCH_COLLECTING_SQL', () => {
  it('SELECT 文であり、UPDATE/INSERT/DELETE を含まない', () => {
    expect(FETCH_COLLECTING_SQL.trim().toUpperCase().startsWith('SELECT')).toBe(true);
    expect(/\b(UPDATE|INSERT|DELETE|DROP|ALTER)\b/i.test(FETCH_COLLECTING_SQL)).toBe(
      false,
    );
  });
});
