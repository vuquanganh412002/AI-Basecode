import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 候補購読者が 販売店 を置換できない理由（行単位）— 併読者／電子版クレカ決済者。
 */
export interface IneligibleDokusyaDetail {
  dokusya_id: number;
  reason: string;
}

/**
 * 一括置換の候補行に対象外が1件以上あるとき `DokusyaService.replaceHanbaiten` が送出
 * — 併読者（dokusya_shubetsu=3）または 電子版クレカ決済者（dokusya_shubetsu=2 &&
 * shiharai_hoho=6）。api.md §4.3 業務ルール + §エラー一覧 row 10。
 *
 * `DomainException` ではなく `HttpException` を直接継承する — ボディが可変長の
 * `errors[]` 配列を持つため。`GlobalExceptionFilter` はレスポンスオブジェクトから
 * `code` / `error_code` / `errors` をそのまま読む。
 */
export class IneligibleDokusyaException extends HttpException {
  /** `.rejects.toMatchObject({ code })` が一致するよう `DomainException.code` をミラー。 */
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
