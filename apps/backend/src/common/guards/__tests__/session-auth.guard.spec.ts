// SessionAuthGuard unit specs.
//
// Regression (backend review): the guard threw @nestjs/common's own
// UnauthorizedException instead of the project's @/common/exceptions
// class. GlobalExceptionFilter happens to normalize the response body via
// its STATUS_TO_CODE fallback either way, but throwing the framework class
// bypasses the project's exception standard (every business exception must
// extend DomainException) and silently depends on that fallback map staying
// in sync instead of being explicit.

import { UnauthorizedException } from '@/common/exceptions/common.exceptions';
import { DomainException } from '@/common/exceptions/domain.exception';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

function ctxFor(req: Record<string, unknown>): any {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  };
}

describe('SessionAuthGuard', () => {
  let sessionService: { touch: jest.Mock };
  let configService: { get: jest.Mock };
  let guard: SessionAuthGuard;

  beforeEach(() => {
    sessionService = { touch: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(undefined) };
    guard = new SessionAuthGuard(sessionService as any, configService as any);
  });

  it('should throw the project UnauthorizedException (not @nestjs/common) when no session cookie is present', async () => {
    const req = { cookies: {}, signedCookies: {} };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.touch).not.toHaveBeenCalled();
  });

  it('should throw the project UnauthorizedException when the session is missing/expired in Redis', async () => {
    sessionService.touch.mockResolvedValue(null);
    const req = { cookies: { session_id: 'sid-1' }, signedCookies: {} };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('thrown exception should extend DomainException and carry error_code UNAUTHORIZED', async () => {
    const req = { cookies: {}, signedCookies: {} };
    let caught: unknown;
    try {
      await guard.canActivate(ctxFor(req));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainException);
    expect((caught as UnauthorizedException).getResponse()).toMatchObject({
      error_code: 'UNAUTHORIZED',
    });
  });

  it('should attach the session payload to req.user and allow the request when the session is valid', async () => {
    const payload: SessionPayload = {
      account_id: 1,
      login_id: 'admin01',
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      kanri_shiten_id: null,
      shiten_id: null,
      todofuken_code: null,
      permissions: [],
    } as unknown as SessionPayload;
    sessionService.touch.mockResolvedValue(payload);
    const req: Record<string, unknown> = {
      cookies: { session_id: 'sid-1' },
      signedCookies: {},
    };

    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(req.user).toBe(payload);
  });

  it('should prefer the signed cookie over the plain cookie', async () => {
    sessionService.touch.mockResolvedValue(null);
    const req = {
      cookies: { session_id: 'plain-sid' },
      signedCookies: { session_id: 'signed-sid' },
    };

    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.touch).toHaveBeenCalledWith('signed-sid');
  });
});
