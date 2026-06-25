import { describe, it, expect } from 'vitest';
import { meiboRowsPerA4 } from '@/utils/meibo-page';

describe('meiboRowsPerA4', () => {
  it('derives a smaller per-page count than the old fixed 50 (fits A4)', () => {
    expect(meiboRowsPerA4('hanbaiten')).toBeLessThan(50);
    expect(meiboRowsPerA4('kanri_shiten')).toBeLessThan(50);
  });

  it('uses the same 15 rows/page for both report types (preview/Excel page-count parity)', () => {
    expect(meiboRowsPerA4('hanbaiten')).toBe(15);
    expect(meiboRowsPerA4('kanri_shiten')).toBe(15);
  });

  it('returns at least 1 row', () => {
    expect(meiboRowsPerA4('hanbaiten')).toBeGreaterThanOrEqual(1);
  });
});
