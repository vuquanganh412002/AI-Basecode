import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constant';

/**
 * Base class for all application-level (business) exceptions.
 *
 * The response body contains both `code` (read by GlobalExceptionFilter
 * internally) and `error_code` (the public HTTP field name, also used by
 * tests that introspect `exception.response.error_code`). Keeping both
 * keys avoids an impedance mismatch between the filter's internal model
 * and the public API surface.
 */
export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ message, code, error_code: code }, status);
  }
}
