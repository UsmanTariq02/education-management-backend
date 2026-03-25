import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateTeacherDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  joinedAt!: Date;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive = true;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  createLoginAccess?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((value) => value.createLoginAccess === true)
  @IsString()
  accessPassword?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  accessIsActive?: boolean;
}
