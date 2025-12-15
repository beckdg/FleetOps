import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class ScheduleMaintenanceDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ example: 'Oil change and brake inspection' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.PREVENTIVE })
  @IsEnum(MaintenanceType)
  maintenanceType!: MaintenanceType;

  @ApiProperty({ example: '2025-06-15T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false, example: '250.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  estimatedCost?: string;
}

export class CompleteMaintenanceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, example: '275.50' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  actualCost?: string;
}

export class MaintenanceActionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
