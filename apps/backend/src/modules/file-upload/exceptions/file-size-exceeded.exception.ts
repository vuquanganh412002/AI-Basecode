import { HttpStatus } from '@nestjs/common';

import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * `FILE_SIZE_EXCEEDED`（docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md
 * §エラー一覧 row 9）— アップロードファイル 1 件が上限サイズを超過。
 */
export class FileSizeExceededException extends DomainException {
  constructor(message: string = ErrorMessage.FILE_SIZE_EXCEEDED) {
    super(message, ErrorCode.FILE_SIZE_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
