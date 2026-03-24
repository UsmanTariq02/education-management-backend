import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACTIVITY_LOGS)
@Controller({ path: 'activity-logs', version: '1' })
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Permissions('activity-logs.read')
  @ApiOperation({ summary: 'List activity logs with pagination and filters' })
  async findAll(@Query() query: ActivityLogQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.activityLogsService.findAll(query, actor);
  }
}
