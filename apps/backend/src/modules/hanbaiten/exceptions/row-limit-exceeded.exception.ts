import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

/**
 * 取込ペイロードが 500 行上限を超えたときに送出。通常クライアントは DTO の
 * `@ArrayMaxSize(500)` が捕捉する。この service 層の再送出は DTO をバイパスする
 * クライアント向けの多層防御（かつ正準の `ROW_LIMIT_EXCEEDED` コード）を提供する。
 */
export class RowLimitExceededException extends DomainException {
  constructor(message: string = ErrorMessage.ROW_LIMIT_EXCEEDED) {
    super(message, ErrorCode.ROW_LIMIT_EXCEEDED, HttpStatus.BAD_REQUEST);
  }
}
