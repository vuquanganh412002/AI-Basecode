import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Raised by both 増減連絡票（販売店） endpoints (ACSMS-API-028-001 preview /
 * ACSMS-API-028-002 export) when no 増減対象 row matches the output
 * conditions — the file is NOT generated and the FE shows
 * ACSMS-MSG-028-002「対象のデータが存在しません。」.
 *
 * Unlike the 購読者名簿 preview (which returns 200 with empty groups), the
 * 増減連絡票 preview DOES throw this — a 増減連絡票 with no rows is
 * meaningless, so api.md §4.4 mandates HTTP 404 for both preview and export.
 */
export class ZougenNoDataException extends DomainException {
  constructor() {
    super('対象のデータが存在しません。', 'NO_REPORT_DATA', HttpStatus.NOT_FOUND);
  }
}
