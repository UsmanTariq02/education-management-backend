import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class ExtractAdmissionFormDto {
  @IsString()
  @MaxLength(10000)
  rawText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceLabel?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;
}
