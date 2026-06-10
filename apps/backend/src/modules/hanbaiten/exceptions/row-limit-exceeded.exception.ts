import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * Thrown when the import payload exceeds the 500-row cap. The DTO's
 * `@ArrayMaxSize(500)` catches this for normal clients; this service-
 * layer rethrow provides defence-in-depth (and the project-canonical
 * `ROW_LIMIT_EXCEEDED` code) for any client that bypasses the DTO.
 */
export class RowLimitExceededException extends DomainException {
  constructor(message: string = ErrorMessage.ROW_LIMIT_EXCEEDED) {
    super(message, ErrorCode.ROW_LIMIT_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
