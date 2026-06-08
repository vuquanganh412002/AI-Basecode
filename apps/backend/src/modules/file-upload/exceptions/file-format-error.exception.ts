import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * SCR-023 — 許可されていないファイル形式 (extension whitelist breach).
 *
 * Shares the `FILE_FORMAT_ERROR` code with SCR-019's Excel import but
 * uses a different default Japanese message (per api.md §エラー一覧
 * row 10). We override the default message here rather than touching
 * the shared `ErrorMessage.FILE_FORMAT_ERROR` to avoid breaking the
 * existing SCR-019 wording.
 */
export class FileUploadFormatException extends DomainException {
  constructor(message: string = '許可されていないファイル形式です。') {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
