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

/**
 * `TErrorDetail` — `errors[]` 要素の型。大半の業務例外はフィールド単位の
 * `{ field, message }`（既定 `ValidationErrorDetail`）で足りるが、一括処理系
 * （Excel取込の行単位エラー `{ row, field, message }`、対象外理由の列挙
 * `{ dokusya_id, reason }` 等）は形状が異なる。以前はこれを理由に `HttpException`
 * を直接継承する例外クラスが複数モジュールに分散していた（`DomainException` を
 * 継承しない = 例外標準からの逸脱）。型引数で `errors[]` の形状だけ差し替え可能に
 * し、全業務例外が `DomainException` を継承する運用に統一する。
 */
export class DomainException<
  TErrorDetail = ValidationErrorDetail,
> extends HttpException {
  constructor(
    message: string,
    // `ErrorCode | (string & {})` — 素の `| string` だとリテラル union が
    // string に吸収され ErrorCode の補完も型チェックも効かなくなる。
    // BE 追加コードや将来の未知コードは受けたいのでこの形にする。
    public readonly code: ErrorCode | (string & {}),
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    /**
     * VALIDATION_ERROR のフィールド詳細（既定形状）。GlobalExceptionFilter が
     * `errors[]` に serialize → FE `useApiForm` が `<a-form-item :help>` にマップ。
     * 一括処理系のサブクラスは `TErrorDetail` で行番号付き等の形状に差し替える。
     */
    public readonly errors?: TErrorDetail[],
    /**
     * `errors[]` を打ち切る list 系エラーの総件数 (例 ACSMS-SCR-020
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
