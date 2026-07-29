import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 絞り込み件数が 0 のとき `DokusyaService.exportExcel` が送出。
 * api.md §エラー一覧 #12 + §4.3（件数チェック）。
 */
export class ExportNoDataException extends DomainException {
  constructor() {
    super('出力データがありません。', 'EXPORT_NO_DATA', HttpStatus.NOT_FOUND);
  }
}
