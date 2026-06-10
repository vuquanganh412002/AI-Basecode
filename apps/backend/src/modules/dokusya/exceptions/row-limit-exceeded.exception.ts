import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/** SCR-016 row-limit message — 30000-row cap (NOT the shared 500 default). */
export const DOKUSYA_IMPORT_ROW_LIMIT_MESSAGE =
  'ファイルの行数が上限（30000行）を超えているため、取込みできません。';

/**
 * ACSMS-SCR-016 — thrown when the import payload exceeds the 30000-row
 * cap. The DTO's `@ArrayMaxSize(30000)` catches this for normal
 * clients; this service-layer rethrow provides defence-in-depth and the
 * project-canonical `ROW_LIMIT_EXCEEDED` code. The 30000-row message is
 * passed explicitly — the shared `ErrorMessage.ROW_LIMIT_EXCEEDED`
 * default cites 500.
 */
export class DokusyaRowLimitExceededException extends DomainException {
  constructor(message: string = DOKUSYA_IMPORT_ROW_LIMIT_MESSAGE) {
    super(message, ErrorCode.ROW_LIMIT_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
