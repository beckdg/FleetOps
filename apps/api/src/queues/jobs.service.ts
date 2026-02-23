import { Injectable } from '@nestjs/common';
import { Job, JobStatus, JobType, Prisma } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { CreateJobRecordInput } from './constants/job.constants';
import { JobRepository } from './jobs.repository';

@Injectable()
export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createJobRecord(input: CreateJobRecordInput): Promise<Job> {
    await this.organizationRepository.requireById(input.organizationId);

    const job = await this.jobRepository.create(input);

    this.fleetAuditService.logJobCreated({
      organizationId: job.organizationId,
      jobId: job.id,
      jobType: job.type,
      queueName: job.queueName,
    });

    return job;
  }

  async attachBullJobId(jobId: string, bullJobId: string): Promise<Job> {
    return this.jobRepository.attachBullJobId(jobId, bullJobId);
  }

  async markProcessing(jobId: string, attemptCount: number): Promise<Job> {
    return this.jobRepository.markProcessing(jobId, attemptCount);
  }

  async markCompleted(jobId: string, result?: Prisma.InputJsonValue): Promise<Job> {
    const job = await this.jobRepository.markCompleted(jobId, result);

    this.fleetAuditService.logJobCompleted({
      organizationId: job.organizationId,
      jobId: job.id,
      jobType: job.type,
      attemptCount: job.attemptCount,
    });

    return job;
  }

  async markFailed(jobId: string, failureReason: string, attemptCount: number): Promise<Job> {
    const job = await this.jobRepository.markFailed(jobId, failureReason, attemptCount);

    this.fleetAuditService.logJobFailed({
      organizationId: job.organizationId,
      jobId: job.id,
      jobType: job.type,
      attemptCount: job.attemptCount,
      failureReason,
    });

    return job;
  }

  async listJobs(organizationId: string): Promise<Job[]> {
    await this.organizationRepository.requireById(organizationId);
    return this.jobRepository.findByOrganization(organizationId);
  }

  async getJob(organizationId: string, jobId: string): Promise<Job> {
    await this.organizationRepository.requireById(organizationId);
    return this.jobRepository.requireByIdInOrganization(jobId, organizationId);
  }

  async listReportGenerationJobs(organizationId: string): Promise<Job[]> {
    await this.organizationRepository.requireById(organizationId);
    return this.jobRepository.findByTypeAndOrganization(organizationId, JobType.REPORT_GENERATION);
  }

  isReportGenerationJob(job: Job): boolean {
    return job.type === JobType.REPORT_GENERATION;
  }

  getReportGenerationStatus(job: Job): JobStatus {
    return job.status;
  }
}
