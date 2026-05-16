import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPromptPreset } from '../../../common/enums/ai-prompt-preset.enum';

export class GenerateFeeCollectionPlanDto {
  @IsString()
  @MaxLength(200)
  studentName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;

  @IsString()
  @MaxLength(6000)
  context!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string;

  @IsOptional()
  @IsEnum(AiPromptPreset)
  promptPreset?: AiPromptPreset;
}
