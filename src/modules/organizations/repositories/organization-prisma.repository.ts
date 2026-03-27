import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationRepository, OrganizationSummary } from '../interfaces/organization.repository.interface';

@Injectable()
export class OrganizationPrismaRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      subscriptionStatus: _subscriptionStatus,
      trialDays: _trialDays,
      trialStartsAt: _trialStartsAt,
      trialEndsAt: _trialEndsAt,
      subscriptionStartsAt: _subscriptionStartsAt,
      subscriptionEndsAt: _subscriptionEndsAt,
      subscriptionNotes: _subscriptionNotes,
      ...rest
    } = payload;
    const billingData = this.resolveBillingFields(payload);
    const data: Prisma.OrganizationUncheckedCreateInput = {
      ...rest,
      ...billingData,
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
    const data: Prisma.OrganizationUncheckedUpdateInput = {
      ...rest,
      ...billingData,
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
      ...organization,
      totalUsers,
      totalAdmins,
      totalStaff,
      totalStudents,
      totalBatches,
      totalFeePlans,
      totalFeeRecords,
      totalAttendanceRecords,
      totalReminderLogs,
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
}
