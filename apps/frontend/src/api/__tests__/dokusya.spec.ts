// Screen: ACSMS-SCR-014 — 購読者明細検索画面
//
// Drives src/api/dokusya/dokusya.ts — the SCR-014 endpoints that
// /gen-code-frontend will append to the existing SCR-011 wrapper:
//   listDokusya        → GET    /api/v1/dokusya            (API-014-001)
//   removeDokusya      → DELETE /api/v1/dokusya/:id        (API-014-002)
//   exportDokusyaExcel → GET    /api/v1/dokusya/export     (API-014-003)
//
// URL + method are locked at the wrapper layer so a typo can't silently
// 404 in production. Shape matches docs/design/ACSMS-SCR-014/ACSMS-SCR-014-api.md.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const del = vi.fn();
const post = vi.fn();
const put = vi.fn();
const patch = vi.fn();

vi.mock('@/api/axios-instance', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    delete: (...a: unknown[]) => del(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}));

beforeEach(() => {
  get.mockReset();
  del.mockReset();
  post.mockReset();
  put.mockReset();
  patch.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════
// listDokusya — GET /api/v1/dokusya
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — listDokusya (API-014-001)', () => {
  it('GETs /api/v1/dokusya and returns the response body envelope', async () => {
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    const envelope = {
      data: [
        {
          dokusya_id: 1001,
          ja_id: 1,
          kanri_shiten_id: 10,
          kanri_shiten_name: '中央管理支店',
          shiten_id: 21,
          shiten_name: '渋谷支店',
          kumiaiin_code: 'K000001',
          full_name: '山田 太郎',
          full_name_kana: 'ヤマダ タロウ',
          renrakusaki_1: '03-1234-5678',
          renrakusaki_2: '',
          haitatsu_yubin_no: '1500001',
          haitatsu: '東京都渋谷区神宮前1-1-1',
          hanbaiten_id: 501,
          hanbaiten_name: '渋谷販売店',
          dokusya_shubetsu: 1,
          shiharai_hoho: 1,
          denshi_shonin_status: null,
          shoki_dokusya_kaishi_date: '2024/04/01',
          dokusya_chushi_date: null,
          is_read_only: false,
        },
      ],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    };
    get.mockResolvedValue({ data: envelope });

    const out = await listDokusya({
      page: 1,
      per_page: 20,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya', {
      params: { page: 1, per_page: 20, sort_by: 'updated_at', sort_order: 'desc' },
    });
    expect(out).toEqual(envelope);
    // Sanity-check the envelope shape so the wrapper doesn't accidentally
    // unwrap to just `data` (which would lose the pagination meta).
    expect(out.data).toHaveLength(1);
    expect(out.meta.total).toBe(1);
  });

  it('forwards every filter param verbatim to axios.get params', async () => {
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } },
    });

    const filters = {
      kanri_shiten_id: 10,
      shiten_id: 21,
      kumiaiin_code: 'K000001',
      jastem_toriatsukai_tenpo_code: '001',
      jastem_tenpo_name: '本店',
      full_name: '山田',
      full_name_kana: 'ヤマダ',
      renrakusaki_1: '03-1234',
      haitatsu: '渋谷',
      hanbaiten_id: 501,
      email: 'test@example.com',
      seikyu_kaishi_month: '202604',
      shoki_dokusya_kaishi_date_from: '2024/01/01',
      shoki_dokusya_kaishi_date_to: '2024/12/31',
      dokusya_chushi_date_from: '2025/01/01',
      dokusya_chushi_date_to: '2025/06/30',
      dokusya_shubetsu: 1,
      denshi_shonin_status: 0,
      tetsuzuki_shurui: 1,
      joho_henko_tekiyo_date_from: '2026/01/01',
      joho_henko_tekiyo_date_to: '2026/12/31',
      shiharai_hoho: 1,
      page: 2,
      per_page: 50,
      sort_by: 'kanri_shiten_id',
      sort_order: 'asc' as const,
    };

    await listDokusya(filters);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya', { params: filters });
  });

  it('omits the params key entries that are undefined (caller responsibility — assert pass-through)', async () => {
    // The wrapper just forwards what the caller passes. The
    // DokusyaListView spec separately verifies that the view itself
    // converts empty strings → undefined before calling.
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } },
    });

    await listDokusya({ page: 1, per_page: 20 });

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya', {
      params: { page: 1, per_page: 20 },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// removeDokusya — DELETE /api/v1/dokusya/:id
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — removeDokusya (API-014-002)', () => {
  it('DELETEs /api/v1/dokusya/:dokusya_id and returns the response body', async () => {
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    del.mockResolvedValue({ data: { message: '削除しました。' } });

    const out = await removeDokusya(1001);

    expect(del).toHaveBeenCalledWith('/api/v1/dokusya/1001');
    // The wrapper returns the unwrapped body so the view can read .message
    // (matching the project pattern from /api/v1/ja/:id and friends).
    expect(out).toEqual({ message: '削除しました。' });
  });

  it('interpolates the dokusya_id correctly even when it is large', async () => {
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    del.mockResolvedValue({ data: { message: '削除しました。' } });

    await removeDokusya(987654321);

    expect(del).toHaveBeenCalledWith('/api/v1/dokusya/987654321');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// exportDokusyaExcel — GET /api/v1/dokusya/export
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — exportDokusyaExcel (API-014-003)', () => {
  it('GETs /api/v1/dokusya/export with responseType: "blob" and forwards filter params', async () => {
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    get.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          'attachment; filename="dokusya_export_20260530_120000.xlsx"',
      },
    });

    await exportDokusyaExcel({ kanri_shiten_id: 10, dokusya_shubetsu: 1 });

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/export', {
      params: { kanri_shiten_id: 10, dokusya_shubetsu: 1 },
      responseType: 'blob',
    });
  });

  it('returns a Blob (or { blob, filename } envelope) from the axios response', async () => {
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    get.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          'attachment; filename="dokusya_export_20260530_120000.xlsx"',
      },
    });

    const out = await exportDokusyaExcel({ kanri_shiten_id: 10 });

    // Accept either shape the wrapper may choose to emit:
    //   1. The raw Blob (simplest).
    //   2. An envelope { blob, filename } so the caller can name the
    //      download without re-parsing Content-Disposition.
    if (out instanceof Blob) {
      expect(out.type).toContain('spreadsheetml');
    } else {
      expect((out as { blob: Blob }).blob).toBeInstanceOf(Blob);
      expect((out as { filename: string }).filename).toContain(
        'dokusya_export_',
      );
    }
  });

  it('accepts an empty filter object and still issues the GET', async () => {
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    get.mockResolvedValue({
      data: new Blob([], { type: 'application/octet-stream' }),
      headers: {},
    });

    await exportDokusyaExcel({});

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/export', {
      params: {},
      responseType: 'blob',
    });
  });
});
