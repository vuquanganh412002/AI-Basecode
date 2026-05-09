// Screen: __SCREEN_ID__ — __SCREEN__
//
// Generate ONE exception file per custom error code beyond the 7 common codes
// (UNAUTHORIZED, FORBIDDEN, DATA_SCOPE_VIOLATION, VALIDATION_ERROR,
// TOO_MANY_REQUESTS, INTERNAL_SERVER_ERROR, BAD_REQUEST).
//
// Common error codes: use generic codes (NOT_FOUND, DUPLICATE_CODE, CONFLICT)
// per .claude/rules/nestjs.md §Domain-Specific Exceptions.

import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../common/exceptions/domain.exception';

// Example — resource not found
export class __ENTITY__NotFoundException extends DomainException {
  constructor(_id: number | string) {
    super(
      '指定された__SCREEN_ENTITY_LABEL__が見つかりません',
      'NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}

// Example — duplicate code
// export class Duplicate__ENTITY__CodeException extends DomainException {
//   constructor() {
//     super(
//       '同一の__SCREEN_ENTITY_LABEL__コードが既に登録されています',
//       'DUPLICATE_CODE',
//       HttpStatus.BAD_REQUEST,
//     );
//   }
// }

// Example — has related data (delete conflict)
// export class HasRelated__ENTITY__DataException extends DomainException {
//   constructor() {
//     super(
//       '関連データが存在するため削除できません',
//       'CONFLICT',
//       HttpStatus.CONFLICT,
//     );
//   }
// }
