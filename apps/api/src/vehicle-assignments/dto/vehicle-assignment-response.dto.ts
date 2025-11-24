import { ApiProperty } from '@nestjs/swagger';

export class VehicleAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty()
  driverId!: string;

  @ApiProperty()
  assignedAt!: string;

  @ApiProperty({ nullable: true })
  endedAt!: string | null;

  @ApiProperty()
  assignedByUserId!: string;
}
