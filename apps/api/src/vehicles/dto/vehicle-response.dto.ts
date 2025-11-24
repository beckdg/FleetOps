import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';

export class VehicleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  plateNumber!: string;

  @ApiProperty()
  vin!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;

  @ApiProperty({ enum: VehicleStatus })
  status!: VehicleStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
