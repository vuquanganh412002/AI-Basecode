import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 候補行の現 `hanbaiten_id` が要求された `new_hanbaiten_id` と既に等しいとき
 * `DokusyaService.replaceHanbaiten` が送出 — 販売店 を自身に置換するのは no-op で
 * UI がブロックすべき。api.md §4.3 業務ルール + §エラー一覧 row 9。
 */
export class SameHanbaitenException extends DomainException {
  constructor(message: string = ErrorMessage.SAME_HANBAITEN) {
    super(message, ErrorCode.SAME_HANBAITEN, HttpStatus.BAD_REQUEST);
  }
}
