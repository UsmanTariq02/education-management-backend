import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { MailRecipientDto } from './mail-recipient.dto';

export class CreateMailMessageDto {
  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiProperty({ type: [MailRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailRecipientDto)
  recipients!: MailRecipientDto[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  sendNow?: boolean = true;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Optional organization override for super admin platform sessions' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
