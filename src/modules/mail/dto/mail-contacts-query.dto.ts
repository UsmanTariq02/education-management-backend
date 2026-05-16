import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class MailContactsQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Comma separated audience filters. Supported values: STAFF, TEACHER, STUDENT, PARENT',
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  @IsOptional()
  audience?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 5000, default: 50 })
  @Transform(({ value }) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  })
  @IsInt()
  @Min(1)
  @Max(5000)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Optional organization override for super admin platform sessions' })
  @Transform(({ value }) => value?.trim())
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
