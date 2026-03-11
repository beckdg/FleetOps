import { ApiProperty } from '@nestjs/swagger';

class HealthDependencyCheckDto {
  @ApiProperty()
  connected!: boolean;

  @ApiProperty({ required: false })
  latencyMs?: number;

  @ApiProperty({ required: false })
  error?: string;
}

class HealthQueueSnapshotDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  waiting!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  delayed!: number;

  @ApiProperty()
  paused!: number;

  @ApiProperty()
  isHealthy!: boolean;
}

class HealthQueueChecksDto {
  @ApiProperty()
  checkedAt!: string;

  @ApiProperty({ type: HealthQueueSnapshotDto, isArray: true })
  queues!: HealthQueueSnapshotDto[];
}

class HealthChecksDto {
  @ApiProperty({ type: HealthDependencyCheckDto })
  database!: HealthDependencyCheckDto;

  @ApiProperty({ type: HealthDependencyCheckDto })
  redis!: HealthDependencyCheckDto;

  @ApiProperty({ type: HealthQueueChecksDto })
  queues!: HealthQueueChecksDto;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'fleetops-api' })
  service!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: 3600 })
  uptimeSeconds!: number;

  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;
}
