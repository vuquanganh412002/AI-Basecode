import { HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';
import { DomainException } from '@/common/exceptions/domain.exception';

/** 行単位の取込エラー1件（1始まり）。 */
export interface DokusyaImportRowError {
  row?: number;
  field: string;
  message: string;
}

/**
 * ACSMS-SCR-016 — 行単位の取込エラーを単一の 400 IMPORT_VALIDATION_ERROR
 * レスポンスに集約する。各 `errors[]` エントリは該当行（1始まり）+ フィールド +
 * 日本語メッセージを持ち、FE が行ごとにグリッドへ注記できる。呼び出し側で10件に制限。
 *
 * `DomainException<DokusyaImportRowError>` — `errors[]` が既定の
 * `{ field, message }` でなく行番号付きなので型引数で形状を差し替える
 * （`.claude/rules/nestjs.md` 例外標準: 業務例外は必ず `DomainException` を継承）。
 * `code` は基底クラスのコンストラクタパラメータプロパティとして自動公開される
 * ため、`err.code`（`err.response.code` ではなく）を直接見る単体テストも
 * そのまま動く。
 */
export class DokusyaImportValidationException extends DomainException<DokusyaImportRowError> {
  constructor(errors: DokusyaImportRowError[], message?: string) {
    super(
      message ?? ErrorMessage.IMPORT_VALIDATION_ERROR,
      ErrorCode.IMPORT_VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}
