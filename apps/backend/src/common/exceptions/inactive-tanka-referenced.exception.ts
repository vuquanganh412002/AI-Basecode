import { HttpStatus } from '@nestjs/common';

import {
  DomainException,
  type ValidationErrorDetail,
} from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 失効単価参照エラー — 出力対象に active_flg=FALSE の単価参照が含まれるとき送出。
 *
 * 顧客要件 2026-07: 失効バッチ (tekiyo_end_date < 本日 → active_flg=false) で
 * 失効した単価は新規選択不可なだけで、既存紐付けは自動移行しない。出力画面は
 * この参照を検出したらエラーで止め該当対象を提示 (運用者が手動で新単価へ変更→当日再出力)。
 *   - ACSMS-SCR-020 口座振替: 購読者の購読料単価(tanka_type=1)
 *   - ACSMS-SCR-021 配達手数料: 販売店の配達手数料単価(tanka_type=2)
 *
 * HTTP 409 / error_code = INACTIVE_TANKA_REFERENCED。
 * `errors[]`=該当対象 `{ field, message }` (先頭 N 件で打ち切り)、`total`=総件数。
 *
 * @param errors  先頭 N 件 (field=id, message=名称+単価)
 * @param total   打ち切り前の総件数
 * @param message 画面別案内文 (省略時 ACSMS-SCR-020 既定文言)
 */
export class InactiveTankaReferencedException extends DomainException {
  constructor(
    errors: ValidationErrorDetail[],
    total: number,
    message: string = ErrorMessage.INACTIVE_TANKA_REFERENCED,
  ) {
    super(
      message,
      ErrorCode.INACTIVE_TANKA_REFERENCED,
      HttpStatus.CONFLICT,
      errors,
      total,
    );
  }
}
