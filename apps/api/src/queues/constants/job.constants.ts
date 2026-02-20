import { JobStatus, JobType, Prisma } from '@prisma/client';

export interface WebhookDeliveryJobPayload {
  jobRecordId: string;
  organizationId: string;
  webhookEndpointId: string;
  webhookEventId: string;
}

export interface NotificationJobPayload {
  jobRecordId: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface MaintenanceReminderJobPayload {
  jobRecordId: string;
  organizationId: string;
  maintenanceRecordId: string;
  recipientUserId: string;
}

export interface LicenseExpiryReminderJobPayload {
  jobRecordId: string;
  organizationId: string;
  driverId: string;
  recipientUserId: string;
}

export interface ReportGenerationJobPayload {
  jobRecordId: string;
  organizationId: string;
  reportType: string;
  requestedByUserId: string;
  rangeInput?: Record<string, string | undefined>;
}

export interface CreateJobRecordInput {
  organizationId: string;
  type: JobType;
  queueName: string;
  payload: Prisma.InputJsonValue;
  bullJobId?: string;
}

export type ReportGenerationJobStatus = JobStatus;

export const REPORT_GENERATION_JOB_STATUSES: ReportGenerationJobStatus[] = [
  JobStatus.PENDING,
  JobStatus.PROCESSING,
  JobStatus.COMPLETED,
  JobStatus.FAILED,
];

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === JobStatus.COMPLETED || status === JobStatus.FAILED;
}

export function shouldRetryJobAttempt(attemptNumber: number): boolean {
  return attemptNumber < 3;
}
