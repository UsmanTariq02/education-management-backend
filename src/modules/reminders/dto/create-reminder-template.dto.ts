import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderChannel, ReminderRecipientTarget } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateReminderTemplateDto {
  @ApiProperty()
  @IsString()
  @Length(2, 150)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  code!: string;

  @ApiProperty({ enum: ReminderChannel })
  @IsEnum(ReminderChannel)
  channel!: ReminderChannel;

  @ApiProperty({ enum: ReminderRecipientTarget, default: ReminderRecipientTarget.GUARDIAN })
  @IsEnum(ReminderRecipientTarget)
  target: ReminderRecipientTarget = ReminderRecipientTarget.GUARDIAN;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(0, 255)
  subject?: string;

  @ApiProperty({
    description:
      'Supports placeholders like {{studentName}}, {{guardianName}}, {{dueAmount}}, {{balance}}, {{dueDate}}, {{organizationName}}, {{month}}, {{year}}',
  })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
