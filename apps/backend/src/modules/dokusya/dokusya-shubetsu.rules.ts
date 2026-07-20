// 購読種別（紙版/電子版/併読）に依存する共通バリデーションルール。
//   UI 新規/更新 (dokusya.service) / Excel取込 (dokusya-import-validator) /
//   販売店一括置換 (dokusya-replace.service) の3経路が同じルールを共有する。
//
// 顧客要件 2026-07（統一ルール）:
//   - 紙版(1): 当日変更 + 予約変更（未来日）可。ただし「帳票影響項目」
//     ({@link REPORT_FIELD_PAIRS}) は当日反映不可 → 予約変更（未来日）で行う。
//   - 電子版(2): 当日のみ（未来予約不可）。帳票を生成しないため全項目 当日反映可。
//   - 併読(3): 電子版読者管理システム（第3システム）が同期管理 → 読取専用
//     （新規/編集/停止/取込 いずれも不可）。
//   - 電子版クレカ (2 && 支払方法=6): 同じく読取専用。
//
// 本モジュールは違反を `{ field, message }[]` で返す（例外は投げない）。各経路が
// 自分のエラー様式（VALIDATION_ERROR / 行エラー / DateRangeInvalid 等）へマップする。
// tekiyo 相対チェック（kaishi<=joho<=chushi）は dokusya-tekiyo-date.rules.ts が担う。
import { DokusyaShubetsu, ShiharaiHoho, TetsuzukiShurui } from '@/common/enums';
import { normalizeDbDate } from '@/common/utils/datetime';

// ─── 共通メッセージ（BE/FE/取込で同一文言）────────────────────────────────────
export const SHUBETSU_MSG = {
  /** 電子版・併読は email 必須。 */
  EMAIL_REQUIRED_DIGITAL: 'メールアドレスは電子版・併読の場合は必須です。',
  /** 電子版は購読部数=1固定。 */
  DIGITAL_BUSU: '電子版の購読部数は1で登録してください。',
  /** 紙版の帳票影響項目を当日反映しようとした。 */
  RESERVE_ONLY_REPORT: '帳票に影響する変更は予約変更（未来日を指定）で行ってください。',
  /** 電子版は当日のみ（未来予約不可）— 日付起点の文言。 */
  DIGITAL_TODAY_ONLY: '電子版は当日のみ変更できます。予約変更（未来日）はできません。',
} as const;

/** 帳票影響項目 — dto/取込行の項目名(snake) ↔ エンティティ列名(camel)。
 *  紙版の当日変更で「変更あり」だと予約変更を要求する（顧客要件 2026-07）。
 *  部数・販売店・購読者住所・配達先住所。中止日は停止専用APIへ分離済みのため除外。 */
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
 * newValues(snake dto キー) と before を比較し、変更された帳票影響項目の dto 項目名
 * リストを返す。before は entity(camel) キー（UI: TypeORM エンティティ）でも
 * dto(snake) キー（取込: 生 DB 行）でもよい — camel/snake は衝突しないため両対応で
 * 参照する。UI/取込が {@link collectTodayModeReportViolations} へ渡す
 * `changedReportFields` の生成に使う。
 */
export function computeChangedReportFields(
  newValues: Record<string, unknown>,
  before: Record<string, unknown>,
): string[] {
  // 帳票影響項目はスカラー値のみ（部数/コード/住所文字列）。Object 既定文字列化を
  // 避けるため比較前にスカラーへ寄せる。
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
 * 紙版の当日変更（joho=本日）で帳票影響項目を変更しようとした場合、予約変更
 * （未来日）を要求する。電子版（全項目 当日可）・併読（読取専用・上流で弾く）は
 * 対象外。`changedReportFields` は呼び出し側が算出した「変更された帳票項目」名。
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
