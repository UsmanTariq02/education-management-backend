import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';

const onlineClassProviders = ['GOOGLE_MEET', 'ZOOM'] as const;

export class UpsertOnlineClassProviderSettingDto {
  @ApiPropertyOptional({ enum: onlineClassProviders })
  @IsEnum(onlineClassProviders)
  @IsOptional()
  provider?: (typeof onlineClassProviders)[number];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  integrationEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoCreateMeetLinks?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoSyncParticipants?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(0, 255)
  calendarId?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  impersonatedUserEmail?: string;
}
