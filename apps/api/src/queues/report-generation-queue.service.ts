import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobType, Prisma } from '@prisma/client';
import { ReportDateRangeInput } from '@fleetops/shared-types';
import { Queue } from 'bullmq';

import { ReportGenerationJobPayload } from './constants/job.constants';
import { DEFAULT_QUEUE_JOB_OPTIONS, QUEUE_NAMES } from './constants/queue.constants';
import { JobService } from './jobs.service';
import { ReportType } from '../reports/report.service';

@Injectable()
export class ReportGenerationQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION)
    private readonly reportGenerationQueue: Queue<ReportGenerationJobPayload>,
    private readonly jobService: JobService,
  ) {}

  async enqueueReportGeneration(input: {
    organizationId: string;
    reportType: ReportType;
    requestedByUserId: string;
    rangeInput?: ReportDateRangeInput;
  }): Promise<string> {
    const jobRecord = await this.jobService.createJobRecord({
      organizationId: input.organizationId,
      type: JobType.REPORT_GENERATION,
      queueName: QUEUE_NAMES.REPORT_GENERATION,
      payload: {
        reportType: input.reportType,
        requestedByUserId: input.requestedByUserId,
        rangeInput: input.rangeInput ?? {},
      } as unknown as Prisma.InputJsonValue,
    });

    const bullJob = await this.reportGenerationQueue.add(
      'generate-report',
      {
        jobRecordId: jobRecord.id,
        organizationId: input.organizationId,
        reportType: input.reportType,
        requestedByUserId: input.requestedByUserId,
        rangeInput: (input.rangeInput ?? {}) as Record<string, string | undefined>,
      },
      DEFAULT_QUEUE_JOB_OPTIONS,
    );

    await this.jobService.attachBullJobId(jobRecord.id, String(bullJob.id));

    return jobRecord.id;
  }
}
