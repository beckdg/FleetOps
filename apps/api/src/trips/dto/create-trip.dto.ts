import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTripDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsUUID()
  driverId!: string;

  @ApiProperty({ example: 'TRIP-2025-001' })
  @IsString()
  @IsNotEmpty()
  tripNumber!: string;

  @ApiProperty({ example: 'Chicago, IL' })
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @ApiProperty({ example: 'Milwaukee, WI' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiProperty({ example: '2025-06-10T08:00:00.000Z' })
  @IsDateString()
  scheduledStartAt!: string;

  @ApiProperty({ example: '2025-06-10T12:00:00.000Z' })
  @IsDateString()
  scheduledEndAt!: string;
}

export class TripActionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
