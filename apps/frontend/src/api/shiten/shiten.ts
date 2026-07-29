import axiosInstance from '@/api/axios-instance';

// ─── ACSMS-SCR-006 — 支店マスタ明細検索画面 ────────────────────────────

/**
 * `GET /api/v1/shiten`（ACSMS-API-006-001）の行の形。
 * `docs/design/ACSMS-SCR-006/ACSMS-SCR-006-api.md §レスポンスデータ` 準拠。
 *
 * `ShitenDetail` に `kanri_shiten_name` を追加 — 一覧レスポンスは
 * `m_kanri_shiten` から一括 JOIN し、行ごとの追加往復なしに親支店名を表示できる。
 */
export interface ShitenListItem {
  shiten_id: number;
  ja_id: number;
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  kinyu_shiten_flg: boolean;
  kanri_shiten_id: number;
  kanri_shiten_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface ShitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ShitenListResponse {
  data: ShitenListItem[];
  meta: ShitenListMeta;
}

/** `GET /api/v1/shiten` のクエリDTO。 */
export interface ListShitenQuery {
  shiten_name?: string;
  shiten_code?: string;
  kanri_shiten_id?: number;
  jastem_toriatsukai_tenpo_code?: string;
  /** undefined = 全選択（フィルタなし）、true = 金融機関支店、false = 金融機関支店以外。 */
  kinyu_shiten_flg?: boolean;
  page?: number;
  per_page?: number;
  /** ソート可能列: ローカル2列（画面定義§8.1）+ JOIN 1列（kanri_shiten_name）。 */
  sort_by?: 'shiten_code' | 'shiten_name' | 'kanri_shiten_name';
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/shiten/:shiten_id` のレスポンス。 */
export interface ShitenDeleteResponse {
  message: string;
}

export async function listShiten(
  query: ListShitenQuery = {},
): Promise<ShitenListResponse> {
  const res = await axiosInstance.get<ShitenListResponse>('/api/v1/shiten', {
    params: query,
  });
  return res.data;
}

export async function removeShiten(
  shitenId: number,
): Promise<ShitenDeleteResponse> {
  const res = await axiosInstance.delete<ShitenDeleteResponse>(
    `/api/v1/shiten/${shitenId}`,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON — 支店 dropdown (consumed by SCR-011) ────────────

/**
 * 引落口座支店 / 配達先支店 dropdown 用の最小 projection。フォーム view は
 * 口座引落クラスタ向けにクライアント側で `kinyu_shiten_flg=true` で絞る
 * （画面設計書 SCR-011 §10.1:「支店マスタの金融機関支店フラグ=1」のもののみ表示）。
 * `kanri_shiten_id` を含め、追加往復なしに親 管理支店 選択に連鎖できる。
 */
export interface ShitenDropdownItem {
  shiten_id: number;
  shiten_code: string;
  shiten_name: string;
  kanri_shiten_id: number;
  kinyu_shiten_flg: boolean;
  /**
   * 任意 — JASTEM 店舗 項目を自動補完する 引落口座支店 picker がレスポンスを
   * 使う場合に BE が含める。非金融機関支店の dropdown では省略される。
   */
  jastem_toriatsukai_tenpo_code?: string;
  jastem_tenpo_name?: string;
}

export interface ShitenDropdownEnvelope {
  data: ShitenDropdownItem[];
  /**
   * 任意のカーソルページング meta。旧呼び出し元は `{ data }` のみを期待し、
   * 新しい dropdown view（SCR-011）は無限スクロール用に `has_more` を使う。
   * 両形が型チェックを通るよう optional のまま。
   */
  meta?: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface ShitenDropdownQuery {
  /** 任意の JA フィルタ（NICHINO_* 代行入力のみ — JA スコープのロールは session.ja_id 優先）。 */
  ja_id?: number;
  /** true = 金融機関支店のみ（引落口座支店 picker）、false / undefined = 全件。 */
  kinyu_shiten_flg?: boolean;
  /**
   * 管理支店IDで絞込み（ACSMS-API-COMMON-006）。SCR-015 は選択した 管理支店 に
   * 支店 dropdown を連鎖させる。BE が呼び出し元のセッションスコープ内かを
   * 検証する（クエリ改ざんガード）。
   */
  kanri_shiten_id?: number;
  q?: string;
  page?: number;
  per_page?: number;
}

/**
 * GET /api/v1/shiten/dropdown — SCR-011（購読者情報登録）共通 dropdown
 * ルックアップ。最小 projection を返し、dropdown が数千行を payload を
 * 重くせず描画できるようにする。
 */
export async function getShitenDropdown(
  query: ShitenDropdownQuery = {},
): Promise<ShitenDropdownEnvelope> {
  const res = await axiosInstance.get<ShitenDropdownEnvelope>(
    '/api/v1/shiten/dropdown',
    { params: query },
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-008 — 口座支店 dropdown 取得（定義元: ACSMS-SCR-020） ──

/** 口座支店ドロップダウンの1行（金融機関支店フラグ=TRUE のみ）。 */
export interface KozaShitenDropdownItem {
  shiten_id: number;
  shiten_code: string;
  shiten_name: string;
  kanri_shiten_id: number;
  // SCR-020: 選択した口座支店ごとに JASTEM 金融機関支店情報を表示する。
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

export interface KozaShitenDropdownEnvelope {
  data: KozaShitenDropdownItem[];
}

/**
 * GET /api/v1/shiten/koza-dropdown — 口座支店（kinyu_shiten_flg=TRUE）の
 * プルダウン。SCR-020 の引落口座支店ピッカーで使用。DataScope は BE が自動適用。
 * 任意の kanri_shiten_ids（カンマ区切り）で絞込。
 */
export async function getKozaShitenDropdown(
  query: { kanri_shiten_ids?: number[] } = {},
): Promise<KozaShitenDropdownEnvelope> {
  const params =
    query.kanri_shiten_ids && query.kanri_shiten_ids.length > 0
      ? { kanri_shiten_ids: query.kanri_shiten_ids.join(',') }
      : {};
  const res = await axiosInstance.get<KozaShitenDropdownEnvelope>(
    '/api/v1/shiten/koza-dropdown',
    { params },
  );
  return res.data;
}

// ─── ACSMS-SCR-007 — 支店マスタ登録画面 ──────────────────────────────

/**
 * `GET /api/v1/shiten/:id` および POST/PUT レスポンスの body が返す完全な詳細。
 * `docs/design/ACSMS-SCR-007/ACSMS-SCR-007-api.md §レスポンスデータ` 準拠。
 */
export interface ShitenDetail {
  shiten_id: number;
  ja_id: number;
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  kinyu_shiten_flg: boolean;
  // JASTEM 店舗単位 4 列（database-design.md §m_shiten rows 7-10、
  // ※空文字許容 — BE は未設定値を null ではなく '' でシリアライズ）。
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
  kanri_shiten_id: number;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/shiten のリクエスト body。 */
export interface CreateShitenRequest {
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana?: string;
  kanri_shiten_id: number;
  kinyu_shiten_flg?: boolean;
  jastem_toriatsukai_tenpo_code?: string;
  jastem_tenpo_name?: string;
  jastem_tyokin_shubetsu?: string;
  jastem_koza_no?: string;
  biko?: string;
}

/**
 * PUT /api/v1/shiten/:id — api.md §3 注記に従い `shiten_code`（作成後は不変）を除く。
 * `ja_id` も body に含めない（セッションから導出）。
 */
export type UpdateShitenRequest = Omit<CreateShitenRequest, 'shiten_code'>;

export interface ShitenEnvelope {
  data: ShitenDetail;
}

export interface ShitenWriteEnvelope {
  data: ShitenDetail;
  message: string;
}

export async function getShiten(shitenId: number): Promise<ShitenEnvelope> {
  const res = await axiosInstance.get<ShitenEnvelope>(`/api/v1/shiten/${shitenId}`);
  return res.data;
}

export async function createShiten(
  body: CreateShitenRequest,
): Promise<ShitenWriteEnvelope> {
  const res = await axiosInstance.post<ShitenWriteEnvelope>('/api/v1/shiten', body);
  return res.data;
}

export async function updateShiten(
  shitenId: number,
  body: UpdateShitenRequest,
): Promise<ShitenWriteEnvelope> {
  const res = await axiosInstance.put<ShitenWriteEnvelope>(
    `/api/v1/shiten/${shitenId}`,
    body,
  );
  return res.data;
}
