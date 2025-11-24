import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  plateNumber!: string;

  @ApiProperty({ example: '1HGBH41JXMN109186' })
  @IsString()
  @IsNotEmpty()
  vin!: string;

  @ApiProperty({ example: 'Ford' })
  @IsString()
  @IsNotEmpty()
  make!: string;

  @ApiProperty({ example: 'Transit' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 2023 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;
}
