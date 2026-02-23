import { Job, JobStatus, JobType } from '@prisma/client';

import { JobResponseDto } from './dto/jobs-response.dto';

export function toJobResponse(job: Job): JobResponseDto {
  return {
    id: job.id,
    organizationId: job.organizationId,
    type: job.type,
    status: job.status,
    attemptCount: job.attemptCount,
    payload: job.payload as Record<string, unknown>,
    result: (job.result as Record<string, unknown> | null) ?? null,
    failureReason: job.failureReason,
    bullJobId: job.bullJobId,
    queueName: job.queueName,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function isReportGenerationJob(job: Job): boolean {
  return job.type === JobType.REPORT_GENERATION;
}

export const REPORT_GENERATION_STATUSES: JobStatus[] = [
  JobStatus.PENDING,
  JobStatus.PROCESSING,
  JobStatus.COMPLETED,
  JobStatus.FAILED,
];
