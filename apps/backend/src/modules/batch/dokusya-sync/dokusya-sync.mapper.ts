import {
  DokusyaShubetsu,
  TetsuzukiShurui,
  ShiharaiHoho,
  DenshiShoninStatus,
} from '@/common/enums';
import type { DokusyaFields } from '@/modules/dokusya/dokusya-history.types';

/**
 * 電子版 `users`（顧客 CMS のビュー）→ クラウド版 `t_dokusya` 変換（純ロジック）。
 *
 * 正典: docs/demo/20260723_読者管理連携用API使用方法.xlsx シート
 * 「電子版→クラウド版で同期される情報」＋「T_会員情報」。DI/DB を持たず、行データと
 * FK 解決結果だけを受け取り `DokusyaFields`（= Partial<DokusyaRireki> camelCase）を返す。
 * FK 解決（JACd→管理支店/JA, ShopCd→販売店）は呼び出し側（service）で行う。
 *
 * 未確定の値対応（docs/dokusya-sync-implementation-plan.md §9）は本ファイル先頭の
 * 変換表定数に集約し、顧客確定後はここだけ直せばよいようにする。
 */

/** MySQL ドライバが返す 1 行（列名キーの緩い型）。 */
export type DenshiUserRow = Record<string, unknown>;

/** service が解決して渡す FK。JACd→管理支店/JA, ShopCd→販売店。 */
export interface DenshiFkResolution {
  jaId: number;
  kanriShitenId: number | null;
  hanbaitenId: number | null;
}

// ─── 変換表（§6・顧客確定後はここを更新）─────────────────────────────

/**
 * payment_id → shiharai_hoho（顧客回答 2026-07-27・規則確定）:
 *   JA集金 → 1(口座振替) / 無料 → 9(その他) / クレカ決済 → 6(クレジットカード)
 * ※ payment_id の具体値↔支払方法名の対応（数値割当）は要ヒアリング（§9 残）。
 *   確定するまでは「無料(member_type=1)→9、それ以外→1(口座振替=JA集金の初回連動)」を
 *   既定とし、クレカに該当する payment_id が判明したら本マップに追加する。
 */
const PAYMENT_ID_TO_SHIHARAI: Record<number, number> = {
  // 例: 3: ShiharaiHoho.CREDIT_CARD,  ← クレカの payment_id が判明したら追加
};

/**
 * profession → 購読者層分類(dokusyaso_bunrui) の m_code 値対応（§9 残・暫定 identity）。
 * 電子版: 0農業者/1JAグループ役職員/2企業・団体/3学生/999その他。
 * クラウド m_code(DOKUSYASO_BUNRUI) の具体コード確定後に差し替える。
 */
const PROFESSION_TO_BUNRUI: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '999': '999',
};

/**
 * products → 農業者分類(nogyosya_bunrui) の m_code 値対応（§9 残・暫定 identity）。
 * 電子版: 0米/1野菜/2果実/3花/4畜産/5酪農/999その他（カンマ区切り）。
 */
const PRODUCTS_TO_BUNRUI: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '999': '999',
};

// ─── 値ヘルパ ────────────────────────────────────────────────────────

/** 文字列化（null/undefined → ''）。前後空白は保持（住所等）。 */
function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
    return String(v);
  }
  if (v instanceof Date) return v.toISOString();
  return ''; // 想定外の型（オブジェクト等）は空扱い — users 列はスカラのみ
}

/** 数値化（空・非数値 → null）。 */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** DATETIME/DATE 値（Date or 文字列）→ 'YYYY-MM-DD'（無効・空は null）。 */
function toIsoDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // JST 運用。MySQL DATETIME は tz なしの壁時計なので日付部だけ切り出す。
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = str(v).trim();
  const m = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 郵便番号: zip1(上3)+zip2(下4) をハイフン無し連結（7桁想定）。 */
function joinZip(zip1: unknown, zip2: unknown): string {
  return (str(zip1) + str(zip2)).replace(/\D/g, '');
}

/** 都道府県: pref_id → 2桁コード（暫定: JIS 1..47 を '01'..'47'。§9 で確定）。 */
function prefToTodofuken(prefId: unknown): string {
  const n = numOrNull(prefId);
  if (n === null || n <= 0) return '';
  return String(n).padStart(2, '0');
}

/** sex(0女/1男/未入力) → gender(1男/2女/9回答しない)。 */
function mapGender(sex: unknown): number {
  const n = numOrNull(sex);
  if (n === 1) return 1; // 男性
  if (n === 0) return 2; // 女性
  return 9; // 未入力 → 回答しない
}

/** status(0新規/1再読/2変更/3新規A/9解約) → tetsuzuki_shurui(0解約/1新規)。 */
export function mapTetsuzuki(status: unknown): number {
  return numOrNull(status) === 9 ? TetsuzukiShurui.KAIYAKU : TetsuzukiShurui.SHINKI;
}

/** approval(0未承認/1承認済/2非承認/9対象外) → denshi_shonin_status（9→NULL）。 */
function mapShoninStatus(approval: unknown): number | null {
  const n = numOrNull(approval);
  switch (n) {
    case 0:
      return DenshiShoninStatus.PENDING;
    case 1:
      return DenshiShoninStatus.APPROVED;
    case 2:
      return DenshiShoninStatus.REJECTED;
    default:
      return null; // 9:対象外（社内/クレカ/無料）・不明
  }
}

/** payment_id + member_type → shiharai_hoho（§6・§9 の既定則）。 */
function mapShiharai(paymentId: unknown, memberType: unknown): number {
  const pid = numOrNull(paymentId);
  if (pid !== null && PAYMENT_ID_TO_SHIHARAI[pid] !== undefined) {
    return PAYMENT_ID_TO_SHIHARAI[pid];
  }
  // 無料会員（member_type=1）→ その他(9)。それ以外は JA集金の初回連動 → 口座振替(1)。
  return numOrNull(memberType) === 1
    ? ShiharaiHoho.SONOTA
    : ShiharaiHoho.KOZA_HIKIOTOSHI;
}

/** member_type(1無料/2有料) → denshi_dokusya_shubetsu(0無料/1有料)。 */
function mapDenshiSubtype(memberType: unknown): number | null {
  const n = numOrNull(memberType);
  if (n === 1) return 0; // 無料
  if (n === 2) return 1; // 有料
  return null;
}

/** カンマ区切りコード列を対応表でマッピングして再結合（未知値は捨てる）。 */
function mapCsvCodes(raw: unknown, table: Record<string, string>): string {
  const s = str(raw).trim();
  if (s === '') return '';
  return s
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '' && table[c] !== undefined)
    .map((c) => table[c])
    .join(',');
}

/** remarks1〜5 を改行連結（空はスキップ）。 */
function joinRemarks(u: DenshiUserRow): string {
  return [u.remarks1, u.remarks2, u.remarks3, u.remarks4, u.remarks5]
    .map((r) => str(r).trim())
    .filter((r) => r !== '')
    .join('\n');
}

// ─── メイン変換 ──────────────────────────────────────────────────────

/**
 * 電子版 `users` 1 行 → `DokusyaFields`（履歴/マスタ書込み用の業務項目一式）。
 * NOT NULL 列は必ず値を埋める（空文字/既定値でフォールバック）。
 * `dokusya_shubetsu` は paper_permission_dt の有無で 併読(3)/電子版(2) を判定。
 * 配達先は 電子版=購読者と同じ(TRUE) / 併読=paper_* を採用(FALSE)。
 */
export function mapUserToDokusyaFields(
  u: DenshiUserRow,
  fk: DenshiFkResolution,
): DokusyaFields {
  // 併読判定: paper_permission_dt に日付があれば併読(3)、なければ電子版(2)。
  const isHeidoku = toIsoDate(u.paper_permission_dt) !== null;
  const shubetsu = isHeidoku ? DokusyaShubetsu.BOTH : DokusyaShubetsu.DIGITAL;
  const haitatsuSameFlg = !isHeidoku; // 電子版=TRUE / 併読=FALSE

  const kaishiDate = toIsoDate(u.activated_at);

  // 配達先住所: 電子版(same=TRUE)は購読者住所、併読(same=FALSE)は paper_*。
  const haitatsu = haitatsuSameFlg
    ? {
        yubinNo: joinZip(u.zip1, u.zip2),
        todofukenCode: prefToTodofuken(u.pref_id),
        shikuchoson: str(u.addr),
        chomeBanchi: str(u.city),
        tatemonoMei: str(u.building),
      }
    : {
        yubinNo: joinZip(u.paper_zip, ''),
        todofukenCode: prefToTodofuken(u.paper_pref_id),
        shikuchoson: str(u.paper_addr),
        chomeBanchi: str(u.paper_city),
        tatemonoMei: str(u.paper_building),
      };

  return {
    // ─ 識別・FK ─
    jaId: fk.jaId,
    kanriShitenId: fk.kanriShitenId,
    shitenId: null,
    kumiaiinCode: '',
    // ※ denshi_kaiin_id は履歴(t_dokusya_rireki)には無く master(t_dokusya)専用列。
    //   CREATE 後に service が master へ直接 set する（DokusyaFields には含めない）。
    // ─ 種別 ─
    dokusyaShubetsu: shubetsu,
    tetsuzukiShurui: mapTetsuzuki(u.status),
    denshiDokusyaShubetsu: mapDenshiSubtype(u.member_type),
    // ─ 氏名 ─
    shimeiSei: str(u.first_name),
    shimeiMei: str(u.last_name),
    shimeiKanaSei: str(u.first_kana),
    shimeiKanaMei: str(u.last_kana),
    // ─ 契約 ─
    dokusyaBusu: 1, // 電子版は 1 契約=1 部固定
    // ─ 購読者住所 ─
    yubinNo: joinZip(u.zip1, u.zip2),
    todofukenCode: prefToTodofuken(u.pref_id),
    shikuchoson: str(u.addr),
    chomeBanchi: str(u.city),
    tatemonoMei: str(u.building),
    renrakusaki1: str(u.tel1),
    renrakusaki2: str(u.tel2),
    email: str(u.email),
    mailMagazineFlg: numOrNull(u.melmaga) ?? 0,
    birthYear: numOrNull(u.birthyear),
    gender: mapGender(u.sex),
    // ─ 配達先 ─
    haitatsuSameFlg,
    haitatsuYubinNo: haitatsu.yubinNo,
    haitatsuTodofukenCode: haitatsu.todofukenCode,
    haitatsuShikuchoson: haitatsu.shikuchoson,
    haitatsuChomeBanchi: haitatsu.chomeBanchi,
    haitatsuTatemonoMei: haitatsu.tatemonoMei,
    haitatsuRenrakusaki1: '',
    haitatsuRenrakusaki2: '',
    haitatsuShimeiSei: '',
    haitatsuShimeiMei: '',
    haitatsuShimeiKanaSei: '',
    haitatsuShimeiKanaMei: '',
    // ─ 販売店・単価・支払 ─
    hanbaitenId: fk.hanbaitenId, // 併読のみ実店/電子版単独はダミー（service 解決）
    tankaId: null, // 承認時に画面登録
    yubinKubun: '0',
    shiharaiHoho: mapShiharai(u.payment_id, u.member_type),
    dokusyaryoShiharaiCycle: numOrNull(u.payment_cycle),
    bankBranchCode: '',
    bankBranchName: '',
    hikiotoshiYokinShubetsu: null,
    hikiotoshiKozaNo: '',
    hikiotoshiKozaMeigi: '',
    // ─ 分類 ─
    dokusyasoBunrui: mapCsvCodes(u.profession, PROFESSION_TO_BUNRUI),
    nogyosyaBunrui: mapCsvCodes(u.products, PRODUCTS_TO_BUNRUI),
    // ─ 日付 ─
    shokiDokusyaKaishiDate: kaishiDate,
    dokusyaKaishiDate: kaishiDate,
    dokusyaChushiDate: toIsoDate(u.deleted_at),
    seikyuKaishiMonth: str(u.payment_start_ym),
    // ─ その他 ─
    biko: joinRemarks(u),
    denshiShoninStatus: mapShoninStatus(u.approval),
    honshiKodokuFlg: numOrNull(u.subscribe_flg) === 1,
  };
}
