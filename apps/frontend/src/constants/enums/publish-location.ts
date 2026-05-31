/**
 * FE mirror of `apps/backend/src/common/enums/publish-location.enum.ts`.
 * Display labels come from `useCodesStore().label('PUBLISH_LOCATION', value)`.
 */
export const PublishLocation = {
  LOGIN: 1,
  MENU: 2,
  /** メニュー画面（締め切り時間）— oshirase_type=4 専用枠（顧客確認 2026-05）。 */
  MENU_DEADLINE: 3,
} as const;
export type PublishLocation = (typeof PublishLocation)[keyof typeof PublishLocation];
