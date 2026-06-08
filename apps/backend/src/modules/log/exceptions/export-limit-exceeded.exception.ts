import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

export class ExportLimitExceededException extends DomainException {
  constructor() {
    super(
      '検索結果が5,000件を超えています。条件を絞り込んでください。',
      'EXPORT_LIMIT_EXCEEDED',
      HttpStatus.CONFLICT,
    );
  }
}
