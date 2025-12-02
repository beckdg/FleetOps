import { ApiProperty } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';

export class TripResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty()
  driverId!: string;

  @ApiProperty()
  tripNumber!: string;

  @ApiProperty()
  origin!: string;

  @ApiProperty()
  destination!: string;

  @ApiProperty()
  scheduledStartAt!: string;

  @ApiProperty()
  scheduledEndAt!: string;

  @ApiProperty({ nullable: true })
  actualStartAt!: string | null;

  @ApiProperty({ nullable: true })
  actualEndAt!: string | null;

  @ApiProperty({ enum: TripStatus })
  status!: TripStatus;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
