import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class GenerateSupportReplyDto {
  @IsString()
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  conversationSummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextBullets?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;
}
