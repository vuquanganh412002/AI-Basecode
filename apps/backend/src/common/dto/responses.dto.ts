/**
 * Swagger 共通レスポンス DTO。
 *
 * interface でなく `class` にしているのは、`@nestjs/swagger` の reflection が形状を
 * 読み取り FE 型を生成できるようにするため。素の interface（例: paginate.ts の
 * `PageMeta`）は Swagger から見えない。
 *
 * ここで統一する規約:
 *   - List:     `{ data: T[], meta: PaginationMetaDto }` — .claude/rules/nestjs.md §Response Format
 *   - Dropdown: `{ data: T[], meta: DropdownMetaDto }` — `has_more`（カーソル式）で
 *     無限スクロール側が導出不要
 *   - Mutation: SuccessMessageDto の `{ message }` — 動詞のみリテラル
 *     （`'登録しました。'` / `'更新しました。'` / `'削除しました。'`）
 *
 * リソース別 List レスポンスは具象サブクラス（Swagger はジェネリクスを読めない）で、
 * 各々 `data: ConcreteItemDto[]` を宣言する。
 */
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total matching rows across all pages.' })
  total: number;

  @ApiProperty({ description: '1-indexed current page.' })
  page: number;

  @ApiProperty({ description: 'Rows per page (capped by per_page query param).' })
  per_page: number;

  @ApiProperty({ description: '`Math.ceil(total / per_page)`; 0 when per_page <= 0.' })
  total_pages: number;
}

export class DropdownMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() per_page: number;

  @ApiProperty({
    description: 'true when more pages are available (drives infinite scroll).',
  })
  has_more: boolean;
}

export class SuccessMessageDto {
  @ApiProperty({
    description:
      'Verb-only Japanese literal — 登録しました。 / 更新しました。 / 削除しました。 etc. ' +
      'Per `.claude/rules/nestjs.md §BE message convention`.',
    example: '登録しました。',
  })
  message: string;
}
