import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ReviewAssessmentAttemptDto } from './dto/review-assessment-attempt.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentsService } from './assessments.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'assessments', version: '1' })
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Permissions('assessments.create')
  @ApiOperation({ summary: 'Create assessment' })
  async create(@Body() payload: CreateAssessmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.create(payload, actor);
  }

  @Get()
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'List assessments' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'Get assessment details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findOne(id, actor);
  }

  @Get(':id/review-queue')
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'Get assessment grading queue and attempt review details' })
  async findReviewQueue(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findReviewQueue(id, actor);
  }

  @Get(':id/analytics')
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'Get assessment analytics summary' })
  async findAnalytics(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.findAnalytics(id, actor);
  }

  @Patch(':id')
  @Permissions('assessments.update')
  @ApiOperation({ summary: 'Update assessment' })
  async update(@Param('id') id: string, @Body() payload: UpdateAssessmentDto, @CurrentUser() actor: CurrentUserContext) {
    return this.assessmentsService.update(id, payload, actor);
  }

  @Patch('attempts/:attemptId/review')
  @Permissions('assessments.update')
  @ApiOperation({ summary: 'Review and score subjective answers for an assessment attempt' })
  async reviewAttempt(
    @Param('attemptId') attemptId: string,
    @Body() payload: ReviewAssessmentAttemptDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.assessmentsService.reviewAttempt(attemptId, payload, actor);
  }

  @Delete(':id')
  @Permissions('assessments.delete')
  @ApiOperation({ summary: 'Delete assessment' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.assessmentsService.delete(id, actor);
    return { deleted: true };
  }
}
