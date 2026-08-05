import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@/common/constants/error-codes.constant';

/**
 * 全業務例外の基底クラス。
 * body は `code` (GlobalExceptionFilter が内部で読む) と `error_code`
 * (公開 HTTP フィールド名。`exception.response.error_code` を見るテストでも使用)
 * の両方を持つ — filter 内部モデルと公開 API のインピーダンス不整合を回避。
 */
/** クライアントへ `errors[]` で返すフィールド単位の validation detail。 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class DomainException extends HttpException {
  constructor(
    message: string,
    // `ErrorCode | (string & {})` — 素の `| string` だとリテラル union が
    // string に吸収され ErrorCode の補完も型チェックも効かなくなる。
    // BE 追加コードや将来の未知コードは受けたいのでこの形にする。
    public readonly code: ErrorCode | (string & {}),
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    /**
     * VALIDATION_ERROR のフィールド詳細。GlobalExceptionFilter が `errors[]` に
     * serialize → FE `useApiForm` が `<a-form-item :help>` にマップ。
     */
    public readonly errors?: ValidationErrorDetail[],
    /**
     * `errors[]` を打ち切る list 系エラーの総件数 (例 SCR-020
     * INACTIVE_TANKA_REFERENCED は先頭15件+真の総数)。filter が `total` に
     * serialize → FE が「該当 N 件中 15 件を表示」を表示。
     */
    public readonly total?: number,
  ) {
    super(
      {
        message,
        code,
        error_code: code,
        ...(errors ? { errors } : {}),
        ...(total !== undefined ? { total } : {}),
      },
      status,
    );
  }
}
