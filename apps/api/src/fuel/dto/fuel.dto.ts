import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateFuelRecordDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  fuelStationId?: string;

  @ApiProperty({ example: 45230 })
  @IsInt()
  @Min(0)
  odometerReading!: number;

  @ApiProperty({ example: '65.500' })
  @IsString()
  @IsNotEmpty()
  litersPurchased!: string;

  @ApiProperty({ example: '1.8500' })
  @IsString()
  @IsNotEmpty()
  pricePerLiter!: string;

  @ApiProperty({ example: '2025-06-10T14:30:00.000Z' })
  @IsDateString()
  filledAt!: string;
}

export class CreateFuelStationDto {
  @ApiProperty({ example: 'Fleet Depot Fuel Center' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '1200 Industrial Blvd, Chicago, IL' })
  @IsString()
  @IsNotEmpty()
  location!: string;
}
