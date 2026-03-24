import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DEFAULT_ORGANIZATION_MODULES, OrganizationModule } from '../../../common/enums/organization-module.enum';

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
