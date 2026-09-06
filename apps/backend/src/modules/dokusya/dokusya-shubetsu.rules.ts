// 購読種別（紙版/電子版/併読）に依存する共通バリデーションルール。UI 新規/更新
// (dokusya.service) / Excel取込 (dokusya-import-validator) / 販売店一括置換
// (dokusya-replace.service) の3経路が共有する。
//
// 顧客要件2026-07（統一ルール）:
//   - 紙版(1): 当日変更 + 予約変更(未来日)可。ただし帳票影響項目({@link REPORT_FIELD_PAIRS})は
//     当日反映不可 → 予約変更(未来日)で行う。
//   - 電子版(2): 当日のみ(未来予約不可)。帳票を生成しないため全項目 当日反映可。
//   - 併読(3): 電子版読者管理システム(第3システム)が同期管理 → 読取専用（新規/編集/停止/取込 不可）。
//   - 電子版クレカ (2 && 支払方法=6): 同じく読取専用。
//
// 本モジュールは違反を `{ field, message }[]` で返す（例外は投げない）。各経路が自分のエラー様式
// （VALIDATION_ERROR / 行エラー / DateRangeInvalid 等）へマップ。tekiyo 相対チェック
// （kaishi<=joho<=chushi）は dokusya-tekiyo-date.rules.ts が担う。
import { DokusyaShubetsu, ShiharaiHoho, TetsuzukiShurui } from '@/common/enums';
import { normalizeDbDate } from '@/common/utils/datetime';

// ─── 共通メッセージ（BE/FE/取込で同一文言）────────────────────────────────────
export const SHUBETSU_MSG = {
  /** 電子版・併読は email 必須。 */
  EMAIL_REQUIRED_DIGITAL: 'メールアドレスは電子版・併読の場合は必須です。',
  /** 電子版・併読は読者属性を1つ以上選択。 */
  DOKUSYASO_BUNRUI_REQUIRED_DIGITAL:
    '読者属性は電子版・併読の場合は1つ以上選択してください。',
  /** 電子版は購読部数=1固定。 */
  DIGITAL_BUSU: '電子版の購読部数は1で登録してください。',
  /** 紙版の帳票影響項目を当日反映しようとした。 */
  RESERVE_ONLY_REPORT: '帳票に影響する変更は予約変更（未来日を指定）で行ってください。',
  /** 電子版は当日のみ（未来予約不可）— 日付起点の文言。 */
  DIGITAL_TODAY_ONLY: '電子版は当日のみ変更できます。予約変更（未来日）はできません。',
  /** 電子版で請求開始月が未設定＝料金徴収が始まっておらず停止できない。 */
  SEIKYU_NOT_STARTED: 'この読者料金の徴収はまだ開始されていません。',
  /** 削除は紙版のみ（電子版・併読は電子版読者管理システムが正）。 */
  DELETE_PAPER_ONLY: '紙版の購読者のみ削除できます。',
  /** 紙版の予約変更（未来日）で、同一適用日に既存の変更履歴がある。 */
  RESERVE_DATE_ALREADY_USED:
    'この適用日には既に変更履歴が登録されています。購読者履歴情報画面から該当の変更を取消してから、まとめて更新してください。',
  /** 電子版の新規登録は購読開始日=本日 or 翌月1日のみ（SCR-011登録画面のラジオと同一制約）。 */
  DIGITAL_KAISHI_DATE_INVALID: '電子版の購読開始日は本日または翌月1日を指定してください。',
} as const;

/** 帳票影響項目 — dto/取込行の項目名(snake) ↔ エンティティ列名(camel)。紙版の当日変更で
 *  「変更あり」だと予約変更を要求する（顧客要件2026-07）。部数・販売店・購読者住所・配達先住所。
 *  中止日は停止専用APIへ分離済みのため除外。 */
export const REPORT_FIELD_PAIRS: ReadonlyArray<{ dto: string; entity: string }> = [
  { dto: 'dokusya_busu', entity: 'dokusyaBusu' },
  { dto: 'hanbaiten_id', entity: 'hanbaitenId' },
  { dto: 'yubin_no', entity: 'yubinNo' },
  { dto: 'todofuken_code', entity: 'todofukenCode' },
  { dto: 'shikuchoson', entity: 'shikuchoson' },
  { dto: 'chome_banchi', entity: 'chomeBanchi' },
  { dto: 'tatemono_mei', entity: 'tatemonoMei' },
  { dto: 'haitatsu_yubin_no', entity: 'haitatsuYubinNo' },
  { dto: 'haitatsu_todofuken_code', entity: 'haitatsuTodofukenCode' },
  { dto: 'haitatsu_shikuchoson', entity: 'haitatsuShikuchoson' },
  { dto: 'haitatsu_chome_banchi', entity: 'haitatsuChomeBanchi' },
  { dto: 'haitatsu_tatemono_mei', entity: 'haitatsuTatemonoMei' },
];

export interface ShubetsuViolation {
  field: string;
  message: string;
}

// ─── 純粋述語 ────────────────────────────────────────────────────────────────

/** 電子版(2) or 併読(3)。email 必須・一意チェック対象。紙版は任意・重複可。 */
export function isDigitalOrBoth(shubetsu: number | null | undefined): boolean {
  const n = Number(shubetsu);
  return n === DokusyaShubetsu.DIGITAL || n === DokusyaShubetsu.BOTH;
}

/** 併読(3)。第3システム同期のため本システムで作成/編集不可。 */
export function isBoth(shubetsu: number | null | undefined): boolean {
  return Number(shubetsu) === DokusyaShubetsu.BOTH;
}

/** 配達先7項目（住所4 + 氏名4のうち実装上は住所3+氏名4の7列）。 */
const HAITATSU_DELIVERY_FIELDS = [
  'haitatsu_yubin_no',
  'haitatsu_todofuken_code',
  'haitatsu_shikuchoson',
  'haitatsu_shimei_sei',
  'haitatsu_shimei_mei',
  'haitatsu_shimei_kana_sei',
  'haitatsu_shimei_kana_mei',
] as const;

/**
 * 配達先7項目のいずれかに値があるか。Excel取込テンプレートには per-row の
 * 「配達先＝購読者住所と同じか」flag が明示されない行があるため、この結果から
 * `haitatsu_same_flg` を推論するのに使う（{@link resolveEffectiveHaitatsuSameFlg}）。
 * `selectedColumns` 指定時（UPDATE）は選択列のみ判定 — 未選択＝未書込みの
 * 配達先列の誤検知を防ぐ。
 */
export function hasHaitatsuDeliveryData(
  row: Record<string, unknown>,
  selectedColumns?: string[],
): boolean {
  const selected = selectedColumns ? new Set(selectedColumns) : null;
  return HAITATSU_DELIVERY_FIELDS.some((field) => {
    if (selected && !selected.has(field)) return false;
    const value = row[field];
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    return String(value).trim() !== '';
  });
}

/**
 * Excel取込行の実効 `haitatsu_same_flg`（顧客要件 2026-06: 列で明示指定が
 * あればそれを採用、無ければ配達先入力の有無から推論）。書込み層
 * `dokusya-import.service.ts` の `applyImportRow` と同一ロジック — 検証層
 * (`dokusya-import-validator.service.ts`)の配達先氏名 required 判定もこれで
 * 揃え、書込み時の判定とズレないようにする。
 */
export function resolveEffectiveHaitatsuSameFlg(
  row: { haitatsu_same_flg?: boolean } & Record<string, unknown>,
  selectedColumns?: string[],
): boolean {
  if (row.haitatsu_same_flg !== undefined) return Boolean(row.haitatsu_same_flg);
  return !hasHaitatsuDeliveryData(row, selectedColumns);
}

/** 電子版(2) かつ クレジットカード(6)。読取専用。 */
export function isDigitalCreditCard(
  shubetsu: number | null | undefined,
  hoho: number | null | undefined,
): boolean {
  return (
    Number(shubetsu) === DokusyaShubetsu.DIGITAL &&
    Number(hoho) === ShiharaiHoho.CREDIT_CARD
  );
}

/** 読取専用レコード（編集/停止/削除/置換 いずれも不可）: 併読 OR 電子版クレカ。 */
export function isDokusyaReadOnly(
  shubetsu: number | null | undefined,
  hoho: number | null | undefined,
): boolean {
  return isBoth(shubetsu) || isDigitalCreditCard(shubetsu, hoho);
}

/**
 * 論理削除できるのは紙版(1)だけ（顧客要件 2026-08）。
 *
 * `isDokusyaReadOnly` では足りない。あちらは 併読(3) と 電子版クレカ(2+6) を弾くが、
 * 電子版でクレカ以外の支払方法（口座引落など）は素通りしていた。電子版の会員は
 * 電子版読者管理システムが正で、こちら側で消すと同期のたびに復活したり、
 * 相手システムには居るのにクラウド版から見えない状態を作る。
 *
 * 停止（解約予約）は従来どおり — 電子版も「購読中止」からは止められる。
 * 消せないのは行そのものであって、購読をやめられないという意味ではない。
 */
export function isDokusyaDeletable(
  shubetsu: number | null | undefined,
): boolean {
  return Number(shubetsu) === DokusyaShubetsu.PAPER;
}

// ─── 違反コレクタ（`{ field, message }[]` を返す）──────────────────────────────

/** 電子版・併読は email 必須。空なら email 違反を返す。 */
export function collectEmailViolation(
  email: string | null | undefined,
  shubetsu: number | null | undefined,
): ShubetsuViolation[] {
  if (isDigitalOrBoth(shubetsu) && !email?.trim()) {
    return [{ field: 'email', message: SHUBETSU_MSG.EMAIL_REQUIRED_DIGITAL }];
  }
  return [];
}

/** 電子版は購読部数=1固定（解約=手続種類0 は busu=0 を許容）。 */
export function collectDigitalBusuViolation(
  shubetsu: number | null | undefined,
  busu: number | null | undefined,
  tetsuzuki: number | null | undefined,
): ShubetsuViolation[] {
  if (
    Number(shubetsu) === DokusyaShubetsu.DIGITAL &&
    Number(tetsuzuki) !== TetsuzukiShurui.KAIYAKU &&
    Number(busu) !== 1
  ) {
    return [{ field: 'dokusya_busu', message: SHUBETSU_MSG.DIGITAL_BUSU }];
  }
  return [];
}

/**
 * 電子版は当日のみ（適用日=本日）。未来予約不可。違反時は指定 field で返す
 * （UI は 'change_mode'、取込/置換は日付項目名を渡す）。紙版/併読は対象外。
 */
export function collectDigitalTodayModeViolation(input: {
  shubetsu: number | null | undefined;
  joho: string;
  today: string;
  field: string;
}): ShubetsuViolation[] {
  if (Number(input.shubetsu) !== DokusyaShubetsu.DIGITAL) return [];
  if (normalizeDbDate(input.joho) === normalizeDbDate(input.today)) return [];
  return [{ field: input.field, message: SHUBETSU_MSG.DIGITAL_TODAY_ONLY }];
}

/**
 * 電子版の新規登録（NEW）は 購読開始日 を「本日」または「翌月1日」のいずれかに
 * 限定する（ACSMS-SCR-011 登録画面のラジオボタン「今日から/翌月1日から」と同じ
 * 制約）。取込画面（SCR-016）は Excel セルの値をそのまま受け取るため画面のような
 * 2択UIが無く、任意の日付が入り得る — ここで BE が2値だけを許可する。
 * 紙版は対象外（従来どおり「未来日のみ」— 呼び出し元の一般日付境界チェックに任せる）。
 */
export function collectDigitalNewKaishiDateViolation(input: {
  shubetsu: number | null | undefined;
  kaishiDate: string | null | undefined;
  today: string;
  nextMonthFirst: string;
  field: string;
}): ShubetsuViolation[] {
  if (Number(input.shubetsu) !== DokusyaShubetsu.DIGITAL) return [];
  if (!input.kaishiDate) return [];
  const normalized = normalizeDbDate(input.kaishiDate);
  if (normalized === input.today || normalized === input.nextMonthFirst) return [];
  return [
    { field: input.field, message: SHUBETSU_MSG.DIGITAL_KAISHI_DATE_INVALID },
  ];
}

/**
 * 紙版の予約変更（未来日）は、同一適用日への変更を1回までに制限する（顧客要件
 * 2026-08）。住所変更と販売店変更のように別々の更新が同じ適用日に積み重なると、
 * 増減連絡票（ACSMS-SCR-028）の同日集計が意図しない出力になるため。
 *
 * 当日変更は対象外（当日行は取消不可のため、ここで弾くと後戻りできなくなる —
 * 顧客要件2026-08で当日変更は制限しない方針を確定）。電子版は予約変更自体が
 * できない（{@link collectDigitalTodayModeViolation}）ため実質的に対象外。
 *
 * 既存行の有無は呼び出し元が `dokusya-history.query.ts` の `loadActiveRowAtDate`
 * で調べ、`existingChangeFound` として渡す（本モジュールは DB 非依存の leaf のまま
 * 保つ）。UI/取込/一括置換の3経路が共有する。
 */
export function collectReservedSameDateViolation(input: {
  shubetsu: number | null | undefined;
  isReservedMode: boolean;
  existingChangeFound: boolean;
  field: string;
}): ShubetsuViolation[] {
  if (Number(input.shubetsu) !== DokusyaShubetsu.PAPER) return [];
  if (!input.isReservedMode) return [];
  if (!input.existingChangeFound) return [];
  return [
    { field: input.field, message: SHUBETSU_MSG.RESERVE_DATE_ALREADY_USED },
  ];
}

/**
 * newValues(snake dto キー) と before を比較し、変更された帳票影響項目の dto 項目名リストを返す。
 * before は entity(camel) キー(UI)でも dto(snake) キー(取込の生 DB 行)でもよい — camel/snake は
 * 衝突しないため両対応で参照。{@link collectTodayModeReportViolations} へ渡す
 * `changedReportFields` の生成に使う。
 */
export function computeChangedReportFields(
  newValues: Record<string, unknown>,
  before: Record<string, unknown>,
): string[] {
  // 帳票影響項目はスカラーのみ（部数/コード/住所文字列）。Object 既定文字列化を避けるため比較前にスカラーへ寄せる。
  const scalar = (x: unknown): string =>
    x === null || x === undefined ? '' : String(x as string | number | boolean);
  const changed: string[] = [];
  for (const { dto, entity } of REPORT_FIELD_PAIRS) {
    const v = newValues[dto];
    if (v === undefined) continue;
    const b = before[entity] !== undefined ? before[entity] : before[dto];
    if (scalar(v) !== scalar(b)) changed.push(dto);
  }
  return changed;
}

/**
 * 紙版の当日変更(joho=本日)で帳票影響項目を変更しようとしたら予約変更(未来日)を要求。
 * 電子版(全項目 当日可)・併読(読取専用・上流で弾く)は対象外。`changedReportFields` は
 * caller が算出した「変更された帳票項目」名。
 */
export function collectTodayModeReportViolations(input: {
  shubetsu: number | null | undefined;
  joho: string;
  today: string;
  changedReportFields: string[];
}): ShubetsuViolation[] {
  if (Number(input.shubetsu) !== DokusyaShubetsu.PAPER) return [];
  if (normalizeDbDate(input.joho) !== normalizeDbDate(input.today)) return [];
  return input.changedReportFields.map((field) => ({
    field,
    message: SHUBETSU_MSG.RESERVE_ONLY_REPORT,
  }));
}
