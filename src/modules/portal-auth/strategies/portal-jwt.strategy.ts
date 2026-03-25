import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PortalAccountType } from '@prisma/client';
import { AppConfiguration } from '../../../config/configuration';
import { CurrentPortalUserContext } from '../../../common/interfaces/current-portal-user.interface';

interface PortalJwtPayload {
  sub: string;
  studentId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  accountType: PortalAccountType;
  scope: 'portal';
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(configService: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.secret', { infer: true }),
    });
  }

  validate(payload: PortalJwtPayload): CurrentPortalUserContext {
    if (!payload.sub || payload.scope !== 'portal') {
      throw new UnauthorizedException('Invalid portal token payload');
    }

    return {
      accountId: payload.sub,
      studentId: payload.studentId,
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      email: payload.email,
      accountType: payload.accountType,
    };
  }
}
