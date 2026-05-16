import { Body, Controller, Get, Query, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { GenerateNoticeDto } from './dto/generate-notice.dto';
import { GenerateMailDraftDto } from './dto/generate-mail-draft.dto';
import { GenerateSupportReplyDto } from './dto/generate-support-reply.dto';
import { ExtractAdmissionFormDto } from './dto/extract-admission-form.dto';
import { GenerateStudentRiskRecommendationDto } from './dto/generate-student-risk-recommendation.dto';
import { GenerateFeeCollectionPlanDto } from './dto/generate-fee-collection-plan.dto';
import { GenerateAttendanceInterventionDto } from './dto/generate-attendance-intervention.dto';
import { GenerateReminderDraftDto } from './dto/generate-reminder-draft.dto';
import { ScheduleNoticeCampaignDto } from './dto/schedule-notice-campaign.dto';
import { SaveAiReviewQueueDto } from './dto/save-ai-review-queue.dto';
import {
  AiService,
  type AiUsageSummary,
  type AiOrganizationQueueSummary,
  type AiOrganizationQueueTrendPoint,
  type NoticeCampaignAnalytics,
  type NoticeCampaignSummary,
  type AnnouncementDeliveryAnalytics,
  type AiReviewQueueItem,
  type AiReviewQueueSummary,
} from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('notices/generate')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a school notice draft' })
  async generateNotice(@Body() payload: GenerateNoticeDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.generateNotice(actor, payload);
  }

  @Post('mail-draft/generate')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a mail reply draft' })
  async generateMailDraft(@Body() payload: GenerateMailDraftDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.generateMailDraft(actor, payload);
  }

  @Post('support/reply')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a support reply' })
  async generateSupportReply(@Body() payload: GenerateSupportReplyDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.generateSupportReply(actor, payload);
  }

  @Post('admissions/extract')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Extract a student admission form into structured data' })
  async extractAdmissionForm(@Body() payload: ExtractAdmissionFormDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.extractAdmissionForm(actor, payload);
  }

  @Post('students/risk-recommendation')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a student risk recommendation' })
  async generateStudentRiskRecommendation(
    @Body() payload: GenerateStudentRiskRecommendationDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.aiService.generateStudentRiskRecommendation(actor, payload);
  }

  @Post('fees/collection-plan')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a fee collection plan' })
  async generateFeeCollectionPlan(@Body() payload: GenerateFeeCollectionPlanDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.generateFeeCollectionPlan(actor, payload);
  }

  @Post('attendance/intervention')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate an attendance intervention plan' })
  async generateAttendanceIntervention(
    @Body() payload: GenerateAttendanceInterventionDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.aiService.generateAttendanceIntervention(actor, payload);
  }

  @Post('reminders/draft')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Generate a reminder draft from operational context' })
  async generateReminderDraft(@Body() payload: GenerateReminderDraftDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.generateReminderDraft(actor, payload);
  }

  @Get('notices/campaigns')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'List AI notice campaigns for the current organization' })
  async listNoticeCampaigns(@CurrentUser() actor: CurrentUserContext, @Query('organizationId') organizationId?: string): Promise<NoticeCampaignSummary[]> {
    return this.aiService.listNoticeCampaigns(actor, organizationId);
  }

  @Get('notices/analytics')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get AI notice campaign analytics for the current organization' })
  async getNoticeCampaignAnalytics(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
  ): Promise<NoticeCampaignAnalytics> {
    return this.aiService.getNoticeCampaignAnalytics(actor, organizationId);
  }

  @Get('notices/delivery-analytics')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get AI announcement delivery analytics for the current organization' })
  async getAnnouncementDeliveryAnalytics(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
  ): Promise<AnnouncementDeliveryAnalytics> {
    return this.aiService.getAnnouncementDeliveryAnalytics(actor, organizationId);
  }

  @Get('review-queue')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get the AI review queue for the current user and organization' })
  async listReviewQueue(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
    @Query('userId') userId?: string,
  ): Promise<AiReviewQueueItem[]> {
    return this.aiService.listReviewQueue(actor, organizationId, userId);
  }

  @Post('review-queue')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Replace the AI review queue for the current user and organization' })
  async saveReviewQueue(
    @Body() payload: SaveAiReviewQueueDto,
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
  ): Promise<AiReviewQueueItem[]> {
    return this.aiService.saveReviewQueue(actor, payload, organizationId);
  }

  @Get('review-queue/summary')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get the AI review queue summary for the current user and organization' })
  async getReviewQueueSummary(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
    @Query('userId') userId?: string,
  ): Promise<AiReviewQueueSummary> {
    return this.aiService.getReviewQueueSummary(actor, organizationId, userId);
  }

  @Get('review-queue/organization-summary')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get the AI review queue summary for the current organization' })
  async getOrganizationQueueSummary(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
  ): Promise<AiOrganizationQueueSummary> {
    return this.aiService.getOrganizationQueueSummary(actor, organizationId);
  }

  @Get('review-queue/organization-trend')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get the AI review queue trend for the current organization' })
  async getOrganizationQueueTrend(
    @CurrentUser() actor: CurrentUserContext,
    @Query('organizationId') organizationId?: string,
  ): Promise<AiOrganizationQueueTrendPoint[]> {
    return this.aiService.getOrganizationQueueTrend(actor, organizationId);
  }

  @Post('notices/schedule')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Schedule or publish a notice campaign' })
  async scheduleNoticeCampaign(@Body() payload: ScheduleNoticeCampaignDto, @CurrentUser() actor: CurrentUserContext) {
    return this.aiService.scheduleNoticeCampaign(actor, payload);
  }

  @Get('usage')
  @Permissions('ai.use')
  @ApiOperation({ summary: 'Get AI usage analytics for the current organization' })
  async getUsageSummary(@CurrentUser() actor: CurrentUserContext, @Query('organizationId') organizationId?: string): Promise<AiUsageSummary> {
    return this.aiService.getUsageSummary(actor, organizationId);
  }
}
