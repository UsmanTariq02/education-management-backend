import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../../config/configuration';
import { OrganizationModule } from '../../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../../common/interfaces/current-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  userLimit: number | null;
  studentLimit: number | null;
  enabledModules: OrganizationModule[];
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.secret', { infer: true }),
    });
  }

  validate(payload: JwtPayload): CurrentUserContext {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      userLimit: payload.userLimit,
      studentLimit: payload.studentLimit,
      enabledModules: payload.enabledModules ?? [],
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
