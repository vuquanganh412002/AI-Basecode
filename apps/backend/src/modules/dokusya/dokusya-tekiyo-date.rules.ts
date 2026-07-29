// 適用日の整合性チェック（購読者更新の共通ルール）。UI更新 / Excel取込UPDATE /
// 販売店一括置換 の3経路が共有する。
//
// 参照は購読開始日(kaishi)/解約予定日(chushi)。範囲（顧客要件2026-07改訂）:
//   - 購読開始日(kaishi) <= 情報変更適用日(joho) <= 解約予定日(chushi)
//   ※ 販売店適用日は廃止し joho に統一（全変更の唯一の適用日）。
//   ※ chushi が null（解約予定なし）なら上限チェックをスキップ。
//   ※ 境界は両端とも等号可（==kaishi / ==chushi 許容）。
//
// 未来日チェック(joho > today)は呼出し側（assertTekiyoDateFuture / 取込
// checkImportRowDateBounds / 置換ガード）が担う。本関数は参照値への相対チェックのみ行い
// 違反を kind 付きで返す。各経路が kind → 自画面のフィールド名へマップして例外/行エラーを組む。
import { normalizeDbDate } from '@/common/utils/datetime';

export const TEKIYO_VIOLATION = {
  /** joho_henko_tekiyo_date < 購読開始日 */
  JOHO_BEFORE_KAISHI: 'JOHO_BEFORE_KAISHI',
  /** joho_henko_tekiyo_date > 解約予定日（chushi 非null時のみ） */
  JOHO_AFTER_CHUSHI: 'JOHO_AFTER_CHUSHI',
  /** 入力された 解約予定日 < 購読開始日（開始日以降であること・当日可） */
  CHUSHI_BEFORE_KAISHI: 'CHUSHI_BEFORE_KAISHI',
  /** 入力された 解約予定日 <= 本日（未来日のみ・当日不可） */
  CHUSHI_NOT_FUTURE: 'CHUSHI_NOT_FUTURE',
  /** 入力された 解約予定日 <= 最終変更適用日（履歴 MAX joho・解約は最終変更より後・同日不可） */
  CHUSHI_BEFORE_MAX_JOHO: 'CHUSHI_BEFORE_MAX_JOHO',
} as const;
export type TekiyoViolationKind =
  (typeof TEKIYO_VIOLATION)[keyof typeof TEKIYO_VIOLATION];

export interface TekiyoDateViolation {
  kind: TekiyoViolationKind;
  message: string;
}

/** YYYY-MM-DD → YYYY/MM/DD（顧客向けメッセージ表示用）。 */
function fmt(iso: string): string {
  return iso.replaceAll('-', '/');
}

/**
 * 違反 kind → 購読者フォーム項目名のマッピング（UI更新/取込が VALIDATION_ERROR /
 * 行エラーのフィールド名に使う）。
 */
export function tekiyoViolationField(kind: TekiyoViolationKind): string {
  switch (kind) {
    case TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI:
    case TEKIYO_VIOLATION.JOHO_AFTER_CHUSHI:
      return 'joho_henko_tekiyo_date';
    case TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI:
    case TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE:
    case TEKIYO_VIOLATION.CHUSHI_BEFORE_MAX_JOHO:
      return 'dokusya_chushi_date';
  }
}

/**
 * 入力された 解約予定日(chushi) が 最終変更適用日(maxJoho) より後かを検証（顧客要件2026-07
 * — 最終変更より前に解約予約させない。同日も不可：解約は最終変更適用日より後）。maxJoho は
 * 履歴の MAX joho（取消除外＝torikeshi_flg=0 の有効行）。どちらか null/空はスキップ。正規化して比較。
 */
export function collectChushiVsMaxJoho(input: {
  chushiDate?: string | null;
  maxJoho?: string | null;
}): TekiyoDateViolation[] {
  if (!input.chushiDate || !input.maxJoho) return [];
  const chushi = normalizeDbDate(input.chushiDate);
  const maxJoho = normalizeDbDate(input.maxJoho);
  // 同日不可：maxJoho < chushi（<= で違反＝同日も弾く・顧客要件2026-07）。
  if (chushi <= maxJoho) {
    return [
      {
        kind: TEKIYO_VIOLATION.CHUSHI_BEFORE_MAX_JOHO,
        message: `解約予定日は最終変更適用日（${fmt(maxJoho)}）より後の日付を指定してください。`,
      },
    ];
  }
  return [];
}

/**
 * 参照行(kaishi/chushi)に対し新しい適用日(joho)を検証し違反を配列で返す（空＝OK）。
 * 日付は区切り正規化してから辞書順比較（YYYY/MM/DD 入力も安全）。null/空は該当チェックをスキップ。
 */
export function collectTekiyoDateViolations(input: {
  johoDate?: string | null;
  kaishiDate?: string | null;
  chushiDate?: string | null;
}): TekiyoDateViolation[] {
  const out: TekiyoDateViolation[] = [];
  const joho = input.johoDate ? normalizeDbDate(input.johoDate) : null;
  const kaishi = input.kaishiDate ? normalizeDbDate(input.kaishiDate) : null;
  const chushi = input.chushiDate ? normalizeDbDate(input.chushiDate) : null;

  // 情報変更適用日（全変更の唯一の適用日）: 購読開始日 <= joho <= 解約予定日
  if (joho && kaishi && joho < kaishi) {
    out.push({
      kind: TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI,
      message: `情報変更適用日は購読開始日（${fmt(kaishi)}）以降の日付を指定してください。`,
    });
  }
  if (joho && chushi && joho > chushi) {
    out.push({
      kind: TEKIYO_VIOLATION.JOHO_AFTER_CHUSHI,
      message: `情報変更適用日は解約予定日（${fmt(chushi)}）以前の日付を指定してください。`,
    });
  }
  return out;
}

/**
 * 入力された 解約予定日(chushi) の整合性を検証し違反を配列で返す（空＝OK）。顧客要件2026-07改訂:
 *   - 解約予定日 >= 購読開始日（開始日以降・当日=開始日 も可）
 *   - 解約予定日 >  本日（未来日のみ・当日不可）
 * chushi 未入力(null/空)は全チェックをスキップ。正規化して比較。
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
  // 本日 < 解約予定日（未来日のみ・当日不可）
  if (chushi <= today) {
    out.push({
      kind: TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE,
      message: '解約予定日は本日より後の日付を指定してください。',
    });
  }
  return out;
}
