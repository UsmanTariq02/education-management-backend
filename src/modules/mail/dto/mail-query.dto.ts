import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MailQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['inbox', 'sent', 'drafts', 'starred', 'trash', 'all'], default: 'inbox' })
  @IsString()
  @IsIn(['inbox', 'sent', 'drafts', 'starred', 'trash', 'all'])
  @IsOptional()
  folder?: 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash' | 'all' = 'inbox';

  @ApiPropertyOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Optional organization override for super admin platform sessions' })
  @Transform(({ value }) => value?.trim())
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
