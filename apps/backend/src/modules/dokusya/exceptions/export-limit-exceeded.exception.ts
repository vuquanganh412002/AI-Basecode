import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Raised by `DokusyaService.exportExcel` when the filtered count
 * exceeds 30,000. api.md §エラー一覧 #11 + §4.3 (30,000件上限).
 *
 * Note — the SCR-030 (ログ参照画面) module has its own
 * `ExportLimitExceededException` with a 5,000-row limit and a
 * different message; that module-local exception is reused there.
 * Different limit + different copy → separate class here so each
 * module's contract stays self-contained.
 */
export class ExportLimitExceededException extends DomainException {
  constructor() {
    super(
      '出力データ件数が30000件を超えています。',
      'EXPORT_LIMIT_EXCEEDED',
      HttpStatus.CONFLICT,
    );
  }
}
