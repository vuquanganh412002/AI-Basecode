import { HttpStatus } from '@nestjs/common';

import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * `TARGET_JA_REQUIRED`（docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md
 * §エラー一覧 row 11）— upload 時に ja_ids[] が欠落 or 空。
 */
export class TargetJaRequiredException extends DomainException {
  constructor(message: string = ErrorMessage.TARGET_JA_REQUIRED) {
    super(message, ErrorCode.TARGET_JA_REQUIRED, HttpStatus.BAD_REQUEST);
  }
}
