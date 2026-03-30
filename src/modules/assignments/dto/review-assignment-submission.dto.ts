import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReviewAssignmentSubmissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  awardedMarks?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  finalize = true;
}
