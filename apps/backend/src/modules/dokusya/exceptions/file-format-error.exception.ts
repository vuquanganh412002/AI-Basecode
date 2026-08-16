import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/** ACSMS-SCR-016 ファイル形式エラーメッセージ（api.md §エラー一覧）。 */
export const DOKUSYA_IMPORT_FILE_FORMAT_MESSAGE =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';

/**
 * ACSMS-SCR-016 — 取込ペイロードが正規構造として解釈できないとき送出（例: 数値列に
 * DTO をすり抜けた非数値文字列が入っている）。`FILE_FORMAT_ERROR`（400）にマップ。
 */
export class DokusyaFileFormatErrorException extends DomainException {
  constructor(message: string = DOKUSYA_IMPORT_FILE_FORMAT_MESSAGE) {
    super(message, ErrorCode.FILE_FORMAT_ERROR, HttpStatus.BAD_REQUEST);
  }
}
