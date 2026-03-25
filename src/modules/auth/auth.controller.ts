import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { AuthSecuritySummaryDto } from './dto/auth-security-summary.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() payload: LoginDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authService.login(payload, request);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token pair' })
  async refresh(@Body() payload: RefreshTokenDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(payload, request);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async me(@CurrentUser() user: CurrentUserContext): Promise<AuthUserDto> {
    return this.authService.me(user.userId);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke active refresh sessions' })
  async logout(
    @CurrentUser() user: CurrentUserContext,
    @Body() payload: LogoutDto,
    @Req() request: Request,
  ): Promise<{ success: boolean }> {
    await this.authService.logout(user.userId, payload, request);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('security')
  @ApiOperation({ summary: 'Get current user security sessions and recent auth events' })
  async security(@CurrentUser() user: CurrentUserContext): Promise<AuthSecuritySummaryDto> {
    return this.authService.getSecuritySummary(user.userId);
  }

  @ApiBearerAuth()
  @Post('sessions/:sessionId/revoke')
  @ApiOperation({ summary: 'Revoke one active refresh session for the current user' })
  async revokeSession(
    @CurrentUser() user: CurrentUserContext,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<{ success: boolean }> {
    await this.authService.revokeSession(user.userId, sessionId, request);
    return { success: true };
  }
}
