import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ReviewAssessmentAnswerDto {
  @ApiProperty()
  @IsString()
  answerId!: string;

  @ApiProperty()
  @IsNumber()
  awardedMarks!: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class ReviewAssessmentAttemptDto {
  @ApiProperty({ type: [ReviewAssessmentAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewAssessmentAnswerDto)
  answers!: ReviewAssessmentAnswerDto[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  finalize = true;
}
