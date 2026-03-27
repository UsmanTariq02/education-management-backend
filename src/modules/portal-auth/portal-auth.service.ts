import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortalAccountType, StudentStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AppConfiguration } from '../../config/configuration';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PortalAuthResponseDto, PortalAuthUserDto } from './dto/portal-auth-response.dto';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalRefreshTokenDto } from './dto/portal-refresh-token.dto';
import { PortalAuthenticatedUser } from './interfaces/portal-authenticated-user.interface';

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(payload: PortalLoginDto): Promise<PortalAuthResponseDto> {
    const account = await this.findAccountByEmail(payload.email, payload.accountType);
    if (!account || !(await PasswordUtil.compare(payload.password, account.passwordHash))) {
      throw new UnauthorizedException('Invalid portal credentials');
    }

    await this.assertPortalAuthenticationAllowed(account);

    const user = this.toUser(account);
    const tokens = await this.generateTokenPair(user);

    await this.prisma.portalAccount.update({
      where: { id: account.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: await PasswordUtil.hash(tokens.refreshToken),
        refreshTokenExpiresAt: this.resolveRefreshTokenExpiry(),
      },
    });

    await this.auditLogService.log({
      module: 'portal-auth',
      action: 'login',
      targetId: account.studentId,
      metadata: { accountType: payload.accountType, email: user.email },
    });

    return { ...tokens, user };
  }

  async refreshTokens(payload: PortalRefreshTokenDto): Promise<PortalAuthResponseDto> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string; scope: 'portal' }>(payload.refreshToken, {
      secret: this.configService.get('auth.refreshSecret', { infer: true }),
    });

    if (decoded.scope !== 'portal') {
      throw new UnauthorizedException('Invalid portal refresh token');
    }

    const account = await this.findAccountById(decoded.sub);
    if (!account || !account.refreshTokenHash) {
      throw new UnauthorizedException('Portal refresh session not found');
    }

    await this.assertPortalAuthenticationAllowed(account);

    const isMatch = await PasswordUtil.compare(payload.refreshToken, account.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid portal refresh token');
    }

    const user = this.toUser(account);
    const tokens = await this.generateTokenPair(user);

    await this.prisma.portalAccount.update({
      where: { id: account.id },
      data: {
        refreshTokenHash: await PasswordUtil.hash(tokens.refreshToken),
        refreshTokenExpiresAt: this.resolveRefreshTokenExpiry(),
      },
    });

    return { ...tokens, user };
  }

  async me(accountId: string): Promise<PortalAuthUserDto> {
    const account = await this.findAccountById(accountId);
    if (!account) {
      throw new UnauthorizedException('Portal account not found');
    }

    await this.assertPortalAuthenticationAllowed(account);
    return this.toUser(account);
  }

  async logout(accountId: string): Promise<void> {
    await this.prisma.portalAccount.update({
      where: { id: accountId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  private async generateTokenPair(user: PortalAuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.accountId,
        studentId: user.studentId,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        email: user.email,
        accountType: user.accountType,
        scope: 'portal',
      },
      {
        secret: this.configService.get('auth.secret', { infer: true }),
        expiresIn: this.configService.get('auth.expiresIn', { infer: true }),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.accountId,
        scope: 'portal',
      },
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

    if (unit === 'd') now.setDate(now.getDate() + amount);
    if (unit === 'h') now.setHours(now.getHours() + amount);
    if (unit === 'm') now.setMinutes(now.getMinutes() + amount);

    return now;
  }

  private async findAccountByEmail(email: string, type: PortalAccountType) {
    return this.prisma.portalAccount.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        type,
      },
      include: {
        organization: true,
        student: {
          include: {
            studentBatches: {
              include: {
                batch: true,
              },
            },
          },
        },
      },
    });
  }

  private async findAccountById(id: string) {
    return this.prisma.portalAccount.findUnique({
      where: { id },
      include: {
        organization: true,
        student: {
          include: {
            studentBatches: {
              include: {
                batch: true,
              },
            },
          },
        },
      },
    });
  }

  private async assertPortalAuthenticationAllowed(account: Awaited<ReturnType<PortalAuthService['findAccountById']>>): Promise<void> {
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Portal account is inactive');
    }

    if (!account.organization.isActive) {
      throw new UnauthorizedException('Organization is inactive');
    }

    if (['SUSPENDED', 'CANCELLED'].includes(account.organization.subscriptionStatus)) {
      throw new UnauthorizedException('Organization subscription is not active');
    }

    if (account.organization.subscriptionStatus === 'TRIAL' && account.organization.trialEndsAt && account.organization.trialEndsAt < new Date()) {
      throw new UnauthorizedException('Organization trial period has expired');
    }

    if (!(account.organization.enabledModules as string[]).includes(OrganizationModule.PORTALS)) {
      throw new UnauthorizedException('Portal access is not enabled for this organization');
    }

    if (account.student.status === StudentStatus.INACTIVE || account.student.status === StudentStatus.SUSPENDED) {
      throw new UnauthorizedException('Student portal access is inactive');
    }
  }

  private toUser(account: NonNullable<Awaited<ReturnType<PortalAuthService['findAccountById']>>>): PortalAuthUserDto {
    return {
      accountId: account.id,
      studentId: account.studentId,
      organizationId: account.organizationId,
      organizationName: account.organization.name,
      email: account.email,
      accountType: account.type,
      studentName: account.student.fullName,
      guardianName: account.student.guardianName,
      batches: account.student.studentBatches.map((item) => item.batch.name),
      studentStatus: account.student.status,
    };
  }
}
