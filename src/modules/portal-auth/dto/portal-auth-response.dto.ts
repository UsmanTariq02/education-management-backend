import { ApiProperty } from '@nestjs/swagger';
import { PortalAccountType, StudentStatus } from '@prisma/client';

export class PortalAuthUserDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: PortalAccountType })
  accountType!: PortalAccountType;

  @ApiProperty()
  studentName!: string;

  @ApiProperty()
  guardianName!: string;

  @ApiProperty({ type: [String] })
  batches!: string[];

  @ApiProperty({ enum: StudentStatus })
  studentStatus!: StudentStatus;
}

export class PortalAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: PortalAuthUserDto })
  user!: PortalAuthUserDto;
}
