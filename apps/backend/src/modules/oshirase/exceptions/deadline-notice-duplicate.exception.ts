import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * SCR-031 §エラー一覧 row 9 — `DEADLINE_NOTICE_DUPLICATE`.
 *
 * Only ONE notice with oshirase_type=4 (締め切り時間) may exist system-
 * wide regardless of `publish_location` (顧客確認 2026-05). Since the
 * type=4 ⇔ publish_location=3 (メニュー画面（締め切り時間）) pairing
 * is also enforced 1:1, the human-readable message refers to "公開場所
 * 「メニュー画面」かつ種別「締め切り時間」" — the slot the existing
 * record occupies. Create + Update reject any attempt to introduce a
 * second.
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
