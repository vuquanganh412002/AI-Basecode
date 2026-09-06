// assertNoRelatedRows のユニットテスト。文字列エントリ（既定 hasDeletedAt=true）
// と { table, hasDeletedAt: false }（deleted_at 列が無い append-only 履歴テーブル
// 向け）の両方で正しい SQL を組み立てることを確認する。

import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { ConflictException } from '@/common/exceptions/common.exceptions';

function buildDataSource(countByTable: Record<string, number>) {
  return {
    query: jest.fn((sql: string) => {
      const match = /FROM (\w+)/.exec(sql);
      const table = match?.[1] ?? '';
      return Promise.resolve([{ count: String(countByTable[table] ?? 0) }]);
    }),
  } as any;
}

describe('assertNoRelatedRows', () => {
  it('should NOT throw when all related tables have zero rows', async () => {
    const ds = buildDataSource({ m_shiten: 0, t_dokusya: 0 });
    await expect(
      assertNoRelatedRows(ds, ['m_shiten', 't_dokusya'], 'ja_id', 1),
    ).resolves.toBeUndefined();
  });

  it('should throw ConflictException when a string-entry table has rows', async () => {
    const ds = buildDataSource({ m_shiten: 3 });
    await expect(
      assertNoRelatedRows(ds, ['m_shiten'], 'ja_id', 1),
    ).rejects.toThrow(ConflictException);
  });

  it('should append "AND deleted_at IS NULL" for a plain string entry', async () => {
    const ds = buildDataSource({ m_shiten: 0 });
    await assertNoRelatedRows(ds, ['m_shiten'], 'ja_id', 1);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at IS NULL'),
      [1],
    );
  });

  it('should NOT append "deleted_at IS NULL" for a { hasDeletedAt: false } entry (append-only table)', async () => {
    const ds = buildDataSource({ t_dokusya_rireki: 0 });
    await assertNoRelatedRows(
      ds,
      [{ table: 't_dokusya_rireki', hasDeletedAt: false }],
      'ja_id',
      1,
    );
    expect(ds.query).toHaveBeenCalledWith(
      expect.not.stringContaining('deleted_at'),
      [1],
    );
  });

  it('should throw ConflictException when a { hasDeletedAt: false } entry has rows', async () => {
    const ds = buildDataSource({ t_dokusya_rireki: 1 });
    await expect(
      assertNoRelatedRows(
        ds,
        [{ table: 't_dokusya_rireki', hasDeletedAt: false }],
        'ja_id',
        1,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should check tables in order and stop at the first conflict (short-circuit)', async () => {
    const ds = buildDataSource({ m_shiten: 0, t_dokusya: 5, m_account: 9 });
    await expect(
      assertNoRelatedRows(ds, ['m_shiten', 't_dokusya', 'm_account'], 'ja_id', 1),
    ).rejects.toThrow(ConflictException);
    // m_account never queried — loop stopped at t_dokusya.
    expect(ds.query).toHaveBeenCalledTimes(2);
  });

  it('should use the custom message when provided', async () => {
    const ds = buildDataSource({ t_dokusya: 2 });
    await expect(
      assertNoRelatedRows(ds, ['t_dokusya'], 'hanbaiten_id', 1, 'カスタムメッセージ'),
    ).rejects.toThrow('カスタムメッセージ');
  });

  it('should mix string and object entries in the same call', async () => {
    const ds = buildDataSource({ m_shiten: 0, t_dokusya_rireki: 0 });
    await expect(
      assertNoRelatedRows(
        ds,
        ['m_shiten', { table: 't_dokusya_rireki', hasDeletedAt: false }],
        'ja_id',
        1,
      ),
    ).resolves.toBeUndefined();
    expect(ds.query).toHaveBeenCalledTimes(2);
  });
});
