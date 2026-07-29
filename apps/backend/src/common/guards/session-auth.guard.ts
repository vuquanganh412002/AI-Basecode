import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SessionService, SessionPayload } from '@/modules/auth/session.service';

/**
 * 全リクエストで `session_id` cookie を Redis 照合。
 * 1. signed cookie (`SESSION_SECRET` の cookie-parser 発行) を読む。
 * 2. Redis で payload 参照。無し/期限切れ → 401。
 * 3. TTL 更新 (sliding 24h) し payload を `req.user` へ付与 (controller が `@Req()` で参照)。
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('session.cookieName') ?? 'session_id';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const sessionId = this.readSessionId(req);
    if (!sessionId) throw new UnauthorizedException();

    const payload = await this.sessionService.touch(sessionId);
    if (!payload) throw new UnauthorizedException();

    (req as Request & { user?: SessionPayload }).user = payload;
    return true;
  }

  private readSessionId(req: Request): string | undefined {
    // signed cookie 優先、無ければ plain (SESSION_SECRET 未設定の dev 用。
    // 値が実在 Redis key に一致しなければ touch() が却下)。
    const signed = req.signedCookies?.[this.cookieName];
    if (typeof signed === 'string') return signed;
    const plain = req.cookies?.[this.cookieName];
    return typeof plain === 'string' ? plain : undefined;
  }
}
