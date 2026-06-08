import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Raised by `DokusyaService.create / update` when the email being saved
 * is already used by another non-deleted row in the SAME JA scope
 * (api.md §エラー一覧 #9 + §4.3 重複チェック).
 *
 * `GlobalExceptionFilter` reads the `error_code` field on the response
 * body so the FE sees `{ error_code: 'DUPLICATE_EMAIL', message }` —
 * `useApiForm` then maps the toast / inline error.
 */
export class DuplicateEmailException extends DomainException {
  constructor(message: string = ErrorMessage.DUPLICATE_EMAIL) {
    super(message, ErrorCode.DUPLICATE_EMAIL, HttpStatus.BAD_REQUEST);
  }
}
