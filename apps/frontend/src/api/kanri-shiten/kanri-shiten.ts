import axiosInstance from '@/api/axios-instance';

// ─── ACSMS-SCR-008 — 管理支店マスタ明細検索画面 ──────────────────────────

/**
 * `GET /api/v1/kanri-shiten`（ACSMS-API-008-001）の行の形。
 * `docs/design/ACSMS-SCR-008/ACSMS-SCR-008-api.md §レスポンスデータ` 準拠。
 */
export interface KanriShitenListItem {
  kanri_shiten_id: number;
  ja_id: number;
  ja_name: string;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  yubin_no: string;
  todofuken_code: string;
  todofuken_name: string;
  address: string;
  tel: string;
  fax: string;
  paper_flg: boolean;
  denshi_flg: boolean;
}

export interface KanriShitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface KanriShitenListResponse {
  data: KanriShitenListItem[];
  meta: KanriShitenListMeta;
}

/** `GET /api/v1/kanri-shiten` のクエリDTO。 */
export interface ListKanriShitenQuery {
  kanri_shiten_code?: string;
  kanri_shiten_name?: string;
  todofuken_code?: string;
  tel?: string;
  fax?: string;
  page?: number;
  per_page?: number;
  /**
   * 画面定義§8.1 のユーザークリック可能な3ヘッダ + `updated_at`。後者は初回表示の
   * 暗黙の既定で、最近作成/更新された行が先頭に来る。
   */
  sort_by?:
    | 'kanri_shiten_code'
    | 'kanri_shiten_name'
    | 'todofuken_code'
    | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/kanri-shiten/:kanri_shiten_id` のレスポンス。 */
export interface KanriShitenDeleteResponse {
  message: string;
}

export async function listKanriShiten(
  query: ListKanriShitenQuery = {},
): Promise<KanriShitenListResponse> {
  const res = await axiosInstance.get<KanriShitenListResponse>(
    '/api/v1/kanri-shiten',
    { params: query },
  );
  return res.data;
}

export async function removeKanriShiten(
  kanriShitenId: number,
): Promise<KanriShitenDeleteResponse> {
  const res = await axiosInstance.delete<KanriShitenDeleteResponse>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-004 — Get Kanri Shiten Dropdown ────────────────

/**
 * dropdown レスポンスの1行。spec に沿った最小3列 projection — 完全な管理
 * 一覧は `listKanriShiten` 経由の admin 専用。
 */
export interface KanriShitenDropdownItem {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  /** 紙版取扱フラグ（SCR-011 購読種別による絞り込み用・顧客要件2026-07）。 */
  paper_flg: boolean;
  /** 電子版取扱フラグ（同上）。 */
  denshi_flg: boolean;
}

export interface KanriShitenDropdownEnvelope {
  data: KanriShitenDropdownItem[];
  /**
   * 任意のカーソルページング meta — 旧呼び出し元は `{ data }` のみを期待し、
   * 新しい dropdown 消費側（SCR-011）は無限スクロール用に `has_more` を読む。
   * 両形が型チェックを通るよう optional のまま。
   */
  meta?: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface KanriShitenDropdownQuery {
  ja_id: number;
  q?: string;
  /** 'both'（既定）は kanri_shiten_code OR kanri_shiten_name、'name' は名前のみ一致。 */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  include_id?: number;
}

/**
 * SCR-007 / SCR-024 / SCR-025 フォームが使う共通 dropdown ルックアップ。
 * 認証済みのみ — ロールゲートなし（呼び出し元の画面レベルガードが既に認可済み）。
 * spec: `docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004`。
 *
 * 後方互換: 数値 `jaId` を渡すと従来どおり全件取得（ページングなし）。
 * 検索/ページング/無限スクロールを使う呼び出し元（SCR-028 マルチセレクト等）は
 * クエリオブジェクト（q / page / per_page / match_field / include_id）を渡す。
 */
export async function getKanriShitenDropdown(
  arg: number | KanriShitenDropdownQuery,
): Promise<KanriShitenDropdownEnvelope> {
  const params = typeof arg === 'number' ? { ja_id: arg } : arg;
  const res = await axiosInstance.get<KanriShitenDropdownEnvelope>(
    '/api/v1/kanri-shiten/dropdown',
    { params },
  );
  return res.data;
}

// ─── ACSMS-SCR-009 — 管理支店マスタ登録画面 ──────────────────────────

/**
 * `GET /api/v1/kanri-shiten/:id` および POST/PUT レスポンスの body が返す完全な詳細。
 * `docs/design/ACSMS-SCR-009/ACSMS-SCR-009-api.md §レスポンスデータ` 準拠。
 */
export interface KanriShitenDetail {
  kanri_shiten_id: number;
  ja_id: number;
  /**
   * JA名（m_jaからJOIN）— JA_KANRI_SHITEN は ja.view 権限を持たないため
   * /api/v1/ja/dropdown を呼べない。詳細レスポンスにこの値を含めることで、
   * 編集フォームは BaseJaDropdown を呼ばずに親JA名を表示できる。
   */
  ja_name: string;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_name_kana: string;
  todofuken_code: string;
  todofuken_name?: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/kanri-shiten のリクエスト body。 */
export interface CreateKanriShitenRequest {
  ja_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_name_kana?: string;
  todofuken_code: string;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  paper_flg?: boolean;
  denshi_flg?: boolean;
  biko?: string;
}

/**
 * PUT /api/v1/kanri-shiten/:id — api.md §3 注記に従い `ja_id` と
 * `kanri_shiten_code`（作成後は不変）を除く。
 */
export type UpdateKanriShitenRequest = Omit<
  CreateKanriShitenRequest,
  'ja_id' | 'kanri_shiten_code'
>;

export interface KanriShitenEnvelope {
  data: KanriShitenDetail;
}

export interface KanriShitenWriteEnvelope {
  data: KanriShitenDetail;
  message: string;
}

export async function getKanriShiten(
  kanriShitenId: number,
): Promise<KanriShitenEnvelope> {
  const res = await axiosInstance.get<KanriShitenEnvelope>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
  );
  return res.data;
}

export async function createKanriShiten(
  body: CreateKanriShitenRequest,
): Promise<KanriShitenWriteEnvelope> {
  const res = await axiosInstance.post<KanriShitenWriteEnvelope>(
    '/api/v1/kanri-shiten',
    body,
  );
  return res.data;
}

export async function updateKanriShiten(
  kanriShitenId: number,
  body: UpdateKanriShitenRequest,
): Promise<KanriShitenWriteEnvelope> {
  const res = await axiosInstance.put<KanriShitenWriteEnvelope>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
    body,
  );
  return res.data;
}
