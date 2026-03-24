import { ApiProperty } from '@nestjs/swagger';
import { OrganizationModule } from '../../../common/enums/organization-module.enum';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  organizationId!: string | null;

  @ApiProperty({ nullable: true })
  organizationName!: string | null;

  @ApiProperty({ nullable: true })
  userLimit!: number | null;

  @ApiProperty({ nullable: true })
  studentLimit!: number | null;

  @ApiProperty({ enum: OrganizationModule, isArray: true })
  enabledModules!: OrganizationModule[];

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
