import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException, type ValidationErrorDetail } from './domain.exception';

/**
 * 横断的な共通例外。inline の `new DomainException(...)` より優先。
 * 画面固有の 404/409/validation は DomainException を継承 or resource label を渡す。
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
  /** @param resource 資源の日本語ラベル (例 '単価', 'アカウント')。省略時は既定 NOT_FOUND 文言。 */
  constructor(resource?: string) {
    const message = resource
      ? `指定された${resource}が見つかりません。`
      : ErrorMessage.NOT_FOUND;
    super(message, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateCodeException extends DomainException {
  /**
   * `value` を渡すと実コードをトーストに表示（例
   * `JAコード「002001」はすでに登録されています。`）→ 重複行を特定しやすい。
   * 手元に値が無い/非公開フィールドの重複時は省略可。
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

/**
 * フィールド単位の VALIDATION_ERROR (HTTP 400)。`errors[]` を持ち FE `useApiForm`
 * が `<a-form-item :help>` にマップ。手組み `new HttpException({ code:
 * 'VALIDATION_ERROR', errors }, …)` の代わりに使い、全画面で同一 body 形状
 * (ValidationPipe factory + `assertMCodeValues` と同じ) を保証。
 *
 * ```ts
 * throw new ValidationException([
 *   { field: 'ja_id', message: 'JA IDは必須です。' },
 * ]);
 * ```
 */
export class ValidationException extends DomainException {
  constructor(
    errors: ValidationErrorDetail[],
    message: string = ErrorMessage.VALIDATION_ERROR,
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, errors);
  }
}
