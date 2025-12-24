import { ApiProperty } from '@nestjs/swagger';

export class FuelStationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty()
  createdAt!: string;
}

export class FuelRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty({ nullable: true })
  tripId!: string | null;

  @ApiProperty({ nullable: true })
  fuelStationId!: string | null;

  @ApiProperty()
  odometerReading!: number;

  @ApiProperty()
  litersPurchased!: string;

  @ApiProperty()
  pricePerLiter!: string;

  @ApiProperty()
  totalCost!: string;

  @ApiProperty()
  filledAt!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class VehicleFuelSummaryResponseDto {
  @ApiProperty()
  vehicleId!: string;

  @ApiProperty()
  recordCount!: number;

  @ApiProperty()
  totalLiters!: string;

  @ApiProperty()
  totalCost!: string;

  @ApiProperty({ nullable: true })
  kilometersDriven!: number | null;

  @ApiProperty({ nullable: true })
  litersPerKilometer!: string | null;

  @ApiProperty({ nullable: true })
  averageCostPerKilometer!: string | null;

  @ApiProperty({ nullable: true })
  averageFuelPerTrip!: string | null;

  @ApiProperty()
  tripFuelRecordCount!: number;
}
