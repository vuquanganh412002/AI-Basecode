// Screen: ACSMS-SCR-014 — 購読者明細検索画面
//
// Drives src/api/dokusya/dokusya.ts — the ACSMS-SCR-014 endpoints that
// /gen-code-frontend will append to the existing ACSMS-SCR-011 wrapper:
//   listDokusya        → GET    /api/v1/dokusya            (ACSMS-API-014-001)
//   removeDokusya      → DELETE /api/v1/dokusya/:id        (ACSMS-API-014-002)
//   exportDokusyaExcel → GET    /api/v1/dokusya/export     (ACSMS-API-014-003)
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
      bank_branch: '001',
      full_name: '山田',
      full_name_kana: 'ヤマダ',
      renrakusaki: '03-1234',
      haitatsu: '渋谷',
      hanbaiten_id: 501,
      email: 'test@example.com',
      yubin_kubun: '1',
      tanka_id: 5,
      biko: 'テスト',
      seikyu_kaishi_month_from: '202604',
      seikyu_kaishi_month_to: '202612',
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
          "attachment; filename*=UTF-8''%E8%B3%BC%E8%AA%AD%E8%80%85%E4%B8%80%E8%A6%A7%E5%87%BA%E5%8A%9B_20260530_120000.xlsx",
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
          "attachment; filename*=UTF-8''%E8%B3%BC%E8%AA%AD%E8%80%85%E4%B8%80%E8%A6%A7%E5%87%BA%E5%8A%9B_20260530_120000.xlsx",
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
        '%E8%B3%BC',
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

// ═══════════════════════════════════════════════════════════════════════
// approveDokusya / rejectDokusya — 引落口座4項目の同時保存 (#56524)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — approve/reject body (#56524)', () => {
  it('PUTs the 引落口座 fields + tanka_id to /approve', async () => {
    const { approveDokusya } = await import('@/api/dokusya/dokusya');
    put.mockResolvedValue({ data: { data: {}, message: '承認しました。' } });

    await approveDokusya(100, {
      tanka_id: 5,
      bank_shiten_id: 7,
      hikiotoshi_yokin_shubetsu: 1,
      hikiotoshi_koza_no: '1234567890',
      hikiotoshi_koza_meigi: 'ﾀﾅｶ ﾀﾛｳ',
    });

    expect(put).toHaveBeenCalledWith('/api/v1/dokusya/100/approve', {
      tanka_id: 5,
      bank_shiten_id: 7,
      hikiotoshi_yokin_shubetsu: 1,
      hikiotoshi_koza_no: '1234567890',
      hikiotoshi_koza_meigi: 'ﾀﾅｶ ﾀﾛｳ',
    });
  });

  it('PUTs the 引落口座 fields to /reject', async () => {
    const { rejectDokusya } = await import('@/api/dokusya/dokusya');
    put.mockResolvedValue({ data: { data: {}, message: '否認しました。' } });

    await rejectDokusya(100, { hikiotoshi_koza_no: '1234567890' });

    expect(put).toHaveBeenCalledWith('/api/v1/dokusya/100/reject', {
      hikiotoshi_koza_no: '1234567890',
    });
  });

  it('omits the body entirely when nothing was edited', async () => {
    // 空オブジェクトを送ると BE は「4項目とも undefined」で patch 無しになるが、
    // ボディ自体を省く方が意図が明確（＝ステータス変更のみ）。
    const { approveDokusya, rejectDokusya } = await import('@/api/dokusya/dokusya');
    put.mockResolvedValue({ data: { data: {}, message: 'ok' } });

    await approveDokusya(100);
    await rejectDokusya(100, {});

    expect(put).toHaveBeenNthCalledWith(1, '/api/v1/dokusya/100/approve', undefined);
    expect(put).toHaveBeenNthCalledWith(2, '/api/v1/dokusya/100/reject', undefined);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// registerTankaDokusya — denshi_shonin_status=NULL の単価初回登録（2026-08 追加）
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — registerTankaDokusya (ACSMS-API-011-007)', () => {
  it('PUTs tanka_id to /register-tanka', async () => {
    const { registerTankaDokusya } = await import('@/api/dokusya/dokusya');
    put.mockResolvedValue({ data: { data: {}, message: '登録しました。' } });

    await registerTankaDokusya(100, { tanka_id: 5 });

    expect(put).toHaveBeenCalledWith('/api/v1/dokusya/100/register-tanka', {
      tanka_id: 5,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getDokusya — GET /api/v1/dokusya/:id (ACSMS-API-011-001)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — getDokusya (ACSMS-API-011-001)', () => {
  it('GETs /api/v1/dokusya/:id and returns the response body envelope', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    const envelope = { data: { dokusya_id: 100 } };
    get.mockResolvedValue({ data: envelope });

    const out = await getDokusya(100);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/100');
    expect(out).toEqual(envelope);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getDokusyaEffectiveAt — GET /api/v1/dokusya/:id/effective-at (ACSMS-API-011-004)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — getDokusyaEffectiveAt (ACSMS-API-011-004)', () => {
  it('GETs /api/v1/dokusya/:id/effective-at with the joho query param', async () => {
    const { getDokusyaEffectiveAt } = await import('@/api/dokusya/dokusya');
    const envelope = { data: { dokusya_id: 100 } };
    get.mockResolvedValue({ data: envelope });

    const out = await getDokusyaEffectiveAt(100, '2026-08-01');

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/100/effective-at', {
      params: { joho: '2026-08-01' },
    });
    expect(out).toEqual(envelope);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// createDokusya — POST /api/v1/dokusya (ACSMS-API-011-002)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — createDokusya (ACSMS-API-011-002)', () => {
  it('POSTs the body to /api/v1/dokusya and returns the response body', async () => {
    const { createDokusya } = await import('@/api/dokusya/dokusya');
    const body = {
      dokusya_shubetsu: 1,
      tetsuzuki_shurui: 1,
      shimei_sei: '山田',
      shimei_mei: '太郎',
      shimei_kana_sei: 'やまだ',
      shimei_kana_mei: 'たろう',
      dokusya_busu: 1,
      yubin_no: '1000001',
      todofuken_code: '13',
      shikuchoson: '千代田区',
      chome_banchi: '1-1',
      renrakusaki_1: '0312345678',
      haitatsu_same_flg: true,
      hanbaiten_id: 501,
      tanka_id: 5,
      shiharai_hoho: 1,
      dokusya_kaishi_date: '2026-09-01',
    };
    post.mockResolvedValue({ data: { data: { dokusya_id: 1001 }, message: '登録しました。' } });

    const out = await createDokusya(body);

    expect(post).toHaveBeenCalledWith('/api/v1/dokusya', body);
    expect(out).toEqual({ data: { dokusya_id: 1001 }, message: '登録しました。' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// updateDokusya — PUT /api/v1/dokusya/:id (ACSMS-API-011-003)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — updateDokusya (ACSMS-API-011-003)', () => {
  it('PUTs the body to /api/v1/dokusya/:id and returns the response body', async () => {
    const { updateDokusya } = await import('@/api/dokusya/dokusya');
    const body = { shimei_sei: '田中' } as unknown as Parameters<
      typeof updateDokusya
    >[1];
    put.mockResolvedValue({ data: { data: { dokusya_id: 100 }, message: '更新しました。' } });

    const out = await updateDokusya(100, body);

    expect(put).toHaveBeenCalledWith('/api/v1/dokusya/100', body);
    expect(out).toEqual({ data: { dokusya_id: 100 }, message: '更新しました。' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// stopDokusya — POST /api/v1/dokusya/:id/stop (ACSMS-API-014-004)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — stopDokusya (ACSMS-API-014-004)', () => {
  it('POSTs dokusya_chushi_date to /api/v1/dokusya/:id/stop', async () => {
    const { stopDokusya } = await import('@/api/dokusya/dokusya');
    post.mockResolvedValue({ data: { data: {}, message: '登録しました。' } });

    await stopDokusya(100, { dokusya_chushi_date: '2026-09-30' });

    expect(post).toHaveBeenCalledWith('/api/v1/dokusya/100/stop', {
      dokusya_chushi_date: '2026-09-30',
    });
  });

  it('accepts an empty string to cancel an existing 解約予約 (電子版のみ・顧客要件2026-08)', async () => {
    const { stopDokusya } = await import('@/api/dokusya/dokusya');
    post.mockResolvedValue({ data: { data: {}, message: '更新しました。' } });

    await stopDokusya(100, { dokusya_chushi_date: '' });

    expect(post).toHaveBeenCalledWith('/api/v1/dokusya/100/stop', {
      dokusya_chushi_date: '',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getDokusyaHistory — GET /api/v1/dokusya/:id/history (ACSMS-API-011-006)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — getDokusyaHistory (ACSMS-API-011-006)', () => {
  it('GETs /api/v1/dokusya/:id/history and returns the response body', async () => {
    const { getDokusyaHistory } = await import('@/api/dokusya/dokusya');
    const envelope = { data: [] };
    get.mockResolvedValue({ data: envelope });

    const out = await getDokusyaHistory(100);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/100/history');
    expect(out).toEqual(envelope);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getDokusyaRirekiList — GET /api/v1/dokusya/:id/rireki (ACSMS-API-013-001)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — getDokusyaRirekiList (ACSMS-API-013-001)', () => {
  it('GETs /api/v1/dokusya/:id/rireki and forwards paging/sort params', async () => {
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    const envelope = {
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    };
    get.mockResolvedValue({ data: envelope });

    const params = { page: 2, per_page: 50, sort_by: 'rireki_no', sort_order: 'desc' as const };
    const out = await getDokusyaRirekiList(100, params);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/100/rireki', { params });
    expect(out).toEqual(envelope);
  });

  it('defaults params to {} when omitted', async () => {
    const { getDokusyaRirekiList } = await import('@/api/dokusya/dokusya');
    get.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } },
    });

    await getDokusyaRirekiList(100);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/100/rireki', { params: {} });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// torikeshiDokusyaRireki — POST /api/v1/dokusya/:id/rireki/:rireki_id/torikeshi (ACSMS-API-013-002)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — torikeshiDokusyaRireki (ACSMS-API-013-002)', () => {
  it('POSTs the reason to the torikeshi endpoint and returns the message', async () => {
    const { torikeshiDokusyaRireki } = await import('@/api/dokusya/dokusya');
    post.mockResolvedValue({ data: { message: '取消しました。' } });

    const out = await torikeshiDokusyaRireki(100, 5001, '入力誤り');

    expect(post).toHaveBeenCalledWith(
      '/api/v1/dokusya/100/rireki/5001/torikeshi',
      { reason: '入力誤り' },
    );
    expect(out).toEqual({ message: '取消しました。' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// searchDokusyaForReplace / replaceDokusyaHanbaiten — ACSMS-SCR-015
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — searchDokusyaForReplace (ACSMS-API-015-001)', () => {
  it('GETs the replace-hanbaiten search endpoint with the given params', async () => {
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    const envelope = {
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    };
    get.mockResolvedValue({ data: envelope });

    const params = {
      new_hanbaiten_id: 502,
      joho_henko_tekiyo_date: '2026-09-01',
      dokusya_shubetsu: 1,
    };
    const out = await searchDokusyaForReplace(params);

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/replace-hanbaiten/search', {
      params,
    });
    expect(out).toEqual(envelope);
  });
});

describe('dokusya API wrapper — replaceDokusyaHanbaiten (ACSMS-API-015-002)', () => {
  it('POSTs the replacement body and returns the result envelope', async () => {
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    const body = {
      dokusya_ids: [1001, 1002],
      new_hanbaiten_id: 502,
      joho_henko_tekiyo_date: '2026-09-01',
      dokusya_shubetsu: 1,
    };
    const result = {
      data: {
        total_count: 2,
        replaced_count: 2,
        rireki_count: 2,
        new_hanbaiten_id: 502,
        applied_at: '2026-08-22T00:00:00.000Z',
      },
      message: '置換しました。',
    };
    post.mockResolvedValue({ data: result });

    const out = await replaceDokusyaHanbaiten(body);

    expect(post).toHaveBeenCalledWith('/api/v1/dokusya/replace-hanbaiten', body);
    expect(out).toEqual(result);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// downloadDokusyaImportTemplate / importDokusyaExcel — ACSMS-SCR-016
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — downloadDokusyaImportTemplate (ACSMS-API-016-001)', () => {
  it('GETs the import template with responseType: "blob" and returns the Blob', async () => {
    const { downloadDokusyaImportTemplate } = await import('@/api/dokusya/dokusya');
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    get.mockResolvedValue({ data: blob });

    const out = await downloadDokusyaImportTemplate();

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/import/template', {
      responseType: 'blob',
    });
    expect(out).toBe(blob);
  });
});

describe('dokusya API wrapper — importDokusyaExcel (ACSMS-API-016-002)', () => {
  it('POSTs the import body and returns the result envelope', async () => {
    const { importDokusyaExcel } = await import('@/api/dokusya/dokusya');
    const body = {
      import_mode: 'NEW' as const,
      dokusya_shubetsu: 1,
      selected_columns: ['kumiaiin_code'],
      rows: [{ kumiaiin_code: 'K000001' }],
    };
    const result = {
      data: {
        import_mode: 'NEW' as const,
        total_rows: 1,
        created_count: 1,
        updated_count: 0,
        cancelled_count: 0,
        skipped_count: 0,
        failed_count: 0,
        rireki_count: 1,
        imported_at: '2026-08-22T00:00:00.000Z',
      },
      message: '登録しました。',
    };
    post.mockResolvedValue({ data: result });

    const out = await importDokusyaExcel(body);

    expect(post).toHaveBeenCalledWith('/api/v1/dokusya/import', body);
    expect(out).toEqual(result);
  });

  it('surfaces row_errors on a partial-success 電子版 import (1行=1tx)', async () => {
    const { importDokusyaExcel } = await import('@/api/dokusya/dokusya');
    const result = {
      data: {
        import_mode: 'NEW' as const,
        total_rows: 2,
        created_count: 1,
        updated_count: 0,
        cancelled_count: 0,
        skipped_count: 0,
        failed_count: 1,
        rireki_count: 1,
        imported_at: '2026-08-22T00:00:00.000Z',
      },
      message: '1件成功、1件失敗しました。',
      row_errors: [{ row: 2, message: 'メールアドレスが重複しています。' }],
    };
    post.mockResolvedValue({ data: result });

    const out = await importDokusyaExcel({
      import_mode: 'NEW',
      dokusya_shubetsu: 2,
      selected_columns: ['email'],
      rows: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
    });

    expect(out.row_errors).toEqual([
      { row: 2, message: 'メールアドレスが重複しています。' },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getPendingApprovalCount — GET /api/v1/dokusya/pending-approval/count (ACSMS-API-010-002)
// ═══════════════════════════════════════════════════════════════════════
describe('dokusya API wrapper — getPendingApprovalCount (ACSMS-API-010-002)', () => {
  it('GETs the pending-approval count endpoint and returns the response body', async () => {
    const { getPendingApprovalCount } = await import('@/api/dokusya/dokusya');
    const envelope = { data: { count: 3, ja_id: 1 } };
    get.mockResolvedValue({ data: envelope });

    const out = await getPendingApprovalCount();

    expect(get).toHaveBeenCalledWith('/api/v1/dokusya/pending-approval/count');
    expect(out).toEqual(envelope);
  });
});
