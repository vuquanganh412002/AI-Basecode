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
    if (!user?.permissions) {
      throw new ForbiddenException();
    }

    // [perm-any-of] OR — required perm の1つ以上を保持で許可。FE router guard
    // (`src/router/index.ts` [permission-any-of]) と一致。ロール横断エンドポイント
    // (例 /api/v1/ja/dropdown) がロールを重複させず全許容 perm を宣言できる。
    // 複数 perm を渡す controller は現状なく、join 反転は後方互換。
    const hasAny = required.some((p: string) =>
      user.permissions.includes(p),
    );
    if (!hasAny) {
      throw new ForbiddenException();
    }

    return true;
  }
}
