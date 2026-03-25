import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateExamSubjectDto {
  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiProperty()
  @IsNumber()
  totalMarks!: number;

  @ApiProperty()
  @IsNumber()
  passMarks!: number;
}

export class CreateExamDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicSessionId?: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  examDate!: Date;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPublished = false;

  @ApiProperty({ type: [CreateExamSubjectDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamSubjectDto)
  subjects!: CreateExamSubjectDto[];
}
