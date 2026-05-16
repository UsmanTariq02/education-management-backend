import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { MailRecipientDto } from './mail-recipient.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ReplyMailMessageDto {
  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional({ type: [MailRecipientDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MailRecipientDto)
  recipients?: MailRecipientDto[];

  @ApiPropertyOptional({ description: 'Optional organization override for super admin platform sessions' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
