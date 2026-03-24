import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
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
  async login(@Body() payload: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(payload);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token pair' })
  async refresh(@Body() payload: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(payload);
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
  ): Promise<{ success: boolean }> {
    await this.authService.logout(user.userId, payload);
    return { success: true };
  }
}
