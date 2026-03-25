import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { BatchSubjectAssignmentsService } from './batch-subject-assignments.service';
import { CreateBatchSubjectAssignmentDto } from './dto/create-batch-subject-assignment.dto';
import { UpdateBatchSubjectAssignmentDto } from './dto/update-batch-subject-assignment.dto';

@ApiTags('Batch Subject Assignments')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'batch-subject-assignments', version: '1' })
export class BatchSubjectAssignmentsController {
  constructor(private readonly service: BatchSubjectAssignmentsService) {}

  @Post()
  @Permissions('batch-subject-assignments.create')
  @ApiOperation({ summary: 'Create batch subject assignment' })
  async create(@Body() payload: CreateBatchSubjectAssignmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.service.create(payload, actor);
  }

  @Get()
  @Permissions('batch-subject-assignments.read')
  @ApiOperation({ summary: 'List batch subject assignments' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.service.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('batch-subject-assignments.read')
  @ApiOperation({ summary: 'Get batch subject assignment details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.service.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('batch-subject-assignments.update')
  @ApiOperation({ summary: 'Update batch subject assignment' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateBatchSubjectAssignmentDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.service.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('batch-subject-assignments.delete')
  @ApiOperation({ summary: 'Delete batch subject assignment' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.service.delete(id, actor);
    return { deleted: true };
  }
}
