import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { AppConfiguration } from '../../config/configuration';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { PasswordUtil } from '../../common/utils/password.util';
import { AuditLogService } from '../../common/services/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { TokenPair } from './interfaces/token-pair.interface';
import { UserRepository } from '../users/interfaces/user.repository.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(payload: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: AuthenticatedUser }> {
    const user = await this.userRepository.findByEmailWithAuthorization(payload.email);

    if (!user || !(await PasswordUtil.compare(payload.password, user.passwordHash))) {
      await this.auditLogService.log({
        module: 'auth',
        action: 'login-failed',
        metadata: { email: payload.email },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.ensureAuthenticationAllowed(user, payload.email);

    const hydratedUser = this.mapUser(user);
    const tokens = await this.generateTokenPair(hydratedUser);

    await this.userRepository.storeRefreshToken(
      user.id,
      await PasswordUtil.hash(tokens.refreshToken),
      this.resolveRefreshTokenExpiry(),
    );
    await this.auditLogService.log({
      actorUserId: user.id,
      module: 'auth',
      action: 'login',
      targetId: user.id,
      metadata: { email: user.email },
    });

    return { ...tokens, user: hydratedUser };
  }

  async refreshTokens(payload: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string; user: AuthenticatedUser }> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(payload.refreshToken, {
      secret: this.configService.get('auth.refreshSecret', { infer: true }),
    });

    const user = await this.userRepository.findByIdWithAuthorization(decoded.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.ensureAuthenticationAllowed(user, user.email);

    const refreshTokenRecord = await this.userRepository.findActiveRefreshTokenByUserId(user.id);
    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Refresh token session not found');
    }

    const isMatch = await PasswordUtil.compare(payload.refreshToken, refreshTokenRecord.tokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.userRepository.revokeRefreshToken(refreshTokenRecord.id);

    const hydratedUser = this.mapUser(user);
    const tokens = await this.generateTokenPair(hydratedUser);

    await this.userRepository.storeRefreshToken(
      user.id,
      await PasswordUtil.hash(tokens.refreshToken),
      this.resolveRefreshTokenExpiry(),
    );
    await this.auditLogService.log({
      actorUserId: user.id,
      module: 'auth',
      action: 'refresh',
      targetId: user.id,
    });

    return { ...tokens, user: hydratedUser };
  }

  async logout(userId: string, payload?: LogoutDto): Promise<void> {
    await this.userRepository.revokeActiveRefreshTokensByUserId(userId);
    await this.auditLogService.log({
      actorUserId: userId,
      module: 'auth',
      action: 'logout',
      targetId: userId,
      metadata: payload?.reason ? { reason: payload.reason } : undefined,
    });
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findByIdWithAuthorization(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.ensureAuthenticationAllowed(user, user.email);

    return this.mapUser(user);
  }

  private async generateTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        userLimit: user.userLimit,
        studentLimit: user.studentLimit,
        enabledModules: user.enabledModules,
        roles: user.roles,
        permissions: user.permissions,
      },
      {
        secret: this.configService.get('auth.secret', { infer: true }),
        expiresIn: this.configService.get('auth.expiresIn', { infer: true }),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get('auth.refreshSecret', { infer: true }),
        expiresIn: this.configService.get('auth.refreshExpiresIn', { infer: true }),
      },
    );

    return { accessToken, refreshToken };
  }

  private resolveRefreshTokenExpiry(): Date {
    const expiresIn = this.configService.get('auth.refreshExpiresIn', { infer: true });
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    const now = new Date();

    if (!match) {
      now.setDate(now.getDate() + 7);
      return now;
    }

    const [, value, unit] = match;
    const amount = Number(value);

    if (unit === 'd') {
      now.setDate(now.getDate() + amount);
    }

    if (unit === 'h') {
      now.setHours(now.getHours() + amount);
    }

    if (unit === 'm') {
      now.setMinutes(now.getMinutes() + amount);
    }

    return now;
  }

  private mapUser(
    user: User & {
      organization?: {
        id: string;
        name: string;
        isActive: boolean;
        userLimit: number;
        studentLimit: number;
        enabledModules: string[];
      } | null;
      userRoles: Array<{ role: { name: string; rolePermissions: Array<{ permission: { name: string } }> } }>;
    },
  ): AuthenticatedUser {
    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.name),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      userLimit: user.organization?.userLimit ?? null,
      studentLimit: user.organization?.studentLimit ?? null,
      enabledModules: (user.organization?.enabledModules as OrganizationModule[] | undefined) ?? [],
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles,
      permissions,
    };
  }

  private async ensureAuthenticationAllowed(
    user: User & {
      organization?: { id: string; name: string; isActive: boolean } | null;
      userRoles?: Array<{ role: { name: string } }>;
    },
    email: string,
  ): Promise<void> {
    const roles = user.userRoles?.map((userRole) => userRole.role.name) ?? [];

    if (!user.isActive) {
      await this.auditLogService.log({
        actorUserId: user.id,
        module: 'auth',
        action: 'login-blocked',
        targetId: user.id,
        metadata: { reason: 'inactive-account', email: user.email },
      });
      throw new UnauthorizedException('User account is inactive');
    }

    if (!roles.includes('SUPER_ADMIN') && !user.organizationId) {
      await this.auditLogService.log({
        actorUserId: user.id,
        module: 'auth',
        action: 'login-blocked',
        targetId: user.id,
        metadata: { reason: 'missing-organization-scope', email: user.email },
      });
      throw new UnauthorizedException('Organization assignment is missing for this user');
    }

    if (user.organizationId && user.organization && !user.organization.isActive) {
      await this.auditLogService.log({
        actorUserId: user.id,
        module: 'auth',
        action: 'login-blocked',
        targetId: user.id,
        metadata: {
          reason: 'inactive-organization',
          email,
          organizationId: user.organization.id,
          organizationName: user.organization.name,
        },
      });
      throw new UnauthorizedException('Organization is inactive');
    }
  }
}
