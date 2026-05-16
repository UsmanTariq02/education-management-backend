import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MailRecipientType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class MailRecipientDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: MailRecipientType, default: MailRecipientType.TO })
  @IsEnum(MailRecipientType)
  @IsOptional()
  recipientType?: MailRecipientType = MailRecipientType.TO;
}
