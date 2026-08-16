import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * ACSMS-SCR-023 — 許可されていないファイル形式（拡張子ホワイトリスト違反）。
 *
 * `FILE_FORMAT_ERROR` コードは ACSMS-SCR-019 の Excel import と共有するが、既定の
 * 日本語メッセージは別(api.md §エラー一覧 row 10)。ACSMS-SCR-019 の文言を壊さない
 * よう、共有 `ErrorMessage.FILE_FORMAT_ERROR` を触らずここで既定を上書きする。
 */
export class FileUploadFormatException extends DomainException {
  constructor(message: string = '許可されていないファイル形式です。') {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
