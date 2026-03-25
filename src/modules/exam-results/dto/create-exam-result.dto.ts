import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsNumber, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StudentExamResultStatus } from '@prisma/client';

export class CreateExamResultItemDto {
  @ApiProperty()
  @IsString()
  examSubjectId!: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiProperty()
  @IsNumber()
  obtainedMarks!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateExamResultDto {
  @ApiProperty()
  @IsString()
  examId!: string;

  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ enum: StudentExamResultStatus, default: StudentExamResultStatus.DRAFT })
  @IsEnum(StudentExamResultStatus)
  @IsOptional()
  status: StudentExamResultStatus = StudentExamResultStatus.DRAFT;

  @ApiProperty({ type: [CreateExamResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamResultItemDto)
  items!: CreateExamResultItemDto[];
}
