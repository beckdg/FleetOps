import { ApiProperty } from '@nestjs/swagger';

export class ReportPeriodDto {
  @ApiProperty({ nullable: true })
  startDate!: string | null;

  @ApiProperty({ nullable: true })
  endDate!: string | null;
}

export class ReportEnvelopeDto {
  @ApiProperty()
  reportType!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ example: 'json' })
  format!: string;

  @ApiProperty({ type: ReportPeriodDto })
  period!: ReportPeriodDto;

  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;
}
