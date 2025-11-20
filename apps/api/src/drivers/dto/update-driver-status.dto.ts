import { ApiProperty } from '@nestjs/swagger';
import { DriverStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus, example: DriverStatus.SUSPENDED })
  @IsEnum(DriverStatus)
  status!: DriverStatus;
}
