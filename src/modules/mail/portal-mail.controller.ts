import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPortalUser } from '../../common/decorators/current-portal-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { CreateMailMessageDto } from './dto/create-mail-message.dto';
import { MailContactsQueryDto } from './dto/mail-contacts-query.dto';
import { MailQueryDto } from './dto/mail-query.dto';
import { ReplyMailMessageDto } from './dto/reply-mail-message.dto';
import { UpdateMailDraftDto } from './dto/update-mail-draft.dto';
import { MailService } from './mail.service';

@ApiTags('Portal Mail')
@Public()
@UseGuards(PortalJwtAuthGuard)
@ApiBearerAuth()
@Controller({ path: 'portal/mail', version: '1' })
export class PortalMailController {
  constructor(private readonly mailService: MailService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'Search portal mail contacts for the authenticated student or parent account' })
  async contacts(@Query() query: MailContactsQueryDto, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.getContacts(query, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List portal mailbox messages by folder' })
  async list(@Query() query: MailQueryDto, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.listMailbox(query, actor);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a portal mail conversation' })
  async conversation(@Param('conversationId') conversationId: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.getConversation(conversationId, actor);
  }

  @Post()
  @ApiOperation({ summary: 'Create a portal mail draft or send a new message immediately' })
  async create(@Body() payload: CreateMailMessageDto, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.createDraft(payload, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a portal draft message' })
  async update(@Param('id') id: string, @Body() payload: UpdateMailDraftDto, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.updateDraft(id, payload, actor);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send an existing portal draft message' })
  async send(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.sendDraft(id, actor);
  }

  @Post('conversations/:conversationId/reply')
  @ApiOperation({ summary: 'Reply in a portal mail conversation' })
  async reply(
    @Param('conversationId') conversationId: string,
    @Body() payload: ReplyMailMessageDto,
    @CurrentPortalUser() actor: CurrentPortalUserContext,
  ) {
    return this.mailService.reply(conversationId, payload, actor);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a portal mailbox item as read' })
  async read(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.markRead(id, actor);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Star a portal mailbox item' })
  async star(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.toggleStar(id, actor, true);
  }

  @Post(':id/unstar')
  @ApiOperation({ summary: 'Remove star from a portal mailbox item' })
  async unstar(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.toggleStar(id, actor, false);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a portal mailbox item' })
  async archive(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.archive(id, actor);
  }

  @Post(':id/trash')
  @ApiOperation({ summary: 'Move a portal mailbox item to trash' })
  async trash(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.trash(id, actor);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a trashed portal mailbox item' })
  async restore(@Param('id') id: string, @CurrentPortalUser() actor: CurrentPortalUserContext) {
    return this.mailService.restore(id, actor);
  }
}
