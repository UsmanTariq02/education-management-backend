import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ATTENDANCE)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Create attendance entry' })
  async create(@Body() payload: CreateAttendanceDto, @CurrentUser() actor: CurrentUserContext) {
    return this.attendanceService.create(payload, actor);
  }

  @Get()
  @Permissions('attendance.read')
  @ApiOperation({ summary: 'List attendance records' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.attendanceService.findAll(query, actor);
  }

  @Patch(':id')
  @Permissions('attendance.update')
  @ApiOperation({ summary: 'Update attendance entry' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateAttendanceDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.attendanceService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('attendance.delete')
  @ApiOperation({ summary: 'Delete attendance entry' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.attendanceService.delete(id, actor);
    return { deleted: true };
  }
}
