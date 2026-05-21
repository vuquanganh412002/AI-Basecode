import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * Aggregates row-level errors from a bulk Excel import into one
 * 400 IMPORT_VALIDATION_ERROR response. Each entry in `errors`
 * names the offending row (1-indexed Excel row, header counts as
 * row 1) + field + Japanese message so the FE can render the
 * grid annotations per row.
 *
 * Extends `HttpException` directly (NOT `DomainException`) because
 * the body shape includes the variable-length `errors[]` array;
 * `GlobalExceptionFilter` reads `code` / `error_code` / `errors` off
 * the HttpException response object verbatim.
 *
 * See docs/design/ACSMS-SCR-019/ACSMS-SCR-019-api.md §エラー一覧.
 */
export class ImportValidationException extends HttpException {
  constructor(
    errors: Array<{ row?: number; field: string; message: string }>,
    message?: string,
  ) {
    super(
      {
        code: ErrorCode.IMPORT_VALIDATION_ERROR,
        error_code: ErrorCode.IMPORT_VALIDATION_ERROR,
        message: message ?? ErrorMessage.IMPORT_VALIDATION_ERROR,
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
