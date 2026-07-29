/**
 * お知らせ種別。`t_oshirase.oshirase_type`。
 * Mirror of `m_code.code_category = 'OSHIRASE_TYPE'` (seeder.md §5.13)。
 * Group B → A へ昇格: 値 4 (`DEADLINE`) が 3 箇所で必須分岐を駆動する:
 *   - 締め切り時間 は `publish_location = MENU_DEADLINE` と 1:1
 *     (`assertDeadlineLocationPairing` in oshirase.service.ts)。
 *   - 締め切り時間 row はシステム全体で1件のみ (uniqueness check)。
 *   - 締め切り時間 row は削除不可 (FE 削除 link 無効化、BE DELETE→HTTP 400)。
 *
 * label (システム/重要/一般/締め切り時間) は `m_code.code_name` で runtime 編集可、
 * 値のみ固定。
 *
 * `apps/frontend/src/constants/enums/oshirase-type.ts` と同期。
 * `enum-sync.spec.ts` が drift 時 CI fail。
 */
export const OshiraseType = {
  /** システム */
  SYSTEM: 1,
  /** 重要 */
  IMPORTANT: 2,
  /** 一般 */
  GENERAL: 3,
  /** 締め切り時間 — special slot, 1件のみ運用、削除不可、location=3 専用 */
  DEADLINE: 4,
} as const;
export type OshiraseType = (typeof OshiraseType)[keyof typeof OshiraseType];
