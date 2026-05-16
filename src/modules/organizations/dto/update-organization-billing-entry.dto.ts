import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingEntryStatus, BillingEntryType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationBillingEntryDto {
  @ApiPropertyOptional({ enum: BillingEntryType })
  @IsEnum(BillingEntryType)
  @IsOptional()
  type?: BillingEntryType;

  @ApiPropertyOptional({ enum: BillingEntryStatus })
  @IsEnum(BillingEntryStatus)
  @IsOptional()
  status?: BillingEntryStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  entryDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  periodEnd?: string;
}
