import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { InquiriesService } from './inquiries.service';
import { UpdateContactInquiryStatusDto } from './dto/update-contact-inquiry-status.dto';

@ApiTags('Inquiries')
@Controller({ path: 'inquiries', version: '1' })
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Public()
  @Post('contact')
  @ApiOperation({ summary: 'Submit a public contact inquiry' })
  async createContactInquiry(@Body() payload: CreateContactInquiryDto) {
    return this.inquiriesService.createContactInquiry(payload);
  }

  @ApiBearerAuth()
  @Get()
  @Roles('SUPER_ADMIN')
  @Permissions('users.read')
  @ApiOperation({ summary: 'List contact inquiries for the super admin console' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.inquiriesService.findAll(query);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update contact inquiry status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateContactInquiryStatusDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.inquiriesService.updateStatus(id, payload.status, actor.userId);
  }
}
