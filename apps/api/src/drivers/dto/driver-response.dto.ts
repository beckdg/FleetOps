import { ApiProperty } from '@nestjs/swagger';
import { DriverStatus } from '@prisma/client';

export class DriverResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  licenseNumber!: string;

  @ApiProperty()
  licenseExpiryDate!: string;

  @ApiProperty({ enum: DriverStatus })
  status!: DriverStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
