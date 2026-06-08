import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Raised by `DokusyaService.remove` when the target 購読者 is a
 * 電子版クレジットカード決済者 (`dokusya_shubetsu = 2 AND shiharai_hoho = 6`)
 * or a 併読者 (`dokusya_shubetsu = 3`). api.md §エラー一覧 #10 +
 * §4.3 読み取り専用判定.
 *
 * NOTE — message uses full-width parentheses （）to match the
 * canonical literal from api.md / screen-design.md word-for-word.
 */
export class DokusyaReadOnlyException extends DomainException {
  constructor() {
    super(
      'この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）',
      'DOKUSYA_READ_ONLY',
      HttpStatus.FORBIDDEN,
    );
  }
}
