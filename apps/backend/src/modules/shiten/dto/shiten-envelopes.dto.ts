import { ApiProperty } from '@nestjs/swagger';

import { ShitenDetailDto } from './shiten-detail.dto';

/** Single-resource envelope (GET /:id). */
export class ShitenDetailEnvelopeDto {
  @ApiProperty({ type: ShitenDetailDto })
  data: ShitenDetailDto;
}

/** Mutation success envelope (POST + PUT). */
export class ShitenMutationResponseDto {
  @ApiProperty({ type: ShitenDetailDto })
  data: ShitenDetailDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}
