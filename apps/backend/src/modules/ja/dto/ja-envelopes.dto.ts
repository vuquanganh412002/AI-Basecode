import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DropdownMetaDto, PaginationMetaDto } from '@/common/dto/responses.dto';

import { JaResponseDto } from './ja-response.dto';

// 一覧endpointの slim 行 — 表示列のみ。JaService.findAll() の
// `Pick<JaResponseDto, ...>` と一致。
export class JaListItemDto {
  @ApiProperty() ja_id: number;
  @ApiProperty() ja_code: string;
  @ApiProperty() ja_name: string;
  @ApiProperty() yubin_no: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() todofuken_name: string;
  @ApiProperty() tel: string;
  @ApiProperty() address: string;
  @ApiProperty() fax: string;
  @ApiProperty() chuokai_flg: boolean;

  @ApiProperty({ example: '', description: 'JASTEM_委託者コード ※空文字許容' })
  jastem_itakusha_code: string;

  @ApiProperty({ example: '', description: 'JASTEM_委託者名 ※空文字許容' })
  jastem_itakusha_name: string;

  @ApiProperty({ example: '', description: 'JASTEM_農協番号 ※空文字許容' })
  jastem_ja_code: string;

  @ApiProperty({ example: '', description: 'JASTEM_農協名 ※空文字許容' })
  jastem_ja_name: string;
}

export class JaListResponseDto {
  @ApiProperty({ type: [JaListItemDto] })
  data: JaListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

// GET /api/v1/ja/dropdown の slim 行 — id + code + name + scope のみ。
export class JaDropdownItemDto {
  @ApiProperty() ja_id: number;
  @ApiProperty() ja_code: string;
  @ApiProperty() ja_name: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() chuokai_flg: boolean;
}

export class JaDropdownResponseDto {
  @ApiProperty({ type: [JaDropdownItemDto] })
  data: JaDropdownItemDto[];

  @ApiProperty({ type: DropdownMetaDto })
  meta: DropdownMetaDto;
}

// 単一リソースenvelope (GET /:id)。
export class JaDetailEnvelopeDto {
  @ApiProperty({ type: JaResponseDto })
  data: JaResponseDto;
}

// 更新成功envelope (POST + PUT)。
export class JaMutationResponseDto {
  @ApiProperty({ type: JaResponseDto })
  data: JaResponseDto;

  @ApiPropertyOptional({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message?: string;
}
