import { HttpStatus } from '@nestjs/common';

import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * `FILE_SIZE_EXCEEDED` per docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md
 * §エラー一覧 row 9 — single uploaded file exceeds the 10MB cap.
 */
export class FileSizeExceededException extends DomainException {
  constructor(message: string = ErrorMessage.FILE_SIZE_EXCEEDED) {
    super(message, ErrorCode.FILE_SIZE_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
