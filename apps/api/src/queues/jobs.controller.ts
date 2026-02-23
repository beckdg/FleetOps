import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { EnqueueReportJobDto, EnqueueReportJobParamsDto } from './dto/jobs.dto';
import {
  EnqueuedJobResponseDto,
  JobResponseDto,
  QueueHealthResponseDto,
} from './dto/jobs-response.dto';
import { toJobResponse } from './jobs.mapper';
import { JobService } from './jobs.service';
import { QueueHealthService } from './queue-health.service';
import { ReportGenerationQueueService } from './report-generation-queue.service';
import { ReportType } from '../reports/report.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller()
export class JobsController {
  constructor(
    private readonly jobService: JobService,
    private readonly queueHealthService: QueueHealthService,
    private readonly reportGenerationQueueService: ReportGenerationQueueService,
  ) {}

  @Get('jobs')
  @RequirePermission('jobs', 'read')
  @ApiOperation({ summary: 'List background jobs for the organization' })
  @ApiOkResponse({ type: JobResponseDto, isArray: true })
  listJobs(@CurrentUser() user: AuthenticatedUser): Promise<JobResponseDto[]> {
    return this.jobService.listJobs(user.organizationId).then((jobs) => jobs.map(toJobResponse));
  }

  @Get('jobs/:id')
  @RequirePermission('jobs', 'read')
  @ApiOperation({ summary: 'Get a background job by id' })
  @ApiOkResponse({ type: JobResponseDto })
  getJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto> {
    return this.jobService.getJob(user.organizationId, id).then(toJobResponse);
  }

  @Post('jobs/reports/:reportType')
  @RequirePermission('jobs', 'write')
  @ApiOperation({ summary: 'Enqueue an asynchronous report generation job' })
  @ApiCreatedResponse({ type: EnqueuedJobResponseDto })
  enqueueReportJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: EnqueueReportJobParamsDto,
    @Body() body: EnqueueReportJobDto,
  ): Promise<EnqueuedJobResponseDto> {
    return this.reportGenerationQueueService
      .enqueueReportGeneration({
        organizationId: user.organizationId,
        reportType: params.reportType as ReportType,
        requestedByUserId: user.userId,
        rangeInput: body,
      })
      .then((jobId) => ({ jobId }));
  }

  @Get('queues/health')
  @RequirePermission('jobs', 'read')
  @ApiOperation({ summary: 'Get queue health metrics' })
  @ApiOkResponse({ type: QueueHealthResponseDto })
  getQueueHealth(): Promise<QueueHealthResponseDto> {
    return this.queueHealthService.getHealth();
  }
}
