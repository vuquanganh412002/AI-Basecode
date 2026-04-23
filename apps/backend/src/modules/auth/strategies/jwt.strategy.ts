import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.publicKey'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: Record<string, unknown>) {
    return {
      accountId: payload.accountId,
      loginId: payload.loginId,
      roleId: payload.roleId,
      roleCode: payload.roleCode,
      jaId: payload.jaId,
      kanriShitenId: payload.kanriShitenId,
      permissions: payload.permissions || [],
    };
  }
}
