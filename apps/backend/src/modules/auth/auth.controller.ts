import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaResendDto, MfaVerifyDto } from './dto/mfa.dto';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function clientContext(req: Request) {
  return {
    ipAddress: (req.ip || req.socket?.remoteAddress || '').toString().slice(0, 50),
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
  };
}

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with login_id and password' })
  @ApiResponse({
    status: 200,
    description: 'MFA required (mfa_required=true) or login success (tokens returned)',
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
    res.cookie(
      REFRESH_COOKIE,
      result.refresh_token,
      refreshCookieOptions(process.env.NODE_ENV === 'production'),
    );
    return {
      data: {
        mfa_required: false,
        access_token: result.access_token,
        user: result.user,
      },
    };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Verify MFA OTP code' })
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
    res.cookie(
      REFRESH_COOKIE,
      result.refresh_token,
      refreshCookieOptions(process.env.NODE_ENV === 'production'),
    );
    return {
      data: {
        access_token: result.access_token,
        user: result.user,
      },
    };
  }

  @Post('mfa/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Resend MFA OTP code' })
  async resendMfa(@Body() dto: MfaResendDto) {
    const result = await this.authService.resendMfa(dto.mfa_token);
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token via cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookie = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.refreshToken(cookie);
    res.cookie(
      REFRESH_COOKIE,
      result.refresh_token,
      refreshCookieOptions(process.env.NODE_ENV === 'production'),
    );
    return { data: { access_token: result.access_token, user: result.user } };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return { message: '正常にログアウトしました' };
  }
}
