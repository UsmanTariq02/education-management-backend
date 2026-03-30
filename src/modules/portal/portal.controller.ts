import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPortalUser } from '../../common/decorators/current-portal-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import {
  PortalAssessmentDetailDto,
  PortalAssessmentListItemDto,
  PortalAssessmentSubmitResultDto,
  PortalAssessmentAttemptDto,
  SavePortalAssessmentAttemptDto,
} from './dto/portal-assessments.dto';
import { PortalAssignmentDetailDto, PortalAssignmentListItemDto, PortalAssignmentSubmissionDto } from './dto/portal-assignments.dto';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';
import { UpsertPortalAssignmentSubmissionDto } from '../assignments/dto/create-assignment.dto';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@Public()
@UseGuards(PortalJwtAuthGuard)
@ApiBearerAuth()
@Controller({ path: 'portal', version: '1' })
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get portal dashboard for the authenticated student or parent account' })
  async getDashboard(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalDashboardDto> {
    return this.portalService.getDashboard(actor);
  }

  @Get('assessments')
  @ApiOperation({ summary: 'List portal assessments for the authenticated student or parent account' })
  async getAssessments(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalAssessmentListItemDto[]> {
    return this.portalService.getAssessments(actor);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'List portal assignments for the authenticated student or parent account' })
  async getAssignments(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalAssignmentListItemDto[]> {
    return this.portalService.getAssignments(actor);
  }

  @Get('assignments/:assignmentId')
  @ApiOperation({ summary: 'Get a portal assignment detail view' })
  async getAssignmentDetail(
    @Param('assignmentId') assignmentId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssignmentDetailDto> {
    return this.portalService.getAssignmentDetail(assignmentId, actor);
  }

  @Put('assignments/:assignmentId/submission')
  @ApiOperation({ summary: 'Save a portal assignment draft submission' })
  async saveAssignmentSubmission(
    @Param('assignmentId') assignmentId: string,
    @Body() payload: UpsertPortalAssignmentSubmissionDto,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssignmentSubmissionDto> {
    return this.portalService.saveAssignmentSubmission(assignmentId, payload, actor);
  }

  @Post('assignments/:assignmentId/submit')
  @ApiOperation({ summary: 'Submit a portal assignment' })
  async submitAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() payload: UpsertPortalAssignmentSubmissionDto,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssignmentSubmissionDto> {
    return this.portalService.submitAssignment(assignmentId, payload, actor);
  }

  @Get('assessments/:assessmentId')
  @ApiOperation({ summary: 'Get a portal assessment detail view' })
  async getAssessmentDetail(
    @Param('assessmentId') assessmentId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssessmentDetailDto> {
    return this.portalService.getAssessmentDetail(assessmentId, actor);
  }

  @Post('assessments/:assessmentId/start')
  @ApiOperation({ summary: 'Start or resume a student assessment attempt' })
  async startAssessment(
    @Param('assessmentId') assessmentId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssessmentAttemptDto> {
    return this.portalService.startAssessment(assessmentId, actor);
  }

  @Put('assessments/attempts/:attemptId/answers')
  @ApiOperation({ summary: 'Save portal assessment answers for an in-progress attempt' })
  async saveAssessmentAnswers(
    @Param('attemptId') attemptId: string,
    @Body() payload: SavePortalAssessmentAttemptDto,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssessmentAttemptDto> {
    return this.portalService.saveAssessmentAnswers(attemptId, payload, actor);
  }

  @Post('assessments/attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit a portal assessment attempt and auto-grade objective questions' })
  async submitAssessment(
    @Param('attemptId') attemptId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAssessmentSubmitResultDto> {
    return this.portalService.submitAssessment(attemptId, actor);
  }
}
