// Screen: __SCREEN_ID__ — __SCREEN__
//
// Response DTO shape MUST match api.md §3 レスポンスデータ.
//
// Nullable policy (see .claude/rules/nestjs.md §Nullable field serialization):
//   - NOT NULL column (Nullable=-)  →  field typed as plain type, never `null`
//   - Nullable column (Nullable=〇) →  field typed as `T | null`, emit `null`
// Never use `?:` to hide absent values — always emit the key.

import { ApiProperty } from '@nestjs/swagger';

export class __ENTITY__ResponseDto {
  @ApiProperty({ description: 'ID', example: 1 })
  __PK__: number;

  @ApiProperty({ description: 'JA ID', example: 1 })
  ja_id: number;

  // TODO(/gen-code-backend): add every field from api.md §3.
  //   Example (NOT NULL text):
  //   @ApiProperty({ example: '' })
  //   biko: string;
  //
  //   Example (nullable text):
  //   @ApiProperty({ nullable: true, example: null })
  //   optional_field: string | null;

  @ApiProperty({ nullable: true, description: '登録者' })
  created_by: number | null;

  @ApiProperty({ description: '登録日時', example: '2026-04-23T10:00:00Z' })
  created_at: string;

  @ApiProperty({ nullable: true, description: '更新者' })
  updated_by: number | null;

  @ApiProperty({ nullable: true, description: '更新日時' })
  updated_at: string | null;
}
