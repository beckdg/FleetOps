import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: VehicleStatus, example: VehicleStatus.IN_MAINTENANCE })
  @IsEnum(VehicleStatus)
  status!: VehicleStatus;
}
