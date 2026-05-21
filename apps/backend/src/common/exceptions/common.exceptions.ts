import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from './domain.exception';

/**
 * Common exceptions for cross-cutting concerns.
 * Prefer these over hardcoding `new DomainException(...)` inline.
 * For screen-specific 404/409/validation, extend DomainException or pass a resource label.
 */

export class BadRequestException extends DomainException {
  constructor(message: string = ErrorMessage.BAD_REQUEST) {
    super(message, ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string = ErrorMessage.UNAUTHORIZED) {
    super(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = ErrorMessage.FORBIDDEN) {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }
}

export class DataScopeViolationException extends DomainException {
  constructor(message: string = ErrorMessage.DATA_SCOPE_VIOLATION) {
    super(message, ErrorCode.DATA_SCOPE_VIOLATION, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends DomainException {
  /**
   * @param resource Japanese label of the resource (e.g. '単価', 'アカウント')
   * to produce a descriptive message. Falls back to the generic NOT_FOUND message.
   */
  constructor(resource?: string) {
    const message = resource
      ? `指定された${resource}が見つかりません。`
      : ErrorMessage.NOT_FOUND;
    super(message, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateCodeException extends DomainException {
  /**
   * Pass `value` to surface the actual code in the error toast — much
   * easier for the user to spot the dup row in a long screen than the
   * generic "同一のXが既に登録" message:
   *   `JAコード「002001」はすでに登録されています。`
   * Omit `value` for callers that don't have it handy (legacy or when
   * the duplicate is on a non-public field).
   */
  constructor(resource: string = 'コード', value?: string) {
    const message = value
      ? `${resource}「${value}」はすでに登録されています。`
      : `同一の${resource}が既に登録されています。`;
    super(message, ErrorCode.DUPLICATE_CODE, HttpStatus.BAD_REQUEST);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string = ErrorMessage.CONFLICT) {
    super(message, ErrorCode.CONFLICT, HttpStatus.CONFLICT);
  }
}

export class TooManyRequestsException extends DomainException {
  constructor(message: string = ErrorMessage.TOO_MANY_REQUESTS) {
    super(message, ErrorCode.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS);
  }
}
