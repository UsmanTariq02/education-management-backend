import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateOnlineClassSessionDto } from './dto/create-online-class-session.dto';
import { UpsertOnlineClassProviderSettingDto } from './dto/upsert-online-class-provider-setting.dto';
import { UpdateOnlineClassSessionDto } from './dto/update-online-class-session.dto';
import { UpsertOnlineClassParticipantsDto } from './dto/upsert-online-class-participants.dto';
import { OnlineClassesService } from './online-classes.service';

@ApiTags('Online Classes')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.ACADEMICS)
@Controller({ path: 'online-classes', version: '1' })
export class OnlineClassesController {
  constructor(private readonly onlineClassesService: OnlineClassesService) {}

  @Get('provider-settings')
  @Permissions('online-classes.read')
  @ApiOperation({ summary: 'Get online class provider settings for the current organization' })
  async providerSettings(@CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.getProviderSetting(actor);
  }

  @Patch('provider-settings')
  @Permissions('online-classes.update')
  @ApiOperation({ summary: 'Update online class provider settings for the current organization' })
  async upsertProviderSettings(
    @Body() payload: UpsertOnlineClassProviderSettingDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.onlineClassesService.upsertProviderSetting(payload, actor);
  }

  @Get('automation/summary')
  @Permissions('online-classes.read')
  @ApiOperation({ summary: 'Get online class automation health summary and recent runs' })
  async automationSummary(@CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.getAutomationSummary(actor);
  }

  @Get('alerts')
  @Permissions('online-classes.read')
  @ApiOperation({ summary: 'Get current online class alerts for sync failures, pending attendance, and upcoming classes' })
  async alerts(@CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.getAlerts(actor);
  }

  @Get('sessions')
  @Permissions('online-classes.read')
  @ApiOperation({ summary: 'List scheduled online class sessions' })
  async list(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.findAll(query, actor);
  }

  @Get('sessions/:id')
  @Permissions('online-classes.read')
  @ApiOperation({ summary: 'Get online class session detail' })
  async detail(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.findOne(id, actor);
  }

  @Post('sessions')
  @Permissions('online-classes.create')
  @ApiOperation({ summary: 'Create one scheduled online class session from a timetable entry' })
  async create(@Body() payload: CreateOnlineClassSessionDto, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.create(payload, actor);
  }

  @Patch('sessions/:id')
  @Permissions('online-classes.update')
  @ApiOperation({ summary: 'Update scheduled online class session state and meeting metadata' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateOnlineClassSessionDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.onlineClassesService.update(id, payload, actor);
  }

  @Post('sessions/:id/participants')
  @Permissions('online-classes.sync')
  @ApiOperation({ summary: 'Upsert participant sessions for an online class session' })
  async participants(
    @Param('id') id: string,
    @Body() payload: UpsertOnlineClassParticipantsDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.onlineClassesService.addParticipants(id, payload, actor);
  }

  @Post('sessions/:id/google-meet')
  @Permissions('online-classes.update')
  @ApiOperation({ summary: 'Generate a Google Meet link for a scheduled online class session' })
  async generateMeetLink(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.createMeetLink(id, actor);
  }

  @Post('sessions/:id/google-meet/sync')
  @Permissions('online-classes.sync')
  @ApiOperation({ summary: 'Sync Google Meet participants into the online class session' })
  async syncGoogleMeetParticipants(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.syncParticipantsFromGoogle(id, actor);
  }

  @Post('sessions/:id/process-attendance')
  @Permissions('online-classes.attendance')
  @ApiOperation({ summary: 'Process attendance from participant sessions for a scheduled online class' })
  async processAttendance(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.onlineClassesService.processAttendance(id, actor);
  }

  @Post('automation/run')
  @Permissions('online-classes.sync')
  @ApiOperation({ summary: 'Run online class automation cycle immediately' })
  async runAutomation(@CurrentUser() actor: CurrentUserContext) {
    void actor;
    return this.onlineClassesService.runAutomationCycle();
  }
}
