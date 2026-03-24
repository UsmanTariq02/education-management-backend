import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpsertReminderProviderSettingDto {
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  autoRemindersEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  paymentConfirmationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(0, 150)
  senderName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  replyToEmail?: string;
}
