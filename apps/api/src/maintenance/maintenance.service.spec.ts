import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';

import {
  assertAllowedMaintenanceTransition,
  isAllowedMaintenanceTransition,
  maintenanceTransitionErrorMessage,
} from './constants/maintenance.constants';
import { MaintenanceService } from './maintenance.service';

describe('Maintenance domain validation', () => {
  describe('status transitions', () => {
    it('allows scheduled maintenance to start or cancel', () => {
      expect(
        isAllowedMaintenanceTransition(MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS),
      ).toBe(true);
      expect(
        isAllowedMaintenanceTransition(MaintenanceStatus.SCHEDULED, MaintenanceStatus.CANCELLED),
      ).toBe(true);
    });

    it('allows in-progress maintenance to complete or cancel', () => {
      expect(
        isAllowedMaintenanceTransition(MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED),
      ).toBe(true);
      expect(
        isAllowedMaintenanceTransition(MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED),
      ).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(
        isAllowedMaintenanceTransition(MaintenanceStatus.SCHEDULED, MaintenanceStatus.COMPLETED),
      ).toBe(false);

      expect(() =>
        assertAllowedMaintenanceTransition(
          MaintenanceStatus.COMPLETED,
          MaintenanceStatus.IN_PROGRESS,
        ),
      ).toThrow(
        maintenanceTransitionErrorMessage(
          MaintenanceStatus.COMPLETED,
          MaintenanceStatus.IN_PROGRESS,
        ),
      );
    });
  });

  describe('MaintenanceService helpers', () => {
    let service: MaintenanceService;

    beforeEach(() => {
      service = new MaintenanceService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
    });

    it('rejects invalid transitions via assertAllowedTransition', () => {
      expect(() =>
        service.assertAllowedTransition(MaintenanceStatus.SCHEDULED, MaintenanceStatus.COMPLETED),
      ).toThrow(BadRequestException);
    });
  });
});
