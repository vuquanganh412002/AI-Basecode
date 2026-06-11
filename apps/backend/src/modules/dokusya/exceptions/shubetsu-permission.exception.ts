import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/**
 * Raised when the acting account lacks the account-level flag required for
 * the row's 購読種別 (account_concept.md §139-145 — 電子版 side; 紙版 side is
 * the symmetric rule):
 *   - 紙版 (dokusya_shubetsu=1) operations require `m_account.paper_flg`
 *   - 電子版 (dokusya_shubetsu=2) operations (create / update / approve /
 *     reject) require `m_account.denshi_flg`
 *
 * This is an ADDITIONAL gate on top of the role permission
 * (`dokusya.create` / `dokusya.update`): an account needs BOTH the
 * permission AND the matching flag. 併読 (=3) records are read-only and
 * never reach this gate.
 *
 * HTTP 403 with a toast-only code (`SHUBETSU_PERMISSION_DENIED`) — the FE
 * stays on the form (no /dashboard bounce), since the user simply can't
 * act on this 購読種別.
 */
export class ShubetsuPermissionException extends DomainException {
  constructor(message: string) {
    super(message, ErrorCode.SHUBETSU_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
  }

  /** 紙版 (dokusya_shubetsu=1) — account is missing `paper_flg`. */
  static paper(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '紙版購読者の登録・編集を行う権限がありません。',
    );
  }

  /** 電子版 (dokusya_shubetsu=2) — account is missing `denshi_flg`. */
  static denshi(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '電子版購読者の登録・編集・承認を行う権限がありません。',
    );
  }

  /**
   * Account has NEITHER flag — used by operations not tied to a single
   * 購読種別 (一括取込 / 一括置換 / 削除). Such an account cannot manage
   * any 購読者 (account_concept.md §139-145).
   */
  static noFlag(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '購読者の操作権限がありません。（紙版・電子版いずれの取扱い権限もありません）',
    );
  }
}
