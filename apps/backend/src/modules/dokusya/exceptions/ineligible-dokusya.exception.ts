import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

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
 * `DomainException<IneligibleDokusyaDetail>` — `errors[]` が既定の
 * `{ field, message }` でなく `{ dokusya_id, reason }` なので型引数で形状を
 * 差し替える（`.claude/rules/nestjs.md` 例外標準: 業務例外は必ず `DomainException`
 * を継承）。`code` は基底クラスのコンストラクタパラメータプロパティとして自動公開
 * されるため、`.rejects.toMatchObject({ code })` はそのまま動く。
 */
export class IneligibleDokusyaException extends DomainException<IneligibleDokusyaDetail> {
  constructor(
    errors: IneligibleDokusyaDetail[],
    message: string = ErrorMessage.INELIGIBLE_DOKUSYA,
  ) {
    super(message, ErrorCode.INELIGIBLE_DOKUSYA, HttpStatus.BAD_REQUEST, errors);
  }
}
