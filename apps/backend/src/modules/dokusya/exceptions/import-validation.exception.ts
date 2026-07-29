import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * ACSMS-SCR-016 — 行単位の取込エラーを単一の 400 IMPORT_VALIDATION_ERROR
 * レスポンスに集約する。各 `errors[]` エントリは該当行（1始まり）+ フィールド +
 * 日本語メッセージを持ち、FE が行ごとにグリッドへ注記できる。呼び出し側で10件に制限。
 *
 * `DomainException` ではなく `HttpException` を直接継承する — ボディ形状が可変長の
 * `errors[]` 配列を持つため。`GlobalExceptionFilter` はレスポンスオブジェクトから
 * `code` / `error_code` / `errors` をそのまま読む。
 */
export class DokusyaImportValidationException extends HttpException {
  /**
   * トップレベル `code` のミラー — ボディは既に `code` / `error_code` を持つが、
   * サービス単体テストが `err.code` を直接（`err.response.code` ではなく）
   * アサートするため、自身のプロパティとしても公開する。
   */
  public readonly code: string = ErrorCode.IMPORT_VALIDATION_ERROR;

  constructor(
    public readonly errors: Array<{ row?: number; field: string; message: string }>,
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
