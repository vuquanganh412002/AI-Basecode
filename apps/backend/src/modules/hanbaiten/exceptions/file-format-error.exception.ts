import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * Thrown when the import payload can't be interpreted as the
 * canonical 23-column structure (e.g. numeric column carries a
 * non-numeric string that slipped past the DTO). Maps to
 * `FILE_FORMAT_ERROR` per docs/design/ACSMS-SCR-019/ACSMS-SCR-019-api.md
 * §エラー一覧.
 */
export class FileFormatErrorException extends DomainException {
  constructor(message: string = ErrorMessage.FILE_FORMAT_ERROR) {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
