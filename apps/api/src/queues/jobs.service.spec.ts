import { JobStatus } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { JobService } from './jobs.service';

describe('JobService state transitions', () => {
  const jobRepository = {
    create: jest.fn(),
    markProcessing: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    attachBullJobId: jest.fn(),
    findByOrganization: jest.fn(),
    requireByIdInOrganization: jest.fn(),
    findByTypeAndOrganization: jest.fn(),
  };
  const organizationRepository = {
    requireById: jest.fn().mockResolvedValue(undefined),
  };
  const fleetAuditService = {
    logJobCreated: jest.fn(),
    logJobCompleted: jest.fn(),
    logJobFailed: jest.fn(),
  } as unknown as FleetAuditService;

  let service: JobService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobService(
      jobRepository as never,
      organizationRepository as never,
      fleetAuditService,
    );
  });

  it('audits job creation', async () => {
    jobRepository.create.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      type: 'REPORT_GENERATION',
      queueName: 'report-generation',
    });

    await service.createJobRecord({
      organizationId: 'org-1',
      type: 'REPORT_GENERATION' as never,
      queueName: 'report-generation',
      payload: { reportType: 'fleet' },
    });

    expect(fleetAuditService.logJobCreated).toHaveBeenCalled();
  });

  it('marks jobs completed with audit logging', async () => {
    jobRepository.markCompleted.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      type: 'REPORT_GENERATION',
      status: JobStatus.COMPLETED,
      attemptCount: 1,
    });

    const job = await service.markCompleted('job-1', { reportType: 'fleet' });

    expect(job.status).toBe(JobStatus.COMPLETED);
    expect(fleetAuditService.logJobCompleted).toHaveBeenCalled();
  });

  it('marks jobs failed with audit logging', async () => {
    jobRepository.markFailed.mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      type: 'WEBHOOK_DELIVERY',
      status: JobStatus.FAILED,
      attemptCount: 3,
    });

    const job = await service.markFailed('job-1', 'delivery failed', 3);

    expect(job.status).toBe(JobStatus.FAILED);
    expect(fleetAuditService.logJobFailed).toHaveBeenCalled();
  });
});
