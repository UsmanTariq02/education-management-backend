import { Organization } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

export type OrganizationSummary = Organization & {
  totalUsers: number;
  totalAdmins: number;
  totalStaff: number;
  totalStudents: number;
  totalBatches: number;
  totalFeePlans: number;
  totalFeeRecords: number;
  totalAttendanceRecords: number;
  totalReminderLogs: number;
};

export interface OrganizationRepository {
  findMany(query: PaginationQueryDto): Promise<PaginatedResult<OrganizationSummary>>;
  findById(id: string): Promise<OrganizationSummary | null>;
  create(payload: CreateOrganizationDto): Promise<OrganizationSummary>;
  update(id: string, payload: UpdateOrganizationDto): Promise<OrganizationSummary>;
}
