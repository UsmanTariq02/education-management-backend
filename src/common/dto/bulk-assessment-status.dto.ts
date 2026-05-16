import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStatus } from '.prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsUUID } from 'class-validator';

export class BulkAssessmentStatusDto {
  @ApiProperty({ type: [String], description: 'Assessment IDs to update in bulk' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ enum: AssessmentStatus, description: 'Target assessment status' })
  @IsEnum(AssessmentStatus)
  status!: AssessmentStatus;
}
