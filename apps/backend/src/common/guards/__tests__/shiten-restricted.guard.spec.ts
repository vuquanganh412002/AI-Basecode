// ShitenRestrictedGuard（制限②・顧客要件 2026-07）のユニットテスト。
// session.shiten_id != null のとき帳票5画面を 403 で弾く。

import { ShitenRestrictedGuard } from '@/common/guards/shiten-restricted.guard';
import { ForbiddenException } from '@/common/exceptions/common.exceptions';
import type { SessionPayload } from '@/modules/auth/session.service';

function ctxFor(user: Partial<SessionPayload> | undefined): any {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
}

describe('ShitenRestrictedGuard', () => {
  const guard = new ShitenRestrictedGuard();

  it('should allow the request when session.shiten_id is null', () => {
    expect(guard.canActivate(ctxFor({ shiten_id: null }))).toBe(true);
  });

  it('should allow the request when there is no user on the request', () => {
    expect(guard.canActivate(ctxFor(undefined))).toBe(true);
  });

  it('should throw ForbiddenException when session.shiten_id is set', () => {
    expect(() => guard.canActivate(ctxFor({ shiten_id: 5 }))).toThrow(
      ForbiddenException,
    );
  });

  it('should carry the 顧客要件 message when blocking', () => {
    expect(() => guard.canActivate(ctxFor({ shiten_id: 5 }))).toThrow(
      /所属支店が設定されたアカウントはこの機能を使用できません。/,
    );
  });
});
