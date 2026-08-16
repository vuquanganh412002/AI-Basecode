import { HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/** 行単位の取込エラー1件（1始まり・ヘッダを行1とする）。 */
export interface HanbaitenImportRowError {
  row?: number;
  field: string;
  message: string;
}

/**
 * 一括 Excel 取込の行単位エラーを 1 つの 400 IMPORT_VALIDATION_ERROR レスポンスに
 * 集約する。`errors` の各要素は該当行（1始まり・ヘッダを行1とする）+ field + 日本語
 * メッセージを持ち、FE が行ごとにグリッド注釈を描画できる。
 *
 * `DomainException<HanbaitenImportRowError>` — `errors[]` が既定の
 * `{ field, message }` でなく行番号付きなので型引数で形状を差し替える
 * （`.claude/rules/nestjs.md` 例外標準: 業務例外は必ず `DomainException` を継承）。
 *
 * ACSMS-SCR-019-api.md §エラー一覧 参照。
 */
export class ImportValidationException extends DomainException<HanbaitenImportRowError> {
  constructor(errors: HanbaitenImportRowError[], message?: string) {
    super(
      message ?? ErrorMessage.IMPORT_VALIDATION_ERROR,
      ErrorCode.IMPORT_VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}
