import { Attendance } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';

export interface AttendanceRepository {
  create(payload: CreateAttendanceDto, organizationId: string): Promise<Attendance>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<Attendance>>;
  update(id: string, payload: UpdateAttendanceDto, organizationId?: string): Promise<Attendance>;
  delete(id: string, organizationId?: string): Promise<void>;
}
