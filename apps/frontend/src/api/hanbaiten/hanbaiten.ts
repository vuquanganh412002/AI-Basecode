// Hand-written wrapper around the /api/v1/hanbaiten endpoints.
// Functions here are what SCR-018 (HanbaitenListView) imports and what its
// unit spec mocks via vi.mock('@/api/hanbaiten/hanbaiten').
// Shapes mirror docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md (v1.2).

import axiosInstance from '@/api/axios-instance';

export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
  /** Joined from m_ja.ja_code (api.md §4.5). */
  ja_code: string;
  /** Joined from m_ja.ja_name (api.md §4.5). */
  ja_name: string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  todofuken_code: string;
  /** Joined from m_todofuken.todofuken_name (api.md v1.2 §4.5). */
  todofuken_name: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  /** m_code.code_category='ITAKU_KUBUN' — FE resolves label via useCodesStore. */
  itaku_kubun: number | null;
  /** 月数. v1.2 rename: 旧「支払区分」. */
  haitatsuryo_shiharai_cycle: number | null;
  /** m_code.code_category='TESURYO_KUBUN' — 振込手数料負担区分. */
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
  haiten_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface HanbaitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface HanbaitenListResponse {
  data: HanbaitenListItem[];
  meta: HanbaitenListMeta;
}

/** Query DTO for `GET /api/v1/hanbaiten` (ACSMS-API-018-001). */
export interface ListHanbaitenQuery {
  hanbaiten_code?: string;
  hanbaiten_name?: string;
  tel?: string;
  fax?: string;
  address?: string;
  shocho_name?: string;
  /** true:廃店レコードも含む / false (default):廃店を除外. */
  haiten_flg?: boolean;
  /**
   * [staff-ja-filter] NICHINO_STAFF (session.ja_id == null) supplies
   * the JA to scope the search against via the 代行入力 list view's
   * BaseJaDropdown filter. Other roles ignore this field — the BE
   * always uses session.ja_id for them.
   */
  ja_id?: number;
  page?: number;
  per_page?: number;
  /**
   * `updated_at` is the default (most-recently-touched first) — not a
   * clickable column, just the landing order so a freshly created, imported
   * OR updated 販売店 appears at the top. `hanbaiten_code` /
   * `hanbaiten_name` are the UI sort headers.
   */
  sort_by?: 'hanbaiten_code' | 'hanbaiten_name' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/** Response shape from `DELETE /api/v1/hanbaiten/:hanbaiten_id`. */
export interface HanbaitenDeleteResponse {
  message: string;
}

/** GET /api/v1/hanbaiten — ACSMS-API-018-001. */
export async function listHanbaiten(
  query: ListHanbaitenQuery = {},
): Promise<HanbaitenListResponse> {
  const res = await axiosInstance.get<HanbaitenListResponse>('/api/v1/hanbaiten', {
    params: query,
  });
  return res.data;
}

/** DELETE /api/v1/hanbaiten/:hanbaiten_id — ACSMS-API-018-002. */
export async function removeHanbaiten(
  hanbaitenId: number,
): Promise<HanbaitenDeleteResponse> {
  const res = await axiosInstance.delete<HanbaitenDeleteResponse>(
    `/api/v1/hanbaiten/${hanbaitenId}`,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON — 販売店 dropdown (consumed by SCR-011) ─────────

/**
 * Minimal projection used by the 購読者情報登録 (SCR-011) 販売店コード
 * dropdown. Filters to the caller's JA scope server-side (the BE
 * service applies `applyJaScope` on the underlying query).
 */
export interface HanbaitenDropdownItem {
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
}

export interface HanbaitenDropdownEnvelope {
  data: HanbaitenDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface HanbaitenDropdownQuery {
  /** Optional JA filter (NICHINO_* 代行入力 only — JA-scoped roles let session.ja_id win). */
  ja_id?: number;
  q?: string;
  /** 'both' (default) matches hanbaiten_code OR hanbaiten_name; 'name' matches name only. */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  /** Edit-mode pin — force the selected id onto page 1 so its label resolves. */
  include_id?: number;
  /** true → 営業中(haiten_flg=false)のみ。購読者の販売店選択（登録/編集）用。 */
  active_only?: boolean;
}

/**
 * GET /api/v1/hanbaiten/dropdown — Shared dropdown lookup for SCR-011.
 * Returns minimal projections so the dropdown can paginate cheaply.
 */
export async function getHanbaitenDropdown(
  query: HanbaitenDropdownQuery = {},
): Promise<HanbaitenDropdownEnvelope> {
  const res = await axiosInstance.get<HanbaitenDropdownEnvelope>(
    '/api/v1/hanbaiten/dropdown',
    { params: query },
  );
  return res.data;
}

// ─── SCR-017 — 販売店情報登録画面 (Detail / Create / Update) ────────────
//
// Shapes mirror docs/design/ACSMS-SCR-017/ACSMS-SCR-017-api.md (v1.2 —
// adds todofuken_code + conditional-required bank fields when
// itaku_kubun=1).

export interface HanbaitenDetail {
  hanbaiten_id: number;
  ja_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana: string;
  torihikisaki_no: string;
  todofuken_code: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_tanka_id: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  haiten_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateHanbaitenBody {
  /**
   * [staff-ja-id] NICHINO_STAFF 代行入力 supplies ja_id explicitly via
   * the form's BaseJaDropdown — session.ja_id is null for that role.
   * Other roles may also send it; the BE service ignores it and uses
   * session.ja_id, so cross-tenant injection is not possible.
   */
  ja_id?: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana?: string;
  todofuken_code?: string;
  torihikisaki_no?: string;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  shocho_name?: string;
  itaku_kubun?: number | null;
  haitatsuryo_tanka_id?: number | null;
  haitatsuryo_shiharai_cycle?: number | null;
  furikomi_tesuryo_futan_kubun?: number | null;
  furikomi_tesuryo?: number | null;
  bank_code?: string;
  bank_name?: string;
  bank_branch_code?: string;
  bank_branch_name?: string;
  yokin_shubetsu?: number | null;
  koza_no?: string;
  koza_meigi?: string;
  haiten_flg?: boolean;
  biko?: string;
}

/** Update body — hanbaiten_code 更新不可 (api.md §API-017-003 注記). */
export type UpdateHanbaitenBody = Omit<CreateHanbaitenBody, 'hanbaiten_code'>;

export interface HanbaitenDetailResponse {
  data: HanbaitenDetail;
}

export interface HanbaitenWriteResponse {
  data: HanbaitenDetail;
  message: string;
}

/** GET /api/v1/hanbaiten/:hanbaiten_id — ACSMS-API-017-001. */
export async function getHanbaiten(
  hanbaitenId: number,
): Promise<HanbaitenDetailResponse> {
  const res = await axiosInstance.get<HanbaitenDetailResponse>(
    `/api/v1/hanbaiten/${hanbaitenId}`,
  );
  return res.data;
}

/** POST /api/v1/hanbaiten — ACSMS-API-017-002. */
export async function createHanbaiten(
  body: CreateHanbaitenBody,
): Promise<HanbaitenWriteResponse> {
  const res = await axiosInstance.post<HanbaitenWriteResponse>(
    '/api/v1/hanbaiten',
    body,
  );
  return res.data;
}

/** PUT /api/v1/hanbaiten/:hanbaiten_id — ACSMS-API-017-003. */
export async function updateHanbaiten(
  hanbaitenId: number,
  body: UpdateHanbaitenBody,
): Promise<HanbaitenWriteResponse> {
  const res = await axiosInstance.put<HanbaitenWriteResponse>(
    `/api/v1/hanbaiten/${hanbaitenId}`,
    body,
  );
  return res.data;
}

// ─── ACSMS-SCR-019 — 販売店Excelデータ取込画面 ────────────────────────

/**
 * 取込モード（顧客要件 2026-07：全項目更新を廃止し 新規登録/更新 の2択に統合）。
 * UPDATE は selected_columns の列のみ更新。全列更新は「すべて選択」で全列を含める。
 */
export type ImportMode = 'NEW' | 'UPDATE';

export interface ImportHanbaitenRow {
  hanbaiten_code: string;
  hanbaiten_name?: string;
  hanbaiten_name_kana?: string;
  torihikisaki_no?: string;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  shocho_name?: string;
  itaku_kubun?: number;
  haitatsuryo_tanka_code?: string;
  bank_code?: string;
  bank_name?: string;
  haitatsuryo_shiharai_cycle?: number;
  bank_branch_code?: string;
  bank_branch_name?: string;
  yokin_shubetsu?: number;
  koza_no?: string;
  koza_meigi?: string;
  furikomi_tesuryo_futan_kubun?: number;
  furikomi_tesuryo?: number;
  biko?: string;
  haiten_flg?: boolean;
}

export interface ImportHanbaitenBody {
  import_mode: ImportMode;
  selected_columns: string[];
  rows: ImportHanbaitenRow[];
}

export interface ImportHanbaitenResult {
  data: {
    import_mode: ImportMode;
    total_rows: number;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    imported_at: string;
  };
  message: string;
}

/** GET /api/v1/hanbaiten/import/template — ACSMS-API-019-001. */
export async function downloadHanbaitenImportTemplate(): Promise<Blob> {
  const res = await axiosInstance.get<Blob>(
    '/api/v1/hanbaiten/import/template',
    { responseType: 'blob' },
  );
  return res.data;
}

/** POST /api/v1/hanbaiten/import — ACSMS-API-019-002. */
export async function importHanbaitenExcel(
  body: ImportHanbaitenBody,
): Promise<ImportHanbaitenResult> {
  const res = await axiosInstance.post<ImportHanbaitenResult>(
    '/api/v1/hanbaiten/import',
    body,
  );
  return res.data;
}
