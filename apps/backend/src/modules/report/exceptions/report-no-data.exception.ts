import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * Excel出力(ACSMS-API-026-002)で出力条件に一致する購読者行が無いとき送出する。
 * ファイルは生成せず、FE は ACSMS-MSG-026-004「対象のデータが存在しません。」を表示。
 * ※ プレビュー(API-026-001)はこれを投げず、HTTP 200 + 空グループ
 *   （grand_total_busu = 0）を返す。
 */
export class ReportNoDataException extends DomainException {
  constructor() {
    super('対象のデータが存在しません。', 'REPORT_NO_DATA', HttpStatus.NOT_FOUND);
  }
}
