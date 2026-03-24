import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { ActivityLogQueryDto } from '../dto/activity-log-query.dto';
import { ActivityLogResponseDto } from '../dto/activity-log-response.dto';

export interface ActivityLogRepository {
  findMany(query: ActivityLogQueryDto, organizationId?: string): Promise<PaginatedResult<ActivityLogResponseDto>>;
}
