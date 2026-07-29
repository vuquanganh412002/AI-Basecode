import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `POST /api/v1/dokusya/:dokusya_id/rireki/:dokusya_rireki_id/torikeshi` のボディ。
 * 取消理由は必須 — 取消行と打ち消し行の両方の `biko` に書き込まれ、
 * `t_log` にも記録される（顧客要件）。
 */
export class TorikeshiRirekiDto {
  @ApiProperty({
    description: '取消理由（対象行と打ち消し行の備考、および t_log に記録）',
    example: '誤入力のため取消',
    maxLength: 500,
  })
  @IsString({ message: '取消理由を入力してください。' })
  @IsNotEmpty({ message: '取消理由を入力してください。' })
  @MaxLength(500, { message: '取消理由は500文字以内で入力してください。' })
  reason!: string;
}
