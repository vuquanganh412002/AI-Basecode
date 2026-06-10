import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

export class DateRangeInvalidException extends DomainException {
  constructor() {
    super(
      '「開始日」は「終了日」以前の日付を入力してください。',
      'DATE_RANGE_INVALID',
      HttpStatus.BAD_REQUEST,
    );
  }
}
