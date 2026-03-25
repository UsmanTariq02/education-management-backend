import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';

export interface AcademicSessionView {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  code: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicSessionRepository {
  create(payload: CreateAcademicSessionDto, organizationId: string): Promise<AcademicSessionView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AcademicSessionView>>;
  findById(id: string): Promise<AcademicSessionView | null>;
  update(id: string, payload: UpdateAcademicSessionDto, organizationId?: string): Promise<AcademicSessionView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
