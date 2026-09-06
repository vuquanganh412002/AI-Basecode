import {
  DokusyaShubetsu,
  TetsuzukiShurui,
  ShiharaiHoho,
  DenshiShoninStatus,
} from '@/common/enums';
import {
  DOKUSYASO_BUNRUI_CODES,
  NOGYOSYA_BUNRUI_CODES,
  allowsDokusyasoBunruiSonota,
  allowsJaYakushokuinFlg,
  allowsNogyoKankeiFlg,
  allowsNogyosyaBunruiSonota,
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

/** 電子版の 1 桁フラグ（'0'|'1'）→ boolean。'1' 以外はすべて false。 */
function flagToBool(v: unknown): boolean {
  return numOrNull(v) === 1;
}

/** VARCHAR(255) 列へ入れる自由記述。超過分は切り捨てる。 */
function clampText255(v: unknown): string {
  return str(v).slice(0, 255);
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
  // 区切りあり（'2026-04-01' / '2026/04/01'）と、区切り無しの 8 桁（'20230220'）。
  // 後者は char(8) 列（paper_permission_dt / approval_date 等）の実フォーマットで、
  // これを受けないと「日付が入っているのに未設定扱い」になる。
  const m =
    /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(s) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  // '00000000' や '20239999' のような桁数だけ合う値を弾く。カレンダー上実在
  // するかまで見る（4/31 は Date が 5/1 へ繰り上がるので再確認する）。
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return `${y}-${mo}-${d}`;
}

/**
 * #57986: `payment_end_ym`（'YYYYMM'）を正規化する。6桁数字・月01〜12以外は null。
 * 解約分岐のゲート判定（現在年月との比較）と {@link paymentEndYmToChushiDate}
 * の両方がこの正規化済み文字列を基準にする。
 */
export function normalizePaymentYm(v: unknown): string | null {
  const s = str(v).trim();
  const m = /^(\d{4})(\d{2})$/.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return s;
}

/**
 * #57986: `payment_end_ym`（'YYYYMM'・支払済み最終月）→ 購読中止日（'YYYY-MM-DD'）。
 * 電子版/併読の中止日は「電子版が読める有効な最終日」（`insertKaiyaku` /
 * `insertScheduledKaiyaku` の denshi +1日ロジックと同じ定義 — 中止日の翌日から
 * 実際に読めなくなる）なので、**支払済み最終月の末日**とする
 * （例: '202609' → '2026-09-30'。9月分まで支払い済みなので9月末まで有効、
 * 実際に読めなくなるのは insertScheduledKaiyaku/insertKaiyaku が中止日+1日で
 * 適用日を算出する 10月1日）。不正な形式は null。
 */
export function paymentEndYmToChushiDate(v: unknown): string | null {
  const ym = normalizePaymentYm(v);
  if (ym === null) return null;
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(4, 6));
  // Date(year, month, 0) = 月初(day=1)の1日前 = `month`（1始まり）の末日。
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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

/**
 * denshi_shonin_status（電子版承認ステータス）。承認/否認ワークフロー自体が
 * 存在しないカテゴリは、電子版の approval 値を信用せず常に null にする
 * （不具合修正2026-08: 従来は approval=9(対象外) 頼みで判定していたが、実データで
 * これらのカテゴリでも approval が 0/1/2 のまま同期されてくる行があり、
 * SCR-011 の承認待ち(0)ワークフローに誤って乗ってしまっていた）。
 *
 * 優先順位（上から判定・screen-design.md ACSMS-SCR-011 #249,#316 の read-only
 * 対象と対応）:
 *   1. 電子版(2) かつ クレジットカード(6)                  → null（編集・削除不可の read-only 対象）
 *   2. 併読(3)                                             → null（電子版連携で完結・cloud は参照のみ）
 *   3. 電子版(2) かつ 無料会員(denshi_dokusya_shubetsu=0)  → null（無料は承認不要）
 *   4. それ以外（電子版・有料・クレカ以外＝承認ワークフロー対象）→ approval(0/1/2/9)を通常どおりマップ
 */
function mapShoninStatus(
  shubetsu: number,
  shiharaiHoho: number,
  denshiDokusyaShubetsu: number | null,
  approval: unknown,
): number | null {
  if (
    shubetsu === DokusyaShubetsu.DIGITAL &&
    shiharaiHoho === ShiharaiHoho.CREDIT_CARD
  ) {
    return null;
  }
  if (shubetsu === DokusyaShubetsu.BOTH) {
    return null;
  }
  if (
    shubetsu === DokusyaShubetsu.DIGITAL &&
    denshiDokusyaShubetsu === DENSHI_DOKUSYA_SHUBETSU_MURYO
  ) {
    return null;
  }
  const n = numOrNull(approval);
  switch (n) {
    case 0:
      return DenshiShoninStatus.PENDING;
    case 1:
      return DenshiShoninStatus.APPROVED;
    case 2:
      return DenshiShoninStatus.REJECTED;
    default:
      return null; // 9:対象外・不明
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

  // 従属項目のゲート判定に使うので、分類は返却リテラルの前に確定させる。
  const dokusyasoBunrui = mapCsvCodes(u.profession, PROFESSION_TO_BUNRUI);
  const nogyosyaBunrui = mapCsvCodes(u.products, PRODUCTS_TO_BUNRUI);

  // mapShoninStatus の優先判定（クレカ / 併読 / 無料）に使うので先に確定させる。
  const denshiDokusyaShubetsu = mapDenshiSubtype(u.member_type);
  const shiharaiHoho = mapShiharai(u.payment_id);

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
    denshiDokusyaShubetsu,
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
    shiharaiHoho,
    dokusyaryoShiharaiCycle: numOrNull(u.payment_cycle),
    bankBranchCode: '',
    bankBranchName: '',
    hikiotoshiYokinShubetsu: null,
    hikiotoshiKozaNo: '',
    hikiotoshiKozaMeigi: '',
    // ─ 分類 ─
    dokusyasoBunrui,
    nogyosyaBunrui,
    // 従属 4 項目（顧客DB設計 2026-08）。電子版 users の
    // profession_and_ja / profession_and_agri（0|1）→ BOOLEAN、
    // others_profession / others_products → 自由記述、で 1:1 に写す。
    //
    // 親の分類が条件コードを含むときだけ値を持たせるのは、列 COMMENT の
    // 「〜の場合のみ設定可 / 入力可」と画面・CRUD API の保存ルールに揃えるため。
    // 電子版側も同じ条件を自分の API で強制している（条件付き項目 V26〜V30）ので、
    // 正常に登録されたデータならこのゲートは素通りする。効くのは電子版の
    // バリデータを経由していない行（旧データ・DB 直編集）だけで、そこを
    // そのまま取り込むと今度はクラウドから push する時に弾かれる。
    //
    // 判定は取り込み後の値で行う。mapCsvCodes が未知コードを落とすため、
    // u.profession と dokusyasoBunrui は必ずしも一致しない。
    jaYakushokuinFlg:
      allowsJaYakushokuinFlg(dokusyasoBunrui) &&
      flagToBool(u.profession_and_ja),
    nogyoKankeiFlg:
      allowsNogyoKankeiFlg(dokusyasoBunrui) && flagToBool(u.profession_and_agri),
    dokusyasoBunruiSonota: allowsDokusyasoBunruiSonota(dokusyasoBunrui)
      ? clampText255(u.others_profession)
      : '',
    nogyosyaBunruiSonota: allowsNogyosyaBunruiSonota(nogyosyaBunrui)
      ? clampText255(u.others_products)
      : '',
    // ─ 日付 ─
    shokiDokusyaKaishiDate: kaishiDate,
    dokusyaKaishiDate: kaishiDate,
    // #57986: dokusya_chushi_date はここでは設定しない。以前は users.deleted_at を
    // そのまま写していたが、未来日解約は Denshiban 側で status=9 に切り替わった
    // 時点ではまだ deleted_at が NULL のまま（実削除時にしか立たない）で、
    // 中止日を正しく表せなかった。中止日は service 側の解約分岐（status=9）で
    // payment_end_ym から算出し、insertScheduledKaiyaku 経由で予約行として書く
    // （このフィールドを values に含めないことで通常行は前回値を carry-forward する）。
    seikyuKaishiMonth: str(u.payment_start_ym),
    // ─ その他 ─
    // biko は電子版 remarks1〜5 とはマッピングしない（cloud 専有列・顧客要件
    // 2026-08-26）。DokusyaFields には含めないことで、CREATE 時は列既定値
    // （空文字）、UPDATE 時は前回値から carry-forward される。
    denshiShoninStatus: mapShoninStatus(
      shubetsu,
      shiharaiHoho,
      denshiDokusyaShubetsu,
      u.approval,
    ),
    honshiKodokuFlg: numOrNull(u.subscribe_flg) === 1,
  };
}
