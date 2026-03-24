import { FeePlan, FeeRecord } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateFeePlanDto } from '../dto/create-fee-plan.dto';
import { CreateFeeRecordDto } from '../dto/create-fee-record.dto';
import { UpdateFeeRecordDto } from '../dto/update-fee-record.dto';

export interface FeeRepository {
  createPlan(payload: CreateFeePlanDto, organizationId: string): Promise<FeePlan>;
  listPlans(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<FeePlan>>;
  createRecord(payload: CreateFeeRecordDto, organizationId: string): Promise<FeeRecord>;
  listRecords(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<FeeRecord>>;
  updateRecord(id: string, payload: UpdateFeeRecordDto, organizationId?: string): Promise<FeeRecord>;
  deleteRecord(id: string, organizationId?: string): Promise<void>;
}
