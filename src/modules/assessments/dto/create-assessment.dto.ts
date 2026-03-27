import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentQuestionType, AssessmentStatus, AssessmentType } from '.prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateAssessmentQuestionOptionDto {
  @ApiProperty()
  @IsString()
  text!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isCorrect = false;
}

export class CreateAssessmentQuestionDto {
  @ApiProperty({ enum: AssessmentQuestionType })
  @IsEnum(AssessmentQuestionType)
  type!: AssessmentQuestionType;

  @ApiProperty()
  @IsString()
  prompt!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  helperText?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  marks = 1;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  acceptedAnswers?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  correctBooleanAnswer?: boolean;

  @ApiPropertyOptional({ type: [CreateAssessmentQuestionOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentQuestionOptionDto)
  @IsOptional()
  options?: CreateAssessmentQuestionOptionDto[];
}

export class CreateAssessmentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicSessionId?: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ enum: AssessmentType, default: AssessmentType.QUIZ })
  @IsEnum(AssessmentType)
  @IsOptional()
  type = AssessmentType.QUIZ;

  @ApiPropertyOptional({ enum: AssessmentStatus, default: AssessmentStatus.DRAFT })
  @IsEnum(AssessmentStatus)
  @IsOptional()
  status = AssessmentStatus.DRAFT;

  @ApiPropertyOptional({ default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes = 30;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  passMarks = 0;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startsAt?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endsAt?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  availableFrom?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  availableUntil?: Date;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  shuffleQuestions = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  shuffleOptions = false;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  showResultImmediately = true;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  allowMultipleAttempts = false;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts = 1;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  negativeMarkingEnabled = false;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf((dto: CreateAssessmentDto) => dto.negativeMarkingEnabled)
  @IsOptional()
  negativeMarkingPerWrong?: number;

  @ApiProperty({ type: [CreateAssessmentQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentQuestionDto)
  questions!: CreateAssessmentQuestionDto[];
}
