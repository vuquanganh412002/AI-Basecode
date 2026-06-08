import {
  ApiExtraModels,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Single code row — mirrors `CodeItem` from the service (kept here as
 * a `class` for Swagger reflection; the service-side `interface`
 * stays for plain TS callers).
 *
 * `value` is a number | string union: most categories normalize to
 * number, but some VARCHAR-backed categories (e.g. TODOFUKEN-prefixed)
 * may emit strings. Orval surfaces this as `string | number`.
 */
export class CodeItemDto {
  @ApiProperty({
    oneOf: [{ type: 'number' }, { type: 'string' }],
    description:
      'Numeric for INT-backed code_value; string for VARCHAR-backed.',
  })
  value: number | string;

  @ApiProperty({ description: 'Full label for dropdowns / form display.' })
  label: string;

  @ApiProperty({
    description: 'Short label for tight columns (table cells, badges).',
  })
  label_short: string;
}

/** Response for GET /api/v1/codes/:category — flat list of items. */
export class CodeListResponseDto {
  @ApiProperty({ type: [CodeItemDto] })
  data: CodeItemDto[];
}

/**
 * Response for GET /api/v1/codes — category-keyed map of code lists.
 *
 * Swagger doesn't introspect `Record<string, T[]>` directly, so we
 * declare it explicitly with `additionalProperties` pointing at
 * `CodeItemDto`. The Orval-generated FE type comes out as
 * `{ [key: string]: CodeItemDto[] }` which matches the runtime shape.
 */
@ApiExtraModels(CodeItemDto)
export class CodeListByCategoryResponseDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: getSchemaPath(CodeItemDto) },
    },
    description:
      'Keyed by category code (e.g. "TANKA_TYPE", "GENDER"). Value = code items for that category.',
  })
  data: Record<string, CodeItemDto[]>;
}
