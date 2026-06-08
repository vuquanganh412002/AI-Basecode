import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * ACSMS-SCR-016 — aggregates row-level import errors into one
 * 400 IMPORT_VALIDATION_ERROR response. Each `errors[]` entry names
 * the offending row (1-indexed) + field + Japanese message so the FE
 * can annotate the grid per row. Capped at 10 entries by the caller.
 *
 * Extends `HttpException` directly (NOT `DomainException`) because the
 * body shape carries the variable-length `errors[]` array;
 * `GlobalExceptionFilter` reads `code` / `error_code` / `errors`
 * verbatim off the response object.
 */
export class DokusyaImportValidationException extends HttpException {
  /**
   * Top-level `code` mirror — the body already carries `code` /
   * `error_code`, but service unit tests assert `err.code` directly
   * (not `err.response.code`), so expose it as an own property too.
   */
  public readonly code: string = ErrorCode.IMPORT_VALIDATION_ERROR;

  constructor(
    public readonly errors: Array<{ row?: number; field: string; message: string }>,
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
