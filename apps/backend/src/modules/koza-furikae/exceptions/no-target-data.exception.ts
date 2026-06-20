import { HttpStatus } from '@nestjs/common';

import { DomainException } from '@/common/exceptions/domain.exception';

/**
 * 対象データなし (ACSMS-SCR-020 §エラー一覧 #8). 口座振替の集計対象となる購読者が
 * 0 件のとき送出する。HTTP 404 / error_code = NO_TARGET_DATA。
 */
export class NoTargetDataException extends DomainException {
  constructor() {
    super('対象データがありません。', 'NO_TARGET_DATA', HttpStatus.NOT_FOUND);
  }
}
