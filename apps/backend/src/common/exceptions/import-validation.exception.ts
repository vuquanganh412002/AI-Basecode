import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';
import { DomainException } from './domain.exception';

/** 行単位の取込エラー1件（1始まり・ヘッダを行1とする）。 */
export interface ImportRowError {
  row?: number;
  field: string;
  message: string;
}

/**
 * 一括Excel取込の行単位エラーを1つの400 IMPORT_VALIDATION_ERRORレスポンスに
 * 集約する。`errors` の各要素は該当行（1始まり・ヘッダを行1とする）+ field +
 * 日本語メッセージを持ち、FEが行ごとにグリッド注釈を描画できる。
 *
 * ACSMS-SCR-016（購読者Excel取込）と ACSMS-SCR-019（販売店Excel取込）が、
 * `DokusyaImportValidationException` / `ImportValidationException` として
 * 構造が完全に同一のクラスを個別にモジュール内へ実装していたのを統合した
 * （不具合修正2026-08）。今後Excel取込画面が増えてもここを再利用する。
 *
 * `DomainException<ImportRowError>` — `errors[]` が既定の `{ field, message }`
 * でなく行番号付きなので型引数で形状を差し替える（`.claude/rules/nestjs.md`
 * 例外標準: 業務例外は必ず `DomainException` を継承）。
 */
export class ImportValidationException extends DomainException<ImportRowError> {
  constructor(errors: ImportRowError[], message?: string) {
    super(
      message ?? ErrorMessage.IMPORT_VALIDATION_ERROR,
      ErrorCode.IMPORT_VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}
