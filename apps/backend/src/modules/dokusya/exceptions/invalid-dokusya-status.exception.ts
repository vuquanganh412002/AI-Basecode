import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Raised by `DokusyaService.approve / reject` when the target row's
 * `denshi_shonin_status` is not `0` (承認待ち) — i.e. the row was
 * already approved (`1`) or rejected (`2`). api.md §エラー一覧 #10.
 *
 * The status guard short-circuits BEFORE any audit log so a no-op
 * approval cannot pollute `t_log`.
 */
export class InvalidDokusyaStatusException extends DomainException {
  constructor(message: string = ErrorMessage.INVALID_STATUS) {
    super(message, ErrorCode.INVALID_STATUS, HttpStatus.BAD_REQUEST);
  }
}
