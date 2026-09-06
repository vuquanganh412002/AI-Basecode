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
  const validBody = {
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

  it('posts /api/v1/koza-furikae/export with rows and returns the blob + filename', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const blob = new Blob(['ZENOUTFD'], { type: 'text/plain' });
    post.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': "attachment; filename=\"ZENOUTFD\"" },
    });

    const out = await exportKozaFurikae(validBody);

    expect(post).toHaveBeenCalledWith('/api/v1/koza-furikae/export', validBody, {
      responseType: 'blob',
    });
    expect(out.blob).toBe(blob);
    expect(out.filename).toBe('ZENOUTFD');
  });

  it('decodes an RFC5987 filename*=UTF-8\'\'… (Japanese) filename', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const blob = new Blob(['ZENOUTFD'], { type: 'text/plain' });
    post.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''%E5%8F%A3%E5%BA%A7%E6%8C%AF%E6%9B%BF.csv",
      },
    });

    const out = await exportKozaFurikae(validBody);

    expect(out.filename).toBe('口座振替.csv');
  });

  it('returns filename: null when the response carries no content-disposition header', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const blob = new Blob(['ZENOUTFD'], { type: 'text/plain' });
    post.mockResolvedValue({ data: blob, headers: {} });

    const out = await exportKozaFurikae(validBody);

    expect(out.filename).toBeNull();
  });

  it('normalizes a 409 INACTIVE_TANKA_REFERENCED response into { error_code, errors, total } and rethrows', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    post.mockRejectedValue({
      response: {
        data: {
          error_code: 'INACTIVE_TANKA_REFERENCED',
          message: '失効している単価を参照する購読者がいます。',
          errors: [{ field: '1001', message: '山田太郎（T001）' }],
          total: 1,
        },
      },
    });

    await expect(exportKozaFurikae(validBody)).rejects.toEqual({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: '失効している単価を参照する購読者がいます。',
      errors: [{ field: '1001', message: '山田太郎（T001）' }],
      total: 1,
    });
  });

  it('rethrows the original error when there is no error_code', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const boom = new Error('network');
    post.mockRejectedValue(boom);

    await expect(exportKozaFurikae(validBody)).rejects.toBe(boom);
  });
});

describe('koza-furikae API wrapper — exportKozaFurikaeExcel (ACSMS-API-020-004)', () => {
  const validBody = {
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

  it('posts /api/v1/koza-furikae/export-excel with rows and returns the blob + filename', async () => {
    const { exportKozaFurikaeExcel } = await import('@/api/koza-furikae/koza-furikae');
    const blob = new Blob(['PK'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    post.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''%E5%8F%A3%E5%BA%A7%E6%8C%AF%E6%9B%BF%E3%83%87%E3%83%BC%E3%82%BF_2026%E5%B9%B405%E6%9C%8827%E6%97%A5.xlsx",
      },
    });

    const out = await exportKozaFurikaeExcel(validBody);

    expect(post).toHaveBeenCalledWith('/api/v1/koza-furikae/export-excel', validBody, {
      responseType: 'blob',
    });
    expect(out.blob).toBe(blob);
    expect(out.filename).toBe('口座振替データ_2026年05月27日.xlsx');
  });

  it('normalizes a 404 NO_TARGET_DATA response into { error_code } and rethrows', async () => {
    const { exportKozaFurikaeExcel } = await import('@/api/koza-furikae/koza-furikae');
    post.mockRejectedValue({
      response: { data: { error_code: 'NO_TARGET_DATA' } },
    });

    await expect(exportKozaFurikaeExcel(validBody)).rejects.toEqual({
      error_code: 'NO_TARGET_DATA',
      message: undefined,
      errors: undefined,
      total: undefined,
    });
  });

  it('normalizes a 409 INACTIVE_TANKA_REFERENCED response into { error_code, errors, total } and rethrows', async () => {
    const { exportKozaFurikaeExcel } = await import('@/api/koza-furikae/koza-furikae');
    post.mockRejectedValue({
      response: {
        data: {
          error_code: 'INACTIVE_TANKA_REFERENCED',
          message: '失効している単価を参照する購読者がいます。',
          errors: [{ field: '1001', message: '山田太郎（T001）' }],
          total: 1,
        },
      },
    });

    await expect(exportKozaFurikaeExcel(validBody)).rejects.toEqual({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: '失効している単価を参照する購読者がいます。',
      errors: [{ field: '1001', message: '山田太郎（T001）' }],
      total: 1,
    });
  });

  it('rethrows the original error when there is no error_code', async () => {
    const { exportKozaFurikaeExcel } = await import('@/api/koza-furikae/koza-furikae');
    const boom = new Error('network');
    post.mockRejectedValue(boom);

    await expect(exportKozaFurikaeExcel(validBody)).rejects.toBe(boom);
  });
});

describe('koza-furikae API wrapper — getInitialKozaFurikae (ACSMS-API-020-001)', () => {
  it('GETs /api/v1/koza-furikae/initial and returns the response body envelope', async () => {
    const { getInitialKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const envelope = {
      data: {
        ja_id: 1,
        jastem_itakusha_code: '1234567890',
        jastem_itakusha_name: 'ニホンノウギョウシンブン',
        jastem_ja_code: '1234',
        jastem_ja_name: 'ニホンノウギョウ',
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: 'ホンテン',
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
      },
    };
    get.mockResolvedValue({ data: envelope });

    const out = await getInitialKozaFurikae();

    expect(get).toHaveBeenCalledWith('/api/v1/koza-furikae/initial');
    expect(out).toEqual(envelope);
  });
});
