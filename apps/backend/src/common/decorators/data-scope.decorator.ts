import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionPayload } from '@/modules/auth/session.service';

export interface DataScope {
  roleCode: string;
  jaId: number | null;
  kanriShitenId: number | null;
}

/**
 * `createParamDecorator` の factory を切り出した純粋関数 — NestJS の
 * ExecutionContext/リフレクション無しに単体テストできる。
 */
export function extractDataScope(request: {
  user?: SessionPayload;
}): DataScope {
  const user = request.user;
  return {
    roleCode: user?.role_code ?? '',
    jaId: user?.ja_id ?? null,
    kanriShitenId: user?.kanri_shiten_id ?? null,
  };
}

export const GetDataScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DataScope =>
    extractDataScope(ctx.switchToHttp().getRequest()),
);
