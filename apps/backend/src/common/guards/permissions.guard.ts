import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ForbiddenException } from '@/common/exceptions/common.exceptions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.permissions) {
      throw new ForbiddenException();
    }

    // [perm-any-of] OR semantics — caller holds AT LEAST ONE of the
    // required perms. Matches the FE router guard (see
    // `src/router/index.ts` [permission-any-of]). Lets endpoints
    // shared across roles (e.g. /api/v1/ja/dropdown — consumed by
    // every CRUD form regardless of role) declare every accepted
    // perm without forcing roles to overlap. No existing controller
    // passes multiple perms, so flipping the join is backwards-safe.
    const hasAny = required.some((p: string) =>
      user.permissions.includes(p),
    );
    if (!hasAny) {
      throw new ForbiddenException();
    }

    return true;
  }
}
