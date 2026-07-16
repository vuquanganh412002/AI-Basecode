import { HttpStatus } from '@nestjs/common';

import {
  DomainException,
  type ValidationErrorDetail,
} from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 失効単価参照エラー — 出力対象に active_flg=FALSE の単価を参照する対象が含まれる
 * ときに送出する共通例外。
 *
 * 顧客要件 2026-07: 単価失効バッチ（tekiyo_end_date < 本日 → active_flg=false）で
 * 失効した単価は「新規に選択できない」だけで、既存の紐付けは失効単価を参照したまま
 * 自動移行しない。各出力画面はこの参照を検出したらエラーで止め、該当対象を提示する
 * （運用者が手動で新単価へ変更 → 当日中に再出力）。
 *   - SCR-020 口座振替: 購読者の購読料単価(tanka_type=1)
 *   - SCR-021 配達手数料: 販売店の配達手数料単価(tanka_type=2)
 *
 * HTTP 409 / error_code = INACTIVE_TANKA_REFERENCED。
 * `errors[]` は該当対象を `{ field, message }` で列挙する（先頭 N 件で打ち切り）。
 * `total` は該当対象の総件数。全件確認・単価変更は各明細検索画面の絞込で行う運用。
 *
 * @param errors  先頭 N 件までの該当対象（field=id, message=名称+単価）
 * @param total   該当対象の総件数（errors.length で打ち切られる前の全件数）
 * @param message 画面ごとの案内文（省略時は SCR-020 口座振替の既定文言）
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
