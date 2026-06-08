import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * Per-row reason describing why a candidate 購読者 cannot have its
 * 販売店 replaced (併読者 / 電子版クレカ決済者).
 */
export interface IneligibleDokusyaDetail {
  dokusya_id: number;
  reason: string;
}

/**
 * Raised by `DokusyaService.replaceHanbaiten` when one or more candidate
 * rows are ineligible for bulk replacement — 併読者 (dokusya_shubetsu=3)
 * or 電子版クレカ決済者 (dokusya_shubetsu=2 && shiharai_hoho=6).
 * api.md §4.3 業務ルール + §エラー一覧 row 10.
 *
 * Extends `HttpException` directly (NOT `DomainException`) because the
 * body carries the variable-length `errors[]` array; `GlobalExceptionFilter`
 * reads `code` / `error_code` / `errors` off the response object verbatim.
 */
export class IneligibleDokusyaException extends HttpException {
  /** Mirrors `DomainException.code` so `.rejects.toMatchObject({ code })` matches. */
  public readonly code: string = ErrorCode.INELIGIBLE_DOKUSYA;

  constructor(
    errors: IneligibleDokusyaDetail[],
    message: string = ErrorMessage.INELIGIBLE_DOKUSYA,
  ) {
    super(
      {
        code: ErrorCode.INELIGIBLE_DOKUSYA,
        error_code: ErrorCode.INELIGIBLE_DOKUSYA,
        message,
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
