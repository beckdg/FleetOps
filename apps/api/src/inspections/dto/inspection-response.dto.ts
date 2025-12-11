import { ApiProperty } from '@nestjs/swagger';

export class InspectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty()
  inspectionDate!: string;

  @ApiProperty()
  passed!: boolean;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  inspectorName!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;
}
