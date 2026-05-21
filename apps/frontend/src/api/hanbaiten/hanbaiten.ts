// Hand-written wrapper around the /api/v1/hanbaiten endpoints.
// Functions here are what SCR-018 (HanbaitenListView) imports and what its
// unit spec mocks via vi.mock('@/api/hanbaiten/hanbaiten').
// Shapes mirror docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md (v1.2).

import axiosInstance from '@/api/axios-instance';

export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
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
  /** m_code.code_category='TESURYO_KUBUN' — v1.2 rename: 旧「手数料区分」. */
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
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
  page?: number;
  per_page?: number;
  sort_by?: 'hanbaiten_code' | 'hanbaiten_name';
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
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
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
  tesuryo_kubun?: number | null;
  tesuryo_amount?: number | null;
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

export type ImportMode = 'NEW' | 'UPDATE_ALL' | 'UPDATE_PARTIAL';

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
  tesuryo_kubun?: number;
  tesuryo_amount?: number;
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
