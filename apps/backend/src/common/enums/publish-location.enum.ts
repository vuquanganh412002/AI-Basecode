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
} as const;
export type PublishLocation = (typeof PublishLocation)[keyof typeof PublishLocation];
