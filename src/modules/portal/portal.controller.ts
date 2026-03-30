import { Body, Controller, Get, Param, ParseFilePipe, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentPortalUser } from '../../common/decorators/current-portal-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { AcknowledgePortalItemDto, PortalAcknowledgementItemDto } from './dto/portal-acknowledgements.dto';
import { PortalAnnouncementDto } from './dto/portal-announcements.dto';
import {
  PortalAssessmentDetailDto,
  PortalAssessmentListItemDto,
  PortalAssessmentSubmitResultDto,
  PortalAssessmentAttemptDto,
  SavePortalAssessmentAttemptDto,
} from './dto/portal-assessments.dto';
import { PortalActivityFeedItemDto } from './dto/portal-activity-feed.dto';
import { PortalAssignmentDetailDto, PortalAssignmentListItemDto, PortalAssignmentSubmissionDto } from './dto/portal-assignments.dto';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';
import { PortalDocumentDto } from './dto/portal-documents.dto';
import { CreatePortalFeePaymentProofDto } from './dto/create-portal-fee-payment-proof.dto';
import { PortalFeePaymentProofDto, PortalFeeRecordDto } from './dto/portal-fees.dto';
import { PortalReportCardDto } from './dto/portal-report-card.dto';
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

  @Get('report-card')
  @ApiOperation({ summary: 'Get unified portal report card for the authenticated student or parent account' })
  async getReportCard(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalReportCardDto> {
    return this.portalService.getReportCard(actor);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Get portal notifications and academic activity timeline for the authenticated student or parent account' })
  async getActivityFeed(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalActivityFeedItemDto[]> {
    return this.portalService.getActivityFeed(actor);
  }

  @Get('acknowledgements')
  @ApiOperation({ summary: 'Get items that require or record guardian acknowledgement' })
  async getAcknowledgements(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalAcknowledgementItemDto[]> {
    return this.portalService.getAcknowledgements(actor);
  }

  @Post('acknowledgements/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a portal item for the authenticated student or parent account' })
  async acknowledgeItem(
    @Body() payload: AcknowledgePortalItemDto,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalAcknowledgementItemDto> {
    return this.portalService.acknowledgeItem(payload, actor);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List uploaded and generated documents available in the portal' })
  async getDocuments(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalDocumentDto[]> {
    return this.portalService.getDocuments(actor);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Get published portal announcements for the authenticated student or parent account' })
  async getAnnouncements(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalAnnouncementDto[]> {
    return this.portalService.getAnnouncements(actor);
  }

  @Get('fees')
  @ApiOperation({ summary: 'Get fee records and submitted payment proofs for the authenticated student or parent account' })
  async getFees(@CurrentPortalUser() actor: CurrentPortalUserContext): Promise<PortalFeeRecordDto[]> {
    return this.portalService.getFees(actor);
  }

  @Post('fees/:feeRecordId/payment-proofs')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload a payment proof from the portal' })
  async uploadPaymentProof(
    @Param('feeRecordId') feeRecordId: string,
    @Body() payload: CreatePortalFeePaymentProofDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ): Promise<PortalFeePaymentProofDto> {
    return this.portalService.uploadPaymentProof(feeRecordId, payload, file, actor);
  }

  @Get('fee-proofs/:proofId/download')
  @ApiOperation({ summary: 'Download a portal payment proof file' })
  async downloadPaymentProof(
    @Param('proofId') proofId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.portalService.getPaymentProofDownload(proofId, actor);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    file.stream.pipe(response);
  }

  @Get('documents/:documentId/download')
  @ApiOperation({ summary: 'Download a portal document or generated academic file' })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.portalService.getDocumentDownload(documentId, actor);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    file.stream.pipe(response);
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
