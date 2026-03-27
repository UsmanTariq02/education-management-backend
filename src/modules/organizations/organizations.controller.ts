import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateOrganizationBillingEntryDto } from './dto/create-organization-billing-entry.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all onboarded organizations' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.organizationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Onboard a new organization' })
  async create(@Body() payload: CreateOrganizationDto, @CurrentUser() actor: CurrentUserContext) {
    return this.organizationsService.create(payload, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateOrganizationDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.organizationsService.update(id, payload, actor);
  }

  @Get(':id/billing-entries')
  @ApiOperation({ summary: 'List organization billing ledger entries' })
  async billingEntries(@Param('id') id: string) {
    return this.organizationsService.listBillingEntries(id);
  }

  @Post(':id/billing-entries')
  @ApiOperation({ summary: 'Create organization billing ledger entry' })
  async createBillingEntry(
    @Param('id') id: string,
    @Body() payload: CreateOrganizationBillingEntryDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.organizationsService.createBillingEntry(id, payload, actor);
  }
}
