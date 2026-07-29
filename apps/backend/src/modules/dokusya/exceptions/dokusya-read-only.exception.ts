import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 対象購読者が 電子版クレジットカード決済者（`dokusya_shubetsu = 2 AND
 * shiharai_hoho = 6`）または 併読者（`dokusya_shubetsu = 3`）のとき
 * `DokusyaService.remove` が送出。api.md §エラー一覧 #10 + §4.3 読み取り専用判定。
 *
 * 注意 — メッセージは api.md / screen-design.md の正規リテラルに一字一句合わせるため
 * 全角括弧（）を使用。
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
