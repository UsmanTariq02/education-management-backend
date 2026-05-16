import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class GenerateMailDraftDto {
  @IsString()
  @MaxLength(200)
  recipientName!: string;

  @IsString()
  @MaxLength(120)
  recipientRole!: string;

  @IsString()
  @MaxLength(4000)
  threadContext!: string;

  @IsString()
  @MaxLength(80)
  tone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subjectHint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalInstructions?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;
}
