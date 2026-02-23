import { ApiProperty } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma/client';

export class JobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ enum: JobType })
  type!: JobType;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty({ type: Object, nullable: true })
  result!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  failureReason!: string | null;

  @ApiProperty({ nullable: true })
  bullJobId!: string | null;

  @ApiProperty()
  queueName!: string;

  @ApiProperty({ nullable: true })
  startedAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class QueueHealthSnapshotDto {
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

export class QueueHealthResponseDto {
  @ApiProperty({ type: QueueHealthSnapshotDto, isArray: true })
  queues!: QueueHealthSnapshotDto[];

  @ApiProperty()
  checkedAt!: string;
}

export class EnqueuedJobResponseDto {
  @ApiProperty()
  jobId!: string;
}
