import {
  ApiExtraModels,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * 単一コード行 — サービスの `CodeItem` のミラー (Swagger リフレクション用に class 化。
 * サービス側 interface は素の TS 呼び出し向けに残す)。
 * `value` は number | string: 多くは number 正規化だが、VARCHAR 系カテゴリ
 * (例 TODOFUKEN 系) は文字列を出す。Orval は `string | number` として表出。
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
