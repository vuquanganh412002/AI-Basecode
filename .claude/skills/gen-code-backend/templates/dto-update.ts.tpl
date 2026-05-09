// Screen: __SCREEN_ID__ — __SCREEN__
//
// PartialType re-exports every field of Create__ENTITY__Dto as optional.
// Import from @nestjs/mapped-types (NOT @nestjs/swagger) to preserve
// class-validator metadata.

import { PartialType } from '@nestjs/mapped-types';
import { Create__ENTITY__Dto } from './create-__MODULE__.dto';

export class Update__ENTITY__Dto extends PartialType(Create__ENTITY__Dto) {}
