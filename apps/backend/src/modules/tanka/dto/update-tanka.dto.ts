import { OmitType } from '@nestjs/mapped-types';

import { CreateTankaDto } from './create-tanka.dto';

/**
 * 単価更新リクエストボディ — ACSMS-API-003-003。
 * `CreateTankaDto` から `tanka_code` を除いた形 (api.md §API-003-003 脚注:
 * 「tanka_code は更新不可（画面側でdisabled）」)。
 * `OmitType` は @nestjs/mapped-types 版を使用 — class-validator メタデータを保持する
 * (@nestjs/swagger 版は失う。.claude/rules/nestjs.md §DTO + Common pitfalls)。
 * 残りのデコレータ(必須+形式+範囲)は CreateTankaDto から継承。
 */
export class UpdateTankaDto extends OmitType(CreateTankaDto, ['tanka_code'] as const) {}
