import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 絞り込み件数が 0 のとき `HanbaitenService.exportExcel` が送出（顧客CR 2026-08-24）。
 */
export class ExportNoDataException extends DomainException {
  constructor() {
    super('出力データがありません。', 'EXPORT_NO_DATA', HttpStatus.NOT_FOUND);
  }
}
