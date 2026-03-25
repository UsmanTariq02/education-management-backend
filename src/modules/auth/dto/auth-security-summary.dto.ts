import { ApiProperty } from '@nestjs/swagger';

class AuthSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({ nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ nullable: true })
  revocationReason!: string | null;
}

class AuthLoginEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({
    enum: ['SUCCESS', 'FAILED', 'BLOCKED', 'LOGOUT', 'REFRESH', 'SESSION_REVOKED'],
  })
  status!: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({ nullable: true })
  failureReason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AuthSecuritySummaryDto {
  @ApiProperty({ type: [AuthSessionDto] })
  sessions!: AuthSessionDto[];

  @ApiProperty({ type: [AuthLoginEventDto] })
  recentLoginEvents!: AuthLoginEventDto[];
}
