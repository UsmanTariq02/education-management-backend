import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { CreateReminderTemplateDto } from './dto/create-reminder-template.dto';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';
import { UpdateReminderTemplateDto } from './dto/update-reminder-template.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { UpsertReminderProviderSettingDto } from './dto/upsert-reminder-provider-setting.dto';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@ApiBearerAuth()
@Controller({ path: 'reminders', version: '1' })
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @Permissions('reminders.create')
  @ApiOperation({ summary: 'Create reminder log entry' })
  async create(@Body() payload: CreateReminderDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.create(payload, actor);
  }

  @Get()
  @Permissions('reminders.read')
  @ApiOperation({ summary: 'List reminder logs' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.findAll(query, actor);
  }

  @Patch(':id')
  @Permissions('reminders.update')
  @ApiOperation({ summary: 'Update reminder log' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateReminderDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.remindersService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('reminders.delete')
  @ApiOperation({ summary: 'Delete reminder log' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.remindersService.delete(id, actor);
    return { deleted: true };
  }

  @Get('templates')
  @Permissions('reminders.read')
  @ApiOperation({ summary: 'List reminder templates' })
  async listTemplates(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.listTemplates(query, actor);
  }

  @Post('templates')
  @Permissions('reminders.create')
  @ApiOperation({ summary: 'Create reminder template' })
  async createTemplate(@Body() payload: CreateReminderTemplateDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.createTemplate(payload, actor);
  }

  @Patch('templates/:id')
  @Permissions('reminders.update')
  @ApiOperation({ summary: 'Update reminder template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() payload: UpdateReminderTemplateDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.remindersService.updateTemplate(id, payload, actor);
  }

  @Post('templates/reset-defaults')
  @Permissions('reminders.update')
  @ApiOperation({ summary: 'Reset organization reminder templates to the default dynamic versions' })
  async resetDefaultTemplates(@CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.resetDefaultTemplates(actor);
  }

  @Get('rules')
  @Permissions('reminders.read')
  @ApiOperation({ summary: 'List reminder automation rules' })
  async listRules(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.listRules(query, actor);
  }

  @Post('rules')
  @Permissions('reminders.create')
  @ApiOperation({ summary: 'Create reminder automation rule' })
  async createRule(@Body() payload: CreateReminderRuleDto, @CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.createRule(payload, actor);
  }

  @Patch('rules/:id')
  @Permissions('reminders.update')
  @ApiOperation({ summary: 'Update reminder automation rule' })
  async updateRule(
    @Param('id') id: string,
    @Body() payload: UpdateReminderRuleDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.remindersService.updateRule(id, payload, actor);
  }

  @Get('provider-settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get reminder provider settings' })
  async getProviderSetting(@CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.getProviderSetting(actor);
  }

  @Patch('provider-settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update reminder provider settings' })
  async upsertProviderSetting(
    @Body() payload: UpsertReminderProviderSettingDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.remindersService.upsertProviderSetting(payload, actor);
  }

  @Post('automation/process-due')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process due automated reminder schedules immediately' })
  async processDueSchedules(@CurrentUser() actor: CurrentUserContext) {
    return this.remindersService.processDueSchedules(actor);
  }
}
