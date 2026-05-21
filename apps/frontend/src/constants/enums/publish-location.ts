/**
 * FE mirror of `apps/backend/src/common/enums/publish-location.enum.ts`.
 * Display labels come from `useCodesStore().label('PUBLISH_LOCATION', value)`.
 */
export const PublishLocation = {
  LOGIN: 1,
  MENU: 2,
} as const;
export type PublishLocation = (typeof PublishLocation)[keyof typeof PublishLocation];
