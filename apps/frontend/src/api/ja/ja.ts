import axiosInstance from '@/api/axios-instance';

/** `GET /api/v1/ja/:ja_id`（および POST/PUT の body）のレスポンス形。 */
export interface JaDetail {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  ja_name_kana: string;
  todofuken_code: string;
  todofuken_name?: string;
  chuokai_flg: boolean;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  tanto_busho: string;
  tanto_name: string;
  zei_kubun: string;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/ja のリクエスト body。 */
export interface CreateJaRequest {
  ja_code: string;
  ja_name: string;
  ja_name_kana?: string;
  todofuken_code: string;
  chuokai_flg: boolean;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
  tanto_busho?: string;
  tanto_name?: string;
  zei_kubun: string;
  jastem_itakusha_code?: string;
  jastem_itakusha_name?: string;
  jastem_ja_code?: string;
  jastem_ja_name?: string;
  biko?: string;
}

/** PUT /api/v1/ja/:ja_id — CreateJaRequest から不変の ja_code を除いた形。 */
export type UpdateJaRequest = Omit<CreateJaRequest, 'ja_code'>;

export interface JaEnvelope {
  data: JaDetail;
}

export interface JaWriteEnvelope {
  data: JaDetail;
  message: string;
}

export async function getJa(jaId: number): Promise<JaEnvelope> {
  const res = await axiosInstance.get<JaEnvelope>(`/api/v1/ja/${jaId}`);
  return res.data;
}

export async function createJa(body: CreateJaRequest): Promise<JaWriteEnvelope> {
  const res = await axiosInstance.post<JaWriteEnvelope>('/api/v1/ja', body);
  return res.data;
}

export async function updateJa(
  jaId: number,
  body: UpdateJaRequest,
): Promise<JaWriteEnvelope> {
  const res = await axiosInstance.put<JaWriteEnvelope>(`/api/v1/ja/${jaId}`, body);
  return res.data;
}

// ─── ACSMS-SCR-004 — JAマスタ明細検索画面 ────────────────────────────

/**
 * `GET /api/v1/ja`（ACSMS-API-004-001）の行の形。`JaDetail` の部分集合
 * （`docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md` §レスポンスデータ 準拠）。
 */
export interface JaListItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  yubin_no: string;
  todofuken_code: string;
  todofuken_name: string;
  tel: string;
  address: string;
  fax: string;
  chuokai_flg: boolean;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
}

export interface JaListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface JaListResponse {
  data: JaListItem[];
  meta: JaListMeta;
}

/** `GET /api/v1/ja` のクエリDTO。 */
export interface ListJaQuery {
  ja_code?: string;
  ja_name?: string;
  /** m_todofuken.code（2文字）。ACSMS-API-COMMON-001 dropdown から取得。 */
  todofuken_code?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/ja/:ja_id` のレスポンス形。 */
export interface JaDeleteResponse {
  message: string;
}

export async function listJa(query: ListJaQuery = {}): Promise<JaListResponse> {
  const res = await axiosInstance.get<JaListResponse>('/api/v1/ja', { params: query });
  return res.data;
}

export async function removeJa(jaId: number): Promise<JaDeleteResponse> {
  const res = await axiosInstance.delete<JaDeleteResponse>(`/api/v1/ja/${jaId}`);
  return res.data;
}

/** `GET /api/v1/ja/dropdown`（ACSMS-API-COMMON-003）の軽量な行の形。 */
export interface JaDropdownItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  todofuken_code: string;
  chuokai_flg: boolean;
}

export interface JaDropdownResponse {
  data: JaDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

/** `GET /api/v1/ja/dropdown` のクエリDTO。 */
export interface JaDropdownQuery {
  /** ja_code OR ja_name の部分一致（ILIKE）。`match_field` 参照。 */
  q?: string;
  /**
   * 'both'（既定）= ja_code OR ja_name、'name' = ja_name のみ。
   * SCR-024 アカウント一覧は UI で ja_code を隠すため 'name' を使う。
   */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  /** 編集フォーム用の抜け道 — page 1 に無い場合 BE がこの ja_id を先頭に付加。 */
  include_id?: number;
  /** カスケードフィルタ — m_ja.todofuken_code の完全一致。 */
  todofuken_code?: string;
  /** カスケードフィルタ — 3:chuokai_flg=TRUE、4|5:chuokai_flg=FALSE。 */
  role_id?: number;
  /**
   * DataScope 範囲（既定 `own`）。`todofuken` は **中央会のみ** 自JAでなく
   * 自都道府県の全JAを候補にする。SCR-022 ファイルダウンロード画面専用。
   * 拡大先の県は BE がセッションから決めるため、他県は指定できない。
   */
  scope?: 'own' | 'todofuken';
}

export async function getJaDropdown(
  query: JaDropdownQuery = {},
): Promise<JaDropdownResponse> {
  const res = await axiosInstance.get<JaDropdownResponse>(
    '/api/v1/ja/dropdown',
    { params: query },
  );
  return res.data;
}
