import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStudentDocumentDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: StudentDocumentType })
  @IsEnum(StudentDocumentType)
  type!: StudentDocumentType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
