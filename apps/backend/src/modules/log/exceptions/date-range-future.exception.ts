import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/** 未来日時を弾く対象のフィールド表示名。 */
export type FutureDateField = '開始日' | '終了日';

/**
 * 検索期間に未来の日時を指定したとき（ACSMS-MSG-030-007 / 030-008）。
 *
 * 未来日時にログは存在しないので、0件を返すより「指定が誤り」と明示する。
 * どちらの欄が原因かを文言に含める — 両方入力する画面で「未来日時が不正」とだけ
 * 言われても、ユーザーはどちらを直せばよいか分からない。
 *
 * 画面はカレンダー側でも未来日を選べないようにしているが、時刻部分は手入力でき、
 * API 直叩きもあり得るのでサーバでも弾く。
 */
export class DateRangeFutureException extends DomainException {
  constructor(field: FutureDateField) {
    super(
      `「${field}」に未来の日時は指定できません。`,
      'DATE_RANGE_FUTURE',
      HttpStatus.BAD_REQUEST,
    );
  }
}
