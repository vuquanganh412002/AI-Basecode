import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateJaDto } from './create-ja.dto';

// JA更新リクエストbody — ACSMS-API-005-003。全項目 optional。ja_code は作成後
// 不変のため本DTOに無い(api.md §4 注記)。CHUOKAI/JA_HONTEN は ※4 allow-list
// のみ編集可 — service が FIELD_RESTRICTIONS で保存前にフィルタ。
export class UpdateJaDto extends PartialType(
  OmitType(CreateJaDto, ['ja_code'] as const),
) {}
