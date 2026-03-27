import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DEFAULT_ORGANIZATION_MODULES, OrganizationModule } from '../../../common/enums/organization-module.enum';
import { SubscriptionStatus } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;

  @ApiPropertyOptional({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus = SubscriptionStatus.TRIAL;

  @ApiPropertyOptional({ default: 14 })
  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays = 14;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialStartsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  subscriptionStartsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  subscriptionEndsAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subscriptionNotes?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  userLimit = 10;

  @ApiPropertyOptional({ default: 500 })
  @IsInt()
  @Min(1)
  @IsOptional()
  studentLimit = 500;

  @ApiPropertyOptional({ enum: OrganizationModule, isArray: true })
  @IsArray()
  @IsEnum(OrganizationModule, { each: true })
  @IsOptional()
  enabledModules: OrganizationModule[] = [...DEFAULT_ORGANIZATION_MODULES];
}
