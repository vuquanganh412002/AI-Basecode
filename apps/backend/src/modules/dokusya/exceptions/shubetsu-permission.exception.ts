import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/**
 * 操作アカウントが行の 購読種別 に必要なアカウントレベルのフラグを欠くとき送出
 * （account_concept.md §139-145 — 電子版 側。紙版 側は対称ルール）:
 *   - 紙版（dokusya_shubetsu=1）操作は `m_account.paper_flg` が必要
 *   - 電子版（dokusya_shubetsu=2）操作（create / update / approve / reject）は
 *     `m_account.denshi_flg` が必要
 *
 * これはロール権限（`dokusya.create` / `dokusya.update`）の上に重なる追加ゲート:
 * アカウントは権限と対応フラグの両方が必要。併読（=3）レコードは読取専用で
 * このゲートには到達しない。
 *
 * トーストのみのコード（`SHUBETSU_PERMISSION_DENIED`）付きの HTTP 403 — ユーザーは
 * この 購読種別 を操作できないだけなので、FE はフォームに留まる（/dashboard へ跳ねない）。
 */
export class ShubetsuPermissionException extends DomainException {
  constructor(message: string) {
    super(message, ErrorCode.SHUBETSU_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
  }

  /** 紙版（dokusya_shubetsu=1）— アカウントが `paper_flg` を欠く。 */
  static paper(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '紙版購読者の登録・編集を行う権限がありません。',
    );
  }

  /** 電子版（dokusya_shubetsu=2）— アカウントが `denshi_flg` を欠く。 */
  static denshi(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '電子版購読者の登録・編集・承認を行う権限がありません。',
    );
  }

  /**
   * アカウントがどちらのフラグも持たない — 単一の 購読種別 に紐づかない操作
   * （一括取込／一括置換／削除）で使用。そのようなアカウントはどの 購読者 も
   * 管理できない（account_concept.md §139-145）。
   */
  static noFlag(): ShubetsuPermissionException {
    return new ShubetsuPermissionException(
      '購読者の操作権限がありません。（紙版・電子版いずれの取扱い権限もありません）',
    );
  }
}
