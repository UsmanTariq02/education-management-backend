import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { PortalAuthController } from './portal-auth.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => ({
        secret: configService.get('auth.secret', { infer: true }),
      }),
    }),
  ],
  controllers: [PortalAuthController],
  providers: [PortalAuthService, PortalJwtStrategy],
  exports: [PortalAuthService],
})
export class PortalAuthModule {}
