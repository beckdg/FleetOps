import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInspectionDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  inspectionDate!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  passed!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  @IsNotEmpty()
  inspectorName!: string;
}
