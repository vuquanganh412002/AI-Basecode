import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const accessToken = request.cookies?.access_token;
    if (accessToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${accessToken}`;
    }
    return super.canActivate(context);
  }
}
