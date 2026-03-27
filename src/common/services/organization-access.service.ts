import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserContext } from '../interfaces/current-user.interface';
import { OrganizationModule } from '../enums/organization-module.enum';

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertUserLimitNotReached(organizationId: string): Promise<void> {
    const organization = await this.getOrganizationConfiguration(organizationId);
    this.assertOrganizationAccessibleConfiguration(organization);
    const totalUsers = await this.prisma.user.count({
      where: {
        organizationId,
      },
    });

    if (totalUsers >= organization.userLimit) {
      throw new ForbiddenException(`User limit reached for this organization (${organization.userLimit})`);
    }
  }

  async assertStudentLimitNotReached(organizationId: string, requestedCount = 1): Promise<void> {
    const organization = await this.getOrganizationConfiguration(organizationId);
    this.assertOrganizationAccessibleConfiguration(organization);
    const totalStudents = await this.prisma.student.count({
      where: {
        organizationId,
      },
    });

    if (totalStudents + requestedCount > organization.studentLimit) {
      throw new ForbiddenException(`Student limit reached for this organization (${organization.studentLimit})`);
    }
  }

  async assertModuleEnabled(organizationId: string, module: OrganizationModule): Promise<void> {
    const organization = await this.getOrganizationConfiguration(organizationId);
    this.assertOrganizationAccessibleConfiguration(organization);

    if (!organization.enabledModules.includes(module)) {
      throw new ForbiddenException(`${module} module is not enabled for this organization`);
    }
  }

  async getOrganizationConfiguration(organizationId: string): Promise<{
    isActive: boolean;
    subscriptionStatus: string;
    trialEndsAt: Date | null;
    userLimit: number;
    studentLimit: number;
    enabledModules: OrganizationModule[];
  }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        isActive: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        userLimit: true,
        studentLimit: true,
        enabledModules: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      isActive: organization.isActive,
      subscriptionStatus: organization.subscriptionStatus,
      trialEndsAt: organization.trialEndsAt,
      userLimit: organization.userLimit,
      studentLimit: organization.studentLimit,
      enabledModules: organization.enabledModules as OrganizationModule[],
    };
  }

  async assertOrganizationAccessible(organizationId: string): Promise<void> {
    const organization = await this.getOrganizationConfiguration(organizationId);
    this.assertOrganizationAccessibleConfiguration(organization);
  }

  async assertActorCanAccessModule(actor: CurrentUserContext, module: OrganizationModule): Promise<void> {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return;
    }

    if (!actor.organizationId) {
      throw new ForbiddenException('Organization scope is required');
    }

    await this.assertOrganizationAccessible(actor.organizationId);

    if (!(actor.enabledModules ?? []).includes(module)) {
      throw new ForbiddenException(`${module} module is not enabled for this organization`);
    }
  }

  private assertOrganizationAccessibleConfiguration(organization: {
    isActive: boolean;
    subscriptionStatus: string;
    trialEndsAt: Date | null;
  }) {
    if (!organization.isActive) {
      throw new ForbiddenException('Organization is inactive');
    }

    if (['SUSPENDED', 'CANCELLED'].includes(organization.subscriptionStatus)) {
      throw new ForbiddenException('Organization subscription is not active');
    }

    if (organization.subscriptionStatus === 'TRIAL' && organization.trialEndsAt && organization.trialEndsAt < new Date()) {
      throw new ForbiddenException('Organization trial period has expired');
    }
  }
}
