// Screen: __SCREEN_ID__ — __SCREEN__
//
// Local type aliases for __MODULE__. Prefer re-exporting the interfaces
// already declared in the hand-written wrapper at
// `@/api/__MODULE__/__MODULE__` — only define new types for UI-only
// shapes (form state, table row decorators) that don't exist in the
// wrapper.

// Example — re-export wrapper types:
// export type {
//   __ENTITY__Detail as __ENTITY__,
//   Create__ENTITY__Body,
//   Update__ENTITY__Body,
// } from '@/api/__MODULE__/__MODULE__';

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
