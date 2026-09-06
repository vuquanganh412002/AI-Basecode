// Drives src/api/kanri-shiten/kanri-shiten.ts — ACSMS-SCR-008 (list/delete) +
// ACSMS-SCR-009 (detail/create/update) + ACSMS-API-COMMON-004 (dropdown).
//
// URL + method are locked at the wrapper layer so a typo can't silently
// 404 in production. Shape matches docs/design/ACSMS-SCR-008 / ACSMS-SCR-009.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const del = vi.fn();
const post = vi.fn();
const put = vi.fn();

vi.mock('@/api/axios-instance', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    delete: (...a: unknown[]) => del(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
  },
}));

beforeEach(() => {
  get.mockReset();
  del.mockReset();
  post.mockReset();
  put.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════
// listKanriShiten — GET /api/v1/kanri-shiten (ACSMS-API-008-001)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — listKanriShiten (ACSMS-API-008-001)', () => {
  it('GETs /api/v1/kanri-shiten and returns the response body envelope', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const envelope = {
      data: [
        {
          kanri_shiten_id: 1,
          ja_id: 1,
          ja_name: '中央農業協同組合',
          kanri_shiten_code: 'KS001',
          kanri_shiten_name: '中央管理支店',
          yubin_no: '1000001',
          todofuken_code: '13',
          todofuken_name: '東京都',
          address: '千代田区1-1-1',
          tel: '03-1234-5678',
          fax: '',
          paper_flg: true,
          denshi_flg: true,
        },
      ],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    };
    get.mockResolvedValue({ data: envelope });

    const out = await listKanriShiten({ page: 1, per_page: 20 });

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten', {
      params: { page: 1, per_page: 20 },
    });
    expect(out).toEqual(envelope);
  });

  it('defaults query to {} when omitted', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } },
    });

    await listKanriShiten();

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten', { params: {} });
  });

  it('forwards every filter/sort param verbatim to axios.get params', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } },
    });

    const query = {
      kanri_shiten_code: 'KS',
      kanri_shiten_name: '中央',
      todofuken_code: '13',
      tel: '03',
      fax: '03',
      page: 2,
      per_page: 50,
      sort_by: 'kanri_shiten_name' as const,
      sort_order: 'asc' as const,
    };

    await listKanriShiten(query);

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten', { params: query });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// removeKanriShiten — DELETE /api/v1/kanri-shiten/:id (ACSMS-API-008-002)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — removeKanriShiten (ACSMS-API-008-002)', () => {
  it('DELETEs /api/v1/kanri-shiten/:kanri_shiten_id and returns the response body', async () => {
    const { removeKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    del.mockResolvedValue({ data: { message: '削除しました。' } });

    const out = await removeKanriShiten(1);

    expect(del).toHaveBeenCalledWith('/api/v1/kanri-shiten/1');
    expect(out).toEqual({ message: '削除しました。' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getKanriShitenDropdown — GET /api/v1/kanri-shiten/dropdown (ACSMS-API-COMMON-004)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — getKanriShitenDropdown (ACSMS-API-COMMON-004)', () => {
  it('accepts a numeric ja_id (legacy form) and wraps it as { ja_id }', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    const envelope = {
      data: [{ kanri_shiten_id: 1, kanri_shiten_code: 'KS001', kanri_shiten_name: '中央管理支店', paper_flg: true, denshi_flg: true }],
    };
    get.mockResolvedValue({ data: envelope });

    const out = await getKanriShitenDropdown(1);

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten/dropdown', {
      params: { ja_id: 1 },
    });
    expect(out).toEqual(envelope);
  });

  it('forwards a query object verbatim (search/paging/infinite-scroll form)', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, has_more: false } },
    });

    const query = {
      ja_id: 1,
      q: '中央',
      match_field: 'name' as const,
      page: 1,
      per_page: 20,
      include_id: 5,
    };
    await getKanriShitenDropdown(query);

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten/dropdown', {
      params: query,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getKanriShiten — GET /api/v1/kanri-shiten/:id (ACSMS-API-009-001)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — getKanriShiten (ACSMS-API-009-001)', () => {
  it('GETs /api/v1/kanri-shiten/:id and returns the response body envelope', async () => {
    const { getKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const envelope = { data: { kanri_shiten_id: 1, kanri_shiten_code: 'KS001' } };
    get.mockResolvedValue({ data: envelope });

    const out = await getKanriShiten(1);

    expect(get).toHaveBeenCalledWith('/api/v1/kanri-shiten/1');
    expect(out).toEqual(envelope);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// createKanriShiten — POST /api/v1/kanri-shiten (ACSMS-API-009-002)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — createKanriShiten (ACSMS-API-009-002)', () => {
  it('POSTs the body to /api/v1/kanri-shiten and returns the response body', async () => {
    const { createKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const body = {
      ja_id: 1,
      kanri_shiten_code: 'KS002',
      kanri_shiten_name: '麹町管理支店',
      todofuken_code: '13',
    };
    const written = { data: { kanri_shiten_id: 2, ...body }, message: '登録しました。' };
    post.mockResolvedValue({ data: written });

    const out = await createKanriShiten(body);

    expect(post).toHaveBeenCalledWith('/api/v1/kanri-shiten', body);
    expect(out).toEqual(written);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// updateKanriShiten — PUT /api/v1/kanri-shiten/:id (ACSMS-API-009-003)
// ═══════════════════════════════════════════════════════════════════════
describe('kanri-shiten API wrapper — updateKanriShiten (ACSMS-API-009-003)', () => {
  it('PUTs the body to /api/v1/kanri-shiten/:id (ja_id/code excluded) and returns the response body', async () => {
    const { updateKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    const body = { kanri_shiten_name: '麹町管理支店（改称）', todofuken_code: '13' };
    const written = { data: { kanri_shiten_id: 2, ...body }, message: '更新しました。' };
    put.mockResolvedValue({ data: written });

    const out = await updateKanriShiten(2, body);

    expect(put).toHaveBeenCalledWith('/api/v1/kanri-shiten/2', body);
    expect(out).toEqual(written);
  });
});
