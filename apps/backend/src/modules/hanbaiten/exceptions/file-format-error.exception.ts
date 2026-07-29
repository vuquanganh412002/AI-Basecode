import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * 取込ペイロードが正準 23 列構造として解釈できないときに送出（例: DTO をすり抜けた
 * 非数値文字列を持つ数値列）。ACSMS-SCR-019-api.md §エラー一覧 の
 * `FILE_FORMAT_ERROR` に対応。
 */
export class FileFormatErrorException extends DomainException {
  constructor(message: string = ErrorMessage.FILE_FORMAT_ERROR) {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
