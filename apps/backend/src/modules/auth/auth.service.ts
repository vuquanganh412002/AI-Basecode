import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { AuthUserDto } from './dto/auth-response.dto';
import {
  AccountLockedException,
  InvalidCredentialsException,
  InvalidMfaTokenException,
  InvalidOtpException,
  OtpExpiredException,
  OtpMaxAttemptsException,
  OtpResendCooldownException,
  OtpResendLimitException,
} from './exceptions/auth.exceptions';
import { UnauthorizedException } from '../../common/exceptions/common.exceptions';
import { Account } from './entities/account.entity';
import { MfaOtp } from './entities/mfa-otp.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Permission } from './entities/permission.entity';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_MAX_RESEND = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

export type LoginResult =
  | {
      mfa_required: false;
      access_token: string;
      refresh_token: string;
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

  /** In-memory map: mfa_token (UUID) → otp_id. Replace with Redis for multi-instance. */
  private readonly mfaTokenToOtpId = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
    @InjectRepository(MfaOtp) private readonly otpRepo: Repository<MfaOtp>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  // ─── Public flow ──────────────────────────────────────────────────────────

  async login(dto: LoginDto, ctx: LoginContext): Promise<LoginResult> {
    this.logger.log({ event: 'auth.login.attempt', loginId: dto.login_id });

    const account = await this.accountRepo.findOne({
      where: { loginId: dto.login_id, deletedAt: IsNull() },
    });

    if (!account) {
      await this.auditLogService.logLogin({
        loginId: dto.login_id,
        loginResult: 2,
        failureReason: 'account_not_found',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    // Spec 4.2: account locked returns same unified message as invalid credentials.
    if (account.accountLockFlg) {
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: 2,
        failureReason: 'account_locked',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    const passwordMatch = await bcrypt.compare(dto.password, account.passwordHash);
    if (!passwordMatch) {
      await this.accountRepo.increment(
        { accountId: account.accountId },
        'loginFailureCount',
        1,
      );
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: 2,
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
      const { mfaToken } = await this.issueOtp(Number(account.accountId), account.email, 0);
      await this.auditLogService.logLogin({
        accountId: Number(account.accountId),
        loginId: dto.login_id,
        loginResult: 1,
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
      loginResult: 1,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.buildTokenResponse(account);
  }

  async verifyMfa(
    mfaToken: string,
    otpCode: string,
    ctx: LoginContext,
  ): Promise<Extract<LoginResult, { mfa_required: false }>> {
    const otpId = this.mfaTokenToOtpId.get(mfaToken);
    if (!otpId) throw new InvalidMfaTokenException();

    const otp = await this.otpRepo.findOne({
      where: { otpId, usedFlg: false, otpType: 1 },
    });
    if (!otp) {
      this.mfaTokenToOtpId.delete(mfaToken);
      throw new InvalidMfaTokenException();
    }

    if (otp.expiredAt.getTime() < Date.now()) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      this.mfaTokenToOtpId.delete(mfaToken);
      throw new OtpExpiredException();
    }

    if (otp.verifyAttemptCount >= OTP_MAX_VERIFY_ATTEMPTS) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      this.mfaTokenToOtpId.delete(mfaToken);
      throw new OtpMaxAttemptsException();
    }

    const matched = await bcrypt.compare(otpCode, otp.otpCodeHash);
    if (!matched) {
      await this.otpRepo.increment({ otpId }, 'verifyAttemptCount', 1);
      const incremented = otp.verifyAttemptCount + 1;
      if (incremented >= OTP_MAX_VERIFY_ATTEMPTS) {
        await this.otpRepo.update({ otpId }, { usedFlg: true });
        this.mfaTokenToOtpId.delete(mfaToken);
        throw new OtpMaxAttemptsException();
      }
      throw new InvalidOtpException();
    }

    await this.otpRepo.update({ otpId }, { usedFlg: true });
    this.mfaTokenToOtpId.delete(mfaToken);

    const account = await this.accountRepo.findOne({
      where: { accountId: otp.accountId, deletedAt: IsNull() },
    });
    if (!account) throw new InvalidMfaTokenException();

    await this.auditLogService.logLogin({
      accountId: Number(account.accountId),
      loginId: account.loginId,
      loginResult: 1,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.buildTokenResponse(account);
  }

  async resendMfa(
    mfaToken: string,
  ): Promise<{ mfa_token: string; expires_in: number; resend_count: number; max_resend: number }> {
    const otpId = this.mfaTokenToOtpId.get(mfaToken);
    if (!otpId) throw new InvalidMfaTokenException();

    const otp = await this.otpRepo.findOne({
      where: { otpId, usedFlg: false, otpType: 1 },
    });
    if (!otp) {
      this.mfaTokenToOtpId.delete(mfaToken);
      throw new InvalidMfaTokenException();
    }

    if (otp.resendCount >= OTP_MAX_RESEND) {
      await this.otpRepo.update({ otpId }, { usedFlg: true });
      this.mfaTokenToOtpId.delete(mfaToken);
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
    this.mfaTokenToOtpId.delete(mfaToken);

    const nextResendCount = otp.resendCount + 1;
    const { mfaToken: newMfaToken } = await this.issueOtp(
      Number(account.accountId),
      account.email,
      nextResendCount,
    );

    return {
      mfa_token: newMfaToken,
      expires_in: OTP_EXPIRY_MINUTES * 60,
      resend_count: nextResendCount,
      max_resend: OTP_MAX_RESEND,
    };
  }

  async refreshToken(
    refreshToken: string | undefined,
  ): Promise<Extract<LoginResult, { mfa_required: false }>> {
    if (!refreshToken) throw new UnauthorizedException();

    let payload: { accountId: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        publicKey: this.configService.get<string>('jwt.publicKey'),
        algorithms: ['RS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }

    const account = await this.accountRepo.findOne({
      where: { accountId: payload.accountId, deletedAt: IsNull() },
    });
    if (!account || account.accountLockFlg) throw new UnauthorizedException();

    return this.buildTokenResponse(account);
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async buildTokenResponse(
    account: Account,
  ): Promise<Extract<LoginResult, { mfa_required: false }>> {
    const role = await this.roleRepo.findOne({
      where: { roleId: account.roleId, deletedAt: IsNull() },
    });
    const permissions = await this.fetchPermissions(account.roleId);

    const payload = {
      accountId: Number(account.accountId),
      loginId: account.loginId,
      roleId: account.roleId,
      roleCode: role?.roleCode ?? '',
      jaId: account.jaId !== null ? Number(account.jaId) : null,
      kanriShitenId:
        account.kanriShitenId !== null ? Number(account.kanriShitenId) : null,
    };

    const accessExpiry =
      this.configService.get<string>('jwt.accessTokenExpiry') ?? '24h';
    const refreshExpiry =
      this.configService.get<string>('jwt.refreshTokenExpiry') ?? '7d';
    const privateKey = this.configService.get<string>('jwt.privateKey');

    const accessToken = await this.jwtService.signAsync(
      { ...payload, permissions, type: 'access' },
      { privateKey, algorithm: 'RS256', expiresIn: accessExpiry },
    );
    const refreshToken = await this.jwtService.signAsync(
      { accountId: payload.accountId, type: 'refresh' },
      { privateKey, algorithm: 'RS256', expiresIn: refreshExpiry },
    );

    return {
      mfa_required: false,
      access_token: accessToken,
      refresh_token: refreshToken,
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
    resendCount: number,
  ): Promise<{ mfaToken: string; otpId: number }> {
    await this.otpRepo
      .createQueryBuilder()
      .update(MfaOtp)
      .set({ usedFlg: true })
      .where('account_id = :accountId AND used_flg = false AND otp_type = 1', {
        accountId,
      })
      .execute();

    const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otpCodeHash = await bcrypt.hash(otpCode, SALT_ROUNDS);
    const expiredAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const saved = await this.otpRepo.save(
      this.otpRepo.create({
        accountId,
        otpCodeHash,
        otpType: 1,
        expiredAt,
        verifyAttemptCount: 0,
        resendCount,
        usedFlg: false,
      }),
    );

    const mfaToken = randomUUID();
    this.mfaTokenToOtpId.set(mfaToken, Number(saved.otpId));

    try {
      await this.mailService.sendOtp(email, otpCode);
    } catch (error) {
      this.logger.error({ event: 'auth.mfa.send_failed', error: String(error) });
      // Keep OTP; user can retry via resend. Spec §4.4 doesn't require rollback.
    }

    return { mfaToken, otpId: Number(saved.otpId) };
  }
}
