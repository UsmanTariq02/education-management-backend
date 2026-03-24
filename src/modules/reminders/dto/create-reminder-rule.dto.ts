import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderAutomationTrigger } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReminderRuleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ enum: ReminderAutomationTrigger })
  @IsEnum(ReminderAutomationTrigger)
  trigger!: ReminderAutomationTrigger;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offsetDays = 0;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
