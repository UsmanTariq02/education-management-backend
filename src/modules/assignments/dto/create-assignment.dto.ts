import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatus } from '.prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAssignmentDto {
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
  @MaxLength(180)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus, default: AssignmentStatus.DRAFT })
  @IsEnum(AssignmentStatus)
  @IsOptional()
  status = AssignmentStatus.DRAFT;

  @ApiPropertyOptional({ default: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxMarks = 100;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  allowLateSubmission = false;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  publishedAt?: Date;
}

export class UpsertPortalAssignmentSubmissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  submissionText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentLinks?: string[];
}
