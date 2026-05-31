/**
 * Notice publish location stored in `t_oshirase.publish_location`.
 *
 * Mirror of `m_code.code_category = 'PUBLISH_LOCATION'`. Distinguishes
 * notices intended for the unauthenticated login screen vs the
 * post-login menu screen — they have different audiences and threat
 * models (login-screen notices are public).
 *
 * Keep in sync with `apps/frontend/src/constants/enums/publish-location.ts`.
 */
export const PublishLocation = {
  /** ログイン画面（未認証ユーザに公開） */
  LOGIN: 1,
  /** メニュー画面（ログイン後のみ） */
  MENU: 2,
  /**
   * メニュー画面（締め切り時間）— oshirase_type=4 専用枠（顧客確認 2026-05）。
   * 締め切り時間お知らせはシステム全体で1件、このスロットに常時表示される。
   * MENU と分離し通常お知らせとの混在を防ぐ。
   */
  MENU_DEADLINE: 3,
} as const;
export type PublishLocation = (typeof PublishLocation)[keyof typeof PublishLocation];
