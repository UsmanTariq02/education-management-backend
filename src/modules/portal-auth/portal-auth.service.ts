import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortalAccountType, StudentStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AppConfiguration } from '../../config/configuration';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { PasswordUtil } from '../../common/utils/password.util';
import { isTrialAiAccessible } from '../../common/utils/ai-access.util';
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
    const response = await this.createSession(account, user);

    await this.auditLogService.log({
      module: 'portal-auth',
      action: 'login',
      targetId: account.studentId,
      metadata: { accountType: payload.accountType, email: user.email },
    });

    return response;
  }

  async impersonateStudent(studentId: string, actor: CurrentUserContext): Promise<PortalAuthResponseDto> {
    return this.impersonateStudentPortal(studentId, actor, PortalAccountType.STUDENT);
  }

  async impersonateParent(studentId: string, actor: CurrentUserContext): Promise<PortalAuthResponseDto> {
    return this.impersonateStudentPortal(studentId, actor, PortalAccountType.PARENT);
  }

  private async impersonateStudentPortal(
    studentId: string,
    actor: CurrentUserContext,
    accountType: PortalAccountType,
  ): Promise<PortalAuthResponseDto> {
    if (!actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only super admins can open a student portal session');
    }

    const account = await this.findAccountByStudentId(studentId, accountType);
    if (!account) {
      throw new NotFoundException(`${accountType === PortalAccountType.STUDENT ? 'Student' : 'Parent'} portal account not found`);
    }

    await this.assertPortalAuthenticationAllowed(account);

    const user = this.toUser(account);
    const response = await this.createSession(account, user);

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'portal-auth',
      action: 'impersonate-login',
      targetId: account.studentId,
      metadata: {
        accountType: account.type,
        email: user.email,
        initiatedBy: actor.email,
      },
    });

    return response;
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
    return this.createSession(account, user);
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

  private async createSession(
    account: NonNullable<Awaited<ReturnType<PortalAuthService['findAccountById']>>>,
    user: PortalAuthenticatedUser,
  ): Promise<PortalAuthResponseDto> {
    const tokens = await this.generateTokenPair(user);

    await this.prisma.portalAccount.update({
      where: { id: account.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: await PasswordUtil.hash(tokens.refreshToken),
        refreshTokenExpiresAt: this.resolveRefreshTokenExpiry(),
      },
    });

    return { ...tokens, user };
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

  private async findAccountByStudentId(studentId: string, type: PortalAccountType) {
    return this.prisma.portalAccount.findFirst({
      where: {
        studentId,
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

    if (['PAST_DUE', 'SUSPENDED', 'CANCELLED'].includes(account.organization.subscriptionStatus)) {
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
      hasOpenAiApiKey: Boolean((account.organization as { openAiApiKeyEncrypted?: string | null }).openAiApiKeyEncrypted),
      hasTrialAiAccess: isTrialAiAccessible(account.organization.subscriptionStatus, account.organization.trialEndsAt),
      email: account.email,
      accountType: account.type,
      studentName: account.student.fullName,
      guardianName: account.student.guardianName,
      batches: account.student.studentBatches.map((item) => item.batch.name),
      studentStatus: account.student.status,
    };
  }
}
