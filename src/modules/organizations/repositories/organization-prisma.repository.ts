import { BadRequestException, Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { decryptSecret, encryptSecret } from '../../../common/utils/secret.util';
import { ConfigService } from '@nestjs/config';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationRepository, OrganizationSummary } from '../interfaces/organization.repository.interface';
import { isTrialAiAccessible } from '../../../common/utils/ai-access.util';

@Injectable()
export class OrganizationPrismaRepository implements OrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findMany(query: PaginationQueryDto): Promise<PaginatedResult<OrganizationSummary>> {
    const where: Prisma.OrganizationWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const summaries = await Promise.all(items.map((organization) => this.enrichOrganization(organization)));

    return { items: summaries, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<OrganizationSummary | null> {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    return organization ? this.enrichOrganization(organization) : null;
  }

  async create(payload: CreateOrganizationDto): Promise<OrganizationSummary> {
    const {
      enabledModules,
      openAiApiKey,
      subscriptionStatus: _subscriptionStatus,
      trialDays: _trialDays,
      trialStartsAt: _trialStartsAt,
      trialEndsAt: _trialEndsAt,
      subscriptionStartsAt: _subscriptionStartsAt,
      subscriptionEndsAt: _subscriptionEndsAt,
      subscriptionNotes: _subscriptionNotes,
      aiDraftApprovalRequired: _aiDraftApprovalRequired,
      ...rest
    } = payload;
    const billingData = this.resolveBillingFields(payload);
    const encryptedAiKey = this.encryptOpenAiKey(openAiApiKey);
    const data: Prisma.OrganizationUncheckedCreateInput = {
      ...rest,
      ...billingData,
      ...(encryptedAiKey
        ? {
            openAiApiKeyEncrypted: encryptedAiKey,
            openAiApiKeyUpdatedAt: new Date(),
          }
        : {}),
      enabledModules: enabledModules as unknown as Prisma.OrganizationUncheckedCreateInput['enabledModules'],
    };
    const organization = await this.prisma.organization.create({
      data,
    });
    return this.enrichOrganization(organization);
  }

  async update(id: string, payload: UpdateOrganizationDto): Promise<OrganizationSummary> {
    const existing = await this.prisma.organization.findUniqueOrThrow({ where: { id } });
    const {
      enabledModules,
      openAiApiKey,
      subscriptionStatus: _subscriptionStatus,
      trialDays: _trialDays,
      trialStartsAt: _trialStartsAt,
      trialEndsAt: _trialEndsAt,
      subscriptionStartsAt: _subscriptionStartsAt,
      subscriptionEndsAt: _subscriptionEndsAt,
      subscriptionNotes: _subscriptionNotes,
      ...rest
    } = payload;
    const billingData = this.resolveBillingFields(payload, existing);
    const encryptedAiKey = this.encryptOpenAiKey(openAiApiKey);
    const data: Prisma.OrganizationUncheckedUpdateInput = {
      ...rest,
      ...billingData,
      ...(openAiApiKey !== undefined
        ? {
            openAiApiKeyEncrypted: encryptedAiKey,
            openAiApiKeyUpdatedAt: encryptedAiKey ? new Date() : null,
          }
        : {}),
      ...(enabledModules
        ? {
            enabledModules: enabledModules as unknown as Prisma.OrganizationUncheckedUpdateInput['enabledModules'],
          }
        : {}),
    };
    const organization = await this.prisma.organization.update({
      where: { id },
      data,
    });
    return this.enrichOrganization(organization);
  }

  private async enrichOrganization(organization: Organization): Promise<OrganizationSummary> {
    const [
      totalUsers,
      totalAdmins,
      totalStaff,
      totalStudents,
      totalBatches,
      totalFeePlans,
      totalFeeRecords,
      totalAttendanceRecords,
      totalReminderLogs,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { organizationId: organization.id } }),
      this.prisma.user.count({
        where: {
          organizationId: organization.id,
          userRoles: {
            some: {
              role: {
                name: 'ADMIN',
              },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          organizationId: organization.id,
          userRoles: {
            some: {
              role: {
                name: 'STAFF',
              },
            },
          },
        },
      }),
      this.prisma.student.count({ where: { organizationId: organization.id } }),
      this.prisma.batch.count({ where: { organizationId: organization.id } }),
      this.prisma.feePlan.count({ where: { organizationId: organization.id } }),
      this.prisma.feeRecord.count({ where: { organizationId: organization.id } }),
      this.prisma.attendance.count({ where: { organizationId: organization.id } }),
      this.prisma.reminderLog.count({ where: { organizationId: organization.id } }),
    ]);

    return {
      ...this.sanitizeOrganization(organization),
      totalUsers,
      totalAdmins,
      totalStaff,
      totalStudents,
      totalBatches,
      totalFeePlans,
      totalFeeRecords,
      totalAttendanceRecords,
      totalReminderLogs,
      hasOpenAiApiKey: Boolean((organization as Organization & { openAiApiKeyEncrypted?: string | null }).openAiApiKeyEncrypted),
      hasTrialAiAccess: isTrialAiAccessible(organization.subscriptionStatus, organization.trialEndsAt),
    };
  }

  private resolveBillingFields(payload: CreateOrganizationDto | UpdateOrganizationDto, existing?: Organization) {
    const trialDays = payload.trialDays ?? existing?.trialDays ?? 14;
    const trialStartsAt = payload.trialStartsAt ? new Date(payload.trialStartsAt) : existing?.trialStartsAt ?? new Date();
    const shouldRecalculateTrialEndsAt =
      payload.trialEndsAt !== undefined || payload.trialDays !== undefined || payload.trialStartsAt !== undefined || !existing;
    const trialEndsAt = payload.trialEndsAt
      ? new Date(payload.trialEndsAt)
      : shouldRecalculateTrialEndsAt
        ? this.addDays(trialStartsAt, trialDays)
        : existing?.trialEndsAt;

    return {
      subscriptionStatus: payload.subscriptionStatus ?? existing?.subscriptionStatus,
      trialDays,
      trialStartsAt,
      trialEndsAt,
      subscriptionStartsAt:
        payload.subscriptionStartsAt !== undefined
          ? payload.subscriptionStartsAt
            ? new Date(payload.subscriptionStartsAt)
            : null
          : existing?.subscriptionStartsAt,
      subscriptionEndsAt:
        payload.subscriptionEndsAt !== undefined
          ? payload.subscriptionEndsAt
            ? new Date(payload.subscriptionEndsAt)
            : null
          : existing?.subscriptionEndsAt,
      subscriptionNotes:
        payload.subscriptionNotes !== undefined ? payload.subscriptionNotes || null : existing?.subscriptionNotes,
    };
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private sanitizeOrganization<T extends Organization>(organization: T) {
    const { openAiApiKeyEncrypted: _openAiApiKeyEncrypted, ...rest } = organization as T & {
      openAiApiKeyEncrypted?: string | null;
    };
    return {
      ...rest,
      hasOpenAiApiKey: Boolean(_openAiApiKeyEncrypted),
      hasTrialAiAccess: isTrialAiAccessible(rest.subscriptionStatus, rest.trialEndsAt),
    };
  }

  private encryptOpenAiKey(openAiApiKey?: string) {
    if (openAiApiKey === undefined) {
      return undefined;
    }

    const trimmed = openAiApiKey.trim();
    if (!trimmed) {
      return null;
    }

    const secret = this.configService.get<string>('security.organizationSecretKey', { infer: true });
    if (!secret) {
      throw new BadRequestException('Organization secret key is not configured');
    }

    return encryptSecret(trimmed, secret);
  }
}
