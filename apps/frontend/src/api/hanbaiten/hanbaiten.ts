// /api/v1/hanbaiten 用の手書き wrapper。
// SCR-018 (HanbaitenListView) が import し、unit spec が
// vi.mock('@/api/hanbaiten/hanbaiten') でモックする関数群。
// 型は docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md (v1.2) に準拠。

import axiosInstance from '@/api/axios-instance';

export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
  /** m_ja.ja_code から JOIN（api.md §4.5）。 */
  ja_code: string;
  /** m_ja.ja_name から JOIN（api.md §4.5）。 */
  ja_name: string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  todofuken_code: string;
  /** m_todofuken.todofuken_name から JOIN（api.md v1.2 §4.5）。 */
  todofuken_name: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  /** m_code.code_category='ITAKU_KUBUN' — FE は useCodesStore でラベル解決。 */
  itaku_kubun: number | null;
  /** 月数。v1.2 改名: 旧「支払区分」。 */
  haitatsuryo_shiharai_cycle: number | null;
  /** m_code.code_category='TESURYO_KUBUN' — 振込手数料負担区分。 */
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

/** `GET /api/v1/hanbaiten` のクエリDTO（ACSMS-API-018-001）。 */
export interface ListHanbaitenQuery {
  hanbaiten_code?: string;
  hanbaiten_name?: string;
  tel?: string;
  fax?: string;
  address?: string;
  shocho_name?: string;
  /** true:廃店レコードも含む / false（既定）:廃店を除外。 */
  haiten_flg?: boolean;
  /**
   * 有効単価フラグ（SCR-021 error gate 連携・顧客要件2026-07 改訂）。参照する配達
   * 手数料単価(tanka_type=2)の active_flg で絞り込む: true=有効単価を参照する販売店
   * のみ、false=失効単価を参照する販売店のみ、省略=両方（送らない）。
   */
  active_tanka_flg?: boolean;
  /**
   * [staff-ja-filter] NICHINO_STAFF（session.ja_id == null）が代行入力一覧の
   * BaseJaDropdown で検索スコープの JA を指定する。他ロールは無視され、BE は
   * 常に session.ja_id を使う。
   */
  ja_id?: number;
  page?: number;
  per_page?: number;
  /**
   * 既定は `updated_at`（最終更新順）— クリック可能な列ではなく、新規作成/取込/
   * 更新された販売店が先頭に来る初期表示順。UI のソートヘッダは
   * `hanbaiten_code` / `hanbaiten_name`。
   */
  sort_by?: 'hanbaiten_code' | 'hanbaiten_name' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/hanbaiten/:hanbaiten_id` のレスポンス形。 */
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

// ─── ACSMS-API-COMMON — 販売店 dropdown（SCR-011 で使用） ─────────

/**
 * 購読者情報登録（SCR-011）の販売店コード dropdown 用の最小 projection。
 * サーバ側で呼び出し元の JA スコープに絞る（BE service が元クエリに
 * `applyJaScope` を適用）。
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
  /** 任意の JA フィルタ（NICHINO_* 代行入力のみ — JA スコープのロールは session.ja_id 優先）。 */
  ja_id?: number;
  q?: string;
  /** 'both'（既定）は hanbaiten_code OR hanbaiten_name、'name' は名前のみ一致。 */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  /** 編集モードのピン — 選択 id を page 1 に強制しラベルを解決させる。 */
  include_id?: number;
  /** true → 営業中(haiten_flg=false)のみ。購読者の販売店選択（登録/編集）用。 */
  active_only?: boolean;
}

/**
 * GET /api/v1/hanbaiten/dropdown — SCR-011 共通 dropdown ルックアップ。
 * 最小 projection を返し dropdown が安価にページングできるようにする。
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

// ─── SCR-017 — 販売店情報登録画面（Detail / Create / Update） ────────────
//
// 型は docs/design/ACSMS-SCR-017/ACSMS-SCR-017-api.md (v1.2 — todofuken_code +
// itaku_kubun=1 時の条件付き必須 bank 項目を追加) に準拠。

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
   * [staff-ja-id] NICHINO_STAFF 代行入力ではフォームの BaseJaDropdown で ja_id を
   * 明示指定する（このロールは session.ja_id が null）。他ロールが送っても BE service
   * は無視し session.ja_id を使うため、クロステナント注入は不可。
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

/** Update body — hanbaiten_code は更新不可（api.md §API-017-003 注記）。 */
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
