import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organization Settings')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller({ path: 'organization-settings', version: '1' })
export class OrganizationSettingsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get the current tenant organization settings' })
  async getCurrent(@CurrentUser() actor: CurrentUserContext) {
    return this.organizationsService.getCurrent(actor);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update the current tenant organization settings' })
  async updateCurrent(@Body() payload: UpdateOrganizationDto, @CurrentUser() actor: CurrentUserContext) {
    return this.organizationsService.updateCurrent(payload, actor);
  }
}
