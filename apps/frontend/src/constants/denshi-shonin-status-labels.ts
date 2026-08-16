import { DenshiShoninStatus } from '@/constants/enums';

/**
 * 電子申込承認ステータスの表示ラベル。
 *
 * このカテゴリだけは **m_code に無い** — 値は電子版連携の状態から API 層が導出する
 * ものであり、顧客が DB で名称を編集する対象ではない（他の区分値は必ず
 * `useCodesStore().label(...)` を使うこと。`.claude/rules/vue.md §Code Master` 参照）。
 * ACSMS-SCR-011 一覧の絞り込みと ACSMS-SCR-013 履歴一覧の表示で同じ文言を使うため、
 * ラベルはここ 1 箇所に集約して drift を防ぐ。
 *
 * `null` = Web申込以外（電子版行が無い＝紙版など）。
 */
export const DENSHI_SHONIN_STATUS_LABELS: Record<number, string> = {
  [DenshiShoninStatus.PENDING]: '未承認',
  [DenshiShoninStatus.APPROVED]: '承認済み',
  [DenshiShoninStatus.REJECTED]: '否認',
};

/** `null` を含む未設定/未知値のラベル。 */
export const DENSHI_SHONIN_STATUS_NONE_LABEL = 'Web申込以外';

/**
 * 値 → 表示ラベル。`null` / 未知値は {@link DENSHI_SHONIN_STATUS_NONE_LABEL}。
 */
export function denshiShoninStatusLabel(value: number | null): string {
  if (value == null) return DENSHI_SHONIN_STATUS_NONE_LABEL;
  return DENSHI_SHONIN_STATUS_LABELS[value] ?? DENSHI_SHONIN_STATUS_NONE_LABEL;
}
