// Screen: __SCREEN_ID__ — __SCREEN__
//
// Local type aliases for __MODULE__. Prefer re-exporting Orval-generated
// types from `@/api/generated` — only define new types for UI-only shapes
// (form state, table row decorators) that don't exist in the API client.

// Example — re-export backend types:
// export type {
//   __ENTITY__ResponseDto as __ENTITY__,
//   Create__ENTITY__Dto,
//   Update__ENTITY__Dto,
// } from '@/api/generated';

// Example — UI-only form state type:
// export interface __ENTITY__FormState {
//   xxx_code: string;
//   biko: string;
// }

// Example — table column row decorator:
// export interface __ENTITY__Row extends __ENTITY__ {
//   selected?: boolean;
// }

export {};
