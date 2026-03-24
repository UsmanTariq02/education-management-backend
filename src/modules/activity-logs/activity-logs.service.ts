import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_LOG_REPOSITORY } from '../../common/constants/injection-tokens';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import { ActivityLogRepository } from './interfaces/activity-log.repository.interface';

@Injectable()
export class ActivityLogsService {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async findAll(query: ActivityLogQueryDto, actor: CurrentUserContext): Promise<PaginatedResult<ActivityLogResponseDto>> {
    return this.activityLogRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor),
    );
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new ForbiddenException('Organization scope is required for activity log access');
    }

    return actor.organizationId;
  }
}
