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
import { DEFAULT_FRONTEND_URL } from '@/config/config-defaults.constant';
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
// mfa_token→otp_id binding の Redis キー接頭辞。in-process ではなく Redis 保存 —
// verify/resend が発行時と別 ECS task に着弾しうるため（マルチインスタンス整合）。
const MFA_TOKEN_PREFIX = 'mfa_token:';
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_MAX_RESEND = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// 連続ログイン失敗の自動ロック閾値。成功で 0 リセット（api.md §4.3）=「連続失敗」。
// ロック解除は admin のみ — パスワードリセットではフラグは解除されない。
const LOGIN_FAILURE_LOCK_THRESHOLD = 5;

// SCR-012 — password reset
const RESET_TOKEN_EXPIRY_MINUTES = 60;
// PASSWORD_RESET（docs/database/seeder.md §5 OTP_TYPE）。マジックナンバー回避の別名。
const PASSWORD_RESET_OTP_TYPE = OtpType.PASSWORD_RESET;
// クールダウン（security.md §"Reset Token Rules"）: 同一メール宛の再設定メールは
// PASSWORD_RESET_COOLDOWN_MINUTES ごと1通。t_mfa_otp.created_at で計測（無効化後も
// 行は残る）ため、事前トークン無効化(4.5a)ではクールダウンはリセットされない。
const PASSWORD_RESET_COOLDOWN_MINUTES = 5;
const SCREEN_NAME_SCR012 = 'パスワード再設定画面 (ACSMS-SCR-012)';
const TABLE_M_ACCOUNT = 'm_account';
const TABLE_T_MFA_OTP = 't_mfa_otp';

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * ログイン結果。成功時は session ID（controller が HttpOnly cookie に設定）+ user を返す。
 * JWT / bearer token は発行しない。
 * `LoginResult` enum（`@/common/enums`, t_login_log.login_result 用）との名前衝突回避で改名。
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

  // mfa_token(UUID)→otp_id は Redis（`mfa_token:{token}`, TTL 5min）に保存。
  // 発行と verify/resend が別 ECS task になりうるため共有必須。

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
    // mfa_token→otp_id binding の共有ストア（マルチインスタンス安全）。
    private readonly redis: RedisService,
    // SCR-012 は DML + audit log を transaction で包む。`@Optional()` は SCR-001 の
    // `new AuthService(...8 args)` specs を型維持させるため（実行時は DI が注入）。
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    // `@Optional()`: SCR-001 unit specs が ConfigService を渡さなくて済む（dev 既定に fallback）。
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

    // ロック済みは bcrypt 前に専用メッセージで拒否。screen-design.md §4.6 v1.2:
    // account_lock_flg=true は admin 解除のみ、パスワードリセットでは解除されない。
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
      // アトミック: login_failure_count を +1、閾値到達で account_lock_flg=true。
      // 単一 SQL（同一行の CASE 式）で SELECT-then-UPDATE の read-modify-write 競合を回避。
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
      // 5回目の失敗自体は INVALID_CREDENTIALS を返す（ロックは設定済みなので6回目が
      // 上の分岐で ACCOUNT_LOCKED）。仕様: ロックメッセージは6回目以降のみ表示。
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

    // 仕様 4.3: 成功時に失敗回数リセット + last_login_at 更新。
    await this.accountRepo.update(
      { accountId: account.accountId },
      { loginFailureCount: 0, lastLoginAt: new Date() },
    );

    // 仕様 4.4: mfa_enable_flg で分岐。
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

  // mfa_token に紐づく otp_id を Redis から解決。キー不在/期限切れは undefined
  // （呼出側で INVALID_MFA_TOKEN）。
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

    // 旧 OTP を無効化し、resend_count を+1して新規発行。
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

  // スライディングセッションを延長し refreshed user を返す（`POST /auth/refresh`）。
  async refreshSession(sessionId: string | undefined): Promise<AuthUserDto> {
    if (!sessionId) throw new UnauthorizedException();

    const payload = await this.sessionService.touch(sessionId);
    if (!payload) throw new UnauthorizedException();

    const account = await this.accountRepo.findOne({
      where: { accountId: payload.account_id, deletedAt: IsNull() },
    });
    if (!account || account.accountLockFlg) {
      // 無効化されたセッションを破棄し cookie を失効させる。
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
   * ACSMS-API-012-001 — パスワード再設定メール要求。
   * enumeration 対策: メール存在有無に関わらず同一成功メッセージ。トークンは
   * bcrypt-hash し otp_type=2(PASSWORD_RESET)・1時間期限で保存。
   * atomicity: OTP save + audit log は同一 transaction。メールは commit 成功後に送信し
   * ロールバック時に有効リンクが漏れないようにする。
   */
  async forgotPassword(
    loginId: string,
    email: string,
    ctx: LoginContext,
  ): Promise<{ message: string }> {
    const successMessage =
      'パスワード再設定用のメールを送信しました。メールを確認してください。';

    // (login_id AND email) で絞る。email は m_account で一意でない（通知先メールアドレス,
    // ※空文字許容）ため email 単独では重複中の任意行を拾い他が再設定不能になる。
    // login_id は一意キーなのでペアで正確に1件を狙う。
    const account = await this.accountRepo.findOne({
      where: { loginId, email, deletedAt: IsNull() },
    });
    if (!account) {
      // §セキュリティ #1 — ペアが1件も一致しない（不明 OR 不一致）場合も同一応答。
      // enumeration シグナルを出さない。
      this.logger.log({ event: 'auth.forgot_password.unknown_account' });
      return { message: successMessage };
    }

    const accountId = Number(account.accountId);

    // クールダウン(security.md): 同一メール宛 5分に1通。全 otp_type=2 行の created_at で
    // 計測（下の事前無効化行も含む）ため、窓内の再送は旧トークン無効化後も拒否され
    // 「無限 resend」ループを防ぐ。
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
        // このアカウントの既発行・有効な再設定トークンを全無効化。MFA OTP 発行と同じ
        // パターン — 再送時に新リンク生成の瞬間に旧リンクを失効させ、有効リンクを1本に保つ。
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
        }, manager);
      });
    } catch (err) {
      // [audit-error-log] — ロールバック済み tx の外。トレースを残す。
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

    // commit 後に送信 — OTP 行が永続化されてから（api.md §4.6 — 送信失敗は fire-and-forget）。
    const frontendUrl =
      this.configService?.get<string>('app.frontendUrl') ??
      DEFAULT_FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.mailService.sendPasswordReset(
      email,
      account.accountName,
      resetUrl,
      RESET_TOKEN_EXPIRY_MINUTES,
    );

    return { message: successMessage };
  }

  // ACSMS-API-012-002 — トークンを消費せず検証。FE がページ読込時にフォーム表示可否を判定。
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
   * ACSMS-API-012-003 — トークンを消費しパスワードを更新。
   * 順序: 1.bcrypt.compare 反復で OTP 検索(INVALID/EXPIRED 拒否) → 2.対象アカウント
   * ロード(soft-delete 不可) → 3.confirm_password 一致検証 → 4.new_password≠login_id →
   * 5.transaction 内: m_account(password_hash等) UPDATE / t_mfa_otp.used_flg=true /
   * audit log(operation='PASSWORD_RESET') → 6.commit 後: 当該アカウントの全 Redis
   * セッションを破棄し、cookie 窃取時も全所で強制ログアウトさせる。
   * transaction 内失敗時も logError が log_type=3 行を tx 外に emit する。
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

    // §パスワード形式要件: 3種のうち2種以上。長さ8-32・半角のみは DTO で担保済みなので
    // ここは種別チェックのみ。FE の PASSWORD_FORMAT_RE(ResetPasswordView.vue) と同一。
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
        }, manager);
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

    // [session-purge] — 当該アカウントの全 Redis セッションを破棄し、再設定前に窃取された
    // cookie を即失効。Redis 部分障害でパスワード書込がロールバックしないよう tx 外。
    await this.sessionService.destroyAllForAccount(accountId);

    return { message: 'パスワードを更新しました。ログイン画面に移動します。' };
  }

  /**
   * otp_type=2 の行を反復し raw token を各 otp_code_hash と bcrypt.compare。
   * 最初の一致 or null。api.md の `WHERE otp_type = 2` が広いのはトークンが
   * bcrypt-hash 保存でハッシュ直引き不可なため。反復数は同時有効トークン数（多忙な
   * 環境でも数十件）で頭打ち。
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
   * FE の PASSWORD_FORMAT_RE 種別チェックのミラー。{英字,数字,記号} のうち2種以上で true。
   * 長さ・半角は DTO(`@MinLength`/`@MaxLength`/`@Matches(HALFWIDTH_RE)`)で担保済みなので
   * ここでは再チェックしない。記号セット: !@#$%^&*()_+-=[]{}|;:,.<>?（api.md 例）。
   */
  private hasAtLeastTwoCategories(password: string): boolean {
    const hasAlpha = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
    const matched = [hasAlpha, hasDigit, hasSymbol].filter(Boolean).length;
    return matched >= 2;
  }

  // FE 契約(`useApiForm` が `response.errors[].field` を期待, vue.md)に合わせた
  // VALIDATION_ERROR HttpException を構築。
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

  // `dataSource` は SCR-001 specs(`new AuthService(...8 args)`)の型維持のため `@Optional()`。
  // SCR-012 では必須（実行時は DI が常に注入）。未配線テストには明示エラー。
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
   * MFA なしログイン応答を構築: role + permissions 取得、Redis セッション作成、
   * `{ session_id, user }` を返す。`reuseSessionId` 指定時(refresh path)はセッション
   * 作成をスキップ — 既存セッションは有効で TTL は SessionService.touch() で延長済み。
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
      shiten_id: account.shitenId !== null ? Number(account.shitenId) : null,
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
        shiten_id: account.shitenId !== null ? Number(account.shitenId) : null,
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

  // 当該アカウントの旧 OTP を無効化し、新規発行・メール送信・mfa_token→otp_id 登録。
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
      // OTP は保持（resend で再試行可）。仕様 §4.4 はロールバック不要。
    }

    return { mfaToken, otpId: Number(saved.otpId) };
  }
}
