import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingEntryStatus, BillingEntryType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationBillingEntryDto {
  @ApiProperty({ enum: BillingEntryType })
  @IsEnum(BillingEntryType)
  type!: BillingEntryType;

  @ApiPropertyOptional({ enum: BillingEntryStatus, default: BillingEntryStatus.OPEN })
  @IsEnum(BillingEntryStatus)
  @IsOptional()
  status: BillingEntryStatus = BillingEntryStatus.OPEN;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  amount!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency = 'USD';

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
