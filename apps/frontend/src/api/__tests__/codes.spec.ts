// Drives src/api/codes/codes.ts. Codes wrapper unwraps the BE envelope
// for both list-all and by-category endpoints. URL-encoding on the
// category param matters because the route segment can contain `/`
// or other reserved chars on hypothetical future categories.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('@/api/axios-instance', () => ({
  default: { get: (...a: unknown[]) => get(...a) },
}));

beforeEach(() => {
  get.mockReset();
});

describe('codes API wrapper', () => {
  it('getCodes() GETs /api/v1/codes and unwraps `data`', async () => {
    const { getCodes } = await import('@/api/codes/codes');
    get.mockResolvedValue({
      data: {
        data: {
          TANKA_TYPE: [{ value: 1, label: '購読料', label_short: '購読料' }],
        },
      },
    });
    const out = await getCodes();
    expect(get).toHaveBeenCalledWith('/api/v1/codes');
    expect(out.TANKA_TYPE[0].label).toBe('購読料');
  });

  it('getCodesByCategory() URL-encodes the category segment', async () => {
    const { getCodesByCategory } = await import('@/api/codes/codes');
    get.mockResolvedValue({ data: { data: [] } });
    await getCodesByCategory('OSHIRASE/STATUS');
    expect(get).toHaveBeenCalledWith('/api/v1/codes/OSHIRASE%2FSTATUS');
  });

  it('getCodesByCategory() returns the unwrapped CodeItem[]', async () => {
    const { getCodesByCategory } = await import('@/api/codes/codes');
    get.mockResolvedValue({
      data: { data: [{ value: 2, label: '外税', label_short: '外税' }] },
    });
    const out = await getCodesByCategory('ZEI_KUBUN');
    expect(out).toEqual([{ value: 2, label: '外税', label_short: '外税' }]);
  });
});
