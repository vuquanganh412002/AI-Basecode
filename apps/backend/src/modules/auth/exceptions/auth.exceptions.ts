import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../common/exceptions/domain.exception';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(
      'ユーザーIDまたはパスワードが正しくありません。',
      'INVALID_CREDENTIALS',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AccountLockedException extends DomainException {
  constructor() {
    super('アカウントがロックされています。', 'ACCOUNT_LOCKED', HttpStatus.FORBIDDEN);
  }
}

export class InvalidMfaTokenException extends DomainException {
  constructor() {
    super(
      'MFAトークンが無効です。再度ログインしてください。',
      'INVALID_MFA_TOKEN',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InvalidOtpException extends DomainException {
  constructor() {
    super('認証コードが正しくありません。', 'INVALID_OTP', HttpStatus.UNAUTHORIZED);
  }
}

export class OtpExpiredException extends DomainException {
  constructor() {
    super(
      '認証コードの有効期限が切れました。再度ログインしてください。',
      'OTP_EXPIRED',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class OtpMaxAttemptsException extends DomainException {
  constructor() {
    super(
      '認証コードの入力回数が上限に達しました。再度ログインしてください。',
      'OTP_MAX_ATTEMPTS',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class OtpResendLimitException extends DomainException {
  constructor() {
    super(
      'コードの再送回数が上限に達しました。再度ログインしてください。',
      'OTP_RESEND_LIMIT',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class OtpResendCooldownException extends DomainException {
  constructor() {
    super(
      '再送間隔が60秒未満です。しばらくしてから再度お試しください。',
      'OTP_RESEND_COOLDOWN',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
