import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/**
 * Base class for all application-level (business) exceptions.
 *
 * The response body contains both `code` (read by GlobalExceptionFilter
 * internally) and `error_code` (the public HTTP field name, also used by
 * tests that introspect `exception.response.error_code`). Keeping both
 * keys avoids an impedance mismatch between the filter's internal model
 * and the public API surface.
 */
/** Field-level validation detail surfaced to the client in `errors[]`. */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    /**
     * Optional field-level details (VALIDATION_ERROR). When present they are
     * serialized as `errors[]` by GlobalExceptionFilter so the FE
     * `useApiForm` can map them to `<a-form-item :help>`.
     */
    public readonly errors?: ValidationErrorDetail[],
  ) {
    super(
      errors
        ? { message, code, error_code: code, errors }
        : { message, code, error_code: code },
      status,
    );
  }
}
