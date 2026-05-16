import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnnouncementAudience } from '@prisma/client';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class ScheduleNoticeCampaignDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  targetScope?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;
}
