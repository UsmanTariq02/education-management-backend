import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

const onlineClassSessionStatuses = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] as const;

export class UpdateOnlineClassSessionDto {
  @ApiPropertyOptional({ enum: onlineClassSessionStatuses })
  @IsEnum(onlineClassSessionStatuses)
  @IsOptional()
  status?: (typeof onlineClassSessionStatuses)[number];

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  actualStartAt?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  actualEndAt?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  meetingCode?: string;
}
