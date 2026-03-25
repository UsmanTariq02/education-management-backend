import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBatchSubjectAssignmentDto {
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

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  weeklyClasses = 1;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary = false;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
