import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 絞り込み件数が 30,000 を超えたとき `DokusyaService.exportExcel` が送出。
 * api.md §エラー一覧 #11 + §4.3（30,000件上限）。
 *
 * 注意 — ACSMS-SCR-030（ログ参照画面）モジュールは 5,000 行上限＋別メッセージの
 * 独自 `ExportLimitExceededException` を持ち、そちらで再利用される。上限と文言が
 * 異なる → 各モジュールの契約を自己完結させるため、ここは別クラスにする。
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
