import { ApiProperty } from '@nestjs/swagger';

export class AuthUserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [String] })
  roleIds!: string[];
}
