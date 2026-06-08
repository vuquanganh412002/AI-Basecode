import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Raised by `DokusyaService.searchForReplace` when the supplied
 * `dokusya_kaishi_date_from` is later than `dokusya_kaishi_date_to`.
 * api.md §4.1 + §エラー一覧 row 11.
 */
export class DateRangeInvalidException extends DomainException {
  constructor(message: string = ErrorMessage.DATE_RANGE_INVALID) {
    super(message, ErrorCode.DATE_RANGE_INVALID, HttpStatus.BAD_REQUEST);
  }
}
