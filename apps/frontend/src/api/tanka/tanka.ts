import axiosInstance from '@/api/axios-instance';

// 単価マスタ (m_tanka) 用の手書き API wrapper。
// `apps/frontend/src/api/ja/ja.ts` と同構造 — 共有 axiosInstance の薄いラッパで、
// この境界で envelope をほどき view にクリーンな形を渡す。以下の interface が
// FE 側でのこれら型の単一ソース（docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md 準拠）。
//
// SCR-002 は listTanka + removeTanka を提供。SCR-003（create/update/detail）で
// getTanka / createTanka / updateTanka を追加予定。後続を機械的にするため
// ja.ts と並行構造を保つ。

/**
 * `GET /api/v1/tanka`（ACSMS-API-002-001）の行の形。
 * `docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md` §レスポンスデータ 準拠。
 */
export interface TankaListItem {
  tanka_id: number;
  /** m_code.code_category='TANKA_TYPE' — 1=新聞購読料, 2=配達手数料. */
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  /** YYYY-MM-DD */
  tekiyo_start_date: string;
  /** YYYY-MM-DD — null = 無期限 (open-ended). */
  tekiyo_end_date: string | null;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
  /** 運用者が手動制御する無効化フラグ（適用日とは独立）。 */
  active_flg: boolean;
  /** キャンペーンフラグ — TRUE: 有効, FALSE: 無効. */
  campaign_flg: boolean;
}

export interface TankaListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TankaListResponse {
  data: TankaListItem[];
  meta: TankaListMeta;
}

/** `GET /api/v1/tanka` のクエリDTO。 */
export interface ListTankaQuery {
  tanka_type?: number;
  tanka_name?: string;
  /**
   * `tekiyo_start_date`（YYYY-MM-DD）の下限。適用開始日がこの日以降の行が通る。
   * api.md §4.3 — `tekiyo_start_date >= 指定値`。
   */
  tekiyo_start_date?: string;
  /**
   * `tekiyo_end_date`（YYYY-MM-DD）の上限。適用終了日がこの日以前の行が通る。
   * NULL（無期限）行は除外 — api.md §4.3 参照。
   */
  tekiyo_end_date?: string;
  /**
   * `true` = 有効中のみ、`false` = 停止中のみ、`undefined` = 両方（省略時）。
   * api.md §4.3 で BE は未指定を「両方」扱い。
   */
  active_flg?: boolean;
  /**
   * `true` = キャンペーン有効のみ、`false` = 無効のみ、`undefined` = 両方（省略時）。
   * `active_flg` と同様、BE は未指定を「両方」扱い。
   */
  campaign_flg?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/tanka/:tanka_id` のレスポンス形。 */
export interface TankaDeleteResponse {
  message: string;
}

/**
 * `GET /api/v1/tanka/:tanka_id`（ACSMS-API-003-001）の詳細形 +
 * `POST /api/v1/tanka`（003-002）+ `PUT /api/v1/tanka/:tanka_id`（003-003）の body。
 * `TankaListItem` の上位集合で `ja_id`, `biko`, `created_at`, `updated_at` を追加
 * （api.md §レスポンスデータ）。
 */
export interface TankaDetail {
  tanka_id: number;
  ja_id: number;
  /** m_code.code_category='TANKA_TYPE' — 1=新聞購読料, 2=配達手数料. */
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
  /** YYYY-MM-DD */
  tekiyo_start_date: string;
  /** YYYY-MM-DD — null = 無期限 (open-ended). */
  tekiyo_end_date: string | null;
  active_flg: boolean;
  /** キャンペーンフラグ — TRUE: 有効, FALSE: 無効. */
  campaign_flg: boolean;
  /** NOT NULL。空欄時は '' 既定。 */
  biko: string;
  /** ISO 8601 (TIMESTAMPTZ)。 */
  created_at: string;
  /** ISO 8601 — 初回更新まで null。 */
  updated_at: string | null;
}

/** POST /api/v1/tanka のリクエスト body — ACSMS-API-003-002。 */
export interface CreateTankaRequest {
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  tax_rate?: number;
  kingaku_zeikomi?: number;
  kingaku_zeinuki?: number;
  tekiyo_start_date: string;
  tekiyo_end_date: string;
  biko?: string;
  active_flg?: boolean;
  /** キャンペーンフラグ — 省略時は FALSE. */
  campaign_flg?: boolean;
}

/**
 * PUT /api/v1/tanka/:id のリクエスト body — Create から `tanka_code` を除いた形
 * （api.md §API-003-003 注記「tanka_code は更新不可」で不変）。
 */
export type UpdateTankaRequest = Omit<CreateTankaRequest, 'tanka_code'>;

export interface TankaEnvelope {
  data: TankaDetail;
}

export interface TankaWriteEnvelope {
  data: TankaDetail;
  message: string;
}

export async function listTanka(
  query: ListTankaQuery = {},
): Promise<TankaListResponse> {
  const res = await axiosInstance.get<TankaListResponse>('/api/v1/tanka', {
    params: query,
  });
  return res.data;
}

export async function removeTanka(tankaId: number): Promise<TankaDeleteResponse> {
  const res = await axiosInstance.delete<TankaDeleteResponse>(
    `/api/v1/tanka/${tankaId}`,
  );
  return res.data;
}

export async function getTanka(tankaId: number): Promise<TankaEnvelope> {
  const res = await axiosInstance.get<TankaEnvelope>(
    `/api/v1/tanka/${tankaId}`,
  );
  return res.data;
}

export async function createTanka(
  body: CreateTankaRequest,
): Promise<TankaWriteEnvelope> {
  const res = await axiosInstance.post<TankaWriteEnvelope>(
    '/api/v1/tanka',
    body,
  );
  return res.data;
}

export async function updateTanka(
  tankaId: number,
  body: UpdateTankaRequest,
): Promise<TankaWriteEnvelope> {
  const res = await axiosInstance.put<TankaWriteEnvelope>(
    `/api/v1/tanka/${tankaId}`,
    body,
  );
  return res.data;
}

// ─── GET /api/v1/tanka/dropdown ────────────────────────────────────────
// 軽量なページング + 検索リスト — SCR-017 販売店作成フォームの 配達手数料単価
// 項目で使用。`BaseTankaDropdown` 参照。

export interface TankaDropdownItem {
  tanka_id: number;
  tanka_code: string;
  tanka_name: string;
  tanka_type: number;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  /**
   * ログイン中アカウントの JA の税区分 (m_ja.zei_kubun) で BE が解決した
   * 表示用金額。zei_kubun=1(内税)→税込、=2(外税)→税抜。単価ドロップダウンの
   * ラベル「単価名 + 半角スペース + 金額」に用いる。
   */
  kingaku: number;
}

export interface TankaDropdownResponse {
  data: TankaDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface TankaDropdownQuery {
  /** tanka_name のみ ILIKE（tanka_code は UI 非表示）。 */
  q?: string;
  /** m_code.code_category=TANKA_TYPE の値。SCR-017 は 2（配達手数料）を渡す。 */
  tanka_type?: number;
  /**
   * 明示的な JA フィルタ — NICHINO_STAFF 代行入力でフォームが先に JA を選ぶ場合用。
   * 呼び出し元セッションが JA スコープの時は無視される。
   */
  ja_id?: number;
  page?: number;
  per_page?: number;
  /** 編集フォーム用の抜け道 — page 1 に無い場合 BE がこの tanka_id を先頭に付加。 */
  include_id?: number;
}

export async function getTankaDropdown(
  query: TankaDropdownQuery = {},
): Promise<TankaDropdownResponse> {
  const res = await axiosInstance.get<TankaDropdownResponse>(
    '/api/v1/tanka/dropdown',
    { params: query },
  );
  return res.data;
}
