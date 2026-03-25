import { ApiProperty } from '@nestjs/swagger';
import { PortalAccountType } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class PortalLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: PortalAccountType })
  @IsEnum(PortalAccountType)
  accountType!: PortalAccountType;
}
