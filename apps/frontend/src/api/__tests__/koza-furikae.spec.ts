// Drives src/api/koza-furikae/koza-furikae.ts (ACSMS-SCR-020, v1.1).
// Locks the URL/method for preview + export and verifies the 404
// (NO_TARGET_DATA) → `{ error_code }` normalization both wrappers do.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const get = vi.fn();

vi.mock('@/api/axios-instance', () => ({
  default: {
    post: (...a: unknown[]) => post(...a),
    get: (...a: unknown[]) => get(...a),
  },
}));

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe('koza-furikae API wrapper — previewKozaFurikae', () => {
  it('posts /api/v1/koza-furikae/preview and returns the { data, meta } envelope', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const envelope = {
      data: [{ dokusya_id: 1, koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ', furikae_kingaku: 4900 }],
      meta: { total: 1, page: 1, per_page: 1, total_pages: 1 },
    };
    post.mockResolvedValue({ data: envelope });

    const body = { target_month: '2026-05-01', hikiotoshi_date: '2026-05-27' };
    const out = await previewKozaFurikae(body);

    expect(post).toHaveBeenCalledWith('/api/v1/koza-furikae/preview', body);
    expect(out).toEqual(envelope);
  });

  it('normalizes a 404 NO_TARGET_DATA response into { error_code } and rethrows', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    post.mockRejectedValue({
      response: { data: { error_code: 'NO_TARGET_DATA' } },
    });

    await expect(
      previewKozaFurikae({ target_month: '2026-05-01', hikiotoshi_date: '2026-05-27' }),
    ).rejects.toEqual({ error_code: 'NO_TARGET_DATA' });
  });

  it('rethrows the original error when there is no error_code', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const boom = new Error('network');
    post.mockRejectedValue(boom);

    await expect(
      previewKozaFurikae({ target_month: '2026-05-01', hikiotoshi_date: '2026-05-27' }),
    ).rejects.toBe(boom);
  });
});

describe('koza-furikae API wrapper — exportKozaFurikae', () => {
  it('posts /api/v1/koza-furikae/export with rows and returns the blob + filename', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const blob = new Blob(['ZENOUTFD'], { type: 'text/plain' });
    post.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': "attachment; filename=\"ZENOUTFD\"" },
    });

    const body = {
      target_month: '2026-05-01',
      hikiotoshi_date: '2026-05-27',
      jastem_itakusha_code: '1234567890',
      jastem_itakusha_name: 'ニホンノウギョウシンブン',
      jastem_ja_code: '1234',
      jastem_ja_name: 'ニホンノウギョウ',
      jastem_toriatsukai_tenpo_code: '001',
      jastem_tenpo_name: 'ホンテン',
      jastem_tyokin_shubetsu: '1',
      jastem_koza_no: '1234567',
      rows: [{ dokusya_id: 1, furikae_kingaku: 8000 }],
    };
    const out = await exportKozaFurikae(body);

    expect(post).toHaveBeenCalledWith('/api/v1/koza-furikae/export', body, {
      responseType: 'blob',
    });
    expect(out.blob).toBe(blob);
    expect(out.filename).toBe('ZENOUTFD');
  });
});
