import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPortalUser } from '../../common/decorators/current-portal-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PortalAuthResponseDto, PortalAuthUserDto } from './dto/portal-auth-response.dto';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalRefreshTokenDto } from './dto/portal-refresh-token.dto';
import { PortalAuthService } from './portal-auth.service';

@ApiTags('Portal Auth')
@Controller({ path: 'portal-auth', version: '1' })
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login for student or parent portal' })
  async login(@Body() payload: PortalLoginDto): Promise<PortalAuthResponseDto> {
    return this.portalAuthService.login(payload);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh portal access token pair' })
  async refresh(@Body() payload: PortalRefreshTokenDto): Promise<PortalAuthResponseDto> {
    return this.portalAuthService.refreshTokens(payload);
  }

  @Public()
  @UseGuards(PortalJwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current portal account profile' })
  async me(@CurrentPortalUser() user: CurrentPortalUserContext): Promise<PortalAuthUserDto> {
    return this.portalAuthService.me(user.accountId);
  }

  @Public()
  @UseGuards(PortalJwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout portal account' })
  async logout(@CurrentPortalUser() user: CurrentPortalUserContext): Promise<{ success: boolean }> {
    await this.portalAuthService.logout(user.accountId);
    return { success: true };
  }
}
