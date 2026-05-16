import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AttendanceService } from './attendance.service';
import { BulkCreateAttendanceDto } from './dto/bulk-create-attendance.dto';
import { BulkUpdateAttendanceStatusDto } from './dto/bulk-update-attendance-status.dto';
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

  @Post('bulk-create')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Create attendance entries in bulk' })
  async bulkCreate(@Body() payload: BulkCreateAttendanceDto, @CurrentUser() actor: CurrentUserContext): Promise<{ createdCount: number }> {
    return this.attendanceService.bulkCreate(payload, actor);
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

  @Post('bulk-delete')
  @Permissions('attendance.delete')
  @ApiOperation({ summary: 'Delete attendance records in bulk' })
  async bulkDelete(@Body() payload: BulkDeleteDto, @CurrentUser() actor: CurrentUserContext): Promise<{ deletedCount: number }> {
    return this.attendanceService.bulkDelete(payload.ids, actor);
  }

  @Post('bulk-status')
  @Permissions('attendance.update')
  @ApiOperation({ summary: 'Update attendance status in bulk' })
  async bulkUpdateStatus(
    @Body() payload: BulkUpdateAttendanceStatusDto,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<{ updatedCount: number; status: string }> {
    return this.attendanceService.bulkUpdateStatus(payload, actor);
  }

  @Post('automation/process-follow-ups')
  @Permissions('attendance.update')
  @ApiOperation({ summary: 'Run attendance follow-up automation immediately' })
  async processFollowUps(@CurrentUser() actor: CurrentUserContext) {
    return this.attendanceService.processFollowUps(actor);
  }
}
