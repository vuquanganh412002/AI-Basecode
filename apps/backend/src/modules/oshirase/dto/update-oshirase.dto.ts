import { CreateOshiraseDto } from './create-oshirase.dto';

/**
 * Request body for `PATCH /api/v1/oshirase/:id` (ACSMS-API-031-004).
 *
 * Same shape as Create — FE sends the full record back so every field is
 * required at the wire level. We extend instead of `PartialType()` to
 * preserve the `@IsNotEmpty` semantics on every required field.
 */
export class UpdateOshiraseDto extends CreateOshiraseDto {}
