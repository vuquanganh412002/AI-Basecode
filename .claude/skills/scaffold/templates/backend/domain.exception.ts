import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constant';

/**
 * Base class for all application-level (business) exceptions.
 * The filter reads `code` and returns it as `error_code` in the JSON response.
 */
export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ message, code }, status);
  }
}
