import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertPortalAccessDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  studentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  @IsOptional()
  studentPassword?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  parentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  @IsOptional()
  parentPassword?: string;
}
