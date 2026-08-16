import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * ACSMS-SCR-031 §エラー一覧 row 9 — `DEADLINE_NOTICE_DUPLICATE`。
 *
 * oshirase_type=4（締め切り時間）は publish_location に関わらずシステム
 * 全体で1件のみ（顧客確認 2026-05）。type=4 ⇔ publish_location=3 の
 * 1:1 対応も強制されるため、メッセージは既存レコードが占める枠
 * 「公開場所メニュー画面 かつ 種別 締め切り時間」を指す。Create/Update
 * とも2件目の作成を拒否。
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
