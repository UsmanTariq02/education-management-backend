import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class CreateAcademicSessionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent = false;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
