import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/** ACSMS-SCR-016 行数上限メッセージ — 5000行上限（共有の500デフォルトではない）。 */
export const DOKUSYA_IMPORT_ROW_LIMIT_MESSAGE =
  'ファイルの行数が上限（5000行）を超えているため、取込みできません。';

/**
 * ACSMS-SCR-016 — 取込ペイロードが 5000 行上限を超えたとき送出。通常のクライアントは
 * DTO の `@ArrayMaxSize(5000)` が捕捉する。このサービス層の再送出は二重防御と
 * プロジェクト正規の `ROW_LIMIT_EXCEEDED` コードを提供する。5000 行のメッセージは
 * 明示的に渡す — 共有の `ErrorMessage.ROW_LIMIT_EXCEEDED` デフォルトは 500 を挙げるため。
 */
export class DokusyaRowLimitExceededException extends DomainException {
  constructor(message: string = DOKUSYA_IMPORT_ROW_LIMIT_MESSAGE) {
    super(message, ErrorCode.ROW_LIMIT_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
