import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Raised by `DokusyaService.replaceHanbaiten` when any candidate row's
 * current `hanbaiten_id` already equals the requested `new_hanbaiten_id`
 * — replacing a 販売店 with itself is a no-op the UI must block.
 * api.md §4.3 業務ルール + §エラー一覧 row 9.
 */
export class SameHanbaitenException extends DomainException {
  constructor(message: string = ErrorMessage.SAME_HANBAITEN) {
    super(message, ErrorCode.SAME_HANBAITEN, HttpStatus.BAD_REQUEST);
  }
}
