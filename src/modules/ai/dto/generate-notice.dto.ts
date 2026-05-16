import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class GenerateNoticeDto {
  @IsString()
  @MaxLength(200)
  audience!: string;

  @IsString()
  @MaxLength(200)
  topic!: string;

  @IsString()
  @MaxLength(80)
  tone!: string;

  @IsString()
  @MaxLength(2000)
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  callToAction?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  audienceContext?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;
}
