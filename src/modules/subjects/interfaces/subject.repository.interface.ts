import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';

export interface SubjectView {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectRepository {
  create(payload: CreateSubjectDto, organizationId: string): Promise<SubjectView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<SubjectView>>;
  findById(id: string): Promise<SubjectView | null>;
  update(id: string, payload: UpdateSubjectDto, organizationId?: string): Promise<SubjectView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
