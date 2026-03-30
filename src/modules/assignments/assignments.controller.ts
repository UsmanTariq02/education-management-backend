import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAssignmentSubmissionDto } from './dto/review-assignment-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@ApiTags('Assignments')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'assignments', version: '1' })
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Permissions('assignments.create')
  @ApiOperation({ summary: 'Create assignment' })
  async create(@Body() payload: CreateAssignmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assignmentsService.create(payload, actor);
  }

  @Get()
  @Permissions('assignments.read')
  @ApiOperation({ summary: 'List assignments' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assignmentsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('assignments.read')
  @ApiOperation({ summary: 'Get assignment details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.assignmentsService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('assignments.update')
  @ApiOperation({ summary: 'Update assignment' })
  async update(@Param('id') id: string, @Body() payload: UpdateAssignmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assignmentsService.update(id, payload, actor);
  }

  @Patch('submissions/:submissionId/review')
  @Permissions('assignments.update')
  @ApiOperation({ summary: 'Review assignment submission' })
  async reviewSubmission(
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewAssignmentSubmissionDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.assignmentsService.reviewSubmission(submissionId, payload, actor);
  }

  @Delete(':id')
  @Permissions('assignments.delete')
  @ApiOperation({ summary: 'Delete assignment' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.assignmentsService.delete(id, actor);
    return { deleted: true };
  }
}
