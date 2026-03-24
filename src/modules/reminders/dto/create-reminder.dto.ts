import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReminderDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  feeRecordId?: string;

  @ApiProperty({ enum: ReminderChannel })
  @IsEnum(ReminderChannel)
  channel!: ReminderChannel;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ enum: ReminderStatus, default: ReminderStatus.SENT })
  @IsEnum(ReminderStatus)
  @IsOptional()
  status: ReminderStatus = ReminderStatus.SENT;
}
