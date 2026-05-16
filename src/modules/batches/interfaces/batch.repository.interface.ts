import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';

export interface BatchView {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  code: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  scheduleInfo: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchRepository {
  create(payload: CreateBatchDto, organizationId: string): Promise<BatchView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<BatchView>>;
  findById(id: string): Promise<BatchView | null>;
  update(id: string, payload: UpdateBatchDto, organizationId?: string): Promise<BatchView>;
  delete(id: string, organizationId?: string): Promise<void>;
  deleteMany(ids: string[], organizationId?: string): Promise<number>;
  updateManyStatus(ids: string[], isActive: boolean, organizationId?: string): Promise<number>;
}
