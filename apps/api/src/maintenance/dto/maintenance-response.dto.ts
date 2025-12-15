import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceStatus, MaintenanceType } from '@prisma/client';

export class MaintenanceRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceType })
  maintenanceType!: MaintenanceType;

  @ApiProperty()
  scheduledAt!: string;

  @ApiProperty({ nullable: true })
  startedAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ enum: MaintenanceStatus })
  status!: MaintenanceStatus;

  @ApiProperty({ nullable: true })
  estimatedCost!: string | null;

  @ApiProperty({ nullable: true })
  actualCost!: string | null;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
