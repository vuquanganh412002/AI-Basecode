import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateJaDto } from './create-ja.dto';

/**
 * Update JA request body — API-005-003.
 *
 * All fields are optional. `ja_code` is immutable after creation and is
 * therefore not present on the Update DTO (api.md §4 注記).
 *
 * CHUOKAI / JA_HONTEN can only modify the ※4 allow-list; the service
 * layer filters the incoming body via FIELD_RESTRICTIONS before saving.
 */
export class UpdateJaDto extends PartialType(
  OmitType(CreateJaDto, ['ja_code'] as const),
) {}
