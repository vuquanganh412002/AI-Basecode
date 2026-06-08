import { OmitType } from '@nestjs/mapped-types';

import { CreateTankaDto } from './create-tanka.dto';

/**
 * Update Tanka request body — ACSMS-API-003-003.
 *
 * Same shape as `CreateTankaDto` MINUS `tanka_code` (immutable per
 * api.md §API-003-003 footnote: 「tanka_code は更新不可（画面側でdisabled）」).
 *
 * `OmitType` from `@nestjs/mapped-types` preserves class-validator
 * metadata correctly (the `@nestjs/swagger` version loses it — see
 * .claude/rules/nestjs.md §DTO + Common pitfalls). All remaining
 * decorators (required + format + range) carry over from CreateTankaDto.
 */
export class UpdateTankaDto extends OmitType(CreateTankaDto, ['tanka_code'] as const) {}
