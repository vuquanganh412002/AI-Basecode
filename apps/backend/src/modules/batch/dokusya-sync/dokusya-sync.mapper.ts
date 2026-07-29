import {
  DokusyaShubetsu,
  TetsuzukiShurui,
  ShiharaiHoho,
  DenshiShoninStatus,
} from '@/common/enums';
import {
  DOKUSYASO_BUNRUI_CODES,
  NOGYOSYA_BUNRUI_CODES,
} from '@/common/constants/dokusya-bunrui.constant';
import {
  GENDER_MALE,
  GENDER_FEMALE,
  GENDER_UNANSWERED,
} from '@/common/constants/gender.constant';
import {
  DENSHI_DOKUSYA_SHUBETSU_MURYO,
  DENSHI_DOKUSYA_SHUBETSU_YURYO,
} from '@/common/constants/denshi-dokusya-shubetsu.constant';
import { MAIL_MAGAZINE_FLG_OFF } from '@/common/constants/mail-magazine-flg.constant';
import { YUBIN_KUBUN_NASHI } from '@/common/constants/yubin-kubun.constant';
import type { DokusyaFields } from '@/modules/dokusya/dokusya-history.types';

/**
 * 電子版 `users`（顧客CMS）→ クラウド版 `t_dokusya` 変換（純ロジック・DI/DB なし）。
 * 行データ + FK解決結果を受け取り `DokusyaFields`（Partial<DokusyaRireki> camelCase）を返す。
 * FK解決（JACd→管理支店/JA, ShopCd→販売店）は呼び出し側で行う。
 * 未確定の値対応（plan §9）は先頭の変換表定数に集約（顧客確定後はここだけ直す）。
 */

/** MySQL ドライバが返す 1 行（列名キーの緩い型）。 */
export type DenshiUserRow = Record<string, unknown>;

/** service が解決して渡す FK。JACd→管理支店/JA, ShopCd→販売店。 */
export interface DenshiFkResolution {
  jaId: number;
  kanriShitenId: number | null;
  hanbaitenId: number | null;
}

// ─── 電子版 users のコード値（変換の入力側・外部システム仕様）──────────

/**
 * 電子版 status（0新規/1再読/2変更/3新規A/9解約）のうち解約。
 * mapTetsuzuki の判定と service 側の解約分岐（applyChange 前の停止判定）が
 * 同じ値を見るため、ここを唯一の定義とし service は import して使う。
 */
export const DENSHI_STATUS_KAIYAKU = 9;

// ─── 変換表（§6・顧客確定後はここを更新）─────────────────────────────

/**
 * 有効な支払方法コード集合。payment_id を shiharai_hoho と 1:1 で突合するのに使う。
 */
const VALID_SHIHARAI_HOHO: ReadonlySet<number> = new Set<number>(
  Object.values(ShiharaiHoho),
);

/**
 * profession → 購読者層分類(dokusyaso_bunrui) 対応。クラウド側も電子版と同じ
 * コード値で保存する（顧客要件 2026-07）ため identity。未知コードを落とす
 * フィルタとして表の形を保つ。0農業者/1JAグループ役職員/2企業・団体/3学生/999その他。
 */
const PROFESSION_TO_BUNRUI: Record<string, string> = Object.fromEntries(
  DOKUSYASO_BUNRUI_CODES.map((c) => [c, c]),
);

/**
 * products → 農業者分類(nogyosya_bunrui) 対応（identity・カンマ区切り）。
 * 電子版: 0米/1野菜/2果実/3花/4畜産/5酪農/999その他。
 */
const PRODUCTS_TO_BUNRUI: Record<string, string> = Object.fromEntries(
  NOGYOSYA_BUNRUI_CODES.map((c) => [c, c]),
);

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
  if (n === 1) return GENDER_MALE;
  if (n === 0) return GENDER_FEMALE;
  return GENDER_UNANSWERED; // 未入力
}

/** status(0新規/1再読/2変更/3新規A/9解約) → tetsuzuki_shurui(0解約/1新規)。 */
export function mapTetsuzuki(status: unknown): number {
  return numOrNull(status) === DENSHI_STATUS_KAIYAKU
    ? TetsuzukiShurui.KAIYAKU
    : TetsuzukiShurui.SHINKI;
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

/** payment_id → shiharai_hoho（1:1。未設定/不明は その他）。 */
function mapShiharai(paymentId: unknown): number {
  const pid = numOrNull(paymentId);
  // 電子版 payment_id は cloud の支払方法コードと同一体系（例: 6=クレジットカード）
  // で 1:1。有効な支払方法コードならそのまま採用し、未設定/不明は その他(9)。
  if (pid !== null && VALID_SHIHARAI_HOHO.has(pid)) return pid;
  return ShiharaiHoho.SONOTA;
}

/** member_type(1無料/2有料) → denshi_dokusya_shubetsu(0無料/1有料)。 */
function mapDenshiSubtype(memberType: unknown): number | null {
  const n = numOrNull(memberType);
  if (n === 1) return DENSHI_DOKUSYA_SHUBETSU_MURYO;
  if (n === 2) return DENSHI_DOKUSYA_SHUBETSU_YURYO;
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

  // 購読開始日は `activated_at`（会員有効化日）が正。実データには未有効化のまま
  // 収集対象になっている会員が居り（2026-07-29 実データ検証で 23,662 件中 95 件）、
  // NULL のままだと t_dokusya.shoki_dokusya_kaishi_date(NOT NULL) 違反で行ごと落ちる。
  // 「申込日 → 会員作成日」の順にフォールバックして取り込む（いずれも実際に読者が
  // 電子版へ入った日として説明可能な値）。3つとも無い行は service 側で skip する。
  const kaishiDate =
    toIsoDate(u.activated_at) ??
    toIsoDate(u.application_date) ??
    toIsoDate(u.created_at);

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
    mailMagazineFlg: numOrNull(u.melmaga) ?? MAIL_MAGAZINE_FLG_OFF,
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
    yubinKubun: YUBIN_KUBUN_NASHI,
    shiharaiHoho: mapShiharai(u.payment_id),
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
