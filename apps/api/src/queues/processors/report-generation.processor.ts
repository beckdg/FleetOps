import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { ReportDateRangeInput } from '@fleetops/shared-types';

import { ReportService, ReportType } from '../../reports/report.service';
import { ReportGenerationJobPayload } from '../constants/job.constants';
import { JOB_MAX_ATTEMPTS, QUEUE_NAMES } from '../constants/queue.constants';
import { JobService } from '../jobs.service';

@Injectable()
@Processor(QUEUE_NAMES.REPORT_GENERATION)
export class ReportGenerationProcessor extends WorkerHost {
  constructor(
    private readonly reportService: ReportService,
    private readonly jobService: JobService,
  ) {
    super();
  }

  async process(job: Job<ReportGenerationJobPayload>): Promise<void> {
    const attemptNumber = job.attemptsMade + 1;

    await this.jobService.markProcessing(job.data.jobRecordId, attemptNumber);

    try {
      const rangeInput = (job.data.rangeInput ?? {}) as ReportDateRangeInput;
      const report = await this.generateReport(
        job.data.reportType as ReportType,
        job.data.organizationId,
        job.data.requestedByUserId,
        rangeInput,
      );

      await this.jobService.markCompleted(job.data.jobRecordId, {
        reportType: report.reportType,
        generatedAt: report.generatedAt,
        format: report.format,
        period: report.period,
        data: report.data,
      } as unknown as Prisma.InputJsonValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Report generation failed';

      if (attemptNumber >= JOB_MAX_ATTEMPTS) {
        await this.jobService.markFailed(job.data.jobRecordId, message, attemptNumber);
        return;
      }

      throw error;
    }
  }

  private generateReport(
    reportType: ReportType,
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput,
  ) {
    switch (reportType) {
      case 'dashboard':
        return this.reportService.generateDashboardReport(
          organizationId,
          requestedByUserId,
          rangeInput,
        );
      case 'fleet':
        return this.reportService.generateFleetReport(
          organizationId,
          requestedByUserId,
          rangeInput,
        );
      case 'fuel':
        return this.reportService.generateFuelReport(organizationId, requestedByUserId, rangeInput);
      case 'maintenance':
        return this.reportService.generateMaintenanceReport(
          organizationId,
          requestedByUserId,
          rangeInput,
        );
      case 'trips':
        return this.reportService.generateTripReport(organizationId, requestedByUserId, rangeInput);
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }
}
