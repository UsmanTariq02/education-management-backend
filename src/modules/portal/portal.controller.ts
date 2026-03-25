import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPortalUser } from '../../common/decorators/current-portal-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';
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
}
