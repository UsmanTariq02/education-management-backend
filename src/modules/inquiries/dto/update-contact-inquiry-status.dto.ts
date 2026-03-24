import { ApiProperty } from '@nestjs/swagger';
import { ContactInquiryStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContactInquiryStatusDto {
  @ApiProperty({ enum: ContactInquiryStatus })
  @IsEnum(ContactInquiryStatus)
  status!: ContactInquiryStatus;
}
