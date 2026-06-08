// Drives src/modules/code/code.service.ts.
//
// CodeService is the in-memory mirror of `m_code` used by every DTO that
// validates a `*_kubun` / `*_type` field via `codeService.has(...)`, and by
// the public oshirase endpoint for label resolution. The cache is loaded
// once at boot (`onModuleInit`) and refreshed via `reload()` after seeder
// edits. Bugs here corrupt enum validation across 10+ modules — so spec
// the cache hydration + lookup edge cases tightly.

import type { Repository } from 'typeorm';

import { MCode } from '@/database/entities/m-code.entity';
import { CodeService } from '@/modules/code/code.service';

interface MCodeRow {
  codeCategory: string;
  codeValue: string;
  codeName: string;
  codeNameShort: string;
  sortOrder: number;
  deletedAt: Date | null;
}

function row(overrides: Partial<MCodeRow> = {}): MCodeRow {
  return {
    codeCategory: 'TANKA_TYPE',
    codeValue: '1',
    codeName: '購読料',
    codeNameShort: '購読料',
    sortOrder: 1,
    deletedAt: null,
    ...overrides,
  };
}

function buildService(rows: MCodeRow[]): {
  service: CodeService;
  repo: { find: jest.Mock };
} {
  const repo = {
    find: jest.fn().mockResolvedValue(rows),
  };
  const service = new CodeService(repo as unknown as Repository<MCode>);
  return { service, repo };
}

describe('CodeService', () => {
  // ─── onModuleInit / reload ──────────────────────────────────────────
  describe('onModuleInit / reload — cache hydration', () => {
    it('hydrates the cache from m_code on boot', async () => {
      const { service, repo } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1', codeName: '購読料' }),
        row({ codeCategory: 'TANKA_TYPE', codeValue: '2', codeName: '配達手数料' }),
      ]);
      await service.onModuleInit();
      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(service.getByCategory('TANKA_TYPE')).toHaveLength(2);
    });

    it('excludes soft-deleted rows (deletedAt IS NULL filter)', async () => {
      // The implementation passes `where: { deletedAt: IsNull() }` to
      // typeorm. We verify the SHAPE of the find call rather than
      // re-simulating IsNull semantics — the spec is the contract.
      const { service, repo } = buildService([]);
      await service.onModuleInit();
      const call = repo.find.mock.calls[0][0];
      expect(call.where).toHaveProperty('deletedAt');
    });

    it('orders by codeCategory ASC, sortOrder ASC, codeValue ASC', async () => {
      const { service, repo } = buildService([]);
      await service.onModuleInit();
      const call = repo.find.mock.calls[0][0];
      expect(call.order).toEqual({
        codeCategory: 'ASC',
        sortOrder: 'ASC',
        codeValue: 'ASC',
      });
    });

    it('groups rows into one bucket per code_category', async () => {
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1' }),
        row({ codeCategory: 'TANKA_TYPE', codeValue: '2' }),
        row({ codeCategory: 'GENDER', codeValue: '1', codeName: '男性' }),
      ]);
      await service.onModuleInit();
      const all = service.getAll();
      expect(Object.keys(all)).toEqual(
        expect.arrayContaining(['TANKA_TYPE', 'GENDER']),
      );
      expect(all.TANKA_TYPE).toHaveLength(2);
      expect(all.GENDER).toHaveLength(1);
    });

    it('reload() refreshes the cache — replaces the prior snapshot', async () => {
      const { service, repo } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1', codeName: '購読料' }),
      ]);
      await service.onModuleInit();
      expect(service.getByCategory('TANKA_TYPE')).toHaveLength(1);

      // Customer edits m_code → operator calls reload. The second
      // find() returns a different shape — the cache must REPLACE
      // (not merge) so removed values disappear.
      repo.find.mockResolvedValueOnce([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1', codeName: '新聞購読料' }),
        row({ codeCategory: 'TANKA_TYPE', codeValue: '2', codeName: '配達手数料' }),
      ]);
      await service.reload();
      const list = service.getByCategory('TANKA_TYPE');
      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({ value: 1, label: '新聞購読料' });
    });
  });

  // ─── normalizeValue ────────────────────────────────────────────────
  describe('value normalisation', () => {
    it('coerces integer-shaped string codes to `number` (e.g. "1" → 1)', async () => {
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1' }),
      ]);
      await service.onModuleInit();
      const list = service.getByCategory('TANKA_TYPE');
      expect(list[0].value).toBe(1);
      expect(typeof list[0].value).toBe('number');
    });

    it('keeps non-numeric / non-integer-shaped codes as STRING', async () => {
      // todofuken_code is '01' / '13' — `Number('01') === 1` but the
      // stringified-back form `'1' !== '01'`, so the original `'01'`
      // must be preserved (not silently turned into 1).
      const { service } = buildService([
        row({ codeCategory: 'TODOFUKEN', codeValue: '01', codeName: '北海道' }),
        row({ codeCategory: 'TODOFUKEN', codeValue: '13', codeName: '東京都' }),
      ]);
      await service.onModuleInit();
      const list = service.getByCategory('TODOFUKEN');
      expect(list[0].value).toBe('01');
      expect(list[1].value).toBe(13); // '13' === String(13) → coerce
    });

    it('keeps multi-digit-with-leading-zero strings as-is to preserve format', async () => {
      const { service } = buildService([
        row({ codeCategory: 'PREFECTURE', codeValue: '047' }),
      ]);
      await service.onModuleInit();
      expect(service.getByCategory('PREFECTURE')[0].value).toBe('047');
    });
  });

  // ─── has() ───────────────────────────────────────────────────────────
  describe('has()', () => {
    it('returns true when (category, value) is in the cache (numeric value)', async () => {
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1' }),
      ]);
      await service.onModuleInit();
      expect(service.has('TANKA_TYPE', 1)).toBe(true);
    });

    it('returns false when category is unknown', async () => {
      const { service } = buildService([]);
      await service.onModuleInit();
      expect(service.has('NONEXISTENT_CATEGORY', 1)).toBe(false);
    });

    it('returns false when value is not in the category', async () => {
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1' }),
      ]);
      await service.onModuleInit();
      expect(service.has('TANKA_TYPE', 99)).toBe(false);
    });

    it('strictly distinguishes number from string (1 !== "1" after normalize)', async () => {
      // Numeric codes normalise to number; passing the string form
      // back must NOT match. This is the contract that protects DTO
      // validation from silent type coercion.
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1' }),
      ]);
      await service.onModuleInit();
      expect(service.has('TANKA_TYPE', 1)).toBe(true);
      expect(service.has('TANKA_TYPE', '1')).toBe(false);
    });
  });

  // ─── getLabel() ─────────────────────────────────────────────────────
  describe('getLabel()', () => {
    it('returns the label when (category, value) matches', async () => {
      const { service } = buildService([
        row({
          codeCategory: 'TANKA_TYPE',
          codeValue: '1',
          codeName: '購読料',
        }),
      ]);
      await service.onModuleInit();
      expect(service.getLabel('TANKA_TYPE', 1)).toBe('購読料');
    });

    it('returns empty string when category is unknown', async () => {
      const { service } = buildService([]);
      await service.onModuleInit();
      expect(service.getLabel('NONEXISTENT', 1)).toBe('');
    });

    it('returns empty string when value is not in the category', async () => {
      const { service } = buildService([
        row({ codeCategory: 'TANKA_TYPE', codeValue: '1', codeName: '購読料' }),
      ]);
      await service.onModuleInit();
      expect(service.getLabel('TANKA_TYPE', 99)).toBe('');
    });
  });

  // ─── getByCategory() / getAll() ─────────────────────────────────────
  describe('getByCategory() / getAll()', () => {
    it('getByCategory returns empty array for unknown category (never throws)', async () => {
      const { service } = buildService([]);
      await service.onModuleInit();
      expect(service.getByCategory('UNKNOWN')).toEqual([]);
    });

    it('getAll returns every cached category as a plain record', async () => {
      const { service } = buildService([
        row({ codeCategory: 'A', codeValue: '1' }),
        row({ codeCategory: 'B', codeValue: '1' }),
      ]);
      await service.onModuleInit();
      const all = service.getAll();
      expect(all).toHaveProperty('A');
      expect(all).toHaveProperty('B');
      expect(Array.isArray(all.A)).toBe(true);
    });
  });
});
