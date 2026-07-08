// 適用日の整合性チェック（購読者更新の共通ルール）。
//   UI更新 / Excel取込UPDATE / 販売店一括置換 の3経路が同じルールを共有する。
//
// 参照は「直前の（＝現行有効な）履歴行」= 更新前レコード（顧客要件 2026-07）:
//   - 情報変更適用日(joho)      >= 購読開始日(kaishi)
//   - 販売店適用日(hanbaiten)   <  解約予定日(chushi)   ※chushi が非null時のみ
//
// today <= joho / hanbaiten の過去日チェックは呼び出し側（assertTekiyoDateNotPast /
// 取込 classifyImportRow / 置換の過去日ガード）が担う。本関数は「参照行に対する
// 相対チェック」だけを行い、違反を kind 付きで返す。各経路が kind → 自画面の
// フィールド名（UI: joho/hanbaiten 別、置換: 単一 hanbaiten_tekiyo_date、
// 取込: row/column）へマッピングして例外/行エラーを組み立てる。
import { normalizeDbDate } from '@/common/utils/datetime';

export const TEKIYO_VIOLATION = {
  /** joho_henko_tekiyo_date < 購読開始日 */
  JOHO_BEFORE_KAISHI: 'JOHO_BEFORE_KAISHI',
  /** hanbaiten_tekiyo_date >= 解約予定日 */
  HANBAITEN_AFTER_CHUSHI: 'HANBAITEN_AFTER_CHUSHI',
  /** 入力された 解約予定日 < 購読開始日（開始日以降であること・当日可） */
  CHUSHI_BEFORE_KAISHI: 'CHUSHI_BEFORE_KAISHI',
  /** 入力された 解約予定日 < 本日（過去日不可・当日可） */
  CHUSHI_PAST: 'CHUSHI_PAST',
} as const;
export type TekiyoViolationKind =
  (typeof TEKIYO_VIOLATION)[keyof typeof TEKIYO_VIOLATION];

export interface TekiyoDateViolation {
  kind: TekiyoViolationKind;
  message: string;
}

/** YYYY-MM-DD → YYYY/MM/DD（顧客向けメッセージ用の表示整形）。 */
function fmt(iso: string): string {
  return iso.replaceAll('-', '/');
}

/**
 * 違反 kind → 標準の購読者フォーム項目名へのマッピング（UI更新 / 取込が
 * VALIDATION_ERROR / 行エラーのフィールド名として使う）。置換画面は単一の
 * hanbaiten_tekiyo_date に集約するため本マッパーは使わない。
 */
export function tekiyoViolationField(kind: TekiyoViolationKind): string {
  switch (kind) {
    case TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI:
      return 'joho_henko_tekiyo_date';
    case TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI:
      return 'hanbaiten_tekiyo_date';
    case TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI:
    case TEKIYO_VIOLATION.CHUSHI_PAST:
      return 'dokusya_chushi_date';
  }
}

/**
 * 参照行(kaishi/chushi)に対して新しい適用日(joho/hanbaiten)を検証し、
 * 違反を配列で返す（空配列＝OK）。日付は区切り正規化してから辞書順比較する
 * （YYYY/MM/DD 入力も安全）。null/空は該当チェックをスキップする。
 */
export function collectTekiyoDateViolations(input: {
  johoDate?: string | null;
  hanbaitenDate?: string | null;
  kaishiDate?: string | null;
  chushiDate?: string | null;
}): TekiyoDateViolation[] {
  const out: TekiyoDateViolation[] = [];
  const joho = input.johoDate ? normalizeDbDate(input.johoDate) : null;
  const hanbaiten = input.hanbaitenDate
    ? normalizeDbDate(input.hanbaitenDate)
    : null;
  const kaishi = input.kaishiDate ? normalizeDbDate(input.kaishiDate) : null;
  const chushi = input.chushiDate ? normalizeDbDate(input.chushiDate) : null;

  // 情報変更適用日 >= 購読開始日
  if (joho && kaishi && joho < kaishi) {
    out.push({
      kind: TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI,
      message: `情報変更適用日は購読開始日（${fmt(kaishi)}）以降の日付を指定してください。`,
    });
  }
  // 販売店適用日 < 解約予定日（解約予定日が設定済みの場合のみ）
  if (hanbaiten && chushi && hanbaiten >= chushi) {
    out.push({
      kind: TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI,
      message: `販売店適用日は解約予定日（${fmt(chushi)}）より前の日付を指定してください。`,
    });
  }
  return out;
}

/**
 * 入力された 解約予定日(chushi) の整合性を検証し、違反を配列で返す（空配列＝OK）。
 * 顧客要件 2026-07:
 *   - 解約予定日 >= 購読開始日（開始日以降。当日=開始日 も可）
 *   - 解約予定日 >= 本日（過去日不可・当日可）
 * chushi 未入力(null/空)は全チェックをスキップ。日付は正規化してから比較する。
 */
export function collectChushiViolations(input: {
  chushiDate?: string | null;
  kaishiDate?: string | null;
  today: string;
}): TekiyoDateViolation[] {
  const out: TekiyoDateViolation[] = [];
  if (!input.chushiDate) return out;
  const chushi = normalizeDbDate(input.chushiDate);
  const kaishi = input.kaishiDate ? normalizeDbDate(input.kaishiDate) : null;
  const today = normalizeDbDate(input.today);

  // 購読開始日 <= 解約予定日
  if (kaishi && chushi < kaishi) {
    out.push({
      kind: TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI,
      message: `解約予定日は購読開始日（${fmt(kaishi)}）以降の日付を指定してください。`,
    });
  }
  // 本日 <= 解約予定日（過去日不可）
  if (chushi < today) {
    out.push({
      kind: TEKIYO_VIOLATION.CHUSHI_PAST,
      message: '解約予定日に過去日は指定できません。',
    });
  }
  return out;
}
