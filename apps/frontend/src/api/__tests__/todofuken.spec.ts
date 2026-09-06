// Drives src/api/todofuken/todofuken.ts — COMMON-001 都道府県 dropdown lookup
// used by JaFormView / HanbaitenFormView / etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();

vi.mock('@/api/axios-instance', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
  },
}));

beforeEach(() => {
  get.mockReset();
});

describe('todofuken API wrapper — getTodofukenList (COMMON-001)', () => {
  it('GETs /api/v1/todofuken and returns the response body envelope', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    const envelope = {
      data: [
        { todofuken_code: '13', todofuken_name: '東京都' },
        { todofuken_code: '20', todofuken_name: '長野県' },
      ],
    };
    get.mockResolvedValue({ data: envelope });

    const out = await getTodofukenList();

    expect(get).toHaveBeenCalledWith('/api/v1/todofuken');
    expect(out).toEqual(envelope);
  });
});
