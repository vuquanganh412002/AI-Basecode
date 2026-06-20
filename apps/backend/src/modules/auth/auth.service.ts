import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { MailService } from '@/modules/mail/mail.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { AuthUserDto } from './dto/auth-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AccountLockedException,
  ExpiredResetTokenException,
  InvalidCredentialsException,
  InvalidMfaTokenException,
  InvalidOtpException,
  InvalidResetTokenException,
  OtpExpiredException,
  OtpMaxAttemptsException,
  OtpResendCooldownException,
  OtpResendLimitException,
  PasswordResetRateLimitException,
} from './exceptions/auth.exceptions';
import { UnauthorizedException } from '@/common/exceptions/common.exceptions';
import { Account } from '@/database/entities/account.entity';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { Permission } from '@/database/entities/permission.entity';
import {
  AuditOperation, LoginResult, OtpType, LogType, ResultStatus } from '@/common/enums';
import { SessionService, SessionPayload } from './session.service';
import { RedisService } from '@/modules/redis/redis.service';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
// Redis key prefix for the short-lived mfa_token → otp_id binding. Stored in
// Redis (not in-process) so the verify/resend request can land on a different
// ECS task than the one that issued the token (multi-instance correctness).
const MFA_TOKEN_PREFIX = 'mfa_token:';
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_MAX_RESEND = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Threshold for auto-locking an account after consecutive failed password
 * attempts. Counter resets to 0 on any successful login (see §4.3 of
 * api.md), so this is "consecutive failures" by construction. Once locked,
 * only an admin can unlock — password reset does NOT clear the flag.
 */
const LOGIN_FAILURE_LOCK_THRESHOLD = 5;

// SCR-012 — password reset
const RESET_TOKEN_EXPIRY_MINUTES = 60;
/** PASSWORD_RESET per `docs/database/seeder.md §5 OTP_TYPE`. Aliased here
 *  for readability at call sites that previously held the magic number. */
const PASSWORD_RESET_OTP_TYPE = OtpType.PASSWORD_RESET;
/**
 * Cooldown per `security.md §"Reset Token Rules"`: only one reset email
 * per email address may be issued every `PASSWORD_RESET_COOLDOWN_MINUTES`.
 * Measured by `t_mfa_otp.created_at` (rows persist after invalidation),
 * so the prior-token-invalidation step (4.5a) does NOT reset the cooldown.
 */
const PASSWORD_RESET_COOLDOWN_MINUTES = 5;
const SCREEN_NAME_SCR012 = 'パスワード再設定画面 (ACSMS-SCR-012)';
const TABLE_M_ACCOUNT = 'm_account';
const TABLE_T_MFA_OTP = 't_mfa_otp';

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Result of a login attempt. On success we return the session ID
 * (for the controller to set as an HTTP-only cookie) plus the user
 * object — we do NOT issue any JWT / bearer token.
 *
 * Renamed from `LoginResult` to `LoginOutcome` to avoid shadowing the
 * `LoginResult` enum (`@/common/enums`) used for `t_login_log.login_result`
 * audit values.
 */
export type LoginOutcome =
  | {
      mfa_required: false;
      session_id: string;
      user: AuthUserDto;
    }
  | {
      mfa_required: true;
      mfa_token: string;
      expires_in: number;
    };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // mfa_token (UUID) → otp_id lives in Redis (`mfa_token:{token}`, TTL 5min),
  // NOT in process memory: login can issue the token on one ECS task while the
  // verify/resend request lands on another, so the binding MUST be shared.

  constructor(
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
    private readonly sessionService: SessionService,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
    @InjectRepository(MfaOtp) private readonly otpRepo: Repository<MfaOtp>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    // Shared store for the mfa_token → otp_id binding (multi-instance safe).
    private readonly redis: RedisService,
    // SCR-012 password reset wraps DML + audit log inside a transaction.
    // `@Optional()` keeps SCR-001's plain `new AuthService(...8 args)` specs
    // type-checking after their banner is later removed — DI still injects
    // the real DataSource at runtime.
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    // `@Optional()` so SCR-001 unit specs (`new AuthService(...8 args)`)
    // don't have to pass a ConfigService — falls back to a safe dev default.
    @Optional() private readonly configService?: ConfigService,
  ) {}

  // ─── Public flow ──────────────────────────────────────────────────────────

  async login(dto: LoginDto, ctx: LoginContext): Promise<LoginOutcome> {
    this.logger.log({ event: 'auth.login.attempt', loginId: dto.login_id });

    const account = await this.accountRepo.findOne({
      where: { loginId: dto.login_id, deletedAt: IsNull() },
    });

    if (!account) {
      await this.auditLogService.logLogin({
        loginId: dto.login_id,
        loginResult: LoginResult.FAILURE,
        failureReason: 'account_not_found',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    // Already-locked account: reject before bcrypt with a dedicated message.
    // Per project spec (screen-design.md §4.6 v1.2): once `account_lock_flg`
    // is true the only path back is an admin unlock — password reset does
    // not clear it.
    if (account.accountLockFlg) {
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: LoginResult.FAILURE,
        failureReason: 'account_locked',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new AccountLockedException();
    }

    const passwordMatch = await bcrypt.compare(dto.password, account.passwordHash);
    if (!passwordMatch) {
      // Atomic: increment login_failure_count AND set account_lock_flg=true
      // when the post-increment value reaches LOGIN_FAILURE_LOCK_THRESHOLD.
      // A single SQL statement (CASE expression on the same row) avoids the
      // read-modify-write race that two concurrent failed attempts would
      // hit if we did SELECT-then-UPDATE in app code.
      await this.accountRepo
        .createQueryBuilder()
        .update(Account)
        .set({
          loginFailureCount: () => '"login_failure_count" + 1',
          accountLockFlg: () =>
            `CASE WHEN "login_failure_count" + 1 >= ${LOGIN_FAILURE_LOCK_THRESHOLD} THEN true ELSE "account_lock_flg" END`,
          accountLockAt: () =>
            `CASE WHEN "login_failure_count" + 1 >= ${LOGIN_FAILURE_LOCK_THRESHOLD} THEN NOW() ELSE "account_lock_at" END`,
          updatedAt: () => 'NOW()',
        })
        .where('account_id = :id', { id: account.accountId })
        .andWhere('deleted_at IS NULL')
        .execute();
      // The 5th wrong attempt itself still surfaces as INVALID_CREDENTIALS —
      // the lock flag is now set, so attempt #6 will hit the branch above
      // and receive ACCOUNT_LOCKED. This matches the requirement: the lock
      // message is only shown from the 6th failed attempt onward.
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: LoginResult.FAILURE,
        failureReason: 'invalid_password',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    // Spec 4.3: reset failure count + update last_login_at on success.
    await this.accountRepo.update(
      { accountId: account.accountId },
      { loginFailureCount: 0, lastLoginAt: new Date() },
    );

    // Spec 4.4: branch on mfa_enable_flg.
    if (account.mfaEnableFlg) {
      const { mfaToken } = await this.issueOtp(
        Number(account.accountId),
        account.email,
        account.accountName,
        0,
      );
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: LoginResult.SUCCESS,
        failureReason: 'mfa_required',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      return {
        mfa_required: true,
        mfa_token: mfaToken,
        expires_in: OTP_EXPIRY_MINUTES * 60,
      };
    }

    await this.auditLogService.logLogin({
      accountId: Number(account.accountId),
      loginId: dto.login_id,
      loginResult: LoginResult.SUCCESS,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.buildSessionResponse(account);
  }

  /**
   * Resolve the otp_id bound to an mfa_token from Redis. Returns undefined
   * when the key is absent/expired (→ INVALID_MFA_TOKEN at the call site).
   */
  private async lookupOtpId(mfaToken: string): Promise<number | undefined> {
    const raw = await this.redis.get(MFA_TOKEN_PREFIX + mfaToken);
    return raw ? Number(raw) : undefined;
  }

  async verifyMfa(
    mfaToken: string,
    otpCode: string,
    ctx: LoginContext,
  ): Promise<Extract<LoginOutcome, { mfa_required: false }>> {
    const otpId = await this.lookupOtpId(mfaToken);
    if (!otpId) throw new InvalidMfaTokenException();

    const otp = await this.otpRepo.findOne({
      where: { otpId, usedFlg: false, otpType: OtpType.MFA },
    });
    if (!otp) {
      await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
      throw new InvalidMfaTokenException();
    }

    if (otp.expiredAt.getTime() < Date.now()) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
      throw new OtpExpiredException();
    }

    if (otp.verifyAttemptCount >= OTP_MAX_VERIFY_ATTEMPTS) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
      throw new OtpMaxAttemptsException();
    }

    const matched = await bcrypt.compare(otpCode, otp.otpCodeHash);
    if (!matched) {
      await this.otpRepo.increment({ otpId }, 'verifyAttemptCount', 1);
      const incremented = otp.verifyAttemptCount + 1;
      if (incremented >= OTP_MAX_VERIFY_ATTEMPTS) {
        await this.otpRepo.update({ otpId }, { usedFlg: true });
        await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
        throw new OtpMaxAttemptsException();
      }
      throw new InvalidOtpException();
    }

    await this.otpRepo.update({ otpId }, { usedFlg: true });
    await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);

    const account = await this.accountRepo.findOne({
      where: { accountId: otp.accountId, deletedAt: IsNull() },
    });
    if (!account) throw new InvalidMfaTokenException();

    await this.auditLogService.logLogin({
      accountId: Number(account.accountId),
      loginId: account.loginId,
      loginResult: LoginResult.SUCCESS,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.buildSessionResponse(account);
  }

  async resendMfa(
    mfaToken: string,
  ): Promise<{ mfa_token: string; expires_in: number; resend_count: number; max_resend: number }> {
    const otpId = await this.lookupOtpId(mfaToken);
    if (!otpId) throw new InvalidMfaTokenException();

    const otp = await this.otpRepo.findOne({
      where: { otpId, usedFlg: false, otpType: OtpType.MFA },
    });
    if (!otp) {
      await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
      throw new InvalidMfaTokenException();
    }

    if (otp.resendCount >= OTP_MAX_RESEND) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);
      throw new OtpResendLimitException();
    }

    const secondsSinceIssue = (Date.now() - otp.createdAt.getTime()) / 1000;
    if (secondsSinceIssue < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new OtpResendCooldownException();
    }

    const account = await this.accountRepo.findOne({
      where: { accountId: otp.accountId, deletedAt: IsNull() },
    });
    if (!account) throw new InvalidMfaTokenException();

    // Invalidate old OTP, issue new one with incremented resend_count.
    await this.otpRepo.update({ otpId }, { usedFlg: true });
    await this.redis.del(MFA_TOKEN_PREFIX + mfaToken);

    const nextResendCount = otp.resendCount + 1;
    const { mfaToken: newMfaToken } = await this.issueOtp(
      Number(account.accountId),
      account.email,
      account.accountName,
      nextResendCount,
    );

    return {
      mfa_token: newMfaToken,
      expires_in: OTP_EXPIRY_MINUTES * 60,
      resend_count: nextResendCount,
      max_resend: OTP_MAX_RESEND,
    };
  }

  /**
   * Extend the sliding session window and return the refreshed user
   * payload. Controller calls this from `POST /auth/refresh`.
   */
  async refreshSession(sessionId: string | undefined): Promise<AuthUserDto> {
    if (!sessionId) throw new UnauthorizedException();

    const payload = await this.sessionService.touch(sessionId);
    if (!payload) throw new UnauthorizedException();

    const account = await this.accountRepo.findOne({
      where: { accountId: payload.account_id, deletedAt: IsNull() },
    });
    if (!account || account.accountLockFlg) {
      // Destroy the now-invalid session so the cookie stops working.
      await this.sessionService.destroy(sessionId);
      throw new UnauthorizedException();
    }

    return (
      await this.buildSessionResponse(account, { reuseSessionId: sessionId })
    ).user;
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    await this.sessionService.destroy(sessionId);
  }

  // ─── SCR-012 password reset / change password ────────────────────────────

  /**
   * ACSMS-API-012-001 — request a password reset email.
   *
   * Account enumeration prevention: returns the same success message
   * whether the email exists or not. Token is bcrypt-hashed and stored
   * with `otp_type=2` (PASSWORD_RESET) and a 1-hour expiry.
   *
   * Atomicity: OTP save + audit log share one transaction. Email is
   * sent AFTER successful commit so a rolled-back transaction never
   * leaks a working reset link to the user.
   */
  async forgotPassword(
    email: string,
    ctx: LoginContext,
  ): Promise<{ message: string }> {
    const successMessage =
      'パスワード再設定用のメールを送信しました。メールを確認してください。';

    const account = await this.accountRepo.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!account) {
      // §セキュリティ #1 — same response for unknown emails.
      this.logger.log({ event: 'auth.forgot_password.unknown_email' });
      return { message: successMessage };
    }

    const accountId = Number(account.accountId);

    // Cooldown (security.md): one reset email per email address every 5 min.
    // Counted by created_at over ALL otp_type=2 rows (including invalidated
    // ones from the prior-token-invalidation step below) — so resubmitting
    // within the window is rejected even though the earlier token has been
    // invalidated, preventing an "infinite resend" loop.
    const cooldownStart = new Date(
      Date.now() - PASSWORD_RESET_COOLDOWN_MINUTES * 60_000,
    );
    const recentRequestCount = await this.otpRepo.count({
      where: {
        accountId,
        otpType: PASSWORD_RESET_OTP_TYPE,
        createdAt: MoreThan(cooldownStart),
      },
    });
    if (recentRequestCount >= 1) {
      this.logger.warn({
        event: 'auth.forgot_password.cooldown_active',
        accountId,
        recentRequestCount,
      });
      throw new PasswordResetRateLimitException();
    }

    const resetToken = randomUUID();
    const resetTokenHash = await bcrypt.hash(resetToken, SALT_ROUNDS);
    const expiredAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60_000);

    try {
      await this.requireDataSource().transaction(async (manager) => {
        // Invalidate every previously-issued, still-active reset token for
        // this account. Same pattern as MFA OTP issuance — guarantees that
        // re-submitting the email kills the prior link the moment the new
        // one is generated, instead of leaving N parallel valid links.
        await manager.update(
          MfaOtp,
          { accountId, otpType: PASSWORD_RESET_OTP_TYPE, usedFlg: false },
          { usedFlg: true },
        );

        await manager.save(MfaOtp, {
          accountId,
          otpCodeHash: resetTokenHash,
          otpType: PASSWORD_RESET_OTP_TYPE,
          expiredAt,
          verifyAttemptCount: 0,
          resendCount: 0,
          usedFlg: false,
        });

        await this.auditLogService.logOperation({
          logType: LogType.USER_OPERATION,
          accountId,
          jaId: account.jaId === null ? null : Number(account.jaId),
          gamenName: SCREEN_NAME_SCR012,
          operation: AuditOperation.PASSWORD_RESET_REQUEST,
          resultStatus: ResultStatus.SUCCESS,
          targetTable: TABLE_T_MFA_OTP,
          afterValue: JSON.stringify({ event: 'reset_token_issued' }),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      });
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace survives.
      await this.auditLogService.logError(
        {
          accountId,
          jaId: account.jaId === null ? null : Number(account.jaId),
          screen: SCREEN_NAME_SCR012,
          table: TABLE_T_MFA_OTP,
          targetId: null,
          ipAddress: ctx.ipAddress ?? '',
          userAgent: ctx.userAgent ?? '',
        },
        AuditOperation.PASSWORD_RESET_REQUEST,
        err as Error,
      );
      throw err;
    }

    // Post-commit dispatch — email goes out only after the OTP row is
    // durably persisted (api.md §4.6 — fire-and-forget if mail fails).
    const frontendUrl =
      this.configService?.get<string>('app.frontendUrl') ??
      'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.mailService.sendPasswordReset(
      email,
      account.accountName,
      resetUrl,
      RESET_TOKEN_EXPIRY_MINUTES,
    );

    return { message: successMessage };
  }

  /**
   * ACSMS-API-012-002 — verify a reset token without consuming it.
   * Used by the FE on page-load to decide whether to render the form.
   */
  async verifyResetToken(token: string): Promise<{ valid: true }> {
    const matched = await this.findResetTokenOtp(token);
    if (!matched) throw new InvalidResetTokenException();

    if (matched.expiredAt.getTime() < Date.now()) {
      throw new ExpiredResetTokenException();
    }
    if (matched.usedFlg) throw new InvalidResetTokenException();

    return { valid: true };
  }

  /**
   * ACSMS-API-012-003 — consume the reset token and update the password.
   *
   * Order:
   *   1. Find OTP via bcrypt.compare iteration; reject INVALID/EXPIRED.
   *   2. Load the target account (must not be soft-deleted).
   *   3. Validate confirm_password match.
   *   4. Validate new_password ≠ login_id.
   *   5. Inside dataSource.transaction:
   *        - UPDATE m_account.password_hash, password_updated_at, updated_at
   *        - UPDATE t_mfa_otp.used_flg=true
   *        - audit log (operation='PASSWORD_RESET')
   *   6. After commit: destroy all Redis sessions for the account so the
   *      attacker (if the cookie was stolen) is force-logged-out everywhere.
   *
   * On failure inside the transaction, the audit log still emits a
   * `log_type=3` row OUTSIDE the rolled-back tx via `logError`.
   */
  async resetPassword(
    dto: ResetPasswordDto,
    ctx: LoginContext,
  ): Promise<{ message: string }> {
    const matched = await this.findResetTokenOtp(dto.token);
    if (!matched) throw new InvalidResetTokenException();

    if (matched.expiredAt.getTime() < Date.now()) {
      throw new ExpiredResetTokenException();
    }
    if (matched.usedFlg) throw new InvalidResetTokenException();

    const account = await this.accountRepo.findOne({
      where: { accountId: matched.accountId, deletedAt: IsNull() },
    });
    if (!account) throw new InvalidResetTokenException();

    // §パスワード形式要件: ≥2 of 3 character categories. DTO already
    // ensured length 8-32 + half-width-only, so the only remaining
    // category check lives here. Same regex set as the FE (mirror of
    // PASSWORD_FORMAT_RE in ResetPasswordView.vue).
    if (!this.hasAtLeastTwoCategories(dto.new_password)) {
      throw this.passwordValidationError(
        'new_password',
        'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。',
      );
    }
    if (dto.confirm_password !== dto.new_password) {
      throw this.passwordValidationError('confirm_password', '新しいパスワードと一致していません。');
    }
    if (dto.new_password === account.loginId) {
      throw this.passwordValidationError(
        'new_password',
        '新しいパスワードはログインIDと同じものに設定できません。',
      );
    }

    const accountId = Number(account.accountId);
    const newHash = await bcrypt.hash(dto.new_password, SALT_ROUNDS);

    try {
      await this.requireDataSource().transaction(async (manager) => {
        const now = new Date();
        await manager.update(
          Account,
          { accountId },
          {
            passwordHash: newHash,
            passwordUpdatedAt: now,
            updatedAt: now,
            // パスワードリセットはトークンで本人確認済みの当該アカウント自身による
            // 操作のため、updated_by は当該アカウントID(FK)を記録する。
            updatedBy: String(accountId),
          },
        );
        await manager.update(
          MfaOtp,
          { otpId: matched.otpId },
          { usedFlg: true },
        );

        await this.auditLogService.logOperation({
          logType: LogType.USER_OPERATION,
          accountId,
          jaId: account.jaId === null ? null : Number(account.jaId),
          gamenName: SCREEN_NAME_SCR012,
          operation: AuditOperation.PASSWORD_RESET,
          resultStatus: ResultStatus.SUCCESS,
          targetTable: TABLE_M_ACCOUNT,
          targetId: accountId,
          afterValue: JSON.stringify({ event: 'password_reset' }),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      });
    } catch (err) {
      await this.auditLogService.logError(
        {
          accountId,
          jaId: account.jaId === null ? null : Number(account.jaId),
          screen: SCREEN_NAME_SCR012,
          table: TABLE_M_ACCOUNT,
          targetId: accountId,
          ipAddress: ctx.ipAddress ?? '',
          userAgent: ctx.userAgent ?? '',
        },
        AuditOperation.PASSWORD_RESET,
        err as Error,
      );
      throw err;
    }

    // [session-purge] — destroy ALL Redis sessions for this account so cookies stolen
    // before the reset stop working immediately. Outside the tx so a
    // partial Redis failure can't roll the password write back.
    await this.sessionService.destroyAllForAccount(accountId);

    return { message: 'パスワードを更新しました。ログイン画面に移動します。' };
  }

  /**
   * Iterate active otp_type=2 rows and bcrypt-compare the raw token to
   * each `otp_code_hash`. Returns the first match or `null`.
   *
   * The api.md `WHERE otp_type = 2` query is intentionally broad — token
   * values are bcrypt-hashed at rest so a direct lookup by hash is
   * impossible. Iteration is bounded by simultaneous-active-token volume
   * (≤ a few dozen even for a busy install).
   */
  private async findResetTokenOtp(token: string): Promise<MfaOtp | null> {
    const candidates = await this.otpRepo.find({
      where: { otpType: PASSWORD_RESET_OTP_TYPE },
    });
    for (const otp of candidates) {
      if (await bcrypt.compare(token, otp.otpCodeHash)) {
        return otp;
      }
    }
    return null;
  }

  /**
   * Mirror the FE `PASSWORD_FORMAT_RE` category check. Returns true when
   * the password contains at least 2 of {alpha, digit, symbol}. Length
   * and half-width validity are already enforced at the DTO level
   * (`@MinLength`, `@MaxLength`, `@Matches(HALFWIDTH_RE)`) — this method
   * intentionally does NOT re-check those.
   *
   * Symbol set: !@#$%^&*()_+-=[]{}|;:,.<>? per api.md example list.
   */
  private hasAtLeastTwoCategories(password: string): boolean {
    const hasAlpha = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
    const matched = [hasAlpha, hasDigit, hasSymbol].filter(Boolean).length;
    return matched >= 2;
  }

  /**
   * Build a `VALIDATION_ERROR` HttpException matching the FE contract
   * (`useApiForm` expects `response.errors[].field` per `vue.md`).
   */
  private passwordValidationError(field: string, message: string): HttpException {
    return new HttpException(
      {
        code: 'VALIDATION_ERROR',
        error_code: 'VALIDATION_ERROR',
        message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
        errors: [{ field, message }],
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * `dataSource` is `@Optional()` to keep SCR-001 specs (`new AuthService(...8 args)`)
   * type-checking. SCR-012 endpoints require it — at runtime DI always
   * provides it. Throw a clear error if a test forgot to wire one.
   */
  private requireDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error(
        'AuthService.dataSource is undefined — SCR-012 endpoints require it. ' +
          'Pass a DataSource as the 9th constructor arg in tests.',
      );
    }
    return this.dataSource;
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Build the MFA-free login response: fetch role + permissions, create a
   * Redis session, return `{ session_id, user }`.
   *
   * When `reuseSessionId` is provided (refresh path) we skip session
   * creation — the caller's existing session is already valid and its TTL
   * was just extended by `SessionService.touch()`.
   */
  private async buildSessionResponse(
    account: Account,
    opts: { reuseSessionId?: string } = {},
  ): Promise<Extract<LoginOutcome, { mfa_required: false }>> {
    const role = await this.roleRepo.findOne({
      where: { roleId: account.roleId, deletedAt: IsNull() },
    });
    const permissions = await this.fetchPermissions(account.roleId);

    const sessionPayload: Omit<SessionPayload, 'created_at' | 'last_activity_at'> = {
      account_id: Number(account.accountId),
      login_id: account.loginId,
      role_id: account.roleId,
      role_code: role?.roleCode ?? '',
      ja_id: account.jaId !== null ? Number(account.jaId) : null,
      kanri_shiten_id:
        account.kanriShitenId !== null ? Number(account.kanriShitenId) : null,
      permissions,
    };

    const sessionId =
      opts.reuseSessionId ?? (await this.sessionService.create(sessionPayload));

    return {
      mfa_required: false,
      session_id: sessionId,
      user: {
        account_id: Number(account.accountId),
        login_id: account.loginId,
        account_name: account.accountName,
        role_id: account.roleId,
        role_code: role?.roleCode ?? '',
        role_name: role?.roleName ?? '',
        ja_id: account.jaId !== null ? Number(account.jaId) : null,
        kanri_shiten_id:
          account.kanriShitenId !== null ? Number(account.kanriShitenId) : null,
        todofuken_code: account.todofukenCode,
        paper_flg: account.paperFlg,
        denshi_flg: account.denshiFlg,
        email: account.email,
        mfa_enable_flg: account.mfaEnableFlg,
        permissions,
      },
    };
  }

  private async fetchPermissions(roleId: number): Promise<string[]> {
    const rows = await this.rolePermRepo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'p', 'p.permission_id = rp.permission_id AND p.deleted_at IS NULL')
      .where('rp.role_id = :roleId', { roleId })
      .andWhere('rp.deleted_at IS NULL')
      .select('p.permission_code', 'permission_code')
      .orderBy('p.permission_id', 'ASC')
      .getRawMany<{ permission_code: string }>();
    return rows.map((r) => r.permission_code);
  }

  /**
   * Invalidate prior OTPs for this account, issue a new one, email it, and
   * register the mfa_token → otp_id mapping.
   */
  private async issueOtp(
    accountId: number,
    email: string,
    accountName: string,
    resendCount: number,
  ): Promise<{ mfaToken: string; otpId: number }> {
    await this.otpRepo
      .createQueryBuilder()
      .update(MfaOtp)
      .set({ usedFlg: true })
      .where('account_id = :accountId AND used_flg = false AND otp_type = :otpType', {
        accountId,
        otpType: OtpType.MFA,
      })
      .execute();

    const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otpCodeHash = await bcrypt.hash(otpCode, SALT_ROUNDS);
    const expiredAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const saved = await this.otpRepo.save(
      this.otpRepo.create({
        accountId,
        otpCodeHash,
        otpType: OtpType.MFA,
        expiredAt,
        verifyAttemptCount: 0,
        resendCount,
        usedFlg: false,
      }),
    );

    const mfaToken = randomUUID();
    await this.redis.setEx(
      MFA_TOKEN_PREFIX + mfaToken,
      OTP_EXPIRY_MINUTES * 60,
      String(saved.otpId),
    );

    try {
      await this.mailService.sendOtp(email, accountName, otpCode);
    } catch (error) {
      this.logger.error({ event: 'auth.mfa.send_failed', error: String(error) });
      // Keep OTP; user can retry via resend. Spec §4.4 doesn't require rollback.
    }

    return { mfaToken, otpId: Number(saved.otpId) };
  }
}
