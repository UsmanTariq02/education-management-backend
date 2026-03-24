import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityLogActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class ActivityLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  organizationId!: string | null;

  @ApiPropertyOptional()
  organizationName!: string | null;

  @ApiPropertyOptional()
  actorUserId!: string | null;

  @ApiProperty()
  module!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional()
  targetId!: string | null;

  @ApiPropertyOptional({ type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: ActivityLogActorDto })
  actorUser!: ActivityLogActorDto | null;
}
