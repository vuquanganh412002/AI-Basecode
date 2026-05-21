import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * SCR-031 §エラー一覧 row 9 — `DEADLINE_NOTICE_DUPLICATE`.
 *
 * Only one notice with publish_location=2 (メニュー画面) AND
 * oshirase_type=4 (締め切り時間) may exist at a time. Create rejects
 * the second.
 */
export class DeadlineNoticeDuplicateException extends DomainException {
  constructor() {
    super(
      '公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。',
      'DEADLINE_NOTICE_DUPLICATE',
      HttpStatus.BAD_REQUEST,
    );
  }
}
