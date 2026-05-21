import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SessionService, SessionPayload } from '../../modules/auth/session.service';

/**
 * Validates the `session_id` cookie against Redis on every request.
 *
 * Flow:
 * 1. Read the signed cookie (cookie-parser must be mounted with
 *    `SESSION_SECRET`) — `req.signedCookies[cookieName]`.
 * 2. Look up the session payload in Redis. Missing / expired → 401.
 * 3. Refresh the TTL (sliding 24h window) and attach the decoded payload
 *    to `req.user` so controllers can read it via `@Req()`.
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
    const signed = req.signedCookies?.[this.cookieName];
    if (typeof signed === 'string') return signed;
    const plain = req.cookies?.[this.cookieName];
    return typeof plain === 'string' ? plain : undefined;
  }
}
