import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

export class DateRangeTooLongException extends DomainException {
  constructor() {
    super(
      '検索期間は5年以内で指定してください。',
      'DATE_RANGE_TOO_LONG',
      HttpStatus.BAD_REQUEST,
    );
  }
}
