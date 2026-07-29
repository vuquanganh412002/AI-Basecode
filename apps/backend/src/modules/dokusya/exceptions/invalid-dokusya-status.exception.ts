import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 対象行の `denshi_shonin_status` が `0`（承認待ち）でないとき
 * `DokusyaService.approve / reject` が送出 — すなわち既に承認済み（`1`）または
 * 否認（`2`）。api.md §エラー一覧 #10。
 *
 * ステータスガードは監査ログの前に短絡するため、no-op 承認が `t_log` を汚さない。
 */
export class InvalidDokusyaStatusException extends DomainException {
  constructor(message: string = ErrorMessage.INVALID_STATUS) {
    super(message, ErrorCode.INVALID_STATUS, HttpStatus.BAD_REQUEST);
  }
}
