import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'この画面へのアクセス権限がありません。',
      });
    }

    const hasAll = required.every((p: string) =>
      user.permissions.includes(p),
    );
    if (!hasAll) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'この画面へのアクセス権限がありません。',
      });
    }

    return true;
  }
}
