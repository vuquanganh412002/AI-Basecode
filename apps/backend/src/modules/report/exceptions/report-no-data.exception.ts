import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Raised by the Excel export (ACSMS-API-026-002) when no subscriber row
 * matches the output conditions — the file is NOT generated and the FE
 * shows ACSMS-MSG-026-004「対象のデータが存在しません。」.
 *
 * Note: the PREVIEW endpoint (API-026-001) does NOT throw this — it
 * returns HTTP 200 with empty groups (grand_total_busu = 0).
 */
export class ReportNoDataException extends DomainException {
  constructor() {
    super('対象のデータが存在しません。', 'REPORT_NO_DATA', HttpStatus.NOT_FOUND);
  }
}
