import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * 一括 Excel 取込の行単位エラーを 1 つの 400 IMPORT_VALIDATION_ERROR レスポンスに
 * 集約する。`errors` の各要素は該当行（1始まり・ヘッダを行1とする）+ field + 日本語
 * メッセージを持ち、FE が行ごとにグリッド注釈を描画できる。
 *
 * `DomainException` でなく `HttpException` を直接継承するのは、ボディ形が可変長の
 * `errors[]` を含むため。`GlobalExceptionFilter` が HttpException のレスポンス
 * オブジェクトから `code` / `error_code` / `errors` をそのまま読む。
 *
 * ACSMS-SCR-019-api.md §エラー一覧 参照。
 */
export class ImportValidationException extends HttpException {
  constructor(
    errors: Array<{ row?: number; field: string; message: string }>,
    message?: string,
  ) {
    super(
      {
        code: ErrorCode.IMPORT_VALIDATION_ERROR,
        error_code: ErrorCode.IMPORT_VALIDATION_ERROR,
        message: message ?? ErrorMessage.IMPORT_VALIDATION_ERROR,
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
