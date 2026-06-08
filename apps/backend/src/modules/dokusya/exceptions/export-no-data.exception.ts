import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Raised by `DokusyaService.exportExcel` when the filtered count is 0.
 * api.md §エラー一覧 #12 + §4.3 (件数チェック).
 */
export class ExportNoDataException extends DomainException {
  constructor() {
    super('出力データがありません。', 'EXPORT_NO_DATA', HttpStatus.NOT_FOUND);
  }
}
