import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationAssetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationAssetDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: OrganizationAssetType })
  @IsEnum(OrganizationAssetType)
  type!: OrganizationAssetType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
