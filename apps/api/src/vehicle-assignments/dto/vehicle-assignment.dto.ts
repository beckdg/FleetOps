import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignVehicleDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsUUID()
  driverId!: string;
}

export class GetActiveAssignmentQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
