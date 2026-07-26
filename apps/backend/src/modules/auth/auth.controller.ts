import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthUserEnvelopeDto,
  LoginResponseDto,
  MfaResendResponseDto,
  SuccessMessageDto,
  VerifyResetTokenResponseDto,
} from './dto/auth-response.dto';
import { baseCookieOptions } from '@/common/utils/cookie';
import { DEFAULT_SESSION_TTL_SECONDS } from '@/config/config-defaults.constant';
import { LoginDto } from './dto/login.dto';
import { MfaResendDto, MfaVerifyDto } from './dto/mfa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

function clientContext(req: Request) {
  return {
    ipAddress: (req.ip || req.socket?.remoteAddress || '').toString().slice(0, 50),
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly ttlSeconds: number;
  private readonly nodeEnv: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('session.cookieName') ?? 'session_id';
    this.ttlSeconds =
      this.configService.get<number>('session.ttlSeconds') ??
      DEFAULT_SESSION_TTL_SECONDS;
    this.nodeEnv = this.configService.get<string>('nodeEnv') ?? 'development';
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with login_id and password' })
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
    description:
      'MFA required (mfa_required=true) OR login success (mfa_required=false, session cookie set, user returned).',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, clientContext(req));
    if (result.mfa_required) {
      return {
        data: {
          mfa_required: true,
          mfa_token: result.mfa_token,
          expires_in: result.expires_in,
        },
      };
    }
    this.setSessionCookie(res, result.session_id);
    return { data: { mfa_required: false, user: result.user } };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Verify MFA OTP code' })
  @ApiResponse({ status: 200, type: AuthUserEnvelopeDto })
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMfa(
      dto.mfa_token,
      dto.otp_code,
      clientContext(req),
    );
    this.setSessionCookie(res, result.session_id);
    return { data: { user: result.user } };
  }

  @Post('mfa/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Resend MFA OTP code' })
  @ApiResponse({ status: 200, type: MfaResendResponseDto })
  async resendMfa(@Body() dto: MfaResendDto) {
    const result = await this.authService.resendMfa(dto.mfa_token);
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extend the session TTL by another 24h and return the user profile',
  })
  @ApiResponse({ status: 200, type: AuthUserEnvelopeDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = this.readSessionId(req);
    const user = await this.authService.refreshSession(sessionId);
    // Re-issue the cookie so the browser extends its Max-Age too.
    if (sessionId) this.setSessionCookie(res, sessionId);
    return { data: { user } };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Destroy the Redis session and clear the cookie' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = this.readSessionId(req);
    await this.authService.logout(sessionId);
    this.clearSessionCookie(res);
    return { message: 'ログアウトしました。' };
  }

  // ─── SCR-012 password reset / change password ─────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 3 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    type: SuccessMessageDto,
    description:
      'Always 200 — account enumeration prevention; same response for known and unknown emails.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(
      dto.login_id,
      dto.email,
      clientContext(req),
    );
  }

  @Post('reset-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a password reset token (page-load check)' })
  @ApiResponse({ status: 200, type: VerifyResetTokenResponseDto })
  async verifyResetToken(@Body() dto: VerifyResetTokenDto) {
    const result = await this.authService.verifyResetToken(dto.token);
    return { data: result };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Consume reset token and set a new password' })
  @ApiResponse({
    status: 200,
    type: SuccessMessageDto,
    description: 'Password updated; existing sessions destroyed.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, clientContext(req));
  }

  // ─── Cookie helpers ───────────────────────────────────────────────────────

  private setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(this.cookieName, sessionId, this.cookieOptions());
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.cookieName, {
      ...this.cookieOptions(),
      maxAge: 0,
    });
  }

  private readSessionId(req: Request): string | undefined {
    const signed = req.signedCookies?.[this.cookieName];
    if (typeof signed === 'string') return signed;
    const plain = req.cookies?.[this.cookieName];
    return typeof plain === 'string' ? plain : undefined;
  }

  private cookieOptions(): CookieOptions {
    // Inherit the project-wide hardening flags (HttpOnly + Secure +
    // SameSite=Strict + Path=/); add the session-specific `signed`
    // tamper-detection and 24h Max-Age on top.
    return {
      ...baseCookieOptions(this.nodeEnv),
      signed: true,
      maxAge: this.ttlSeconds * 1000,
    };
  }
}
