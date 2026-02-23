import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ReportType } from '../../reports/report.service';

export class EnqueueReportJobDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class EnqueueReportJobParamsDto {
  @ApiProperty({ enum: ['dashboard', 'fleet', 'fuel', 'maintenance', 'trips'] })
  @IsIn(['dashboard', 'fleet', 'fuel', 'maintenance', 'trips'])
  reportType!: ReportType;
}
