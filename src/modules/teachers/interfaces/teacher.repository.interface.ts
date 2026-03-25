import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';

export interface TeacherView {
  id: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string;
  qualification: string | null;
  specialization: string | null;
  joinedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherRepository {
  create(payload: CreateTeacherDto, organizationId: string): Promise<TeacherView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<TeacherView>>;
  findById(id: string): Promise<TeacherView | null>;
  update(id: string, payload: UpdateTeacherDto, organizationId?: string): Promise<TeacherView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
