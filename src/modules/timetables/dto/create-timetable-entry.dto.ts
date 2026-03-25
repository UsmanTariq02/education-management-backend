import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TimetableDayOfWeek } from '@prisma/client';

const classDeliveryModes = ['OFFLINE', 'ONLINE', 'HYBRID'] as const;
const onlineClassProviders = ['GOOGLE_MEET', 'ZOOM'] as const;

export class CreateTimetableEntryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicSessionId?: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ enum: TimetableDayOfWeek })
  @IsEnum(TimetableDayOfWeek)
  dayOfWeek!: TimetableDayOfWeek;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '08:45' })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ enum: classDeliveryModes, default: 'OFFLINE' })
  @IsEnum(classDeliveryModes)
  @IsOptional()
  deliveryMode: (typeof classDeliveryModes)[number] = 'OFFLINE';

  @ApiPropertyOptional({ enum: onlineClassProviders })
  @IsEnum(onlineClassProviders)
  @IsOptional()
  onlineClassProvider?: (typeof onlineClassProviders)[number];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  onlineMeetingUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  onlineMeetingCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalCalendarEventId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoAttendanceEnabled = false;

  @ApiPropertyOptional({ default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  attendanceJoinThresholdMinutes?: number = 5;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
