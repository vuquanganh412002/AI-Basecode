import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/** SCR-016 file-format message (api.md §エラー一覧). */
export const DOKUSYA_IMPORT_FILE_FORMAT_MESSAGE =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';

/**
 * ACSMS-SCR-016 — thrown when the import payload can't be interpreted
 * as the canonical structure (e.g. a numeric column carries a
 * non-numeric string that slipped past the DTO). Maps to
 * `FILE_FORMAT_ERROR` (400).
 */
export class DokusyaFileFormatErrorException extends DomainException {
  constructor(message: string = DOKUSYA_IMPORT_FILE_FORMAT_MESSAGE) {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
