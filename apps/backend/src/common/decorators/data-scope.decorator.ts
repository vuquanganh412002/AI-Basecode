import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface DataScope {
  roleCode: string;
  jaId: number | null;
  kanriShitenId: number | null;
}

export const GetDataScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DataScope => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return {
      roleCode: user?.roleCode ?? '',
      jaId: user?.jaId ?? null,
      kanriShitenId: user?.kanriShitenId ?? null,
    };
  },
);
