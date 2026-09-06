import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 絞り込み件数が 5,000 を超えたとき `HanbaitenService.exportExcel` が送出
 * （顧客CR 2026-08-24）。dokusya モジュールの `ExportLimitExceededException` と
 * 上限・文言が異なるため、各モジュールの契約を自己完結させる方針（同モジュール
 * のコメント参照）に従い別クラスにする。
 */
export class ExportLimitExceededException extends DomainException {
  constructor() {
    super(
      '出力データ件数が5000件を超えています。',
      'EXPORT_LIMIT_EXCEEDED',
      HttpStatus.CONFLICT,
    );
  }
}
