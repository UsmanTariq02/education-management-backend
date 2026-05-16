import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../common/decorators/module-access.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateMailMessageDto } from './dto/create-mail-message.dto';
import { MailContactsQueryDto } from './dto/mail-contacts-query.dto';
import { MailQueryDto } from './dto/mail-query.dto';
import { ReplyMailMessageDto } from './dto/reply-mail-message.dto';
import { UpdateMailDraftDto } from './dto/update-mail-draft.dto';
import { MailService } from './mail.service';

@ApiTags('Mail')
@ApiBearerAuth()
@ModuleAccess(OrganizationModule.MAIL)
@Controller({ path: 'mail', version: '1' })
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('contacts')
  @Permissions('mail.read')
  @ApiOperation({ summary: 'Search mail contacts for the authenticated workspace' })
  async contacts(@Query() query: MailContactsQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.getContacts(query, actor);
  }

  @Get()
  @Permissions('mail.read')
  @ApiOperation({ summary: 'List mailbox messages by folder' })
  async list(@Query() query: MailQueryDto, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.listMailbox(query, actor, organizationId);
  }

  @Get('conversations/:conversationId')
  @Permissions('mail.read')
  @ApiOperation({ summary: 'Get a conversation with all mail messages' })
  async conversation(
    @Param('conversationId') conversationId: string,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mailService.getConversation(conversationId, actor, organizationId);
  }

  @Post()
  @Permissions('mail.create')
  @ApiOperation({ summary: 'Create a mail draft or send a new message immediately' })
  async create(
    @Body() payload: CreateMailMessageDto,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mailService.createDraft(payload, actor, organizationId ?? payload.organizationId);
  }

  @Patch(':id')
  @Permissions('mail.update')
  @ApiOperation({ summary: 'Update an existing draft message' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateMailDraftDto,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mailService.updateDraft(id, payload, actor, organizationId ?? payload.organizationId);
  }

  @Post(':id/send')
  @Permissions('mail.update')
  @ApiOperation({ summary: 'Send an existing draft message' })
  async send(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mailService.sendDraft(id, actor, organizationId);
  }

  @Post('conversations/:conversationId/reply')
  @Permissions('mail.create')
  @ApiOperation({ summary: 'Reply in an existing conversation' })
  async reply(
    @Param('conversationId') conversationId: string,
    @Body() payload: ReplyMailMessageDto,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.mailService.reply(conversationId, payload, actor, organizationId ?? payload.organizationId);
  }

  @Post(':id/read')
  @Permissions('mail.read')
  @ApiOperation({ summary: 'Mark a mailbox item as read' })
  async read(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.markRead(id, actor, organizationId);
  }

  @Post(':id/star')
  @Permissions('mail.read')
  @ApiOperation({ summary: 'Star a mailbox item' })
  async star(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.toggleStar(id, actor, true, organizationId);
  }

  @Post(':id/unstar')
  @Permissions('mail.read')
  @ApiOperation({ summary: 'Remove star from a mailbox item' })
  async unstar(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.toggleStar(id, actor, false, organizationId);
  }

  @Post(':id/archive')
  @Permissions('mail.update')
  @ApiOperation({ summary: 'Archive a mailbox item' })
  async archive(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.archive(id, actor, organizationId);
  }

  @Post(':id/trash')
  @Permissions('mail.update')
  @ApiOperation({ summary: 'Move a mailbox item to trash' })
  async trash(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.trash(id, actor, organizationId);
  }

  @Post(':id/restore')
  @Permissions('mail.update')
  @ApiOperation({ summary: 'Restore a trashed mailbox item' })
  async restore(@Param('id') id: string, @Query('organizationId') organizationId: string | undefined, @CurrentUser() actor: CurrentUserContext) {
    return this.mailService.restore(id, actor, organizationId);
  }
}
