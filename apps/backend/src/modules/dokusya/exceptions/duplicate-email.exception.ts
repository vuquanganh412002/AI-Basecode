import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@/common/exceptions/domain.exception';
import { ErrorCode, ErrorMessage } from '@/common/constants/error-codes.constant';

/**
 * 保存しようとしたメールが同一 JA スコープ内の別の未削除行で既に使われているとき
 * `DokusyaService.create / update` が送出（api.md §エラー一覧 #9 + §4.3 重複チェック）。
 *
 * `GlobalExceptionFilter` がレスポンスボディの `error_code` を読み、FE は
 * `{ error_code: 'DUPLICATE_EMAIL', message }` を見る — `useApiForm` が
 * トースト／インラインエラーにマップする。
 */
export class DuplicateEmailException extends DomainException {
  constructor(message: string = ErrorMessage.DUPLICATE_EMAIL) {
    super(message, ErrorCode.DUPLICATE_EMAIL, HttpStatus.BAD_REQUEST);
  }
}
