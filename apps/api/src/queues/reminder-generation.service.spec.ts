import { DriverStatus, MaintenanceStatus } from '@prisma/client';

import { ReminderGenerationService } from './reminder-generation.service';

describe('ReminderGenerationService', () => {
  const prisma = {
    driver: { findMany: jest.fn() },
    maintenanceRecord: { findMany: jest.fn() },
  };
  const roleRepository = { findActiveAdminUserIdsByOrganizationIds: jest.fn() };
  const notificationQueueService = { enqueueNotification: jest.fn() };
  const maintenanceReminderQueueService = { enqueueReminder: jest.fn() };

  let service: ReminderGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReminderGenerationService(
      prisma as never,
      roleRepository as never,
      notificationQueueService as never,
      maintenanceReminderQueueService as never,
    );
  });

  it('enqueues license expiry reminders for active drivers', async () => {
    prisma.driver.findMany.mockResolvedValue([
      {
        id: 'driver-1',
        organizationId: 'org-1',
        firstName: 'Alex',
        lastName: 'Driver',
        licenseExpiryDate: new Date('2026-07-01'),
        status: DriverStatus.ACTIVE,
      },
    ]);
    roleRepository.findActiveAdminUserIdsByOrganizationIds.mockResolvedValue(
      new Map([['org-1', 'user-1']]),
    );

    const count = await service.generateLicenseExpiryReminders(new Date('2026-06-01'));

    expect(count).toBe(1);
    expect(roleRepository.findActiveAdminUserIdsByOrganizationIds).toHaveBeenCalledWith(['org-1']);
    expect(notificationQueueService.enqueueNotification).toHaveBeenCalled();
  });

  it('enqueues maintenance reminders for scheduled records', async () => {
    prisma.maintenanceRecord.findMany.mockResolvedValue([
      {
        id: 'maint-1',
        organizationId: 'org-1',
        createdByUserId: 'user-1',
        status: MaintenanceStatus.SCHEDULED,
      },
    ]);

    const count = await service.generateMaintenanceReminders(new Date('2026-06-01'));

    expect(count).toBe(1);
    expect(maintenanceReminderQueueService.enqueueReminder).toHaveBeenCalledWith({
      organizationId: 'org-1',
      maintenanceRecordId: 'maint-1',
      recipientUserId: 'user-1',
    });
  });
});
