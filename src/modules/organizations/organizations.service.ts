import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY, REMINDER_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationBillingEntryDto } from './dto/create-organization-billing-entry.dto';
import { ReminderRepository } from '../reminders/interfaces/reminder.repository.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRepository } from './interfaces/organization.repository.interface';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(REMINDER_REPOSITORY)
    private readonly reminderRepository: ReminderRepository,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    return this.organizationRepository.findMany(query);
  }

  async findOne(id: string) {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async getCurrent(actor: CurrentUserContext) {
    this.assertTenantAdmin(actor);
    const organizationId = this.resolveOrganizationId(actor);
    return this.findOne(organizationId);
  }

  async create(payload: CreateOrganizationDto, actor: CurrentUserContext) {
    const organization = await this.organizationRepository.create(payload);
    const reminderAssets = await this.reminderRepository.provisionDefaultAssets(organization.id);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organizations',
      action: 'create',
      targetId: organization.id,
      metadata: {
        slug: organization.slug,
        defaultReminderTemplatesCreated: reminderAssets.templatesCreated,
        defaultReminderRulesCreated: reminderAssets.rulesCreated,
      },
    });
    return organization;
  }

  async update(id: string, payload: UpdateOrganizationDto, actor: CurrentUserContext) {
    const organization = await this.organizationRepository.update(id, payload);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organizations',
      action: 'update',
      targetId: organization.id,
      metadata: {
        subscriptionStatus: organization.subscriptionStatus,
        trialEndsAt: organization.trialEndsAt,
        subscriptionEndsAt: organization.subscriptionEndsAt,
      },
    });
    return organization;
  }

  async listBillingEntries(id: string) {
    await this.findOne(id);
    return this.prisma.organizationBillingEntry.findMany({
      where: { organizationId: id },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async createBillingEntry(id: string, payload: CreateOrganizationBillingEntryDto, actor: CurrentUserContext) {
    const organization = await this.findOne(id);
    const entry = await this.prisma.organizationBillingEntry.create({
      data: {
        organizationId: id,
        type: payload.type,
        status: payload.status,
        title: payload.title,
        description: payload.description,
        amount: payload.amount,
        currency: payload.currency,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        entryDate: payload.entryDate ? new Date(payload.entryDate) : undefined,
        periodStart: payload.periodStart ? new Date(payload.periodStart) : undefined,
        periodEnd: payload.periodEnd ? new Date(payload.periodEnd) : undefined,
        userCountSnapshot: organization.totalUsers,
        moduleCountSnapshot: organization.enabledModules.length,
      },
    });
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organizations',
      action: 'create-billing-entry',
      targetId: id,
      metadata: {
        billingEntryId: entry.id,
        type: entry.type,
        status: entry.status,
        amount: entry.amount,
        currency: entry.currency,
      },
    });
    return entry;
  }

  async updateCurrent(payload: UpdateOrganizationDto, actor: CurrentUserContext) {
    this.assertTenantAdmin(actor);
    const organizationId = this.resolveOrganizationId(actor);
    const updatePayload: UpdateOrganizationDto = {
      name: payload.name,
      slug: payload.slug,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    };
    const organization = await this.organizationRepository.update(organizationId, updatePayload);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'organization-settings',
      action: 'update-current',
      targetId: organization.id,
      metadata: {
        name: organization.name,
        slug: organization.slug,
        isActive: organization.isActive,
      },
    });
    return organization;
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    return actor.organizationId;
  }

  private assertTenantAdmin(actor: CurrentUserContext): void {
    if (actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Super admin must manage organizations from the platform organizations module');
    }

    if (!actor.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only organization admins can manage organization settings');
    }
  }
}
