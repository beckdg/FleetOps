import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus, JobType, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateJobRecordInput } from './constants/job.constants';

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateJobRecordInput): Promise<Job> {
    return this.prisma.job.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        queueName: data.queueName,
        payload: data.payload,
        bullJobId: data.bullJobId,
        status: JobStatus.PENDING,
      },
    });
  }

  findByOrganization(organizationId: string): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  requireByIdInOrganization(id: string, organizationId: string): Promise<Job> {
    return this.prisma.job.findFirst({ where: { id, organizationId } }).then((job) => {
      if (!job) {
        throw new NotFoundException(`Job ${id} not found`);
      }

      return job;
    });
  }

  markProcessing(id: string, attemptCount: number): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.PROCESSING,
        attemptCount,
        startedAt: new Date(),
      },
    });
  }

  markCompleted(id: string, result?: Prisma.InputJsonValue): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        failureReason: null,
      },
    });
  }

  markFailed(id: string, failureReason: string, attemptCount: number): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.FAILED,
        failureReason,
        attemptCount,
        completedAt: new Date(),
      },
    });
  }

  attachBullJobId(id: string, bullJobId: string): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: { bullJobId },
    });
  }

  findByTypeAndOrganization(organizationId: string, type: JobType): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { organizationId, type },
      orderBy: [{ createdAt: 'desc' }],
    });
  }
}
