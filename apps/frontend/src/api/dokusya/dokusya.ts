// /api/v1/dokusya 用の手書き API wrapper。
//
// ACSMS-SCR-011 は 6 endpoint を提供（api.md §1）:
//   GET  /:id           → getDokusya         (ACSMS-API-011-001)
//   POST /              → createDokusya      (ACSMS-API-011-002)
//   PUT  /:id           → updateDokusya      (ACSMS-API-011-003)
//   PUT  /:id/approve   → approveDokusya     (ACSMS-API-011-004)
//   PUT  /:id/reject    → rejectDokusya      (ACSMS-API-011-005)
//   GET  /:id/history   → getDokusyaHistory  (ACSMS-API-011-006)
//
// 型は apps/backend/src/modules/dokusya/dto/* に準拠 — BE レスポンス変更時は
// このファイルを手動更新する。正確な JSON 形は integration spec
// apps/backend/test/integration/dokusya.integration.spec.ts が現行の参照。

import axiosInstance from '@/api/axios-instance';

/**
 * `GET /api/v1/dokusya/:id` および POST/PUT/approve/reject レスポンスの
 * `data` フィールドが返す完全な詳細。
 */
export interface DokusyaDetail {
  dokusya_id: number;
  ja_id: number;
  // 管理支店/支店は未設定のことがある (BE は NULL を返す。0 ではない)。
  kanri_shiten_id: number | null;
  shiten_id: number | null;
  kumiaiin_code: string;
  /** m_code.code_category='DOKUSYA_SHUBETSU' — 1=紙版, 2=電子版, 3=併読. */
  dokusya_shubetsu: number;
  /** m_code.code_category='TETSUZUKI_SHURUI' — 0=解約, 1=新規. */
  tetsuzuki_shurui: number;
  denshi_dokusya_shubetsu: number | null;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  dokusya_busu: number;
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  /** m_code.code_category='MAIL_MAGAZINE_FLG' — 0=配信しない, 1=配信する。電子版用項目のため紙版時は null. */
  mail_magazine_flg: number | null;
  birth_year: number | null;
  /** m_code.code_category='GENDER'. */
  gender: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no: string;
  haitatsu_todofuken_code: string;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_renrakusaki_1: string;
  haitatsu_renrakusaki_2: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  haitatsu_shimei_kana_sei: string;
  haitatsu_shimei_kana_mei: string;
  hanbaiten_id: number | null;
  hanbaiten_name: string;
  tanka_id: number | null;
  tanka_name: string;
  /** m_code.code_category='YUBIN_KUBUN' — '0'=空, '1'=郵送. */
  yubin_kubun: string;
  /** m_code.code_category='SHIHARAI_HOHO' — 1=口座引落, 2=現金集金, etc. */
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle: number | null;
  /** shiharai_hoho=1 の時 m_shiten の逆引きで解決。 */
  bank_shiten_id: number | null;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  /** m_code.code_category='YOKIN_SHUBETSU' — 1=普通, 2=当座. */
  hikiotoshi_yokin_shubetsu: number | null;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  /** m_code.code_category='DOKUSYASO_BUNRUI' — 単一選択だが列は CSV VARCHAR。 */
  dokusyaso_bunrui: string;
  /** 購読者層分類=農業者(0) の時だけ true になりうる。 */
  ja_yakushokuin_flg: boolean;
  /** 購読者層分類=企業・団体(2) の時だけ true になりうる。 */
  nogyo_kankei_flg: boolean;
  /** 購読者層分類=その他(999) の時だけ値を持ちうる。 */
  dokusyaso_bunrui_sonota: string;
  /** m_code.code_category='NOGYOSYA_BUNRUI' — 複数選択の CSV。 */
  nogyosya_bunrui: string;
  /** 農業者分類に その他(999) を含む時だけ値を持ちうる。 */
  nogyosya_bunrui_sonota: string;
  /** YYYY-MM-DD. */
  shoki_dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD — 解約でない時は null。 */
  dokusya_chushi_date: string | null;
  /** YYYY-MM-DD — 未設定は null。設定時は未来日必須。 */
  joho_henko_tekiyo_date: string | null;
  /** YYYYMM — 未設定は ''。 */
  seikyu_kaishi_month: string;
  biko: string;
  rireki_no: number;
  /** denshi_shonin_status — null=非電子版, 0=承認待ち, 1=承認, 2=否認。 */
  denshi_shonin_status: number | null;
  /**
   * 電子版会員ID — 外部システムの会員ID。外部連携機能（後続開発）が設定する
   * 読取専用値。未連携は null。
   */
  denshi_kaiin_id: number | null;
  /**
   * 本紙購読フラグ — 電子版読者管理システムの users.subscribe_flg
   * （0:未購読 → false / 1:購読 → true）を連携した読取専用値。
   * 購読種別=電子版のとき「紙版購読状況　有り」の表示判定に使う。
   */
  honshi_kodoku_flg: boolean;
  created_at: string;
  updated_at: string;
  /**
   * 有効な解約予約(kaiyaku_flg=true, 取消除外)が存在するか（顧客要件 2026-07）。
   * true の間は追加の解約予約を禁止（購読中止日 disabled）。変更は履歴画面で当該
   * 解約を取消してから。
   */
  has_active_kaiyaku: boolean;
  /**
   * 履歴の最終変更適用日(MAX joho・取消除外)。解約予定日はこの日以降のみ指定可
   * （購読中止日 picker の disabled-date 基準）。履歴なしは null。
   */
  max_joho_date: string | null;
}

/**
 * POST /api/v1/dokusya のリクエスト body（ACSMS-API-011-002）。
 *
 * `ja_id` と `dokusya_id` は意図的に含めない — `ja_id` はサーバ側でセッションから
 * 導出、`dokusya_id` は自動採番。BE は `forbidNonWhitelisted` で除去/拒否する。
 */
export interface CreateDokusyaRequest {
  kanri_shiten_id?: number | null;
  shiten_id?: number | null;
  kumiaiin_code?: string;
  dokusya_shubetsu: number;
  tetsuzuki_shurui: number;
  shimei_sei: string;
  shimei_mei: string;
  shimei_kana_sei: string;
  shimei_kana_mei: string;
  dokusya_busu: number;
  yubin_no: string;
  todofuken_code: string;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei?: string;
  renrakusaki_1: string;
  renrakusaki_2?: string;
  email?: string;
  mail_magazine_flg?: number | null;
  birth_year?: number | null;
  gender?: number | null;
  haitatsu_same_flg: boolean;
  haitatsu_yubin_no?: string;
  haitatsu_todofuken_code?: string;
  haitatsu_shikuchoson?: string;
  haitatsu_chome_banchi?: string;
  haitatsu_tatemono_mei?: string;
  haitatsu_renrakusaki_1?: string;
  haitatsu_renrakusaki_2?: string;
  haitatsu_shimei_sei?: string;
  haitatsu_shimei_mei?: string;
  haitatsu_shimei_kana_sei?: string;
  haitatsu_shimei_kana_mei?: string;
  hanbaiten_id: number;
  tanka_id: number;
  yubin_kubun?: string;
  shiharai_hoho: number;
  dokusyaryo_shiharai_cycle?: number | null;
  /** shiharai_hoho=1（口座引落）の時は必須。 */
  bank_shiten_id?: number | null;
  hikiotoshi_yokin_shubetsu?: number | null;
  hikiotoshi_koza_no?: string;
  hikiotoshi_koza_meigi?: string;
  dokusyaso_bunrui?: string;
  /**
   * 従属 4 項目。親の分類が条件コードを含まない場合は BE 側で false / '' に
   * 落とされる（電子版 API の条件付き項目 profession_and_* / others_* と 1:1 で、
   * 不整合な組合せは push 時に弾かれるため）。
   */
  ja_yakushokuin_flg?: boolean;
  nogyo_kankei_flg?: boolean;
  dokusyaso_bunrui_sonota?: string;
  nogyosya_bunrui?: string;
  nogyosya_bunrui_sonota?: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_chushi_date?: string | null;
  /**
   * YYYY-MM-DD — 読者情報変更適用日。販売店・支払方法を含む全変更の唯一の適用日
   * （顧客要件 2026-07: 販売店適用日を廃止し joho に統一。1更新1レコード）。
   */
  joho_henko_tekiyo_date?: string | null;
  /** YYYYMM. */
  seikyu_kaishi_month?: string;
  biko?: string;
}

/**
 * PUT /api/v1/dokusya/:id — Create と同一構造（api.md §ACSMS-API-011-003）に加え、
 * 情報変更モード `change_mode`（当日変更/予約変更・顧客要件2026-07）を持つ。
 *
 * `dokusya_chushi_date`（購読中止日）は本APIでは扱わない（顧客要件 2026-07 改訂）。
 * 停止は専用エンドポイント `POST /api/v1/dokusya/:id/stop`（stopDokusya）へ分離。
 * BE 側も UpdateDokusyaDto で `@IsEmpty` により混入を 400 で弾く。
 */
export type UpdateDokusyaRequest = Omit<
  CreateDokusyaRequest,
  'dokusya_chushi_date'
> & {
  /** 'today'=当日変更（適用日=本日固定） / 'reserved'=予約変更（未来日）。 */
  change_mode?: 'today' | 'reserved';
};

/** GET 詳細レスポンスの envelope — `{ data: DokusyaDetail }`。 */
export interface DokusyaEnvelope {
  data: DokusyaDetail;
}

/** POST/PUT/approve/reject レスポンスの envelope — `message` を追加。 */
export interface DokusyaMutationEnvelope {
  data: DokusyaDetail;
  message: string;
}

/** `GET /api/v1/dokusya/:id/history`（ACSMS-API-011-006）の1行。 */
export interface DokusyaHistoryItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  tetsuzuki_shurui: number;
  saishin_data_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  zougen_hokoku_flg: boolean;
  denshi_shonin_status: number | null;
  created_at: string;
  created_by: string;
}

export interface DokusyaHistoryEnvelope {
  data: DokusyaHistoryItem[];
}

// ─── Endpoint functions ──────────────────────────────────────────────

/** GET /api/v1/dokusya/:id — ACSMS-API-011-001. */
export async function getDokusya(dokusyaId: number): Promise<DokusyaEnvelope> {
  const res = await axiosInstance.get<DokusyaEnvelope>(
    `/api/v1/dokusya/${dokusyaId}`,
  );
  return res.data;
}

/**
 * GET /api/v1/dokusya/:id/effective-at?joho=YYYY-MM-DD — ACSMS-API-011-004.
 * 予約変更(未来日)編集の基準行: 指定 joho 時点で有効な履歴行(findBefore)を
 * 詳細レスポンス形で返す。フォームは予約変更モードでこれをロードし、editGuard の
 * baseline にする（BE の timeline-diff と一致させ、直前行と異なる変更だけ検出）。
 */
export async function getDokusyaEffectiveAt(
  dokusyaId: number,
  joho: string,
): Promise<DokusyaEnvelope> {
  const res = await axiosInstance.get<DokusyaEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/effective-at`,
    { params: { joho } },
  );
  return res.data;
}

/** POST /api/v1/dokusya — ACSMS-API-011-002. */
export async function createDokusya(
  body: CreateDokusyaRequest,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.post<DokusyaMutationEnvelope>(
    '/api/v1/dokusya',
    body,
  );
  return res.data;
}

/** PUT /api/v1/dokusya/:id — ACSMS-API-011-003. */
export async function updateDokusya(
  dokusyaId: number,
  body: UpdateDokusyaRequest,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}`,
    body,
  );
  return res.data;
}

/**
 * POST /api/v1/dokusya/:id/stop request body (ACSMS-API-014-004).
 * 購読中止（解約予約）— 購読中止日(解約予定日)だけを送る。紙版はカレンダー選択日、
 * 電子版は選択した終了月の月末日（FE が丸める）。どちらも `YYYY-MM-DD`。
 *
 * 空文字 `''` = 解約予約の取消（電子版のみ・顧客要件 2026-08）。ポップアップで
 * 終了月をクリアして確定したときに送る。BE は既存予約行を赤伝で無効化し、
 * 電子版へ `cancel`(cancel_ym 空) を push する。
 */
export interface StopDokusyaRequest {
  dokusya_chushi_date: string;
}

/** POST /api/v1/dokusya/:id/stop — ACSMS-API-014-004 (購読中止・予約変更・予約取消). */
export async function stopDokusya(
  dokusyaId: number,
  body: StopDokusyaRequest,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.post<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/stop`,
    body,
  );
  return res.data;
}

/**
 * 承認/否認 画面で編集できる項目（支払方法 + 引落口座4項目・#56524）。
 * 省略したキーは変更されない。
 */
export interface DenshiShoninEditBody {
  shiharai_hoho?: number;
  bank_shiten_id?: number;
  hikiotoshi_yokin_shubetsu?: number;
  hikiotoshi_koza_no?: string;
  hikiotoshi_koza_meigi?: string;
}

/** PUT /api/v1/dokusya/:id/approve のボディ（ACSMS-API-011-004）。 */
export interface ApproveDokusyaBody extends DenshiShoninEditBody {
  tanka_id?: number;
}

/**
 * PUT /api/v1/dokusya/:id/approve — ACSMS-API-011-004 (電子版承認).
 * 承認待ち画面で編集した新聞単価・支払方法・引落口座4項目を任意で同時保存する
 * （省略時は変更なし）。
 */
export async function approveDokusya(
  dokusyaId: number,
  body?: ApproveDokusyaBody,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/approve`,
    body && Object.keys(body).length > 0 ? body : undefined,
  );
  return res.data;
}

/**
 * PUT /api/v1/dokusya/:id/reject — ACSMS-API-011-005 (電子版否認).
 * 否認時も支払方法・引落口座4項目を同時保存できる（#56524）。
 */
export async function rejectDokusya(
  dokusyaId: number,
  body?: DenshiShoninEditBody,
): Promise<DokusyaMutationEnvelope> {
  const res = await axiosInstance.put<DokusyaMutationEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/reject`,
    body && Object.keys(body).length > 0 ? body : undefined,
  );
  return res.data;
}

/** GET /api/v1/dokusya/:id/history — ACSMS-API-011-006. */
export async function getDokusyaHistory(
  dokusyaId: number,
): Promise<DokusyaHistoryEnvelope> {
  const res = await axiosInstance.get<DokusyaHistoryEnvelope>(
    `/api/v1/dokusya/${dokusyaId}/history`,
  );
  return res.data;
}

// ─── ACSMS-SCR-014 — 購読者明細検索画面 ──────────────────────────────
//
// 3 endpoint（api.md ACSMS-SCR-014）:
//   GET    /api/v1/dokusya            → listDokusya         (API-014-001)
//   DELETE /api/v1/dokusya/:id        → removeDokusya       (API-014-002)
//   GET    /api/v1/dokusya/export     → exportDokusyaExcel  (API-014-003)

/** `GET /api/v1/dokusya` レスポンスの1行 — api.md §レスポンスデータ 準拠。 */
export interface DokusyaListItem {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  /** 手続種類 — m_code TETSUZUKI_SHURUI (0:解約, 1:新規). */
  tetsuzuki_shurui: number;
  renrakusaki_1: string;
  renrakusaki_2: string;
  /** 配送先連絡先１ — haitatsu_renrakusaki_1（空文字許容）。 */
  haitatsu_renrakusaki_1: string;
  /** 配達先氏名 — haitatsu_shimei_sei + haitatsu_shimei_mei（連結・trim）。 */
  haitatsu_full_name: string;
  haitatsu_yubin_no: string;
  haitatsu: string;
  hanbaiten_id: number | null;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
  denshi_shonin_status: number | null;
  shoki_dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  /** 編集/削除不可の行の時 true（CC/併読/海外配送 等）。 */
  is_read_only: boolean;
}

/** `GET /api/v1/dokusya` の検索 + ページング + ソートパラメータ。 */
export interface DokusyaSearchParams {
  kanri_shiten_id?: number;
  shiten_id?: number;
  kumiaiin_code?: string;
  bank_branch?: string;
  full_name?: string;
  full_name_kana?: string;
  renrakusaki?: string;
  haitatsu?: string;
  hanbaiten_id?: number;
  email?: string;
  yubin_kubun?: string;
  tanka_id?: number;
  biko?: string;
  seikyu_kaishi_month_from?: string;
  seikyu_kaishi_month_to?: string;
  shoki_dokusya_kaishi_date_from?: string;
  shoki_dokusya_kaishi_date_to?: string;
  dokusya_chushi_date_from?: string;
  dokusya_chushi_date_to?: string;
  dokusya_shubetsu?: number;
  denshi_shonin_status?: number;
  tetsuzuki_shurui?: number;
  joho_henko_tekiyo_date_from?: string;
  joho_henko_tekiyo_date_to?: string;
  shiharai_hoho?: number;
  /**
   * 有効単価フラグ（SCR-020 error gate 連携・顧客要件2026-07 改訂）。参照する購読料
   * 単価(tanka_type=1)の active_flg で絞り込む: true=有効単価を参照する購読者のみ、
   * false=失効単価を参照する購読者のみ、省略=両方（送らない）。
   */
  active_tanka_flg?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** `GET /api/v1/dokusya/export` のフィルタのみパラメータ（page/sort なし）。 */
export type DokusyaExportParams = Omit<
  DokusyaSearchParams,
  'page' | 'per_page' | 'sort_by' | 'sort_order'
>;

export interface DokusyaListResponse {
  data: DokusyaListItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    /**
     * 検索条件に一致する購読者の購読部数合計（顧客要件 2026-08）。
     * 一覧では「全 N 件　全 M 部」と併記する。件数と同じ絞り込みで集計され、
     * ページングの影響を受けない（表示中のページではなく全件の合計）。
     */
    total_busu: number;
  };
}

/** GET /api/v1/dokusya — ACSMS-API-014-001. */
export async function listDokusya(
  params: DokusyaSearchParams = {},
): Promise<DokusyaListResponse> {
  const res = await axiosInstance.get<DokusyaListResponse>(
    '/api/v1/dokusya',
    { params },
  );
  return res.data;
}

/** DELETE /api/v1/dokusya/:id — ACSMS-API-014-002（論理削除）。 */
export async function removeDokusya(
  dokusyaId: number,
): Promise<{ message: string }> {
  const res = await axiosInstance.delete<{ message: string }>(
    `/api/v1/dokusya/${dokusyaId}`,
  );
  return res.data;
}

/**
 * GET /api/v1/dokusya/export — ACSMS-API-014-003。
 *
 * 生の Blob を返し、呼び出し元が `URL.createObjectURL` に渡してブラウザ
 * ダウンロードを起こせるようにする。wrapper は page / per_page / sort_by /
 * sort_order を転送しない — api.md §014-003 に従い呼び出し側で意図的に除去
 * （BE も無視する）。
 */
export async function exportDokusyaExcel(
  params: DokusyaExportParams = {},
): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/dokusya/export', {
    params,
    responseType: 'blob',
  });
  return res.data;
}

// ─── ACSMS-SCR-013 — 購読者履歴情報画面 ──────────────────────────────
//
// 1 endpoint（api.md ACSMS-API-013-001）:
//   GET /api/v1/dokusya/:id/rireki → getDokusyaRirekiList
//
// 完全なページング履歴リスト — getDokusyaHistory（SCR-011 /history、軽量 +
// ラベル付き）とは別物。コード値のみ返す（*_label なし）。view が
// useCodesStore でラベル解決。

/**
 * `GET /api/v1/dokusya/:id/rireki` の1行 — api.md §レスポンスデータ #2-#61 準拠。
 * null 許容は api.md の「Nullable」列（`〇` → `| null`）に一致。
 */
export interface DokusyaRirekiItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  /** m_code.code_category='DOKUSYA_SHUBETSU'（1:紙版, 2:電子版, 3:併読）。*/
  dokusya_shubetsu: number;
  /** m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'（0:無料, 1:有料）。紙版は null。*/
  denshi_dokusya_shubetsu: number | null;
  /** 電子申込承認ステータス（0:未承認, 1:承認済み, 2:否認）。Web申込以外は null。*/
  denshi_shonin_status: number | null;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei_sei: string;
  shimei_mei: string;
  todofuken_code: string;
  todofuken_name: string | null;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  /** m_code.code_category='MAIL_MAGAZINE_FLG'。電子版用項目のため紙版時は null. */
  mail_magazine_flg: number | null;
  birth_year: number | null;
  /** m_code.code_category='GENDER'. */
  gender: number | null;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  /** 新聞単価 (m_tanka.tanka_id)。*/
  tanka_id: number | null;
  /** 新聞単価名。単価削除済み等は null。*/
  tanka_name: string | null;
  /** 新聞単価の表示金額（JA の税区分で BE 解決：内税→税込 / 外税→税抜）。*/
  tanka_kingaku: number | null;
  dokusya_busu: number;
  zenkai_dokusya_busu: number | null;
  haitatsu_yubin_no: string;
  zenkai_yubin_no: string | null;
  haitatsu_todofuken_code: string;
  haitatsu_todofuken_name: string | null;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  zenkai_todofuken_code: string | null;
  zenkai_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  hanbaiten_id: number | null;
  hanbaiten_name: string | null;
  zenkai_hanbaiten_id: number | null;
  zenkai_hanbaiten_name: string | null;
  /** m_code.code_category='TETSUZUKI_SHURUI'. */
  tetsuzuki_shurui: number;
  /** YYYY-MM-DD. */
  shoki_dokusya_kaishi_date: string;
  /** YYYY-MM-DD. */
  dokusya_kaishi_date: string;
  /** YYYY-MM-DD — 解約でない時は null。 */
  dokusya_chushi_date: string | null;
  /** YYYY-MM-DD — 未設定は null。 */
  joho_henko_tekiyo_date: string | null;
  saishin_data_flg: boolean;
  zougen_hokoku_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  /** 取消(赤伝)済みフラグ。対象行・打ち消し行の両方で true。*/
  torikeshi_flg: boolean;
  /** 備考。取消時は取消理由が記録される。*/
  biko: string;
  /**
   * この行を 取消 できるか（BE 判定）: 新規でない・取消済でない・チェーン末尾
   * (有効レコード)であること。FE の取消ボタン disable 判定に使う。
   */
  can_torikeshi: boolean;
  /** m_code.code_category='SHIHARAI_HOHO'（支払い方法）。*/
  shiharai_hoho: number;
  /** m_code.code_category='YUBIN_KUBUN'（郵送区分・'0':空/'1':郵送）。*/
  yubin_kubun: string;
  /** 購読料支払サイクル（月数 1〜12）。未設定は null。*/
  dokusyaryo_shiharai_cycle: number | null;
  /** m_code.code_category='YOKIN_SHUBETSU'. */
  hikiotoshi_yokin_shubetsu: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  created_at: string;
  created_by: string;
}

/** `GET /api/v1/dokusya/:id/rireki` のページング + ソートパラメータ。 */
export interface DokusyaRirekiParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DokusyaRirekiListResponse {
  data: DokusyaRirekiItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/** GET /api/v1/dokusya/:id/rireki — ACSMS-API-013-001. */
export async function getDokusyaRirekiList(
  dokusyaId: number,
  params: DokusyaRirekiParams = {},
): Promise<DokusyaRirekiListResponse> {
  const res = await axiosInstance.get<DokusyaRirekiListResponse>(
    `/api/v1/dokusya/${dokusyaId}/rireki`,
    { params },
  );
  return res.data;
}

/**
 * POST /api/v1/dokusya/:dokusya_id/rireki/:dokusya_rireki_id/torikeshi —
 * ACSMS-API-013-002. 履歴の取消(赤伝)。`reason` は取消理由（必須）で、対象行と
 * 打ち消し行の備考、および t_log に記録される。
 */
export async function torikeshiDokusyaRireki(
  dokusyaId: number,
  rirekiId: number,
  reason: string,
): Promise<{ message: string }> {
  const res = await axiosInstance.post<{ message: string }>(
    `/api/v1/dokusya/${dokusyaId}/rireki/${rirekiId}/torikeshi`,
    { reason },
  );
  return res.data;
}

// ─── ACSMS-SCR-015 — 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面） ────────────────────────
//
// 2 endpoint（api.md ACSMS-SCR-015）:
//   GET  /api/v1/dokusya/replace-hanbaiten/search → searchDokusyaForReplace (API-015-001)
//   POST /api/v1/dokusya/replace-hanbaiten        → replaceDokusyaHanbaiten  (API-015-002)
//
// 型は docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md に準拠。検索レスポンスは
// コード値のみ（dokusya_shubetsu / shiharai_hoho）— 表示用ではなく FE が
// 併読 / 電子版クレカ 行を除外するため（機能定義 4.1）に使う。

/** `GET /api/v1/dokusya/replace-hanbaiten/search` の1行 — API-015-001。 */
export interface ReplaceSearchItem {
  dokusya_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei: string;
  haitatsu_yubin_no: string;
  haitatsu_address: string;
  hanbaiten_id: number | null;
  hanbaiten_code: string;
  hanbaiten_name: string;
  /** m_code.code_category='DOKUSYA_SHUBETSU' — 1:紙版, 2:電子版, 3:併読. */
  dokusya_shubetsu: number;
  /** m_code.code_category='SHIHARAI_HOHO' — 1〜9 (6=クレジットカード). */
  shiharai_hoho: number;
}

/** 置換検索 endpoint の検索 + ページング + ソートパラメータ。 */
export interface ReplaceSearchParams {
  kanri_shiten_id?: number;
  shiten_id?: number;
  kumiaiin_code?: string;
  shimei?: string;
  shimei_kana?: string;
  haitatsu_address?: string;
  /** 配達販売店（任意）。指定時のみ有効履歴の販売店 = この値で追加絞り込み（置換元）。 */
  hanbaiten_id?: number;
  /** 置換先配達販売店（必須）。有効履歴の販売店 ≠ この値で絞り、置換ターゲットにもなる。 */
  new_hanbaiten_id: number;
  dokusya_kaishi_date_from?: string;
  dokusya_kaishi_date_to?: string;
  /** 情報変更適用日（必須）。紙版=未来日のみ／電子版=本日のみ。この日付で置換可能な購読者のみ返る。 */
  joho_henko_tekiyo_date: string;
  /** 購読種別（必須・1:紙版 / 2:電子版）。この種別で購読者を絞り込む。 */
  dokusya_shubetsu: number;
  page?: number;
  per_page?: number;
  sort_by?: 'kanri_shiten_name' | 'shiten_name' | 'kumiaiin_code' | 'hanbaiten_code';
  sort_order?: 'asc' | 'desc';
}

export interface ReplaceSearchResponse {
  data: ReplaceSearchItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/**
 * POST /api/v1/dokusya/replace-hanbaiten のリクエスト body — API-015-002。
 *
 * index signature により body を `Record<string, unknown>` に代入可能に保つ。
 * これにより SCR-015 spec が捕捉した mock 呼び出し引数（`mock.calls[0][0] as
 * Record<…>`）を検査できる — 全必須プロパティが固定型で、無いと TS は
 * `Record<string, unknown>` と非オーバーラップ扱いにするため。
 */
export interface ReplaceHanbaitenRequest {
  dokusya_ids: number[];
  new_hanbaiten_id: number;
  /** YYYY-MM-DD — 紙版=未来日のみ／電子版=本日のみ（種別依存）. */
  joho_henko_tekiyo_date: string;
  /** 購読種別（1:紙版 / 2:電子版）。適用日ルール判定 + 候補整合チェック用. */
  dokusya_shubetsu: number;
  [key: string]: unknown;
}

export interface ReplaceHanbaitenResult {
  data: {
    total_count: number;
    replaced_count: number;
    rireki_count: number;
    new_hanbaiten_id: number;
    /** ISO8601. */
    applied_at: string;
  };
  message: string;
}

/** GET /api/v1/dokusya/replace-hanbaiten/search — ACSMS-API-015-001. */
export async function searchDokusyaForReplace(
  params: ReplaceSearchParams,
): Promise<ReplaceSearchResponse> {
  const res = await axiosInstance.get<ReplaceSearchResponse>(
    '/api/v1/dokusya/replace-hanbaiten/search',
    { params },
  );
  return res.data;
}

/** POST /api/v1/dokusya/replace-hanbaiten — ACSMS-API-015-002. */
export async function replaceDokusyaHanbaiten(
  body: ReplaceHanbaitenRequest,
): Promise<ReplaceHanbaitenResult> {
  const res = await axiosInstance.post<ReplaceHanbaitenResult>(
    '/api/v1/dokusya/replace-hanbaiten',
    body,
  );
  return res.data;
}

// ─── ACSMS-SCR-016 — 購読者Excelデータ取込画面 ───────────────────────
//
// 2 endpoint（api.md ACSMS-SCR-016）:
//   GET  /api/v1/dokusya/import/template → downloadDokusyaImportTemplate (API-016-001)
//   POST /api/v1/dokusya/import          → importDokusyaExcel            (API-016-002)
//
// 型は docs/design/ACSMS-SCR-016/ACSMS-SCR-016-api.md に準拠。FE が .xlsx を
// クライアント側でパースし、ユーザーが列のサブセットを選び、パース済み行 +
// 選択した取込モードを POST する。

/**
 * 取込モードのワイヤ値 — FE ラジオ（new/update）がこれにマップ。
 * UPDATE は選択列のみ更新（空欄はスキップ）。全列更新したい時は「すべて選択」で
 * 全列をチェックする。旧 UPDATE_ALL（空欄→NULL）は廃止（顧客要件 2026-07）。
 */
export type DokusyaImportMode = 'NEW' | 'UPDATE';

/**
 * BE へ送る、パース済み Excel の1行。キーは api.md §テンプレートファイル仕様の
 * 49 物理列名（snake_case）。FE はアップロードファイルに存在するセルだけ
 * （かつユーザーがチェックを残した列だけ）転送するため、全列が optional。
 */
export type ImportDokusyaRow = Record<string, unknown>;

export interface ImportDokusyaBody {
  import_mode: DokusyaImportMode;
  /**
   * 購読種別（1:紙版 / 2:電子版）。画面ラジオで選択し全取込行へ一律適用する
   * 単一ソース（Excel の列ではない。顧客要件 2026-07: 取込を紙版/電子版の
   * 2モードに分離）。3:併読は取込不可。
   */
  dokusya_shubetsu: number;
  selected_columns: string[];
  rows: ImportDokusyaRow[];
  /**
   * spec が捕捉した mock 呼び出し引数を `mock.calls[0][0] as
   * Record<string, unknown>` で非オーバーラップの cast エラーなく検査できる
   * ようにする index signature（SCR-015 ReplaceHanbaitenRequest と同様）。
   */
  [key: string]: unknown;
}

export interface ImportDokusyaResult {
  data: {
    import_mode: DokusyaImportMode;
    total_rows: number;
    created_count: number;
    updated_count: number;
    cancelled_count: number;
    skipped_count: number;
    rireki_count: number;
    /** ISO8601. */
    imported_at: string;
  };
  message: string;
}

/** GET /api/v1/dokusya/import/template — ACSMS-API-016-001（バイナリ XLSX）。 */
export async function downloadDokusyaImportTemplate(): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/dokusya/import/template', {
    responseType: 'blob',
  });
  return res.data;
}

/** POST /api/v1/dokusya/import — ACSMS-API-016-002. */
export async function importDokusyaExcel(
  body: ImportDokusyaBody,
): Promise<ImportDokusyaResult> {
  const res = await axiosInstance.post<ImportDokusyaResult>(
    '/api/v1/dokusya/import',
    body,
  );
  return res.data;
}

// ─── ACSMS-SCR-010 — メニュー画面: 電子版読者承認待ち件数 ────────────────

export interface PendingApprovalCountResponse {
  data: { count: number; ja_id: number | null };
}

/**
 * GET /api/v1/dokusya/pending-approval/count — ACSMS-API-010-002.
 * 電子版読者の承認待ち件数（denshi_shonin_status=0）を DataScope 込みで取得。
 */
export async function getPendingApprovalCount(): Promise<PendingApprovalCountResponse> {
  const res = await axiosInstance.get<PendingApprovalCountResponse>(
    '/api/v1/dokusya/pending-approval/count',
  );
  return res.data;
}
