import { CreateOshiraseDto } from './create-oshirase.dto';

/**
 * PATCH /api/v1/oshirase/:id (ACSMS-API-031-004) の Body。
 * Create と同形 — FE は全レコードを送り返すため全フィールド必須。
 * 必須フィールドの `@IsNotEmpty` を維持するため `PartialType()` では
 * なく extends する。
 */
export class UpdateOshiraseDto extends CreateOshiraseDto {}
