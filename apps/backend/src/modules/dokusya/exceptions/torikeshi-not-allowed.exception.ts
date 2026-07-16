import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Raised when a 履歴(t_dokusya_rireki) 取消 is attempted on a row that cannot
 * be cancelled — 電子版/併読 (紙版のみ可) / 適用日到来済み (適用日未来のみ可) /
 * 新規(shinki) / 取消済(torikeshi) / 中間レコード (not the chain tail).
 * Mirrors {@link canTorikeshi} (顧客要件2026-07). api.md §エラー一覧 — 400.
 */
export class TorikeshiNotAllowedException extends DomainException {
  constructor(message: string = ErrorMessage.TORIKESHI_NOT_ALLOWED) {
    super(message, ErrorCode.TORIKESHI_NOT_ALLOWED, HttpStatus.BAD_REQUEST);
  }
}
